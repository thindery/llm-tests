/**
 * Site Creation Module
 * 
 * Creates subdirectories within user repositories for individual sites.
 * Each site gets its own template, initial commit, and semantic version tag.
 */

import { commitFiles } from '../git/commit';
import { createTag } from '../git/tag';

export interface SiteConfig {
  userId: string;
  siteName: string;
  template?: 'portfolio' | 'blog' | 'landing' | 'blank';
  siteId?: string;
  domain?: string;
}

export interface SiteCreationResult {
  siteId: string;
  sitePath: string;
  commitSha: string;
  tagName: string;
  createdAt: Date;
  success: boolean;
  error?: string;
}

// Templates defined as functions to avoid hoisting issues
const getTemplate = (type: string): Record<string, string> => {
  const templates: Record<string, Record<string, string>> = {
    portfolio: {
      'index.html': portfolioTemplate,
      'style.css': portfolioStyles,
      'README.md': portfolioReadme,
    },
    blog: {
      'index.html': blogTemplate,
      'style.css': blogStyles,
      'README.md': blogReadme,
    },
    landing: {
      'index.html': landingTemplate,
      'style.css': landingStyles,
      'README.md': landingReadme,
    },
    blank: {
      'index.html': blankTemplate,
      'README.md': blankReadme,
    },
  };
  return templates[type] || templates.blank;
};

/**
 * Create a new site subdirectory in the user's repository
 * Path: sites/{siteName}/
 * Creates initial commit with template files
 * Tags: {sitename}/v1.0.0
 */
export async function createSite(config: SiteConfig): Promise<SiteCreationResult> {
  const siteId = config.siteId || `${config.userId}-${config.siteName}`;
  const sitePath = `sites/${config.siteName}`;
  const template = config.template || 'blank';
  const templateFiles = getTemplate(template);
  
  try {
    // Get the template files for this site type
    const files = Object.entries(templateFiles).map(([filename, content]) => ({
      path: `${sitePath}/${filename}`,
      content: content.replace(/\{SITE_NAME\}/g, config.siteName),
    }));

    // Create initial commit with template files
    const commitResult = await commitFiles({
      userId: config.userId,
      siteName: config.siteName,
      message: `feat: initialize ${config.siteName} site with ${template} template`,
      files,
      branch: 'main',
    });

    if (!commitResult.success) {
      throw new Error(commitResult.error || 'Failed to commit files');
    }

    // Create initial version tag
    const tagName = `${config.siteName}/v1.0.0`;
    await createTag({
      userId: config.userId,
      siteName: config.siteName,
      tagName: tagName,
      message: `Initial release of ${config.siteName}`,
      commitSha: commitResult.commitSha,
    });

    return {
      siteId,
      sitePath,
      commitSha: commitResult.commitSha,
      tagName,
      createdAt: new Date(),
      success: true,
    };

  } catch (error) {
    console.error('Failed to create site:', error);
    return {
      siteId,
      sitePath,
      commitSha: '',
      tagName: '',
      createdAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the site directory path for a given user and site
 */
export function getSitePath(_userId: string, siteName: string): string {
  return `sites/${siteName}`;
}

/**
 * Validate site name (URL-safe, no special chars)
 */
export function validateSiteName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length < 2) {
    return { valid: false, error: 'Site name must be at least 2 characters' };
  }
  
  if (name.length > 50) {
    return { valid: false, error: 'Site name must be 50 characters or less' };
  }
  
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: 'Site name must contain only lowercase letters, numbers, and hyphens' };
  }
  
  if (name.startsWith('-') || name.endsWith('-')) {
    return { valid: false, error: 'Site name cannot start or end with a hyphen' };
  }
  
  return { valid: true };
}

// Template Definitions

const portfolioTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{SITE_NAME} - Portfolio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>{SITE_NAME}</h1>
    <p>Welcome to my portfolio</p>
  </header>
  <main>
    <section class="about">
      <h2>About Me</h2>
      <p>This is your portfolio site description.</p>
    </section>
    <section class="projects">
      <h2>Projects</h2>
      <div class="project-grid">
        <!-- Add your projects here -->
      </div>
    </section>
  </main>
  <footer>
    <p>&copy; 2026 {SITE_NAME}</p>
  </footer>
