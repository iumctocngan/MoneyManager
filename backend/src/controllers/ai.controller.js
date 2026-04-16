import { aiService } from '../services/aiService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const transcribe = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No audio file provided', 400);
    }

    const audioFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    const transactions = await aiService.transcribeTransactions(audioFilePath, mimeType);
    sendSuccess(res, transactions);
  } catch (error) {
    console.error('Transcription error:', error);
    sendError(res, error.message || 'Error processing audio');
  }
};

export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    const imageFilePath = req.file.path;
    const mimeType = req.file.mimetype;

    const transactions = await aiService.scanReceipt(imageFilePath, mimeType);
    sendSuccess(res, transactions);
  } catch (error) {
    console.error('Receipt scan error:', error);
    sendError(res, error.message || 'Error scanning receipt');
  }
};
