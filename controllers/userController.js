import crypto from "crypto";
import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/jwtToken.js";
import { sendMail } from "../utils/sendMail.js";

// Register new user and send verification email
export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return next(new ErrorHandler("Please fill full form!", 400));
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return next(new ErrorHandler("Email already registered!", 400));
  }

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role,
    verifyToken,
    verifyTokenExpiry,
  });

  const verifyURL = `${process.env.FRONTEND_URL}/verify/${verifyToken}`;
  const message = `Click here to verify your account: ${verifyURL}`;

  await sendMail(email, "Verify your Job Portal account", message);

  res.status(201).json({
    success: true,
    message: "User registered! Please check your email to verify.",
  });
});

// Login existing user
export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return next(new ErrorHandler("Please provide email, password and role.", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Email or Password.", 400));
  }

  if (!user.isVerified) {
    return next(new ErrorHandler("Please verify your email to login.", 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid Email or Password.", 400));
  }

  if (user.role !== role) {
    return next(new ErrorHandler("User with provided email not found!", 404));
  }

  sendToken(user, 200, res, "User Logged In!");
});

// Forgot Password
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ErrorHandler("Please provide your email.", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorHandler("User not found with that email.", 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
  const message = `You requested a password reset. Click here to set a new password:\n\n${resetURL}\n\nIf you didn't request this, please ignore.`;

  try {
    await sendMail(email, "Password Reset Request", message);
    res.status(200).json({
      success: true,
      message: "Password reset email sent. Check your inbox.",
    });
  } catch (err) {
    // rollback on failure
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler("Email could not be sent.", 500));
  }
});

// Reset Password
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword) {
    return next(new ErrorHandler("Please provide and confirm your new password.", 400));
  }
  if (password !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match.", 400));
  }

  const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired reset token.", 400));
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  sendToken(user, 200, res, "Password reset successful!");
});

// Logout user
export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
      secure: true, // Secure in production
      sameSite: "None"
    })
    .json({ success: true, message: "Logged Out Successfully." });
});

// Get current user
export const getUser = catchAsyncErrors((req, res, next) => {
  res.status(200).json({ success: true, user: req.user });
});

// Verify email token
export const verifyUser = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  const user = await User.findOne({
    verifyToken: token,
    verifyTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler("Invalid or expired token", 400));
  }

  user.isVerified = true;
  user.verifyToken = undefined;
  user.verifyTokenExpiry = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully! You may now login.",
  });
});

// Update preferred categories
export const updatePreferences = catchAsyncErrors(async (req, res, next) => {
  let { categories } = req.body;

  if (typeof categories === "string") {
    try {
      categories = JSON.parse(categories);
    } catch {
      categories = categories
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c);
    }
  }

  if (!Array.isArray(categories)) {
    return next(new ErrorHandler("preferredCategories must be an array.", 400));
  }

  const user = await User.findById(req.user._id);
  user.preferredCategories = categories;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Preferences updated.",
    preferredCategories: user.preferredCategories,
  });
});

// Get user count by role
export const getUserCount = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.query;
  if (!role) {
    return next(new ErrorHandler("Query parameter `role` is required", 400));
  }
  const count = await User.countDocuments({ role });
  res.status(200).json({ success: true, count });
});
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // Always update these:
  user.name    = req.body.name    ?? user.name;
  user.phone   = req.body.phone   ?? user.phone;
  user.address = req.body.address ?? user.address;

  if (user.role === "Job Seeker") {
    user.skills     = req.body.skills     ?? user.skills;
    user.experience = req.body.experience ?? user.experience;
    user.education  = req.body.education  ?? user.education;
  } else {
    user.companyName = req.body.companyName ?? user.companyName;
    user.industry    = req.body.industry    ?? user.industry;
    user.companySize = req.body.companySize ?? user.companySize;
  }

  await user.save();

  res.status(200).json({
    success: true,
    user, // return updated user object
  });
});
