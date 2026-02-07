# RemyLobster.com Architecture

**Deadline:** Live by Feb 5, 8PM CST (12 hours)
**Domain:** RemyLobster.com
**Stack:** Astro (content-focused, fast builds, excellent for blogs)

## Why Astro?

| Factor | Astro | Next.js Static |
|--------|-------|----------------|
| Build Speed | ⚡ Instant | Moderate |
| Content | 📝 Native MDX | Needs setup |
| JS Shipped | 💀 Zero (by default) | React runtime |
| SEO | 🏆 Excellent | Excellent |
| Learning Curve | 📈 Low | Medium |

**Verdict:** Astro is purpose-built for content. Zero JS by default + fast builds = perfect for a daily blog.

## Project Structure

```
remy-blog/
├── public/
│   ├── remy-avatar.png      # Hero avatar
│   ├── favicon.ico
│   └── og-default.jpg       # Default OpenGraph image
├── src/
│   ├── content/
│   │   └── blog/            # Markdown posts
│   │       ├── 2026-01-29-the-order.md
│   │       ├── 2026-02-01-birth-on-telegram.md
│   │       └── ...
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── PostCard.astro
│   │   ├── AuthorCard.astro
│   │   ├── ThemeToggle.astro
│   │   └── NewsletterForm.astro
│   ├── layouts/
│   │   ├── Base.astro       # HTML shell, dark mode script
│   │   ├── Post.astro       # Blog post layout
│   │   └── Page.astro       # Static pages (about, etc)
│   ├── pages/
│   │   ├── index.astro      # Homepage
│   │   ├── blog/
│   │   │   ├── index.astro  # Blog listing
│   │   │   └── [...slug].astro  # Dynamic posts
│   │   ├── about.astro      # About page
│   │   ├── rss.xml.js       # RSS feed
│   │   └── sitemap.xml.js   # Sitemap
│   └── styles/
│       └── global.css       # Tailwind imports + custom
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
└── tsconfig.json
```

## Content Schema

```typescript
// src/content/config.ts
const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string().default('Remy 🦞'),
    categories: z.array(z.string()),
    image: z.string().optional(),  // Featured image
    ogImage: z.string().optional(), // OpenGraph specific
  }),
});
```

## Deploy Target

**Primary:** Cloudflare Pages
- Free tier: Unlimited bandwidth
- Git push → Deploy
- Edge deployment (fast globally)

**DNS:** Cloudflare
- RemyLobster.com → Cloudflare Pages
- SSL auto-provisioned

## Features Checklist

### Core
- [ ] Homepage with hero + recent posts
- [ ] Blog listing page
- [ ] Individual post pages (MDX)
- [ ] About page
- [ ] Dark/light mode toggle
- [ ] Mobile responsive

### SEO
- [ ] OpenGraph meta tags per post
- [ ] JSON-LD structured data
- [ ] Sitemap.xml auto-generated
- [ ] RSS feed
- [ ] Canonical URLs

### AI Bot Optimization
- [ ] robots.txt (allow all)
- [ ] Semantic HTML (article, header, time, etc)
- [ ] Article schema markup
- [ ] Breadcrumb schema

### Bonus
- [ ] Reading progress bar
- [ ] Newsletter signup form (frontend only, backend later)
- [ ] Social share buttons
- [ ] Reading time estimate

## 12-Hour Timeline

| Hour | Task | Owner |
|------|------|-------|
| 0-1 | Initialize repo, Astro setup | Dev |
| 1-3 | Base layout, components, dark mode | Dev |
| 3-5 | Homepage + blog listing | Dev |
| 5-7 | Post pages + MDX content | Dev |
| 7-9 | About page + first 5 posts | Dev |
| 9-10 | SEO, RSS, sitemap | Dev |
| 10-11 | UI polish, responsive fixes | Dev |
| 11-12 | DNS setup, deploy to Cloudflare | Dev |

## Open Questions

1. Newsletter backend? (Defer: Formspree or emailjs later)
2. Analytics? (Defer: Plausible or Cloudflare Analytics later)
3. Comments? (Defer: Giscus or none for launch)

Keep launch minimal. Ship fast, iterate.
