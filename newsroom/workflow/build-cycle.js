#!/usr/bin/env node
/**
 * build-cycle.js — Genera `cycle.script.js` (workflow eseguibile) da:
 *   - newsroom/prompts/*.md  (contratti dei ruoli, fonte di verità)
 *   - newsroom/config/editorial.json (configurazione editoriale)
 *
 * Uso:  node workflow/build-cycle.js
 * Dopo aver modificato un prompt o la config, rigenera il workflow.
 */
'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const PROMPTS_DIR = path.join(ROOT, 'prompts')
const CONFIG_PATH = path.join(ROOT, 'config', 'editorial.json')
const OUT_PATH = path.join(__dirname, 'cycle.script.js')

// ── 1. carica prompts ────────────────────────────────────────────────────────
const prompts = {}
for (const file of fs.readdirSync(PROMPTS_DIR).sort()) {
  if (!file.endsWith('.md')) continue
  const key = file.replace(/\.md$/, '')
  prompts[key] = fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf8').trim()
}

// ── 2. carica config ─────────────────────────────────────────────────────────
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

// ── 3. logica del ciclo (template) ───────────────────────────────────────────
// NB: nessun template literal dentro LOGIC: solo concatenazione di stringhe,
// così l'embedding in questo file template non richiede escaping.
const LOGIC = `
// ============================================================================
// CICLO EDITORIALE AUTONOMO — generato da workflow/build-cycle.js
// NON modificare direttamente: modifica i prompt in newsroom/prompts/*.md e la
// config in newsroom/config/editorial.json, poi rigenera con:
//   node newsroom/workflow/build-cycle.js
// ============================================================================

// ── input ────────────────────────────────────────────────────────────────────
const a = args || {}
const mode = a.mode || 'cycle'                 // cycle | update | research
const memory = a.memory || []
const language = a.language || CONFIG.language
const scope = a.scope || 'nessuna preferenza'
const targetStoryId = a.targetStoryId || ''
const newInfo = a.newInfo || ''
const topic = a.topic || ''
const now = a.now || ''

// ── bundle di output (FINAL OUTPUT dell'orchestratore) ───────────────────────
const bundle = {
  decision: 'IGNORE',
  priority: 0,
  reason: '',
  story_id: '',
  required_agents: [],
  confidence: 0,
  publication_status: 'not_started',
  next_action: 'monitor',
  news_object: null,
  artifacts: null,
  phases: [],
}

function fail(message) {
  bundle.decision = 'IGNORE'
  bundle.reason = message
  return bundle
}

function buildNewsObject(state) {
  const st = state.story || {}
  const dossier = state.dossier || null
  const factCheck = state.factCheck || null
  const contradictions = state.contradictionList || []
  const verifiedClaims = (factCheck && factCheck.claims) || []
  const rankDup = (rank && rank.duplicate_policy) || 'NEW_STORY'
  const history = [{ timestamp: now, event: 'discovered', detail: st.summary || '' }]
  if (state.extraHistory) history.push.apply(history, state.extraHistory)
  return {
    id: state.storyId || bundle.story_id,
    topic: st.topic || '',
    category: st.category || '',
    status: state.status || 'verified',
    urgency: (st.urgency || 0),
    importance: (st.importance || 0),
    audience_relevance: (st.audience_relevance || 0),
    news_score: (rank && rank.news_score) || 0,
    overall_confidence: bundle.confidence,
    duplicate_policy: rankDup,
    sources: (dossier && dossier.sources) || [],
    claims: (dossier && dossier.claims) || [],
    verified_claims: verifiedClaims,
    unverified_claims: verifiedClaims
      .filter(function (c) { return c.verification_status === 'unverified' || c.verification_status === 'disputed' })
      .map(function (c) { return c.claim }),
    contradictions: contradictions,
    story_history: history,
    article: state.article || { headline: '', subheadline: '', body: '' },
    seo: state.seo || { title: '', description: '', slug: '', keywords: [] },
    media: state.media ? mediaToArray(state.media) : [],
    approval: {
      research: !!dossier,
      fact_check: !!factCheck,
      contradiction_check: contradictions.length > 0 || !!state.contradictionChecked,
      editor: true,
      publish: !!state.publish,
    },
    timestamps: {
      discovered: now,
      researched: dossier ? now : '',
      verified: factCheck ? now : '',
      published: state.publish ? now : '',
      updated: state.updated ? now : '',
    },
  }
}

function mediaToArray(m) {
  const out = []
  if (m.main_image) out.push({ role: 'main', description: m.main_image, caption: m.caption || '', alt_text: m.alt_text || '' })
  ;(m.secondary || []).forEach(function (d) { out.push({ role: 'secondary', description: d, caption: '', alt_text: '' }) })
  ;(m.charts || []).forEach(function (d) { out.push({ role: 'chart', description: d, caption: '', alt_text: '' }) })
  ;(m.embeds || []).forEach(function (d) { out.push({ role: 'embed', description: d, caption: '', alt_text: '' }) })
  return out
}

// ── 1. DISCOVER ──────────────────────────────────────────────────────────────
phase('discover')
let candidates = []
if (mode === 'cycle') {
  const sources = a.sources || []
  if (sources.length > 0) {
    const siteScouts = await parallel(sources.map(function (s) {
      return function () {
        return agent(
          PROMPTS['site-scout'] +
          '\\n\\nFONTE ASSEGNATA: ' + JSON.stringify(s) +
          '\\nSCOPE: ' + scope +
          '\\nMEMORY (storie note): ' + JSON.stringify(memory) +
          '\\nLINGUA: ' + language,
          { schema: SCOUT_SCHEMA, label: 'site-scout' }
        )
      }
    }))
    siteScouts.forEach(function (r) {
      if (r && r.candidates) candidates = candidates.concat(r.candidates)
    })
    bundle.required_agents.push('site-scout')
    log('SITE SCOUT: ' + sources.length + ' fonti, ' + candidates.length + ' candidati')
  } else {
    const scout = await agent(
      PROMPTS.scout +
      '\\n\\nSCOPE: ' + scope +
      '\\nMEMORY (storie note): ' + JSON.stringify(memory) +
      '\\nLINGUA: ' + language,
      { schema: SCOUT_SCHEMA, label: 'scout' }
    )
    if (!scout) return fail('SCOUT non ha prodotto candidati validi')
    candidates = scout.candidates || []
    bundle.required_agents.push('scout')
    log('SCOUT: ' + candidates.length + ' candidati')
  }
}

// ── 2. CLASSIFY + RANK (EDITOR-IN-CHIEF) ─────────────────────────────────────
phase('classify')
let eicTask
if (mode === 'cycle') eicTask = { task: 'rank', candidates: candidates }
else if (mode === 'update') eicTask = { task: 'update', topic: topic, newInfo: newInfo, targetStoryId: targetStoryId }
else eicTask = { task: 'research', topic: topic }

const rank = await agent(
  PROMPTS['editor-in-chief'] +
  '\\n\\nFASE: ranking/deduplicazione\\nINPUT: ' + JSON.stringify(eicTask) +
  '\\nMEMORY: ' + JSON.stringify(memory) +
  '\\nCONFIG: ' + JSON.stringify(CONFIG) +
  '\\nLINGUA: ' + language,
  { schema: EIC_RANK_SCHEMA, label: 'editor-in-chief' }
)
if (!rank) return fail('EDITOR-IN-CHIEF non ha prodotto una decisione')
const story = rank.story || { topic: topic || '', category: '', summary: newInfo || '' }
const nowStamp = String(a.now || '').replace(/[^0-9]/g, '')
const storyId = rank.story_id || (nowStamp ? 'story-' + nowStamp : 'story-unknown')
bundle.story_id = storyId
bundle.decision = rank.action || 'IGNORE'
bundle.priority = rank.priority || 0
bundle.reason = rank.reason || ''
bundle.required_agents.push('editor-in-chief')

if (rank.action === 'IGNORE' || rank.action === 'MONITOR') {
  bundle.publication_status = rank.action === 'IGNORE' ? 'ignored' : 'monitoring'
  bundle.next_action = 'monitor'
  bundle.news_object = buildNewsObject({ story: story, storyId: storyId, status: rank.action === 'IGNORE' ? 'blocked' : 'monitoring' })
  return bundle
}

// ── 3. RESEARCH ──────────────────────────────────────────────────────────────
phase('research')
const researcher = await agent(
  PROMPTS.researcher +
  '\\n\\nSTORY: ' + JSON.stringify(story) +
  '\\nMEMORY: ' + JSON.stringify(memory) +
  '\\nLINGUA: ' + language,
  { schema: DOSSIER_SCHEMA, label: 'researcher' }
)
if (!researcher) return fail('RESEARCHER non ha prodotto un dossier')
const dossier = researcher
bundle.required_agents.push('researcher')
log('RESEARCH: ' + (dossier.claims || []).length + ' claims, ' + (dossier.sources || []).length + ' fonti')

// ── 4. VERIFY (in parallelo) ──────────────────────────────────────────────────
phase('verify')
const verifyResults = await parallel([
  function () {
    return agent(
      PROMPTS['fact-checker'] +
      '\\n\\nDOSSIER: ' + JSON.stringify(dossier) +
      '\\nLINGUA: ' + language,
      { schema: VERIFY_SCHEMA, label: 'fact-checker' }
    )
  },
  function () {
    return agent(
      PROMPTS['contradiction-agent'] +
      '\\n\\nDOSSIER: ' + JSON.stringify(dossier) +
      '\\nLINGUA: ' + language,
      { schema: CONTRADICTION_SCHEMA, label: 'contradiction-agent' }
    )
  },
])
const factCheck = verifyResults[0]
const contradiction = verifyResults[1]
if (!factCheck || !contradiction) return fail('VERIFICA incompleta: fact-checker o contradiction-agent non valido')
const contradictionList = contradiction.contradictions || []
const blocked = !!contradiction.blocked || contradictionList.some(function (c) { return c.severity === 'critical' })
bundle.required_agents.push('fact-checker', 'contradiction-agent')
bundle.confidence = factCheck.overall_confidence || 0
log('VERIFY: confidence=' + bundle.confidence + ', contraddizioni=' + contradictionList.length + ', blocked=' + blocked)

// ── 5. DECIDE (EDITOR-IN-CHIEF) ──────────────────────────────────────────────
phase('decide')
const decide = await agent(
  PROMPTS['editor-in-chief'] +
  '\\n\\nFASE: decisione finale\\nDOSSIER: ' + JSON.stringify(dossier) +
  '\\nFACT CHECK: ' + JSON.stringify(factCheck) +
  '\\nCONTRADDIZIONI: ' + JSON.stringify(contradiction) +
  '\\nCONFIG: ' + JSON.stringify(CONFIG) +
  '\\nBLOCKED: ' + blocked +
  '\\nMODE: ' + mode +
  '\\nLINGUA: ' + language,
  { schema: DECIDE_SCHEMA, label: 'editor-in-chief' }
)
if (!decide) return fail('EDITOR-IN-CHIEF non ha prodotto una decisione finale')
bundle.confidence = decide.confidence || bundle.confidence
bundle.reason = decide.reason || bundle.reason

const researchBlocked = blocked || decide.action === 'BLOCK' || decide.action === 'MORE_RESEARCH'
if (researchBlocked) {
  bundle.decision = blocked ? 'BLOCK' : decide.action
  bundle.publication_status = blocked ? 'blocked' : 'more_research_needed'
  bundle.next_action = decide.next_action || 'research'
  bundle.news_object = buildNewsObject({
    story: story, storyId: storyId, dossier: dossier, factCheck: factCheck,
    contradictionList: contradictionList, contradictionChecked: true,
    status: bundle.publication_status,
    extraHistory: [{ timestamp: now, event: 'verified', detail: 'confidence ' + bundle.confidence + '; ' + bundle.reason }],
  })
  return bundle
}

// modalità research: si ferma dopo la verifica
if (mode === 'research') {
  bundle.decision = 'RESEARCH'
  bundle.publication_status = 'researched'
  bundle.next_action = 'write'
  bundle.artifacts = { dossier: dossier, factCheck: factCheck, contradictions: contradictionList }
  bundle.news_object = buildNewsObject({
    story: story, storyId: storyId, dossier: dossier, factCheck: factCheck,
    contradictionList: contradictionList, contradictionChecked: true, status: 'researched',
  })
  return bundle
}

// ── 6. WRITE ─────────────────────────────────────────────────────────────────
phase('write')
const writeModeHint = mode === 'update'
  ? '\\nMODO: UPDATE — scrivi la versione AGGIORNATA completa dell\\'articolo incorporando le nuove informazioni; in notes elenca cosa è cambiato rispetto alla versione precedente.'
  : ''
const writer = await agent(
  PROMPTS.writer +
  '\\n\\nDOSSIER: ' + JSON.stringify(dossier) +
  '\\nVERIFICA: ' + JSON.stringify(factCheck) +
  '\\nCONTRADDIZIONI: ' + JSON.stringify(contradictionList) +
  '\\nSTORY: ' + JSON.stringify(story) +
  writeModeHint +
  '\\nLINGUA: ' + language,
  { schema: DRAFT_SCHEMA, label: 'writer' }
)
if (!writer) return fail('WRITER non ha prodotto una bozza')
const draft = writer
bundle.required_agents.push('writer')
log('WRITE: bozza "' + draft.headline + '"')

// ── 7. EDIT + SEO + VISUAL (in parallelo) ────────────────────────────────────
phase('polish')
const polishResults = await parallel([
  function () {
    return agent(
      PROMPTS['copy-editor'] +
      '\\n\\nBOZZA: ' + JSON.stringify(draft) +
      '\\nDOSSIER: ' + JSON.stringify(dossier) +
      '\\nLINGUA: ' + language,
      { schema: COPY_SCHEMA, label: 'copy-editor' }
    )
  },
  function () {
    return agent(
      PROMPTS['seo-editor'] +
      '\\n\\nARTICOLO: ' + JSON.stringify(draft) +
      '\\nSTORY: ' + JSON.stringify(story) +
      '\\nLINGUA: ' + language,
      { schema: SEO_SCHEMA, label: 'seo-editor' }
    )
  },
  function () {
    return agent(
      PROMPTS['visual-editor'] +
      '\\n\\nARTICOLO: ' + JSON.stringify(draft) +
      '\\nSTORY: ' + JSON.stringify(story) +
      '\\nDOSSIER: ' + JSON.stringify(dossier) +
      '\\nLINGUA: ' + language,
      { schema: MEDIA_SCHEMA, label: 'visual-editor' }
    )
  },
])
const copy = polishResults[0]
const seo = polishResults[1]
const visual = polishResults[2]
if (!copy || !seo || !visual) return fail('POLISH incompleto: copy-editor, seo-editor o visual-editor non valido')
const finalArticle = {
  headline: copy.headline || draft.headline,
  subheadline: copy.subheadline || draft.subheadline || '',
  body: copy.body || draft.body,
}
bundle.required_agents.push('copy-editor', 'seo-editor', 'visual-editor')

// ── 8. QUALITY GATE (PUBLISHER) ──────────────────────────────────────────────
phase('quality-gate')
const publisher = await agent(
  PROMPTS.publisher +
  '\\n\\nARTICOLO: ' + JSON.stringify(finalArticle) +
  '\\nSEO: ' + JSON.stringify(seo) +
  '\\nMEDIA: ' + JSON.stringify(visual) +
  '\\nDOSSIER: ' + JSON.stringify(dossier) +
  '\\nCONTRADDIZIONI: ' + JSON.stringify(contradictionList) +
  '\\nSTORY ID: ' + storyId +
  '\\nDUP POLICY: ' + ((rank && rank.duplicate_policy) || 'NEW_STORY') +
  '\\nCONFIDENCE: ' + bundle.confidence +
  '\\nLINGUA: ' + language,
  { schema: PUBLISHER_SCHEMA, label: 'publisher' }
)
if (!publisher) return fail('PUBLISHER non ha prodotto un verdetto')
bundle.required_agents.push('publisher')

// ── 9. DECISIONE FINALE ──────────────────────────────────────────────────────
phase('final')
const criticalIssues = publisher.critical_issues || []
const approved = publisher.approved && !blocked
const checklist = publisher.checklist || []
const commonState = {
  story: story, storyId: storyId, dossier: dossier, factCheck: factCheck,
  contradictionList: contradictionList, contradictionChecked: true,
  article: finalArticle, seo: seo, media: visual,
  extraHistory: [
    { timestamp: now, event: 'verified', detail: 'confidence ' + bundle.confidence + '; ' + bundle.reason },
    { timestamp: now, event: 'written', detail: finalArticle.headline },
  ],
}

if (!approved) {
  bundle.decision = 'CORRECT'
  bundle.publication_status = 'blocked_by_quality_gate'
  bundle.next_action = 'correct: ' + criticalIssues.join(' | ')
  bundle.artifacts = {
    article: finalArticle, seo: seo, media: visual, checklist: checklist,
    critical_issues: criticalIssues, minor_issues: publisher.minor_issues || [],
    publisher_notes: publisher.notes || '',
  }
  bundle.news_object = buildNewsObject(Object.assign({}, commonState, { status: 'writing' }))
  return bundle
}

const pubDecision = mode === 'update'
  ? 'UPDATE'
  : (decide.action === 'URGENT_PUBLISH' ? 'URGENT_PUBLISH' : 'PUBLISH')
bundle.decision = pubDecision
bundle.publication_status = mode === 'update' ? 'updated' : 'published'
bundle.next_action = 'monitor'
bundle.artifacts = {
  article: finalArticle, seo: seo, media: visual, checklist: checklist,
  critical_issues: [], minor_issues: publisher.minor_issues || [],
  publisher_notes: publisher.notes || '',
}
bundle.news_object = buildNewsObject(Object.assign({}, commonState, {
  status: bundle.publication_status,
  publish: true,
  updated: mode === 'update',
}))

return bundle
`

