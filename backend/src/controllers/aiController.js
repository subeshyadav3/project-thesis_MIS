const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

function getStoragePath(documentUrl) {
  if (!documentUrl) return null;
  const relative = documentUrl.replace('/api/files/', '');
  return path.join(__dirname, '..', '..', 'storage', relative);
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const pdf = new PDFParse({ data: buf });
    const result = await pdf.getText();
    return (result.text || '').slice(0, 50000);
  }
  if (ext === '.docx') {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return (result.value || '').slice(0, 50000);
    } catch (_) {
      return fs.readFileSync(filePath, 'utf-8').slice(0, 50000);
    }
  }
  return fs.readFileSync(filePath, 'utf-8').slice(0, 50000);
}

async function callAI(endpoint, payload) {
  const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, nvidia_api_key: NVIDIA_API_KEY || payload.nvidia_api_key }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI service error ${response.status}: ${errText}`);
  }
  return response.json();
}

async function loadCandidates(proposalId, scope) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      group: { include: { academicYear: { include: { department: true } } } },
      thesis: { include: { academicYear: { include: { department: true } } } },
    },
  });
  if (!proposal) return { scope, candidates: [] };

  const where = { NOT: { proposalId } };
  let scopedYearId = null;
  let scopedDeptId = null;
  if (proposal.group) {
    scopedYearId = proposal.group.academicYearId;
    scopedDeptId = proposal.group.academicYear?.departmentId;
  } else if (proposal.thesis) {
    scopedYearId = proposal.thesis.academicYearId;
    scopedDeptId = proposal.thesis.academicYear?.departmentId;
  }

  if ((scope === 'year' || scope === 'year_department') && scopedYearId) {
    where.proposal = {
      OR: [
        { group: { academicYearId: scopedYearId } },
        { thesis: { academicYearId: scopedYearId } },
      ],
    };
  }
  if ((scope === 'department' || scope === 'year_department') && scopedDeptId) {
    const deptFilter = {
      OR: [
        { group: { academicYear: { departmentId: scopedDeptId } } },
        { thesis: { academicYear: { departmentId: scopedDeptId } } },
      ],
    };
    where.proposal = where.proposal ? { AND: [where.proposal, deptFilter] } : deptFilter;
  }

  const candidates = await prisma.documentEmbedding.findMany({
    where,
    take: 200,
    include: {
      proposal: {
        select: {
          id: true,
          stage: true,
          documentType: true,
          createdAt: true,
          group: {
            select: {
              id: true,
              name: true,
              projectTitle: true,
              academicYear: { select: { year: true, department: { select: { name: true, code: true } } } },
            },
          },
          thesis: {
            select: {
              id: true,
              title: true,
              academicYear: { select: { year: true, department: { select: { name: true, code: true } } } },
            },
          },
          submittedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  return {
    scope,
    candidates: candidates.map((c) => ({
      id: c.id,
      proposalId: c.proposalId,
      documentType: c.documentType,
      title: c.proposal?.group?.projectTitle || c.proposal?.thesis?.title || '(untitled)',
      group: c.proposal?.group ? { id: c.proposal.group.id, name: c.proposal.group.name } : null,
      thesis: c.proposal?.thesis ? { id: c.proposal.thesis.id, title: c.proposal.thesis.title } : null,
      year: c.proposal?.group?.academicYear?.year || c.proposal?.thesis?.academicYear?.year || null,
      department:
        c.proposal?.group?.academicYear?.department?.name ||
        c.proposal?.thesis?.academicYear?.department?.name ||
        null,
      submittedBy: c.proposal?.submittedBy
        ? `${c.proposal.submittedBy.firstName} ${c.proposal.submittedBy.lastName}`
        : null,
      vector: c.vector,
    })),
  };
}

exports.summarize = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Document not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });

    const text = await extractText(filePath);
    const data = await callAI('/api/ai/summarize', {
      proposal_id: proposalId,
      document_text: text,
      document_type: proposal.documentType || 'PROPOSAL',
      custom_prompt: req.body?.custom_prompt || undefined,
    });
    res.json(data);
  } catch (e) {
    console.error('AI summarize error:', e.message);
    res.status(500).json({ error: e.message || 'AI service unavailable' });
  }
};

exports.evaluate = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const { criteria, custom_instructions } = req.body;
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ error: 'criteria array is required' });
    }

    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Document not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });

    const text = await extractText(filePath);
    const data = await callAI('/api/ai/evaluate', {
      proposal_id: proposalId,
      document_text: text,
      criteria,
      document_type: proposal.documentType || 'PROPOSAL',
      custom_instructions: custom_instructions || undefined,
    });
    res.json(data);
  } catch (e) {
    console.error('AI evaluate error:', e.message);
    res.status(500).json({ error: e.message || 'AI service unavailable' });
  }
};

exports.ask = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'question is required' });

    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Document not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });

    const text = await extractText(filePath);
    const data = await callAI('/api/ai/ask', {
      proposal_id: proposalId,
      document_text: text,
      question,
      document_type: proposal.documentType || 'PROPOSAL',
    });
    res.json(data);
  } catch (e) {
    console.error('AI ask error:', e.message);
    res.status(500).json({ error: e.message || 'AI service unavailable' });
  }
};

exports.embed = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Document not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });

    const text = await extractText(filePath);
    const data = await callAI('/api/ai/embed', {
      proposal_id: proposalId,
      document_text: text,
      document_type: proposal.documentType || 'PROPOSAL',
    });

    const stored = await prisma.documentEmbedding.upsert({
      where: { proposalId },
      update: {
        vector: data.vector || [],
        model: 'ai-service',
        charCount: data.char_count || text.length,
        documentType: proposal.documentType || 'PROPOSAL',
      },
      create: {
        proposalId,
        vector: data.vector || [],
        model: 'ai-service',
        charCount: data.char_count || text.length,
        documentType: proposal.documentType || 'PROPOSAL',
      },
    });

    res.json({
      vector_dim: data.vector_dim,
      char_count: stored.charCount,
      embedding_id: stored.id,
    });
  } catch (e) {
    console.error('AI embed error:', e.message);
    res.status(500).json({ error: e.message || 'AI service unavailable' });
  }
};

exports.listCandidates = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const scope = (req.query.scope || 'all').toString();
    const result = await loadCandidates(proposalId, scope);
    res.json(result);
  } catch (e) {
    console.error('listCandidates error:', e.message);
    res.status(500).json({ error: e.message || 'Failed to list candidates' });
  }
};

exports.similarity = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const { scope = 'all', top_k = 5, threshold = 0, candidate_ids = null } = req.body || {};
    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Document not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });
    const text = await extractText(filePath);

    const loaded = await loadCandidates(proposalId, scope);
    let candidates = loaded.candidates || [];
    if (Array.isArray(candidate_ids) && candidate_ids.length > 0) {
      const set = new Set(candidate_ids.map(Number));
      candidates = candidates.filter((c) => set.has(c.id));
    }

    const data = await callAI('/api/ai/similarity', {
      proposal_id: proposalId,
      document_text: text,
      candidates: candidates.map((c) => ({ id: c.id, vector: c.vector })),
      top_k: Number(top_k) || 5,
      threshold: Number(threshold) || 0,
      document_type: proposal.documentType || 'PROPOSAL',
    });

    const enriched = (data.matches || []).map((m) => {
      const meta = candidates.find((c) => c.id === m.id) || {};
      return { ...m, ...meta };
    });

    res.json({ scope, compared: data.compared || candidates.length, matches: enriched });
  } catch (e) {
    console.error('AI similarity error:', e.message);
    res.status(500).json({ error: e.message || 'AI service unavailable' });
  }
};
