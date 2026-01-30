const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { summarizeDocumentWithGemini } = require('../services/summarizerService');

// Multer setup for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf|doc|docx|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, or Text files are allowed!'));
    }
  }
});

// GET summarization page
router.get('/', (req, res) => {
  res.render('summarization', { user: req.user, summary: null });
});

// POST upload and summarize
router.post('/', upload.single('docFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.render('summarization', { user: req.user, summary: null, error: 'No file uploaded.' });
    }
    // Read file content
    let text = '';
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.txt') {
      text = fs.readFileSync(req.file.path, 'utf8');
    } else if (ext === '.pdf') {
      // Use pdf-parse
      const pdfParse = require('pdf-parse');
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (ext === '.doc' || ext === '.docx') {
      // Use mammoth for docx
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: req.file.path });
      text = result.value;
    } else {
      text = '';
    }
    // Remove uploaded file after reading
    fs.unlinkSync(req.file.path);
    if (!text) {
      return res.render('summarization', { user: req.user, summary: null, error: 'Could not extract text from file.' });
    }
    // Call Gemini API service
    const summary = await summarizeDocumentWithGemini(text);
    res.render('summarization', { user: req.user, summary });
  } catch (err) {
    console.error(err);
    res.render('summarization', { user: req.user, summary: null, error: err.message || 'Error summarizing document.' });
  }
});

module.exports = router;
