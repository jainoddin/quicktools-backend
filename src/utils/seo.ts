import fetch from 'node-fetch';

/**
 * Pings IndexNow API to notify search engines about a new or updated URL.
 * 
 * @param url The fully qualified URL (e.g. https://quicktool.space/prompts/chatgpt/my-prompt)
 */
export async function pingIndexNow(url: string) {
  try {
    // In production, this should be a secure random string hosted at the root of the domain.
    // For now, we use a generic placeholder or an env variable.
    const hostKey = process.env.INDEXNOW_KEY || 'quicktools-indexnow-key-12345';
    
    const indexNowUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${hostKey}`;
    
    console.log(`[SEO] Pinging IndexNow for URL: ${url}`);
    
    const response = await fetch(indexNowUrl, {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log(`[SEO] IndexNow ping successful for ${url}`);
    } else {
      console.warn(`[SEO] IndexNow ping failed for ${url} with status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[SEO] Error pinging IndexNow for ${url}:`, error);
  }
}
