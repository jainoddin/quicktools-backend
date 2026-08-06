import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { JWT_SECRET } from '../config/env';
import { SEOAuditIssue } from '../models/SEOAuditIssue';
import { auditSingleUrl } from '../services/seoAudit.service';

const router = express.Router();

// ─── Admin Auth Middleware ──────────────────────────────────────────────────────
// Matches existing isAdmin pattern from admin.routes.ts
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.id);
    if (!user) { res.status(401).json({ success: false, message: 'User not found' }); return; }
    if (user.email !== 'skjainoddin39854@gmail.com') {
      res.status(403).json({ success: false, message: 'Forbidden: Admin access only' });
      return;
    }
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ─── GET /api/admin/seo/summary ────────────────────────────────────────────────
// Summary counts by severity and pageType for dashboard cards
router.get('/summary', isAdmin, async (req, res) => {
  try {
    const [bySeverity, byPageType] = await Promise.all([
      SEOAuditIssue.aggregate([
        { $match: { status: 'open' } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      SEOAuditIssue.aggregate([
        { $match: { status: 'open' } },
        { $group: { _id: '$pageType', count: { $sum: 1 } } }
      ])
    ]);

    const fixedCount = await SEOAuditIssue.countDocuments({ status: 'fixed' });

    res.json({
      bySeverity,
      byPageType,
      fixedCount,
      total: await SEOAuditIssue.countDocuments({ status: 'open' })
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/seo/issues ─────────────────────────────────────────────────
// Paginated list of issues with optional pageType filter + status filter
router.get('/issues', isAdmin, async (req, res) => {
  try {
    const { pageType, status = 'open', severity, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = { status };
    if (pageType && pageType !== 'All') filter.pageType = pageType;
    if (severity) filter.severity = severity;

    const [issues, total] = await Promise.all([
      SEOAuditIssue.find(filter)
        .sort({ severity: 1, lastDetectedAt: -1 }) // critical first, then most recent
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      SEOAuditIssue.countDocuments(filter)
    ]);

    res.json({ issues, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/admin/seo/issues/:id/status ────────────────────────────────────
// Mark issue as 'fixed' or 'ignored'
router.patch('/issues/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['fixed', 'ignored', 'open'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: fixed | ignored | open' });
    }

    const update: Record<string, any> = { status };
    if (status === 'fixed') update.fixedAt = new Date();

    const issue = await SEOAuditIssue.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );

    if (!issue) return res.status(404).json({ error: 'Issue not found.' });
    res.json({ success: true, issue });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/seo/issues/:id/recheck ────────────────────────────────────
// Re-audit the URL of a specific issue on demand
router.post('/issues/:id/recheck', isAdmin, async (req, res) => {
  try {
    const issue = await SEOAuditIssue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    // Run audit asynchronously, respond immediately
    res.json({ success: true, message: `Recheck started for ${issue.url}` });

    // Fire audit in background
    setImmediate(async () => {
      try {
        await auditSingleUrl(issue.url, issue.pageType);
      } catch (e: any) {
        console.error(`[SEO Recheck] Error rechecking ${issue.url}:`, e.message);
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
