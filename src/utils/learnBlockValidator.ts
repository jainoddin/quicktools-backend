import { z } from 'zod';

const BaseBlockSchema = z.object({
  id: z.string().min(1)
});

export const HeadingBlockSchema = BaseBlockSchema.extend({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  content: z.string()
});

export const MarkdownBlockSchema = BaseBlockSchema.extend({
  type: z.literal('markdown'),
  content: z.string().min(1)
});

export const ParagraphBlockSchema = BaseBlockSchema.extend({
  type: z.literal('paragraph'),
  content: z.string().min(1)
});

export const ImageBlockSchema = BaseBlockSchema.extend({
  type: z.literal('image'),
  url: z.string().url(),
  alt: z.string().min(1),
  caption: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  source: z.string().optional(),
  capturedAt: z.string().optional(),
  isOutdated: z.boolean().optional()
});

export const CodeBlockSchema = BaseBlockSchema.extend({
  type: z.literal('code'),
  code: z.string().min(1),
  language: z.string().min(1)
});

export const PromptBlockSchema = BaseBlockSchema.extend({
  type: z.literal('prompt'),
  title: z.string().optional(),
  content: z.string().min(1),
  copyEnabled: z.boolean().default(true)
});

export const OutputBlockSchema = BaseBlockSchema.extend({
  type: z.literal('output'),
  content: z.string().min(1)
});

export const CalloutBlockSchema = BaseBlockSchema.extend({
  type: z.literal('callout'),
  variant: z.union([z.literal('info'), z.literal('warning'), z.literal('success'), z.literal('error')]),
  title: z.string().optional(),
  content: z.string().min(1)
});

export const StepsBlockSchema = BaseBlockSchema.extend({
  type: z.literal('steps'),
  items: z.array(z.string().min(1)).min(1)
});

export const TableBlockSchema = BaseBlockSchema.extend({
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string()))
});

export const ListBlockSchema = BaseBlockSchema.extend({
  type: z.literal('list'),
  style: z.union([z.literal('ordered'), z.literal('unordered')]),
  items: z.array(z.string()).min(1)
});

export const QuoteBlockSchema = BaseBlockSchema.extend({
  type: z.literal('quote'),
  content: z.string().min(1),
  author: z.string().optional()
});

export const DividerBlockSchema = BaseBlockSchema.extend({
  type: z.literal('divider')
});

export const QuizBlockSchema = BaseBlockSchema.extend({
  type: z.literal('quiz'),
  questions: z.array(
    z.object({
      question: z.string().min(1),
      options: z.array(z.string()).min(2),
      correctOptionIndex: z.number().min(0),
      explanation: z.string()
    })
  ).min(1)
});

export const TryToolBlockSchema = BaseBlockSchema.extend({
  type: z.literal('try_tool'),
  toolSlug: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional()
});

export const RelatedLinksBlockSchema = BaseBlockSchema.extend({
  type: z.literal('related_links'),
  links: z.array(
    z.object({
      title: z.string().min(1),
      url: z.string().min(1)
    })
  ).min(1)
});

export const LearnBlockSchema = z.discriminatedUnion('type', [
  HeadingBlockSchema,
  MarkdownBlockSchema,
  ParagraphBlockSchema,
  ImageBlockSchema,
  CodeBlockSchema,
  PromptBlockSchema,
  OutputBlockSchema,
  CalloutBlockSchema,
  StepsBlockSchema,
  TableBlockSchema,
  ListBlockSchema,
  QuoteBlockSchema,
  DividerBlockSchema,
  QuizBlockSchema,
  TryToolBlockSchema,
  RelatedLinksBlockSchema
]);

export type LearnBlock = z.infer<typeof LearnBlockSchema>;

export const validateContentBlocks = (blocks: any[]) => {
  return z.array(LearnBlockSchema).parse(blocks);
};
