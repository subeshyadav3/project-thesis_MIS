with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\Evaluations.jsx', 'r') as f:
    content = f.read()

export_idx = content.find('export default Evaluations;')
before = content[:export_idx]

missing = """
      {/* Defense marks modal */}
      {showDefenseModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDefenseModal(false)}>
          <div className="modal" style={{ maxWidth: 720, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon primary"><span className="material-symbols-outlined">edit_note</span></div>
              <div className="modal-header-text">
                <h2>Defense Marks</h2>
                <p>Enter marks for the 3 defense components of <strong>{selectedItem.name}</strong>.</p>
              </div>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'var(--color-surface-container-low)', marginBottom: 14, fontSize: 13 }}>
                <strong>{selectedItem.project}</strong><br />
                <span style={{ color: 'var(--color-on-surface-variant)' }}>Supervisor: {selectedItem.supervisorName}</span>
              </div>
              {(selectedItem.evaluationComponents || [])
                .filter(c => coordinatorComponentTypes.includes(c.evaluationType))
                .map(c => {
                  const evalRec = (selectedItem.evaluations || []).find(e => e.componentId === c.id);
                  return (
                    <div key={c.id} className="card" style={{ padding: 12, marginBottom: 10, border: '1px solid var(--color-outline-variant)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{c.name}</h4>
                          <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{ROLE_LABEL[c.evaluatorRole]} evaluates this</span>
                        </div>
                        <span className="badge" style={{ background: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)' }}>Max: {c.maxMarks}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div className="form-group" style={{ width: 110, marginBottom: 0 }}>
                          <label style={{ fontSize: 11 }}>Marks (out of {c.maxMarks})</label>
                          <input id={'marks-${c.id}'} type="number" defaultValue={evalRec?.marks ?? ''} min="0" max={c.maxMarks} step="0.5" placeholder={'0-${c.maxMarks}'} disabled={selectedItem.status === 'COMPLETED'} />
                        </div>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label style={{ fontSize: 11 }}>Comments</label>
                          <input id={'comment-${c.id}'} type="text" defaultValue={evalRec?.comment ?? ''} placeholder={'Enter ${c.name.toLowerCase()} comments...'} disabled={selectedItem.status === 'COMPLETED'} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                {(selectedItem.evaluationComponents || [])
                  .filter(c => c.evaluationType === 'SUPERVISOR' || c.evaluationType === 'EXTERNAL_EXAMINER')
                  .map(c => {
                    const e = (selectedItem.evaluations || []).find(ev => ev.componentId === c.id);
                    return (
                      <div key={c.id} style={{ padding: 12, background: 'var(--color-surface-container-low)', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>{c.name} by {ROLE_LABEL[c.evaluatorRole]}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: e?.marks !== null && e?.marks !== undefined ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                          {e?.marks !== null && e?.marks !== undefined ? e.marks : '-'}
                          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                        </div>
                        {e?.comment && <div style={{ fontSize: 11, fontStyle: 'italic', marginTop: 4, color: 'var(--color-on-surface-variant)' }}>"{e.comment}"</div>}
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDefenseModal(false)} disabled={saving}>
                <span className="material-symbols-outlined">close</span>Cancel
              </button>
              {selectedItem.status !== 'COMPLETED' && (
                <>
                  <button className="btn btn-primary" onClick={handleSaveAllDefenses} disabled={saving}>
                    <span className="material-symbols-outlined">{saving ? 'progress_activity' : 'check'}</span>
                    {saving ? 'Saving...' : 'Save All Defenses'}
                  </button>
                  <button className="btn btn-success" onClick={handleFinalize} disabled={saving}>
                    <span className="material-symbols-outlined">task_alt</span>
                    Finalize
                  </button>
                </>
              )}
              {selectedItem.status === 'COMPLETED' && (
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary modal */}
      {showSummaryModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="modal" style={{ maxWidth: 600, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon info"><span className="material-symbols-outlined">fact_check</span></div>
              <div className="modal-header-text">
                <h2>Evaluation Summary</h2>
                <p>{selectedItem.project}</p>
              </div>
            </div>
            <div className="modal-body">
              {(selectedItem.evaluationComponents || []).map(c => {
                const e = (selectedItem.evaluations || []).find(ev => ev.componentId === c.id);
                const status = e?.marks !== null && e?.marks !== undefined ? 'done' : 'pending';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, marginBottom: 8, background: status === 'done' ? 'var(--color-surface-container-low)' : 'transparent', border: '1px solid var(--color-outline-variant)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: status === 'done' ? 'var(--color-success-container)' : 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: status === 'done' ? 'var(--color-on-success-container)' : 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{status === 'done' ? 'check_circle' : 'pending'}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Evaluated by {ROLE_LABEL[c.evaluatorRole]} Max {c.maxMarks} marks</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: status === 'done' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                        {e?.marks !== null && e?.marks !== undefined ? e.marks : '-'}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-on-surface-variant)' }}> / {c.maxMarks}</span>
                      </div>
                      {e?.submittedBy && <div style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}>{e.submittedBy.firstName} {e.submittedBy.lastName}</div>}
                    </div>
                  </div>
                );
              })}
              <div style={{
                marginTop: 14, padding: 0, borderRadius: 12, overflow: 'hidden',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', display: 'flex', alignItems: 'stretch',
              }}>
                <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>award_star</span>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase' }}>Grand Total</span>
                  </div>
                </div>
                <div style={{
                  padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>{totalMarks(selectedItem).toFixed(1)}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginTop: 10 }}>/ {getMaxTotal(selectedItem)}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowSummaryModal(false)}><span className="material-symbols-outlined">close</span>Close</button>
              <button className="btn btn-primary" onClick={() => handlePrintSingle(selectedItem)}><span className="material-symbols-outlined">print</span>Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}

      {showForward && (
        <div className="modal-overlay" onClick={() => setShowForward(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon success"><span className="material-symbols-outlined">forward</span></div>
              <div className="modal-header-text">
                <h2>Forward Results</h2>
                <p>This will send all completed evaluations to the Examination Department. This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForward(false)}><span className="material-symbols-outlined">close</span>Cancel</button>
              <button className="btn btn-success" onClick={handleForward}><span className="material-symbols-outlined">check</span>Confirm Forward</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default Evaluations;
"""

with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\Evaluations.jsx', 'w') as f:
    f.write(before + missing)

print('Done! File restored.')
