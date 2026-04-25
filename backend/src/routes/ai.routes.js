import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import * as aiController from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = express.Router();

// Setup multer to store files in the OS temp directory with extensions preserved
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.post('/transcribe', requireAuth, upload.single('audio'), aiController.transcribe);
router.post('/scan-receipt', requireAuth, upload.single('image'), aiController.scanReceipt);
router.post('/chat', requireAuth, upload.single('file'), aiController.chat);

router.get('/sessions', requireAuth, aiController.listSessions);
router.get('/sessions/:sessionId/messages', requireAuth, aiController.getMessages);
router.delete('/sessions/:sessionId', requireAuth, aiController.deleteSession);

export default router;
