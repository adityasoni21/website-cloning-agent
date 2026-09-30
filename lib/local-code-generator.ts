import type { PageSpec } from "./page-spec";
import type {
  CodeGenerator,
  GeneratedProject,
  GeneratedFile,
} from "./generator";

function safeProjectName(title: string): string {
  const name = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return name || "generated-site";
}

function escapeForTemplate(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

export class LocalCodeGenerator implements CodeGenerator {
  async generateProject(
    pageSpec: PageSpec
  ): Promise<GeneratedProject> {
    const projectName = safeProjectName(pageSpec.site.title);

    const files: GeneratedFile[] = [
      {
        path: "package.json",
        content: this.generatePackageJson(),
      },

      {
        path: "tsconfig.json",
        content: this.generateTsConfig(),
      },

      {
        path: "next.config.ts",
        content: this.generateNextConfig(),
      },

      {
        path: "postcss.config.mjs",
        content: this.generatePostcssConfig(),
      },

      {
        path: "app/layout.tsx",
        content: this.generateLayout(pageSpec),
      },

      {
        path: "app/page.tsx",
        content: this.generatePage(),
      },

      {
        path: "app/globals.css",
        content: this.generateGlobalCss(pageSpec),
      },

      {
        path: "components/Navbar.tsx",
        content: this.generateNavbar(),
      },

      {
        path: "components/SiteSection.tsx",
        content: this.generateSection(),
      },

      {
        path: "components/Footer.tsx",
        content: this.generateFooter(),
      },

      {
        path: "components/SiteRenderer.tsx",
        content: this.generateRenderer(),
      },

      {
        path: "lib/site-config.ts",
        content: this.generateSiteConfig(pageSpec),
      },
    ];

    return {
      projectName,
      files,
    };
  }

  private generatePackageJson(): string {
    return JSON.stringify(
      {
        name: "generated-site",
        version: "1.0.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies: {
          next: "16.3.6",
          react: "19.2.0",
          "react-dom": "19.2.0",
        },
        devDependencies: {
          "@types/node": "^20.0.0",
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          typescript: "^5.0.0",
        },
      },
      null,
      2
    );
  }

  private generateTsConfig(): string {
    return JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: false,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [
            {
              name: "next",
            },
          ],
        },
        include: [
          "next-env.d.ts",
          ".next/types/**/*.ts",
          "**/*.ts",
          "**/*.tsx",
        ],
        exclude: ["node_modules"],
      },
      null,
      2
    );
  }

  private generateNextConfig(): string {
    return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  turbopack: {
  root: process.cwd(),
  },
};

export default nextConfig;
`;
  }

  private generatePostcssConfig(): string {
    return `const config = {
  plugins: {},
};

export default config;
`;
  }

  private generateLayout(pageSpec: PageSpec): string {
    const title = escapeForTemplate(pageSpec.site.title);
    const description = escapeForTemplate(
      pageSpec.site.description
    );

    return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: \`${title}\`,
  description: \`${description}\`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
  }

  private generatePage(): string {
    return `import { siteConfig } from "../lib/site-config";
import SiteRenderer from "../components/SiteRenderer";

export default function Home() {
  return <SiteRenderer config={siteConfig} />;
}
`;
  }

  private generateNavbar(): string {
    return `"use client";

import { useState } from "react";

interface NavigationItem {
  label: string;
  href: string;
}

interface NavbarProps {
  title: string;
  items: readonly NavigationItem[];
  primaryColor: string;
}

