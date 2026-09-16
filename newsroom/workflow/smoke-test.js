#!/usr/bin/env node
/**
 * smoke-test.js — Verifica strutturale del workflow generato (cycle.script.js)
 * senza lanciare subagent reali: stubba i hook del workflow con risposte
 * precostituite e controlla che il flusso del ciclo produca il bundle atteso.
 *
 * Uso:  node workflow/smoke-test.js
 */
'use strict'

const fs = require('fs')
const path = require('path')

const code = fs.readFileSync(path.join(__dirname, 'cycle.script.js'), 'utf8')

const canned = {
  scout: {
    candidates: [
      {
        topic: 'Nuova versione del modello AI X annunciata',
        summary: 'L\'azienda X ha annunciato una nuova versione del suo modello con benchmark migliorati. I dati arrivano dal comunicato ufficiale.',
        sources: ['https://example.com/comunicato'],
        timestamp: '2025-01-02T10:00:00Z',
        urgency: 60,
        importance: 70,
        reliability: 75,
        trend_velocity: 50,
        suggested_action: 'WRITE',
        related_story_id: '',
        category: 'tecnologia',
      },
    ],
  },
  rank: {
    action: 'WRITE',
    story_id: '',
    story: {
      topic: 'Nuova versione del modello AI X annunciata',
      category: 'tecnologia',
      summary: 'Comunicato ufficiale dell\'azienda X.',
      urgency: 60,
      importance: 70,
      audience_relevance: 65,
      trend_velocity: 50,
    },
    duplicate_policy: 'NEW_STORY',
    news_score: 65,
    priority: 65,
    reason: 'Notizia rilevante per il pubblico tech, fonte primaria disponibile.',
  },
  researcher: {
    story: { topic: 'Nuova versione del modello AI X', category: 'tecnologia', summary: 'Riepilogo' },
    context: 'Contesto di settore.',
    claims: [
      { claim: 'Il modello migliora del 20% i benchmark', type: 'FACT', source: 'Comunicato ufficiale', evidence: 'Documento PDF ufficiale', confidence: 80, notes: '' },
      { claim: 'Disponibile da marzo', type: 'DECLARATION', source: 'CEO', evidence: 'Intervista', confidence: 60, notes: '' },
    ],
    sources: [
      { url: 'https://example.com/comunicato', name: 'Comunicato ufficiale', kind: 'primaria', primary: true, independent: true },
      { url: 'https://example.com/articolo', name: 'Testata Y', kind: 'secondaria', primary: false, independent: false },
    ],
    open_questions: ['Prezzo?'],
  },
  'fact-checker': {
    claims: [
      { claim: 'Il modello migliora del 20% i benchmark', verification_status: 'verified', confidence_score: 85, reason: 'Dati nel comunicato e confermati da test indipendenti', source_independence: '2 fonti indipendenti', corrected_fact: '' },
      { claim: 'Disponibile da marzo', verification_status: 'partially_verified', confidence_score: 60, reason: 'Dichiarazione del CEO non ancora confermata da date ufficiali', source_independence: '1 fonte', corrected_fact: '' },
    ],
    source_reliability: 80,
    source_independence: 70,
    evidence_quality: 80,
    recency: 90,
    internal_consistency: 85,
    overall_confidence: 80,
    notes: 'Nessuna criticità grave.',
  },
  'contradiction-agent': {
    contradictions: [],
    blocked: false,
    summary: 'Nessuna contraddizione trovata.',
  },
  decide: {
    action: 'PUBLISH',
    confidence: 80,
    reason: 'Confidence 80, nessuna contraddizione, policy PUBLISH.',
    publication_status: 'ready',
    next_action: 'publish',
    unresolved_issues: [],
  },
  writer: {
    headline: 'Il modello AI X migliora i benchmark del 20%',
    subheadline: 'Annuncio ufficiale dell\'azienda con conferme indipendenti',
    body: 'Corpo dell\'articolo con i fatti verificati.',
    notes: '',
  },
  'copy-editor': {
    headline: 'Il modello AI X migliora i benchmark del 20%',
    subheadline: 'Annuncio ufficiale dell\'azienda con conferme indipendenti',
    body: 'Corpo dell\'articolo revisionato.',
    notes: 'Correzioni minori.',
  },
  'seo-editor': {
    title: 'Modello AI X: benchmark +20% secondo il comunicato ufficiale',
    description: 'L\'azienda X annuncia un miglioramento del 20% nei benchmark. Ecco cosa dice il comunicato ufficiale e cosa confermano le fonti indipendenti.',
    slug: 'modello-ai-x-benchmark-20-comunicato',
    keywords: ['modello AI X', 'benchmark', 'intelligenza artificiale'],
    structure: 'H2: L\'annuncio\nH2: I dati\nH3: Le conferme',
  },
  'visual-editor': {
    main_image: 'Foto del comunicato stampa ufficiale dell\'azienda X',
    alt_text: 'Logo dell\'azienda X',
    caption: 'Comunicato ufficiale dell\'azienda X',
    secondary: [],
    charts: [],
    embeds: [],
  },
  publisher: {
    approved: true,
    checklist: [
      { check: 'Claim principali verificati', pass: true },
      { check: 'Fonti presenti', pass: true },
      { check: 'Nessuna contraddizione irrisolta', pass: true },
      { check: 'Titolo rappresenta il contenuto', pass: true },
      { check: 'SEO completo', pass: true },
    ],
    critical_issues: [],
    minor_issues: [],
    notes: 'OK.',
  },
  'site-scout': {
    source: { domain: 'example.com', name: 'Example News', lang: 'en', kind: 'quotidiano' },
    candidates: [
      {
        topic: 'Esempio di notizia dalla fonte',
        summary: 'Fatto letto nella pagina della fonte.',
        sources: ['https://example.com/articolo-1'],
        timestamp: '2025-01-02T08:00:00Z',
        urgency: 50,
        importance: 60,
        reliability: 70,
        trend_velocity: 40,
        suggested_action: 'WRITE',
        related_story_id: '',
        category: 'tecnologia',
      },
    ],
  },
}

