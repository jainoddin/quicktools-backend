import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'helloquicktool@gmail.com',
    pass: process.env.EMAIL_PASS // User needs to set this in .env
  }
});

export const sendWelcomeEmail = async (toEmail: string) => {
  try {
    if (!process.env.EMAIL_PASS) {
      console.warn("EMAIL_PASS not set in .env. Skipping welcome email.");
      return false;
    }

    const info = await transporter.sendMail({
      from: `"QuickTools AI" <${process.env.EMAIL_USER || 'helloquicktool@gmail.com'}>`,
      to: toEmail,
      subject: "Welcome to QuickTools AI! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E5E7EB; border-radius: 10px;">
          <h2 style="color: #4F46E5; text-align: center;">Welcome to QuickTools!</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Hi there,<br/><br/>
            Thank you for subscribing to the QuickTools AI newsletter! 🚀
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            We're thrilled to have you with us. Every week, we'll send you the latest AI insights, top tools, and productivity hacks straight to your inbox.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Stay tuned for our upcoming content. If you have any questions, feel free to reply to this email.
          </p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
          <p style="color: #6B7280; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} QuickTools.ai. All rights reserved.
          </p>
        </div>
      `,
    });
    console.log("Welcome email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
};
