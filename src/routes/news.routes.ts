import { Router, Request, Response } from 'express';
import { News } from '../models/News';

const router = Router();

// GET /api/news — Get all news with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, tag, limit = 10, page = 1, isBreaking, search, sort } = req.query;

    const filter: Record<string, unknown> = {};
    if (category && category !== 'All News') filter.category = category;
    if (tag) filter.tags = { $in: [tag] };
    if (isBreaking === 'true') filter.isBreaking = true;
    if (search) {
      const searchStr = String(search);
      filter.$or = [
        { title: { $regex: searchStr, $options: 'i' } },
        { summary: { $regex: searchStr, $options: 'i' } }
      ];
    }

    let sortConfig: any = { publishedAt: -1 };
    if (sort === 'Popular') {
      sortConfig = { publishedAt: 1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [newsItems, total] = await Promise.all([
      News.find(filter)
        .select('-whatHappened -whyItMatters -industryReaction -quickToolsInsight -conclusion -keyHighlights -relatedSlugs')
        .sort(sortConfig)
        .skip(skip)
        .limit(Number(limit)),
      News.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: newsItems,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});

// GET /api/news/:slug — Get single news with related news
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const newsItem = await News.findOne({ slug: req.params.slug });

    if (!newsItem) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }

    // Fetch related news data
    let relatedNews: unknown[] = [];
    if (newsItem.relatedSlugs && newsItem.relatedSlugs.length > 0) {
      relatedNews = await News.find({ slug: { $in: newsItem.relatedSlugs } })
        .select('slug title heroImage readTime category publishedAt')
        .limit(4);
    } else {
      // Auto fetch 4 posts from same category
      relatedNews = await News.find({
        category: newsItem.category,
        slug: { $ne: newsItem.slug },
      })
        .select('slug title heroImage readTime category publishedAt')
        .sort({ publishedAt: -1 })
        .limit(4);
    }

    res.json({
      success: true,
      data: {
        ...newsItem.toObject(),
        relatedNews,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});

export default router;
