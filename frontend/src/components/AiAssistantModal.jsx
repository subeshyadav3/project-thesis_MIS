import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './ui';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

const PRESET_CRITERIA = {
  'Minor Project': [
    { name: 'Problem Definition & Scope', maxMarks: 10 },
    { name: 'Literature Review', maxMarks: 10 },
    { name: 'Methodology & Approach', maxMarks: 15 },
    { name: 'Feasibility & Timeline', maxMarks: 5 },
    { name: 'Expected Outcomes', maxMarks: 10 },
  ],
  'Major Project': [
    { name: 'Problem Definition & Scope', maxMarks: 10 },
    { name: 'Literature Review & Gap Analysis', maxMarks: 15 },
    { name: 'Methodology & Approach', maxMarks: 20 },
    { name: 'Implementation Plan', maxMarks: 10 },
    { name: 'Evaluation & Testing Strategy', maxMarks: 10 },
    { name: 'Expected Outcomes & Impact', maxMarks: 10 },
  ],
  'Thesis': [
    { name: 'Research Problem & Objectives', maxMarks: 15 },
    { name: 'Literature Review & Theoretical Framework', maxMarks: 15 },
    { name: 'Research Methodology', maxMarks: 20 },
    { name: 'Originality & Contribution', maxMarks: 15 },
    { name: 'Feasibility & Timeline', maxMarks: 10 },
    { name: 'Expected Outcomes & Publication Potential', maxMarks: 10 },
  ],
};

const SUGGESTED_QUESTIONS = [
  'What is this proposal about?',
  'What methodology does it use?',
  'What are the main objectives?',
  'What are the expected outcomes?',
  'What are the strengths of this work?',
  'What are the weaknesses or risks?',
];

