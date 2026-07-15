import 'dotenv/config';
import { generateToolCode } from './services/gemini.service';

async function run() {
  console.log("Generating code...");
  try {
    const result = await generateToolCode({
      prompt: "gaming desins",
      language: "React",
      framework: "Tailwind CSS",
      codeType: "Frontend (Web)"
    });
    console.log("Success!");
    console.log("HTML length:", result.html.length);
    console.log("CSS length:", result.css.length);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
