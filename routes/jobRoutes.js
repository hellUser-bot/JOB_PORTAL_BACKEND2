import express from "express";
import {
  getAllJobs,
  getRecommendedJobs,
  postJob,
  getMyJobs,
  updateJob,
  deleteJob,
  getSingleJob,
  getJobCount,            // ← import the new handler
} from "../controllers/jobController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.get("/getall", getAllJobs);

// ─── NEW: count live jobs ───────────────────────────────────────────
router.get("/count", getJobCount);

router.get("/recommended", isAuthenticated, getRecommendedJobs);
router.post("/post", isAuthenticated, postJob);
router.get("/getmyjobs", isAuthenticated, getMyJobs);
router.put("/update/:id", isAuthenticated, updateJob);
router.delete("/delete/:id", isAuthenticated, deleteJob);
router.get("/:id", isAuthenticated, getSingleJob);

export default router;
