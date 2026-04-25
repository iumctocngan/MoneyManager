import { aiService } from '../services/aiService.js';
import * as aiAgent from '../services/aiAgent.js';
import * as chatService from '../services/chat.service.js';
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

export const chat = async (req, res) => {
  try {
    const rawMessage = typeof req.body.message === 'string' ? req.body.message : '';
    const message = rawMessage.trim();
    let { sessionId } = req.body;
    const userId = req.user.id;

    if (!message) {
      return sendError(res, 'Message is required', 400);
    }

    // 1. Create session if it doesn't exist
    if (!sessionId) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      sessionId = await chatService.createSession(userId, title);
    }

    // 2. Save User message
    const fileUri = req.file ? req.file.path : null;
    await chatService.saveMessage(userId, sessionId, 'user', message, fileUri);

    // 3. Get AI Response
    const extraContext = {};
    if (req.file) {
      if (req.file.mimetype.startsWith('audio/')) {
        extraContext.audioFilePath = req.file.path;
      } else if (req.file.mimetype.startsWith('image/')) {
        extraContext.imageFilePath = req.file.path;
      }
    }

    const response = await aiAgent.chatWithAI(userId, sessionId, message, extraContext);

    // 4. Save AI Response
    await chatService.saveMessage(userId, sessionId, 'assistant', response);

    sendSuccess(res, { response, sessionId });
  } catch (error) {
    console.error('AI Chat error:', error);
    sendError(res, error.message || 'Error communicating with AI', error.statusCode || 500);
  }
};

export const listSessions = async (req, res) => {
  try {
    const sessions = await chatService.listSessions(req.user.id);
    sendSuccess(res, sessions);
  } catch (error) {
    sendError(res, error.message);
  }
};

export const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await chatService.getSessionMessages(req.user.id, sessionId);
    sendSuccess(res, messages);
  } catch (error) {
    sendError(res, error.message, error.statusCode || 500);
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await chatService.deleteSession(req.user.id, sessionId);
    sendSuccess(res, { success: true });
  } catch (error) {
    sendError(res, error.message, error.statusCode || 500);
  }
};
