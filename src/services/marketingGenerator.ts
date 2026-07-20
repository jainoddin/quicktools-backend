import { runWithFailover } from './geminiClient';
import { User } from '../models/user.model';
import { sendMarketingEmail } from './emailService';
import fs from 'fs';
import path from 'path';

// List of available tools to pick from
const toolsList = [
  { name: 'AI Resume Builder', url: 'https://quicktools.space/tools/ai-resume-builder' },
  { name: 'AI Image Generator', url: 'https://quicktools.space/tools/ai-image-generator' },
  { name: 'Background Remover', url: 'https://quicktools.space/tools/background-remover' },
  { name: 'AI Grammar Checker', url: 'https://quicktools.space/tools/ai-grammar-checker' },
  { name: 'AI Video Generator', url: 'https://quicktools.space/tools/ai-video-generator' },
  { name: 'AI Business Name Generator', url: 'https://quicktools.space/tools/ai-business-name-generator' },
  { name: 'AI Presentation Generator', url: 'https://quicktools.space/tools/ai-presentation-generator' },
  { name: 'AI Logo Maker', url: 'https://quicktools.space/tools/ai-logo-maker' },
  { name: 'Code Explainer', url: 'https://quicktools.space/tools/ai-code-explainer' },
  { name: 'SQL Query Generator', url: 'https://quicktools.space/tools/ai-sql-generator' }
];

export async function generateAndSendMarketingEmail() {
  try {
    // 1. Pick a random tool
    const tool = toolsList[Math.floor(Math.random() * toolsList.length)];

    // 2. Fetch all active users (ensure email is present)
    const users = await User.find({ email: { $exists: true, $ne: '' } }).select('email');
    const emails = users.map(u => u.email).filter(Boolean) as string[];

    if (emails.length === 0) {
      console.log('No users found to send marketing email.');
      return;
    }

    // 3. Generate Email Content using Gemini
    const emailPrompt = `
      You are the Marketing Director for QuickTools AI.
      Write a short, exciting, and professional email newsletter promoting our tool: "${tool.name}".
      The email must include:
      - A catchy, friendly greeting.
      - A brief explanation of what "${tool.name}" does and how it saves time or boosts productivity.
      - A strong Call to Action (CTA) telling them to click the link below to try it for free.
      - A signature from "The QuickTools AI Team".
      
      Format the output as a JSON object with two keys:
      {
        "subject": "The catchy email subject line (include an emoji)",
        "contentHTML": "The full HTML body of the email. Use inline CSS for styling. Make it look beautiful, clean, and modern. Use colors like #4F46E5 (Indigo) for buttons or highlights. DO NOT include the actual <a> link yet, just put a placeholder {{LINK}} where the CTA button should be."
      }
      
      Ensure the output is ONLY valid JSON, without any markdown formatting blocks.
    `;

    const generatedText = await runWithFailover(async (genAI) => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: 'application/json' } });
      const result = await model.generateContent(emailPrompt);
      return result.response.text();
    });

    const parsedEmail = JSON.parse(generatedText);
    let subject = parsedEmail.subject;
    let contentHTML = parsedEmail.contentHTML;

    // 4. Inject the actual link into the HTML
    const buttonHtml = `<a href="${tool.url}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">Try ${tool.name} Now</a>`;
    
    if (contentHTML.includes('{{LINK}}')) {
      contentHTML = contentHTML.replace('{{LINK}}', buttonHtml);
    } else {
      contentHTML += `<br/>${buttonHtml}`;
    }

    // 5. Send the email
    console.log(`Sending marketing email: "${subject}" to ${emails.length} users about ${tool.name}`);
    await sendMarketingEmail(emails, subject, contentHTML);
    console.log(`✅ Successfully sent daily marketing email.`);
    
  } catch (error) {
    console.error('❌ Failed to generate or send marketing email:', error);
  }
}