// ── 4. schemi JSON per gli output strutturati dei subagent ──────────────────
const SCHEMAS = `
const SCOUT_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          summary: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
          timestamp: { type: 'string' },
          urgency: { type: 'number' },
          importance: { type: 'number' },
          reliability: { type: 'number' },
          trend_velocity: { type: 'number' },
          suggested_action: { type: 'string' },
          related_story_id: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['topic', 'summary', 'sources', 'timestamp', 'urgency', 'importance', 'reliability'],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
}

const EIC_RANK_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['IGNORE', 'MONITOR', 'RESEARCH', 'WRITE', 'UPDATE', 'URGENT_PUBLISH', 'PUBLISH'] },
    story_id: { type: 'string' },
    story: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        category: { type: 'string' },
        summary: { type: 'string' },
        urgency: { type: 'number' },
        importance: { type: 'number' },
        audience_relevance: { type: 'number' },
        trend_velocity: { type: 'number' },
      },
      required: ['topic'],
      additionalProperties: false,
    },
    duplicate_policy: { type: 'string', enum: ['NEW_STORY', 'EXISTING_STORY_UPDATE', 'DUPLICATE', 'RELATED_STORY'] },
    news_score: { type: 'number' },
    priority: { type: 'number' },
    reason: { type: 'string' },
  },
  required: ['action', 'reason'],
  additionalProperties: false,
}

const DOSSIER_SCHEMA = {
  type: 'object',
  properties: {
    story: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        category: { type: 'string' },
        summary: { type: 'string' },
      },
      additionalProperties: false,
    },
    context: { type: 'string' },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          type: { type: 'string', enum: ['FACT', 'DECLARATION', 'ANALYSIS', 'RUMOR', 'UNCONFIRMED', 'OPINION'] },
          source: { type: 'string' },
          evidence: { type: 'string' },
          confidence: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['claim', 'type', 'source', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          name: { type: 'string' },
          kind: { type: 'string' },
          primary: { type: 'boolean' },
          independent: { type: 'boolean' },
        },
        required: ['url', 'name'],
        additionalProperties: false,
      },
    },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['claims', 'sources'],
  additionalProperties: false,
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          verification_status: { type: 'string', enum: ['verified', 'partially_verified', 'unverified', 'disputed', 'false'] },
          confidence_score: { type: 'number' },
          reason: { type: 'string' },
          source_independence: { type: 'string' },
          corrected_fact: { type: 'string' },
        },
        required: ['claim', 'verification_status', 'confidence_score'],
        additionalProperties: false,
      },
    },
    source_reliability: { type: 'number' },
    source_independence: { type: 'number' },
    evidence_quality: { type: 'number' },
    recency: { type: 'number' },
    internal_consistency: { type: 'number' },
    overall_confidence: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['overall_confidence'],
  additionalProperties: false,
}

const CONTRADICTION_SCHEMA = {
  type: 'object',
  properties: {
    contradictions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          evidence: { type: 'string' },
          resolution: { type: 'string' },
        },
        required: ['description', 'severity'],
        additionalProperties: false,
      },
    },
    blocked: { type: 'boolean' },
    summary: { type: 'string' },
  },
  required: ['contradictions', 'blocked'],
  additionalProperties: false,
}

const DECIDE_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['BLOCK', 'MORE_RESEARCH', 'WRITE', 'URGENT_PUBLISH', 'PUBLISH', 'CORRECT'] },
    confidence: { type: 'number' },
    reason: { type: 'string' },
    publication_status: { type: 'string' },
    next_action: { type: 'string' },
    unresolved_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['action', 'confidence', 'reason'],
  additionalProperties: false,
}

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    subheadline: { type: 'string' },
    body: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['headline', 'body'],
  additionalProperties: false,
}

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    subheadline: { type: 'string' },
    body: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['body'],
  additionalProperties: false,
}

const SEO_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    slug: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    structure: { type: 'string' },
  },
  required: ['title', 'description', 'slug', 'keywords'],
  additionalProperties: false,
}

const MEDIA_SCHEMA = {
  type: 'object',
  properties: {
    main_image: { type: 'string' },
    alt_text: { type: 'string' },
    caption: { type: 'string' },
    secondary: { type: 'array', items: { type: 'string' } },
    charts: { type: 'array', items: { type: 'string' } },
    embeds: { type: 'array', items: { type: 'string' } },
  },
  required: ['main_image'],
  additionalProperties: false,
}

const PUBLISHER_SCHEMA = {
  type: 'object',
  properties: {
    approved: { type: 'boolean' },
    checklist: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          check: { type: 'string' },
          pass: { type: 'boolean' },
        },
        required: ['check', 'pass'],
        additionalProperties: false,
      },
    },
    critical_issues: { type: 'array', items: { type: 'string' } },
    minor_issues: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['approved'],
  additionalProperties: false,
}
`

// ── 5. assembla e scrivi ─────────────────────────────────────────────────────
const header = `// AUTO-GENERATED — non modificare direttamente.
// Sorgente: newsroom/prompts/*.md + newsroom/config/editorial.json.
// Rigenera con: node newsroom/workflow/build-cycle.js
const PROMPTS = ${JSON.stringify(prompts, null, 2)}
const CONFIG = ${JSON.stringify(config, null, 2)}
`

const body = header + SCHEMAS + LOGIC
fs.writeFileSync(OUT_PATH, body)
console.log('Generato ' + path.relative(process.cwd(), OUT_PATH) + ' (' + body.length + ' byte, ' + Object.keys(prompts).length + ' prompt iniettati)')
