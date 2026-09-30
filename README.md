# Website Cloning Agent

An AI-powered frontend website cloning agent that analyzes a public website, converts the analysis into a structured page specification, generates a responsive Next.js frontend, validates the generated project, and allows natural-language modifications.

Built as an internship assignment for a **Founding AI Engineer** role.

---

## Overview

The Website Cloning Agent takes a public website URL and processes it through the following pipeline:

```text
Website URL
     │
     ▼
┌──────────────────┐
│ Website Analysis │
│    Playwright    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    PageSpec      │
│ Gemini / Fallback│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Code Generation │
│ Gemini / Local   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Build Validation │
│  + Auto Repair   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Generated Website│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Natural Language │
│   Modification   │
└──────────────────┘
```

The system is designed as an MVP focused on reliable end-to-end execution, generalization across different websites, and graceful fallback when external AI services are unavailable.

---

# Features

## 1. Website Analysis

The agent uses **Playwright** to inspect the target website.

It extracts information including:

- Page title
- Meta information
- Viewport information
- Headings
- Paragraph content
- Navigation links
- Buttons
- Images
- Image URLs
- Image alt text
- Sections
- Colors
- Typography
- Element dimensions
- Element positions
- Layout information
- Desktop screenshot
- Mobile screenshot

The analyzer supports both desktop and mobile viewport analysis.

It also uses `domcontentloaded` instead of requiring `networkidle`, allowing it to work with modern websites that maintain long-lived background network requests.

---

# 2. Structured PageSpec

Instead of directly generating frontend code from raw website HTML, the analysis is first converted into a structured intermediate representation called a **PageSpec**.

The PageSpec contains information about:

- Website identity
- Title and description
- Theme
- Navigation
- Sections
- Section content
- Buttons
- Images
- Layout
- Visual properties

The structure is validated using **Zod**.

The overall flow is:

```text
Website
   ↓
Playwright Analysis
   ↓
Structured Analysis
   ↓
PageSpec
   ↓
Frontend Generation
```

This intermediate representation makes the generation pipeline easier to validate, modify, and extend.

---

# 3. Frontend Generation

The agent generates a standalone **Next.js + React + TypeScript** project.

Generated projects contain:

- Next.js application
- React components
- TypeScript
- Navigation
- Page sections
- Footer
- Global styles
- Site configuration
- Image rendering
- Responsive layout

Generated projects are stored under:

```text
generated-sites/
```

Each generated website can be run independently using its own local development server.

---

# 4. Build Validation

Generated code is not considered successful simply because files were created.

Every generated project goes through an actual production build.

The validation pipeline is:

```text
Generate Project
      ↓
npm install
      ↓
Next.js Production Build
      ↓
Build Successful?
    /       \
  Yes       No
   │         │
   ▼         ▼
Success   Auto Repair
             │
             ▼
          Rebuild
             │
        ┌────┴────┐
        │         │
     Success    Failure
        │         │
        ▼         ▼
     Continue   Report Error
```

The repair system attempts to correct known generated-code problems before rebuilding.

---

# 5. Natural-Language Modification

Generated websites can be modified using natural-language instructions.

Examples:

```text
Make the primary color blue.
```

```text
Make the navbar sticky.
```

```text
Add a testimonials section.
```

```text
Remove the pricing section.
```

The modification pipeline is:

```text
User Instruction
       ↓
Modification Agent
       ↓
Apply Changes
       ↓
Build Validation
       ↓
Successful?
    /       \
  Yes       No
   │         │
   ▼         ▼
Keep      Restore
Changes   Previous State
```

The system supports both Gemini-based modifications and deterministic local modifications.

---

# 6. AI Provider Fallback

External AI services can fail because of:

- API quota
- Rate limits
- Model availability
- Temporary service errors
- Network problems

The application therefore separates AI functionality behind provider abstractions.

For PageSpec generation:

