import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import * as aiController from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = express.Router();

// Setup multer to store files in the OS temp directory with extensions preserved
// Dùng thư mục temp của hệ điều hành thay vì thư mục project để tránh tích tụ file rác
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  // Thêm timestamp + random suffix để tránh trùng tên file khi nhiều request đến đồng thời
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Giới hạn 10MB để tránh upload file quá lớn làm chậm server và tốn quota API
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// Nhận file audio (field name 'audio'), transcribe và trích xuất giao dịch
router.post('/transcribe', requireAuth, upload.single('audio'), aiController.transcribe);
// Nhận ảnh hóa đơn (field name 'image'), scan và trả về giao dịch đã phân tích
router.post('/scan-receipt', requireAuth, upload.single('image'), aiController.scanReceipt);
// Endpoint chat chính với AI agent; upload.single('file') để hỗ trợ gửi kèm file trong tương lai
router.post('/chat', requireAuth, upload.single('file'), aiController.chat);

// Quản lý phiên hội thoại: xem danh sách, xem tin nhắn, xóa session
router.get('/sessions', requireAuth, aiController.listSessions);
router.get('/sessions/:sessionId/messages', requireAuth, aiController.getMessages);
router.delete('/sessions/:sessionId', requireAuth, aiController.deleteSession);

export default router;
