const fs = require('fs');

const tsData = fs.readFileSync('../frontend/lib/toolsData.ts', 'utf-8');
const slugs = [];
const names = {};
const regex = /name:\s*['"]([^'"]+)['"][\s\S]*?slug:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(tsData)) !== null) {
  let slug = match[2];
  if (slug.startsWith('/tools/')) {
    slug = slug.replace('/tools/', '');
  }
  names[slug] = match[1];
  slugs.push(slug);
}
console.log('Frontend slugs:', slugs.length);

const backendData = JSON.parse(fs.readFileSync('./tools_data.json', 'utf-8'));
const backendSlugs = backendData.map(t => t.slug);
console.log('Backend slugs:', backendSlugs.length);

const missing = slugs.filter(s => !backendSlugs.includes(s));
console.log('Missing in backend:', missing);

// Update tools_data.json
for (const slug of missing) {
  backendData.push({
    name: names[slug] || slug,
    slug: slug
  });
}

fs.writeFileSync('./tools_data.json', JSON.stringify(backendData, null, 2));
console.log('Updated tools_data.json! Total now:', backendData.length);
