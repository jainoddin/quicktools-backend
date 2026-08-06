const mammoth = require('mammoth');
const cheerio = require('cheerio');
const fs = require('fs');

async function main() {
  const result = await mammoth.convertToHtml({ path: 'C:\\Users\\jain\\Downloads\\Claude_A-Z_Guide.docx' });
  const html = result.value;
  const $ = cheerio.load(html);
  
  let cases = '';
  let currentCase = '';
  let currentSlug = '';
  let blockId = 0;
  
  function getSlug(text) {
    text = text.replace(/^\d+\.\s*/, ''); // remove "1. "
    return 'claude-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  $('body').children().each((i, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().trim();
    
    if (tag === 'h1') {
      if (currentCase) {
        cases += currentCase + `      ];\n\n`;
      }
      currentSlug = getSlug(text);
      let title = text.replace(/^\d+\.\s*/, '');
      currentCase = `    case '${currentSlug}':\n      return [\n        { type: 'heading', title: ${JSON.stringify(title)}, level: 1, id: 'heading-${blockId++}' },\n`;
    } else if (tag === 'h2' || tag === 'h3') {
      if (currentCase) currentCase += `        { type: 'heading', title: ${JSON.stringify(text)}, level: 2, id: 'h2-${blockId++}' },\n`;
    } else if (tag === 'p' && text) {
      if (text.startsWith('Prompt:')) {
        currentCase += `        { type: 'prompt', content: ${JSON.stringify(text.replace('Prompt:', '').trim())}, copyEnabled: true, id: 'prompt-${blockId++}' },\n`;
      } else {
        currentCase += `        { type: 'paragraph', content: ${JSON.stringify(text)}, id: 'p-${blockId++}' },\n`;
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const items = [];
      $(el).find('li').each((j, li) => items.push($(li).text().trim()));
      if (items.length > 0) {
        currentCase += `        { type: 'list', items: ${JSON.stringify(items)}, id: 'list-${blockId++}' },\n`;
      }
    }
  });
  
  if (currentCase) {
    cases += currentCase + `      ];\n\n`;
  }
  
  fs.writeFileSync('claude_cases_output.txt', cases);
  console.log('Done parsing! Check claude_cases_output.txt');
}

main().catch(console.error);
