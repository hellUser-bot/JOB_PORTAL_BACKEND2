import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Application } from "../models/applicationSchema.js";
import { Job } from "../models/jobSchema.js";
import cloudinary from "cloudinary";

// ─── Job Seeker posts application ───────────────────────────────────────
export const postApplication = catchAsyncErrors(async (req, res, next) => {
  // only Job Seekers
  if (req.user.role !== "Job Seeker") {
    return next(new ErrorHandler("Only job seekers can apply.", 403));
  }

  const { jobId, name, email, coverLetter, phone, address } = req.body;
  if (!jobId) {
    return next(new ErrorHandler("Job ID is required", 400));
  }

  // 1) max 2 applications per same job
  const sameJobCount = await Application.countDocuments({
    "applicantID.user": req.user._id,
    job: jobId,
  });
  if (sameJobCount >= 10) {
    return next(
      new ErrorHandler("You can only apply to the same job twice.", 400)
    );
  }

  // 2) max 10 applications per 30-day window
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const monthlyCount = await Application.countDocuments({
    "applicantID.user": req.user._id,
    createdAt: { $gte: oneMonthAgo },
  });
  if (monthlyCount >= 10) {
    return next(
      new ErrorHandler("You can only apply to 10 jobs per month.", 400)
    );
  }

  // Resume upload checks (now includes PDF)
  if (!req.files || !req.files.resume) {
    return next(new ErrorHandler("Resume File Required!", 400));
  }
  const { resume } = req.files;
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf"    // ← PDF support added
  ];
  if (!allowed.includes(resume.mimetype)) {
    return next(
      new ErrorHandler(
        "Invalid file type. Please upload PNG, JPEG, WEBP or PDF.",
        400
      )
    );
  }

  // If it's a PDF, tell Cloudinary to treat it as raw
  const uploadOptions =
    resume.mimetype === "application/pdf"
      ? { resource_type: "raw" }
      : {};

  const uploadRes = await cloudinary.uploader.upload(
    resume.tempFilePath,
    uploadOptions
  );

  if (!uploadRes || uploadRes.error) {
    console.error("Cloudinary Error:", uploadRes.error);
    return next(new ErrorHandler("Failed to upload Resume", 500));
  }

  // Verify job exists
  const jobDetails = await Job.findById(jobId);
  if (!jobDetails) {
    return next(new ErrorHandler("Job not found!", 404));
  }

  // Create application
  const application = await Application.create({
    job: jobId,
    name,
    email,
    coverLetter,
    phone,
    address,
    applicantID: { user: req.user._id, role: "Job Seeker" },
    employerID: { user: jobDetails.postedBy, role: "Employer" },
    resume: {
      public_id: uploadRes.public_id,
      url: uploadRes.secure_url,
    },
  });

  res.status(200).json({
    success: true,
    message: "Application Submitted!",
    application,
  });
});

// ─── Employer fetches their applications (hides soft‐deleted) ─────────
export const employerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user.role !== "Employer")
      return next(new ErrorHandler("Only employers can view.", 403));

    const applications = await Application.find({
      "employerID.user": req.user._id,
      employerDeleted: false,
    })
      .populate({
        path: "applicantID.user",
        select: "name email phone address skills experience education",
      })
      .populate({
        path: "job",
        select: "title description category",
      });

    res.status(200).json({ success: true, applications });
  }
);

// ─── Employer soft‐deletes only rejected applications ────────────────
export const employerDeleteApplication = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user.role !== "Employer") {
      return next(new ErrorHandler("Only employers can delete here.", 403));
    }
    const application = await Application.findById(req.params.id);
    if (!application) {
      return next(new ErrorHandler("Application not found!", 404));
    }
    if (
      application.employerID.user.toString() !== req.user._id.toString()
    ) {
      return next(new ErrorHandler("Not authorized.", 403));
    }
    if (application.status !== "Rejected") {
      return next(
        new ErrorHandler("Can only delete rejected applications.", 400)
      );
    }

    // Soft delete (so seeker still sees it)
    application.employerDeleted = true;
    await application.save();

    res.status(200).json({
      success: true,
      message: "Application removed from your view.",
    });
  }
);

// ─── Job Seeker fetches all (soft‐deleted unaffected) ─────────────────
export const jobseekerGetAllApplications = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user.role !== "Job Seeker")
      return next(new ErrorHandler("Only seekers can view.", 403));

    const applications = await Application.find({
      "applicantID.user": req.user._id,
    })
      .populate({
        path: "applicantID.user",
        select: "name email phone address skills experience education",
      })
      .populate({
        path: "job",
        select: "title description category",
      });

    res.status(200).json({ success: true, applications });
  }
);

// ─── Job Seeker fully deletes (removes for everyone) ──────────────────
export const jobseekerDeleteApplication = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user.role !== "Job Seeker") {
      return next(new ErrorHandler("Only seekers can delete.", 403));
    }
    const application = await Application.findById(req.params.id);
    if (!application) {
      return next(new ErrorHandler("Application not found!", 404));
    }
    await application.deleteOne();
    res.status(200).json({ success: true, message: "Application Deleted!" });
  }
);

// ─── Employer accepts/rejects with optional reply ─────────────────────
export const updateApplicationStatus = catchAsyncErrors(
  async (req, res, next) => {
    if (req.user.role !== "Employer") {
      return next(new ErrorHandler("Only employers can update.", 403));
    }
    const application = await Application.findById(req.params.id);
    if (!application) {
      return next(new ErrorHandler("Application not found!", 404));
    }
    if (application.employerID.user.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("Not authorized.", 403));
    }
    const { status, reply } = req.body;
    application.status = status;
    application.reply = reply || "";
    await application.save();
    res
      .status(200)
      .json({ success: true, message: `Application ${status.toLowerCase()}.`, application });
  }
);
