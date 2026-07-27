import { Request, Response } from 'express';
import { Article } from '../models/Article';

// GET /api/articles
export const getArticles = async (req: Request, res: Response) => {
  try {
    const { category, page = 1, limit = 10, search, sort, ids } = req.query;

    // If ids param provided (for Favorites), fetch those specific articles
    if (ids) {
      const idList = String(ids).split(',').filter(Boolean);
      const articles = await Article.find({ _id: { $in: idList } })
        .select('-content -tableOfContents -prosAndCons -comparisonTable -faq -relatedSlugs -internalLinks -externalLinks');
      return res.status(200).json({ success: true, data: articles, pagination: { total: articles.length, page: 1, pages: 1 } });
    }

    const query: any = {};
    if (category && category !== 'All Articles') query.category = category;

    if (search) {
      const searchStr = String(search);
      query.$or = [
        { title: { $regex: searchStr, $options: 'i' } },
        { description: { $regex: searchStr, $options: 'i' } }
      ];
    }

    let sortConfig: any = { publishedAt: -1, _id: 1 };
    if (sort === 'Popular') {
      sortConfig = { publishedAt: 1, _id: 1 };
    }

    const limitNum = Math.min(Number(limit), 500);
    const skip = (Number(page) - 1) * limitNum;
    
    const [articles, total, categoryAgg] = await Promise.all([
      Article.find(query)
        .sort(sortConfig)
        .skip(skip)
        .limit(limitNum)
        .select('-content -tableOfContents -prosAndCons -comparisonTable -faq -relatedSlugs -internalLinks -externalLinks'),
      Article.countDocuments(query),
      Article.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ])
    ]);

    const categoryCounts: Record<string, number> = {};
    let totalArticles = 0;
    categoryAgg.forEach((c: any) => {
      if (c._id) {
        categoryCounts[c._id] = c.count;
        totalArticles += c.count;
      }
    });
    categoryCounts['All Articles'] = totalArticles;

    res.status(200).json({
      success: true,
      data: articles,
      categoryCounts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error });

  }
};

// GET /api/articles/:slug
export const getArticleBySlug = async (req: Request, res: Response) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug });
    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Fetch related articles — prefer relatedSlugs, fallback to same category
    let relatedArticles: any[] = [];
    if (article.relatedSlugs && article.relatedSlugs.length > 0) {
      relatedArticles = await Article.find({ slug: { $in: article.relatedSlugs } })
        .select('title slug readTime coverImage category')
        .limit(4);
    }
    
    // Fallback: same category, exclude current article
    if (relatedArticles.length < 2) {
      relatedArticles = await Article.find({
        category: article.category,
        slug: { $ne: article.slug }
      })
        .sort({ publishedAt: -1 })
        .select('title slug readTime coverImage category')
        .limit(4);
    }

    // Final fallback: any 4 articles
    if (relatedArticles.length === 0) {
      relatedArticles = await Article.find({ slug: { $ne: article.slug } })
        .sort({ publishedAt: -1 })
        .select('title slug readTime coverImage category')
        .limit(4);
    }

    res.status(200).json({
      success: true,
      data: {
        ...article.toObject(),
        relatedArticles
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error });
  }
};

