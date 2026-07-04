with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\BachelorProjects.jsx', 'r') as f:
    content = f.read()

print(f"File length: {len(content)}")
print(f"Has 'studentId: s.id': {'studentId: s.id' in content}")
print(f"Has 'Search by name or roll no': {'Search by name or roll no' in content}")
print(f"Has 'sup-dropdown-item-email': {'sup-dropdown-item-email' in content}")

# Try a simpler replacement - look for specific patterns
old = """{createForm.students.map((st, idx) => (
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
          {createForm.students.length > 1 && ("""

if old in content:
    print("Found old student rows pattern - will replace")
else:
    print("Old pattern NOT found - checking actual content...")
    idx = content.find('{createForm.students.map')
    if idx >= 0:
        print("Actual content:")
        print(repr(content[idx:idx+500]))
