import type {
  AIProvider,
  WebsiteAnalysisInput,
} from "./ai-provider";

import type { PageSpec } from "./page-spec";

function detectSectionType(
  tag: string,
  text: string
): string {
  const lower = text.toLowerCase();

  if (tag === "header") {
    return "header";
  }

  if (tag === "footer") {
    return "footer";
  }

  if (
    lower.includes("testimonial") ||
    lower.includes("customer")
  ) {
    return "testimonials";
  }

  if (
    lower.includes("pricing") ||
    lower.includes("price")
  ) {
    return "pricing";
  }

  if (
    lower.includes("feature") ||
    lower.includes("benefit")
  ) {
    return "features";
  }

  if (lower.includes("contact")) {
    return "contact";
  }

  return "content";
}

export class MockProvider implements AIProvider {
  async generatePageSpec(
    analysis: WebsiteAnalysisInput
  ): Promise<PageSpec> {
    const sections =
      analysis.sections.map(
        (section, index) => {
          const image =
            analysis.images[
              index % Math.max(
                analysis.images.length,
                1
              )
            ];

          return {
            id: `${section.tag}-${index + 1}`,

            type: detectSectionType(
              section.tag,
              section.text
            ),

            order: index + 1,

            purpose:
              "Section detected from the website DOM.",

            heading:
              analysis.headings[index]
                ?.text || "",

            content: [
              section.text.slice(0, 500),
            ],

            layout: {
              direction: "unknown",
              alignment: "unknown",
              justification: "unknown",
            },

            visualDescription:
              "Automatically detected website section.",

            backgroundColor:
              analysis.theme.backgroundColor,

            hasImage:
              analysis.images.length > 0,

            imageDescription:
              image?.alt || "",

            imageUrl:
              image?.src || undefined,

            hasCTA:
              analysis.buttons.length > 0,

            ctaText:
              analysis.buttons[0] || "",
          };
        }
      );

    return {
      site: {
        title: analysis.title,

        description:
          analysis.meta.description,

        purpose:
          "Website recreated from automated DOM analysis.",
      },

      theme: {
        primaryColor:
          analysis.theme.textColor,

        secondaryColor:
          analysis.theme.textColor,

        backgroundColor:
          analysis.theme.backgroundColor,

        textColor:
          analysis.theme.textColor,

        typography: {
          headingFont:
            analysis.theme.fontFamily,

          bodyFont:
            analysis.theme.fontFamily,
        },
      },

      navigation: {
        exists:
          analysis.navigation.length > 0,

        items:
          analysis.navigation.map(
            (item) => ({
              label: item.text,
              href: item.href,
            })
          ),

        behavior:
          "Use the detected navigation structure.",
      },

      sections,

      footer: {
        exists:
          analysis.sections.some(
            (section) =>
              section.tag === "footer"
          ),

        description:
          "Footer detected from the website DOM.",
      },

      responsive: {
        mobileBehavior:
          "Use responsive CSS and stack horizontal layouts on small screens.",

        navigationBehavior:
          "Adapt navigation for mobile screens.",

        layoutChanges: [
          "Reduce horizontal spacing.",
          "Stack multi-column content.",
          "Scale typography.",
        ],
      },

      designSummary:
        "Automatically generated fallback PageSpec based on deterministic website analysis.",
    };
  }
}