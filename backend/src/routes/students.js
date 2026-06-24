const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type === 'thesis' ? 'theses' : 'groups';
    const dir = path.join(__dirname, '../../storage', type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

router.get('/groups', authenticate, authorize('STUDENT'), studentController.getMyGroups);
router.get('/theses', authenticate, authorize('STUDENT'), studentController.getMyTheses);
router.get('/groups/:id', authenticate, authorize('STUDENT'), studentController.getGroupById);
router.get('/theses/:id', authenticate, authorize('STUDENT'), studentController.getThesisById);
router.get('/notifications', authenticate, authorize('STUDENT'), studentController.getMyNotifications);
router.put('/notifications/:id/read', authenticate, authorize('STUDENT'), studentController.markNotificationRead);
router.post('/upload', authenticate, authorize('STUDENT'), (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, studentController.uploadDocument);

module.exports = router;
