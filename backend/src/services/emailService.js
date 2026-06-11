const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@university.edu';

function buildUniversityTemplate(title, contentLines) {
  const content = contentLines.map(line => `<p style="margin:6px 0;color:#333;font-size:14px;">${line}</p>`).join('');
  return `
    <div style="font-family:Georgia,serif;max-width:600px;margin:auto;border:1px solid #ccc;">
      <div style="background:#1a237e;padding:20px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">University Thesis Management System</h1>
      </div>
      <div style="padding:25px;background:#fff;">
        <h2 style="color:#1a237e;font-size:18px;border-bottom:2px solid #1a237e;padding-bottom:8px;">${title}</h2>
        ${content}
        <p style="margin-top:20px;color:#888;font-size:12px;border-top:1px solid #ddd;padding-top:10px;">
          This is an automated notification from the University Thesis Management System. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
}

async function sendEmail({ to, subject, title, contentLines }) {
  try {
    const html = buildUniversityTemplate(title, contentLines);
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email send failed:', error.message);
  }
}

async function notifySupervisorAssigned(supervisorEmail, supervisorName, groupName, projectTitle, members) {
  await sendEmail({
    to: supervisorEmail,
    subject: `Supervisor Assignment: ${groupName}`,
    title: 'Supervisor Assignment Notification',
    contentLines: [
      `Dear ${supervisorName},`,
      `You have been assigned as the supervisor for the following project group:`,
      `<strong>Group:</strong> ${groupName}`,
      `<strong>Project Title:</strong> ${projectTitle}`,
      `<strong>Members:</strong> ${members.map(m => `${m.firstName} ${m.lastName} (${m.rollNumber})`).join(', ')}`,
      `Please log in to the system to view details and start evaluations.`,
    ],
  });
}

async function notifyStudentsSupervisorAssigned(studentEmails, groupName, projectTitle, supervisorName) {
  await sendEmail({
    to: studentEmails,
    subject: `Supervisor Assigned to ${groupName}`,
    title: 'Supervisor Assignment Notification',
    contentLines: [
      `Dear Student,`,
      `Your project group <strong>${groupName}</strong> has been assigned a supervisor.`,
      `<strong>Project Title:</strong> ${projectTitle}`,
      `<strong>Supervisor:</strong> ${supervisorName}`,
      `Please coordinate with your supervisor for further guidance.`,
    ],
  });
}

async function notifyFeedbackSubmitted(studentEmails, groupName, projectTitle, supervisorName, stage, feedback) {
  await sendEmail({
    to: studentEmails,
    subject: `Feedback Submitted - ${groupName} (${stage})`,
    title: 'Supervisor Feedback Notification',
    contentLines: [
      `Dear Student,`,
      `Your supervisor has submitted feedback for <strong>${groupName}</strong>.`,
      `<strong>Project Title:</strong> ${projectTitle}`,
      `<strong>Supervisor:</strong> ${supervisorName}`,
      `<strong>Stage:</strong> ${stage.replace(/_/g, ' ')}`,
      `<strong>Feedback:</strong> ${feedback}`,
      `Please review and address the feedback.`,
    ],
  });
}

async function notifyEvaluationSubmitted(studentEmails, groupName, projectTitle, supervisorName, stage, marks) {
  await sendEmail({
    to: studentEmails,
    subject: `Evaluation Marks - ${groupName} (${stage})`,
    title: 'Evaluation Marks Notification',
    contentLines: [
      `Dear Student,`,
      `Your supervisor has submitted evaluation marks for <strong>${groupName}</strong>.`,
      `<strong>Project Title:</strong> ${projectTitle}`,
      `<strong>Supervisor:</strong> ${supervisorName}`,
      `<strong>Stage:</strong> ${stage.replace(/_/g, ' ')}`,
      `<strong>Marks:</strong> ${marks}`,
      `Please log in to view the detailed breakdown.`,
    ],
  });
}

async function notifyRecommendationIssued(studentEmails, studentName, projectTitle, supervisorName) {
  await sendEmail({
    to: studentEmails,
    subject: `Letter of Recommendation - ${projectTitle}`,
    title: 'Letter of Recommendation Issued',
    contentLines: [
      `Dear ${studentName},`,
      `Your supervisor <strong>${supervisorName}</strong> has issued a Letter of Recommendation for your project <strong>${projectTitle}</strong>.`,
      `Please download the letter from the system.`,
    ],
  });
}

module.exports = {
  sendEmail,
  notifySupervisorAssigned,
  notifyStudentsSupervisorAssigned,
  notifyFeedbackSubmitted,
  notifyEvaluationSubmitted,
  notifyRecommendationIssued,
};
