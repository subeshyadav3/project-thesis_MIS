with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\BachelorProjects.jsx', 'r') as f:
    content = f.read()

# Add click outside handler for student dropdown after the examOutside useEffect block
old_use_effect = """useEffect(() => {
    const handleExamOutside = (e) => {
      if (examRef.current && !examRef.current.contains(e.target)) {
        setExamOpen(false);
      }
    };
    if (examOpen) document.addEventListener('mousedown', handleExamOutside);
    return () => document.removeEventListener('mousedown', handleExamOutside);
  }, [examOpen]);"""

new_use_effect = """useEffect(() => {
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
      if (studentRef.current && !studentRef.current.contains(e.target)) {
        setStudentOpen(false);
      }
    };
    if (studentOpen) document.addEventListener('mousedown', handleStudentOutside);
    return () => document.removeEventListener('mousedown', handleStudentOutside);
  }, [studentOpen]);"""

content = content.replace(old_use_effect, new_use_effect)

# Update the student row rendering from manual inputs to searchable dropdown
old_student_rows = """{createForm.students.map((st, idx) => (
        <div key={idx} className="student-row">
          <div className="student-row-fields">
            <input
              value={st.firstName}
              onChange={e => updateStudent(idx, 'firstName', e.target.value)}
              placeholder="First name"
            />
            <input
              value={st.lastName}
              onChange={e => updateStudent(idx, 'lastName', e.target.value)}
              placeholder="Last name"
            />
            <input
              value={st.rollNumber}
              onChange={e => updateStudent(idx, 'rollNumber', e.target.value)}
              placeholder="Roll no (e.g. 080BCT084)"
            />
          </div>
          {createForm.students.length > 1 && (
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => removeStudentField(idx)} style={{ color: 'var(--color-error)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
        </div>
      ))}"""

new_student_rows = """{createForm.students.map((st, idx) => {
          const selectedStudent = allStudents.find(s => s.id === st.studentId);
          return (
            <div key={idx} className="student-row">
              <div className="student-row-fields">
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                  <label style={{ fontSize: 11 }}>Student {idx + 1}</label>
                  <div className="sup-dropdown-trigger" ref={idx === 0 ? studentRef : undefined}>
                    <div className="sup-search-wrapper" onClick={() => setStudentOpen(true)}>
                      <span className="material-symbols-outlined">search</span>
                      <input
                        type="text"
                        placeholder={st.studentId ? `${selectedStudent?.firstName || ''} ${selectedStudent?.lastName || ''} (${selectedStudent?.rollNumber || ''})` : 'Search by name or roll no...'}
                        value={st._search || ''}
                        onChange={e => {
                          const updated = [...createForm.students];
                          updated[idx] = { ...updated[idx], _search: e.target.value };
                          setCreateForm({...createForm, students: updated});
                          setStudentOpen(true);
                        }}
                        onFocus={() => setStudentOpen(true)}
                      />
                      {st.studentId && (
                        <button className="sup-clear" onClick={(e) => { e.stopPropagation(); const updated = [...createForm.students]; updated[idx] = { firstName: '', lastName: '', rollNumber: '', studentId: '', _search: '' }; setCreateForm({...createForm, students: updated}); }}>
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      )}
                      <span className="material-symbols-outlined sup-dropdown-arrow">{studentOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
                    </div>
                    {studentOpen && (
                      <div className="sup-dropdown">
                        {allStudents.filter(s => {
                          const searchVal = (st._search || '').toLowerCase();
                          const nameMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchVal);
                          const rollMatch = (s.rollNumber || '').toLowerCase().includes(searchVal);
                          const alreadyAdded = createForm.students.some((cs, ci) => cs.studentId === s.id && ci !== idx);
                          return (nameMatch || rollMatch) && !alreadyAdded;
                        }).length === 0 ? (
                          <div className="sup-dropdown-empty">No students found</div>
                        ) : (
                          allStudents.filter(s => {
                            const searchVal = (st._search || '').toLowerCase();
                            const nameMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchVal);
                            const rollMatch = (s.rollNumber || '').toLowerCase().includes(searchVal);
                            const alreadyAdded = createForm.students.some((cs, ci) => cs.studentId === s.id && ci !== idx);
                            return (nameMatch || rollMatch) && !alreadyAdded;
                          }).map(s => {
                            const selected = st.studentId === s.id;
                            return (
                              <div
                                key={s.id}
                                className={`sup-dropdown-item ${selected ? 'sup-dropdown-item-selected' : ''}`}
                                onClick={() => {
                                  const updated = [...createForm.students];
                                  updated[idx] = { firstName: s.firstName, lastName: s.lastName, rollNumber: s.rollNumber || '', studentId: s.id, _search: '' };
                                  setCreateForm({...createForm, students: updated});
                                  setStudentOpen(false);
                                }}
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
                </div>
              </div>
              {createForm.students.length > 1 && (
                <button type="button" className="btn btn-xs btn-ghost" onClick={() => removeStudentField(idx)} style={{ color: 'var(--color-error)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              )}
            </div>
          );
        })}"""

content = content.replace(old_student_rows, new_student_rows)

# Update handleCreate to send studentId instead of manual fields
old_handle_create = """const handleCreate = async (e) => {
    e.preventDefault();
    const students = createForm.students.filter(s => s.firstName.trim() || s.rollNumber.trim());
    try {
      const { data: group } = await api.post('/groups', { ...createForm, students });
      if (createForm.examinerId) {
        await api.post('/examiner-assignments/group', { groupId: group.id, externalExaminerId: parseInt(createForm.examinerId) });
      }"""

new_handle_create = """const handleCreate = async (e) => {
    e.preventDefault();
    const students = createForm.students.filter(s => s.studentId);
    try {
      const payload = {
        ...createForm,
        students: students.map(s => ({ studentId: s.studentId, rollNumber: s.rollNumber }))
      };
      const { data: group } = await api.post('/groups', payload);
      if (createForm.examinerId) {
        await api.post('/examiner-assignments/group', { groupId: group.id, externalExaminerId: parseInt(createForm.examinerId) });
      }"""

content = content.replace(old_handle_create, new_handle_create)

with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\BachelorProjects.jsx', 'w') as f:
    f.write(content)

print('BachelorProjects.jsx updated successfully')
