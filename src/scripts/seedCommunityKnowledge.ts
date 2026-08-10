import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { CommunityQuestion } from '../models/CommunityQuestion';

const team = {
  name: 'QuickTools Guest',
  avatar: '',
  isGuest: true,
  isAiAssisted: true,
};

const editorial = {
  name: 'QuickTools Guest',
  avatar: '',
  isGuest: true,
  isAiAssisted: true,
};

const seeds = [
  {
    slug: 'how-do-i-choose-a-free-ai-tool-without-testing-every-option',
    title: 'How do I choose a free AI tool without testing every option?',
    body: 'There are dozens of free AI tools that claim to do the same job. What should I compare before uploading my files or building a regular workflow around one of them?',
    excerpt: 'What should I compare before uploading files or building a regular workflow around a free AI tool?',
    category: 'AI Tools', tags: ['free tools', 'privacy', 'workflow'],
    createdAt: '2026-08-06T03:48:00.000Z',
    answers: [
      {
        body: 'Start with the task, not the brand. Write down the exact input you have, the output format you need, and how often you will use it. Then compare five things: whether files are retained, the free limit, export quality, watermark restrictions, and whether the tool still works after the free quota ends. Test the same small sample in two tools and keep the one that needs less cleanup. Never upload confidential client files until you have read the data-retention policy.',
        author: editorial, isAccepted: true, createdAt: '2026-08-06T06:12:00.000Z', updatedAt: '2026-08-06T06:12:00.000Z',
      },
      {
        body: 'One practical check people miss is portability. Make sure you can download the result in a normal format such as PNG, PDF, DOCX, CSV, or plain text. A free tool can be useful today, but if all your work is locked inside its dashboard, switching later becomes painful.',
        author: team, isAccepted: false, createdAt: '2026-08-06T12:35:00.000Z', updatedAt: '2026-08-06T12:35:00.000Z',
      },
    ],
  },
  {
    slug: 'what-prompt-structure-gives-consistent-results-for-business-tasks',
    title: 'What prompt structure gives consistent results for business tasks?',
    body: 'My prompts work once and then give a very different response the next time. Is there a simple structure I can reuse for emails, plans, summaries, and other business work?',
    excerpt: 'Is there a reusable prompt structure for emails, plans, summaries, and other business work?',
    category: 'Prompt Engineering', tags: ['prompt structure', 'business', 'consistency'],
    createdAt: '2026-08-07T08:57:00.000Z',
    answers: [
      {
        body: 'A reliable structure is: role, goal, context, constraints, output format, and one example. For instance, say who the assistant should act as, what decision the output must support, the facts it may use, what it must avoid, and the exact headings or table columns you want. Also tell it what to do when information is missing—ask a question or mark it as unknown instead of guessing. That last instruction improves consistency more than adding lots of adjectives.',
        author: editorial, isAccepted: true, createdAt: '2026-08-07T10:21:00.000Z', updatedAt: '2026-08-07T10:21:00.000Z',
      },
      {
        body: 'Keep the stable instructions separate from the changing input. I save the role, rules, and output format as a template, then replace only the customer details or source text. If you edit the whole prompt every time, it becomes difficult to know which change caused a better or worse result.',
        author: team, isAccepted: false, createdAt: '2026-08-07T15:46:00.000Z', updatedAt: '2026-08-07T15:46:00.000Z',
      },
    ],
  },
  {
    slug: 'how-can-i-summarize-client-pdfs-without-exposing-sensitive-data',
    title: 'How can I summarize client PDFs without exposing sensitive data?',
    body: 'I often receive long PDF reports from clients and want faster summaries, but some files contain names, financial figures, and internal project details. What is a safer workflow?',
    excerpt: 'What is a safer workflow for summarizing client PDFs that contain sensitive information?',
    category: 'Productivity', tags: ['pdf', 'privacy', 'summarization'],
    createdAt: '2026-08-08T04:36:00.000Z',
    answers: [
      {
        body: 'First confirm that the client allows AI processing. Then remove details the summary does not need: names, account numbers, email addresses, signatures, and confidential identifiers. Use a provider whose retention and training settings match the agreement, and avoid consumer tools when the policy is unclear. Ask for a structured summary with page references so you can verify important claims against the original PDF. Delete the uploaded file and generated workspace when the task is complete.',
        author: editorial, isAccepted: true, createdAt: '2026-08-08T07:04:00.000Z', updatedAt: '2026-08-08T07:04:00.000Z',
      },
      {
        body: 'For highly sensitive documents, a local or company-approved system is safer than a public upload form. Another useful habit is to split the job: extract only the relevant pages, redact them, and summarize that smaller file. You reduce both privacy exposure and the chance that the model misses the important section.',
        author: team, isAccepted: false, createdAt: '2026-08-08T13:28:00.000Z', updatedAt: '2026-08-08T13:28:00.000Z',
      },
    ],
  },
  {
    slug: 'how-do-i-use-ai-assisted-blog-content-without-hurting-seo',
    title: 'How do I use AI-assisted blog content without hurting SEO?',
    body: 'I can generate drafts quickly, but I do not want repetitive articles or unsupported claims to damage reader trust and search performance. What checks should happen before publishing?',
    excerpt: 'What quality and SEO checks should happen before publishing an AI-assisted blog draft?',
    category: 'Marketing', tags: ['seo', 'content quality', 'publishing'],
    createdAt: '2026-08-09T11:03:00.000Z',
    answers: [
      {
        body: 'Treat AI output as a draft, not evidence. Before publishing, verify every factual claim and source, confirm that the page answers one clear search intent, remove repeated sections, and add examples that are genuinely useful for your audience. Check the title, description, canonical URL, internal links, image relevance, and structured data. If the article has nothing new beyond pages already ranking, publishing more words will not help. Transparency about AI assistance is also better than presenting automated work as a personal review.',
        author: editorial, isAccepted: true, createdAt: '2026-08-09T12:49:00.000Z', updatedAt: '2026-08-09T12:49:00.000Z',
      },
      {
        body: 'Run a duplicate-intent check before writing. Two articles with different titles can still compete for the same query. I would rather skip a draft than publish a near-copy. After publishing, watch impressions, clicks, and engagement, then update the page when the evidence shows that readers are not finding the answer they expected.',
        author: team, isAccepted: false, createdAt: '2026-08-09T16:22:00.000Z', updatedAt: '2026-08-09T16:22:00.000Z',
      },
    ],
  },
];

async function main() {
  await connectDB();
  for (const seed of seeds) {
    const createdAt = new Date(seed.createdAt);
    const updatedAt = new Date(seed.answers[seed.answers.length - 1].createdAt);
    await CommunityQuestion.collection.updateOne(
      { slug: seed.slug },
      {
        $set: {
          ...seed,
          createdAt,
          updatedAt,
          answers: seed.answers.map(answer => ({
            _id: new mongoose.Types.ObjectId(),
            ...answer,
            createdAt: new Date(answer.createdAt),
            updatedAt: new Date(answer.updatedAt),
            likedBy: [], reports: 0, status: 'visible', replies: [],
          })),
          author: team,
          likedBy: [], savedBy: [], viewedBy: [], views: 0,
          reports: 0, status: 'visible',
        },
      },
      { upsert: true },
    );
    console.log(`Seeded: ${seed.slug}`);
  }
}

main()
  .then(async () => { await mongoose.disconnect(); process.exit(0); })
  .catch(async error => {
    console.error(error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
