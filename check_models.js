require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function check() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await res.json();
    if (data.models) {
       data.models.forEach(m => console.log(m.name));
    } else {
       console.log(data);
    }
  } catch(e) {
    console.error(e);
  }
}
check();
