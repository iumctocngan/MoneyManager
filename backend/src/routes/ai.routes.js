import express from 'express';
import multer from 'multer';
import os from 'os';
import * as aiController from '../controllers/ai.controller.js';

const router = express.Router();

// Setup multer to store files in the OS temp directory
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.post('/transcribe', upload.single('audio'), aiController.transcribe);

export default router;
