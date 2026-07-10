const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

function getStoragePath(documentUrl) {
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
  return fs.readFileSync(filePath, 'utf-8').slice(0, 50000);
}

async function callAI(endpoint, payload) {
  const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, nvidia_api_key: NVIDIA_API_KEY }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI service error ${response.status}: ${errText}`);
  }
  return response.json();
}

exports.summarize = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });

    const text = await extractText(filePath);
    const data = await callAI('/api/ai/summarize', { proposal_id: proposalId, document_text: text });
    res.json(data);
  } catch (e) {
    console.error('AI summarize error:', e.message);
    res.status(500).json({ error: e.message || 'AI service unavailable' });
  }
};

exports.evaluate = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const { criteria } = req.body;
    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
      return res.status(400).json({ error: 'criteria array is required' });
    }

    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });

    const text = await extractText(filePath);
    const data = await callAI('/api/ai/evaluate', { proposal_id: proposalId, document_text: text, criteria });
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
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });

    const filePath = getStoragePath(proposal.documentUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Document file not found' });

    const text = await extractText(filePath);
    const data = await callAI('/api/ai/ask', { proposal_id: proposalId, document_text: text, question });
    res.json(data);
  } catch (e) {
    console.error('AI ask error:', e.message);
    res.status(500).json({ error: e.message || 'AI service unavailable' });
  }
};
