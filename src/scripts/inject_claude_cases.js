const fs = require('fs');

let text = fs.readFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\claude_cases_output.txt', 'utf8');

const slugMap = {
  'claude-introduction-to-claude': 'claude-introduction',
  'claude-create-an-account': 'claude-create-account',
  'claude-interface-overview': 'claude-interface',
  'claude-prompt-basics-for-claude': 'claude-prompts',
  'claude-system-prompts': 'claude-system-prompts',
  'claude-file-uploads': 'claude-file-uploads',
  'claude-claude-artifacts': 'claude-artifacts',
  'claude-data-analysis': 'claude-data-analysis',
  'claude-projects-in-claude': 'claude-projects',
  'claude-claude-workbench': 'claude-workbench',
  'claude-sonnet-vs-opus-vs-haiku': 'claude-models',
  'claude-coding-with-claude': 'claude-coding',
  'claude-best-use-cases': 'claude-best-use-cases',
  'claude-common-mistakes': 'claude-mistakes',
  'claude-quiz-test-yourself': 'claude-quiz'
};

for (const [oldSlug, newSlug] of Object.entries(slugMap)) {
  text = text.replace(`case '${oldSlug}':`, `case '${newSlug}':`);
}

let lessonContent = fs.readFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', 'utf8');

lessonContent = lessonContent.replace('    default:', text + '    default:');

fs.writeFileSync('c:\\Users\\jain\\.gemini\\antigravity\\scratch\\quicktools-project\\backend\\src\\scripts\\lesson-content.ts', lessonContent);
console.log('Successfully injected Claude blocks into lesson-content.ts!');
