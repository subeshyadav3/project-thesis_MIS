const PDFDocument = require('pdfkit');

function generateRecommendationPDF({ studentName, projectTitle, thesisTitle, supervisorName, supervisorDesignation, content, date, type }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 60, right: 60 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Letterhead ─────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a237e')
      .text('TRIBHUVAN UNIVERSITY', { align: 'center' });
    doc.fontSize(11).fillColor('#1a237e')
      .text('INSTITUTE OF ENGINEERING', { align: 'center' });
    doc.fontSize(11).fillColor('#283593')
      .text('Pulchowk Campus', { align: 'center' });

    doc.moveDown(0.3);
    const headerY = doc.y;
    doc.moveTo(doc.page.margins.left, headerY)
      .lineTo(doc.page.width - doc.page.margins.right, headerY)
      .strokeColor('#1a237e').lineWidth(1.2).stroke();
    doc.moveDown(0.6);

    // ── Title & reference ──────────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e')
      .text('LETTER OF RECOMMENDATION', { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(8.5).font('Helvetica').fillColor('#555');
    const refNo = `TPMS/REC/${String(new Date().getFullYear()).slice(-2)}/${String(Date.now()).slice(-6)}`;
    doc.text(`Ref. No.: ${refNo}`, { align: 'left', continued: true });
    doc.text(`Date: ${date}`, { align: 'right' });
    doc.moveDown(0.5);

    // ── Subject ────────────────────────────────────────────────
    const itemLabel = type === 'thesis' ? 'Master Thesis' : 'Project';
    const itemName = type === 'thesis' ? thesisTitle : projectTitle;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333')
      .text(`Subject: Recommendation for ${itemLabel} — "${itemName || ''}"`);
    doc.moveDown(0.5);

    // ── Body ───────────────────────────────────────────────────
    const body = [
      'To Whom It May Concern,',
      '',
      (content || `I am pleased to recommend ${studentName}.`).split('\n').join('\n'),
      '',
      'I trust this recommendation will be given due consideration.',
    ].join('\n');

    let bodyFont = 10.5;
    let fits = false;
    while (bodyFont > 8.5 && !fits) {
      const h = doc.heightOfString(body, { width: pageWidth, align: 'justify', lineGap: 2, font: 'Helvetica', size: bodyFont });
      fits = doc.y + h < doc.page.height - doc.page.margins.bottom - 110;
      if (!fits) bodyFont -= 0.5;
    }

    doc.fontSize(bodyFont).font('Helvetica').fillColor('#333');
    doc.text(body, { width: pageWidth, align: 'justify', lineGap: 2, paragraphGap: 6 });

    // ── Signature block ────────────────────────────────────────
    const sigY = Math.max(doc.y + 16, doc.page.height - doc.page.margins.bottom - 70);
    const fullName = supervisorDesignation
      ? `${supervisorName}, ${supervisorDesignation}`
      : supervisorName;

    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text('____________________________', doc.page.margins.left, sigY);
    doc.fontSize(9.5).font('Helvetica-Bold')
      .text(fullName, doc.page.margins.left, sigY + 14);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text('Supervisor', doc.page.margins.left, sigY + 26);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(`Date: ${date}`, doc.page.margins.left, sigY + 38);

    doc.end();
  });
}

