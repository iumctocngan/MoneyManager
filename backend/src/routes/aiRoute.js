import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { aiService } from '../services/aiService.js';

const router = express.Router();

// Setup multer to store files in the OS temp directory
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const audioFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    try {
      const transactions = await aiService.transcribeTransactions(audioFilePath, mimeType);
      res.json(transactions);
    } finally {
      // Clean up the temporary file after processing
      fs.unlink(audioFilePath, (err) => {
        if (err) console.error(`Failed to delete temp audio file: ${audioFilePath}`, err);
      });
    }
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ message: error.message || 'Error processing audio' });
  }
});

export default router;
