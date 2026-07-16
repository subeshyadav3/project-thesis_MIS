const PDFDocument = require('pdfkit');

function generateRecommendationPDF({ studentName, projectTitle, thesisTitle, supervisorName, supervisorDesignation, content, date, type }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 60, left: 70, right: 70 } });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const centerX = doc.page.margins.left + pageWidth / 2;

    // Header - University Letterhead
    doc.fontSize(16).font('Helvetica-Bold').text('Electronics and Computer Engineering', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text('Institute of Engineering, Tribhuvan University', { align: 'center' });
    doc.fontSize(9).fillColor('#666').text('Pulchowk Campus, Lalitpur, Nepal', { align: 'center' });
    doc.moveDown(0.3);

    // Horizontal line
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#1a237e').lineWidth(2).stroke();
    doc.moveDown(0.5);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a237e').text('LETTER OF RECOMMENDATION', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(`Date: ${date}`, { align: 'right' });
    doc.moveDown(1);

    // Body
    doc.fontSize(11).fillColor('#333');

    const itemLabel = type === 'thesis' ? 'Master Thesis' : 'Project';
    const itemName = type === 'thesis' ? thesisTitle : projectTitle;

    doc.font('Helvetica').text('To Whom It May Concern,', { align: 'left' });
    doc.moveDown(0.5);

    doc.text(`I am pleased to recommend ${studentName}, who has successfully completed their ${itemLabel.toLowerCase()} titled "${itemName}" under my supervision at the Department of Electronics and Computer Engineering, Institute of Engineering, Pulchowk Campus.`, { align: 'justify', lineGap: 4 });
    doc.moveDown(0.5);

    // Content body
    doc.text(content || 'Throughout the duration of this work, the student demonstrated exceptional dedication, analytical thinking, and technical competency. The project was executed with thorough methodology and the outcomes reflect a strong understanding of the subject matter.', { align: 'justify', lineGap: 4 });
    doc.moveDown(0.5);

    doc.text('I recommend this student without reservation and am confident that they will excel in their future academic and professional endeavors.', { align: 'justify', lineGap: 4 });
    doc.moveDown(1.5);

    // Signature block
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text('____________________________', { align: 'left' });
    doc.font('Helvetica').fontSize(10);
    const sigName = supervisorDesignation ? `${supervisorDesignation} ${supervisorName}` : supervisorName;
    doc.text(sigName, { align: 'left' });
    doc.text('Supervisor', { align: 'left' });
    doc.text('Department of Electronics and Computer Engineering', { align: 'left' });
    doc.text('Institute of Engineering, Pulchowk Campus', { align: 'left' });

    doc.end();
  });
}

module.exports = { generateRecommendationPDF };
