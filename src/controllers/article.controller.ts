import { Request, Response } from 'express';
import { Article } from '../models/Article';

// GET /api/articles
export const getArticles = async (req: Request, res: Response) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const query: any = {};
    if (category) query.category = category;

    const limitNum = Math.min(Number(limit), 500); // cap at 500 for sitemap
    const skip = (Number(page) - 1) * limitNum;
    
    // Fetch articles sorted by latest
    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-content -tableOfContents -prosAndCons -comparisonTable -faq -relatedSlugs -internalLinks -externalLinks');

    const total = await Article.countDocuments(query);

    res.status(200).json({
      success: true,
      data: articles,
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

