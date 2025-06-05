import jwt from "jsonwebtoken";

export const sendToken = (user, statusCode, res, message) => {
  // Generate the JWT token manually to ensure correctness
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d", // Default to 7 days if not set
  });

  // Ensure COOKIE_EXPIRE is a valid number
  const cookieExpire = parseInt(process.env.COOKIE_EXPIRE, 10) || 7;

  const options = {
    expires: new Date(Date.now() + cookieExpire * 24 * 60 * 60 * 1000),
    httpOnly: true, // Secure against XSS attacks
    secure: process.env.NODE_ENV === "production", // Secure in production
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
  };

  res.status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user,
      message,
      token,
    });
};
