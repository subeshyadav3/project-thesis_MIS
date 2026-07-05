const puppeteer = require('puppeteer-core');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Test</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; color: #000; font-size: 12px; line-height: 1.4; margin: 0; padding: 0; }
  table { border-color: #000; }
  td, th { border-color: #000; vertical-align: top; }
</style></head><body>
  <div style="page-break-after:always;">
    <div style="text-align:center;"><div style="font-weight:700;">TRIBHUVAN UNIVERSITY</div><div style="font-weight:700;">INSTITUTE OF ENGINEERING</div><div style="font-weight:700;">PULCHOWK CAMPUS</div></div>
    <div style="font-weight:700;text-align:center;">Mid-Term Evaluation Form for Thesis Program</div>
    <div style="text-align:center;">(to be filled by supervisor)</div>
    <div><strong>Credit: 16 | Full Marks: 100</strong></div>
    <table style="width:100%;font-size:12px;" cellpadding="2"><tr><td><strong>Title:</strong></td><td>Test</td></tr></table>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;" border="1" cellpadding="4">
      <thead><tr><th>S.No.</th><th>Marking Parameters</th><th>Full Marks</th><th>Marks Obtained</th><th>Remarks</th></tr></thead>
      <tbody><tr><td>1</td><td>Regularity of works</td><td>20</td><td></td><td></td></tr></tbody>
    </table>
  </div>
  <div>Page 2 content</div>
</body></html>`;
(async () => {
  try {
    const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    console.log('PDF size:', pdf.length);
    console.log('Valid PDF:', pdf.slice(0,5).toString() === '%PDF-');
    await browser.close();
  } catch(e) { console.error('Error:', e.message, e.stack); }
})();
