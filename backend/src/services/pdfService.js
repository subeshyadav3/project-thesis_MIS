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

    // Shrink font if the body would overflow onto a second page
    let bodyFont = 10.5;
    const usableHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    let fits = false;
    while (bodyFont > 8.5 && !fits) {
      const h = doc.heightOfString(body, { width: pageWidth, align: 'justify', lineGap: 2, font: 'Helvetica', size: bodyFont });
      fits = doc.y + h < doc.page.height - doc.page.margins.bottom - 110; // reserve room for signature
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

module.exports = { generateRecommendationPDF, generateFormProposalPDF };