</body>
</html>`;

const portfolioStyles = `/* Portfolio Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  padding: 4rem 0;
  border-bottom: 2px solid #eee;
  margin-bottom: 3rem;
}

header h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

header p {
  font-size: 1.25rem;
  color: #666;
}

section {
  margin-bottom: 3rem;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid #eee;
  color: #666;
}`;

const portfolioReadme = `# {SITE_NAME} Portfolio

## Editing Your Site

1. Modify \`index.html\` to update content
2. Update \`style.css\` to change appearance
3. Commit changes to deploy

## Structure

- \`index.html\` - Main page
- \`style.css\` - Stylesheet
- \`README.md\` - This file`;

const blogTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{SITE_NAME} - Blog</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>{SITE_NAME}</h1>
    <nav>
      <a href="#home">Home</a>
      <a href="#about">About</a>
      <a href="#archive">Archive</a>
    </nav>
  </header>
  <main>
    <article class="post">
      <h2>Welcome to {SITE_NAME}</h2>
      <time datetime="2026-02-27">February 27, 2026</time>
      <p>Start writing your first post...</p>
    </article>
  </main>
  <footer>
    <p>&copy; 2026 {SITE_NAME}</p>
  </footer>
</body>
</html>`;

const blogStyles = `/* Blog Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Georgia, serif;
  line-height: 1.8;
  color: #222;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  border-bottom: 1px solid #ddd;
  padding-bottom: 2rem;
  margin-bottom: 3rem;
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

nav a {
  margin-right: 1.5rem;
  color: #333;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}

article {
  margin-bottom: 3rem;
}

article h2 {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
}

time {
  color: #666;
  font-size: 0.9rem;
  display: block;
  margin-bottom: 1rem;
}

footer {
  border-top: 1px solid #ddd;
  padding-top: 2rem;
  margin-top: 4rem;
  color: #666;
}`;

const blogReadme = `# {SITE_NAME} Blog

## Writing Posts

1. Edit \`index.html\` to add posts
2. Use semantic HTML: \`<article>\`, \`<time>\`, etc.
3. Commit to publish

## Customization

- \`style.css\` - Typography and spacing
- \`index.html\` - Blog structure`;

const landingTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{SITE_NAME}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <section class="hero">
    <h1>{SITE_NAME}</h1>
    <p class="tagline">Your compelling tagline here</p>
    <a href="#cta" class="cta-button">Get Started</a>
  </section>
  <section class="features">
    <div class="feature">
      <h3>Feature 1</h3>
      <p>Describe your first feature</p>
    </div>
    <div class="feature">
      <h3>Feature 2</h3>
      <p>Describe your second feature</p>
    </div>
    <div class="feature">
      <h3>Feature 3</h3>
      <p>Describe your third feature</p>
    </div>
  </section>
  <footer>
    <p>&copy; 2026 {SITE_NAME}</p>
  </footer>
</body>
</html>`;

const landingStyles = `/* Landing Page Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #333;
}

.hero {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
}

.hero h1 {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.tagline {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-button {
  background: white;
  color: #667eea;
  padding: 1rem 2rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.features {
  padding: 5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 3rem;
}

.feature {
  text-align: center;
}

.feature h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.feature p {
  color: #666;
}

footer {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  color: #666;
}`;

const landingReadme = `# {SITE_NAME} Landing Page

## Sections

- Hero - Main headline and CTA
- Features - Three-column feature grid
- Footer - Copyright info

## Setup

1. Edit \`index.html\` with your content
2. Adjust colors in \`style.css\`
3. Replace gradient in hero section`;

const blankTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{SITE_NAME}</title>
</head>
<body>
  <h1>Welcome to {SITE_NAME}</h1>
  <p>Start building your site here.</p>
</body>
</html>`;

const blankReadme = `# {SITE_NAME}

## Getting Started

1. Edit \`index.html\` to add your content
2. Add CSS/JS files as needed
3. Commit your changes

Happy building!`;
