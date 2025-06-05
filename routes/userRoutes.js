import express from "express";

import {
  register,
  login,
  logout,
  getUser,
  verifyUser,
  updatePreferences,
  getUserCount,           // ← import the new handler
  forgotPassword,     // ← new
  resetPassword,   
  updateProfile
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", isAuthenticated, logout);
router.get("/getuser", isAuthenticated, getUser);
router.get("/verify/:token", verifyUser);

// Save preferred categories
router.put("/preferences", isAuthenticated, updatePreferences);

// ─── NEW: count users by role ───────────────────────────────────────
router.get("/count", isAuthenticated, getUserCount);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);

router.put("/profile", isAuthenticated, updateProfile);


export default router;
