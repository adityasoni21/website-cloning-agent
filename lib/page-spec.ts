import { z } from "zod";

export const PageSpecSchema = z.object({
  site: z.object({
    title: z.string(),
    description: z.string(),
    purpose: z.string(),
  }),

  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    backgroundColor: z.string(),
    textColor: z.string(),

    typography: z.object({
      headingFont: z.string(),
      bodyFont: z.string(),
    }),
  }),

  navigation: z.object({
    exists: z.boolean(),

    items: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
      })
    ),

    behavior: z.string(),
  }),

  sections: z.array(
    z.object({
      id: z.string(),

      type: z.string(),

      order: z.number(),

      purpose: z.string(),

      heading: z.string(),

      content: z.array(z.string()),

      layout: z.object({
        direction: z.string(),
        alignment: z.string(),
        justification: z.string(),
      }),

      visualDescription: z.string(),

      backgroundColor: z.string(),

      hasImage: z.boolean(),

      imageDescription: z.string(),

      imageUrl: z.string().optional(),

      hasCTA: z.boolean(),

      ctaText: z.string(),
    })
  ),

  footer: z.object({
    exists: z.boolean(),

    description: z.string(),
  }),

  responsive: z.object({
    mobileBehavior: z.string(),

    navigationBehavior: z.string(),

    layoutChanges: z.array(z.string()),
  }),

  designSummary: z.string(),
});

export type PageSpec = z.infer<
  typeof PageSpecSchema
>;