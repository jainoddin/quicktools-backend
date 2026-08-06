import * as cheerio from 'cheerio';
import InternalLinkSuggestion from '../models/InternalLinkSuggestion';
import { Article } from '../models/Article';

// Simplified Entity/Keyword dictionary mapping to URLs
// In a real AI system, this might call an LLM or use NLP to extract entities.
// Here we use a rule-based matching system to suggest contextual links.
const KEYWORD_MAP: Record<string, string> = {
  'seo tools': 'https://quicktool.space/tools',
  'ai content generation': 'https://quicktool.space/tools/ai-writer',
  'image background removal': 'https://quicktool.space/tools/background-remover',
  'keyword research': 'https://quicktool.space/articles/keyword-research-guide',
  // etc
};

const MAX_LINKS_PER_PAGE = 6;
const FORBIDDEN_WORDS = ['ai', 'tool', 'learn', 'click', 'here', 'app'];

export async function generateInternalLinkSuggestions(sourceContentId: string, sourceType: string, htmlContent: string) {
  const $ = cheerio.load(htmlContent);
  const suggestions: { anchorText: string, destinationUrl: string, blockId: string }[] = [];

  // 1. Identify text nodes outside of headings, code, quotes, and existing links
  const forbiddenSelectors = 'h1, h2, h3, h4, h5, h6, code, pre, blockquote, a';
  
  $('p, li').not(forbiddenSelectors).each((i, el) => {
    // Generate a pseudo block ID for location
    const blockId = `block_${i}`;
    const text = $(el).text();
    
    // Check against keyword map
    for (const [keyword, url] of Object.entries(KEYWORD_MAP)) {
      if (suggestions.length >= MAX_LINKS_PER_PAGE) break;
      
      // Ensure we don't repeat destination URLs
      if (suggestions.some(s => s.destinationUrl === url)) continue;

      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(text)) {
        // Exclude generic anchors
        if (FORBIDDEN_WORDS.includes(keyword.toLowerCase())) continue;

        suggestions.push({
          anchorText: keyword,
          destinationUrl: url,
          blockId
        });
      }
    }
  });

  // 2. Validate Targets and Save Suggestions
  for (const suggestion of suggestions) {
    try {
      // In production, you would verify published status, canonical, indexable, and HTTP 200 here.
      // E.g., await fetchUrl(suggestion.destinationUrl);
      const isTargetValid = true; // Placeholder for HTTP 200 / Published check
      
      if (isTargetValid) {
        await InternalLinkSuggestion.updateOne(
          { sourceContentId, destinationUrl: suggestion.destinationUrl },
          {
            $setOnInsert: {
              sourceType,
              destinationType: 'URL',
              anchorText: suggestion.anchorText,
              relevanceScore: 0.85,
              blockId: suggestion.blockId,
              status: 'suggested'
            }
          },
          { upsert: true }
        );
      }
    } catch (e) {
      console.error(`Target validation failed for ${suggestion.destinationUrl}`);
    }
  }

  return suggestions.length;
}
