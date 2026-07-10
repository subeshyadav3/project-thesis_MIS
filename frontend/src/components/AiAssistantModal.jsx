import React, { useState, useRef, useEffect } from 'react';
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
  const resultRef = useRef(null);
  const toast = useToast();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isNonStudent = ['COORDINATOR', 'SUPERVISOR', 'EXTERNAL_EXAMINER'].includes(user.role);
  const canUseSimilarity = ['COORDINATOR', 'SUPERVISOR'].includes(user.role);
  if (!isNonStudent) return null;

  const callAI = async (endpoint, payload) => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post(endpoint, payload);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI service unavailable. Is the AI server running?');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    const payload = {};
    if (useCustomPrompt && customPrompt.trim()) payload.custom_prompt = customPrompt.trim();
    const data = await callAI(`/ai/summarize/${proposal.id}`, payload);
    if (data) setResult({ type: 'summary', data: data.summary, custom: data.custom });
  };

  const handleAsk = async () => {
    if (!question.trim()) { toast.warning('Enter a question first'); return; }
    const data = await callAI(`/ai/ask/${proposal.id}`, { question });
    if (data) setResult({ type: 'answer', data: data.answer, question });
  };

  const handleEvaluate = async () => {
    if (criteriaList.length === 0) { toast.warning('Add at least one criterion'); return; }
    const payload = { criteria: criteriaList };
    if (useCustomInstructions && customInstructions.trim()) payload.custom_instructions = customInstructions.trim();
    const data = await callAI(`/ai/evaluate/${proposal.id}`, payload);
    if (data) setResult({ type: 'evaluation', data });
  };

  const handleSimilarity = async () => {
    const data = await callAI(`/ai/similarity/${proposal.id}`, {
      scope: similarityScope,
      top_k: Number(similarityTopK) || 5,
      threshold: Number(similarityThreshold) || 0,
    });
    if (data) setResult({ type: 'similarity', data });
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
      <style>{aiStyles}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal ai-modal" onClick={e => e.stopPropagation()}>
          <div className="ai-modal-header">
            <div className="ai-header-glow" />
            <div className="ai-header-content">
              <div className="ai-header-icon">
                <span className="material-symbols-outlined">psychology</span>
              </div>
              <div className="ai-header-text">
                <h2>AI Assistant</h2>
                <p>Analyzing <strong>{proposal?.documentUrl?.split('/').pop() || 'document'}</strong></p>
              </div>
              <button className="ai-close-btn" onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
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
                  onClick={() => { setTab(key); setResult(null); setQuestion(''); }}
                >
                  <span className="material-symbols-outlined">{meta.icon}</span>
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
                  <div className="ai-preview-item"><span className="material-symbols-outlined">checklist</span> Executive Summary</div>
                  <div className="ai-preview-item"><span className="material-symbols-outlined">track_changes</span> Objectives</div>
                  <div className="ai-preview-item"><span className="material-symbols-outlined">route</span> Methodology</div>
                  <div className="ai-preview-item"><span className="material-symbols-outlined">flag</span> Expected Outcomes</div>
                  <div className="ai-preview-item"><span className="material-symbols-outlined">check_circle</span> Strengths & Weaknesses</div>
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
                  <span className="material-symbols-outlined">auto_awesome</span>
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
                    <span className="material-symbols-outlined">send</span>
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
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  ))}
                  <button className="ai-add-criterion" onClick={() => addCriterion()}>
                    <span className="material-symbols-outlined">add</span>
                    Add Criterion
                  </button>
                </div>

                <button
                  className="btn btn-primary ai-cta"
                  onClick={handleEvaluate}
                  disabled={criteriaList.length === 0 || (useCustomInstructions && !customInstructions.trim())}
                >
                  <span className="material-symbols-outlined">grading</span>
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
                  <span className="material-symbols-outlined">compare_arrows</span>
                  Find similar documents
                </button>
              </div>
            )}

            {/* ─── LOADING ─── */}
            {loading && (
              <div className="ai-loading">
                <div className="ai-loading-spinner">
                  <div className="ai-spinner-ring" />
                  <span className="material-symbols-outlined">psychology</span>
                </div>
                <div className="ai-loading-text">
                  <p className="ai-loading-title">AI is analyzing the document...</p>
                  <p className="ai-loading-sub">Reading content and generating insights</p>
                </div>
                <div className="ai-loading-dots">
                  <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
                </div>
              </div>
            )}

            {/* ─── RESULTS ─── */}
            {result && !loading && (
              <div className="ai-result" ref={resultRef}>
                <div className="ai-result-header">
                  <div className="ai-result-title">
                    <span className="material-symbols-outlined">
                      {result.type === 'summary' ? 'summarize' : result.type === 'answer' ? 'psychology' : result.type === 'similarity' ? 'compare_arrows' : 'grading'}
                    </span>
                    <span>
                      {result.type === 'summary' ? 'Summary' : result.type === 'answer' ? 'Answer' : result.type === 'similarity' ? 'Similar Documents' : 'Evaluation Results'}
                    </span>
                  </div>
                  <button className="ai-copy-btn" onClick={copyResult} title="Copy to clipboard">
                    <span className="material-symbols-outlined">{showCopied ? 'check' : 'content_copy'}</span>
                    {showCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="ai-result-body">
                  {result.type === 'summary' && <SummaryView data={result.data} custom={result.custom} />}
                  {result.type === 'answer' && <AnswerView data={result.data} question={result.question} />}
                  {result.type === 'evaluation' && <EvaluationView data={result.data} />}
                  {result.type === 'similarity' && <SimilarityView data={result.data} />}
                </div>
                <div className="ai-result-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setResult(null)}>
                    <span className="material-symbols-outlined">refresh</span>
                    {tab === 'ask' ? 'Ask Another' : tab === 'similarity' ? 'Re-scan' : 'Re-run'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="ai-footer">
            <span className="material-symbols-outlined" style={{ fontSize: 14, opacity: 0.6 }}>info</span>
            <span>AI responses are generated by NVIDIA Llama and may not be perfectly accurate. Always review before making decisions.</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── SUB-COMPONENTS ─── */

function SummaryView({ data, custom }) {
  if (!data || data.error) return <p className="ai-error">Failed to generate summary.</p>;

  const sections = [
    { key: 'executive_summary', label: 'Executive Summary', icon: 'article', color: 'var(--color-primary)' },
    { key: 'objectives', label: 'Objectives', icon: 'track_changes', color: 'var(--color-success)', list: true },
    { key: 'methodology', label: 'Methodology', icon: 'route', color: 'var(--color-tertiary)' },
    { key: 'expected_outcomes', label: 'Expected Outcomes', icon: 'flag', color: 'var(--color-primary)', list: true },
    { key: 'strengths', label: 'Strengths', icon: 'check_circle', color: 'var(--color-success)', list: true },
    { key: 'weaknesses_or_risks', label: 'Weaknesses / Risks', icon: 'warning', color: 'var(--color-warning)', list: true },
  ];

  return (
    <div className="ai-summary">
      {custom && (
        <div className="ai-pill">
          <span className="material-symbols-outlined">auto_awesome</span> Custom prompt summary
        </div>
      )}
      {sections.map(sec => {
        const val = data[sec.key];
        if (!val || (Array.isArray(val) && val.length === 0)) return null;
        return (
          <div key={sec.key} className="ai-summary-section">
            <div className="ai-summary-section-header" style={{ '--section-color': sec.color }}>
              <span className="material-symbols-outlined">{sec.icon}</span>
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

function AnswerView({ data, question }) {
  return (
    <div className="ai-answer">
      {question && (
        <div className="ai-answer-question">
          <span className="material-symbols-outlined">person</span>
          <span>{question}</span>
        </div>
      )}
      <div className="ai-answer-response">
        <span className="material-symbols-outlined">smart_toy</span>
        <p>{data}</p>
      </div>
    </div>
  );
}

function EvaluationView({ data }) {
  if (!data?.scores || data.error) return <p className="ai-error">Evaluation failed.</p>;
  const pct = data.max_marks ? Math.round((data.total_marks / data.max_marks) * 100) : 0;
  const grade = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 35 ? 'D' : 'F';
  const gradeColor = pct >= 80 ? 'var(--color-success)' : pct >= 65 ? 'var(--color-tertiary)' : pct >= 50 ? 'var(--color-secondary)' : 'var(--color-error)';
  return (

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
        <span className="material-symbols-outlined">filter_alt</span> Scope: {data?.scope || 'all'} · {matches.length} matches from {data?.compared ?? 0} documents
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
                    {m.year && <span><span className="material-symbols-outlined" style={{ fontSize: 12 }}>calendar_today</span> {m.year}</span>}
                    {m.department && <span><span className="material-symbols-outlined" style={{ fontSize: 12 }}>apartment</span> {m.department}</span>}
                    {m.documentType && <span><span className="material-symbols-outlined" style={{ fontSize: 12 }}>description</span> {m.documentType}</span>}
                    {m.submittedBy && <span><span className="material-symbols-outlined" style={{ fontSize: 12 }}>person</span> {m.submittedBy}</span>}
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

const aiStyles = `
.ai-modal {
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  overflow: hidden;
  border-radius: 16px;
  animation: aiSlideUp 0.25s ease-out;
}
@keyframes aiSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.ai-modal-header {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 20px 24px;
  color: #fff;
}
.ai-header-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%);
  pointer-events: none;
}
.ai-header-content {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}
.ai-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255,255,255,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-header-icon .material-symbols-outlined {
  font-size: 24px;
  color: #a5b4fc;
}
.ai-header-text { flex: 1; }
.ai-header-text h2 { margin: 0; font-size: 17px; font-weight: 600; color: #fff; }
.ai-header-text p { margin: 2px 0 0; font-size: 12px; opacity: 0.7; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 400px; }
.ai-close-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.1);
  color: #94a3b8;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.ai-close-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }

.ai-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  padding: 0 4px;
}
.ai-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  color: var(--color-on-surface-variant);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.ai-tab .material-symbols-outlined { font-size: 18px; }
.ai-tab:hover { color: var(--color-on-surface); background: var(--color-surface-container-low); }
.ai-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 600; }

.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.ai-desc {
  font-size: 13px;
  color: var(--color-on-surface-variant);
  margin: 0 0 16px;
  line-height: 1.5;
}

.ai-action-area { display: flex; flex-direction: column; gap: 16px; }
.ai-cta {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
}
.ai-cta:disabled { opacity: 0.5; cursor: not-allowed; }

/* Summarize preview */
.ai-summarize-preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ai-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--color-surface-container-low);
  font-size: 13px;
  color: var(--color-on-surface);
  border: 1px solid var(--color-outline-variant);
}
.ai-preview-item .material-symbols-outlined { font-size: 18px; color: var(--color-primary); }

/* Ask */
.ai-suggested-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ai-chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
  color: var(--color-on-surface-variant);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.ai-chip:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-container); }
.ai-chip.active { border-color: var(--color-primary); background: var(--color-primary); color: #fff; }

.ai-ask-input {
  display: flex;
  gap: 8px;
}
.ai-ask-input input { flex: 1; }

/* Evaluate */
.ai-presets { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ai-presets label { font-size: 13px; color: var(--color-on-surface-variant); font-weight: 500; }
.ai-preset-chips { display: flex; gap: 6px; flex-wrap: wrap; }

.ai-criteria-list { display: flex; flex-direction: column; gap: 6px; }
.ai-criterion-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--color-surface-container-low);
  border: 1px solid var(--color-outline-variant);
}
.ai-criterion-row input { flex: 1; border: none; background: transparent; padding: 6px 0; font-size: 13px; }
.ai-criterion-row input:focus { outline: none; }
.ai-criterion-marks {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-on-surface-variant);
  font-size: 13px;
}
.ai-marks-input { width: 48px; text-align: center; padding: 4px; border: 1px solid var(--color-outline-variant) !important; border-radius: 6px; background: var(--color-surface) !important; }
.ai-remove-btn {
  width: 24px; height: 24px;
  border: none;
  background: transparent;
  color: var(--color-on-surface-variant);
  cursor: pointer;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.ai-remove-btn:hover { background: var(--color-error-container); color: var(--color-error); }

.ai-add-criterion {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px dashed var(--color-outline);
  border-radius: 8px;
  background: transparent;
  color: var(--color-on-surface-variant);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.ai-add-criterion:hover { border-color: var(--color-primary); color: var(--color-primary); }
.ai-add-criterion .material-symbols-outlined { font-size: 16px; }

/* Loading */
.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 0;
}
.ai-loading-spinner {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-loading-spinner .material-symbols-outlined { font-size: 24px; color: var(--color-primary); }
.ai-spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid var(--color-outline-variant);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: aiSpin 0.8s linear infinite;
}
@keyframes aiSpin { to { transform: rotate(360deg); } }
.ai-loading-text { text-align: center; }
.ai-loading-title { font-weight: 600; font-size: 14px; margin: 0; }
.ai-loading-sub { font-size: 12px; color: var(--color-on-surface-variant); margin: 4px 0 0; }
.ai-loading-dots { display: flex; gap: 6px; }
.ai-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: aiBounce 1.2s ease-in-out infinite;
}
.ai-dot:nth-child(2) { animation-delay: 0.15s; }
.ai-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes aiBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* Results */
.ai-result {
  border: 1px solid var(--color-outline-variant);
  border-radius: 12px;
  overflow: hidden;
}
.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-surface-container-low);
  border-bottom: 1px solid var(--color-outline-variant);
}
.ai-result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}
.ai-result-title .material-symbols-outlined { font-size: 18px; color: var(--color-primary); }
.ai-copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--color-outline-variant);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-on-surface-variant);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.ai-copy-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.ai-copy-btn .material-symbols-outlined { font-size: 14px; }
.ai-result-body { padding: 16px; }
.ai-result-actions { padding: 8px 16px; border-top: 1px solid var(--color-outline-variant); display: flex; justify-content: flex-end; }

/* Summary */
.ai-summary { display: flex; flex-direction: column; gap: 12px; }
.ai-summary-section {
  border: 1px solid var(--color-outline-variant);
  border-radius: 10px;
  overflow: hidden;
}
.ai-summary-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-low);
  color: var(--section-color, var(--color-primary));
}
.ai-summary-section-header .material-symbols-outlined { font-size: 16px; }
.ai-summary-section-body { padding: 10px 14px; }
.ai-summary-section-body p { margin: 0; font-size: 13px; line-height: 1.6; }
.ai-summary-section-body ul { margin: 0; padding-left: 18px; }
.ai-summary-section-body li { font-size: 13px; line-height: 1.6; margin-bottom: 4px; }

/* Answer */
.ai-answer { display: flex; flex-direction: column; gap: 12px; }
.ai-answer-question {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-primary-container);
  border-radius: 10px;
  font-size: 13px;
  color: var(--color-on-primary-container);
}
.ai-answer-question .material-symbols-outlined { font-size: 18px; }
.ai-answer-response {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  background: var(--color-surface-container-low);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
}
.ai-answer-response .material-symbols-outlined { font-size: 18px; color: var(--color-primary); }
.ai-answer-response p { margin: 0; }

/* Evaluation */
.ai-eval-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.ai-eval-grade {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.ai-eval-stats { flex: 1; }
.ai-eval-total { font-size: 22px; font-weight: 700; }
.ai-eval-total small { font-size: 14px; font-weight: 400; color: var(--color-on-surface-variant); }
.ai-eval-bar-bg {
  height: 6px;
  background: var(--color-surface-container);
  border-radius: 3px;
  margin: 6px 0;
  overflow: hidden;
}
.ai-eval-bar { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.ai-eval-pct { font-size: 13px; color: var(--color-on-surface-variant); }

.ai-eval-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ai-eval-table th {
  text-align: left;
  padding: 8px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-on-surface-variant);
  border-bottom: 1px solid var(--color-outline-variant);
}
.ai-eval-table td { padding: 10px; border-bottom: 1px solid var(--color-outline-variant); vertical-align: top; }
.ai-eval-name { font-weight: 500; min-width: 140px; }
.ai-eval-mark { text-align: center; font-size: 16px; min-width: 40px; }
.ai-eval-max { text-align: center; color: var(--color-on-surface-variant); min-width: 40px; }
.ai-eval-reason { font-size: 12px; color: var(--color-on-surface-variant); line-height: 1.4; }

/* Footer */
.ai-footer {
  padding: 10px 24px;
  border-top: 1px solid var(--color-outline-variant);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-on-surface-variant);
  background: var(--color-surface-container-low);
}

.ai-error { color: var(--color-error); font-size: 13px; }

/* Custom prompt */
.ai-custom-prompt {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--color-outline-variant);
  border-radius: 10px;
  background: var(--color-surface-container-low);
}
.ai-toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.ai-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  font-size: 11px;
  font-weight: 600;
  width: fit-content;
}
.ai-pill .material-symbols-outlined { font-size: 14px; }

/* Similarity */
.ai-similarity-options { display: flex; flex-direction: column; gap: 10px; }
.ai-similarity-list { display: flex; flex-direction: column; gap: 10px; }
.ai-similarity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-outline-variant);
  border-radius: 10px;
  background: var(--color-surface);
}
.ai-similarity-score {
  flex-shrink: 0;
  width: 56px;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  padding: 8px 6px;
  border-radius: 10px;
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
}
.ai-similarity-info { flex: 1; min-width: 0; }
.ai-similarity-title { font-weight: 600; font-size: 13px; }
.ai-similarity-meta { font-size: 11px; color: var(--color-on-surface-variant); margin-top: 2px; display: flex; flex-wrap: wrap; gap: 8px; }
.ai-similarity-meta span { display: inline-flex; align-items: center; gap: 4px; }
.ai-similarity-empty { font-size: 13px; color: var(--color-on-surface-variant); padding: 16px 0; text-align: center; }
`;
