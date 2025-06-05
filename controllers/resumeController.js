// backend/controllers/resumeController.js

import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler           from "../middlewares/error.js";
import Tesseract              from "tesseract.js";
import { Configuration, OpenAIApi } from "openai";

// Initialize OpenAI client
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * @route   POST /api/v1/resume/analyze
 * @desc    Accept a JPG/PNG résumé image, run OCR, then send the text to ChatGPT.
 * @access  Private (Job Seeker only)
 */
export const analyzeResume = catchAsyncErrors(async (req, res, next) => {
  // 1) Only “Job Seeker” can analyze résumés
  if (!req.user || req.user.role !== "Job Seeker") {
    return next(new ErrorHandler("Only job seekers can analyze résumés.", 403));
  }

  // 2) Ensure a file was uploaded
  if (!req.file) {
    return next(new ErrorHandler("Please upload a résumé image (JPG/PNG).", 400));
  }

  // 3) Run Tesseract OCR on the image buffer
  let resumeText;
  try {
    const ocrResult = await Tesseract.recognize(req.file.buffer, "eng", {
      logger: () => {} // Remove logs in production
    });
    resumeText = ocrResult.data.text.trim();
  } catch (ocrErr) {
    console.error("OCR error:", ocrErr);
    return next(new ErrorHandler("Failed to extract text from résumé.", 500));
  }

  if (!resumeText) {
    return next(
      new ErrorHandler("Could not read any text from the uploaded résumé.", 400)
    );
  }

  // 4) Build the prompt for ChatGPT
  const prompt = `
You are a professional career coach and résumé expert. A job seeker has uploaded their résumé text (extracted via OCR). Please do the following:
1) Assign a Resume Score (0–100) for formatting, clarity, relevance, and keyword usage.
2) List up to 5 specific improvement points (bullet-style) to make the résumé stronger.
3) Provide a short general feedback paragraph summarizing the résumé’s strengths/weaknesses.
4) Return only a JSON object with keys:
   {
     "score": <integer 0–100>,
     "improvementPoints": [ /* up to 5 strings */ ],
     "generalFeedback": "<one-paragraph>"
   }

Here is the résumé text:
"""
${resumeText}
"""
`.trim();

  // 5) Call OpenAI’s Chat Completion API
  let aiResponse;
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", // or "gpt-4" if you have access
      messages: [
        { role: "system", content: "You are an expert résumé analyzer." },
        { role: "user",   content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.3,
    });
    aiResponse = completion.data.choices[0].message.content.trim();
  } catch (openaiErr) {
    console.error("OpenAI error:", openaiErr);
    return next(new ErrorHandler("Failed to analyze résumé with AI.", 500));
  }

  // 6) Parse the JSON response from GPT
  let parsed;
  try {
    parsed = JSON.parse(aiResponse);
  } catch (parseErr) {
    console.error("Failed to parse JSON from AI:", parseErr);
    console.error("AI returned:", aiResponse);
    return next(new ErrorHandler("AI did not return valid JSON.", 500));
  }

  // 7) Return the JSON object to the frontend
  return res.status(200).json({
    success: true,
    analysis: parsed
  });
});
