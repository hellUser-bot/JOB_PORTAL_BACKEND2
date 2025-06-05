import { config } from "dotenv";
import app from "./app.js";
import cloudinary from "cloudinary";

// Load environment variables
config({ path: "./config/config.env" });
console.log("Loaded SENDGRID_API_KEY:", process.env.SENDGRID_API_KEY?.slice(0,3));

// ✅ Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRET,
});

// ✅ Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
