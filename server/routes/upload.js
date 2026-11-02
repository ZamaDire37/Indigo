const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { authRequired } = require('../middleware/auth');

// Storage for cover/avatar images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type === 'avatar' ? 'avatars' : 'covers';
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', type);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, unique);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Memory storage for documents for parsing
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Upload image route
router.post('/image', authRequired, uploadImage.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const type = req.query.type === 'avatar' ? 'avatars' : 'covers';
    const relativeUrl = `/uploads/${type}/${req.file.filename}`;
    res.json({
      message: 'Image uploaded successfully',
      url: relativeUrl
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Parse & Extract Document (.docx, .doc, .pdf, .txt)
router.post('/document', authRequired, documentUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided' });
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const guessedTitle = path.basename(originalName, ext).replace(/[_-]/g, ' ');

    let extractedText = '';
    let extractedHtml = '';

    if (ext === '.docx' || ext === '.doc') {
      try {
        const textResult = await mammoth.extractRawText({ buffer: req.file.buffer });
        const htmlResult = await mammoth.convertToHtml({ buffer: req.file.buffer });
        extractedText = textResult.value || '';
        extractedHtml = htmlResult.value || '';
      } catch (err) {
        console.warn('Mammoth docx parse warning:', err.message);
        // Fallback to text buffer
        extractedText = req.file.buffer.toString('utf-8').replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, '');
      }
    } else if (ext === '.pdf') {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text || '';
      } catch (err) {
        console.error('PDF parsing error:', err);
        return res.status(400).json({ error: 'Failed to parse PDF document' });
      }
    } else if (ext === '.txt' || ext === '.md') {
      extractedText = req.file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload .docx, .doc, .pdf, or .txt' });
    }

    // Clean up whitespace while preserving paragraphs
    const cleanContent = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    res.json({
      message: 'Document successfully parsed and ready for editing',
      title: guessedTitle,
      filename: originalName,
      content: cleanContent,
      htmlContent: extractedHtml,
      characterCount: cleanContent.length,
      wordCount: cleanContent ? cleanContent.split(/\s+/).filter(Boolean).length : 0
    });
  } catch (err) {
    console.error('Document parsing error:', err);
    res.status(500).json({ error: 'Failed to process document file' });
  }
});

module.exports = router;
