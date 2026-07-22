const PDFDocument = require('pdfkit');

function generateRecommendationPDF({ studentName, projectTitle, thesisTitle, supervisorName, supervisorDesignation, content, date, type }) {
  return new Promise((resolve, reject) => {
    // Compact margins to maximize single-page fit
    const doc = new PDFDocument({ size: 'A4', margins: { top: 30, bottom: 30, left: 65, right: 65 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ═══════════════════════════════════════════════════
    //  LETTERHEAD — compact
    // ═══════════════════════════════════════════════════

    // Top bar
    doc.rect(doc.page.margins.left, doc.y, pageWidth, 2)
      .fillColor('#1a237e').fill();
    doc.moveDown(0.4);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a237e')
      .text('TRIBHUVAN UNIVERSITY', { align: 'center' });
    doc.fontSize(10).fillColor('#1a237e')
      .text('INSTITUTE OF ENGINEERING', { align: 'center' });
    doc.moveDown(0.05);
    doc.fontSize(10).fillColor('#283593')
      .text('Pulchowk Campus', { align: 'center' });
    doc.moveDown(0.05);
    doc.fontSize(7).font('Helvetica').fillColor('#666')
      .text('Department of Electronics and Computer Engineering · GPO Box 1175, Lalitpur, Nepal', { align: 'center' });

    doc.moveDown(0.25);

    // Single thin line (no double line to save space)
    const lineY1 = doc.y;
    doc.moveTo(doc.page.margins.left, lineY1)
      .lineTo(doc.page.width - doc.page.margins.right, lineY1)
      .strokeColor('#1a237e').lineWidth(1.5).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════
    //  TITLE
    // ═══════════════════════════════════════════════════
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e')
      .text('LETTER OF RECOMMENDATION', { align: 'center' });
    doc.moveDown(0.3);

    // Reference & Date — same line
    doc.fontSize(8.5).font('Helvetica').fillColor('#555');
    const refNo = `TPMS/REC/${String(new Date().getFullYear()).slice(-2)}/${String(Date.now()).slice(-6)}`;
    doc.text(`Ref. No.: ${refNo}`, { align: 'left', continued: true });
    doc.text(`    Date: ${date}`, { align: 'right' });
    doc.moveDown(0.1);

    // Thin separator
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#ccc').lineWidth(0.3).stroke();
    doc.moveDown(0.4);

    // ═══════════════════════════════════════════════════
    //  BODY — compact with smaller lineGap
    // ═══════════════════════════════════════════════════
    const itemLabel = type === 'thesis' ? 'Master Thesis' : 'Project';
    const itemName = type === 'thesis' ? thesisTitle : projectTitle;

    doc.fontSize(8.5).font('Helvetica').fillColor('#444')
      .text(`Subject: Recommendation for ${itemLabel} — "${itemName || ''}"`, { align: 'left' });
    doc.moveDown(0.4);

    doc.fontSize(10).font('Helvetica').fillColor('#333');
    const bodyOpts = { align: 'justify', lineGap: 2, paragraphGap: 4 };

    doc.text('To Whom It May Concern,', { align: 'left' });
    doc.moveDown(0.2);

    doc.text(
      `I am pleased to recommend ${studentName}, who has successfully completed the ${itemLabel.toLowerCase()} titled "${itemName}" under my supervision at the Department of Electronics and Computer Engineering, Pulchowk Campus, Tribhuvan University.`,
      bodyOpts
    );

    if (content) {
      doc.text(content, bodyOpts);
    }

    doc.text(
      'I recommend this student without reservation and am confident that they will excel in their future academic and professional endeavors.',
      bodyOpts
    );

    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════
    //  SIGNATURE BLOCK — compact, side by side
    // ═══════════════════════════════════════════════════
    const sigY = doc.y + 4;
    const colLeft = doc.page.margins.left;

    // Signature line + name
    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text('____________________________', colLeft, sigY);
    const fullName = supervisorDesignation
      ? `${supervisorDesignation} ${supervisorName}`
      : supervisorName;
    doc.fontSize(9).font('Helvetica-Bold')
      .text(fullName, colLeft, sigY + 14);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(supervisorDesignation || 'Supervisor', colLeft, sigY + 26)
      .text('Department of ECE, Pulchowk Campus', colLeft, sigY + 36);

    // Right column: Date + Seal + Countersignature
    const colRight = colLeft + 310;
    doc.fontSize(8.5).font('Helvetica').fillColor('#555')
      .text(`Date: ${date}`, colRight, sigY + 14, { align: 'right' })
      .text('(Seal)', colRight, sigY + 26, { align: 'right', opacity: 0.5 });

    doc.moveDown(0.2);
    const hodY = Math.max(sigY + 60, doc.y + 4);
    doc.fontSize(7).font('Helvetica').fillColor('#999')
      .text('____________________________', colRight, hodY, { align: 'right' });
    doc.text('HOD / Coordinator (Countersignature)', colRight, hodY + 12, { align: 'right', opacity: 0.6 });

    // ═══════════════════════════════════════════════════
    //  FOOTER
    // ═══════════════════════════════════════════════════
    doc.fontSize(6).font('Helvetica').fillColor('#ccc')
      .text(
        `Doc: ${refNo} | TPMS · ECE Dept., Pulchowk Campus — System-generated document`,
        doc.page.margins.left, doc.page.height - 28,
        { width: pageWidth, align: 'center' }
      );

    doc.end();
  });
}

module.exports = { generateRecommendationPDF };