function generateFormProposalPDF({ title, description, studentName, rollNumber, programName, batch, date }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 60, right: 60 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a237e')
      .text('TRIBHUVAN UNIVERSITY', { align: 'center' });
    doc.fontSize(11).fillColor('#1a237e')
      .text('INSTITUTE OF ENGINEERING', { align: 'center' });
    doc.fontSize(11).fillColor('#283593')
      .text('Pulchowk Campus', { align: 'center' });

    doc.moveDown(0.3);
    const headerY = doc.y;
    doc.moveTo(doc.page.margins.left, headerY)
      .lineTo(doc.page.width - doc.page.margins.right, headerY)
      .strokeColor('#1a237e').lineWidth(1.2).stroke();
    doc.moveDown(0.6);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e')
      .text('THESIS PROPOSAL', { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(8.5).font('Helvetica').fillColor('#555');
    doc.text(`Date: ${date}`, { align: 'left' });
    doc.moveDown(0.5);

    const meta = [
      ['Thesis Title', title || '—'],
      ['Student Name', studentName || '—'],
      ['Roll Number', rollNumber || '—'],
      ['Program', programName || '—'],
      ['Batch', batch || '—'],
    ];

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
    doc.text('Candidate Details', { underline: true });
    doc.moveDown(0.2);

    doc.fontSize(10).font('Helvetica').fillColor('#333');
    for (const [label, value] of meta) {
      doc.font('Helvetica-Bold').text(label + ':', { continued: true });
      doc.font('Helvetica').text(' ' + value);
      doc.moveDown(0.1);
    }

    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333')
      .text('Abstract / Description', { underline: true });
    doc.moveDown(0.2);

    doc.fontSize(10).font('Helvetica').fillColor('#333')
      .text((description || 'No description provided.').split('\n').join('\n'),
        { width: pageWidth, align: 'justify', lineGap: 2, paragraphGap: 6 });

    doc.moveDown(0.6);
    const sigY = Math.max(doc.y + 16, doc.page.height - doc.page.margins.bottom - 70);
    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text('____________________________', doc.page.margins.left, sigY);
    doc.fontSize(9.5).font('Helvetica-Bold')
      .text(studentName || '', doc.page.margins.left, sigY + 14);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text('Student Signature', doc.page.margins.left, sigY + 26);

    doc.end();
  });
}

/**
 * Generate Realistic Multi-Page Proposal PDF (2-3 Pages)
 */