export default function AiAssistantModal({ proposal, onClose }) {
  const [tab, setTab] = useState('summarize');
  const [loading, setLoading] = useState(false);
  const [streamingTabs, setStreamingTabs] = useState({});
  const [result, setResult] = useState(null);
  const [question, setQuestion] = useState('');
  const [criteriaList, setCriteriaList] = useState([]);
  const [preset, setPreset] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [useCustomInstructions, setUseCustomInstructions] = useState(false);
  const [similarityScope, setSimilarityScope] = useState('all');
  const [similarityTopK, setSimilarityTopK] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0);
  const [streamingText, setStreamingText] = useState('');
  const [cachedResults, setCachedResults] = useState({});
  const abortRef = useRef(null);
  const resultRef = useRef(null);
  const toast = useToast();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isNonStudent = ['COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(user.role);
  const canUseSimilarity = ['COORDINATOR', 'SUPERVISOR'].includes(user.role);
  if (!isNonStudent) return null;

  const parseJSONFromText = (text) => {
    if (!text) return null;
    let cleaned = text.replace(/^```json\s*/i, '').replace(/```/gi, '').trim();
    const tryParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
    let r = tryParse(cleaned);
    if (r && typeof r === 'object') return r;
    // Strip trailing incomplete values: ": "..." → ': ""'
    cleaned = cleaned.replace(/,\s*"[^"]*"?\s*:?\s*$/, '').replace(/:\s*"[^"]*$/, ': ""');
    r = tryParse(cleaned);
    if (r && typeof r === 'object') return r;
    // Track open braces/brackets and close them
    const stack = [];
    let inStr = false, esc = false;
    for (const ch of cleaned) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
      else if (ch === '}' || ch === ']') stack.pop();
    }
    let fixed = cleaned.replace(/,\s*$/, '');
    while (stack.length) fixed += stack.pop();
    r = tryParse(fixed);
    if (r && typeof r === 'object') return r;
    return null;
  };

  // Extract readable plain-text from a value that might be raw JSON string
  const extractStringValue = (val) => {
    if (val == null) return '';
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    // If it's JSON-like, try to extract content
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```')) {
      const parsed = parseJSONFromText(trimmed);
      if (parsed && typeof parsed === 'object') {
        // Extract executive_summary or first string field
        if (parsed.executive_summary) return parsed.executive_summary;
        if (parsed.summary) return parsed.summary;
        return Object.values(parsed).find(v => typeof v === 'string') || val;
      }
      // Couldn't parse — strip JSON syntax as best-effort
      return trimmed.replace(/[{}":,\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return val;
  };

  // Sanitize summary by ensuring each field is a clean string (not raw JSON)
  const sanitizeSummary = (summary) => {
    if (!summary || typeof summary !== 'object') return summary;
    const out = {};
    for (const [k, v] of Object.entries(summary)) {
      if (Array.isArray(v)) {
        // arrays stay as arrays, but each item is sanitized
        out[k] = v.map(item => {
          if (typeof item === 'string') {
            const trimmed = item.trim();
            // If a string item looks like JSON object syntax, extract plain text
            if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
              return extractStringValue(trimmed);
            }
            return item;
          }
          return item;
        });
      } else if (typeof v === 'string') {
        out[k] = extractStringValue(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  const abortStream = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const callAIStream = async (endpoint, payload, { onDelta, streamKey } = {}) => {
    const controller = new AbortController();
    abortRef.current = controller;
    if (streamKey) {
      setStreamingTabs(prev => ({ ...prev, [streamKey]: controller }));
      setLoading(true);
    }
    setStreamingText('');
    const token = localStorage.getItem('token');
    const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `AI service error ${response.status}`;
        try { errMsg = JSON.parse(errText).error || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;
      let accumulatedText = '';

      const processLine = (line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) return;
        const jsonStr = trimmed.slice(6);
        try {
          const data = JSON.parse(jsonStr);
          if (data.error) throw new Error(data.error);
          if (data.delta) {
            accumulatedText += data.delta;
            if (onDelta) onDelta(accumulatedText);
          }
          if (data.done) finalResult = data.result || data;
        } catch (e) {
          if (e instanceof SyntaxError) return;
          throw e;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) processLine(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop();
        for (const part of parts) processLine(part);
      }

      return { finalResult, accumulatedText };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      toast.error(err.message || 'AI service unavailable. Is the AI server running?');
      return null;
    } finally {
      if (streamKey) {
        setStreamingTabs(prev => {
          const n = { ...prev };
          delete n[streamKey];
          // Mark loading = any active streams remain
          setLoading(Object.keys(n).length > 0);
          return n;
        });
      }
      abortRef.current = null;
      setStreamingText('');
    }
  };

  const handleSummarize = async () => {
    const payload = {};
    if (useCustomPrompt && customPrompt.trim()) payload.custom_prompt = customPrompt.trim();
    const placeholder = { type: 'summary', data: {}, custom: false, _streaming: true };
    setResult(placeholder);
    setCachedResults(prev => ({ ...prev, summarize: placeholder }));
    const res = await callAIStream(`/ai/summarize/${proposal.id}`, payload, {
      streamKey: 'summarize',
      onDelta: (text) => {
        // Try to incrementally parse the partial JSON and show readable fields
        const partial = parseJSONFromText(text);
        if (partial && typeof partial === 'object') {
          const sanitized = sanitizeSummary(partial);
          const partialEntry = { type: 'summary', data: sanitized, custom: false, _streaming: true };
          // Only update active tab's result if user is still on summarize tab
          if (tab === 'summarize') setResult(partialEntry);
          setCachedResults(prev => ({ ...prev, summarize: partialEntry }));
        } else {
          setStreamingText('Generating summary...');
        }
      },
    });
    if (!res) return;
    const { finalResult, accumulatedText } = res;

    let summary = parseJSONFromText(accumulatedText);
    if (!summary || typeof summary !== 'object') {
      let fromDone = finalResult?.summary;
      if (typeof fromDone === 'string') {
        try { fromDone = JSON.parse(fromDone); } catch (_) {}
      }
      if (fromDone && typeof fromDone === 'object') summary = fromDone;
    }
    if (summary?.executive_summary && summary.executive_summary.includes('"executive_summary"')) {
      const reparsed = parseJSONFromText(summary.executive_summary);
      if (reparsed && typeof reparsed === 'object') summary = { ...summary, ...reparsed };
    }
    if (summary && typeof summary === 'object') {
      summary = sanitizeSummary(summary);
    }

    if (summary && typeof summary === 'object' && (summary.executive_summary || summary.objectives || summary.methodology)) {
      const entry = { type: 'summary', data: summary, custom: finalResult?.custom, _streaming: false };
      // Only push to result if user is currently viewing this tab
      if (tab === 'summarize') setResult(entry);
      setCachedResults(prev => ({ ...prev, summarize: entry }));
    } else {
      toast.error('Failed to parse AI summary. Please try again.');
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) { toast.warning('Enter a question first'); return; }
    const qQuestion = question;
    const placeholder = { type: 'answer', data: '', question: qQuestion, _streaming: true };
    setResult(placeholder);
    setCachedResults(prev => ({ ...prev, ask: placeholder }));
    const res = await callAIStream(`/ai/ask/${proposal.id}`, { question: qQuestion }, {
      streamKey: 'ask',
      onDelta: (text) => {
        const partialEntry = { type: 'answer', data: text, question: qQuestion, _streaming: true };
        if (tab === 'ask') setResult(partialEntry);
        setCachedResults(prev => ({ ...prev, ask: partialEntry }));
      },
    });
    if (!res) return;
    const { finalResult, accumulatedText } = res;
    const answer = finalResult?.answer || accumulatedText || '';
    if (answer) {
      const entry = { type: 'answer', data: answer, question: qQuestion, _streaming: false };
      if (tab === 'ask') setResult(entry);
      setCachedResults(prev => ({ ...prev, ask: entry }));
    }
  };

  const handleEvaluate = async () => {
    if (criteriaList.length === 0) { toast.warning('Add at least one criterion'); return; }
    const payload = { criteria: criteriaList };
    if (useCustomInstructions && customInstructions.trim()) payload.custom_instructions = customInstructions.trim();
    const placeholder = { type: 'evaluation', data: { scores: [], total_marks: 0, max_marks: 0 }, _streaming: true };
    setResult(placeholder);
    setCachedResults(prev => ({ ...prev, evaluate: placeholder }));
    const res = await callAIStream(`/ai/evaluate/${proposal.id}`, payload, {
      streamKey: 'evaluate',
      onDelta: (text) => {
        const partial = parseJSONFromText(text);
        if (partial && (partial.criteria?.length || partial.summary || partial.overall_score !== undefined)) {
          if (partial.criteria?.length) {
            const scores = partial.criteria.map((c) => ({
              criterion_name: c.label || c.key,
              marks: c.score || 0,
              max_marks: criteriaList.find((rc) => (rc.name || rc.key) === (c.label || c.key))?.maxMarks || 10,
              reasoning: c.reason || '',
            }));
            const total_marks = scores.reduce((sum, s) => sum + s.marks, 0);
            const max_marks = scores.reduce((sum, s) => sum + s.max_marks, 0);
            const partialEntry = { type: 'evaluation', data: { scores, total_marks, max_marks }, _streaming: true };
            if (tab === 'evaluate') setResult(partialEntry);
            setCachedResults(prev => ({ ...prev, evaluate: partialEntry }));
          } else if (partial.summary) {
            const partialEntry = { type: 'evaluation', data: { scores: [], total_marks: 0, max_marks: 0, summary_text: extractStringValue(partial.summary) || partial.summary }, _streaming: true };
            if (tab === 'evaluate') setResult(partialEntry);
            setCachedResults(prev => ({ ...prev, evaluate: partialEntry }));
          }
        } else {
          setStreamingText('Evaluating...');
        }
      },
    });
    if (!res) return;
    const { finalResult, accumulatedText } = res;

    let evalData = parseJSONFromText(accumulatedText);
    if (!evalData?.criteria?.length) evalData = finalResult;
    if (!evalData?.criteria?.length && accumulatedText) evalData = parseJSONFromText(accumulatedText);

    if (evalData?.criteria?.length) {
      const scores = evalData.criteria.map((c) => ({
        criterion_name: c.label || c.key,
        marks: c.score || 0,
        max_marks: criteriaList.find((rc) => (rc.name || rc.key) === (c.label || c.key))?.maxMarks || 10,
        reasoning: c.reason || '',
      }));
      const total_marks = scores.reduce((sum, s) => sum + s.marks, 0);
      const max_marks = scores.reduce((sum, s) => sum + s.max_marks, 0);
      const entry = { type: 'evaluation', data: { scores, total_marks, max_marks }, _streaming: false };
      if (tab === 'evaluate') setResult(entry);
      setCachedResults(prev => ({ ...prev, evaluate: entry }));
    } else if (evalData?.summary) {
      const entry = { type: 'evaluation', data: { scores: [], summary_text: evalData.summary, total_marks: 0, max_marks: 0 }, _streaming: false };
      if (tab === 'evaluate') setResult(entry);
      setCachedResults(prev => ({ ...prev, evaluate: entry }));
    } else {
      toast.error('Failed to parse evaluation. Please try again.');
    }
  };

  const handleSimilarity = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post(`/ai/similarity/${proposal.id}`, {
        scope: similarityScope,
        top_k: Number(similarityTopK) || 5,
        threshold: Number(similarityThreshold) || 0,
      });
      if (data) {
        const entry = { type: 'similarity', data };
        setResult(entry);
        setCachedResults(prev => ({ ...prev, similarity: entry }));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI service unavailable. Is the AI server running?');
    } finally {
      setLoading(false);
    }
  };

  const addCriterion = (name = '', maxMarks = 10) => {
    setCriteriaList([...criteriaList, { name, maxMarks: Number(maxMarks) }]);
  };
  const removeCriterion = (idx) => {
    setCriteriaList(criteriaList.filter((_, i) => i !== idx));
  };
  const updateCriterion = (idx, field, value) => {
    const updated = [...criteriaList];
    updated[idx] = { ...updated[idx], [field]: field === 'maxMarks' ? Number(value) : value };
    setCriteriaList(updated);
  };

  const applyPreset = (key) => {
    setPreset(key);
    setCriteriaList(PRESET_CRITERIA[key] ? JSON.parse(JSON.stringify(PRESET_CRITERIA[key])) : []);
  };

  const copyResult = () => {
    if (!result) return;
    const text = JSON.stringify(result.data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }).catch(() => toast.success('Copied!'));
  };

  const tabMeta = {
    summarize: { icon: 'summarize', label: 'Summarize', desc: 'Get a structured summary of this document — objectives, methodology, outcomes, strengths, and risks.' },
    ask: { icon: 'question_answer', label: 'Ask Questions', desc: 'Ask anything about the document content. The AI answers based on what it reads.' },
    evaluate: { icon: 'grading', label: 'Evaluate', desc: 'Score the document against custom criteria with AI-powered assessment.' },
    similarity: { icon: 'compare', label: 'Similarity', desc: 'Compare this document against other project/thesis documents to detect overlap or related work.' },
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal ai-modal" onClick={e => e.stopPropagation()}>
          <div className="ai-modal-header">
            <div className="ai-header-glow" />
            <div className="ai-header-content">
              <div className="ai-header-icon">
                <Icon name="psychology" className="material-symbols-outlined" />
              </div>
              <div className="ai-header-text">
                <h2>AI Assistant</h2>
                <p>Analyzing <strong>{proposal?.documentUrl?.split('/').pop() || 'document'}</strong></p>
              </div>
              <button className="ai-close-btn" onClick={onClose}>
                <Icon name="close" className="material-symbols-outlined" />
              </button>
            </div>
          </div>

          <div className="ai-tabs">
            {Object.entries(tabMeta).map(([key, meta]) => {
              if (key === 'similarity' && !canUseSimilarity) return null;
              return (
                <button
                  key={key}
                  className={`ai-tab ${tab === key ? 'active' : ''}`}
                  onClick={() => {
                    // Tab switch should NOT cancel in-flight streams — every tab can stream in parallel.
                    setTab(key);
                    setQuestion('');
                    const cached = cachedResults[key];
                    setResult(cached || null);
                  }}
                >
                  <Icon name={meta.icon} className="material-symbols-outlined" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className="ai-body">
            <p className="ai-desc">{tabMeta[tab]?.desc}</p>

            {/* ─── SUMMARIZE TAB ─── */}
            {tab === 'summarize' && !result && !loading && (
              <div className="ai-action-area">
                <div className="ai-summarize-preview">
                  <div className="ai-preview-item"><Icon name="checklist" className="material-symbols-outlined" /> Executive Summary</div>
                  <div className="ai-preview-item"><Icon name="track_changes" className="material-symbols-outlined" /> Objectives</div>
                  <div className="ai-preview-item"><Icon name="route" className="material-symbols-outlined" /> Methodology</div>
                  <div className="ai-preview-item"><Icon name="flag" className="material-symbols-outlined" /> Expected Outcomes</div>
                  <div className="ai-preview-item"><Icon name="check_circle" className="material-symbols-outlined" /> Strengths & Weaknesses</div>
                </div>

                <div className="ai-custom-prompt">
                  <label className="ai-toggle-row">
                    <input
                      type="checkbox"
                      checked={useCustomPrompt}
                      onChange={(e) => setUseCustomPrompt(e.target.checked)}
                    />
                    <span>Use my own summarization prompt</span>
                  </label>
                  {useCustomPrompt && (
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="e.g. Focus on technical feasibility, novelty, and deliverable scope. Skip background section."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      style={{ minHeight: 80, resize: 'vertical', fontSize: 13 }}
                    />
                  )}
                </div>

                <button className="btn btn-primary ai-cta" onClick={handleSummarize} disabled={useCustomPrompt && !customPrompt.trim()}>
                  <Icon name="auto_awesome" className="material-symbols-outlined" />
                  {useCustomPrompt ? 'Summarize with my prompt' : 'Generate Summary'}
                </button>
              </div>
            )}

            {/* ─── ASK TAB ─── */}
            {tab === 'ask' && !result && !loading && (
              <div className="ai-action-area">
                <div className="ai-suggested-questions">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      className="ai-chip"
                      onClick={() => { setQuestion(q); }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="ai-ask-input">
                  <input
                    className="form-input"
                    placeholder="Type your question here..."
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAsk(); }}
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={handleAsk} disabled={!question.trim()}>
                    <Icon name="send" className="material-symbols-outlined" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── EVALUATE TAB ─── */}
            {tab === 'evaluate' && !result && !loading && (
              <div className="ai-action-area">
                <div className="ai-presets">
                  <label>Quick presets:</label>
                  <div className="ai-preset-chips">
                    {Object.keys(PRESET_CRITERIA).map(key => (
                      <button
                        key={key}
                        className={`ai-chip ${preset === key ? 'active' : ''}`}
                        onClick={() => applyPreset(key)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ai-criteria-list">
                  {criteriaList.map((c, idx) => (
                    <div key={idx} className="ai-criterion-row">
                      <input
                        className="form-input"
                        placeholder="Criterion name"
                        value={c.name}
                        onChange={e => updateCriterion(idx, 'name', e.target.value)}
                      />
                      <div className="ai-criterion-marks">
                        <span>/</span>
                        <input
                          type="number"
                          className="form-input ai-marks-input"
                          value={c.maxMarks}
                          onChange={e => updateCriterion(idx, 'maxMarks', e.target.value)}
                          min={1}
                          max={100}
                        />
                      </div>
                      <button className="ai-remove-btn" onClick={() => removeCriterion(idx)}>
                        <Icon name="close" className="material-symbols-outlined" />
                      </button>
                    </div>
                  ))}
                  <button className="ai-add-criterion" onClick={() => addCriterion()}>
                    <Icon name="add" className="material-symbols-outlined" />
                    Add Criterion
                  </button>
                </div>

                <button
                  className="btn btn-primary ai-cta"
                  onClick={handleEvaluate}
                  disabled={criteriaList.length === 0 || (useCustomInstructions && !customInstructions.trim())}
                >
                  <Icon name="grading" className="material-symbols-outlined" />
                  Run Evaluation ({criteriaList.length} criteria)
                </button>

                <div className="ai-custom-prompt">
                  <label className="ai-toggle-row">
                    <input
                      type="checkbox"
                      checked={useCustomInstructions}
                      onChange={(e) => setUseCustomInstructions(e.target.checked)}
                    />
                    <span>Add my own evaluator instructions</span>
                  </label>
                  {useCustomInstructions && (
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="e.g. Be stricter on real-world impact. Reward cost-aware engineering. Penalize vague objectives."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      style={{ minHeight: 80, resize: 'vertical', fontSize: 13 }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ─── SIMILARITY TAB ─── */}
            {tab === 'similarity' && !result && !loading && canUseSimilarity && (
              <div className="ai-action-area">
                <div className="ai-similarity-options">
                  <div className="form-group">
                    <label>Compare against</label>
                    <select
                      className="form-input"
                      value={similarityScope}
                      onChange={(e) => setSimilarityScope(e.target.value)}
                    >
                      <option value="all">All documents</option>
                      <option value="year">Same academic year</option>
                      <option value="department">Same department</option>
                      <option value="year_department">Same year & department</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Top matches</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="form-input"
                        value={similarityTopK}
                        onChange={(e) => setSimilarityTopK(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Min similarity (0–1)</label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        className="form-input"
                        value={similarityThreshold}
                        onChange={(e) => setSimilarityThreshold(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary ai-cta" onClick={handleSimilarity}>
                  <Icon name="compare_arrows" className="material-symbols-outlined" />
                  Find similar documents
                </button>
              </div>
            )}

            {/* ─── LOADING / STREAMING ─── */}
            {loading && !(result && (result._streaming || result.type === 'ask' || result.type === 'summary' || result.type === 'evaluation')) && (
              <div className="ai-loading">
                {streamingText ? (
                  <div className="ai-streaming">
                    <Icon name="psychology" className="material-symbols-outlined" />
                    <span>{streamingText}</span>
                  </div>
                ) : (
                  <>
                    <div className="ai-loading-spinner">
                      <div className="ai-spinner-ring" />
                      <Icon name="psychology" className="material-symbols-outlined" />
                    </div>
                    <div className="ai-loading-text">
                      <p className="ai-loading-title">AI is analyzing the document...</p>
                      <p className="ai-loading-sub">Reading content and generating insights</p>
                    </div>
                    <div className="ai-loading-dots">
                      <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
                    </div>
                  </>
                )}
                <button className="btn btn-outline btn-sm ai-abort-btn" onClick={abortStream}>
                  <Icon name="stop" className="material-symbols-outlined" />
                  Cancel
                </button>
              </div>
            )}

            {/* ─── RESULTS ─── */}
            {result && (
              <div className="ai-result" ref={resultRef}>
                <div className="ai-result-header">
                  <div className="ai-result-title">
                    <Icon name={result.type === 'summary' ? 'summarize' : result.type === 'answer' ? 'psychology' : result.type === 'similarity' ? 'compare_arrows' : 'grading'} className="material-symbols-outlined" />
                    <span>
                      {result.type === 'summary' ? 'Summary' : result.type === 'answer' ? 'Answer' : result.type === 'similarity' ? 'Similar Documents' : 'Evaluation Results'}
                    </span>
                    {result._streaming && (
                      <span className="ai-streaming-pill">
                        <span className="ai-streaming-dot" />
                        Generating…
                      </span>
                    )}
                  </div>
                  <button className="ai-copy-btn" onClick={copyResult} title="Copy to clipboard">
                    <Icon name={showCopied ? 'check' : 'content_copy'} className="material-symbols-outlined" />
                    {showCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="ai-result-body">
                  {result.type === 'summary' && <SummaryView data={result.data} custom={result.custom} streaming={result._streaming} />}
                  {result.type === 'answer' && <AnswerView data={result.data} question={result.question} streaming={result._streaming} />}
                  {result.type === 'evaluation' && <EvaluationView data={result.data} streaming={result._streaming} />}
                  {result.type === 'similarity' && <SimilarityView data={result.data} />}
                  {result._streaming && <span className="ai-streaming-tail"><span className="ai-streaming-dot" /> streaming…</span>}
                </div>
                <div className="ai-result-actions">
                  {result._streaming && streamingTabs[result.type === 'similarity' ? 'similarity' : result.type === 'answer' ? 'ask' : result.type === 'evaluation' ? 'evaluate' : 'summarize'] && (
                    <button className="btn btn-outline btn-sm" onClick={abortStream}>
                      <Icon name="stop_circle" className="material-symbols-outlined" />
                      Cancel
                    </button>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => { abortStream(); setResult(null); setCachedResults(prev => { const n = { ...prev }; delete n[tab]; return n; }); }}>
                    <Icon name="refresh" className="material-symbols-outlined" />
                    {tab === 'ask' ? 'Ask Another' : tab === 'similarity' ? 'Re-scan' : 'Re-run'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="ai-footer">
            <Icon name="info" className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.6 }} />
            <span>AI responses are generated by NVIDIA Llama and may not be perfectly accurate. Always review before making decisions.</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── SUB-COMPONENTS ─── */

function SummaryView({ data, custom, streaming }) {
  if (!data || data.error) return <p className="ai-error">Failed to generate summary.</p>;
  const sections = [
    { key: 'executive_summary', label: 'Executive Summary', icon: 'article', color: 'var(--color-primary)' },
    { key: 'objectives', label: 'Objectives', icon: 'track_changes', color: 'var(--color-success)', list: true },
    { key: 'methodology', label: 'Methodology', icon: 'route', color: 'var(--color-tertiary)' },
    { key: 'expected_outcomes', label: 'Expected Outcomes', icon: 'flag', color: 'var(--color-primary)', list: true },
    { key: 'strengths', label: 'Strengths', icon: 'check_circle', color: 'var(--color-success)', list: true },
    { key: 'weaknesses_or_risks', label: 'Weaknesses / Risks', icon: 'warning', color: 'var(--color-warning)', list: true },
  ];

  const hasContent = sections.some(s => {
    const v = data?.[s.key];
    return v && !(Array.isArray(v) && v.length === 0);
  });

  if (streaming && !hasContent) {
    return (
      <div className="ai-summary">
        <div className="ai-pill">
          <Icon name="psychology" className="material-symbols-outlined" style={{ animation: 'aiPulse 1s ease-in-out infinite' }} />
          Generating summary...
        </div>
      </div>
    );
  }

  return (
    <div className="ai-summary">
      {custom && (
        <div className="ai-pill">
          <Icon name="auto_awesome" className="material-symbols-outlined" /> Custom prompt summary
        </div>
      )}
      {sections.map(sec => {
        const val = data[sec.key];
        if (!val || (Array.isArray(val) && val.length === 0)) return null;
        return (
          <div key={sec.key} className="ai-summary-section">
            <div className="ai-summary-section-header" style={{ '--section-color': sec.color }}>
              <Icon name={sec.icon} className="material-symbols-outlined" />
              {sec.label}
            </div>
            <div className="ai-summary-section-body">
              {sec.list ? (
                <ul>{val.map((item, i) => <li key={i}>{item}</li>)}</ul>
              ) : (
                <p>{val}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnswerView({ data, question, streaming }) {
  return (
    <div className="ai-answer">
      {question && (
        <div className="ai-answer-question">
          <Icon name="person" className="material-symbols-outlined" />
          <span>{question}</span>
        </div>
      )}
      <div className="ai-answer-response">
        <Icon name="smart_toy" className="material-symbols-outlined" />
        <p>{data}{streaming && data && <span className="ai-cursor">▍</span>}</p>
      </div>
    </div>
  );
}

function EvaluationView({ data, streaming }) {
  if (!data) return null;
  // While streaming with no usable content yet, show a loading-style indicator
  if (streaming && !data.scores?.length) {
    return (
      <div className="ai-evaluation">
        <div className="ai-pill">
          <Icon name="psychology" className="material-symbols-outlined" style={{ animation: 'aiPulse 1s ease-in-out infinite' }} />
          Evaluating...
        </div>
        {data.summary_text && (
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>{data.summary_text}</p>
        )}
      </div>
    );
  }
  // If we don't have criteria rows yet but we have a streaming summary text, show that
  if (data?.summary_text) {
    if (!data?.scores?.length) {
      return (
        <div className="ai-evaluation">
          <div className="ai-pill">
            <Icon name="hourglass_top" className="material-symbols-outlined" /> Evaluation pending…
          </div>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>{data.summary_text}</p>
        </div>
      );
    }
  }
  if (!data?.scores || data.error) return <p className="ai-error">Evaluation failed.</p>;
  const pct = data.max_marks ? Math.round((data.total_marks / data.max_marks) * 100) : 0;
  const grade = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F';
  const gradeColor = pct >= 80 ? 'var(--color-success)' : pct >= 65 ? 'var(--color-tertiary)' : pct >= 50 ? 'var(--color-secondary)' : 'var(--color-error)';
  return (
    <div className="ai-evaluation">
      <div className="ai-eval-summary">
        <div className="ai-eval-grade" style={{ background: gradeColor }}>{grade}</div>
        <div className="ai-eval-stats">
          <div className="ai-eval-total">{data.total_marks} <small>/ {data.max_marks}</small></div>
          <div className="ai-eval-bar-bg">
            <div className="ai-eval-bar" style={{ width: `${pct}%`, background: gradeColor }} />
          </div>
          <div className="ai-eval-pct">{pct}%</div>
        </div>
      </div>
      <table className="ai-eval-table">
        <thead>
          <tr><th>Criterion</th><th>Score</th><th>Max</th><th>Reasoning</th></tr>
        </thead>
        <tbody>
          {data.scores.map((s, i) => (
            <tr key={i}>
              <td className="ai-eval-name">{s.criterion_name}</td>
              <td className="ai-eval-mark"><strong>{s.marks}</strong></td>
              <td className="ai-eval-max">{s.max_marks}</td>
              <td className="ai-eval-reason">{s.reasoning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimilarityView({ data }) {
  const matches = data?.matches || [];
  return (
    <div className="ai-similarity">
      <div className="ai-pill">
        <Icon name="filter_alt" className="material-symbols-outlined" /> Scope: {data?.scope || 'all'} · {matches.length} matches from {data?.compared ?? 0} documents
      </div>
      {matches.length === 0 ? (
        <p className="ai-similarity-empty">No similar documents matched the current threshold.</p>
      ) : (
        <div className="ai-similarity-list">
          {matches.map((m, i) => {
            const pct = Math.round((m.similarity || 0) * 100);
            return (
              <div key={m.id || i} className="ai-similarity-item">
                <div className="ai-similarity-score">{pct}%</div>
                <div className="ai-similarity-info">
                  <div className="ai-similarity-title">{m.title || '(untitled)'}</div>
                  <div className="ai-similarity-meta">
                    {m.year && <span><Icon name="calendar_today" className="material-symbols-outlined" style={{ fontSize: 12 }} /> {m.year}</span>}
                    {m.department && <span><Icon name="apartment" className="material-symbols-outlined" style={{ fontSize: 12 }} /> {m.department}</span>}
                    {m.documentType && <span><Icon name="description" className="material-symbols-outlined" style={{ fontSize: 12 }} /> {m.documentType}</span>}
                    {m.submittedBy && <span><Icon name="person" className="material-symbols-outlined" style={{ fontSize: 12 }} /> {m.submittedBy}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

