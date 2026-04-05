import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { marked } from 'marked'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001
const CONTENT_DIR = path.join(__dirname, 'content')

app.use(cors())
app.use(express.json())

// Parse YAML-like frontmatter block
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/m)
  if (!match) return { meta: {}, content: raw }
  const meta = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    meta[key] = val
  }
  return { meta, content: match[2] }
}

function extractTitle(markdown) {
  const m = markdown.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : 'Untitled'
}

function buildPageMeta(filename) {
  const slug = filename.replace('.md', '')
  const filePath = path.join(CONTENT_DIR, filename)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { meta, content } = parseFrontmatter(raw)
  const title = extractTitle(content)
  const wordCount = content.trim().split(/\s+/).length
  const readingTime = Math.max(1, Math.round(wordCount / 200))
  const stat = fs.statSync(filePath)
  return {
    slug,
    title,
    category: meta.category || 'General',
    tags: meta.tags ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    wordCount,
    readingTime,
    lastModified: stat.mtime.toISOString(),
  }
}

// GET /api/pages — list all pages grouped by category
app.get('/api/pages', (_req, res) => {
  try {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))
    const pages = files.map(buildPageMeta)
    res.json(pages)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pages/:slug — single page with HTML + raw markdown
app.get('/api/pages/:slug', (req, res) => {
  try {
    const filePath = path.join(CONTENT_DIR, `${req.params.slug}.md`)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { meta, content } = parseFrontmatter(raw)
    const title = extractTitle(content)
    const html = marked.parse(content)
    const wordCount = content.trim().split(/\s+/).length
    const readingTime = Math.max(1, Math.round(wordCount / 200))
    const stat = fs.statSync(filePath)
    res.json({
      slug: req.params.slug,
      title,
      html,
      markdown: content,
      category: meta.category || 'General',
      tags: meta.tags ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      wordCount,
      readingTime,
      lastModified: stat.mtime.toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/search?q= — full-text search with snippets
app.get('/api/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim()
  if (!query) return res.json([])
  try {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))
    const results = []
    for (const filename of files) {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), 'utf-8')
      const { meta, content } = parseFrontmatter(raw)
      const title = extractTitle(content)
      const lc = content.toLowerCase()
      if (!lc.includes(query) && !title.toLowerCase().includes(query)) continue
      const idx = lc.indexOf(query)
      const start = Math.max(0, idx - 60)
      const end = Math.min(content.length, idx + query.length + 60)
      let snippet = content.slice(start, end).replace(/[#*`_]/g, '')
      if (start > 0) snippet = '…' + snippet
      if (end < content.length) snippet += '…'
      results.push({
        slug: filename.replace('.md', ''),
        title,
        category: meta.category || 'General',
        snippet,
        matchIndex: idx,
      })
    }
    results.sort((a, b) => a.matchIndex - b.matchIndex)
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/pages/:slug — save edited markdown
app.put('/api/pages/:slug', (req, res) => {
  try {
    const filePath = path.join(CONTENT_DIR, `${req.params.slug}.md`)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
    const { markdown, category, tags } = req.body
    if (!markdown) return res.status(400).json({ error: 'markdown required' })
    const front = `---\ncategory: ${category || 'General'}\ntags: ${(tags || []).join(', ')}\n---\n\n`
    fs.writeFileSync(filePath, front + markdown, 'utf-8')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`CMS API running at http://localhost:${PORT}`)
})
