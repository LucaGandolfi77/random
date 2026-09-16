#!/usr/bin/env node
/**
 * publish.js — Pubblicazione degli articoli della redazione sul sito.
 *
 * Legge il bundle del workflow da site/inbox/<story_id>.json (FINAL OUTPUT +
 * news_object + artifacts), renderizza site/template.html e scrive:
 *   - site/out/<slug>.html          (pagina articolo)
 *   - site/registry.json            (registro contenuti)
 *   - site/out/index.html           (home con gli ultimi articoli)
 *
 * Uso:
 *   node site/publish.js <story_id>     pubblica/aggiorna una storia
 *   node site/publish.js --all          pubblica tutto l'inbox
 *   node site/publish.js --list         elenca i bundle in inbox
 *
 * Modalità "api" (config.json → publishing.mode): non ancora implementata di
 * default; il campo api.endpoint + token da variabile d'ambiente è il punto di
 * aggancio per un CMS/API esterno (WordPress, custom).
 */
'use strict'

const fs = require('fs')
const path = require('path')

const SITE_DIR = __dirname
const CONFIG = JSON.parse(fs.readFileSync(path.join(SITE_DIR, 'config.json'), 'utf8'))
const SITE = CONFIG.site
const PUB = CONFIG.publishing
const OUT_DIR = path.join(SITE_DIR, PUB.out_dir)
const INBOX_DIR = path.join(SITE_DIR, PUB.inbox_dir)
const REGISTRY_FILE = path.join(SITE_DIR, PUB.registry_file)
const TEMPLATE = fs.readFileSync(path.join(SITE_DIR, PUB.template_file), 'utf8')

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n')
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function paragraphs(body) {
  return String(body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>')
    .join('\n')
}

function isoNow() { return new Date().toISOString() }

function render(bundle) {
  const no = bundle.news_object || {}
  const art = no.article || {}
  const seo = no.seo || {}
  const media = no.media || []
  const sources = no.sources || []
  const history = no.story_history || []

  let slug = (seo.slug || '').trim()
  if (!slug) slug = String(art.headline || no.topic || 'articolo').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  if (!slug) slug = 'articolo-' + (no.id || Date.now())

  const url = SITE.url.replace(/\/$/, '') + '/' + slug + '.html'

  // date più significativa
  const ts = no.timestamps || {}
  const date = ts.published || ts.updated || ts.verified || ts.researched || ts.discovered || isoNow()
  const dateLabel = new Date(date).toLocaleDateString(SITE.language === 'it' ? 'it-IT' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const statusLabel = no.status === 'updated' ? ' · aggiornato' : (no.status === 'retracted' ? ' · ritirato' : '')

  const correction = history.find((h) => h.event === 'corrected' || h.event === 'correction')
  const correctionBlock = correction
    ? '<div class="correction"><strong>Correzione:</strong> ' + esc(correction.detail || correction.event) + '</div>'
    : ''

  const mediaBlock = media.length
    ? media.map((m) => {
        const role = m.role === 'main' ? 'Immagine principale' : (m.role === 'chart' ? 'Grafico' : (m.role === 'embed' ? 'Contenuto incorporato' : 'Immagine'))
        const cap = m.caption ? ' — ' + esc(m.caption) : ''
        const alt = m.alt_text ? ' (alt: ' + esc(m.alt_text) + ')' : ''
        return '<div class="media"><strong>' + role + ':</strong> ' + esc(m.description) + cap + alt + '</div>'
      }).join('\n')
    : ''

  const sourcesBlock = sources.length
    ? '<div class="sources"><strong>Fonti:</strong><ul>' + sources.map((s) =>
        '<li>' + esc(s.name || s.url) + (s.url ? ' — <a href="' + esc(s.url) + '" rel="nofollow noopener">' + esc(s.url) + '</a>' : '') + '</li>'
      ).join('') + '</ul></div>'
    : ''

  const subtitles = art.subheadline ? '<p class="subheadline">' + esc(art.subheadline) + '</p>' : ''

  let html = TEMPLATE
    .replace(/{{LANG}}/g, SITE.language)
    .replace(/{{SITE_URL}}/g, SITE.url)
    .replace(/{{SITE_NAME}}/g, esc(SITE.name))
    .replace(/{{SEO_TITLE}}/g, esc(seo.title || art.headline || ''))
    .replace(/{{SEO_DESCRIPTION}}/g, esc(seo.description || ''))
    .replace(/{{CANONICAL}}/g, url)
    .replace(/{{CATEGORY}}/g, esc(no.category || 'news'))
    .replace(/{{HEADLINE}}/g, esc(art.headline || ''))
    .replace(/{{SUBTITLE_BLOCK}}/g, subtitles)
    .replace(/{{AUTHOR}}/g, esc(SITE.default_author))
    .replace(/{{DATE}}/g, dateLabel)
    .replace(/{{STATUS_LABEL}}/g, statusLabel)
    .replace(/{{CORRECTION_BLOCK}}/g, correctionBlock)
    .replace(/{{MEDIA_BLOCK}}/g, mediaBlock)
    .replace(/{{BODY_PARAGRAPHS}}/g, paragraphs(art.body))
    .replace(/{{SOURCES_BLOCK}}/g, sourcesBlock)

  return { slug, url, html, date }
}

function publishOne(storyId) {
  const inboxPath = path.join(INBOX_DIR, storyId + '.json')
  if (!fs.existsSync(inboxPath)) {
    console.error('Nessun bundle in inbox per ' + storyId + ' (atteso: ' + inboxPath + ')')
    process.exitCode = 1
    return
  }
  const bundle = JSON.parse(fs.readFileSync(inboxPath, 'utf8'))
  const rendered = render(bundle)

  // registro
  const registry = readJson(REGISTRY_FILE, [])
  const existing = registry.find((r) => r.id === bundle.story_id)
  let slug = rendered.slug
  const slugTaken = registry.find((r) => r.slug === slug && r.id !== bundle.story_id)
  if (slugTaken) slug = slug + '-' + (registry.filter((r) => r.slug === slug).length + 1)

  const entry = existing || { id: bundle.story_id, published_at: rendered.date }
  entry.slug = slug
  entry.url = SITE.url.replace(/\/$/, '') + '/' + slug + '.html'
  entry.headline = (bundle.news_object && bundle.news_object.article && bundle.news_object.article.headline) || ''
  entry.category = (bundle.news_object && bundle.news_object.category) || ''
  entry.decision = bundle.decision
  entry.status = (bundle.news_object && bundle.news_object.status) || 'published'
  entry.updated_at = isoNow()
  if (existing) {
    Object.assign(existing, entry)
  } else {
    registry.push(entry)
  }
  writeJson(REGISTRY_FILE, registry)

  // pagina
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, slug + '.html'), rendered.html)

  buildIndex(registry)
  console.log('Pubblicato: ' + entry.url)
  return entry
}

