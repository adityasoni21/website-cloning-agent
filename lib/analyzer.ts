import { chromium } from "playwright";

export interface ElementInfo {
  tag: string;
  text: string;
  role: string | null;
  classes: string[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  styles: {
    display: string;
    position: string;
    color: string;
    backgroundColor: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    textAlign: string;
    padding: string;
    margin: string;
    borderRadius: string;
  };
}

export interface WebsiteAnalysis {
  url: string;
  finalUrl: string;

  title: string;

  meta: {
    description: string;
  };

  viewport: {
    width: number;
    height: number;
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

  elements: ElementInfo[];

  screenshots: {
    desktop: string;
    mobile: string;
  };
}

export async function analyzeWebsite(
  url: string
): Promise<WebsiteAnalysis> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    /*
     * --------------------------------------------------
     * DESKTOP ANALYSIS
     * --------------------------------------------------
     */

    const desktop = await browser.newPage({
      viewport: {
        width: 1440,
        height: 900,
      },
    });

    await desktop.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await desktop.waitForTimeout(1500);

    const analysis = await desktop.evaluate(() => {
      const cleanText = (
        value: string | null | undefined
      ) => (value || "").replace(/\s+/g, " ").trim();

      const absoluteUrl = (value: string) => {
        try {
          return new URL(
            value,
            window.location.href
          ).href;
        } catch {
          return value;
        }
      };

      const getBox = (element: Element) => {
        const rect = element.getBoundingClientRect();

        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y + window.scrollY),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };

      const getStyles = (element: Element) => {
        const styles = getComputedStyle(element);

        return {
          display: styles.display,
          position: styles.position,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          textAlign: styles.textAlign,
          padding: styles.padding,
          margin: styles.margin,
          borderRadius: styles.borderRadius,
        };
      };

      const headings = Array.from(
        document.querySelectorAll(
          "h1, h2, h3, h4, h5, h6"
        )
      ).map((element) => ({
        level: element.tagName.toLowerCase(),
        text: cleanText(element.textContent),
      }));

      const paragraphs = Array.from(
        document.querySelectorAll("p")
      )
        .map((element) =>
          cleanText(element.textContent)
        )
        .filter(Boolean)
        .slice(0, 100);

      const links = Array.from(
        document.querySelectorAll("a")
      )
        .map((element) => ({
          text: cleanText(element.textContent),
          href: absoluteUrl(
            element.getAttribute("href") || ""
          ),
        }))
        .filter(
          (link) => link.text || link.href
        )
        .slice(0, 200);

      const navigation = Array.from(
        document.querySelectorAll("nav a")
      )
        .map((element) => ({
          text: cleanText(element.textContent),
          href: absoluteUrl(
            element.getAttribute("href") || ""
          ),
        }))
        .filter((link) => link.text);

      const images = Array.from(
        document.querySelectorAll("img")
      )
        .map((element) => ({
          alt:
            element.getAttribute("alt") || "",
          src: absoluteUrl(
            element.getAttribute("src") || ""
          ),
          width:
            (element as HTMLImageElement).naturalWidth,
          height:
            (element as HTMLImageElement).naturalHeight,
        }))
        .filter((image) => image.src)
        .slice(0, 100);

      const buttons = Array.from(
        document.querySelectorAll(
          "button, input[type='button'], input[type='submit']"
        )
      )
        .map((element) => {
          if (
            element instanceof HTMLInputElement
          ) {
            return cleanText(element.value);
          }

          return cleanText(element.textContent);
        })
        .filter(Boolean);

      const sectionElements = Array.from(
        document.querySelectorAll(
          "header, main, section, article, aside, footer"
        )
      );

      const sections = sectionElements
        .map((element) => ({
          tag: element.tagName.toLowerCase(),

          text: cleanText(
            element.textContent
          ).slice(0, 500),

          boundingBox: getBox(element),
        }))
        .filter((section) => section.text);

      /*
       * Collect important visible elements.
       *
       * We intentionally limit this because sending
       * the entire DOM to an LLM would be expensive.
       */
      const importantElements = Array.from(
        document.querySelectorAll(
          "header, nav, main, section, article, aside, footer, h1, h2, h3, button, img"
        )
      );

      const elements = importantElements
        .map((element) => ({
          tag: element.tagName.toLowerCase(),

          text: cleanText(
            element.textContent
          ).slice(0, 300),

          role: element.getAttribute("role"),

          classes: Array.from(
            element.classList
          ).slice(0, 10),

          boundingBox: getBox(element),

          styles: getStyles(element),
        }))
        .slice(0, 150);

      const bodyStyles =
        getComputedStyle(document.body);

      return {
        title: document.title,

        meta: {
          description:
            document
              .querySelector(
                'meta[name="description"]'
              )
              ?.getAttribute("content") || "",
        },

        headings,

        paragraphs,

        navigation,

        links,

        images,

        buttons,

        sections,

        theme: {
          backgroundColor:
            bodyStyles.backgroundColor,

          textColor: bodyStyles.color,

          fontFamily:
            bodyStyles.fontFamily,
        },

        elements,
      };
    });

    const desktopScreenshot =
      await desktop.screenshot({
        type: "png",
        fullPage: true,
      });

    const finalUrl = desktop.url();

    await desktop.close();

    /*
     * --------------------------------------------------
     * MOBILE ANALYSIS
     * --------------------------------------------------
     */

    const mobile = await browser.newPage({
      viewport: {
        width: 390,
        height: 844,
      },

      deviceScaleFactor: 1,
      isMobile: true,
    });

    await mobile.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await mobile.waitForTimeout(1500);

    const mobileScreenshot =
      await mobile.screenshot({
        type: "png",
        fullPage: true,
      });

    await mobile.close();

    /*
     * --------------------------------------------------
     * FINAL RESULT
     * --------------------------------------------------
     */

    return {
      url,

      finalUrl,

      ...analysis,

      viewport: {
        width: 1440,
        height: 900,
      },

      screenshots: {
        desktop:
          desktopScreenshot.toString("base64"),

        mobile:
          mobileScreenshot.toString("base64"),
      },
    };
  } finally {
    await browser.close();
  }
}