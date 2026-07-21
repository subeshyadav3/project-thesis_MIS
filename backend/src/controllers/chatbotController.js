
const prisma = require('../utils/prisma');

const AI_CHATBOT_URL = (process.env.AI_CHATBOT_URL || 'http://localhost:8001').replace(/\/$/, '');

/**
 * Proxy a request to the new ai_chatbot service that handles the in-depth
 * analysis pipeline (PDF -> extract -> chunk -> embed -> store -> analyze).
 *
 * The AI service exposes the same public surface through its /api/ai prefix:
 *   POST /api/ai/analyze
 *   GET  /api/ai/status/{proposal_id}
 *   GET  /api/ai/analysis/{proposal_id}
 *   POST /api/ai/chat/{proposal_id}
 *   POST /api/ai/chat/{proposal_id}/stream
 */
async function callChatbot(path, options = {}) {
  const url = `${AI_CHATBOT_URL}/api/ai${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (process.env.AI_CHATBOT_TOKEN) headers['Authorization'] = `Bearer ${process.env.AI_CHATBOT_TOKEN}`;

  const resp = await fetch(url, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(opts_timeout(options)),
  });
  const text = await resp.text();
  let json = null;
  try { json = text ? JSON.parse(text) : {}; } catch (_) { json = { error: text }; }
  return { ok: resp.ok, status: resp.status, data: json, raw: resp };
}

function opts_timeout(options) {
  if (typeof options.timeoutMs === 'number') return options.timeoutMs;
  return 15_000;
}

function getProposalDocumentOr403(req) {
  return prisma.proposal.findUnique({
    where: { id: parseInt(req.params.id) },
    select: { id: true, documentUrl: true, documentType: true, groupId: true, thesisId: true },
  });
}

function userMaySeeProposal(req, proposal) {
  if (!proposal) return false;
  return true;
}

/**
 * Accept an analysis request.
 * Body: { force_recompute?: boolean, document_url?: string }
 */
exports.reanalyze = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const proposal = await getProposalDocumentOr403({ params: { id } });
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (!proposal.documentUrl) return res.status(400).json({ error: 'Proposal has no document' });

    const body = {
      proposal_id: id,
      document_url: proposal.documentUrl,
      force_recompute: !!req.body?.force_recompute,
    };

    const r = await callChatbot('/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(r.status || (r.ok ? 200 : 502)).json(r.data || { error: 'AI service error' });
  } catch (e) {
    console.error('reanalyze error:', e.message);
    return res.status(502).json({ error: `AI chatbot service unreachable: ${e.message}` });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const r = await callChatbot(`/status/${encodeURIComponent(req.params.id)}`, {
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(r.status || (r.ok ? 200 : 502)).json(r.data || { error: 'status unavailable' });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};

exports.getAnalysis = async (req, res) => {
  try {
    const r = await callChatbot(`/analysis/${encodeURIComponent(req.params.id)}`, {
      headers: { Authorization: req.headers.authorization || '' },
    });
    return res.status(r.status || (r.ok ? 200 : 502)).json(r.data || { error: 'analysis unavailable' });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};

/**
 * RAG chat. Forwards body: { question, top_k, history }.
 */
exports.chat = async (req, res) => {
  try {
    const id = req.params.id;
    const body = {
      proposal_id: parseInt(id),
      question: req.body?.question || '',
      top_k: req.body?.top_k,
      history: req.body?.history || [],
    };
    const r = await callChatbot('/chat', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: req.headers.authorization || '' },
      timeoutMs: 60_000,
    });
    return res.status(r.status || (r.ok ? 200 : 502)).json(r.data || { error: 'chat unavailable' });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
};

/**
 * Streaming chat. Forwards chunks via SSE-friendly raw text streaming.
 */
exports.chatStream = async (req, res) => {
  try {
    const id = req.params.id;
    const body = {
      proposal_id: parseInt(id),
      question: req.body?.question || '',
      top_k: req.body?.top_k,
      history: req.body?.history || [],
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const upstream = await fetch(`${AI_CHATBOT_URL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    if (!upstream.ok || !upstream.body) {
      res.write(`data: {"error":"AI chatbot stream unavailable (${upstream.status})"}\n\n`);
      return res.end();
    }
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }
    res.end();
  } catch (e) {
    const errorText = String(e.message || 'unknown').replace(/"/g, "'");
    res.write('data: {"error":"' + errorText + '"}\n\n');
    res.end();
  }
};
