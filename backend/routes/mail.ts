import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();

const mailrouter = express.Router();
mailrouter.use(express.json());

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.warn(
    "GMAIL_USER and GMAIL_APP_PASSWORD are not set. Mail sending will fail until they are provided in backend/.env.",
  );
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ===============================
// Send Mail Function
// ===============================

const sendMail = async (
  to: string,
  subject: string,
  text: string
) => {
  try {
    const info = await transporter.sendMail({
      from: `"My App" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html: `
    <!DOCTYPE html>
    <html>
      <body>
        <h2>${subject}</h2>
        <p>${text}</p>
      </body>
    </html>
  `,
    });

    console.log("📧 Mail sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ Mail error:", error);
    throw error;
  }
};

// ===============================
// Send Mail API
// ===============================

mailrouter.post("/send-mail", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    // Validation
    if (!to || !subject || !text) {
      return res.status(400).json({
        success: false,
        message: "to, subject and text are required",
      });
    }

    console.log("📨 Sending email to:", to);
    console.log("📝 Subject:", subject);

    // Send email
    const result = await sendMail(to, subject, text);

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("❌ API Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
});

export default mailrouter;