function buildIndex(registry) {
  const list = registry.slice().sort((a, b) => String(b.updated_at || b.published_at).localeCompare(String(a.updated_at || a.published_at)))
  const items = list.map((r) =>
    '<li><a href="' + esc(r.url) + '">' + esc(r.headline) + '</a> <span class="meta">(' + esc(r.category || '') + ')</span></li>'
  ).join('\n')
  const index = '<!DOCTYPE html><html lang="' + SITE.language + '"><head><meta charset="utf-8"><title>' +
    esc(SITE.name) + '</title><style>body{font:16px/1.6 Georgia,serif;max-width:720px;margin:2rem auto;padding:0 1.25rem}h1{font-size:1.8rem}ul{line-height:1.9}</style></head><body>' +
    '<h1>' + esc(SITE.name) + '</h1><ul>' + items + '</ul></body></html>'
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, PUB.index_file), index)
  console.log('Index aggiornato: ' + path.join(OUT_DIR, PUB.index_file))
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const arg = process.argv[2]
if (!arg || arg === '--help') {
  console.log('Uso: node site/publish.js <story_id> | --all | --list')
  process.exit(arg ? 0 : 1)
}
if (arg === '--list') {
  for (const f of fs.readdirSync(INBOX_DIR).filter((f) => f.endsWith('.json'))) {
    const b = JSON.parse(fs.readFileSync(path.join(INBOX_DIR, f), 'utf8'))
    console.log('- ' + f.replace(/\.json$/, '') + '  decision=' + b.decision + '  story=' + b.story_id + '  headline=' + ((b.news_object && b.news_object.article && b.news_object.article.headline) || ''))
  }
  process.exit(0)
}
if (arg === '--all') {
  const files = fs.readdirSync(INBOX_DIR).filter((f) => f.endsWith('.json'))
  if (!files.length) { console.log('Inbox vuoto.'); process.exit(0) }
  for (const f of files) publishOne(f.replace(/\.json$/, ''))
  process.exit(process.exitCode || 0)
}
publishOne(arg)
