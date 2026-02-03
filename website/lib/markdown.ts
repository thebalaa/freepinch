import fs from 'fs'
import path from 'path'
import { parse as parseYaml } from 'yaml'

export interface BlogPost {
  slug: string
  title: string
  date: string
  author?: string
  excerpt?: string
  content: string
  tags?: string[]
}

const postsDirectory = path.join(process.cwd(), 'posts')

function simpleMarkdownToHtml(markdown: string): string {
  let html = markdown

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-black/50 border border-white/10 rounded-lg p-4 overflow-x-auto my-4"><code class="text-sm font-mono text-gray-300">${escapeHtml(code.trim())}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-white/10 text-accent-purple px-2 py-1 rounded text-sm font-mono">$1</code>')

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-8 mb-4 text-white">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-10 mb-6 text-white">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold mt-12 mb-8 text-white">$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent-blue hover:text-accent-purple transition-colors underline">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-6 max-w-full" />')

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-6 mb-2">$1</li>')
  html = html.replace(/^- (.*$)/gim, '<li class="ml-6 mb-2">$1</li>')
  html = html.replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="list-disc text-gray-300 my-4">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-6 mb-2">$1</li>')

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-accent-purple pl-4 italic text-gray-400 my-4">$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr class="border-t border-white/10 my-8" />')

  // Paragraphs
  html = html.split('\n\n').map(para => {
    if (para.startsWith('<') || para.trim() === '') return para
    return `<p class="text-gray-300 leading-relaxed mb-4">${para}</p>`
  }).join('\n')

  return html
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  const posts = fileNames
    .filter(fileName => fileName.endsWith('.md') && fileName.toLowerCase() !== 'readme.md')
    .map(fileName => {
      const slug = fileName.replace(/\.md$/, '')
      return getPostBySlug(slug)
    })
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()))

  return posts
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // Parse frontmatter
    const frontmatterMatch = fileContents.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

    if (!frontmatterMatch) {
      return null
    }

    const frontmatter = parseYaml(frontmatterMatch[1])
    const content = frontmatterMatch[2]

    return {
      slug,
      title: frontmatter.title || 'Untitled',
      date: frontmatter.date || new Date().toISOString(),
      author: frontmatter.author,
      excerpt: frontmatter.excerpt,
      tags: frontmatter.tags || [],
      content: simpleMarkdownToHtml(content)
    }
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error)
    return null
  }
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames
    .filter(fileName => fileName.endsWith('.md') && fileName.toLowerCase() !== 'readme.md')
    .map(fileName => fileName.replace(/\.md$/, ''))
}
