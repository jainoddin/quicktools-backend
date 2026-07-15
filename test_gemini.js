require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEYS.split(',')[4];
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: { temperature: 0.3 } });
  
  const prompt = `You are a Senior Full-Stack Developer and Expert AI Code Generator.
Generate a complete, high-quality, and working code implementation based on the user request.

Required specifications:
- Programming Language: React
- Framework/Library: React
- Application Type: Frontend (Web)

Output Format:
DO NOT RETURN JSON. You must return your response using Markdown code blocks.
Use the following format exactly:

\`\`\`html
<!-- The HTML code, or the primary codebase/script if this is a non-web language (like Python, SQL, C++) -->
\`\`\`

\`\`\`css
/* The CSS code or stylesheet configurations (if applicable, otherwise leave block empty) */
\`\`\`

\`\`\`javascript
// The JavaScript code or client logic code (if applicable, otherwise leave block empty)
\`\`\`

\`\`\`explanation
- A list of 3-5 concise bullet points explaining what the code accomplishes and how to run it.
\`\`\`

User Request:
web page desin for pet`;

  const result = await model.generateContent(prompt);
  console.log("RESPONSE:\n", result.response.text());
}
test();
