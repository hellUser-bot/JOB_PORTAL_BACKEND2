import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your Name!"],
    minLength: [3, "Name must contain at least 3 Characters!"],
    maxLength: [30, "Name cannot exceed 30 Characters!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your Email!"],
    validate: [validator.isEmail, "Please provide a valid Email!"],
  },
  phone: {
    type: String,
    required: [true, "Please enter your Phone Number!"],
    validate: {
      validator: (v) => /^\d{10}$/.test(v),
      message: "Phone number must be exactly 10 digits.",
    },
  },
  password: {
    type: String,
    required: [true, "Please provide a Password!"],
    minLength: [8, "Password must contain at least 8 characters!"],
    maxLength: [32, "Password cannot exceed 32 characters!"],
    select: false,
  },
  role: {
    type: String,
    required: [true, "Please select a role"],
    enum: ["Job Seeker", "Employer"],
  },

  // ─── NEW PROFILE FIELDS ────────────────────────────────────────────────
  address:     { type: String, default: "" },
  skills:      { type: [String], default: [] },        // for Job Seekers
  experience:  { type: String, default: "" },
  education:   { type: String, default: "" },
  companyName: { type: String, default: "" },          // for Employers
  industry:    { type: String, default: "" },
  companySize: { type: String, default: "" },
  // ────────────────────────────────────────────────────────────────────────

  preferredCategories: {
    type: [String],
    default: [],
  },
  verifyToken:        String,
  verifyTokenExpiry:  Date,
  resetPasswordToken: String,
  resetPasswordExpiry:Date,
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password when modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password for login
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

export const User = mongoose.model("User", userSchema);