const runner = (args, overrides) =>
  new Function(
    'agent', 'parallel', 'phase', 'log', 'args',
    'return (async () => {\n' + code + '\n})()'
  )(
    async (prompt, opts) => {
      const label = opts && opts.label
      const p = prompt || ''
      if (label === 'editor-in-chief') {
        return p.includes('FASE: ranking') ? overrides.rank || canned.rank : overrides.decide || canned.decide
      }
      return overrides[label] || canned[label] || null
    },
    (thunks) => Promise.all(thunks.map((t) => t())),
    () => {},
    () => {},
    args,
  )

async function run(name, args, overrides, expect) {
  const bundle = await runner(args, overrides || {})
  const ok = bundle && bundle.decision === expect
  console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + ' → decision=' + (bundle && bundle.decision) + ' (atteso ' + expect + ')')
  if (!ok) {
    console.error(JSON.stringify(bundle, null, 2).slice(0, 2000))
    process.exitCode = 1
  }
  return bundle
}

;(async () => {
  const base = { mode: 'cycle', memory: [], scope: 'tecnologia', now: '2025-01-02T12:00:00Z' }

  // 1. happy path
  const b1 = await run('cycle happy path', base, {}, 'PUBLISH')
  if (b1.news_object) {
    console.log('  news_object: id=' + b1.news_object.id + ', confidence=' + b1.news_object.overall_confidence + ', claims=' + b1.news_object.claims.length + ', verified=' + b1.news_object.verified_claims.length)
    console.log('  required_agents: ' + b1.required_agents.join(', '))
  }

  // 2. contraddizione critica → BLOCK
  await run('cycle contraddizione critica', base,
    {
      'contradiction-agent': {
        contradictions: [{ description: 'La data nel comunicato contraddice il report', severity: 'critical', evidence: 'url', resolution: '' }],
        blocked: true,
        summary: 'Contraddizione critica.',
      },
    },
    'BLOCK')

  // 3. fact-checker bassa confidence → MORE_RESEARCH
  await run('cycle confidence bassa', base,
    {
      'fact-checker': Object.assign({}, canned['fact-checker'], { overall_confidence: 45, source_reliability: 40, source_independence: 30, evidence_quality: 45, recency: 60, internal_consistency: 50 }),
      decide: Object.assign({}, canned.decide, { action: 'MORE_RESEARCH', confidence: 45, reason: 'Confidence 45: serve altra ricerca.' }),
    },
    'MORE_RESEARCH')

  // 4. quality gate fallisce → CORRECT
  await run('cycle quality gate fallisce', base,
    {
      publisher: Object.assign({}, canned.publisher, {
        approved: false,
        critical_issues: ['Titolo non rappresenta il contenuto', 'Un claim centrale è unverified'],
      }),
    },
    'CORRECT')

  // 5. modalità update
  await run('update mode happy path',
    {
      mode: 'update',
      memory: [{ id: 'story-1', topic: 'Modello AI X', headline: 'Vecchio titolo', status: 'published' }],
      targetStoryId: 'story-1',
      topic: 'Modello AI X',
      newInfo: 'L\'azienda ha pubblicato i dati completi dei benchmark',
      now: '2025-01-03T09:00:00Z',
    },
    {
      rank: Object.assign({}, canned.rank, { action: 'UPDATE', story_id: 'story-1', duplicate_policy: 'EXISTING_STORY_UPDATE' }),
    },
    'UPDATE')

  // 6. modalità research si ferma dopo la verifica
  await run('research mode', { mode: 'research', topic: 'Tema X', now: '2025-01-03T09:00:00Z' }, {}, 'RESEARCH')

  // 7. scout vuoto + EIC che decide IGNORE → early return senza ricerca
  await run('cycle scout vuoto',
    base,
    {
      scout: { candidates: [] },
      rank: { action: 'IGNORE', story_id: '', story: { topic: '' }, duplicate_policy: 'NEW_STORY', news_score: 0, priority: 0, reason: 'Nessun candidato rilevante trovato dallo scout.' },
    },
    'IGNORE')

  // 8. sourcing multi-fonte (site-scout fan-out) → PUBLISH, con 'site-scout' tra gli agenti
  const b8 = await run('cycle con fonti configurate (site-scout)',
    Object.assign({}, base, {
      sources: [
        { domain: 'ansa.it', name: 'ANSA', lang: 'it', kind: 'agenzia' },
        { domain: 'reuters.com', name: 'Reuters', lang: 'en', kind: 'agenzia' },
      ],
    }),
    {},
    'PUBLISH')
  if (b8.required_agents) {
    const hasSiteScout = b8.required_agents.indexOf('site-scout') !== -1
    const hasPlainScout = b8.required_agents.indexOf('scout') !== -1
    console.log('  site-scout usato: ' + hasSiteScout + ', scout generico assente: ' + !hasPlainScout)
    if (!hasSiteScout || hasPlainScout) { console.error('FAIL: agenti di sourcing errati'); process.exitCode = 1 }
  }

  console.log(process.exitCode ? 'SMOKE TEST FALLITO' : 'SMOKE TEST OK')
})().catch((e) => { console.error(e); process.exit(1) })
