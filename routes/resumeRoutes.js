// backend/routes/resumeRoutes.js

import express from "express";
import multer  from "multer";
import { isAuthenticated } from "../middlewares/auth.js";
import { analyzeResume }   from "../controllers/resumeController.js";

const router = express.Router();

// Configure multer to store file in memory (req.file.buffer)
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowedMime = ["image/jpeg", "image/jpg", "image/png"];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG / PNG images are allowed"));
    }
  },
});

// POST /api/v1/resume/analyze
// - isAuthenticated: ensures req.user is set and valid
// - upload.single("resumeImage"): expects a single file under the key resumeImage
router.post(
  "/analyze",
  isAuthenticated,
  upload.single("resumeImage"),
  analyzeResume
);

export default router;
