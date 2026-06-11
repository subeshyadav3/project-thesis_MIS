import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

function ProjectDetail() {
  const { type, id } = useParams();
  const [item, setItem] = useState(null);
  const [activeTab, setActiveTab] = useState('proposal');
  const [components, setComponents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [marks, setMarks] = useState({});
  const [showRecommend, setShowRecommend] = useState(false);
  const [recommendContent, setRecommendContent] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadData = () => {
    const endpoint = type === 'group' ? `/groups/${id}` : `/theses/${id}`;
    api.get(endpoint).then(({ data }) => { setItem(data); }).catch(() => {});
    const evalEndpoint = type === 'group' ? `/evaluations/group/${id}` : `/evaluations/thesis/${id}`;
    api.get(evalEndpoint).then(({ data }) => {
      setEvaluations(data.evaluations || []);
      setComponents(data.components || []);
      const m = {};
      (data.components || []).forEach(c => { m[c.id] = ''; });
      setMarks(m);
    }).catch(() => {});
  };

  useEffect(() => { loadData(); }, [id, type]);

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) { alert('Enter feedback'); return; }
    try {
      const payload = {
        stage: activeTab.toUpperCase(),
        comment: feedback,
      };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/evaluations/feedback', payload);
      alert('Feedback submitted. Email sent to students.');
      setFeedback('');
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleSubmitMarks = async () => {
    try {
      const totalMarks = Object.values(marks).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
      const payload = {
        stage: activeTab.toUpperCase(),
        marks: totalMarks,
        comment: 'Marks submitted',
      };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/evaluations', payload);
      alert('Marks submitted. Email sent to students.');
      loadData();
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const handleRecommend = async () => {
    if (!recommendContent.trim()) { alert('Enter recommendation content'); return; }
    try {
      const payload = { content: recommendContent };
      if (type === 'group') payload.groupId = parseInt(id);
      else payload.thesisId = parseInt(id);
      await api.post('/supervisors/recommendation', payload);
      alert('Letter of recommendation issued. Email sent.');
      setShowRecommend(false);
      setRecommendContent('');
    } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  const getStageEvals = (stage) => evaluations.filter(e => e.stage === stage.toUpperCase());
  const calcTotal = () => evaluations.reduce((s, e) => s + (e.marks || 0), 0);

  if (!item) return <div className="app-layout"><Sidebar user={user} /><div className="main-content">Loading...</div></div>;

  const name = type === 'group' ? item.name : `${item.student?.firstName} ${item.student?.lastName}`;
  const title = type === 'group' ? item.projectTitle : item.title;

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1>{name}</h1><p style={{ color: '#555' }}>{title}</p></div>
          <button className="btn btn-primary" onClick={() => setShowRecommend(true)}>Issue Recommendation</button>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card"><div className="stat-number">{calcTotal()}</div><div className="stat-label">Total Marks / 50</div></div>
          <div className="stat-card"><div className="stat-number">{evaluations.length}</div><div className="stat-label">Evaluations</div></div>
          <div className="stat-card"><div className="stat-number" style={{ fontSize: 20 }}>{item.members?.length || 1}</div><div className="stat-label">Students</div></div>
        </div>
        <div className="tabs">
          <div className={`tab ${activeTab === 'proposal' ? 'active' : ''}`} onClick={() => setActiveTab('proposal')}>Proposal</div>
          <div className={`tab ${activeTab === 'MID_TERM' ? 'active' : ''}`} onClick={() => setActiveTab('MID_TERM')}>Mid-Term</div>
          <div className={`tab ${activeTab === 'FINAL' ? 'active' : ''}`} onClick={() => setActiveTab('FINAL')}>Final</div>
        </div>
        <div className="card">
          <h3>{activeTab === 'proposal' ? 'Proposal' : activeTab === 'MID_TERM' ? 'Mid-Term' : 'Final'} Stage</h3>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h4 style={{ fontSize: 14, color: '#555', marginBottom: 10 }}>Feedback / Comment</h4>
              <textarea style={{ width: '100%', minHeight: 100, padding: 8, border: '1px solid #ccc', borderRadius: 4 }} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Enter your feedback..." />
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleSubmitFeedback}>Submit Feedback</button>
              <div style={{ marginTop: 15 }}>
                {getStageEvals(activeTab).filter(e => e.comment).map(e => (
                  <div key={e.id} style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, marginTop: 8, fontSize: 13 }}>
                    <strong>{e.submittedBy?.firstName} {e.submittedBy?.lastName}:</strong> {e.comment}
                    <div style={{ color: '#888', fontSize: 11 }}>{new Date(e.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h4 style={{ fontSize: 14, color: '#555', marginBottom: 10 }}>Marks per Component</h4>
              {components.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
                  <input type="number" style={{ width: 80, padding: '5px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13 }} value={marks[c.id] || ''} onChange={e => setMarks({...marks, [c.id]: e.target.value})} max={c.maxMarks} />
                  <span style={{ fontSize: 12, color: '#888' }}>/ {c.maxMarks}</span>
                </div>
              ))}
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleSubmitMarks}>Submit Marks</button>
              <div style={{ marginTop: 15 }}>
                {getStageEvals(activeTab).filter(e => e.marks !== null).map(e => (
                  <div key={e.id} style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, marginTop: 8, fontSize: 13 }}>
                    Marks: <strong>{e.marks}</strong> | by {e.submittedBy?.firstName} {e.submittedBy?.lastName}
                    <div style={{ color: '#888', fontSize: 11 }}>{new Date(e.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {showRecommend && <div className="modal-overlay" onClick={() => setShowRecommend(false)}><div className="modal" onClick={e => e.stopPropagation()}><h2>Issue Letter of Recommendation</h2><div className="form-group"><label>Project / Thesis</label><input value={`${name} - ${title}`} disabled /></div><div className="form-group"><label>Supervisor</label><input value={`${user.firstName} ${user.lastName}`} disabled /></div><div className="form-group"><label>Content</label><textarea value={recommendContent} onChange={e => setRecommendContent(e.target.value)} placeholder="Write recommendation content..." style={{ minHeight: 120 }} /></div><div className="modal-actions"><button className="btn btn-outline" onClick={() => setShowRecommend(false)}>Cancel</button><button className="btn btn-primary" onClick={handleRecommend}>Issue & Send Email</button></div></div></div>}
      </div>
    </div>
  );
}

export default ProjectDetail;
