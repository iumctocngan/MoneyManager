import fs from 'fs';
import { aiService } from '../services/aiService.js';

export const transcribe = async (req, res) => {
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
};
