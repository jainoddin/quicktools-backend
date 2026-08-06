import mongoose, { Schema, Document } from 'mongoose';

export interface ISEOAuditIssue extends Document {
  url: string;
  pageType: string; // 'Tool' | 'Blog' | 'Article' | 'Learn' | 'Community' | 'Other'
  issueType: string; // 'missing_title' | 'missing_canonical' | 'invalid_schema' | etc.

  severity: 'critical' | 'warning' | 'info';

  message: string;
  detectedValue?: string;
  expectedValue?: string;

  firstDetectedAt: Date;
  lastDetectedAt: Date;   // Updated every time the issue is re-detected
  lastCheckedAt: Date;    // Updated every time the page is audited (issue present or not)
  fixedAt?: Date;

  status: 'open' | 'fixed' | 'ignored';
}

const SEOAuditIssueSchema: Schema = new Schema({
  url: { type: String, required: true },
  pageType: { type: String, required: true },
  issueType: { type: String, required: true },

  severity: { type: String, enum: ['critical', 'warning', 'info'], required: true },

  message: { type: String, required: true },
  detectedValue: { type: String },
  expectedValue: { type: String },

  firstDetectedAt: { type: Date, default: Date.now },
  lastDetectedAt: { type: Date, default: Date.now },
  lastCheckedAt: { type: Date, default: Date.now },
  fixedAt: { type: Date },

  status: { type: String, enum: ['open', 'fixed', 'ignored'], default: 'open' }
});

// Compound unique: one record per (url, issueType) — prevent duplicate records on repeated scans
SEOAuditIssueSchema.index({ url: 1, issueType: 1 }, { unique: true });

export const SEOAuditIssue = mongoose.models.SEOAuditIssue || mongoose.model<ISEOAuditIssue>('SEOAuditIssue', SEOAuditIssueSchema);

/**
 * Upsert an SEO issue with correct deduplication and reopen logic.
 *
 * Rules:
 * - If issue doesn't exist → create as 'open'
 * - If issue exists and status = 'fixed' → reopen it (set back to 'open')
 * - If issue exists and status = 'ignored' → DO NOT override; just update timestamps
 * - Always update lastDetectedAt and lastCheckedAt
 */
export async function recordAuditIssue(
  url: string,
  pageType: string,
  issueType: string,
  severity: 'critical' | 'warning' | 'info',
  message: string,
  expectedValue?: string,
  detectedValue?: string
) {
  const now = new Date();
  const existing = await SEOAuditIssue.findOne({ url, issueType });

  if (!existing) {
    await SEOAuditIssue.create({
      url, pageType, issueType, severity, message,
      expectedValue, detectedValue,
      firstDetectedAt: now,
      lastDetectedAt: now,
      lastCheckedAt: now,
      status: 'open',
    });
    return;
  }

  // Always bump timestamps
  existing.lastDetectedAt = now;
  existing.lastCheckedAt = now;
  existing.message = message; // Keep message fresh (values may change)

  // Reopen only if previously marked fixed
  if (existing.status === 'fixed') {
    existing.status = 'open';
    existing.fixedAt = undefined;
  }
  // If status = 'ignored' → leave it as ignored, timestamps updated only

  await existing.save();
}

/**
 * Mark page as checked (even if no issue found) so lastCheckedAt stays current.
 * Used to distinguish "never checked" vs "checked and clean".
 */
export async function markPageChecked(url: string, issueType: string) {
  await SEOAuditIssue.updateMany(
    { url, issueType, status: { $in: ['open', 'ignored'] } },
    { $set: { lastCheckedAt: new Date() } }
  );
}
