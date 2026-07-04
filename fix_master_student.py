with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\MasterThesis.jsx', 'r') as f:
    content = f.read()

# Add student search state after examOpen state
old_state = """const [examOpen, setExamOpen] = useState(false);
  const examRef = useRef(null);"""

new_state = """const [examOpen, setExamOpen] = useState(false);
  const examRef = useRef(null);
  const [createStudentSearch, setCreateStudentSearch] = useState('');
  const [createStudentOpen, setCreateStudentOpen] = useState(false);
  const createStudentRef = useRef(null);"""

content = content.replace(old_state, new_state)

# Add click outside handler for student dropdown after examOutside useEffect
old_exam_effect = """useEffect(() => {
    const handleExamOutside = (e) => {
      if (examRef.current && !examRef.current.contains(e.target)) {
        setExamOpen(false);
      }
    };
    if (examOpen) document.addEventListener('mousedown', handleExamOutside);
    return () => document.removeEventListener('mousedown', handleExamOutside);
  }, [examOpen]);"""

new_exam_effect = """useEffect(() => {
    const handleExamOutside = (e) => {
      if (examRef.current && !examRef.current.contains(e.target)) {
        setExamOpen(false);
      }
    };
    if (examOpen) document.addEventListener('mousedown', handleExamOutside);
    return () => document.removeEventListener('mousedown', handleExamOutside);
  }, [examOpen]);

  useEffect(() => {
    const handleStudentOutside = (e) => {
      if (createStudentRef.current && !createStudentRef.current.contains(e.target)) {
        setCreateStudentOpen(false);
      }
    };
    if (createStudentOpen) document.addEventListener('mousedown', handleStudentOutside);
    return () => document.removeEventListener('mousedown', handleStudentOutside);
  }, [createStudentOpen]);"""

content = content.replace(old_exam_effect, new_exam_effect)

# Replace the student select dropdown with searchable dropdown
old_student_select = """<div className="form-group">
      <label>Student</label>
      <select value={createForm.studentId} onChange={e => setCreateForm({...createForm, studentId: e.target.value})} required>
        <option value="">Select a student...</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>)}
      </select>
    </div>"""

new_student_select = """<div className="form-group" ref={createStudentRef}>
      <label>Student</label>
      <div className="sup-dropdown-trigger">
        <div className="sup-search-wrapper" onClick={() => setCreateStudentOpen(true)}>
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder={createForm.studentId ? students.find(s => s.id.toString() === createForm.studentId)?.firstName + ' ' + students.find(s => s.id.toString() === createForm.studentId)?.lastName + ' (' + (students.find(s => s.id.toString() === createForm.studentId)?.rollNumber || '') + ')' : 'Search by name or roll no...'}
            value={createStudentSearch}
            onChange={e => { setCreateStudentSearch(e.target.value); setCreateStudentOpen(true); }}
            onFocus={() => setCreateStudentOpen(true)}
          />
          {createForm.studentId && (
            <button className="sup-clear" onClick={(e) => { e.stopPropagation(); setCreateForm({...createForm, studentId: ''}); setCreateStudentSearch(''); }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
          <span className="material-symbols-outlined sup-dropdown-arrow">{createStudentOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
        </div>
        {createStudentOpen && (
          <div className="sup-dropdown">
            {students.filter(s => {
              const searchVal = createStudentSearch.toLowerCase();
              const nameMatch = (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchVal);
              const rollMatch = (s.rollNumber || '').toLowerCase().includes(searchVal);
              return nameMatch || rollMatch;
            }).length === 0 ? (
              <div className="sup-dropdown-empty">No students found</div>
            ) : (
              students.filter(s => {
                const searchVal = createStudentSearch.toLowerCase();
                const nameMatch = (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchVal);
                const rollMatch = (s.rollNumber || '').toLowerCase().includes(searchVal);
                return nameMatch || rollMatch;
              }).map(s => {
                const selected = createForm.studentId === s.id.toString();
                return (
                  <div
                    key={s.id}
                    className={'sup-dropdown-item ' + (selected ? 'sup-dropdown-item-selected' : '')}
                    onClick={() => { setCreateForm({...createForm, studentId: s.id.toString()}); setCreateStudentSearch(''); setCreateStudentOpen(false); }}
                  >
                    <div className="sup-dropdown-item-avatar">{s.firstName?.[0]}{s.lastName?.[0]}</div>
                    <div className="sup-dropdown-item-info">
                      <div className="sup-dropdown-item-name">{s.firstName} {s.lastName}</div>
                      <div className="sup-dropdown-item-email">{s.rollNumber || ''}</div>
                    </div>
                    {selected && (
                      <span className="material-symbols-outlined sup-dropdown-item-check">check_circle</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>"""

content = content.replace(old_student_select, new_student_select)

with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\MasterThesis.jsx', 'w') as f:
    f.write(content)

print('MasterThesis.jsx updated successfully')