```text
             PageSpec Request
                    │
                    ▼
             Gemini Provider
               /       \
          Success      Failure
             │            │
             ▼            ▼
         Gemini       Mock Provider
                         │
                         ▼
                    PageSpec
```

A similar fallback architecture is used for code generation and natural-language modification.

This allows the end-to-end demonstration to continue even when Gemini is temporarily unavailable.

---

# Architecture

## High-Level Architecture

```text
                         ┌─────────────────────┐
                         │    User enters URL  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   /api/analyze      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Playwright Analyzer │
                         │                     │
                         │ Desktop + Mobile   │
                         │ DOM + Styles       │
                         │ Images + Links     │
                         │ Screenshots        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      PageSpec       │
                         │                     │
                         │ Gemini Provider     │
                         │        OR           │
                         │ Mock Provider       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   /api/generate     │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
             Gemini Generator              Local Generator
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Generated Next.js   │
                         │      Project        │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Build Validation    │
                         └──────────┬──────────┘
                                    │
                             Build failure?
                              /         \
                            Yes          No
                             │            │
                             ▼            ▼
                        Auto Repair     Success
                             │
                             ▼
                          Rebuild
                             │
                             ▼
                           Success
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   /api/modify      │
                         │ Natural Language   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         Gemini / Local Agent
                                    │
                                    ▼
                         Apply Modification
                                    │
                                    ▼
                         Build Validation
                                    │
                                    ▼
                              Final Site
```

---

# Project Structure

```text
website-cloning-agent/
│
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts
│   │   │
│   │   ├── generate/
│   │   │   └── route.ts
│   │   │
│   │   └── modify/
│   │       └── route.ts
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── lib/
│   ├── ai-provider.ts
│   ├── gemini-provider.ts
│   ├── mock-provider.ts
│   ├── page-spec.ts
│   │
│   ├── analyzer.ts
│   │
│   ├── generator.ts
│   ├── gemini-code-generator.ts
│   ├── local-code-generator.ts
│   ├── project-writer.ts
│   │
│   ├── build-validator.ts
│   ├── repair.ts
│   ├── repair-engine.ts
│   └── local-repair.ts
│   │
│   ├── modification.ts
│   ├── modification-agent.ts
│   ├── gemini-modification-agent.ts
│   ├── local-modification-agent.ts
│   └── modification-writer.ts
│
├── generated-sites/
│   └── <generated projects>
│
├── public/
│
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

# Technology Stack

## Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

## Website Analysis

- Playwright

## AI

- Google Gemini
- `@google/genai`

## Validation

- Next.js production builds
- TypeScript
- Automated repair attempts

## Schema Validation

- Zod

---

# Requirements

The project requires:

- Node.js 20+
- npm
- Playwright
- Internet access for analyzing public websites
- Optional Gemini API key

The core pipeline can continue using local/mock fallback implementations when Gemini is unavailable.

---

# Installation

Clone the repository:

```bash
git clone https://github.com/adityasoni21/website-cloning-agent
cd website-cloning-agent
```

Install dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

---

# Environment Variables

Create a local environment file:

```bash
touch .env.local
```

Add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

The application can still use fallback implementations if the Gemini API is unavailable.

> Never commit `.env.local` or any API key to GitHub.

---

# Running the Application

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Usage

## Step 1 — Enter a Website URL

Enter a public website URL such as:

```text
https://www.apple.com
```

Other tested examples include:

```text
https://example.com
```

```text
https://stripe.com
```

```text
https://www.airbnb.com
```

---

## Step 2 — Analyze

The analyzer visits the target website and extracts:

- Page structure
- Text
- Navigation
- Images
- Image URLs
- Buttons
- Sections
- Styling information
- Layout information
- Desktop screenshot
- Mobile screenshot

---

## Step 3 — Generate

The analysis is converted into a PageSpec.

The PageSpec is then passed to the code-generation layer.

A standalone Next.js project is generated under:

```text
generated-sites/
```

---

## Step 4 — Validate

The generated project is automatically built.

The system checks whether the generated application can successfully pass a production build.

If a build error occurs, automatic repair attempts are performed.

---

## Step 5 — Preview

Go to the generated project:

```bash
cd generated-sites/<project-name>
```

Install dependencies if required:

```bash
npm install
```

Start the generated website:

```bash
npm run dev
```

The generated website will then be available on the local development server.

---

# Natural-Language Modifications

After generating a website, use the modification interface to make changes using normal language.

Examples:

### Change primary color

```text
Make the primary color blue.
```

### Sticky navigation

```text
Make the navbar sticky.
```

### Add testimonials

```text
Add a testimonials section.
```

### Remove a section

```text
Remove the pricing section.
```

The system applies the requested modification and validates the generated project again.

---

# API Endpoints

## POST `/api/analyze`

Analyzes a public website and generates a structured PageSpec.

Example request:

```json
{
  "url": "https://example.com"
}
```

The response contains:

```text
analysis
pageSpec
pageSpecProvider
```

---

## POST `/api/generate`

Generates a standalone Next.js project from a PageSpec.

The endpoint:

1. Selects an available generator.
2. Generates the project.
3. Writes the project to disk.
4. Installs/builds the project.
5. Attempts repairs if necessary.
6. Returns the generation and validation results.

---

## POST `/api/modify`

Modifies an existing generated project using a natural-language instruction.

Example request:

```json
{
  "projectDirectory": "/path/to/generated-project",
  "instruction": "Make the primary color blue."
}
```

The modification is applied and the generated project is rebuilt to verify that it remains valid.

---

# Provider Architecture

AI functionality is abstracted behind provider interfaces.

```text
                AI Provider Interface
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       Gemini Provider        Mock Provider
              │                     │
              ▼                     ▼
        Gemini API            Deterministic
                               fallback
