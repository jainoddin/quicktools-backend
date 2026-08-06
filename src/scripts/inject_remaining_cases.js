const fs = require('fs');

const perplexityCases = `
    case 'perplexity-introduction':
      return [
        { type: 'heading', title: 'What is Perplexity AI?', level: 1, id: 'perp-intro' },
        { type: 'paragraph', content: 'Perplexity AI is a conversational search engine that answers your questions by searching the internet in real-time and providing citations for every claim it makes.', id: 'perp-intro-p1' },
        { type: 'list', items: ['**Accuracy First:** Unlike traditional chatbots that hallucinate, Perplexity grounds its answers in real web sources.', '**Search-Oriented:** It functions more like a highly intelligent Google Search than a creative writer.', '**Transparency:** Every paragraph contains small superscript numbers that link directly to the source article.'], id: 'perp-intro-list' }
      ];

    case 'perplexity-create-account':
      return [
        { type: 'heading', title: 'Create an Account', level: 1, id: 'perp-create' },
        { type: 'paragraph', content: 'You can use Perplexity without an account, but signing up unlocks chat history and Copilot features.', id: 'perp-create-p1' },
        { type: 'list', items: ['Go to perplexity.ai', 'Click "Sign Up" and use your Google or Apple account.', 'The free tier offers basic search, while Pro gives you access to advanced models like GPT-4o and Claude 3.5 Sonnet.'], id: 'perp-create-list' }
      ];

    case 'perplexity-interface':
      return [
        { type: 'heading', title: 'Interface Overview', level: 1, id: 'perp-interface' },
        { type: 'paragraph', content: 'Perplexity has a minimalist, search-centric design.', id: 'perp-interface-p1' },
        { type: 'list', items: ['**Home:** A central search bar asking "Where knowledge begins".', '**Discover:** A feed of curated, interesting searches happening around the world.', '**Library:** Where your Collections and Threads are saved.', '**Focus:** A small toggle in the search bar to restrict where Perplexity searches.'], id: 'perp-interface-list' }
      ];

    case 'perplexity-asking':
      return [
        { type: 'heading', title: 'Asking Questions', level: 1, id: 'perp-asking' },
        { type: 'paragraph', content: 'Asking questions in Perplexity is just like talking to an incredibly smart librarian.', id: 'perp-asking-p1' },
        { type: 'prompt', content: 'What are the main differences between an LLC and an S-Corp in California, and what are the tax implications of each?', copyEnabled: true, id: 'perp-asking-prompt' },
        { type: 'callout', variant: 'info', title: 'Follow-ups', content: 'At the bottom of every answer, Perplexity suggests 3 related follow-up questions you can click to dive deeper.', id: 'perp-asking-callout' }
      ];

    case 'perplexity-copilot':
      return [
        { type: 'heading', title: 'Pro Search (formerly Copilot)', level: 1, id: 'perp-copilot' },
        { type: 'paragraph', content: 'Pro Search is an advanced mode where Perplexity doesn\\'t just search once—it breaks your question down, searches multiple times, and even asks you clarifying questions before answering.', id: 'perp-copilot-p1' },
        { type: 'list', items: ['Toggle "Pro" in the search bar.', 'Ask a complex question.', 'Perplexity might pause and ask you a multiple-choice question to narrow down what you mean.'], id: 'perp-copilot-list' }
      ];

    case 'perplexity-focus':
      return [
        { type: 'heading', title: 'Focus Modes', level: 1, id: 'perp-focus' },
        { type: 'paragraph', content: 'Focus mode tells Perplexity where to look for answers.', id: 'perp-focus-p1' },
        { type: 'list', items: ['**All:** Searches the entire internet.', '**Academic:** Searches only published academic papers (great for research).', '**Writing:** Generates text without searching the web.', '**Wolfram Alpha:** Solves complex math and data problems.', '**YouTube:** Searches video transcripts.'], id: 'perp-focus-list' }
      ];

    case 'perplexity-collections':
      return [
        { type: 'heading', title: 'Collections', level: 1, id: 'perp-collections' },
        { type: 'paragraph', content: 'Collections allow you to organize threads into folders.', id: 'perp-collections-p1' },
        { type: 'list', items: ['Create a Collection (e.g., "Trip to Japan").', 'Set a system prompt for the Collection (e.g., "Always format answers as an itinerary").', 'Save threads to this collection to keep your research organized and easily shareable.'], id: 'perp-collections-list' }
      ];

    case 'perplexity-uploads':
      return [
        { type: 'heading', title: 'File Uploads', level: 1, id: 'perp-uploads' },
        { type: 'paragraph', content: 'You can upload PDFs or images to Perplexity.', id: 'perp-uploads-p1' },
        { type: 'prompt', content: 'Summarize the methodology section of this uploaded research paper and critique its sample size.', copyEnabled: true, id: 'perp-uploads-prompt' }
      ];

    case 'perplexity-discover':
      return [
        { type: 'heading', title: 'Discover Tab', level: 1, id: 'perp-discover' },
        { type: 'paragraph', content: 'The Discover tab acts like a personalized AI news feed.', id: 'perp-discover-p1' },
        { type: 'list', items: ['It surfaces trending topics.', 'Each topic is an AI-generated report summarizing multiple news sources.', 'You can click on any topic to start a thread and ask follow-up questions about the news.'], id: 'perp-discover-list' }
      ];

    case 'perplexity-pro':
      return [
        { type: 'heading', title: 'Perplexity Pro Features', level: 1, id: 'perp-pro' },
        { type: 'paragraph', content: 'Perplexity Pro is a $20/mo subscription that supercharges the platform.', id: 'perp-pro-p1' },
        { type: 'list', items: ['**Model Selection:** Choose between GPT-4o, Claude 3.5 Sonnet, or Sonar (Perplexity\\'s own model) to power your searches.', '**Unlimited Pro Search:** Over 300+ Pro Searches per day.', '**File Uploads:** Analyze unlimited files and images.'], id: 'perp-pro-list' }
      ];

    case 'perplexity-api':
      return [
        { type: 'heading', title: 'API Integration', level: 1, id: 'perp-api' },
        { type: 'paragraph', content: 'Perplexity offers an API for developers called ppix-api.', id: 'perp-api-p1' },
        { type: 'list', items: ['It provides access to the Sonar models.', 'These models are unique because they have real-time internet access built into the API response.', 'Perfect for building news aggregators, stock bots, or research tools.'], id: 'perp-api-list' }
      ];

    case 'perplexity-research':
      return [
        { type: 'heading', title: 'Academic Research', level: 1, id: 'perp-research' },
        { type: 'paragraph', content: 'Perplexity is arguably the best AI tool for students and researchers.', id: 'perp-research-p1' },
        { type: 'list', items: ['Use the "Academic" Focus mode.', 'Ask your research question.', 'Perplexity will return an essay fully cited with links to DOIs and published papers, completely eliminating hallucinations.'], id: 'perp-research-list' }
      ];

    case 'perplexity-best-use-cases':
      return [
        { type: 'heading', title: 'Best Use Cases', level: 1, id: 'perp-best' },
        { type: 'paragraph', content: 'Use Perplexity when facts matter.', id: 'perp-best-p1' },
        { type: 'list', items: ['**Fact-Checking:** "Did [Politician] actually say [Quote]?"', '**Product Research:** "What are the best noise-canceling headphones under $200 according to Reddit?"', '**Medical Information:** "What are the peer-reviewed side effects of [Medication]?"'], id: 'perp-best-list' }
      ];

    case 'perplexity-mistakes':
      return [
        { type: 'heading', title: 'Common Mistakes', level: 1, id: 'perp-mistakes' },
        { type: 'paragraph', content: 'Do not use Perplexity like ChatGPT.', id: 'perp-mistakes-p1' },
        { type: 'list', items: ['**Creative Writing:** Don\\'t ask Perplexity to write a poem or a novel (unless you use Writing mode). Its default behavior is to search the web, which ruins creative tasks.', '**Ignoring Citations:** Always hover over the citation numbers to verify the source is reputable (e.g., NYT vs a random blog).'], id: 'perp-mistakes-list' }
      ];

    case 'perplexity-quiz':
      return [
        { type: 'heading', title: 'Perplexity Quiz', level: 1, id: 'perp-quiz' },
        { type: 'paragraph', content: 'Test your knowledge.', id: 'perp-quiz-p1' },
        { 
          type: 'quiz', 
          id: 'perp-interactive-quiz',
          questions: [
            {
              question: "What is the primary feature that distinguishes Perplexity from standard ChatGPT?",
              options: ["It writes better code", "It searches the live web and provides citations", "It is completely free forever", "It has a mobile app"],
              correctAnswerIndex: 1,
              explanation: "Perplexity is a search engine first, always citing its web sources to prevent hallucinations."
            },
            {
              question: "Which Focus mode should you use to prevent Perplexity from searching the web?",
              options: ["Academic", "Wolfram Alpha", "Writing", "YouTube"],
              correctAnswerIndex: 2,
              explanation: "Writing mode disables web search, allowing the AI to function purely as a creative text generator."
            }
          ]
        }
      ];
`;