export default function Navbar({
  title,
  items,
  primaryColor,
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container navbar">
        <a
          href="#"
          className="brand"
          style={{ color: primaryColor }}
        >
          {title}
        </a>

        <button
          className="mobile-menu-button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? "×" : "☰"}
        </button>

        <nav className={open ? "nav-links open" : "nav-links"}>
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
`;
  }

  private generateSection(): string {
    return `interface SectionData {
    id: string;
    type: string;
    heading?: string;
    content: readonly string[];
    visualDescription?: string;
    backgroundColor?: string;
    hasImage?: boolean;
    imageDescription?: string;
    imageUrl?: string;
    hasCTA?: boolean;
    ctaText?: string;
    layout?: {
      direction?: string;
      alignment?: string;
      justification?: string;
    };
  }

  interface SiteSectionProps {
    section: SectionData;
    primaryColor: string;
    secondaryColor: string;
  }

  export default function SiteSection({
    section,
    primaryColor,
    secondaryColor,
  }: SiteSectionProps) {
    const isHero =
      section.type.toLowerCase() === "hero";

    return (
      <section
        id={section.id}
        className={
          isHero
            ? "section hero-section"
            : "section"
        }
        style={{
          backgroundColor:
            section.backgroundColor ||
            "transparent",
        }}
      >
        <div className="container section-content">
          <div className="section-copy">
            {section.heading && (
              <h2
                className={
                  isHero
                    ? "hero-heading"
                    : "section-heading"
                }
              >
                {section.heading}
              </h2>
            )}

            {section.content?.map(
              (text, index) => (
                <p
                  key={index}
                  className={
                    isHero
                      ? "hero-description"
                      : "section-description"
                  }
                >
                  {text}
                </p>
              )
            )}

            {section.hasCTA &&
              section.ctaText && (
                <a
                  href="#"
                  className="cta-button"
                  style={{
                    backgroundColor:
                      primaryColor,
                  }}
                >
                  {section.ctaText}
                </a>
              )}
          </div>

          {(section.hasImage ||
            section.visualDescription) && (
            <div
              className="visual-card"
              style={{
                borderColor:
                  secondaryColor,
              }}
            >
              {section.imageUrl ? (
                <img
                  src={section.imageUrl}
                  alt={
                    section.imageDescription ||
                    section.heading ||
                    "Website image"
                  }
                  className="generated-image"
                />
              ) : (
                <div
                  className="visual-placeholder"
                  style={{
                    background:
                      "linear-gradient(135deg, " +
                      primaryColor +
                      "22, " +
                      secondaryColor +
                      "22)",
                  }}
                >
                  {section.imageDescription ||
                    section.visualDescription ||
                    "Visual content"}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }
  `;
  }

  private generateFooter(): string {
    return `interface FooterProps {
  title: string;
  description: string;
  items: readonly {
    label: string;
    href: string;
  }[];
}

export default function Footer({
  title,
  description,
  items,
}: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>

        <nav className="footer-links">
          {items.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
`;
  }

  private generateRenderer(): string {
    return `import Navbar from "./Navbar";
  import SiteSection from "./SiteSection";
  import Footer from "./Footer";

  interface SiteConfig {
    site: {
      title: string;
      description: string;
      purpose: string;
    };

    theme: {
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      textColor: string;
    };

    navigation: {
      exists: boolean;
      items: readonly {
        label: string;
        href: string;
      }[];
      behavior: string;
    };

    sections: readonly {
      id: string;
      type: string;
      order: number;
      purpose: string;
      heading?: string;
      content: readonly string[];
      layout?: {
        direction?: string;
        alignment?: string;
        justification?: string;
      };
      visualDescription?: string;
      backgroundColor?: string;
      hasImage?: boolean;
      imageDescription?: string;
      imageUrl?: string;
      hasCTA?: boolean;
      ctaText?: string;
    }[];

    footer: {
      exists: boolean;
      description: string;
    };
  }

  interface SiteRendererProps {
    config: SiteConfig;
  }

  export default function SiteRenderer({
    config,
  }: SiteRendererProps) {
    const sections = [
      ...config.sections,
    ].sort(
      (a, b) => a.order - b.order
    );

    return (
      <div
        className="site"
        style={{
          backgroundColor:
            config.theme.backgroundColor,
          color:
            config.theme.textColor,
        }}
      >
        {config.navigation.exists && (
          <Navbar
            title={config.site.title}
            items={config.navigation.items}
            primaryColor={
              config.theme.primaryColor
            }
          />
        )}

        <main>
          {sections.map((section) => (
            <SiteSection
              key={section.id}
              section={section}
              primaryColor={
                config.theme.primaryColor
              }
              secondaryColor={
                config.theme.secondaryColor
              }
            />
          ))}
        </main>

        {config.footer.exists && (
          <Footer
            title={config.site.title}
            description={
              config.footer.description
            }
            items={config.navigation.items}
          />
        )}
      </div>
    );
  }
  `;
  }

  private generateSiteConfig(pageSpec: PageSpec): string {
    return `export const siteConfig = ${JSON.stringify(
      pageSpec,
      null,
      2
    )} as const;
`;
  }

  private generateGlobalCss(pageSpec: PageSpec): string {
    const primary = pageSpec.theme.primaryColor || "#2563eb";
    const secondary =
      pageSpec.theme.secondaryColor || "#7c3aed";
    const background =
      pageSpec.theme.backgroundColor || "#ffffff";
    const text = pageSpec.theme.textColor || "#111827";

    return `* {
  box-sizing: border-box;
}

:root {
  --primary-color: ${primary};
  --secondary-color: ${secondary};
  --background-color: ${background};
  --text-color: ${text}
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--background-color);
  color: var(--text-color);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
}

.container {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
}

.site {
  min-height: 100vh;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.94);
  border-bottom: 1px solid #e5e7eb;
  backdrop-filter: blur(12px);
}

.navbar {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

.brand {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 0.95rem;
}

.nav-links a:hover,
.footer-links a:hover {
  color: var(--primary-color);
}

.mobile-menu-button {
  display: none;
  border: 0;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
}

.section {
  padding: 88px 0;
}

.hero-section {
  min-height: 620px;
  display: flex;
  align-items: center;
}

.section-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
  align-items: center;
  gap: 64px;
}

.section-copy {
  max-width: 720px;
}

.hero-heading,
.section-heading {
  margin: 0 0 20px;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.hero-heading {
  font-size: clamp(3rem, 7vw, 5.5rem);
}

.section-heading {
  font-size: clamp(2rem, 4vw, 3.5rem);
}

.hero-description,
.section-description {
  margin: 0 0 16px;
  max-width: 680px;
  color: #6b7280;
  line-height: 1.75;
  font-size: 1.05rem;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  padding: 14px 24px;
  border-radius: 10px;
  color: white;
  font-weight: 700;
  transition: transform 0.2s ease;
}

.cta-button:hover {
  transform: translateY(-2px);
}

.visual-card {
  min-height: 300px;
  border: 1px solid;
  border-radius: 24px;
  overflow: hidden;
}

.generated-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: 520px;
  object-fit: contain;
  border-radius: 20px;
}

.visual-placeholder {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: #4b5563;
  line-height: 1.6;
}

.site-footer {
  padding: 48px 0;
  border-top: 1px solid #e5e7eb;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  gap: 40px;
}

.footer-content strong {
  font-size: 1.1rem;
}

.footer-content p {
  max-width: 500px;
  color: #6b7280;
  line-height: 1.6;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}

@media (max-width: 768px) {
  .container {
    width: min(100% - 28px, 1120px);
  }
  .generated-image {
    max-height: 420px;
  }


  .navbar {
    min-height: 64px;
  }

  .mobile-menu-button {
    display: block;
  }

  .nav-links {
    display: none;
    position: absolute;
    top: 64px;
    left: 0;
    right: 0;
    padding: 20px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    flex-direction: column;
    align-items: stretch;
  }

  .nav-links.open {
    display: flex;
  }

  .nav-links a {
    padding: 10px 0;
  }

  .section {
    padding: 64px 0;
  }

  .hero-section {
    min-height: auto;
  }

  .section-content {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .hero-heading {
    font-size: clamp(2.5rem, 13vw, 4rem);
  }

  .section-heading {
    font-size: 2.25rem;
  }

  .footer-content {
    flex-direction: column;
  }
}
`;
  }
}