```

This separation keeps the application logic independent from a single AI provider.

The architecture is used for:

- PageSpec generation
- Code generation
- Natural-language modification

---

# Reliability and Error Handling

## AI Failures

Gemini requests may fail due to:

- Quota exhaustion
- Rate limits
- Temporary model unavailability
- API errors

The application falls back to local/mock implementations where possible.

This prevents a temporary AI failure from stopping the entire demonstration.

---

## Website Loading Failures

Some modern websites continuously make background requests.

Waiting for `networkidle` can therefore cause unnecessary timeouts.

The analyzer uses:

```text
domcontentloaded
```

to begin analysis once the document has loaded instead of requiring all background network requests to finish.

This was particularly relevant during testing with Airbnb.

---

## Generated Code Failures

Every generated project is validated using a production build.

If compilation fails:

```text
Generated Code
      ↓
Production Build
      ↓
Failure
      ↓
Repair Attempt
      ↓
Rebuild
```

This reduces the chance of returning an invalid generated project.

---

## Modification Failures

Generated projects are protected using a backup/restore mechanism during modifications.

If the modification causes the project to fail validation, the previous state can be restored.

---

# Generalization Testing

The agent was tested against multiple unrelated public websites.

| Website | Analysis | Generation | Build |
|---|---:|---:|---:|
| Example.com | PASS | PASS | PASS |
| Stripe.com | PASS | PASS | PASS |
| Airbnb.com | PASS | PASS | PASS |

### Airbnb robustness test

The initial Airbnb test exposed a navigation timeout caused by waiting for:

```text
networkidle
```

Airbnb maintains background network activity, so Playwright did not reach a network-idle state within the timeout.

The analyzer was changed to:

```text
domcontentloaded
```

After this change:

```text
Airbnb Analysis → PASS
Generation → PASS
Build → PASS
```

This improved the analyzer's robustness for modern dynamic websites.

---

# Key Design Decisions

## 1. Structured PageSpec

The system does not directly transform raw website HTML into generated code.

Instead:

```text
Website
   ↓
Analysis
   ↓
PageSpec
   ↓
