const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const puppeteer = require('puppeteer-core');

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function numberToWords(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  const ones = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const num = Math.floor(n);
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  return 'Out of range';
}

const os = require('os');
const fsSync = require('fs');

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  os.platform() === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : null,
  os.platform() === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : null,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/local/bin/chromium',
  '/snap/bin/chromium',
].filter(Boolean);

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      if (candidate && fsSync.existsSync(candidate)) return candidate;
    } catch (_) { /* ignore */ }
  }
  return null;
}

async function generatePdf(html) {
  const executablePath = findChrome();
  if (!executablePath) {
    throw new Error(
      'Chrome/Chromium executable not found. Set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH environment variable.'
    );
  }
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function buildPageHeader() {
  return `
    <div style="text-align:center;margin-bottom:16px;font-size:13px;">
      <div style="font-weight:700;">TRIBHUVAN UNIVERSITY</div>
      <div style="font-weight:700;">INSTITUTE OF ENGINEERING</div>
      <div style="font-weight:700;">PULCHOWK CAMPUS</div>
    </div>`;
}

function buildNote() {
  return `<p style="font-size:12px;margin:4px 0;"><strong>Note:</strong> 100%: Outstanding, 90%: Excellent, 75%: Good, 60%: Satisfactory, 50%: Poor, &lt; 50%: Fail</p>`;
}

function buildBlankLines(count) {
  let out = '';
  for (let i = 0; i < count; i++) out += '<div style="height:1.2em;"></div>';
  return out;
}

function buildSupervisorPage(title, studentName, rollNo, supervisor, supCriteria, comments, feedbackComments, feedbackSuggestions) {
  const totalMarks = supCriteria.reduce((s, c) => s + (c.marks || 0), 0);
  const hasMarks = supCriteria.some(c => c.marks !== null && c.marks !== undefined);

  const criteriaRows = supCriteria.map((c, i) => `
    <tr>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${i + 1}</td>
      <td style="padding:4px;border:1px solid #000;">${esc(c.name)}</td>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${c.max}</td>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${c.marks !== null && c.marks !== undefined ? c.marks : ''}</td>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${c.comment ? esc(c.comment) : ''}</td>
    </tr>`).join('');

  const commentText = [...comments, feedbackComments].filter(Boolean).join('; ');
  const suggestionText = feedbackSuggestions || '';

  return `
    ${buildPageHeader()}
    <div style="font-weight:700;font-size:13px;text-align:center;">Mid-Term Evaluation Form for Thesis Program</div>
    <div style="font-size:12px;text-align:center;margin-bottom:8px;">(to be filled by supervisor)</div>
    <div style="font-size:12px;margin:4px 0;"><strong>Credit: 16 | Full Marks: 100</strong></div>

    <table style="width:100%;font-size:12px;border-collapse:collapse;" cellpadding="2">
      <tr><td style="width:120px;"><strong>Title:</strong></td><td>${esc(title)}</td></tr>
      <tr><td><strong>Name of Student:</strong></td><td>${esc(studentName)}</td></tr>
      <tr><td><strong>Roll No:</strong></td><td>${esc(rollNo)}</td></tr>
      <tr><td><strong>Supervisor:</strong></td><td>${esc(supervisor)}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;" border="1" cellpadding="4">
      <thead><tr>
        <th style="text-align:center;padding:4px;">S.No.</th>
        <th style="text-align:left;padding:4px;">Marking Parameters</th>
        <th style="text-align:center;padding:4px;">Full Marks</th>
        <th style="text-align:center;padding:4px;">Marks Obtained</th>
        <th style="text-align:center;padding:4px;">Remarks</th>
      </tr></thead>
      <tbody>
        ${criteriaRows}
        <tr>
          <td></td>
          <td style="font-weight:700;">Total Marks</td>
          <td style="text-align:center;padding:4px;font-weight:700;">100</td>
          <td style="text-align:center;padding:4px;font-weight:700;">${hasMarks ? totalMarks : ''}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    ${buildNote()}

    <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:8px;" cellpadding="2">
      <tr><td style="width:220px;"><strong>Total Marks Obtained (in words):</strong></td><td style="border-bottom:1px solid #000;">${hasMarks ? esc(numberToWords(totalMarks)) : '&nbsp;'}</td></tr>
    </table>

    <div style="margin-top:8px;font-size:12px;">
      <strong>Comments:</strong>
      ${commentText ? `<p style="margin:2px 0;">${esc(commentText)}</p>` : buildBlankLines(4)}
    </div>
    <div style="font-size:12px;">
      <strong>Suggestions &amp; recommendations:</strong>
      ${suggestionText ? `<p style="margin:2px 0;">${esc(suggestionText)}</p>` : buildBlankLines(8)}
    </div>

    <div style="font-size:12px;margin-top:16px;">
      <strong>Examiner:</strong><br/>
      <strong>Name:</strong> ${esc(supervisor)}<br/>
      <strong>Post:</strong> Supervisor<br/>
      <strong>Organization:</strong> IOE<br/>
      <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
      <strong>Signature:</strong><br/>
    </div>`;
}

function buildExternalPage(title, studentName, rollNo, extCriteria, comments, feedbackComments, feedbackSuggestions) {
  const totalMarks = extCriteria.reduce((s, c) => s + (c.marks || 0), 0);
  const hasMarks = extCriteria.some(c => c.marks !== null && c.marks !== undefined);

  const criteriaRows = extCriteria.map((c, i) => `
    <tr>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${i + 1}</td>
      <td style="padding:4px;border:1px solid #000;">${esc(c.name)}</td>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${c.max}</td>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${c.marks !== null && c.marks !== undefined ? c.marks : ''}</td>
    </tr>`).join('');

  const commentText = [...comments, feedbackComments].filter(Boolean).join('; ');
  const suggestionText = feedbackSuggestions || '';

  return `
    ${buildPageHeader()}
    <div style="font-weight:700;font-size:13px;text-align:center;">M. Sc. - Project Evaluation: External</div>
    <div style="font-size:12px;margin:4px 0;"><strong>Credit: 4 | Full Marks: 100</strong></div>

    <table style="width:100%;font-size:12px;border-collapse:collapse;" cellpadding="2">
      <tr><td style="width:120px;"><strong>Project Title:</strong></td><td>${esc(title)}</td></tr>
      <tr><td><strong>Student (Name):</strong></td><td>${esc(studentName)}, <strong>Roll No.:</strong> ${esc(rollNo)}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;" border="1" cellpadding="4">
      <thead><tr>
        <th style="text-align:center;padding:4px;">S.No.</th>
        <th style="text-align:left;padding:4px;">Marking Parameters</th>
        <th style="text-align:center;padding:4px;">Full Marks</th>
        <th style="text-align:center;padding:4px;">Marks Obtained</th>
      </tr></thead>
      <tbody>
        ${criteriaRows}
        <tr>
          <td></td>
          <td style="font-weight:700;">Total Marks</td>
          <td style="text-align:center;padding:4px;font-weight:700;">100</td>
          <td style="text-align:center;padding:4px;font-weight:700;">${hasMarks ? totalMarks : ''}</td>
        </tr>
      </tbody>
    </table>
    ${buildNote()}

    <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:8px;" cellpadding="2">
      <tr><td style="width:220px;"><strong>Total Marks Obtained (in words):</strong></td><td style="border-bottom:1px solid #000;">${hasMarks ? esc(numberToWords(totalMarks)) : '&nbsp;'}</td></tr>
    </table>

    <div style="margin-top:8px;font-size:12px;">
      <strong>Comments:</strong>
      ${commentText ? `<p style="margin:2px 0;">${esc(commentText)}</p>` : buildBlankLines(4)}
    </div>
    <div style="font-size:12px;">
      <strong>Suggestions &amp; recommendations:</strong>
      ${suggestionText ? `<p style="margin:2px 0;">${esc(suggestionText)}</p>` : buildBlankLines(8)}
    </div>

    <div style="font-size:12px;margin-top:16px;">
      <strong>Examiner:</strong><br/>
      <strong>Name:</strong><br/>
      <strong>Designation:</strong><br/>
      <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
      <strong>Signature:</strong><br/>
    </div>`;
}

function buildMasterFormat(data) {
  const { title, name, supervisor, evaluations, student } = data;

  const supEvals = evaluations.filter(e => e.evaluatorRole === 'Supervisor');
  const extEvals = evaluations.filter(e => e.evaluatorRole === 'External Examiner');

  const supCriteria = supEvals.map(e => ({
    name: e.name,
    max: e.maxMarks,
    marks: e.marks !== null && e.marks !== undefined ? e.marks : null,
    comment: e.comment || '',
  }));
  const extCriteria = extEvals.map(e => ({
    name: e.name,
    max: e.maxMarks,
    marks: e.marks !== null && e.marks !== undefined ? e.marks : null,
    comment: e.comment || '',
  }));

  const supComments = supEvals.filter(e => e.comment).map(e => e.comment);
  const extComments = extEvals.filter(e => e.comment).map(e => e.comment);

  // Extract feedback comments and suggestions from evaluations
  const feedbackComments = evaluations.map(e => e.comments).filter(Boolean).join('\n');
  const feedbackSuggestions = evaluations.map(e => e.suggestions).filter(Boolean).join('\n');

  const studentName = name;
  const rollNo = student?.rollNumber || '—';

  const page1 = `
    <div style="page-break-after:always;">
      ${buildSupervisorPage(title, studentName, rollNo, supervisor, supCriteria, supComments, feedbackComments, feedbackSuggestions)}
    </div>`;
  const page2 = `
    <div>
      ${buildExternalPage(title, studentName, rollNo, extCriteria, extComments, feedbackComments, feedbackSuggestions)}
    </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Master Thesis Evaluation - ${esc(title)}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; color: #000; font-size: 12px; line-height: 1.4; margin: 0; padding: 0; }
    table { border-color: #000; }
    td, th { border-color: #000; vertical-align: top; }
  </style></head><body>
    ${page1}
    ${page2}
  </body></html>`;
}

function buildBachelorFormat(data) {
  const { title, name, supervisor, academicYear, members, evaluations, projectType, total, maxTotal } = data;
  const isMajor = projectType === 'MAJOR';
  const projectLabel = isMajor ? 'Major Project' : 'Minor Project';
  const credit = isMajor ? '6' : '3';

  let sn = 0;
  const bodyRows = evaluations.map((e) => {
    const marks = e.marks !== null && e.marks !== undefined ? e.marks : '';
    sn++;
    return `<tr>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${sn}</td>
      <td style="padding:4px;border:1px solid #000;">${esc(e.name)}</td>
      <td style="padding:4px;border:1px solid #000;">${esc(e.evaluatorRole)}</td>
      <td style="text-align:center;padding:4px;border:1px solid #000;">${e.maxMarks}</td>
      <td style="text-align:center;padding:4px;border:1px solid #000;font-weight:700;">${marks}</td>
      <td style="padding:4px;border:1px solid #000;">${esc(e.comment || '')}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Evaluation - ${esc(title)}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; color: #000; font-size: 12px; line-height: 1.4; margin: 0; padding: 0; }
    table { border-color: #000; }
    td, th { border-color: #000; vertical-align: top; }
  </style></head><body>
    <div style="text-align:center;margin-bottom:16px;font-size:13px;">
      <div style="font-weight:700;">TRIBHUVAN UNIVERSITY</div>
      <div style="font-weight:700;">INSTITUTE OF ENGINEERING</div>
      <div style="font-weight:700;">PULCHOWK CAMPUS</div>
      <div style="font-weight:700;margin-top:8px;">${projectLabel} Evaluation</div>
    </div>
    <table style="width:100%;font-size:12px;" cellpadding="2">
      <tr><td style="width:140px;"><strong>Title:</strong></td><td>${esc(title)}</td></tr>
      <tr><td><strong>Group / Student:</strong></td><td>${esc(name)}</td></tr>
      <tr><td><strong>Supervisor:</strong></td><td>${esc(supervisor)}</td></tr>
      <tr><td><strong>Credit:</strong></td><td>${credit} | Full Marks: ${maxTotal}</td></tr>
      <tr><td><strong>Academic Year:</strong></td><td>${esc(academicYear)}</td></tr>
      ${members ? `<tr><td><strong>Members:</strong></td><td>${members}</td></tr>` : ''}
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;" border="1" cellpadding="4">
      <thead><tr>
        <th style="text-align:center;padding:4px;">S.N.</th>
        <th style="text-align:left;padding:4px;">Component</th>
        <th style="text-align:left;padding:4px;">Evaluator</th>
        <th style="text-align:center;padding:4px;">Max</th>
        <th style="text-align:center;padding:4px;">Marks</th>
        <th style="text-align:left;padding:4px;">Remarks</th>
      </tr></thead>
      <tbody>
        ${bodyRows}
        <tr>
          <td colspan="3" style="text-align:right;padding:4px;font-weight:700;border:1px solid #000;">Total</td>
          <td style="text-align:center;padding:4px;font-weight:700;border:1px solid #000;">${maxTotal}</td>
          <td style="text-align:center;padding:4px;font-weight:700;border:1px solid #000;">${total}</td>
          <td style="border:1px solid #000;"></td>
        </tr>
      </tbody>
    </table>
  </body></html>`;
}

function sendPdf(res, pdf, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdf);
}

/** Verify the requesting user has access to the given group/thesis.
 *  Sends a 403 response directly if access is denied.
 *  Returns true if access is granted. */
async function checkPrintAccess(req, res, type, id) {
  if (req.user.role === 'MAINTAINER') return true;
  if (req.user.role === 'COORDINATOR') {
    const program = await prisma.program.findUnique({ where: { coordinatorId: req.user.id } });
    if (program) {
      let itemProgramId = null;
      if (type === 'group') {
        const g = await prisma.projectGroup.findUnique({ where: { id }, select: { programId: true } });
        itemProgramId = g?.programId;
      } else {
        const t = await prisma.thesis.findUnique({ where: { id }, include: { student: { select: { programId: true } } } });
        itemProgramId = t?.student?.programId;
      }
      if (itemProgramId && itemProgramId !== program.id) {
        res.status(403).json({ error: 'Access denied. Item belongs to another program.' });
        return false;
      }
    } else {
      const dept = await prisma.department.findUnique({ where: { coordinatorId: req.user.id } });
      if (dept) {
        const ay = type === 'group'
          ? await prisma.academicYear.findFirst({ where: { projectGroups: { some: { id } } }, select: { departmentId: true } })
          : await prisma.academicYear.findFirst({ where: { theses: { some: { id } } }, select: { departmentId: true } });
        if (ay && ay.departmentId !== dept.id) {
          res.status(403).json({ error: 'Access denied. Item belongs to another department.' });
          return false;
        }
      }
    }
  }
  return true;
}

exports.printGroupEvaluation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const granted = await checkPrintAccess(req, res, 'group', id);
    if (!granted) return;
    const group = await prisma.projectGroup.findUnique({
      where: { id },
      include: {
        supervisor: { select: { firstName: true, lastName: true } },
        academicYear: true,
        members: { include: { student: { select: { firstName: true, lastName: true, email: true, rollNumber: true } } } },
        evaluations: { include: { submittedBy: { select: { firstName: true, lastName: true } } } },
        evaluationComponents: true,
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const evaluations = group.evaluations;
    const projectType = group.projectType;
    const maxTotal = projectType === 'MAJOR' ? 100 : 50;
    const total = evaluations.reduce((s, e) => s + (e.marks ?? 0), 0);

    const memberList = group.members.map(m =>
      `${esc(m.student.firstName)} ${esc(m.student.lastName)} (${esc(m.rollNumber)})`
    ).join(', ');

    const evalData = group.evaluationComponents.map(c => {
      const e = evaluations.find(ev => ev.componentId === c.id);
      return {
        name: c.name,
        evaluatorRole: c.evaluatorRole === 'COORDINATOR' ? 'Coordinator'
          : c.evaluatorRole === 'SUPERVISOR' ? 'Supervisor'
          : c.evaluatorRole === 'EXTERNAL_EXAMINER' ? 'Internal Examiner' : c.evaluatorRole,
        maxMarks: c.maxMarks,
        marks: e?.marks ?? null,
        comment: e?.comment || null,
        comments: e?.comments || null,
        suggestions: e?.suggestions || null,
        submittedBy: e?.submittedBy ? `${e.submittedBy.firstName} ${e.submittedBy.lastName}` : null,
      };
    });

    const html = buildBachelorFormat({
      title: group.projectTitle,
      name: group.name,
      supervisor: group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : 'N/A',
      academicYear: group.academicYear?.year || 'N/A',
      members: memberList,
      evaluations: evalData,
      projectType,
      total: total.toFixed(1),
      maxTotal,
    });

    const pdf = await generatePdf(html);
    sendPdf(res, pdf, `evaluation_${id}.pdf`);
  } catch (error) {
    console.error('printGroupEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.printThesisEvaluation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const granted = await checkPrintAccess(req, res, 'thesis', id);
    if (!granted) return;
    const thesis = await prisma.thesis.findUnique({
      where: { id },
      include: {
        student: { select: { firstName: true, lastName: true, email: true, rollNumber: true } },
        supervisor: { select: { firstName: true, lastName: true } },
        academicYear: true,
        evaluations: { include: { submittedBy: { select: { firstName: true, lastName: true } } } },
        evaluationComponents: true,
      },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });

    const evaluations = thesis.evaluations;

    const evalData = thesis.evaluationComponents.map(c => {
      const e = evaluations.find(ev => ev.componentId === c.id);
      return {
        name: c.name,
        evaluatorRole: c.evaluatorRole === 'SUPERVISOR' ? 'Supervisor'
          : c.evaluatorRole === 'EXTERNAL_EXAMINER' ? 'External Examiner'
          : 'Coordinator',
        maxMarks: c.maxMarks,
        marks: e?.marks ?? null,
        comment: e?.comment || null,
        comments: e?.comments || null,
        suggestions: e?.suggestions || null,
        submittedBy: e?.submittedBy ? `${e.submittedBy.firstName} ${e.submittedBy.lastName}` : null,
      };
    });

    const html = buildMasterFormat({
      title: thesis.title,
      name: `${thesis.student.firstName} ${thesis.student.lastName}`,
      supervisor: thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : 'N/A',
      evaluations: evalData,
      student: thesis.student || null,
    });

    const pdf = await generatePdf(html);
    sendPdf(res, pdf, `thesis_evaluation_${id}.pdf`);
  } catch (error) {
    console.error('printThesisEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Preview endpoint - returns HTML instead of PDF
exports.previewGroupEvaluation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const granted = await checkPrintAccess(req, res, 'group', id);
    if (!granted) return;
    const group = await prisma.projectGroup.findUnique({
      where: { id },
      include: {
        supervisor: { select: { firstName: true, lastName: true } },
        academicYear: true,
        members: { include: { student: { select: { firstName: true, lastName: true, email: true, rollNumber: true } } } },
        evaluations: { include: { submittedBy: { select: { firstName: true, lastName: true } } } },
        evaluationComponents: true,
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const evaluations = group.evaluations;
    const projectType = group.projectType;
    const maxTotal = projectType === 'MAJOR' ? 100 : 50;
    const total = evaluations.reduce((s, e) => s + (e.marks ?? 0), 0);

    const memberList = group.members.map(m =>
      `${esc(m.student.firstName)} ${esc(m.student.lastName)} (${esc(m.rollNumber)})`
    ).join(', ');

    const evalData = group.evaluationComponents.map(c => {
      const e = evaluations.find(ev => ev.componentId === c.id);
      return {
        name: c.name,
        evaluatorRole: c.evaluatorRole === 'COORDINATOR' ? 'Coordinator'
          : c.evaluatorRole === 'SUPERVISOR' ? 'Supervisor'
          : c.evaluatorRole === 'EXTERNAL_EXAMINER' ? 'Internal Examiner' : c.evaluatorRole,
        maxMarks: c.maxMarks,
        marks: e?.marks ?? null,
        comment: e?.comment || null,
        comments: e?.comments || null,
        suggestions: e?.suggestions || null,
        submittedBy: e?.submittedBy ? `${e.submittedBy.firstName} ${e.submittedBy.lastName}` : null,
      };
    });

    const html = buildBachelorFormat({
      title: group.projectTitle,
      name: group.name,
      supervisor: group.supervisor ? `${group.supervisor.firstName} ${group.supervisor.lastName}` : 'N/A',
      academicYear: group.academicYear?.year || 'N/A',
      members: memberList,
      evaluations: evalData,
      projectType,
      total: total.toFixed(1),
      maxTotal,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('previewGroupEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.previewThesisEvaluation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const granted = await checkPrintAccess(req, res, 'thesis', id);
    if (!granted) return;
    const thesis = await prisma.thesis.findUnique({
      where: { id },
      include: {
        student: { select: { firstName: true, lastName: true, email: true, rollNumber: true } },
        supervisor: { select: { firstName: true, lastName: true } },
        academicYear: true,
        evaluations: { include: { submittedBy: { select: { firstName: true, lastName: true } } } },
        evaluationComponents: true,
      },
    });
    if (!thesis) return res.status(404).json({ error: 'Thesis not found' });

    const evaluations = thesis.evaluations;

    const evalData = thesis.evaluationComponents.map(c => {
      const e = evaluations.find(ev => ev.componentId === c.id);
      return {
        name: c.name,
        evaluatorRole: c.evaluatorRole === 'SUPERVISOR' ? 'Supervisor'
          : c.evaluatorRole === 'EXTERNAL_EXAMINER' ? 'External Examiner'
          : 'Coordinator',
        maxMarks: c.maxMarks,
        marks: e?.marks ?? null,
        comment: e?.comment || null,
        comments: e?.comments || null,
        suggestions: e?.suggestions || null,
        submittedBy: e?.submittedBy ? `${e.submittedBy.firstName} ${e.submittedBy.lastName}` : null,
      };
    });

    const html = buildMasterFormat({
      title: thesis.title,
      name: `${thesis.student.firstName} ${thesis.student.lastName}`,
      supervisor: thesis.supervisor ? `${thesis.supervisor.firstName} ${thesis.supervisor.lastName}` : 'N/A',
      evaluations: evalData,
      student: thesis.student || null,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('previewThesisEvaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
