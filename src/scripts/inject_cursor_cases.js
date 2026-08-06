const fs = require('fs');

const cursorCases = `
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
        { type: 'callout', variant: 'success', title: 'GitHub Copilot', content: 'You can run GitHub Copilot alongside Cursor, but most users find that Cursor\'s built-in Copilot++ autocomplete feature is actually faster and smarter.', id: 'cursor-ext-callout' }
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
`;

let lessonContent = fs.readFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', 'utf8');

// Inject right before "default:"
lessonContent = lessonContent.replace('    default:', cursorCases + '\n    default:');

fs.writeFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', lessonContent);
console.log('Successfully injected Cursor blocks into lesson-content.ts!');
