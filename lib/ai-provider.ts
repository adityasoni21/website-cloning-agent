import type { PageSpec } from "./page-spec";

export interface WebsiteAnalysisInput {
  url: string;
  finalUrl: string;
  title: string;

  meta: {
    description: string;
  };

  headings: {
    level: string;
    text: string;
  }[];

  paragraphs: string[];

  navigation: {
    text: string;
    href: string;
  }[];

  links: {
    text: string;
    href: string;
  }[];

  images: {
    alt: string;
    src: string;
    width: number;
    height: number;
  }[];

  buttons: string[];

  sections: {
    tag: string;
    text: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
  }[];

  theme: {
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };

  elements: unknown[];

  viewport: {
    width: number;
    height: number;
  };
}

export interface AIProvider {
  generatePageSpec(
    analysis: WebsiteAnalysisInput
  ): Promise<PageSpec>;
}