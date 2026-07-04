const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        academicYears: true,
        programs: true,
        coordinator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPrograms = async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      include: { department: true },
    });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createProgram = async (req, res) => {
  try {
    const program = await prisma.program.create({
      data: { name: req.body.name, code: req.body.code, departmentId: parseInt(req.body.departmentId) },
    });
    res.status(201).json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const program = await prisma.program.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    await prisma.program.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Program deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = await prisma.department.create({
      data: { name: req.body.name, code: req.body.code },
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await prisma.department.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAcademicYears = async (req, res) => {
  try {
    const years = await prisma.academicYear.findMany({
      include: { department: true },
    });
    res.json(years);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAcademicYear = async (req, res) => {
  try {
    const year = await prisma.academicYear.create({
      data: {
        year: req.body.year,
        semester: req.body.semester,
        departmentId: parseInt(req.body.departmentId),
      },
    });
    res.status(201).json(year);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
