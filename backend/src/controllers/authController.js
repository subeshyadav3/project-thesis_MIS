const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const audit = require('../services/auditService');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

exports.login = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase();
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      audit.log({ action: 'LOGIN_FAILED', entity: 'User', details: `Failed login attempt for ${email}`, performedById: null });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      audit.log({ action: 'LOGIN_FAILED', entity: 'User', details: `Failed login attempt for ${email}`, performedById: null });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.active) {
      audit.log({ action: 'LOGIN_FAILED', entity: 'User', details: `Disabled account login attempt for ${email}`, performedById: null });
      return res.status(401).json({ error: 'Account is disabled' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    const { password: _, ...userData } = user;
    res.cookie('token', token, COOKIE_OPTS);
    audit.log({ action: 'LOGIN', entity: 'User', entityId: user.id, details: `${user.role} ${user.email} logged in`, performedById: user.id });
    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  if (req.user) {
    audit.log({ action: 'LOGOUT', entity: 'User', entityId: req.user.id, details: `${req.user.role} ${req.user.email} logged out`, performedById: req.user.id });
  }
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  const { password: _, ...userData } = req.user;
  res.json(userData);
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase();
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpires: expires } });
    audit.log({ action: 'FORGOT_PASSWORD', entity: 'User', entityId: user.id, details: `Password reset requested for ${email}`, performedById: user.id });

    // Try to send the reset email. The token is NEVER returned again in
    // production; for development we also include it so the testing flow works.
    const isProd = process.env.NODE_ENV === 'production';
    try {
      const emailService = require('../services/emailService');
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        title: 'Password Reset',
        contentLines: [
          `Dear ${user.firstName},`,
          `We received a request to reset your account password.`,
          `Click the link below to choose a new password (valid for 1 hour):`,
          `<a href="${resetUrl}">${resetUrl}</a>`,
          `If you didn't request this, you can safely ignore this email.`,
        ],
      });
    } catch (e) {
      console.error('forgotPassword email error:', e.message);
    }

    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
      ...(isProd ? {} : { resetToken: token }),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword, token } = req.body;
    if (!email || !newPassword || !token) return res.status(400).json({ success: false, error: 'Email, token, and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ success: false, error: 'Invalid reset request' });
    if (user.resetToken !== token) return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    if (!user.resetTokenExpires || new Date() > user.resetTokenExpires) return res.status(400).json({ success: false, error: 'Reset token has expired' });
    const hash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({ where: { id: user.id }, data: { password: hash, resetToken: null, resetTokenExpires: null } });
    audit.log({ action: 'RESET_PASSWORD', entity: 'User', entityId: updated.id, details: `Password reset for ${email} via forgot-password flow`, performedById: req.user?.id || null });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
    audit.log({ action: 'CHANGE_PASSWORD', entity: 'User', entityId: req.user.id, details: `${req.user.role} ${req.user.email} changed password`, performedById: req.user.id });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
