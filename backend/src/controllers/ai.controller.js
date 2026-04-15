import { aiService } from '../services/aiService.js';

export const transcribe = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const audioFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    const transactions = await aiService.transcribeTransactions(audioFilePath, mimeType);
    res.json(transactions);
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ message: error.message || 'Error processing audio' });
  }
};

export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    const transactions = await aiService.scanReceipt(imageFilePath, mimeType);
    res.json(transactions);
  } catch (error) {
    console.error('Receipt scan error:', error);
    res.status(500).json({ message: error.message || 'Error scanning receipt' });
  }
};
