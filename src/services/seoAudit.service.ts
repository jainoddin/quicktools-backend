import axios from 'axios';
import * as cheerio from 'cheerio';
import { recordAuditIssue } from '../models/SEOAuditIssue';

const SEO_AUDIT_REQUEST_DELAY_MS = parseInt(process.env.SEO_AUDIT_REQUEST_DELAY_MS || '500');

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Safely fetch URL with one retry for transient network errors
async function fetchUrl(url: string): Promise<{ status: number; data: string | null; redirects: number }> {
  const attempt = async () => {
    const res = await axios.get(url, { timeout: 10000, maxRedirects: 5 });
    return {
      status: res.status,
      data: res.data as string,
      redirects: (res.request as any)?._redirectable?._redirectCount || 0
    };
  };

  try {
    return await attempt();
  } catch (err: any) {
    if (err.response) {
      return { status: err.response.status, data: null, redirects: 0 };
    }
    // Transient error (timeout/network) — retry once before giving up
    await delay(1500);
    try {
      return await attempt();
    } catch (err2: any) {
      // Two failures → mark as unreachable (NOT as confirmed 404)
      return { status: 0, data: null, redirects: 0 };
    }
  }
}

export async function auditSingleUrl(url: string, pageType: string) {
  await delay(SEO_AUDIT_REQUEST_DELAY_MS);

  const response = await fetchUrl(url);

  // Unreachable / timeout — do NOT classify as 404; just record as transient failure
  if (response.status === 0) {
    await recordAuditIssue(url, pageType, 'unreachable', 'warning',
      'Page was unreachable or timed out (may be transient). Will re-check next audit.',
    );
    return;
  }

  // Confirmed HTTP error (4xx/5xx)
  if (response.status >= 400) {
    await recordAuditIssue(url, pageType, 'http_error', 'critical',
      `Page returned HTTP ${response.status}.`, '200', response.status.toString()
    );
    return;
  }

  // Redirect chain check
  if (response.redirects > 2) {
    await recordAuditIssue(url, pageType, 'redirect_chain', 'warning',
      `Page has ${response.redirects} redirects (chains hurt crawl budget).`
    );
  }

  if (!response.data) return;

  const $ = cheerio.load(response.data);

  // ── Metadata checks ──────────────────────────────────────────────────────────
  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim();
  const canonical = $('link[rel="canonical"]').attr('href')?.trim();
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
  const robots = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';

  if (!title) {
    await recordAuditIssue(url, pageType, 'missing_title', 'critical', 'Page title is missing.');
  }
  if (!description || description.length < 50) {
    await recordAuditIssue(url, pageType, 'missing_description', 'warning',
      'Meta description is missing or too short (< 50 chars).', '>50 chars', description || 'none'
    );
  }
  if (!canonical) {
    await recordAuditIssue(url, pageType, 'missing_canonical', 'warning', 'Canonical tag is missing.');
  } else if (!canonical.startsWith('http')) {
    await recordAuditIssue(url, pageType, 'invalid_canonical', 'warning',
      'Canonical tag must be an absolute URL.', 'https://...', canonical
    );
  }
  if (!ogImage) {
    await recordAuditIssue(url, pageType, 'missing_og_image', 'warning', 'OG Image tag is missing.');
  }
  if (robots.includes('noindex')) {
    await recordAuditIssue(url, pageType, 'accidental_noindex', 'critical',
      'Public page has noindex meta tag — Google will not index this page.'
    );
  }

  // ── Image ALT check ──────────────────────────────────────────────────────────
  const genericAlts = ['image', 'img', 'photo', 'picture', ''];
  let missingAltCount = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')?.trim().toLowerCase() ?? '';
    if (genericAlts.includes(alt)) missingAltCount++;
  });
  if (missingAltCount > 0) {
    await recordAuditIssue(url, pageType, 'missing_alt', 'info',
      `${missingAltCount} image(s) have missing or generic ALT text.`
    );
  }

  // ── JSON-LD Schema check ──────────────────────────────────────────────────────
  let schemaFound = false;
  let schemaValid = true;
  $('script[type="application/ld+json"]').each((_, el) => {
    schemaFound = true;
    try {
      JSON.parse($(el).html() || '{}');
    } catch {
      schemaValid = false;
    }
  });
  if (!schemaFound && pageType === 'Tool') {
    await recordAuditIssue(url, pageType, 'missing_schema', 'warning',
      'No JSON-LD schema found on this Tool page.'
    );
  }
  if (schemaFound && !schemaValid) {
    await recordAuditIssue(url, pageType, 'invalid_schema', 'critical',
      'JSON-LD schema block is malformed/invalid JSON.'
    );
  }
}