const prompthubCases = `
    case 'prompthub-introduction':
      return [
        { type: 'heading', title: 'What is a Prompt Hub?', level: 1, id: 'phub-intro' },
        { type: 'paragraph', content: 'A Prompt Hub is a centralized repository where individuals and teams can store, share, version-control, and test their AI prompts.', id: 'phub-intro-p1' },
        { type: 'list', items: ['**Consistency:** Ensures everyone in a company is using the same high-quality prompts.', '**Version Control:** Track how a prompt changes over time and which version performs best.', '**Collaboration:** Share prompt templates with dynamic variables.'], id: 'phub-intro-list' }
      ];

    case 'prompthub-interface':
      return [
        { type: 'heading', title: 'Interface Overview', level: 1, id: 'phub-interface' },
        { type: 'paragraph', content: 'Most prompt hubs have three main areas:', id: 'phub-interface-p1' },
        { type: 'list', items: ['**The Library:** A grid or list of all saved prompts, categorized by tags (e.g., Marketing, Coding, HR).', '**The Editor:** A workspace to write the prompt, define variables, and tweak settings like Temperature.', '**The Playground:** A chat window to test the prompt against different AI models (OpenAI, Anthropic) immediately.'], id: 'phub-interface-list' }
      ];

    case 'prompthub-browsing':
      return [
        { type: 'heading', title: 'Browsing Prompts', level: 1, id: 'phub-browsing' },
        { type: 'paragraph', content: 'You can discover community-made prompts to save time.', id: 'phub-browsing-p1' },
        { type: 'list', items: ['Search by use-case (e.g., "SEO Blog Post", "Code Reviewer").', 'Look at the "Forks" or "Likes" to gauge the quality of a prompt.', 'Duplicate a community prompt into your own private workspace to modify it.'], id: 'phub-browsing-list' }
      ];

    case 'prompthub-using':
      return [
        { type: 'heading', title: 'Using Prompts', level: 1, id: 'phub-using' },
        { type: 'paragraph', content: 'Using a hub prompt is as easy as filling out a form.', id: 'phub-using-p1' },
        { type: 'list', items: ['Select the prompt template.', 'Fill in the defined variables (e.g., Target Audience, Topic, Tone).', 'Click Run to generate the output, or copy the final compiled text to paste into ChatGPT.'], id: 'phub-using-list' }
      ];

    case 'prompthub-creating':
      return [
        { type: 'heading', title: 'Creating Your Own', level: 1, id: 'phub-creating' },
        { type: 'paragraph', content: 'When creating a prompt in a hub, structure is key.', id: 'phub-creating-p1' },
        { type: 'prompt', content: 'Role: [ROLE]\\nTask: [TASK]\\nFormat: [FORMAT]', copyEnabled: true, id: 'phub-creating-prompt' },
        { type: 'callout', variant: 'info', title: 'Documentation', content: 'Always add a description to your prompt explaining exactly what inputs it expects so your teammates can use it correctly.', id: 'phub-creating-callout' }
      ];

    case 'prompthub-variables':
      return [
        { type: 'heading', title: 'Variables & Templates', level: 1, id: 'phub-variables' },
        { type: 'paragraph', content: 'Variables make prompts reusable.', id: 'phub-variables-p1' },
        { type: 'list', items: ['Most hubs use double brackets {{variable_name}} to define dynamic inputs.', 'When you run the prompt, the hub replaces the brackets with the user\\'s input.', 'Example: "Write a polite email to {{client_name}} apologizing for the delay in {{project_name}}."'], id: 'phub-variables-list' }
      ];

    case 'prompthub-system':
      return [
        { type: 'heading', title: 'System Prompts', level: 1, id: 'phub-system' },
        { type: 'paragraph', content: 'In a prompt hub, you usually separate the System Prompt from the User Prompt.', id: 'phub-system-p1' },
        { type: 'list', items: ['**System Prompt:** Defines the AI\\'s persona, strict rules, and output format constraints.', '**User Prompt:** Contains the actual variables and the specific task for this single run.'], id: 'phub-system-list' }
      ];

    case 'prompthub-context':
      return [
        { type: 'heading', title: 'Context Window Management', level: 1, id: 'phub-context' },
        { type: 'paragraph', content: 'Prompt hubs help you manage token limits.', id: 'phub-context-p1' },
        { type: 'list', items: ['Hubs usually display a live Token Count as you type.', 'They warn you if your variables (like pasting a whole book) will exceed the selected model\\'s context window.', 'You can attach static files (like a company brand guide) to the prompt so they are always included in the context.'], id: 'phub-context-list' }
      ];

    case 'prompthub-fewshot':
      return [
        { type: 'heading', title: 'Few-Shot Prompting', level: 1, id: 'phub-fewshot' },
        { type: 'paragraph', content: 'A powerful technique easily implemented in hubs is Few-Shot prompting: giving the AI examples of the desired output.', id: 'phub-fewshot-p1' },
        { type: 'prompt', content: 'Example 1: Input: "Happy" -> Output: "Positive"\\nExample 2: Input: "Sad" -> Output: "Negative"\\nNow do: Input: "{{user_word}}" -> Output:', copyEnabled: true, id: 'phub-fewshot-prompt' }
      ];

    case 'prompthub-cot':
      return [
        { type: 'heading', title: 'Chain of Thought', level: 1, id: 'phub-cot' },
        { type: 'paragraph', content: 'Force the AI to think step-by-step.', id: 'phub-cot-p1' },
        { type: 'list', items: ['Add "Think step-by-step before answering" to your prompt template.', 'In the hub, you can evaluate if the chain of thought actually led to a better result by comparing versions side-by-side in the Playground.'], id: 'phub-cot-list' }
      ];

    case 'prompthub-evaluation':
      return [
        { type: 'heading', title: 'Prompt Evaluation', level: 1, id: 'phub-evaluation' },
        { type: 'paragraph', content: 'How do you know if Version 2 of your prompt is better than Version 1?', id: 'phub-evaluation-p1' },
        { type: 'list', items: ['Prompt hubs allow A/B testing.', 'Run both prompt versions against a dataset of 10 different inputs.', 'Compare the outputs side-by-side to ensure the new prompt doesn\\'t regress or break edge cases.'], id: 'phub-evaluation-list' }
      ];

    case 'prompthub-sharing':
      return [
        { type: 'heading', title: 'Sharing Prompts', level: 1, id: 'phub-sharing' },
        { type: 'paragraph', content: 'Hubs act as a team\\'s internal AI wiki.', id: 'phub-sharing-p1' },
        { type: 'list', items: ['Share a URL with a teammate.', 'Teammates can use the prompt without needing to know how to write it or what the exact system instructions are.', 'If you update the prompt, everyone automatically uses the newest version.'], id: 'phub-sharing-list' }
      ];

    case 'prompthub-best-practices':
      return [
        { type: 'heading', title: 'Best Practices', level: 1, id: 'phub-best' },
        { type: 'paragraph', content: 'Tips for maintaining a healthy prompt hub:', id: 'phub-best-p1' },
        { type: 'list', items: ['**Tagging:** Always tag prompts (e.g., #engineering, #sales) so they don\\'t get lost.', '**Deprecation:** Archive old prompts that no longer work well with newer models.', '**Modularize:** If you have a massive brand-voice instruction, keep it as a snippet and insert it into multiple prompts.'], id: 'phub-best-list' }
      ];

    case 'prompthub-mistakes':
      return [
        { type: 'heading', title: 'Common Mistakes', level: 1, id: 'phub-mistakes' },
        { type: 'paragraph', content: 'Avoid these errors in your team hub:', id: 'phub-mistakes-p1' },
        { type: 'list', items: ['**Hardcoding data:** Don\\'t hardcode "2023 Q1 Report" into the prompt. Use a {{report_data}} variable so it works next quarter too.', '**Too many variables:** If a user has to fill out 15 text boxes to run a prompt, they won\\'t use it.', '**No examples:** A prompt without Few-Shot examples will have highly variable output quality.'], id: 'phub-mistakes-list' }
      ];

    case 'prompthub-quiz':
      return [
        { type: 'heading', title: 'Prompt Hub Quiz', level: 1, id: 'phub-quiz' },
        { type: 'paragraph', content: 'Test your understanding of Prompt Hubs.', id: 'phub-quiz-p1' },
        { 
          type: 'quiz', 
          id: 'phub-interactive-quiz',
          questions: [
            {
              question: "What is the primary syntax used to define dynamic inputs in most prompt hubs?",
              options: ["XML tags like <input>", "Double curly brackets like {{variable}}", "Hashtags like #variable", "Dollar signs like $variable"],
              correctAnswerIndex: 1,
              explanation: "Most templating engines in prompt hubs use {{variable}} to denote fields the user needs to fill in."
            },
            {
              question: "Why is version control important for prompts?",
              options: ["To track billing costs", "Because AI models update, and a prompt that worked yesterday might break today", "To prevent users from using the AI", "To increase the token limit"],
              correctAnswerIndex: 1,
              explanation: "AI models change over time. Version control allows you to test new tweaks and roll back if the output quality decreases."
            }
          ]
        }
      ];
`;

let lessonContent = fs.readFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', 'utf8');

lessonContent = lessonContent.replace('    default:', perplexityCases + '\\n' + prompthubCases + '\\n    default:');

fs.writeFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', lessonContent);
console.log('Successfully injected remaining blocks into lesson-content.ts!');
