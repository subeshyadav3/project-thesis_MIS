with open(r'F:\projects\clz\se\frontend\src\pages\coordinator\BachelorProjects.jsx', 'r') as f:
    content = f.read()

# Check if replacement already happened
if 'sup-dropdown-item-email' in content and 'student-row' in content:
    print("Already has dropdown items - checking if students section was replaced...")
    # Count occurrences
    count = content.count('studentId: s.id')
    print(f"studentId occurrences: {count}")
    count2 = content.count('Search by name or roll no')
    print(f"Search placeholder occurrences: {count2}")

# Check current student section
idx = content.find('{createForm.students.map')
print(f"students.map found at index: {idx}")
if idx > 0:
    print("Context around it:")
    print(repr(content[idx:idx+200]))
