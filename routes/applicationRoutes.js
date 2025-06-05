import express from "express";
import {
  employerGetAllApplications,
  jobseekerDeleteApplication,
  jobseekerGetAllApplications,
  postApplication,
  updateApplicationStatus,      // existing
  employerDeleteApplication,    // ← new
} from "../controllers/applicationController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/post", isAuthenticated, postApplication);
router.get("/employer/getall", isAuthenticated, employerGetAllApplications);
router.get("/jobseeker/getall", isAuthenticated, jobseekerGetAllApplications);
router.delete("/delete/:id", isAuthenticated, jobseekerDeleteApplication);

// existing: accept/reject
router.put("/update/:id", isAuthenticated, updateApplicationStatus);

// ─── New: delete rejected applications by employer ────────────────────
router.delete(
  "/employer/delete/:id",
  isAuthenticated,
  employerDeleteApplication
);

export default router;