function generateRealisticProposalPDF({ title, students = [], supervisorName, supervisorDesignation, programName, batch, projectType = 'MAJOR' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 60, right: 60 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const typeLabel = projectType === 'THESIS' ? 'MASTER THESIS PROPOSAL' : (projectType === 'PROJECT' ? 'MASTER PROJECT PROPOSAL' : `${projectType} PROJECT PROPOSAL`);

    // ── PAGE 1: COVER PAGE ──
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#1a237e').text('TRIBHUVAN UNIVERSITY', { align: 'center' });
    doc.fontSize(12).fillColor('#1a237e').text('INSTITUTE OF ENGINEERING', { align: 'center' });
    doc.fontSize(12).fillColor('#283593').text('Pulchowk Campus, Lalitpur, Nepal', { align: 'center' });
    doc.fontSize(10).fillColor('#455a64').text('Department of Electronics and Computer Engineering', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#0d47a1').text(title || 'PROJECT PROPOSAL REPORT', { align: 'center' });
    doc.moveDown(0.8);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#37474f').text(`A PROPOSAL SUBMITTED FOR ${typeLabel}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#263238').text('SUBMITTED BY:', { align: 'center' });
    doc.moveDown(0.4);
    for (const s of students) {
      doc.fontSize(10).font('Helvetica').fillColor('#37474f').text(`${s.name} (${s.rollNumber})`, { align: 'center' });
    }
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#263238').text('UNDER THE SUPERVISION OF:', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#37474f').text(`${supervisorName || 'Department Faculty Supervisor'}`, { align: 'center' });
    if (supervisorDesignation) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#546e7a').text(supervisorDesignation, { align: 'center' });
    }
    doc.moveDown(2);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#263238').text(`Program: ${programName || 'Computer Engineering'} (Batch ${batch || '2080'})`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#78909c').text(`Date: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, { align: 'center' });

    // ── PAGE 2: INTRODUCTION & OBJECTIVES ──
    doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('1. INTRODUCTION & BACKGROUND', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      `In modern software systems and digital engineering, scalability, resilience, and automated intelligence are essential pillars. This project focuses on investigating and implementing a reliable, robust solution for "${title}". By synthesizing industry best practices with modern architectural patterns, this work addresses existing efficiency bottlenecks and enhances operational fidelity.`,
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('2. PROBLEM STATEMENT', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'Current operational workflows face notable constraints including latency overhead, high vulnerability exposure, manual human intervention, and limited visibility. There is a lack of an integrated end-to-end pipeline tailored for local deployment constraints and high-throughput evaluation. This project establishes an automated, mathematically rigorous, and empirically validated framework to overcome these limitations.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('3. PROJECT OBJECTIVES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text('3.1 Primary Objective:');
    doc.fontSize(10).font('Helvetica').text(`• Design, develop, benchmark, and deploy the core functional prototype for "${title}".`);
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold').text('3.2 Specific Objectives:');
    doc.fontSize(10).font('Helvetica').text('• Conduct formal requirement analysis and architectural modeling.');
    doc.fontSize(10).font('Helvetica').text('• Implement modular, loosely coupled backend services with verified data integrity.');
    doc.fontSize(10).font('Helvetica').text('• Execute comprehensive integration, stress, and security vulnerability testing.');
    doc.fontSize(10).font('Helvetica').text('• Validate performance metrics against established benchmark datasets.');

    // ── PAGE 3: METHODOLOGY & SIGNATURES ──
    doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('4. SYSTEM METHODOLOGY & ARCHITECTURE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'The system follows an iterative agile engineering lifecycle comprising four principal phases: Requirements Elicitation, System Architecture Design, Test-Driven Implementation, and Empirical Evaluation. Data ingest pipelines feed the core processing engine with real-time feedback loops and audit verification.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('5. WORK BREAKDOWN & MILESTONE SCHEDULE', { underline: true });
    doc.moveDown(0.5);
    const milestones = [
      ['Milestone 1', 'Literature Review & Feasibility Sign-off', 'Weeks 1–3', 'Completed'],
      ['Milestone 2', 'Core Architecture & API Specifications', 'Weeks 4–7', 'Completed'],
      ['Milestone 3', 'Module Integration & Mid-Term Verification', 'Weeks 8–12', 'In Progress'],
      ['Milestone 4', 'Comprehensive Testing, Optimization & Final Defense', 'Weeks 13–16', 'Scheduled'],
    ];
    for (const [mId, mDesc, mTime, mStat] of milestones) {
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#263238').text(`${mId}: `, { continued: true });
      doc.font('Helvetica').text(`${mDesc} (${mTime}) — [${mStat}]`);
      doc.moveDown(0.2);
    }
    doc.moveDown(2);

    // Signatures
    const sigY = doc.y + 10;
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('____________________________', doc.page.margins.left, sigY);
    doc.text('____________________________', doc.page.width - doc.page.margins.right - 150, sigY);
    doc.fontSize(9.5).font('Helvetica-Bold');
    doc.text('Candidate(s)', doc.page.margins.left, sigY + 12);
    doc.text(`${supervisorName || 'Project Supervisor'}`, doc.page.width - doc.page.margins.right - 150, sigY + 12);
    doc.fontSize(8).font('Helvetica').fillColor('#757575');
    doc.text('Submitted for Approval', doc.page.margins.left, sigY + 24);
    doc.text('Faculty Supervisor', doc.page.width - doc.page.margins.right - 150, sigY + 24);

    doc.end();
  });
}

/**
 * Generate Realistic Multi-Page Midterm Progress Report PDF (2-3 Pages)
 */
function generateRealisticMidtermReportPDF({ title, students = [], supervisorName, supervisorDesignation, programName, batch, projectType = 'MAJOR' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 60, right: 60 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── PAGE 1: COVER ──
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#1a237e').text('TRIBHUVAN UNIVERSITY', { align: 'center' });
    doc.fontSize(12).fillColor('#1a237e').text('INSTITUTE OF ENGINEERING', { align: 'center' });
    doc.fontSize(12).fillColor('#283593').text('Pulchowk Campus, Lalitpur, Nepal', { align: 'center' });
    doc.fontSize(10).fillColor('#455a64').text('Department of Electronics and Computer Engineering', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#b71c1c').text('MID-TERM PROGRESS DEFENSE REPORT', { align: 'center' });
    doc.moveDown(0.8);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#0d47a1').text(`"${title || 'PROJECT REPORT'}"`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#263238').text('PROJECT TEAM:', { align: 'center' });
    doc.moveDown(0.4);
    for (const s of students) {
      doc.fontSize(10).font('Helvetica').fillColor('#37474f').text(`${s.name} (${s.rollNumber})`, { align: 'center' });
    }
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#263238').text('SUPERVISOR:', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#37474f').text(`${supervisorName || 'Department Faculty Supervisor'}`, { align: 'center' });
    if (supervisorDesignation) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#546e7a').text(supervisorDesignation, { align: 'center' });
    }
    doc.moveDown(2);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#263238').text(`Program: ${programName || 'Computer Engineering'} (Batch ${batch || '2080'})`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#78909c').text(`Date: Mid-Term Defense Period`, { align: 'center' });

    // ── PAGE 2: PROGRESS SUMMARY & ACHIEVEMENTS ──
    doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('1. EXECUTIVE SUMMARY OF MID-TERM PROGRESS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'At this midterm juncture, the foundational software architecture, schema designs, and core processing engines have been established and tested in development environments. Data flows have been verified against synthetic and baseline datasets, demonstrating nominal latency within operational targets.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('2. MILESTONES ACHIEVED TO DATE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('• Phase 1: Requirement Specification & Domain Modeling completed and approved.');
    doc.fontSize(10).font('Helvetica').text('• Phase 2: Database schema normalization and core REST/gRPC API contracts implemented.');
    doc.fontSize(10).font('Helvetica').text('• Phase 3: Primary computational algorithms implemented with 85%+ unit test coverage.');
    doc.fontSize(10).font('Helvetica').text('• Phase 4: Intermediate benchmarking completed; throughput validated under nominal load.');
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('3. INTERMEDIATE EXPERIMENTAL RESULTS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'Preliminary evaluation demonstrates a 34% reduction in processing latency compared to legacy baseline approaches. Algorithmic accuracy on validation splits is currently measured at 91.4% precision with zero critical memory leaks observed during continuous 48-hour soak testing.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );

    // ── PAGE 3: CHALLENGES & REMAINING ROADMAP ──
    doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('4. TECHNICAL CHALLENGES & MITIGATIONS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'Encountered challenges include handling edge cases under asymmetric packet bursts and optimizing database connection pooling. These have been mitigated by introducing asynchronous queue buffering and connection reuse policies.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('5. REMAINING WORK TOWARDS FINAL DEFENSE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('• Finalize front-end telemetry dashboards and user feedback interfaces.');
    doc.fontSize(10).font('Helvetica').text('• Conduct rigorous security penetration testing and role-based access audits.');
    doc.fontSize(10).font('Helvetica').text('• Complete final documentation, IEEE paper drafting, and comprehensive user manuals.');
    doc.moveDown(2);

    // Signatures
    const sigY = doc.y + 10;
    doc.fontSize(9).font('Helvetica').fillColor('#333');
    doc.text('____________________________', doc.page.margins.left, sigY);
    doc.text('____________________________', doc.page.width - doc.page.margins.right - 150, sigY);
    doc.fontSize(9.5).font('Helvetica-Bold');
    doc.text('Student Representative', doc.page.margins.left, sigY + 12);
    doc.text(`${supervisorName || 'Project Supervisor'}`, doc.page.width - doc.page.margins.right - 150, sigY + 12);
    doc.fontSize(8).font('Helvetica').fillColor('#757575');
    doc.text('Candidate Verification', doc.page.margins.left, sigY + 24);
    doc.text('Mid-Term Progress Approved', doc.page.width - doc.page.margins.right - 150, sigY + 24);

    doc.end();
  });
}

/**
 * Generate Realistic Multi-Page Final Report PDF (3-4 Pages)
 */
function generateRealisticFinalReportPDF({ title, students = [], supervisorName, supervisorDesignation, externalExaminerName, programName, batch, projectType = 'MAJOR' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 60, right: 60 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const typeLabel = projectType === 'THESIS' ? 'MASTER THESIS' : (projectType === 'PROJECT' ? 'MASTER PROJECT' : `${projectType} PROJECT`);

    // ── PAGE 1: COVER PAGE ──
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#1a237e').text('TRIBHUVAN UNIVERSITY', { align: 'center' });
    doc.fontSize(12).fillColor('#1a237e').text('INSTITUTE OF ENGINEERING', { align: 'center' });
    doc.fontSize(12).fillColor('#283593').text('Pulchowk Campus, Lalitpur, Nepal', { align: 'center' });
    doc.fontSize(10).fillColor('#455a64').text('Department of Electronics and Computer Engineering', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(17).font('Helvetica-Bold').fillColor('#0d47a1').text(title || 'FINAL PROJECT REPORT', { align: 'center' });
    doc.moveDown(0.8);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#37474f').text(`A FINAL REPORT SUBMITTED IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE DEGREE OF ${typeLabel.toUpperCase()}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#263238').text('SUBMITTED BY:', { align: 'center' });
    doc.moveDown(0.4);
    for (const s of students) {
      doc.fontSize(10).font('Helvetica').fillColor('#37474f').text(`${s.name} (${s.rollNumber})`, { align: 'center' });
    }
    doc.moveDown(1.5);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#263238').text('SUPERVISOR:', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#37474f').text(`${supervisorName || 'Department Faculty Supervisor'}`, { align: 'center' });
    if (supervisorDesignation) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#546e7a').text(supervisorDesignation, { align: 'center' });
    }
    doc.moveDown(2);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#263238').text(`Department of Electronics and Computer Engineering`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#78909c').text(`Lalitpur, Nepal | Final Defense Submission`, { align: 'center' });

    // ── PAGE 2: CERTIFICATE OF APPROVAL & ABSTRACT ──
    doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('CERTIFICATE OF ACCEPTANCE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9.5).font('Helvetica').fillColor('#333').text(
      'This is to certify that the project entitled "' + title + '" submitted by the candidate(s) has been examined and approved by the Board of Examiners as satisfying the academic requirements for the award of the degree.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    // Signature board table
    const certSigY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#263238');
    doc.text('____________________________', doc.page.margins.left, certSigY + 10);
    doc.text(`${supervisorName || 'Supervisor'}`, doc.page.margins.left, certSigY + 22);
    doc.fontSize(8).font('Helvetica').text('Supervisor', doc.page.margins.left, certSigY + 34);

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('____________________________', doc.page.width - doc.page.margins.right - 150, certSigY + 10);
    doc.text(`${externalExaminerName || 'External Examiner'}`, doc.page.width - doc.page.margins.right - 150, certSigY + 22);
    doc.fontSize(8).font('Helvetica').text('External Examiner', doc.page.width - doc.page.margins.right - 150, certSigY + 34);
    doc.moveDown(3);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('ABSTRACT', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      `This report documents the design, rigorous implementation, and empirical evaluation of "${title}". The system addresses critical scalability and robustness challenges in distributed workflows. Experimental findings confirm substantial performance gains across standard benchmark suites, demonstrating an average throughput improvement of 38.6% and robust error resilience.`,
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );

    // ── PAGE 3: IMPLEMENTATION & RESULTS ──
    doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('CHAPTER 3: SYSTEM ARCHITECTURE & IMPLEMENTATION', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'The implementation leverages modular asynchronous pipelines, transactional database safeguards, and containerized microservices. Strict API contracts guarantee deterministic state management across all operational layers.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('CHAPTER 4: EXPERIMENTAL EVALUATION & RESULTS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'Rigorous benchmark runs were conducted with varying concurrent loads from 100 to 10,000 requests per second. The proposed architecture consistently maintained sub-50ms p99 latencies, outperforming baseline paradigms by 42.1%.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1);

    // ── PAGE 4: CONCLUSION & REFERENCES ──
    doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('CHAPTER 5: CONCLUSION & FUTURE SCOPE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(
      'The project successfully realized all initial objectives within the scheduled timeline. Future investigations may incorporate reinforcement-learning-driven adaptive resource allocation and multi-region federated replication.',
      { width: pageWidth, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(1.5);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e').text('REFERENCES', { underline: true });
    doc.moveDown(0.5);
    const refs = [
      '[1] J. Dean and S. Ghemawat, "MapReduce: Simplified Data Processing on Large Clusters," Communications of the ACM, vol. 51, no. 1, pp. 107–113, 2008.',
      '[2] M. Zaharia et al., "Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing," in Proc. USENIX NSDI, 2012.',
      '[3] A. Vaswani et al., "Attention Is All You Need," Advances in Neural Information Processing Systems (NeurIPS), 2017.',
      '[4] IEEE Standard for Software Quality Assurance Processes, IEEE Std 730-2014, 2014.',
    ];
    for (const r of refs) {
      doc.fontSize(8.5).font('Helvetica').fillColor('#455a64').text(r, { width: pageWidth, lineGap: 2 });
      doc.moveDown(0.2);
    }

    doc.end();
  });
}

module.exports = {
  generateRecommendationPDF,
  generateFormProposalPDF,
  generateRealisticProposalPDF,
  generateRealisticMidtermReportPDF,
  generateRealisticFinalReportPDF,
};
