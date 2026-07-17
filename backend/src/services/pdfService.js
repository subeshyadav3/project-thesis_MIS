const PDFDocument = require('pdfkit');

function generateRecommendationPDF({ studentName, projectTitle, thesisTitle, supervisorName, supervisorDesignation, content, date, type }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 70, right: 70 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Letterhead ──
    // IOE Logo (left) + TPMS header
    const logoSize = 50;
    try {
      // Try to embed the IOE logo from URL (will be downloaded in browser when viewing)
      const logoUrl = 'https://ioe.tu.edu.np/assets/logo.png';
      doc.image(logoUrl, doc.page.margins.left, doc.page.margins.top - 10, { width: logoSize, height: logoSize });
    } catch (e) {
      // Logo unavailable — just skip it
    }

    // TPMS Header — right-aligned
    const headerX = doc.page.margins.left + logoSize + 20;
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a237e')
      .text('THESIS / PROJECT MANAGEMENT SYSTEM', headerX, doc.page.margins.top - 5, { width: pageWidth - logoSize - 20, align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#444')
      .text('Department of Electronics and Computer Engineering', headerX, doc.page.margins.top + 18, { width: pageWidth - logoSize - 20, align: 'center' });
    doc.fontSize(9).fillColor('#666')
      .text('Institute of Engineering, Tribhuvan University — Pulchowk Campus, Lalitpur, Nepal', headerX, doc.page.margins.top + 33, { width: pageWidth - logoSize - 20, align: 'center' });

    doc.moveDown(4);
    const lineY = doc.y;

    // Decorative horizontal line
    doc.moveTo(doc.page.margins.left, lineY)
      .lineTo(doc.page.width - doc.page.margins.right, lineY)
      .strokeColor('#1a237e').lineWidth(2.5).stroke();
    doc.moveDown(0.8);

    // ── Title ──
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a237e')
      .text('LETTER OF RECOMMENDATION', { align: 'center' });
    doc.moveDown(0.3);

    // Reference / Date line
    doc.fontSize(9).font('Helvetica').fillColor('#555')
      .text(`Ref: TPMS/REC/${Date.now().toString(36).toUpperCase()}`, { align: 'left', continued: true });
    doc.text(`Date: ${date}`, { align: 'right' });
    doc.moveDown(0.5);

    // Thin separator
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#ccc').lineWidth(0.5).stroke();
    doc.moveDown(0.8);

    // ── Body ──
    doc.fontSize(11).fillColor('#333');

    const itemLabel = type === 'thesis' ? 'Master Thesis' : 'Project';
    const itemName = type === 'thesis' ? thesisTitle : projectTitle;

    doc.font('Helvetica').text('To Whom It May Concern,', { align: 'left' });
    doc.moveDown(0.5);

    doc.text(`I am pleased to recommend ${studentName}, who has successfully completed their ${itemLabel.toLowerCase()} titled "${itemName}" under my supervision at the Department of Electronics and Computer Engineering, Institute of Engineering, Pulchowk Campus.`, { align: 'justify', lineGap: 5 });
    doc.moveDown(0.5);

    // Content body — the actual recommendation text
    if (content) {
      doc.text(content, { align: 'justify', lineGap: 5 });
      doc.moveDown(0.5);
    }

    doc.text('I recommend this student without reservation and am confident that they will excel in their future academic and professional endeavors.', { align: 'justify', lineGap: 5 });
    doc.moveDown(1.5);

    // ── Signature block ──
    doc.moveDown(1);
    const sigY = doc.y + 10;

    // Left side: signature
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333')
      .text('____________________________', doc.page.margins.left, sigY);
    const sigName = supervisorDesignation ? `${supervisorDesignation} ${supervisorName}` : supervisorName;
    doc.font('Helvetica').fontSize(10).fillColor('#444')
      .text(sigName, doc.page.margins.left, sigY + 18)
      .text('Supervisor', doc.page.margins.left, sigY + 32)
      .text('Department of Electronics and Computer Engineering', doc.page.margins.left, sigY + 46)
      .text('Institute of Engineering, Pulchowk Campus', doc.page.margins.left, sigY + 60);

    // Right side: date and seal
    doc.fontSize(10).font('Helvetica').fillColor('#555')
      .text(`Date: ${date}`, doc.page.margins.left + 300, sigY + 18, { align: 'right' });

    // Footer
    doc.fontSize(7.5).font('Helvetica').fillColor('#999');
    doc.text(
      'This is a system-generated document from TPMS. The electronic record is maintained and can be verified.',
      doc.page.margins.left, doc.page.height - 40,
      { width: pageWidth, align: 'center' }
    );

    doc.end();
  });
}

module.exports = { generateRecommendationPDF };
