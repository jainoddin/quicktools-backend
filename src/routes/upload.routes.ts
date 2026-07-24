import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadToR2 } from '../services/r2.service';
import { verifyAuth } from '../middlewares/auth.middleware';

const router = Router();

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// POST /api/upload/image
router.post('/image', verifyAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const { folder } = req.body; // Optional folder parameter (e.g. 'avatars', 'blog-covers')
    const folderName = folder || 'general';

    // Upload to R2
    const imageUrl = await uploadToR2(req.file.buffer, req.file.mimetype, req.file.originalname, folderName);

    res.json({
      success: true,
      data: {
        url: imageUrl,
      },
    });
  } catch (error: any) {
    console.error('Error uploading image to R2:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload image' });
  }
});

export default router;
