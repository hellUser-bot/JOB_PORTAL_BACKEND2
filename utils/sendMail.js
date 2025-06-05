// backend/utils/sendMail.js
import dotenv from "dotenv";
// adjust path if your config.env is at backend/config.env instead of backend/config/config.env
dotenv.config({ path: "./config/config.env"});

import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendMail = async (to, subject, text) => {
  try {
    await sgMail.send({
      to,
      from: process.env.SENDGRID_FROM,
      subject,
      text,
    });
  } catch (err) {
    console.error("SendGrid email error:", err);
    throw err;
  }
};
