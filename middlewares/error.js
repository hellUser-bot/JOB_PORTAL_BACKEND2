// ─── backend/middlewares/error.js ────────────────────────────────────────────

class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware = (err, req, res, next) => {
  // log full stack for 500 debugging
  console.error(err.stack);

  // copy incoming error, then override as needed
  let error = { ...err };
  error.message = err.message || "Internal Server Error";
  error.statusCode = err.statusCode || 500;

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    error = new ErrorHandler(`Resource not found. Invalid ${err.path}`, 400);
  }
  // Duplicate key
  if (err.code === 11000) {
    error = new ErrorHandler(
      `Duplicate field entered: ${Object.keys(err.keyValue)}`,
      400
    );
  }
  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new ErrorHandler("JWT is invalid, try again!", 400);
  }
  if (err.name === "TokenExpiredError") {
    error = new ErrorHandler("JWT expired, please login again!", 400);
  }

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
};

export default ErrorHandler;
