const fs = require('fs');

const geminiCases = `
    case 'gemini-introduction':
      return [
        { type: 'heading', title: 'What is Google Gemini?', level: 1, id: 'gemini-intro-h1' },
        { type: 'paragraph', content: 'Gemini is Google\\'s most capable and general AI model yet. Built from the ground up to be multimodal, it can generalize and seamlessly understand, operate across, and combine different types of information including text, code, audio, image, and video.', id: 'gemini-intro-p1' },
        { type: 'heading', title: 'Why use Gemini?', level: 2, id: 'gemini-intro-h2' },
        { type: 'list', items: ['**Deep Ecosystem Integration:** Works seamlessly inside Google Docs, Gmail, and Google Drive.', '**Multimodal Native:** It doesn\\'t just convert images to text; it understands images and audio natively.', '**Real-time Web Access:** Powered by Google Search, Gemini can pull the most up-to-date information from the web instantly.'], id: 'gemini-intro-list' },
        { type: 'callout', variant: 'success', title: 'The Gemini Family', content: 'Gemini comes in three sizes: Ultra (most capable), Pro (best balance of performance and scale), and Nano (most efficient, runs on-device).', id: 'gemini-intro-callout' }
      ];

    case 'gemini-create-account':
      return [
        { type: 'heading', title: 'Create a Gemini Account', level: 1, id: 'gemini-create-h1' },
        { type: 'paragraph', content: 'Since Gemini is a Google product, signing up is incredibly straightforward if you already use Google services.', id: 'gemini-create-p1' },
        { type: 'list', items: ['Go to gemini.google.com in your web browser.', 'Click "Sign In".', 'Log in with your existing Google or Gmail account.', 'Accept the terms of service, and you are ready to chat!'], id: 'gemini-create-list' },
        { type: 'callout', variant: 'info', title: 'Google Workspace Users', content: 'If you are using a company or school Google account, your administrator might need to enable Gemini access for your organization before you can log in.', id: 'gemini-create-callout' }
      ];

    case 'gemini-interface':
      return [
        { type: 'heading', title: 'Interface Overview', level: 1, id: 'gemini-interface-h1' },
        { type: 'paragraph', content: 'The Gemini interface is clean, minimal, and instantly familiar if you have used other Google products.', id: 'gemini-interface-p1' },
        { type: 'list', items: ['**Main Chat Area:** Where your conversation happens. You will notice Google\\'s signature playful animations when Gemini is "thinking".', '**Input Box:** Type text, use the microphone to speak, or upload images/documents using the "+" icon.', '**Recent Chats:** Located on the left sidebar to resume past conversations.', '**Extensions:** Accessible via the settings gear, allowing you to connect Gemini to Flights, Hotels, and Workspace.'], id: 'gemini-interface-list' },
        { type: 'callout', variant: 'info', title: 'Double-Check Responses', content: 'Gemini has a unique "G" button below its answers. Clicking this makes Gemini Google its own answer to verify the facts, highlighting corroborated text in green and questionable text in orange.', id: 'gemini-interface-callout' }
      ];

    case 'gemini-prompts':
      return [
        { type: 'heading', title: 'Prompt Basics for Gemini', level: 1, id: 'gemini-prompts-h1' },
        { type: 'paragraph', content: 'Writing good prompts for Gemini involves being clear, specific, and taking advantage of its web-search capabilities.', id: 'gemini-prompts-p1' },
        { type: 'list', items: ['**Be direct:** You don\\'t need to be overly polite. Give clear instructions.', '**Ask for current events:** Because it is tied to Google Search, you can ask for today\\'s news or live data.', '**Iterate:** If the first answer isn\\'t perfect, tell it exactly what to change.'], id: 'gemini-prompts-list' },
        { type: 'prompt', content: 'Search the web for the latest reviews of the iPhone 15 and summarize the top 3 pros and cons in a bulleted list.', copyEnabled: true, id: 'gemini-prompts-prompt' }
      ];

    case 'gemini-advanced':
      return [
        { type: 'heading', title: 'Gemini Advanced', level: 1, id: 'gemini-advanced-h1' },
        { type: 'paragraph', content: 'Gemini Advanced is Google\\'s premium subscription tier, giving you access to their most capable AI model: Gemini 1.5 Pro.', id: 'gemini-advanced-p1' },
        { type: 'list', items: ['**Massive Context Window:** Gemini 1.5 Pro can process up to 1 million tokens (and sometimes 2 million). This means you can upload 1-hour videos, thousands of lines of code, or multiple full-length books.', '**Better Reasoning:** It is significantly better at complex logic, coding, and following multi-step instructions compared to the free tier.', '**Google One Integration:** The subscription includes 2TB of Google Drive cloud storage.'], id: 'gemini-advanced-list' },
        { type: 'callout', variant: 'warning', title: 'When to Upgrade', content: 'If you only use AI for drafting emails or quick questions, the free tier is plenty. Upgrade if you need to analyze massive documents or write complex software.', id: 'gemini-advanced-callout' }
      ];

    case 'gemini-workspace':
      return [
        { type: 'heading', title: 'Google Workspace Integration', level: 1, id: 'gemini-workspace-h1' },
        { type: 'paragraph', content: 'One of Gemini\\'s biggest advantages is that it can read and interact with your personal Google Workspace data (if you allow it).', id: 'gemini-workspace-p1' },
        { type: 'list', items: ['**Gmail:** "Summarize the emails I received from John yesterday."', '**Docs:** "Create a project proposal based on the notes in @ProjectLaunchDoc."', '**Drive:** Gemini can search through your Drive to find specific PDFs or spreadsheets to answer your questions.'], id: 'gemini-workspace-list' },
        { type: 'prompt', content: 'Look at my recent emails about the upcoming team offsite and draft a reply confirming my attendance.', copyEnabled: true, id: 'gemini-workspace-prompt' },
        { type: 'callout', variant: 'success', title: 'Privacy Guarantee', content: 'Google explicitly states that your private Workspace data (emails, docs) is NOT used to train their public AI models.', id: 'gemini-workspace-callout' }
      ];

    case 'gemini-image-gen':
      return [
        { type: 'heading', title: 'Image Generation', level: 1, id: 'gemini-image-h1' },
        { type: 'paragraph', content: 'Gemini can generate high-quality images directly in the chat using Google\\'s Imagen 3 model.', id: 'gemini-image-p1' },
        { type: 'list', items: ['Just ask: "Generate an image of..." or "Create a picture of..."', 'Imagen 3 is incredibly photorealistic and excels at rendering text perfectly inside images (unlike older models).', 'You can ask Gemini to modify an image it just generated by saying "Make it darker" or "Change the car to red".'], id: 'gemini-image-list' },
        { type: 'prompt', content: 'Generate a photorealistic image of a futuristic smart city at sunset. Include a neon sign in the foreground that clearly says "WELCOME".', copyEnabled: true, id: 'gemini-image-prompt' }
      ];

    case 'gemini-data-analysis':
      return [
        { type: 'heading', title: 'Data Analysis', level: 1, id: 'gemini-data-h1' },
        { type: 'paragraph', content: 'Gemini is excellent at parsing messy data and helping you make sense of it.', id: 'gemini-data-p1' },
        { type: 'list', items: ['Upload a CSV or Excel file.', 'Ask Gemini to find trends, calculate averages, or clean up formatting.', 'Export directly to Google Sheets with one click.'], id: 'gemini-data-list' },
        { type: 'prompt', content: 'Analyze this uploaded sales data spreadsheet. Identify the top 3 selling products and calculate the total revenue for Q1.', copyEnabled: true, id: 'gemini-data-prompt' }
      ];

    case 'gemini-extensions':
      return [
        { type: 'heading', title: 'Gemini Extensions', level: 1, id: 'gemini-extensions-h1' },
        { type: 'paragraph', content: 'Extensions allow Gemini to pull real-time information from other Google services directly into your chat.', id: 'gemini-extensions-p1' },
        { type: 'list', items: ['**Google Flights & Hotels:** "Find me a weekend trip to New York under $500."', '**Google Maps:** "Plan a walking tour of Rome passing by the Colosseum and good gelaterias."', '**YouTube:** "Find a YouTube video explaining Quantum Mechanics and summarize the key points."'], id: 'gemini-extensions-list' },
        { type: 'callout', variant: 'info', title: 'Enabling Extensions', content: 'You can toggle specific extensions on or off in the Settings menu to control what data Gemini can access.', id: 'gemini-extensions-callout' }
      ];

    case 'gemini-gems':
      return [
        { type: 'heading', title: 'Custom Gems', level: 1, id: 'gemini-gems-h1' },
        { type: 'paragraph', content: 'Gems are customized versions of Gemini that you can create for specific tasks. (Similar to Custom GPTs in ChatGPT).', id: 'gemini-gems-p1' },
        { type: 'list', items: ['Give your Gem a name (e.g., "Coding Mentor").', 'Write a custom system instruction (e.g., "You are an expert Python tutor. Never give me the direct answer, just give me hints").', 'Use this Gem anytime you want that specific behavior without re-typing the prompt.'], id: 'gemini-gems-list' },
        { type: 'callout', variant: 'warning', title: 'Availability', content: 'Custom Gems are currently a premium feature available to Gemini Advanced subscribers.', id: 'gemini-gems-callout' }
      ];

    case 'gemini-api':
      return [
        { type: 'heading', title: 'Gemini API', level: 1, id: 'gemini-api-h1' },
        { type: 'paragraph', content: 'Developers can use the Gemini API (via Google AI Studio or Vertex AI) to build their own AI applications.', id: 'gemini-api-p1' },
        { type: 'list', items: ['**Google AI Studio:** The fastest way for developers to prototype prompts and get an API key.', '**Vertex AI:** The enterprise-grade platform on Google Cloud for deploying at scale.', '**Multimodal:** The API accepts video, audio, and images along with text.'], id: 'gemini-api-list' },
        { type: 'callout', variant: 'success', title: 'Free Tier', content: 'Google AI Studio offers a very generous free tier for developers to build and test applications using Gemini 1.5 Flash and Pro.', id: 'gemini-api-callout' }
      ];

    case 'gemini-coding':
      return [
        { type: 'heading', title: 'Coding with Gemini', level: 1, id: 'gemini-coding-h1' },
        { type: 'paragraph', content: 'Gemini 1.5 Pro is highly proficient at coding and has a massive advantage: its 1M+ token context window.', id: 'gemini-coding-p1' },
        { type: 'list', items: ['**Upload entire codebases:** You can zip an entire GitHub repository, upload it, and ask "Where is the authentication logic?"', '**Debug long logs:** Paste massive server error logs and let Gemini find the root cause.', '**Code translation:** "Convert this 500-line Python script into Go."'], id: 'gemini-coding-list' },
        { type: 'prompt', content: 'I have attached my entire frontend directory. Please review the code and suggest 3 performance optimizations I can make to reduce page load time.', copyEnabled: true, id: 'gemini-coding-prompt' }
      ];

    case 'gemini-best-use-cases':
      return [
        { type: 'heading', title: 'Best Use Cases', level: 1, id: 'gemini-best-h1' },
        { type: 'paragraph', content: 'Where does Gemini shine compared to the competition?', id: 'gemini-best-p1' },
        { type: 'list', items: ['**Video Analysis:** Uploading a 45-minute video and asking questions about specific timestamps.', '**Ecosystem Work:** Drafting emails based on your Drive documents.', '**Deep Research:** Using its native Google Search integration to synthesize current events.', '**Massive Documents:** Processing entire books or codebases in a single prompt.'], id: 'gemini-best-list' }
      ];

    case 'gemini-mistakes':
      return [
        { type: 'heading', title: 'Common Mistakes', level: 1, id: 'gemini-mistakes-h1' },
        { type: 'paragraph', content: 'Avoid these pitfalls when using Gemini:', id: 'gemini-mistakes-p1' },
        { type: 'list', items: ['**Assuming it knows your Google data automatically:** You must use the @ operator or enable extensions for it to read your Drive/Docs.', '**Ignoring the "G" button:** Always verify important claims by clicking the Google icon below the response.', '**Using standard prompts for massive context:** When uploading 50 documents, be extremely specific about *where* in the documents it should look.'], id: 'gemini-mistakes-list' }
      ];

    case 'gemini-quiz':
      return [
        { type: 'heading', title: 'Gemini Knowledge Quiz', level: 1, id: 'gemini-quiz-h1' },
        { type: 'paragraph', content: 'Test your understanding of Google Gemini.', id: 'gemini-quiz-p1' },
        { 
          type: 'quiz', 
          id: 'gemini-interactive-quiz',
          questions: [
            {
              question: "What is the primary advantage of Gemini 1.5 Pro over many competitors?",
              options: ["It is entirely open-source", "A massive context window up to 2 million tokens", "It does not require internet", "It is built exclusively for Windows"],
              correctAnswerIndex: 1,
              explanation: "Gemini 1.5 Pro features an industry-leading context window, allowing it to process entire codebases or long videos in a single prompt."
            },
            {
              question: "What does the 'G' button below a Gemini response do?",
              options: ["Generates a new response", "Googles the answer to fact-check its own claims", "Translates the text to German", "Saves it to Google Drive"],
              correctAnswerIndex: 1,
              explanation: "The 'G' button triggers a Google Search to corroborate the AI's claims, highlighting verified text in green."
            },
            {
              question: "Which feature allows Gemini to pull live data from Maps, Flights, and YouTube?",
              options: ["Gems", "Plugins", "Extensions", "Artifacts"],
              correctAnswerIndex: 2,
              explanation: "Extensions allow Gemini to natively connect to other Google services like Maps and YouTube."
            }
          ]
        }
      ];
`;

let lessonContent = fs.readFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', 'utf8');

// Inject right before "default:"
lessonContent = lessonContent.replace('    default:', geminiCases + '\n    default:');

fs.writeFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', lessonContent);
console.log('Successfully injected Gemini blocks into lesson-content.ts!');
