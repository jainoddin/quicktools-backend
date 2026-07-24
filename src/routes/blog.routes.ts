import { Router, Request, Response } from 'express';
import { Blog } from '../models/Blog';

const router = Router();

// GET /api/blogs — Get all blogs with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, tag, limit = 10, page = 1, featured, search, sort } = req.query;

    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (tag) filter.tags = { $in: [tag] };
    if (featured === 'true') filter.featured = true;
    if (search) {
      const searchStr = String(search);
      filter.$or = [
        { title: { $regex: searchStr, $options: 'i' } },
        { description: { $regex: searchStr, $options: 'i' } }
      ];
    }

    let sortConfig: any = { publishedAt: -1 };
    if (sort === 'Popular') {
      sortConfig = { publishedAt: 1 }; // Simple alternate sort for now
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .select('-content -tableOfContents -whatYoullLearn -relatedSlugs')
        .sort(sortConfig)
        .skip(skip)
        .limit(Number(limit)),
      Blog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: blogs,
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

// GET /api/blogs/:slug — Get single blog with related posts
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Fetch related posts data
    let relatedPosts: unknown[] = [];
    if (blog.relatedSlugs && blog.relatedSlugs.length > 0) {
      relatedPosts = await Blog.find({ slug: { $in: blog.relatedSlugs } })
        .select('slug title coverImage readTime category publishedAt')
        .limit(3);
    } else {
      // Auto fetch 3 posts from same category
      relatedPosts = await Blog.find({
        category: blog.category,
        slug: { $ne: blog.slug },
      })
        .select('slug title coverImage readTime category publishedAt')
        .sort({ publishedAt: -1 })
        .limit(3);
    }

    res.json({
      success: true,
      data: {
        ...blog.toObject(),
        relatedPosts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error });
  }
});

export default router;
