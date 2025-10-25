const express = require('express');
const multer = require('multer');
const { supabaseService } = require('../config/supabase');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

// Upload single file to Supabase Storage
router.post('/single', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!supabaseService.isAvailable()) {
      return res.status(503).json({ error: 'Supabase storage not available' });
    }

    const { folder = 'general' } = req.body;
    const userId = req.user.userId;
    const timestamp = Date.now();
    const fileName = `${folder}/${userId}/${timestamp}-${req.file.originalname}`;

    // Upload to Supabase Storage
    const uploadData = await supabaseService.uploadFile(
      process.env.SUPABASE_STORAGE_BUCKET || 'wid-uploads',
      fileName,
      req.file.buffer,
      {
        contentType: req.file.mimetype,
        cacheControl: '3600',
      }
    );

    // Get public URL
    const publicUrl = supabaseService.getFileUrl(
      process.env.SUPABASE_STORAGE_BUCKET || 'wid-uploads',
      fileName
    );

    res.json({
      message: 'File uploaded successfully',
      file: {
        id: uploadData.id,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        url: publicUrl,
        path: uploadData.path,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

// Upload multiple files
router.post('/multiple', auth, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!supabaseService.isAvailable()) {
      return res.status(503).json({ error: 'Supabase storage not available' });
    }

    const { folder = 'general' } = req.body;
    const userId = req.user.userId;
    const uploadedFiles = [];

    for (const file of req.files) {
      const timestamp = Date.now();
      const fileName = `${folder}/${userId}/${timestamp}-${file.originalname}`;

      try {
        const uploadData = await supabaseService.uploadFile(
          process.env.SUPABASE_STORAGE_BUCKET || 'wid-uploads',
          fileName,
          file.buffer,
          {
            contentType: file.mimetype,
            cacheControl: '3600',
          }
        );

        const publicUrl = supabaseService.getFileUrl(
          process.env.SUPABASE_STORAGE_BUCKET || 'wid-uploads',
          fileName
        );

        uploadedFiles.push({
          id: uploadData.id,
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
          url: publicUrl,
          path: uploadData.path,
        });
      } catch (uploadError) {
        console.error(`Failed to upload ${file.originalname}:`, uploadError);
        uploadedFiles.push({
          name: file.originalname,
          error: uploadError.message,
        });
      }
    }

    res.json({
      message: 'File upload completed',
      files: uploadedFiles,
      successful: uploadedFiles.filter(f => !f.error).length,
      failed: uploadedFiles.filter(f => f.error).length,
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

// Upload profile picture
router.post('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!supabaseService.isAvailable()) {
      return res.status(503).json({ error: 'Supabase storage not available' });
    }

    const userId = req.user.userId;
    const fileName = `profiles/${userId}/avatar-${Date.now()}.${req.file.originalname.split('.').pop()}`;

    // Upload to Supabase Storage
    const uploadData = await supabaseService.uploadFile(
      process.env.SUPABASE_STORAGE_BUCKET || 'wid-uploads',
      fileName,
      req.file.buffer,
      {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true, // Replace existing avatar
      }
    );

    const publicUrl = supabaseService.getFileUrl(
      process.env.SUPABASE_STORAGE_BUCKET || 'wid-uploads',
      fileName
    );

    res.json({
      message: 'Profile picture uploaded successfully',
      avatar: {
        id: uploadData.id,
        url: publicUrl,
        path: uploadData.path,
      },
    });
  } catch (error) {
    console.error('Profile upload error:', error);
    res.status(500).json({ error: 'Profile picture upload failed', details: error.message });
  }
});

// Get upload info
router.get('/', (req, res) => {
  res.json({
    message: 'WID Uganda File Upload Service',
    storage: supabaseService.isAvailable() ? 'Supabase Storage' : 'Not Available',
    endpoints: {
      single: 'POST /uploads/single',
      multiple: 'POST /uploads/multiple',
      profile: 'POST /uploads/profile',
    },
    limits: {
      fileSize: '10MB',
      maxFiles: 5,
      allowedTypes: [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    },
  });
});

module.exports = router;