Generated Code
```

The PageSpec provides an intermediate abstraction between website analysis and frontend generation.

This makes the architecture easier to reason about and extend.

---

## 2. Provider Abstraction

AI providers are separated from the rest of the application.

This allows the system to support:

- Gemini
- Mock/local fallback
- Future AI providers

without changing the entire generation pipeline.

---

## 3. Deterministic Fallback

The local generator provides a deterministic fallback when external AI generation is unavailable.

This is especially useful for an MVP where external API availability cannot be guaranteed during a live demonstration.

---

## 4. Build Validation

Generation is only considered successful after the generated project passes a real production build.

This provides a stronger validation signal than simply checking whether files were successfully written.

---

## 5. Automatic Repair

The system can attempt to repair generated projects when build errors occur.

This creates an additional validation loop:

```text
Generate
   ↓
Build
   ↓
Error
   ↓
Repair
   ↓
Build Again
```

---

## 6. Transactional Modification

Natural-language modifications are applied with validation.

If the modification produces an invalid project, the previous project state can be restored.

---

## 7. Real Image Assets

The analyzer extracts source image URLs.

Where possible, generated pages use those actual source image URLs instead of relying entirely on generic placeholders.

---

# Limitations

This implementation is an MVP rather than a production-grade website reconstruction system.

Current limitations include:

- Visual reconstruction is approximate rather than pixel-perfect.
- Complex JavaScript interactions are not fully reproduced.
- Dynamic website behavior cannot always be reconstructed.
- Some websites use protected, temporary, or inaccessible assets.
- Complex `<picture>` and responsive image structures may not always translate perfectly.
- Generated CSS and layout may differ from the original site's exact implementation.
- AI-generated code quality depends on model availability and response quality.
- The deterministic local generator is less sophisticated than a full AI code-generation pipeline.
- Generated sites are run locally rather than deployed automatically.
- Authentication and user accounts are not implemented.
- There is no persistent database for generated projects.
- The current MVP focuses primarily on frontend reconstruction rather than reproducing backend functionality.

---

# Future Improvements

Potential improvements for a production version include:

1. Visual-diff based iterative generation.
2. Screenshot-to-code feedback loops.
3. Improved DOM/component segmentation.
4. Automatic asset downloading and local asset management.
5. Better responsive breakpoint inference.
6. Browser-based visual validation.
7. More sophisticated generated-code repair.
8. Persistent project management.
9. Streaming generation progress.
10. Multi-provider AI routing.
11. Cost-aware model selection.
12. Automatic deployment.
13. More accurate reproduction of complex interactions.
14. Component-level visual comparison.
15. Automatic screenshot comparison between source and generated websites.

A possible future visual feedback loop:

```text
Source Website
      ↓
Source Screenshot
      │
      │
      ├──────────────┐
      │              │
      ▼              ▼
Generated Site   Generated Screenshot
      │              │
      └──────┬───────┘
             ▼
       Visual Difference
             │
             ▼
        AI Correction
             │
             ▼
          Regenerate
             │
             └──────────► Compare Again
```

---

# Technical Discussion

## How does the architecture work?

The application separates the cloning process into independent stages:

```text
Analysis
   ↓
Structured PageSpec
   ↓
Code Generation
   ↓
Build Validation
   ↓
Automatic Repair
   ↓
Natural-Language Modification
```

Each stage has a specific responsibility and can be independently improved or replaced.

---

## How is frontend generation made reliable?

The generated project is not considered successful merely because files were generated.

The project is actually built using Next.js.

If the build fails, the repair layer attempts to correct known generated-code problems and runs the build again.

This provides an automated validation loop around code generation.

---

## How does the system handle AI failures?

The system uses provider abstraction and fallback implementations.

For example:

```text
Gemini
   ↓
Failure
   ↓
