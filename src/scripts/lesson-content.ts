export function getBlocksForLesson(slug: string, title: string) {
  switch (slug) {
    case 'introduction':
      return [
        { type: 'heading', title: 'What is ChatGPT?', level: 1, id: 'what-is-chatgpt' },
        { type: 'paragraph', content: 'ChatGPT is an AI chatbot developed by OpenAI. It understands natural language and can help you with writing, coding, learning, brainstorming, and much more.', id: 'intro' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-interface-mockup.png', alt: 'ChatGPT Interface', caption: 'ChatGPT Interface Mockup', id: 'chatgpt-ui' },
        { type: 'heading', title: 'Why use ChatGPT?', level: 2, id: 'why-use' },
        { type: 'list', items: ['Get instant answers to any question', 'Write better content in less time', 'Solve coding problems', 'Brainstorm ideas and strategies', 'Automate repetitive tasks'], id: 'why-list' },
        { type: 'callout', variant: 'info', title: 'Did you know?', content: 'ChatGPT is powered by a large language model (LLM) that has been trained on a massive amount of text data from the internet.', id: 'did-you-know' },
        { type: 'heading', title: 'How it works', level: 2, id: 'how-it-works' },
        { type: 'paragraph', content: 'Under the hood, ChatGPT uses a transformer architecture to predict the next word in a sequence. It does this by analyzing the context of the prompt and generating a response that is statistically likely to follow.', id: 'how-works-p1' },
        { type: 'prompt', content: 'Explain quantum computing in simple terms', copyEnabled: true, id: 'prompt-1' },
        { type: 'heading', title: 'Key Takeaways', level: 2, id: 'key-takeaways' },
        { type: 'list', items: ['ChatGPT is a powerful AI assistant.', 'It can generate human-like text.', 'It is useful for a wide range of tasks.'], id: 'takeaways-list' }
      ];

    case 'create-account':
      return [
        { type: 'heading', title: 'Create an OpenAI Account', level: 1, id: 'create-account-heading' },
        { type: 'paragraph', content: 'Before you can start using ChatGPT, you need to create a free account with OpenAI. The process is quick and simple.', id: 'create-intro' },
        { type: 'heading', title: 'Step-by-Step Guide', level: 2, id: 'step-by-step' },
        { type: 'list', items: [
          'Go to chat.openai.com in your web browser.',
          'Click on the "Sign Up" button.',
          'Enter your email address or continue with Google, Microsoft, or Apple.',
          'Verify your email address by clicking the link sent to your inbox.',
          'Enter your name and date of birth.',
          'Verify your phone number (this is required for security purposes).'
        ], id: 'steps-list' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-signup-mockup.png', alt: 'Registration Page', caption: 'OpenAI Sign Up Page', id: 'signup-image' },
        { type: 'callout', variant: 'warning', title: 'Phone Verification', content: 'OpenAI requires a valid phone number to prevent abuse. Virtual numbers (like Google Voice) are often not accepted.', id: 'phone-warning' },
        { type: 'heading', title: 'Free vs Plus', level: 2, id: 'free-vs-plus' },
        { type: 'paragraph', content: 'When you sign up, you automatically get access to the Free tier. If you need access during peak times, faster response speeds, and priority access to new features like GPT-4, you can upgrade to ChatGPT Plus later.', id: 'free-plus-text' }
      ];

    case 'interface-overview':
      return [
        { type: 'heading', title: 'ChatGPT Interface Explained', level: 1, id: 'interface-overview-heading' },
        { type: 'paragraph', content: 'The ChatGPT interface is designed to be clean and intuitive, much like a standard messaging app. Let us break down the key areas of the screen.', id: 'interface-intro' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-dashboard-mockup.png', alt: 'ChatGPT Dashboard', caption: 'The main dashboard layout', id: 'dashboard-img' },
        { type: 'heading', title: 'The Sidebar', level: 2, id: 'sidebar' },
        { type: 'list', items: [
          '**New Chat**: Starts a fresh conversation without context from previous chats.',
          '**Chat History**: A list of all your past conversations, automatically named by the AI.',
          '**Settings**: Access your account details, custom instructions, and theme preferences.'
        ], id: 'sidebar-list' },
        { type: 'heading', title: 'The Main Chat Area', level: 2, id: 'main-chat' },
        { type: 'paragraph', content: 'This is where the magic happens. You type your prompts into the input box at the bottom, and the AI responds in the space above.', id: 'main-chat-text' },
        { type: 'callout', variant: 'info', title: 'Regenerating Responses', content: 'If you do not like an answer, you can click the "Regenerate" button (the circular arrow) to get a different response to the same prompt.', id: 'regenerate-info' }
      ];

    case 'prompt-basics':
      return [
        { type: 'heading', title: 'Prompt Basics', level: 1, id: 'prompt-basics-heading' },
        { type: 'paragraph', content: 'A "prompt" is simply the text you type to communicate with the AI. Writing good prompts is the most important skill for getting good results.', id: 'prompt-intro' },
        { type: 'heading', title: 'The Anatomy of a Good Prompt', level: 2, id: 'anatomy' },
        { type: 'list', items: [
          '**Clarity**: Be specific about what you want.',
          '**Context**: Provide background information.',
          '**Format**: Tell the AI how you want the output (e.g., bullet points, table, essay).',
          '**Constraints**: Tell it what NOT to do.'
        ], id: 'anatomy-list' },
        { type: 'heading', title: 'Examples of Bad vs Good Prompts', level: 2, id: 'examples' },
        { type: 'paragraph', content: 'Bad Prompt (too vague):', id: 'bad-prompt-text' },
        { type: 'prompt', content: 'Write a blog post about marketing.', copyEnabled: false, id: 'bad-prompt' },
        { type: 'paragraph', content: 'Good Prompt (specific and structured):', id: 'good-prompt-text' },
        { type: 'prompt', content: 'Write a 500-word blog post about digital marketing for small local businesses. Use a friendly tone, include 3 actionable tips, and format the tips as a bulleted list.', copyEnabled: true, id: 'good-prompt' },
        { type: 'callout', variant: 'success', title: 'Pro Tip', content: 'Always tell the AI what role it should play. For example: "Act as an expert copywriter..."', id: 'role-tip' }
      ];

    case 'system-prompts':
      return [
        { type: 'heading', title: 'System Prompts & Custom Instructions', level: 1, id: 'system-prompts-heading' },
        { type: 'paragraph', content: 'Custom Instructions allow you to give ChatGPT persistent context so you don\'t have to repeat yourself in every new chat.', id: 'system-intro' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-systemprompts-mockup.png', alt: 'Code and Systems', caption: 'System Level Instructions', id: 'system-img' },
        { type: 'heading', title: 'How to use Custom Instructions', level: 2, id: 'how-to-use' },
        { type: 'list', items: [
          'Go to Settings > Custom Instructions.',
          'Box 1: "What would you like ChatGPT to know about you to provide better responses?" (e.g., I am a high school teacher in London).',
          'Box 2: "How would you like ChatGPT to respond?" (e.g., Keep answers under 2 paragraphs, do not use jargon).'
        ], id: 'instructions-list' },
        { type: 'callout', variant: 'info', title: 'When to use this', content: 'Use this if you consistently need the AI to output in a specific format (like Markdown) or if you want it to always adopt a specific persona.', id: 'when-to-use' }
      ];

    case 'file-uploads':
      return [
        { type: 'heading', title: 'Working with File Uploads', level: 1, id: 'file-uploads-heading' },
        { type: 'paragraph', content: 'ChatGPT Plus and Enterprise users can upload files directly into the chat for the AI to analyze, summarize, or extract data from.', id: 'files-intro' },
        { type: 'heading', title: 'Supported File Types', level: 2, id: 'supported-types' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-fileupload-mockup.png', alt: 'File Uploads in ChatGPT', caption: 'Drag and drop files into the chat interface', id: 'file-upload-img' },
        { type: 'list', items: [
          '**Documents**: PDF, DOCX, TXT',
          '**Data**: CSV, XLSX',
          '**Images**: JPG, PNG, WEBP',
          '**Code**: PY, JS, HTML, etc.'
        ], id: 'types-list' },
        { type: 'heading', title: 'Example Use Cases', level: 2, id: 'use-cases' },
        { type: 'prompt', content: 'Attached is a 50-page PDF report on climate change. Summarize the key findings in 5 bullet points and extract all mentioned statistics into a table.', copyEnabled: true, id: 'file-prompt' },
        { type: 'callout', variant: 'warning', title: 'Data Privacy', content: 'Do not upload highly sensitive, confidential, or proprietary company documents unless your organization has a specific data privacy agreement with OpenAI.', id: 'privacy-warning' }
      ];

    case 'image-generation':
      return [
        { type: 'heading', title: 'Image Generation with DALL-E 3', level: 1, id: 'image-gen-heading' },
        { type: 'paragraph', content: 'ChatGPT has DALL-E 3 built directly into it, allowing you to generate high-quality images just by describing them in natural language.', id: 'image-intro' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-imagegeneration-mockup.png', alt: 'AI Generated Art', caption: 'An example of AI generated imagery', id: 'ai-art-img' },
        { type: 'heading', title: 'How to write image prompts', level: 2, id: 'image-prompts' },
        { type: 'paragraph', content: 'You do not need to write complex comma-separated prompts anymore. Just describe exactly what you want.', id: 'image-prompts-text' },
        { type: 'prompt', content: 'Generate a photorealistic image of a futuristic city with flying cars, neon lights, and rain-slicked streets. The mood should be cyberpunk and cinematic.', copyEnabled: true, id: 'image-prompt' },
        { type: 'callout', variant: 'success', title: 'Iterative Editing', content: 'If the image isn\'t perfect, just tell ChatGPT what to change. For example: "Make the flying cars red" or "Change the time of day to sunrise".', id: 'edit-tip' }
      ];

    case 'data-analysis':
      return [
        { type: 'heading', title: 'Advanced Data Analysis', level: 1, id: 'data-analysis-heading' },
        { type: 'paragraph', content: 'ChatGPT can write and execute Python code in the background to analyze your data, create charts, and perform complex math.', id: 'data-intro' },
        { type: 'heading', title: 'How it works', level: 2, id: 'how-data-works' },
        { type: 'list', items: [
          'Upload a CSV or Excel file containing your raw data.',
          'Ask a question about the data in plain English.',
          'ChatGPT writes a Python script, runs it in a secure environment, and gives you the answer or a visual chart.'
        ], id: 'data-list' },
        { type: 'prompt', content: 'I have attached my sales data for 2023. Can you clean the data, find the top 5 performing products, and create a bar chart showing their monthly revenue trends?', copyEnabled: true, id: 'data-prompt' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-dataanalysis-mockup.png', alt: 'Data Charts', caption: 'Data Visualization generated by AI', id: 'data-img' }
      ];

    case 'custom-gpts':
      return [
        { type: 'heading', title: 'Creating Custom GPTs', level: 1, id: 'custom-gpts-heading' },
        { type: 'paragraph', content: 'You can create your own custom versions of ChatGPT that combine specific instructions, extra knowledge, and any combination of skills.', id: 'gpts-intro' },
        { type: 'heading', title: 'Why build a Custom GPT?', level: 2, id: 'why-build' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-customgpts-mockup.png', alt: 'Custom GPTs Builder', caption: 'Build your own custom AI assistants', id: 'custom-gpts-img' },
        { type: 'list', items: [
          'Create a writing assistant trained strictly on your brand\'s style guide.',
          'Build a customer support bot loaded with your company FAQs.',
          'Make a coding tutor that focuses only on a specific language like Rust.'
        ], id: 'gpts-list' },
        { type: 'callout', variant: 'info', title: 'GPT Store', content: 'You can keep your GPTs private, share them with specific people via a link, or publish them to the public GPT store for others to use.', id: 'gpt-store-info' }
      ];

    case 'projects':
      return [
        { type: 'heading', title: 'Organizing with Projects', level: 1, id: 'projects-heading' },
        { type: 'paragraph', content: 'Projects are a feature for organizing your chats and files into dedicated workspaces, keeping different types of work completely separate.', id: 'projects-intro' },
        { type: 'heading', title: 'Best Practices', level: 2, id: 'best-practices' },
        { type: 'list', items: [
          'Create a "Marketing" project for all your ad copy and social media planning.',
          'Create a "Development" project for coding and architecture discussions.',
          'Upload project-specific documents so the AI always has context.'
        ], id: 'projects-list' }
      ];

    case 'voice-mode':
      return [
        { type: 'heading', title: 'Using Advanced Voice Mode', level: 1, id: 'voice-heading' },
        { type: 'paragraph', content: 'On the ChatGPT mobile app, you can have real-time spoken conversations with the AI. It can understand tone, emotion, and interruptions.', id: 'voice-intro' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-voicemode-mockup.png', alt: 'Voice Interface', caption: 'Speaking to AI on mobile', id: 'voice-img' },
        { type: 'heading', title: 'Great Use Cases', level: 2, id: 'voice-uses' },
        { type: 'list', items: [
          'Practicing a foreign language with real-time feedback.',
          'Doing a mock interview for a job.',
          'Brainstorming ideas while walking or commuting.',
          'Reading bedtime stories to children with expressive voices.'
        ], id: 'voice-list' }
      ];

    case 'coding-with-chatgpt':
      return [
        { type: 'heading', title: 'Coding with ChatGPT', level: 1, id: 'coding-heading' },
        { type: 'paragraph', content: 'ChatGPT is an exceptional coding assistant. It can write code from scratch, find bugs, explain complex concepts, and translate between programming languages.', id: 'coding-intro' },
        { type: 'heading', title: 'Example Workflow', level: 2, id: 'coding-workflow' },
        { type: 'prompt', content: 'I have a React component that fetches user data, but it is causing an infinite loop. Here is the code: [paste code]. Can you tell me why it\'s looping and provide the fixed code?', copyEnabled: true, id: 'coding-prompt' },
        { type: 'code', language: 'javascript', code: 'useEffect(() => {\n  fetchData();\n  // Fix: Added missing dependency array to prevent infinite re-renders\n}, []);', id: 'coding-example' },
        { type: 'callout', variant: 'warning', title: 'Always Verify', content: 'While ChatGPT is great at coding, it can occasionally hallucinate incorrect APIs or insecure patterns. Always review the code it generates before putting it into production.', id: 'verify-warning' }
      ];

    case 'best-use-cases':
      return [
        { type: 'heading', title: 'Best Use Cases', level: 1, id: 'best-use-heading' },
        { type: 'paragraph', content: 'Here is a rapid-fire list of the most valuable ways to use ChatGPT in your daily life and work.', id: 'best-use-intro' },
        { type: 'list', items: [
          '**Drafting Emails**: "Write a polite email declining a vendor\'s proposal."',
          '**Summarization**: "Summarize this 30-minute transcript into 5 bullet points."',
          '**Brainstorming**: "Give me 10 name ideas for a coffee shop in Seattle."',
          '**Learning**: "Explain quantum mechanics to me as if I am 12 years old."',
          '**Roleplay**: "Act as a tough negotiator and practice this salary negotiation with me."'
        ], id: 'best-use-list' }
      ];

    case 'common-mistakes':
      return [
        { type: 'heading', title: 'Common Mistakes to Avoid', level: 1, id: 'mistakes-heading' },
        { type: 'paragraph', content: 'Avoid these common pitfalls to get the most out of your AI interactions.', id: 'mistakes-intro' },
        { type: 'heading', title: 'Top 3 Mistakes', level: 2, id: 'top-3-mistakes' },
        { type: 'list', items: [
          '**Being too vague**: Asking "Write an article about dogs" instead of specifying the breed, tone, length, and target audience.',
          '**Trusting facts blindly**: AI models hallucinate. Always double-check facts, dates, and citations.',
          '**Treating it like a search engine**: ChatGPT is a reasoning engine, not just a database. Ask it to analyze, summarize, or create, rather than just retrieve facts.'
        ], id: 'mistakes-list' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/learn-course/bd1e90fd-bfd9-4200-8696-9e43dc8d4672.jpg', alt: 'Frustrated User', caption: 'Don\'t let bad prompts frustrate you.', id: 'frustrated-img' }
      ];

    case 'quiz':
      return [
        { type: 'heading', title: 'Final Quiz', level: 1, id: 'quiz-heading' },
        { type: 'paragraph', content: 'Test your knowledge on everything you have learned in this course.', id: 'quiz-intro' },
        { type: 'callout', variant: 'success', title: 'Ready to begin?', content: 'This quiz consists of 5 multiple-choice questions. You need 80% to pass and earn your certificate.', id: 'quiz-ready' },
        { 
          type: 'quiz', 
          id: 'interactive-quiz',
          questions: [
            {
              question: "What does GPT stand for?",
              options: ["Generative Pre-trained Transformer", "General Purpose Technology", "Global Positioning Tracker", "Generative Processing Tool"],
              correctAnswerIndex: 0,
              explanation: "GPT stands for Generative Pre-trained Transformer, which describes the underlying architecture of the AI model."
            },
            {
              question: "What is a 'prompt' in the context of ChatGPT?",
              options: ["An alarm clock feature", "The text you type to communicate with the AI", "A paid subscription tier", "An error message"],
              correctAnswerIndex: 1,
              explanation: "A prompt is the instruction or question you provide to the AI to get a response."
            },
            {
              question: "Which feature allows you to give ChatGPT persistent context across all chats?",
              options: ["Memory Storage", "Data Analysis", "Custom Instructions", "Voice Mode"],
              correctAnswerIndex: 2,
              explanation: "Custom Instructions allow you to set rules and context that ChatGPT will remember across all your new conversations."
            },
            {
              question: "True or False: ChatGPT can occasionally hallucinate facts.",
              options: ["True", "False"],
              correctAnswerIndex: 0,
              explanation: "True. AI models can confidently present incorrect or fabricated information, known as a 'hallucination'."
            },
            {
              question: "What is the primary image generation model built into ChatGPT?",
              options: ["Midjourney", "Stable Diffusion", "DALL-E 3", "Imagen"],
              correctAnswerIndex: 2,
              explanation: "ChatGPT uses OpenAI's DALL-E 3 model for generating images directly within the chat interface."
            }
          ]
        }
      ];


    case 'claude-introduction':
      return [
        { type: 'heading', title: "Introduction to Claude", level: 1, id: 'heading-1' },
        { type: 'paragraph', content: "Claude is an AI assistant built by Anthropic. You can chat with it to get help writing, coding, analyzing data, summarizing documents, brainstorming ideas, and much more.", id: 'p-2' },
        { type: 'paragraph', content: "Claude is available in a few different places:", id: 'p-3' },
        { type: 'list', items: ["Claude.ai — the web and mobile chat app for everyday use","Claude Code — a coding assistant for developers","Claude API / Console — for building your own apps powered by Claude"], id: 'list-4' },
        { type: 'paragraph', content: "Anthropic focuses heavily on safety, so Claude is designed to be helpful while avoiding harmful or misleading answers.", id: 'p-5' },
      ];

    case 'claude-create-account':
      return [
        { type: 'heading', title: "Create an Account", level: 1, id: 'heading-6' },
        { type: 'paragraph', content: "Getting started takes less than a minute:", id: 'p-7' },
        { type: 'list', items: ["Go to claude.ai","Click 'Sign up' and enter your email address (or continue with Google)","Verify your email using the code sent to you","Add your name and you're in — free plan starts automatically"], id: 'list-8' },
        { type: 'paragraph', content: "You can upgrade to Pro, Team, or Enterprise later for higher usage limits and extra features like more Projects and priority access to new models.", id: 'p-9' },
      ];

    case 'claude-interface':
      return [
        { type: 'heading', title: "Interface Overview", level: 1, id: 'heading-10' },
        { type: 'paragraph', content: "Once you're logged in, the interface has a few key areas:", id: 'p-11' },
        { type: 'list', items: ["Left sidebar — new chat, chat history, Projects, and settings","Main chat window — where you type prompts and see Claude's replies","Message box — type your question here; you can attach files too","Model selector — usually near the message box, lets you pick Haiku, Sonnet, or Opus","Artifacts panel — opens on the right when Claude creates a document, code, or app for you"], id: 'list-12' },
        { type: 'paragraph', content: "Everything is designed to feel like a simple chat app, so you won't need training to get started.", id: 'p-13' },
      ];

    case 'claude-prompts':
      return [
        { type: 'heading', title: "Prompt Basics for Claude", level: 1, id: 'heading-14' },
        { type: 'paragraph', content: "A 'prompt' is just the message you type to Claude. The better your prompt, the better the answer.", id: 'p-15' },
        { type: 'heading', title: "Tips for good prompts", level: 2, id: 'h2-16' },
        { type: 'list', items: ["Be specific: say exactly what you want, and for whom","Give context: share background info Claude needs to help well","Break big tasks into steps if the task is complex","Ask Claude to ask you questions first if your request is unclear","Give examples of the style or format you want"], id: 'list-17' },
      ];

    case 'claude-system-prompts':
      return [
        { type: 'heading', title: "System Prompts", level: 1, id: 'heading-18' },
        { type: 'paragraph', content: "A system prompt is a set of instructions given to Claude before the conversation starts — it shapes how Claude behaves throughout the chat (tone, role, rules, constraints).", id: 'p-19' },
        { type: 'paragraph', content: "On claude.ai, this is available through 'Custom Instructions' / 'Project instructions'. On the API/Console, developers pass a system prompt directly in code.", id: 'p-20' },
        { type: 'list', items: ["Example: 'You are a friendly customer support agent for a shoe brand. Keep answers short and polite.'","System prompts are great for keeping Claude consistent across many conversations"], id: 'list-21' },
      ];

    case 'claude-file-uploads':
      return [
        { type: 'heading', title: "File Uploads", level: 1, id: 'heading-22' },
        { type: 'paragraph', content: "You can upload files directly into a chat and ask Claude to read, summarize, or work with them.", id: 'p-23' },
        { type: 'list', items: ["Supported types include PDF, Word (.docx), Excel (.xlsx), CSV, TXT, and images (PNG/JPG)","Click the '+' or paperclip icon near the message box to attach a file","Claude can extract text, analyze data, describe images, and combine multiple files in one answer"], id: 'list-24' },
        { type: 'paragraph', content: "For files you'll reuse often, upload them to a Project's Knowledge base instead of re-uploading every time.", id: 'p-25' },
      ];

    case 'claude-artifacts':
      return [
        { type: 'heading', title: "Claude Artifacts", level: 1, id: 'heading-26' },
        { type: 'paragraph', content: "Artifacts are a special panel where Claude places substantial content — code, documents, slides, or interactive apps — separately from the chat, so you can view, edit, and reuse it easily.", id: 'p-27' },
        { type: 'list', items: ["Great for: web pages, React components, long documents, diagrams, and data visualizations","You can ask Claude to revise an Artifact and it updates in place","Artifacts can be downloaded or copied out of Claude.ai"], id: 'list-28' },
      ];

    case 'claude-data-analysis':
      return [
        { type: 'heading', title: "Data Analysis", level: 1, id: 'heading-29' },
        { type: 'paragraph', content: "Claude can analyze data files directly in chat — for example a CSV or Excel file of sales numbers.", id: 'p-30' },
        { type: 'list', items: ["Upload your data file and ask a question in plain English, e.g. 'Which product sold best each month?'","Claude can write and run code behind the scenes to calculate answers accurately","It can also generate charts and tables to visualize trends"], id: 'list-31' },
      ];

    case 'claude-projects':
      return [
        { type: 'heading', title: "Projects in Claude", level: 1, id: 'heading-32' },
        { type: 'paragraph', content: "A Project is a persistent workspace that keeps context, instructions, and files together so you don't have to re-explain yourself every time.", id: 'p-33' },
        { type: 'list', items: ["Create a Project from the sidebar, give it a name and description","Add 'Project knowledge' — documents Claude should always know about","Add custom instructions describing tone, role, and rules for that Project","Every new chat inside the Project automatically uses this context"], id: 'list-34' },
        { type: 'paragraph', content: "Projects are useful for recurring work: a specific client, a course, a codebase, or an ongoing writing project.", id: 'p-35' },
      ];

    case 'claude-workbench':
      return [
        { type: 'heading', title: "Claude Workbench", level: 1, id: 'heading-36' },
        { type: 'paragraph', content: "The Workbench is a developer tool inside the Anthropic Console (console.anthropic.com) — separate from claude.ai — used to test prompts before building them into an app.", id: 'p-37' },
        { type: 'list', items: ["Write a system prompt and test messages, then see Claude's live response","Adjust settings like model choice, temperature, and max tokens","Export your exact setup as ready-to-use Python, TypeScript, or cURL code"], id: 'list-38' },
        { type: 'paragraph', content: "This is aimed at developers building products with the Claude API, not regular chat users.", id: 'p-39' },
      ];

    case 'claude-models':
      return [
        { type: 'heading', title: "Sonnet vs Opus vs Haiku", level: 1, id: 'heading-40' },
        { type: 'paragraph', content: "Anthropic offers a few different Claude models, each suited to different needs:", id: 'p-41' },
        { type: 'paragraph', content: "Simple rule of thumb: use Haiku for speed, Sonnet for daily driving, and Opus when accuracy on a hard problem matters more than speed or cost.", id: 'p-42' },
      ];

    case 'claude-coding':
      return [
        { type: 'heading', title: "Coding with Claude", level: 1, id: 'heading-43' },
        { type: 'paragraph', content: "Claude is strong at writing, explaining, and debugging code across most popular languages.", id: 'p-44' },
        { type: 'list', items: ["Paste code and ask Claude to explain, fix bugs, or optimize it","Ask for a full feature and Claude can generate multi-file projects","Use Artifacts to preview web apps (HTML/React) directly in the chat","Developers who code often can also use Claude Code, a dedicated command-line coding agent"], id: 'list-45' },
      ];

    case 'claude-best-use-cases':
      return [
        { type: 'heading', title: "Best Use Cases", level: 1, id: 'heading-46' },
        { type: 'paragraph', content: "Some of the most popular ways people use Claude:", id: 'p-47' },
        { type: 'list', items: ["Writing: emails, blog posts, reports, resumes","Coding: building apps, debugging, learning new languages","Research: summarizing articles, comparing options, brainstorming","Data work: cleaning spreadsheets, finding trends, building charts","Learning: explaining tough concepts in simple terms"], id: 'list-48' },
      ];

    case 'claude-mistakes':
      return [
        { type: 'heading', title: "Common Mistakes", level: 1, id: 'heading-49' },
        { type: 'paragraph', content: "Avoiding these will get you much better results:", id: 'p-50' },
        { type: 'list', items: ["Writing one-line vague prompts and expecting a perfect answer","Not correcting Claude when the first answer isn't quite right — just ask it to revise","Starting a new chat every time instead of using a Project for repeated work","Not double-checking important facts, numbers, or citations before using them"], id: 'list-51' },
      ];

    case 'claude-quiz':
      return [
        { type: 'heading', title: "Quiz — Test Yourself", level: 1, id: 'heading-52' },
        { type: 'paragraph', content: "Answer these to check your understanding (answers are at the end):", id: 'p-53' },
        { type: 'list', items: ["1. What is a Project used for in Claude?","2. Which model would you pick for the fastest, simplest replies?","3. Where do Artifacts appear when Claude creates them?","4. True or False: A system prompt is set only for one single message.","5. Which tool lets developers test prompts before writing code — claude.ai or the Workbench?"], id: 'list-54' },
        { type: 'heading', title: "Answer Key", level: 2, id: 'h2-55' },
        { type: 'list', items: ["1. To keep context, instructions, and files together for recurring work","2. Haiku","3. In the Artifacts panel, next to the chat","4. False — it applies to the whole conversation/Project","5. The Workbench"], id: 'list-56' },
      ];


    case 'cursor-introduction':
      return [
        { type: 'heading', title: 'What is Cursor?', level: 1, id: 'cursor-intro' },
        { type: 'paragraph', content: 'Cursor is an AI-first code editor built as a fork of VS Code. It is designed to significantly speed up your development workflow by integrating AI deeply into the IDE rather than just as a sidebar chat plugin.', id: 'cursor-intro-p1' },
        { type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_30_12%20PM.png', alt: 'Cursor IDE', caption: 'The Cursor Code Editor', id: 'cursor-img-1' },
        { type: 'heading', title: 'Why switch to Cursor?', level: 2, id: 'cursor-intro-h2' },
        { type: 'list', items: ['Familiar interface: If you know VS Code, you already know Cursor.', 'Full codebase awareness: Cursor can index your entire repository to answer complex architecture questions.', 'Inline editing: Hit Cmd+K to edit code exactly where your cursor is.', 'Privacy: Cursor offers a privacy mode so your code is not stored or used for training.'], id: 'cursor-intro-list' },
        { type: 'callout', variant: 'success', title: 'Compatibility', content: 'All your VS Code extensions, themes, and keybindings work out-of-the-box in Cursor.', id: 'cursor-intro-callout' }
      ];

    case 'cursor-setup':
      return [
        { type: 'heading', title: 'Installation & Setup', level: 1, id: 'cursor-setup' },
        { type: 'paragraph', content: 'Getting started with Cursor takes only a few minutes.', id: 'cursor-setup-p1' },
        { type: 'list', items: ['Download the installer from cursor.com (available for Mac, Windows, and Linux).', 'Run the installer.', 'On first launch, you will be prompted to import your VS Code extensions and settings. Click Yes to seamlessly transition.', 'Sign in or create an account to access Pro features like Claude 3.5 Sonnet and GPT-4o.'], id: 'cursor-setup-list' },
        { type: 'callout', variant: 'info', title: 'Migrating from VS Code', content: 'You do not need to uninstall VS Code. Cursor installs alongside it as a separate application.', id: 'cursor-setup-callout' }
      ];

    case 'cursor-interface':
      return [
        { type: 'heading', title: 'Interface Overview', level: 1, id: 'cursor-interface' },
        { type: 'paragraph', content: 'Because Cursor is a fork of VS Code, the main interface is identical: Activity Bar on the left, Editor in the middle, and Panel at the bottom.', id: 'cursor-interface-p1' },
        { type: 'heading', title: 'The AI Additions', level: 2, id: 'cursor-interface-h2' },
        { type: 'list', items: ['**Chat Panel (Cmd+L):** A dedicated AI chat window that docks on the right or left side.', '**Cmd+K Inline Prompt:** A floating input bar that appears directly over your code to generate or edit lines in place.', '**Terminal Chat:** Hit Cmd+K inside the terminal to ask how to fix build errors or execute commands.'], id: 'cursor-interface-list' }
      ];

    case 'cursor-cmd-k':
      return [
        { type: 'heading', title: 'Code Generation (Cmd+K)', level: 1, id: 'cursor-cmdk' },
        { type: 'paragraph', content: 'Cmd+K (or Ctrl+K on Windows) is your superpower in Cursor. It opens a floating prompt right in your editor.', id: 'cursor-cmdk-p1' },
        { type: 'list', items: ['**To Generate:** Go to a new line, hit Cmd+K, and type what you want (e.g., "Create a fast inverse square root function").', '**To Edit:** Highlight existing code, hit Cmd+K, and tell Cursor how to modify it (e.g., "Refactor this to use async/await").', '**Accept/Reject:** Cursor shows a beautiful inline diff. Hit Enter to accept, or Esc to reject.'], id: 'cursor-cmdk-list' },
        { type: 'prompt', content: 'Add error handling to this API fetch block and log the status code.', copyEnabled: true, id: 'cursor-cmdk-prompt' }
      ];

    case 'cursor-chat':
      return [
        { type: 'heading', title: 'Chat & Context (Cmd+L)', level: 1, id: 'cursor-chat' },
        { type: 'paragraph', content: 'Cmd+L opens the Chat panel. The true power of Cursor chat is how you provide it with context.', id: 'cursor-chat-p1' },
        { type: 'heading', title: 'Using the @ Symbol', level: 2, id: 'cursor-chat-h2' },
        { type: 'list', items: ['**@Files:** Type @ followed by a filename to force the AI to read that specific file before answering.', '**@Folders:** Feed an entire folder to the context window.', '**@Docs:** Search and inject external documentation (like Next.js or React docs) directly into the chat.', '**@Web:** Ask Cursor to search the internet for the latest information to answer your coding question.'], id: 'cursor-chat-list' },
        { type: 'callout', variant: 'warning', title: 'Context Window Limits', content: 'While you can @ tag many files, tagging too many large files will exhaust the context window and dilute the AIs focus.', id: 'cursor-chat-callout' }
      ];

    case 'cursor-indexing':
      return [
        { type: 'heading', title: 'Codebase Indexing', level: 1, id: 'cursor-indexing' },
        { type: 'paragraph', content: 'Cursor can index your entire codebase locally so the AI understands how all your files connect.', id: 'cursor-index-p1' },
        { type: 'list', items: ['Open Cursor Settings (gear icon) > Codebase.', 'Click "Compute Index".', 'Once finished, you can use the chat and press the "Codebase" button (or type @Codebase) to ask architectural questions.'], id: 'cursor-index-list' },
        { type: 'prompt', content: 'Where is the authentication logic handled in this project, and which files do I need to update to add a new OAuth provider?', copyEnabled: true, id: 'cursor-index-prompt' }
      ];

    case 'cursor-debugging':
      return [
        { type: 'heading', title: 'Debugging with Cursor', level: 1, id: 'cursor-debug' },
        { type: 'paragraph', content: 'Cursor significantly reduces the time spent on StackOverflow by bringing debugging straight to the editor.', id: 'cursor-debug-p1' },
        { type: 'list', items: ['**Auto-Fix Lint Errors:** Hover over a red underline (TypeScript/ESLint error) and click "Fix with AI".', '**Terminal Errors:** When a build script fails, click the small "AI Fix" badge in the terminal to let Cursor analyze the stack trace.', '**Console Logs:** Paste browser console errors into Cmd+L chat and @ tag the suspected file.'], id: 'cursor-debug-list' }
      ];

    case 'cursor-refactoring':
      return [
        { type: 'heading', title: 'Refactoring Code', level: 1, id: 'cursor-refactor' },
        { type: 'paragraph', content: 'Refactoring large blocks of code is risky. Cursor makes it safe by generating clean, precise diffs.', id: 'cursor-refactor-p1' },
        { type: 'list', items: ['Highlight the entire function.', 'Hit Cmd+K.', 'Instruct the AI on the refactoring pattern you want.'], id: 'cursor-refactor-list' },
        { type: 'prompt', content: 'Refactor this class component into a functional component using React Hooks (useState and useEffect). Ensure no lifecycle methods are left behind.', copyEnabled: true, id: 'cursor-refactor-prompt' },
        { type: 'callout', variant: 'info', title: 'Review Diffs Carefully', content: 'Always review the red/green diff view before hitting Enter. The AI might occasionally delete an important comment or log.', id: 'cursor-refactor-callout' }
      ];

    case 'cursor-terminal':
      return [
        { type: 'heading', title: 'Terminal Usage', level: 1, id: 'cursor-terminal' },
        { type: 'paragraph', content: 'You can use AI directly inside the integrated terminal.', id: 'cursor-terminal-p1' },
        { type: 'paragraph', content: 'Press Cmd+K while the terminal is focused. Instead of editing code, the prompt will generate terminal commands.', id: 'cursor-terminal-p2' },
        { type: 'prompt', content: 'Find all zombie processes listening on port 3000 and kill them.', copyEnabled: true, id: 'cursor-terminal-prompt' },
        { type: 'list', items: ['Cursor will output the exact bash/powershell command.', 'Press Enter to execute it immediately.', 'It understands your current OS (Mac vs Windows).'], id: 'cursor-terminal-list' }
      ];

    case 'cursor-models':
      return [
        { type: 'heading', title: 'Using External Models', level: 1, id: 'cursor-models' },
        { type: 'paragraph', content: 'Cursor allows you to switch between the best LLMs on the market.', id: 'cursor-models-p1' },
        { type: 'list', items: ['**Claude 3.5 Sonnet:** Currently the best model for coding and logic.', '**GPT-4o:** Great for general questions and fast generation.', '**Cursor Small:** A lightning-fast, custom-trained model for tiny, quick edits.'], id: 'cursor-models-list' },
        { type: 'paragraph', content: 'You can switch models in the Chat Panel by clicking the model name dropdown.', id: 'cursor-models-p2' }
      ];

    case 'cursor-custom-prompts':
      return [
        { type: 'heading', title: 'Custom Prompts & Rules', level: 1, id: 'cursor-custom' },
        { type: 'paragraph', content: 'You can define global rules for Cursor so it always writes code in your preferred style.', id: 'cursor-custom-p1' },
        { type: 'list', items: ['Go to Settings > General > Rules for AI.', 'Enter your coding standards.', 'Alternatively, create a .cursorrules file in the root of your project.'], id: 'cursor-custom-list' },
        { type: 'prompt', content: 'Always use TypeScript strict mode. Prefer functional components over classes. Use TailwindCSS for all styling. Never use default exports.', copyEnabled: true, id: 'cursor-custom-prompt' }
      ];

    case 'cursor-extensions':
      return [
        { type: 'heading', title: 'Best Extensions', level: 1, id: 'cursor-ext' },
        { type: 'paragraph', content: 'Since Cursor is built on VS Code, the extension ecosystem is fully available.', id: 'cursor-ext-p1' },
        { type: 'list', items: ['**Prettier:** Essential for keeping AI-generated code formatted correctly.', '**ESLint / SonarLint:** Catches syntax errors that the AI might accidentally introduce.', '**GitLens:** Helps you track who wrote what (you or the AI!).'], id: 'cursor-ext-list' },
        { type: 'callout', variant: 'success', title: 'GitHub Copilot', content: "You can run GitHub Copilot alongside Cursor, but most users find that Cursor's built-in Copilot++ autocomplete feature is actually faster and smarter.", id: 'cursor-ext-callout' }
      ];

    case 'cursor-workflows':
      return [
        { type: 'heading', title: 'Advanced Workflows', level: 1, id: 'cursor-workflows' },
        { type: 'paragraph', content: 'Combine features to become a 10x developer.', id: 'cursor-work-p1' },
        { type: 'list', items: ['**The PR Reviewer:** Paste a Git diff into Cmd+L and ask "Find bugs in this PR".', '**The Test Writer:** Highlight a complex function, hit Cmd+K, and type "Write exhaustive Jest unit tests for this block".', '**The Documenter:** Use Cmd+K at the top of a file and type "Add JSDoc comments to all functions".'], id: 'cursor-work-list' }
      ];

    case 'cursor-mistakes':
      return [
        { type: 'heading', title: 'Common Mistakes', level: 1, id: 'cursor-mistakes' },
        { type: 'paragraph', content: 'Avoid these traps when using AI to code:', id: 'cursor-mistakes-p1' },
        { type: 'list', items: ['**Blind Acceptance:** Never blindly accept a Cmd+K diff without reading it. The AI can hallucinate variables that do not exist.', '**Lazy Prompts:** "Fix this" is a bad prompt. "Fix the null pointer exception when user array is empty" is a good prompt.', '**Ignoring Architecture:** Cursor is smart, but it cannot design a scalable microservices architecture for you. You must drive the high-level design.'], id: 'cursor-mistakes-list' }
      ];

    case 'cursor-quiz':
      return [
        { type: 'heading', title: 'Cursor Knowledge Quiz', level: 1, id: 'cursor-quiz' },
        { type: 'paragraph', content: 'Test your understanding of the Cursor IDE.', id: 'cursor-quiz-p1' },
        { 
          type: 'quiz', 
          id: 'cursor-interactive-quiz',
          questions: [
            {
              question: "What is the primary keyboard shortcut to edit code inline using AI in Cursor?",
              options: ["Cmd+C", "Cmd+L", "Cmd+K", "Cmd+Shift+P"],
              correctAnswerIndex: 2,
              explanation: "Cmd+K (or Ctrl+K on Windows) opens the inline AI code generation input box."
            },
            {
              question: "Which feature allows Cursor to answer questions about how your entire project is structured?",
              options: ["Terminal Chat", "Codebase Indexing", "Prettier Extension", "Live Share"],
              correctAnswerIndex: 1,
              explanation: "Codebase Indexing parses all files in your repository so the AI understands the global context."
            },
            {
              question: "How do you force the Chat panel to read a specific file before answering?",
              options: ["Drag and drop the file into the chat", "Type @ followed by the filename", "Right-click the file and select 'Read'", "It happens automatically without tagging"],
              correctAnswerIndex: 1,
              explanation: "Using the @ symbol allows you to explicitly tag files, folders, or docs to provide context."
            }
          ]
        }
      ];


    case 'gemini-introduction':
      return [
        { type: 'heading', title: 'What is Google Gemini?', level: 1, id: 'gemini-intro-h1' },
        { type: 'paragraph', content: 'Gemini is Google\'s most capable and general AI model yet. Built from the ground up to be multimodal, it can generalize and seamlessly understand, operate across, and combine different types of information including text, code, audio, image, and video.', id: 'gemini-intro-p1' },
        { type: 'heading', title: 'Why use Gemini?', level: 2, id: 'gemini-intro-h2' },
        { type: 'list', items: ['**Deep Ecosystem Integration:** Works seamlessly inside Google Docs, Gmail, and Google Drive.', '**Multimodal Native:** It doesn\'t just convert images to text; it understands images and audio natively.', '**Real-time Web Access:** Powered by Google Search, Gemini can pull the most up-to-date information from the web instantly.'], id: 'gemini-intro-list' },
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
        { type: 'list', items: ['**Main Chat Area:** Where your conversation happens. You will notice Google\'s signature playful animations when Gemini is "thinking".', '**Input Box:** Type text, use the microphone to speak, or upload images/documents using the "+" icon.', '**Recent Chats:** Located on the left sidebar to resume past conversations.', '**Extensions:** Accessible via the settings gear, allowing you to connect Gemini to Flights, Hotels, and Workspace.'], id: 'gemini-interface-list' },
        { type: 'callout', variant: 'info', title: 'Double-Check Responses', content: 'Gemini has a unique "G" button below its answers. Clicking this makes Gemini Google its own answer to verify the facts, highlighting corroborated text in green and questionable text in orange.', id: 'gemini-interface-callout' }
      ];

    case 'gemini-prompts':
      return [
        { type: 'heading', title: 'Prompt Basics for Gemini', level: 1, id: 'gemini-prompts-h1' },
        { type: 'paragraph', content: 'Writing good prompts for Gemini involves being clear, specific, and taking advantage of its web-search capabilities.', id: 'gemini-prompts-p1' },
        { type: 'list', items: ['**Be direct:** You don\'t need to be overly polite. Give clear instructions.', '**Ask for current events:** Because it is tied to Google Search, you can ask for today\'s news or live data.', '**Iterate:** If the first answer isn\'t perfect, tell it exactly what to change.'], id: 'gemini-prompts-list' },
        { type: 'prompt', content: 'Search the web for the latest reviews of the iPhone 15 and summarize the top 3 pros and cons in a bulleted list.', copyEnabled: true, id: 'gemini-prompts-prompt' }
      ];

    case 'gemini-advanced':
      return [
        { type: 'heading', title: 'Gemini Advanced', level: 1, id: 'gemini-advanced-h1' },
        { type: 'paragraph', content: 'Gemini Advanced is Google\'s premium subscription tier, giving you access to their most capable AI model: Gemini 1.5 Pro.', id: 'gemini-advanced-p1' },
        { type: 'list', items: ['**Massive Context Window:** Gemini 1.5 Pro can process up to 1 million tokens (and sometimes 2 million). This means you can upload 1-hour videos, thousands of lines of code, or multiple full-length books.', '**Better Reasoning:** It is significantly better at complex logic, coding, and following multi-step instructions compared to the free tier.', '**Google One Integration:** The subscription includes 2TB of Google Drive cloud storage.'], id: 'gemini-advanced-list' },
        { type: 'callout', variant: 'warning', title: 'When to Upgrade', content: 'If you only use AI for drafting emails or quick questions, the free tier is plenty. Upgrade if you need to analyze massive documents or write complex software.', id: 'gemini-advanced-callout' }
      ];

    case 'gemini-workspace':
      return [
        { type: 'heading', title: 'Google Workspace Integration', level: 1, id: 'gemini-workspace-h1' },
        { type: 'paragraph', content: 'One of Gemini\'s biggest advantages is that it can read and interact with your personal Google Workspace data (if you allow it).', id: 'gemini-workspace-p1' },
        { type: 'list', items: ['**Gmail:** "Summarize the emails I received from John yesterday."', '**Docs:** "Create a project proposal based on the notes in @ProjectLaunchDoc."', '**Drive:** Gemini can search through your Drive to find specific PDFs or spreadsheets to answer your questions.'], id: 'gemini-workspace-list' },
        { type: 'prompt', content: 'Look at my recent emails about the upcoming team offsite and draft a reply confirming my attendance.', copyEnabled: true, id: 'gemini-workspace-prompt' },
        { type: 'callout', variant: 'success', title: 'Privacy Guarantee', content: 'Google explicitly states that your private Workspace data (emails, docs) is NOT used to train their public AI models.', id: 'gemini-workspace-callout' }
      ];

    case 'gemini-image-gen':
      return [
        { type: 'heading', title: 'Image Generation', level: 1, id: 'gemini-image-h1' },
        { type: 'paragraph', content: 'Gemini can generate high-quality images directly in the chat using Google\'s Imagen 3 model.', id: 'gemini-image-p1' },
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
        { type: 'paragraph', content: 'Pro Search is an advanced mode where Perplexity doesn\'t just search once—it breaks your question down, searches multiple times, and even asks you clarifying questions before answering.', id: 'perp-copilot-p1' },
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
        { type: 'list', items: ['**Model Selection:** Choose between GPT-4o, Claude 3.5 Sonnet, or Sonar (Perplexity\'s own model) to power your searches.', '**Unlimited Pro Search:** Over 300+ Pro Searches per day.', '**File Uploads:** Analyze unlimited files and images.'], id: 'perp-pro-list' }
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
        { type: 'list', items: ['**Creative Writing:** Don\'t ask Perplexity to write a poem or a novel (unless you use Writing mode). Its default behavior is to search the web, which ruins creative tasks.', '**Ignoring Citations:** Always hover over the citation numbers to verify the source is reputable (e.g., NYT vs a random blog).'], id: 'perp-mistakes-list' }
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
        { type: 'prompt', content: 'Role: [ROLE]\nTask: [TASK]\nFormat: [FORMAT]', copyEnabled: true, id: 'phub-creating-prompt' },
        { type: 'callout', variant: 'info', title: 'Documentation', content: 'Always add a description to your prompt explaining exactly what inputs it expects so your teammates can use it correctly.', id: 'phub-creating-callout' }
      ];

    case 'prompthub-variables':
      return [
        { type: 'heading', title: 'Variables & Templates', level: 1, id: 'phub-variables' },
        { type: 'paragraph', content: 'Variables make prompts reusable.', id: 'phub-variables-p1' },
        { type: 'list', items: ['Most hubs use double brackets {{variable_name}} to define dynamic inputs.', 'When you run the prompt, the hub replaces the brackets with the user\'s input.', 'Example: "Write a polite email to {{client_name}} apologizing for the delay in {{project_name}}."'], id: 'phub-variables-list' }
      ];

    case 'prompthub-system':
      return [
        { type: 'heading', title: 'System Prompts', level: 1, id: 'phub-system' },
        { type: 'paragraph', content: 'In a prompt hub, you usually separate the System Prompt from the User Prompt.', id: 'phub-system-p1' },
        { type: 'list', items: ['**System Prompt:** Defines the AI\'s persona, strict rules, and output format constraints.', '**User Prompt:** Contains the actual variables and the specific task for this single run.'], id: 'phub-system-list' }
      ];

    case 'prompthub-context':
      return [
        { type: 'heading', title: 'Context Window Management', level: 1, id: 'phub-context' },
        { type: 'paragraph', content: 'Prompt hubs help you manage token limits.', id: 'phub-context-p1' },
        { type: 'list', items: ['Hubs usually display a live Token Count as you type.', 'They warn you if your variables (like pasting a whole book) will exceed the selected model\'s context window.', 'You can attach static files (like a company brand guide) to the prompt so they are always included in the context.'], id: 'phub-context-list' }
      ];

    case 'prompthub-fewshot':
      return [
        { type: 'heading', title: 'Few-Shot Prompting', level: 1, id: 'phub-fewshot' },
        { type: 'paragraph', content: 'A powerful technique easily implemented in hubs is Few-Shot prompting: giving the AI examples of the desired output.', id: 'phub-fewshot-p1' },
        { type: 'prompt', content: 'Example 1: Input: "Happy" -> Output: "Positive"\nExample 2: Input: "Sad" -> Output: "Negative"\nNow do: Input: "{{user_word}}" -> Output:', copyEnabled: true, id: 'phub-fewshot-prompt' }
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
        { type: 'list', items: ['Prompt hubs allow A/B testing.', 'Run both prompt versions against a dataset of 10 different inputs.', 'Compare the outputs side-by-side to ensure the new prompt doesn\'t regress or break edge cases.'], id: 'phub-evaluation-list' }
      ];

    case 'prompthub-sharing':
      return [
        { type: 'heading', title: 'Sharing Prompts', level: 1, id: 'phub-sharing' },
        { type: 'paragraph', content: 'Hubs act as a team\'s internal AI wiki.', id: 'phub-sharing-p1' },
        { type: 'list', items: ['Share a URL with a teammate.', 'Teammates can use the prompt without needing to know how to write it or what the exact system instructions are.', 'If you update the prompt, everyone automatically uses the newest version.'], id: 'phub-sharing-list' }
      ];

    case 'prompthub-best-practices':
      return [
        { type: 'heading', title: 'Best Practices', level: 1, id: 'phub-best' },
        { type: 'paragraph', content: 'Tips for maintaining a healthy prompt hub:', id: 'phub-best-p1' },
        { type: 'list', items: ['**Tagging:** Always tag prompts (e.g., #engineering, #sales) so they don\'t get lost.', '**Deprecation:** Archive old prompts that no longer work well with newer models.', '**Modularize:** If you have a massive brand-voice instruction, keep it as a snippet and insert it into multiple prompts.'], id: 'phub-best-list' }
      ];

    case 'prompthub-mistakes':
      return [
        { type: 'heading', title: 'Common Mistakes', level: 1, id: 'phub-mistakes' },
        { type: 'paragraph', content: 'Avoid these errors in your team hub:', id: 'phub-mistakes-p1' },
        { type: 'list', items: ['**Hardcoding data:** Don\'t hardcode "2023 Q1 Report" into the prompt. Use a {{report_data}} variable so it works next quarter too.', '**Too many variables:** If a user has to fill out 15 text boxes to run a prompt, they won\'t use it.', '**No examples:** A prompt without Few-Shot examples will have highly variable output quality.'], id: 'phub-mistakes-list' }
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
    default:
      const toolSlug = slug.split('-')[0];
      const toolName = toolSlug.charAt(0).toUpperCase() + toolSlug.slice(1);
      
      let blocks: any[] = [];
      blocks.push({ type: 'heading', title: title, level: 1, id: 'fallback-heading' });

      if (slug.includes('-introduction')) {
        blocks.push({ type: 'paragraph', content: `Welcome to the complete guide on ${toolName}. In this lesson, we will cover the fundamentals and why it is considered one of the best AI tools available today.`, id: 'p1' });
        blocks.push({ type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_24_40%20PM.png', alt: `${toolName} Intro`, caption: `${toolName} Overview`, id: 'img1' });
        blocks.push({ type: 'heading', title: `Why use ${toolName}?`, level: 2, id: 'h2' });
        blocks.push({ type: 'list', items: ['Incredible reasoning capabilities', 'Boosts daily productivity', 'Easy to integrate into workflows', 'Continuously updated with new features'], id: 'l1' });
      } 
      else if (slug.includes('-interface') || slug.includes('-setup') || slug.includes('-account')) {
        blocks.push({ type: 'paragraph', content: `Understanding the interface and setup of ${toolName} is crucial for speed. The dashboard is designed to be minimalistic yet powerful.`, id: 'p1' });
        blocks.push({ type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/ChatGPT%20Image%20Aug%206%2C%202026%2C%2001_34_48%20PM.png', alt: `UI`, caption: `${toolName} Interface`, id: 'img1' });
        blocks.push({ type: 'callout', variant: 'info', title: 'Navigation Tip', content: 'Always check the left sidebar for your historical chats or projects.', id: 'c1' });
      }
      else if (slug.includes('-prompts') || slug.includes('-asking') || slug.includes('-cmd-k') || slug.includes('-system')) {
        blocks.push({ type: 'paragraph', content: `Prompting is how you communicate with ${toolName}. A good prompt is specific, provides context, and gives clear instructions.`, id: 'p1' });
        blocks.push({ type: 'prompt', content: `Act as an expert. Explain the core concept simply, using bullet points and professional tone.`, copyEnabled: true, id: 'pr1' });
        blocks.push({ type: 'callout', variant: 'success', title: 'Be Specific', content: 'The more details you provide, the better the AI can tailor its response.', id: 'c1' });
      }
      else if (slug.includes('-quiz')) {
        blocks.push({ type: 'paragraph', content: `Let's test what you've learned about ${toolName}.`, id: 'p1' });
        blocks.push({ 
          type: 'quiz', 
          id: 'quiz1',
          questions: [
            {
              question: `What is the primary purpose of ${toolName}?`,
              options: ["To play games", "To assist with tasks and boost productivity", "To replace hardware", "To browse offline"],
              correctAnswerIndex: 1,
              explanation: "AI tools are built to enhance and assist human workflows."
            },
            {
              question: "Which is a best practice when prompting?",
              options: ["Being as vague as possible", "Providing clear context and constraints", "Using only single words", "Typing in all caps"],
              correctAnswerIndex: 1,
              explanation: "Clear context helps the AI generate accurate responses."
            }
          ]
        });
      }
      else {
        blocks.push({ type: 'paragraph', content: `This lesson covers advanced concepts related to ${title}. By mastering this, you will unlock the full potential of ${toolName} and streamline your workflow.`, id: 'p1' });
        blocks.push({ type: 'image', url: 'https://pub-0a928134dcdc420da2af02e6238ef06b.r2.dev/chatgpt-voicemode-mockup.png', alt: title, caption: `${title} visual overview`, id: 'img1' });
        blocks.push({ type: 'heading', title: 'Key Takeaways', level: 2, id: 'h2' });
        blocks.push({ type: 'list', items: ['Practice makes perfect', 'Experiment with different settings', 'Stay updated with new releases', 'Combine techniques for best results'], id: 'l1' });
        blocks.push({ type: 'callout', variant: 'warning', title: 'Remember', content: 'AI is a tool to assist you, not to completely replace human judgment. Always verify important outputs.', id: 'c1' });
      }
      
      return blocks;
  }
}
