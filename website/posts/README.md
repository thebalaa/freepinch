# RoboClaw Blog Posts

This directory contains all blog posts for the RoboClaw website. Posts are written in Markdown with YAML frontmatter.

## Creating a New Post

1. Create a new `.md` file in this directory
2. The filename (without `.md`) will be the URL slug (e.g., `my-post.md` → `/blog/my-post`)
3. Add frontmatter at the top of the file:

```markdown
---
title: Your Post Title
date: 2026-02-03
author: Your Name
excerpt: A brief summary of your post (displayed in the blog list)
tags:
  - tag1
  - tag2
---

Your post content goes here...
```

## Frontmatter Fields

- **title** (required): The title of your blog post
- **date** (required): Publication date in YYYY-MM-DD format
- **author** (optional): Author name
- **excerpt** (optional): Brief summary shown in blog listing
- **tags** (optional): Array of tags for categorization

## Markdown Features

The blog supports standard Markdown syntax:

### Headers
```markdown
# H1 Header
## H2 Header
### H3 Header
```

### Text Formatting
```markdown
**Bold text**
*Italic text*
***Bold and italic***
```

### Links
```markdown
[Link text](https://example.com)
```

### Images
```markdown
![Alt text](/images/example.png)
```

### Code

Inline: \`code here\`

Code blocks:
\`\`\`bash
npm run build
\`\`\`

### Lists

Unordered:
```markdown
* Item 1
* Item 2
- Item 3
```

Ordered:
```markdown
1. First
2. Second
3. Third
```

### Blockquotes
```markdown
> This is a quote
```

### Horizontal Rules
```markdown
---
```

## Example Post

See `welcome-to-roboclaw-blog.md` and `deploying-openclaw-to-hetzner.md` for complete examples.

## Building

After adding or editing posts, rebuild the site:

```bash
npm run build
```

The blog automatically generates static pages for all posts at build time.

## File Naming

- Use lowercase letters
- Separate words with hyphens
- Keep names descriptive but concise
- Examples: `getting-started.md`, `security-best-practices.md`

## Publishing

Since this is a static site, all posts are public once committed to the repository. Make sure posts are ready before committing them.
