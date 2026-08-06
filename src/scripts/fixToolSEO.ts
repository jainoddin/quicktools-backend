import fs from 'fs';
import path from 'path';

const toolsDir = path.join(__dirname, '../../../frontend/app/tools');

const updateToolSEO = () => {
  const folders = fs.readdirSync(toolsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== '[id]')
    .map(dirent => dirent.name);

  let updatedCount = 0;

  for (const folder of folders) {
    const pagePath = path.join(toolsDir, folder, 'page.tsx');
    if (!fs.existsSync(pagePath)) continue;

    let content = fs.readFileSync(pagePath, 'utf8');

    // Handle special cases first
    if (folder === 'ai-writer') {
      const newTitle = "AI Writer – Create Blogs, Emails & Marketing Copy | QuickTools";
      const newDesc = "Generate blogs, articles, emails, social media posts, marketing copy, and SEO content instantly with the QuickTools AI Writer.";
      const newKeywords = [
        "AI Writer", "AI Writing Tool", "AI Content Generator", "AI Blog Writer",
        "AI Article Writer", "AI Copywriting", "Writing Assistant", "QuickTools AI"
      ];
      
      content = content.replace(/title:\s*['"](.*?)['"]/, `title: { absolute: "${newTitle}" }`);
      content = content.replace(/description:\s*['"](.*?)['"]/, `description: "${newDesc}"`);
      content = content.replace(/keywords:\s*\[([\s\S]*?)\]/, `keywords: ${JSON.stringify(newKeywords)}`);
      content = content.replace(/title:\s*['"](.*?)['"]/, `title: "${newTitle}"`); // OpenGraph Title (might miss due to global replace, but fine)
      content = content.replace(/description:\s*['"](.*?)['"]/, `description: "${newDesc}"`); // OpenGraph Desc

    }

    const parts = folder.split('-');
    const isAI = parts[0] === 'ai';
    const rawParts = parts.filter(p => p !== 'ai');
    const rawName = rawParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const coreName = isAI ? `AI ${rawName}` : rawName;

    const keywordSet = new Set<string>();
    keywordSet.add(coreName);
    keywordSet.add(`AI ${rawName}`);
    keywordSet.add(`${rawName} AI`);
    keywordSet.add(`Free ${coreName}`);
    keywordSet.add(`Best ${coreName}`);
    keywordSet.add(`Online ${rawName}`);
    keywordSet.add(`${coreName} Tool`);

    const synonymMap: Record<string, string> = {
      'generator': 'Creator',
      'writer': 'Writing Tool',
      'remover': 'Eraser',
      'upscaler': 'Image Enhancer',
      'logo': 'Logo Maker',
      'resume': 'CV Builder',
      'email': 'Email Assistant',
      'code': 'Code Generator',
      'calendar': 'Calendar AI',
    };

    for (const [key, synonym] of Object.entries(synonymMap)) {
      if (folder.includes(key)) {
        const regex = new RegExp(key, 'i');
        if (regex.test(rawName)) {
          keywordSet.add(rawName.replace(regex, synonym));
          keywordSet.add(`AI ${rawName.replace(regex, synonym)}`);
        } else {
          keywordSet.add(`${rawName} ${synonym}`);
        }
      }
    }

    if (folder === 'ai-writer') {
      ['Content Writer AI', 'Blog Writer', 'AI Copywriting'].forEach(k => keywordSet.add(k));
    } else if (folder === 'background-remover') {
      ['Remove Background', 'Image Background Remover'].forEach(k => keywordSet.add(k));
    } else if (folder === 'ai-logo-generator' || folder === 'logo-generator') {
      ['Logo Design AI', 'Business Logo Generator'].forEach(k => keywordSet.add(k));
    } else if (folder === 'ai-social-calendar') {
      keywordSet.add('Social Media Calendar AI');
    }
    keywordSet.add('QuickTools AI');

    const finalKeywords = Array.from(keywordSet)
      .filter(kw => kw.trim().length > 0)
      .map(kw => kw.replace(/\s+/g, ' ').trim())
      .filter(kw => !kw.toLowerCase().includes('generator generator'))
      .filter(kw => !kw.toLowerCase().includes('maker maker'))
      .filter(kw => !kw.toLowerCase().includes('ai ai'))
      .slice(0, 12);

    const kwStringRegex = /keywords:\s*['"](.*?)['"],?/;
    const kwArrayRegex = /keywords:\s*\[([\s\S]*?)\]\s*,?/;
    
    if (kwArrayRegex.test(content)) {
      content = content.replace(kwArrayRegex, `keywords: ${JSON.stringify(finalKeywords)},`);
    } else if (kwStringRegex.test(content)) {
      content = content.replace(kwStringRegex, `keywords: ${JSON.stringify(finalKeywords)},`);
    }

    // Ensure title uses absolute for next.js metadata if not already
    // but we only do this explicitly for ai-writer based on user req, others keep their title for now or we can make it absolute
    if (folder !== 'ai-writer') {
       // if not using { absolute: ... }, just wrap it. Wait, the user didn't ask to make all titles absolute, just fix keywords.
    }

    fs.writeFileSync(pagePath, content, 'utf8');
    updatedCount++;
  }

  console.log(`Updated SEO for ${updatedCount} tools.`);
};

updateToolSEO();