Mock / Local Provider
```

This allows the application to continue functioning when external AI services are unavailable.

---

## How could visual accuracy be improved?

A production version could compare the source website screenshot against the generated website screenshot.

The visual differences could then be provided to the generation system for another correction pass.

For example:

```text
Source Screenshot
       ↓
Generated Screenshot
       ↓
Visual Diff
       ↓
AI Correction
       ↓
Regenerate
```

This process could be repeated until the visual difference falls below a desired threshold.

---

## How could AI costs be controlled?

Possible strategies include:

- Use smaller models for simple analysis.
- Cache website analyses.
- Cache generated PageSpecs.
- Use deterministic/local processing for predictable transformations.
- Send compact structured analysis rather than entire HTML documents.
- Route only complex generation tasks to larger models.
- Avoid repeated AI calls when the input has not changed.

---

## How could the system scale?

The current implementation performs generation locally.

A production architecture could separate the workload into asynchronous workers:

```text
Web Application
       │
       ▼
    Job Queue
       │
       ├──────────────┐
       ▼              ▼
Analysis Worker   Generation Worker
       │              │
       └──────┬───────┘
              ▼
       Validation Worker
              │
              ▼
        Artifact Storage
```

This would allow multiple cloning jobs to execute independently.

---

# Demo Flow

A recommended 5–10 minute demonstration:

```text
1. Open the dashboard.

2. Enter a public website URL.

3. Start analysis.

4. Show the extracted website information.

5. Show the desktop/mobile screenshots.

6. Generate the frontend.

7. Show the generation status.

8. Show successful build validation.

9. Open the generated website locally.

10. Demonstrate a natural-language modification.

11. Example:
    "Make the navbar sticky."

12. Show the modification result.

13. Show that the project builds again.

14. Demonstrate another website to show generalization.

15. Explain the Gemini → fallback architecture.

16. Show the GitHub repository.

17. Briefly explain limitations and future improvements.
```

---

# Example Demonstration Sites

The following websites were used during testing:

```text
https://example.com
https://stripe.com
https://www.airbnb.com
```

All three successfully passed the core analysis, generation, and build pipeline during final testing.

---

# Project Status

## Completed

- [x] Website URL input
- [x] Website analysis
- [x] Playwright integration
- [x] Desktop analysis
- [x] Mobile analysis
- [x] Screenshot capture
- [x] Image extraction
- [x] Image URL preservation
- [x] Navigation extraction
- [x] Section extraction
- [x] Structured PageSpec
- [x] Zod validation
- [x] Gemini integration
- [x] AI provider abstraction
- [x] Mock/local fallback
- [x] Next.js code generation
- [x] Local deterministic generator
- [x] Generated project writer
- [x] Build validation
- [x] Automatic repair
- [x] Natural-language modifications
- [x] Modification validation
- [x] Modification rollback
- [x] Multi-site testing
- [x] Local preview
- [x] End-to-end dashboard

---

# Scripts

Start development server:

```bash
npm run dev
```

Build the main application:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

---

# Security Notes

- API keys should only be stored in `.env.local`.
- `.env.local` should never be committed to Git.
- The application is intended for public websites that can be accessed by the analyzer.
- Generated websites should be treated as generated/untrusted code and inspected before being used in production.
- This project is an internship-assignment MVP and is not intended to provide production-grade isolation for arbitrary generated code.

---

# Conclusion

The Website Cloning Agent demonstrates an end-to-end approach to AI-assisted frontend reconstruction:

```text
Public Website
      ↓
Browser Analysis
      ↓
Structured Representation
      ↓
AI / Local Generation
      ↓
Generated Next.js App
      ↓
Build Validation
      ↓
Automatic Repair
      ↓
Natural-Language Modification
      ↓
Validated Local Website
```

The architecture prioritizes modularity, graceful AI failure handling, generated-code validation, and the ability to work across different website structures rather than relying on a single hardcoded website.

---

## Author

Built as a **Founding AI Engineer internship assignment**.

**Stack:** Next.js · React · TypeScript · Playwright · Gemini · Zod
```
