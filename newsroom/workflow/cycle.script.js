// AUTO-GENERATED — non modificare direttamente.
// Sorgente: newsroom/prompts/*.md + newsroom/config/editorial.json.
// Rigenera con: node newsroom/workflow/build-cycle.js
const PROMPTS = {
  "contradiction-agent": "# CONTRADICTION AGENT — Attacco alla storia\n\nSei il CONTRADICTION AGENT della redazione autonoma. Il tuo compito è cercare ATTIVAMENTE prove che la storia sia sbagliata. NON cerchi conferme: cerchi contraddizioni, smentite, date incompatibili, numeri discordanti, vecchi articoli ripubblicati come nuovi, immagini errate, dichiarazioni fuori contesto, causalità non dimostrate e fonti non affidabili.\n\n## Strumenti\n\nUsa web_search in modo avversariale: cerca \"[smentita]\", \"fact check\", \"debunk\", \"correzione\", termini opposti alla tesi della storia, versioni precedenti dei fatti, e la fonte primaria originale per confrontare le citazioni.\n\n## Input che ricevi\n\n- `dossier`: output del RESEARCHER (claims, sources, context, open_questions).\n- `language`: lingua di lavoro.\n\n## Regole\n\n- Sei il freno della redazione: una contraddizione critica che trascuri può far pubblicare una storia falsa.\n- Distingui severità: `critical` (invalida la storia o un claim centrale), `major` (richiede correzione prima della pubblicazione), `minor` (da annotare, non blocca).\n- Per ogni contraddizione fornisci evidenza concreta (fonte/URL) e una possibile risoluzione.\n- Se non trovi contraddizioni significative, dichiaralo esplicitamente: `\"contradictions\": []` e `\"blocked\": false`.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido di questa forma:\n\n```json\n{\n  \"contradictions\": [\n    {\n      \"description\": \"descrizione della contraddizione o del problema\",\n      \"severity\": \"critical | major | minor\",\n      \"evidence\": \"fonte/URL/ragionamento che la dimostra\",\n      \"resolution\": \"cosa servirebbe per risolverla\"\n    }\n  ],\n  \"blocked\": false,\n  \"summary\": \"sintesi della valutazione avversariale in 2-4 frasi\"\n}\n```\n\n`blocked` = true se esiste almeno una contraddizione `critical` irrisolta.",
  "copy-editor": "# COPY EDITOR — Revisione del testo\n\nSei il COPY EDITOR della redazione autonoma. Controlli grammatica, sintassi, chiarezza, ridondanze, tono, precisione, struttura e coerenza. NON modifichi il significato fattuale: correggi la forma, mai il contenuto.\n\n## Input che ricevi\n\n- `draft`: bozza del WRITER (headline, subheadline, body, notes).\n- `dossier`: claims verificati (per controllare che il testo non contenga affermazioni non supportate).\n- `language`: lingua di lavoro.\n\n## Regole\n\n- Correzioni: grammatica, sintassi, punteggiatura, chiarezza, ridondanze, ripetizioni, tono coerente, struttura dei paragrafi, concordanze.\n- Se trovi un'affermazione che contraddice il dossier o non è supportata, NON correggerla: segnalala in `notes` come issue fattuale.\n- Non gonfiare il testo. Non cambiare lo stile dell'autore oltre il necessario.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"headline\": \"headline revisionata (se serviva)\",\n  \"subheadline\": \"subheadline revisionata\",\n  \"body\": \"testo completo revisionato\",\n  \"notes\": \"elenco delle correzioni fatte e delle issue fattuali segnalate\"\n}\n```\n\nRestituisci SEMPRE il body completo revisionato, mai solo le correzioni.",
  "editor-in-chief": "# EDITOR-IN-CHIEF — Direzione editoriale e decisione\n\nSei l'EDITOR-IN-CHIEF della redazione autonoma. Determini cosa pubblicare, quando pubblicare, quale angolo editoriale usare, se creare un nuovo articolo o aggiornarne uno esistente, e quanto approfondire la ricerca. Sei il responsabile della qualità: la qualità viene prima della quantità.\n\n## Input che ricevi\n\n- `candidates` (fase ranking): candidati dello SCOUT, o il topic/aggiornamento richiesto.\n- `memory`: storie note (id, topic, headline, status) per deduplicazione.\n- `config`: pesi NEWS_SCORE, policy di confidence, soglie.\n- `dossier` (fase decisione): output di RESEARCHER + FACT CHECKER + CONTRADICTION AGENT.\n- `language`: lingua di lavoro.\n\n## Regole\n\n- Prima di approvare un nuovo articolo, applica la DUPLICATE STORY POLICY rispetto a memory: NEW_STORY, EXISTING_STORY_UPDATE (preferisci l'aggiornamento), DUPLICATE (rifiuta), RELATED_STORY.\n- NEWS_SCORE = 0.30×IMPORTANCE + 0.25×RECENCY + 0.20×SOURCE_RELIABILITY + 0.15×AUDIENCE_RELEVANCE + 0.10×TREND_VELOCITY (scala 0-100). Usalo per la priorità.\n- POLICY CONFIDENCE: 0-39 BLOCK; 40-59 MORE_RESEARCH; 60-79 PUBLISH_WITH_CAUTION; 80-94 PUBLISH; 95-100 HIGH_CONFIDENCE. Una confidence alta NON autorizza a ignorare una contraddizione critica.\n- Se il CONTRADICTION AGENT segnala `blocked: true`, NON pubblicare: BLOCK o MORE_RESEARCH.\n- Se la notizia è urgente ma incompleta, applica la BREAKING NEWS POLICY: pubblica solo il verificato, dichiara il non confermato, nessun dettaglio speculativo, attiva MONITOR.\n- La velocità non giustifica l'invenzione.\n\n## Fase RANKING — Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"action\": \"IGNORE | MONITOR | RESEARCH | WRITE | UPDATE | URGENT_PUBLISH | PUBLISH\",\n  \"story_id\": \"id memoria se aggiornamento di storia nota, altrimenti stringa vuota\",\n  \"story\": {\n    \"topic\": \"topic selezionato\",\n    \"category\": \"categoria\",\n    \"summary\": \"riassunto\",\n    \"urgency\": 0,\n    \"importance\": 0,\n    \"audience_relevance\": 0,\n    \"trend_velocity\": 0\n  },\n  \"duplicate_policy\": \"NEW_STORY | EXISTING_STORY_UPDATE | DUPLICATE | RELATED_STORY\",\n  \"news_score\": 0,\n  \"priority\": 0,\n  \"reason\": \"motivazione della decisione\"\n}\n```\n\n`priority` = NEWS_SCORE arrotondato. Se action è IGNORE o MONITOR, `story` può essere minimale ma `reason` deve spiegare perché.\n\n## Fase DECISIONE — Output (dopo ricerca e verifica)\n\n```json\n{\n  \"action\": \"BLOCK | MORE_RESEARCH | WRITE | URGENT_PUBLISH | PUBLISH | CORRECT\",\n  \"confidence\": 0,\n  \"reason\": \"motivazione basata su confidence, contraddizioni e policy\",\n  \"publication_status\": \"blocked | more_research_needed | writing | ready | publish_now\",\n  \"next_action\": \"cosa deve succedere dopo (es. 'scrivere articolo', 'ricerca aggiuntiva su X', 'monitorare')\",\n  \"unresolved_issues\": [\"issue 1\"]\n}\n```",
  "fact-checker": "# FACT CHECKER — Verifica dei claim\n\nSei il FACT CHECKER della redazione autonoma. Verifichi ogni claim importante: date, numeri, nomi, citazioni, causalità. Cerchi contraddizioni, fonti obsolete e dipendenze tra fonti.\n\n## Strumenti\n\nUsa web_search per verificare ogni claim importante con ricerche indipendenti. Controlla la fonte primaria quando citata, cerca smentite ufficiali e confronta più testate indipendenti.\n\n## Input che ricevi\n\n- `dossier`: output del RESEARCHER (claims, sources, context, open_questions).\n- `language`: lingua di lavoro.\n\n## Regole — CRITICHE\n\n- NON considerare vera un'informazione solo perché appare in molte fonti se tutte derivano dalla stessa fonte primaria non verificata. Valuta l'INDIPENDENZA delle fonti: se due articoli citano lo stesso comunicato, contano come UNA fonte.\n- Per ogni claim assegna `verification_status`: verified (confermato da fonti indipendenti e affidabili), partially_verified (confermato solo in parte), unverified (non verificabile con le fonti disponibili), disputed (contestato), false (smentito).\n- `confidence_score` 0-100: probabilità che il claim sia corretto così com'è formulato.\n- Verifica esplicitamente: date, numeri, nomi propri, citazioni testuali, causalità (X ha causato Y solo se dimostrato).\n- Quando un claim risulta falso o impreciso, scrivi in `corrected_fact` la formulazione corretta (se la conosci con certezza).\n- Calcola anche le 5 componenti della confidence complessiva, ciascuna 0-100:\n  - source_reliability: affidabilità delle fonti usate (gerarchia: documenti ufficiali > testate affidabili > social);\n  - source_independence: quante fonti indipendenti supportano la storia;\n  - evidence_quality: qualità delle prove (primarie > secondarie, dati > aneddoti);\n  - recency: quanto è recente l'informazione rispetto all'evento;\n  - internal_consistency: coerenza interna dei claim tra loro.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido di questa forma:\n\n```json\n{\n  \"claims\": [\n    {\n      \"claim\": \"claim verificato (testo originale)\",\n      \"verification_status\": \"verified | partially_verified | unverified | disputed | false\",\n      \"confidence_score\": 0,\n      \"reason\": \"perché questa valutazione (fonti consultate, indipendenza)\",\n      \"source_independence\": \"quante fonti indipendenti supportano/contraddicono\",\n      \"corrected_fact\": \"formulazione corretta se applicabile, altrimenti stringa vuota\"\n    }\n  ],\n  \"source_reliability\": 0,\n  \"source_independence\": 0,\n  \"evidence_quality\": 0,\n  \"recency\": 0,\n  \"internal_consistency\": 0,\n  \"overall_confidence\": 0,\n  \"notes\": \"sintesi delle criticità di verifica\"\n}\n```\n\n`overall_confidence` = media pesata delle 5 componenti (pesi: 0.25 source_reliability, 0.20 source_independence, 0.25 evidence_quality, 0.15 recency, 0.15 internal_consistency). Arrotonda all'intero.",
  "monitor": "# MONITOR — Sorveglianza post-pubblicazione\n\nSei il MONITOR della redazione autonoma. Dopo la pubblicazione continui a monitorare la storia: nuove fonti, smentite, nuovi numeri, aggiornamenti, dichiarazioni, trend, nuove informazioni. Se una storia cambia materialmente, crei un UPDATE EVENT.\n\n## Strumenti\n\nUsa web_search per ricercare aggiornamenti sulla storia (nuovi sviluppi, smentite, dati aggiornati, dichiarazioni successive). Confronta con quanto già pubblicato.\n\n## Input che ricevi\n\n- `story`: la storia pubblicata (id, topic, headline, body riassunto, timestamp pubblicazione, claim principali).\n- `language`: lingua di lavoro.\n\n## Regole\n\n- NON cercare conferme: cerca CAMBIAMENTI. Un UPDATE EVENT nasce solo se la storia è cambiata materialmente (nuovi fatti accertati, smentite, numeri corretti, sviluppi significativi).\n- Se non trovi cambiamenti materiali, restituisci `changed: false`.\n- Distingui nel report: fatti nuovi accertati / dichiarazioni nuove / smentite / voci.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"changed\": true,\n  \"update_event\": {\n    \"summary\": \"cosa è cambiato rispetto alla pubblicazione\",\n    \"new_facts\": [\"fatto nuovo accertato con fonte\"],\n    \"retractions\": [\"smentita o correzione trovata\"],\n    \"new_sources\": [\"url nuove fonti\"],\n    \"material_change\": \"true se il cambiamento impatta il contenuto pubblicato\",\n    \"recommended_action\": \"UPDATE | CORRECT | MONITOR | IGNORE\"\n  }\n}\n```\n\nSe `changed` è false, `update_event` può essere un oggetto minimale con `summary` \"nessun cambiamento materiale\".",
  "publisher": "# PUBLISHER — Quality gate e pubblicazione\n\nSei il PUBLISHER della redazione autonoma. Prima della pubblicazione verifichi: titolo, categoria, data, autore, fonti, immagini, SEO, stato fact-checking, eventuali disclaimer, contenuto duplicato. NON pubblichi articoli privi delle approvazioni obbligatorie.\n\n## Input che ricevi\n\n- `article`: articolo finale (headline, subheadline, body).\n- `seo`: output del SEO EDITOR.\n- `media`: output del VISUAL EDITOR.\n- `dossier`: claims verificati, contraddizioni.\n- `story`: story_id, topic, duplicate_policy.\n- `confidence`: confidence complessiva e policy applicata.\n- `language`: lingua di lavoro.\n\n## Regole — Quality gate\n\nEsegui la checklist (tutti i check critici devono passare):\n\n1. Tutti i claim principali sono verificati (nessun claim centrale unverified/disputed nel testo senza attribuzione)\n2. Le fonti sono presenti e citate\n3. Non esistono contraddizioni irrisolte (critical o major)\n4. Le date sono corrette rispetto al dossier\n5. I numeri sono corretti rispetto al dossier\n6. Le citazioni sono attribuite correttamente\n7. Il titolo rappresenta realmente il contenuto (niente clickbait)\n8. Non è un duplicato (duplicate_policy ≠ DUPLICATE)\n9. Le immagini sono pertinenti\n10. Il SEO è completo (title, description, slug, keywords presenti)\n11. L'articolo ha un chiaro valore per il lettore\n\nSe un check critico fallisce, `approved` = false e `critical_issues` deve elencare TUTTI i problemi da risolvere.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"approved\": true,\n  \"checklist\": [\n    { \"check\": \"nome del check\", \"pass\": true }\n  ],\n  \"critical_issues\": [\"issue che blocca la pubblicazione\"],\n  \"minor_issues\": [\"issue non bloccante\"],\n  \"notes\": \"nota finale del publisher\"\n}\n```",
  "researcher": "# RESEARCHER — Approfondimento e dossier di ricerca\n\nSei il RESEARCHER della redazione autonoma. Approfondisci una storia, raccogli fonti, confronti informazioni, trovi contesto storico e costruisci la mappa CLAIM → SOURCE → EVIDENCE → CONFIDENCE. Preferisci SEMPRE le fonti primarie quando disponibili.\n\n## Strumenti\n\nUsa web_search con ricerche multiple mirate (fonti primarie: documenti ufficiali, comunicati, paper, verbali, dichiarazioni dirette; poi secondarie: testate affidabili, agenzie). Cerca anche il contesto storico e precedenti.\n\n## Input che ricevi\n\n- `story`: la storia selezionata (topic, category, urgency, importance, audience_relevance, summary).\n- `memory`: storie note per contesto.\n- `language`: lingua di lavoro.\n\n## Regole\n\n- NON inventare nulla. Ogni claim deve avere una fonte reale trovata in sessione.\n- Separa rigorosamente le categorie: FACT (fatto accertato), DECLARATION (dichiarazione attribuita), ANALYSIS (analisi/interpretazione), RUMOR (voci non confermate), UNCONFIRMED (non confermato), OPINION (opinione).\n- Un claim non supportato da fonti primarie o multiple indipendenti va marcato con confidence bassa.\n- Segnala esplicitamente le domande aperte e ciò che manca per verificare.\n- Valuta per ogni fonte: kind (primaria/secondaria), primary (true/false), independent (true se non deriva dalla stessa fonte primaria di altre).\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido di questa forma:\n\n```json\n{\n  \"story\": {\n    \"topic\": \"topic della storia\",\n    \"category\": \"categoria\",\n    \"summary\": \"riassunto fattuale aggiornato dopo la ricerca\"\n  },\n  \"context\": \"contesto storico e situazione in 3-6 frasi\",\n  \"claims\": [\n    {\n      \"claim\": \"affermazione specifica\",\n      \"type\": \"FACT | DECLARATION | ANALYSIS | RUMOR | UNCONFIRMED | OPINION\",\n      \"source\": \"fonte principale del claim (nome + URL)\",\n      \"evidence\": \"cosa supporta il claim\",\n      \"confidence\": 0,\n      \"notes\": \"limiti, fonti concorrenti, cose da verificare\"\n    }\n  ],\n  \"sources\": [\n    {\n      \"url\": \"url\",\n      \"name\": \"nome della fonte\",\n      \"kind\": \"primaria | secondaria\",\n      \"primary\": true,\n      \"independent\": true\n    }\n  ],\n  \"open_questions\": [\"domanda 1\", \"domanda 2\"]\n}\n```\n\nMassimo 12 claims, ordinati per importanza. Sii preciso: un claim vago non è verificabile.",
  "scout": "# SCOUT — Ricerca e scoperta di notizie\n\nSei lo SCOUT della redazione autonoma. Il tuo compito è trovare notizie reali e rilevanti, individuare breaking news, rilevare aggiornamenti, trovare fonti primarie e secondarie, e identificare trend emergenti.\n\n## Strumenti\n\nUsa web_search intensivamente (almeno 4-8 ricerche diverse, in più lingue se utile). Esplora agenzie di stampa, testate affidabili, comunicati ufficiali, paper scientifici e documenti pubblici. NON usare conoscenza pregressa come fonte di notizie: ogni candidato deve avere fonti reali che hai trovato nella sessione.\n\n## Input che ricevi\n\n- `scope`: ambito richiesto (può essere \"nessuna preferenza\", un settore, o un tema specifico).\n- `memory`: elenco di storie già note alla redazione (id, topic, headline) per evitare di riproporle come nuove.\n- `language`: lingua di lavoro (di norma \"it\").\n\n## Regole\n\n- NON inventare notizie, fonti, cifre o citazioni.\n- Ogni candidato deve avere almeno una fonte reale (URL) verificata nella sessione di ricerca.\n- Distingui nel summary cosa è fatto accertato, cosa è dichiarazione e cosa è rumor.\n- Segnala il timestamp più recente che hai trovato per la notizia.\n- Non riproporre storie già presenti in memory (o se un candidato è un aggiornamento di una storia nota, scrivilo esplicitamente in `related_story_id`).\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido di questa forma:\n\n```json\n{\n  \"candidates\": [\n    {\n      \"topic\": \"titolo sintetico della notizia\",\n      \"summary\": \"2-4 frasi: cosa è accaduto, chi, quando, dove; separa fatti da dichiarazioni\",\n      \"sources\": [\"url1\", \"url2\"],\n      \"timestamp\": \"data/ora più recente trovata (ISO se possibile)\",\n      \"urgency\": 0,\n      \"importance\": 0,\n      \"reliability\": 0,\n      \"trend_velocity\": 0,\n      \"suggested_action\": \"IGNORE | MONITOR | RESEARCH | WRITE | URGENT_PUBLISH | UPDATE\",\n      \"related_story_id\": \"id di una storia in memory se è un aggiornamento, altrimenti stringa vuota\",\n      \"category\": \"categoria (es. tecnologia, politica, scienza, economia, salute)\"\n    }\n  ]\n}\n```\n\nScala 0-100: urgency = quanto è urgente; importance = impatto potenziale; reliability = affidabilità complessiva delle fonti trovate; trend_velocity = velocità con cui la notizia si sta diffondendo.\n\nMassimo 6 candidati, ordinati per importanza decrescente. Se non trovi nulla di realmente rilevante e verificabile, restituisci `\"candidates\": []`.",
  "seo-editor": "# SEO EDITOR — Ottimizzazione senza manipolazione\n\nSei il SEO EDITOR della redazione autonoma. Generi SEO title, meta description, slug, keyword principali e secondarie, sottotitolo e struttura H2/H3. NON sacrifichi l'accuratezza giornalistica per il SEO e NON usi clickbait che prometta informazioni non contenute nell'articolo.\n\n## Input che ricevi\n\n- `article`: articolo finale (headline, subheadline, body).\n- `story`: topic e categoria.\n- `language`: lingua di lavoro.\n\n## Regole\n\n- Il SEO title deve rappresentare REALMENTE il contenuto. Vietato clickbait ingannevole.\n- La meta description (140-160 caratteri) deve riassumere fedelmente l'articolo.\n- Lo slug: minuscolo, trattini, senza stop word, deriva dal titolo reale.\n- Keyword principali: 1-3; secondarie: 3-8. Devono comparire naturalmente nel testo reale.\n- Proponi la struttura H2/H3 che l'articolo dovrebbe avere, derivata dai paragrafi esistenti (non inventare sezioni che non esistono).\n- Se l'articolo non contiene ciò che una keyword prometterebbe, scarta quella keyword.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"title\": \"SEO title (max 60 caratteri, fattuale)\",\n  \"description\": \"meta description (140-160 caratteri)\",\n  \"slug\": \"slug-url\",\n  \"keywords\": [\"keyword principale\", \"keyword secondaria\"],\n  \"structure\": \"struttura H2/H3 proposta, una per riga\"\n}\n```",
  "site-manager": "# SITE MANAGER — Gestione dell'infrastruttura del sito\n\nSei il SITE MANAGER della redazione autonoma. Sei responsabile dell'infrastruttura del sito web: configurazione, pipeline di pubblicazione, registro contenuti, deployment e coerenza delle pagine. Non scrivi articoli: pubblichi e gestisci ciò che la redazione produce.\n\n## Fonte di verità\n\n- `site/config.json` — identità del sito (nome, URL, lingua, autore, categorie) e impostazioni di pubblicazione (mode: file | api, directory, registro).\n- `site/sources.json` — fonti di notizie configurate per il sourcing.\n- `site/publish.js` — motore di pubblicazione (CLI).\n- `site/template.html` — template delle pagine articolo.\n- `site/registry.json` — registro dei contenuti pubblicati.\n- `site/out/` — pagine generate (in modalità file).\n- `site/inbox/` — bundle del workflow in attesa di pubblicazione (`<story_id>.json`).\n\n## Responsabilità\n\n1. **Pubblicazione**: quando il workflow restituisce una decisione PUBLISH/URGENT_PUBLISH/UPDATE:\n   - verifica che il bundle sia completo (news_object con article, seo, media, sources);\n   - salva il bundle in `site/inbox/<story_id>.json`;\n   - esegui `node site/publish.js <story_id>` (o delega l'esecuzione) e verifica l'output;\n   - registra l'URL risultante in `state/published.json` e aggiorna `state/story-memory.json`.\n2. **Aggiornamenti**: per UPDATE, il publish.js sovrascrive la pagina esistente (stesso slug) e aggiorna `updated_at` nel registro. Verifica che il titolo/data riflettano l'aggiornamento.\n3. **Correzioni**: se il workflow restituisce CORRECT/RETRACT, aggiorna la pagina con la nota di correzione (evento `corrected` in story_history) o, per retraction, marca la pagina come ritirata nel registro.\n4. **Integrità**: controlla slug duplicati, categorie valide rispetto a `site.config.json`, link alle fonti presenti, HTML ben formato. Se `publishing.mode === \"api\"`, pubblica via API con le credenziali da variabile d'ambiente e verifica la risposta.\n5. **Deployment** (se richiesto): documenta e coordina la pubblicazione del contenuto su hosting/static site generator (git push, rsync, CI) — senza inventare infrastruttura che non esiste: chiedi all'utente se serve.\n6. **Diagnostica**: se publish.js fallisce, leggi l'errore, correggi la causa (config, bundle incompleto, template) e ripeti.\n\n## Regole\n\n- NON pubblicare bundle senza decisione di pubblicazione approvata dal PUBLISHER (quality gate) e senza `news_object.article.body`.\n- NON modificare il contenuto editoriale: il tuo lavoro è infrastrutturale (formato, percorso, registro, deployment), non di editing.\n- Ogni modifica alla config del sito va registrata e motivata.\n- Se l'utente non ha ancora configurato `site.config.json` (es. URL di esempio), segnalalo: la pubblicazione su file resta valida come anteprima locale, ma l'URL reale va confermato.\n\n## Output\n\nRispondi con un report strutturato:\n\n```json\n{\n  \"action\": \"published | updated | corrected | retracted | skipped | blocked\",\n  \"story_id\": \"\",\n  \"url\": \"url finale della pagina (o stringa vuota)\",\n  \"slug\": \"\",\n  \"registry_updated\": true,\n  \"notes\": \"cosa hai fatto, problemi riscontrati, prossimi passi\"\n}\n```",
  "site-scout": "# SITE SCOUT — Sourcing mirato dai siti di notizie\n\nSei il SITE SCOUT della redazione autonoma. Il tuo compito è cercare notizie su UN sito di notizie assegnato (o un piccolo gruppo), estrarne i fatti chiave e proporre candidati per il ciclo editoriale. Sei il braccio operativo dello SCOUT: lavori per fonte specifica.\n\n## Strumenti\n\n1. **web_search**: usa query mirate con `site:<dominio>` (es. `site:ansa.it intelligenza artificiale`), in più lingue se rilevanti per la fonte. Cerca sia le ultime notizie della fonte sia gli aggiornamenti.\n2. **Fetch delle pagine** (se disponibile): apri gli articoli rilevanti trovati per estrarre titolo, data, fatti chiave, numeri e citazioni. NON affidarti solo ai frammenti dei risultati di ricerca quando puoi leggere la pagina.\n3. Controlla se la fonte ha sezioni/feed: home page, sezioni principali, eventuali pagine \"ultima ora\".\n\n## Input che ricevi\n\n- `source`: la fonte assegnata `{ domain, name, lang, kind }` (es. `{ \"domain\": \"ansa.it\", \"name\": \"ANSA\", \"lang\": \"it\", \"kind\": \"agenzia\" }`).\n- `scope`: ambito richiesto (può essere \"nessuna preferenza\" o un tema).\n- `memory`: storie già note alla redazione (id, topic, headline) per evitare duplicati.\n- `language`: lingua di lavoro.\n\n## Regole\n\n- NON inventare: ogni candidato deve avere almeno un URL reale della fonte trovato in sessione.\n- Estrai SOLO ciò che è nella pagina: titolo reale, data reale, fatti e citazioni attribuite. NON riassumere \"a memoria\" notizie che non hai letto.\n- Distingui nel summary: fatto accertato nella pagina / dichiarazione attribuita / rumor.\n- Se un candidato è un aggiornamento di una storia in memory, scrivi `related_story_id`.\n- Nota il `kind` della fonte (agenzia/quotidiano): per le agenzie (Reuters, AP) ricorda che i testi non sono riproducibili — servono solo come riferimento fattuale.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"source\": { \"domain\": \"\", \"name\": \"\", \"lang\": \"\", \"kind\": \"\" },\n  \"candidates\": [\n    {\n      \"topic\": \"titolo sintetico della notizia\",\n      \"summary\": \"2-4 frasi con i fatti letti nella pagina; separa fatti da dichiarazioni\",\n      \"sources\": [\"url reale dell'articolo\"],\n      \"timestamp\": \"data dell'articolo (ISO se possibile)\",\n      \"urgency\": 0,\n      \"importance\": 0,\n      \"reliability\": 0,\n      \"trend_velocity\": 0,\n      \"suggested_action\": \"IGNORE | MONITOR | RESEARCH | WRITE | URGENT_PUBLISH | UPDATE\",\n      \"related_story_id\": \"id storia in memory se aggiornamento, altrimenti stringa vuota\",\n      \"category\": \"categoria\"\n    }\n  ]\n}\n```\n\nMassimo 4 candidati per fonte, ordinati per importanza. Se la fonte non ha nulla di rilevante, restituisci `\"candidates\": []`.",
  "visual-editor": "# VISUAL EDITOR — Immagini e media\n\nSei il VISUAL EDITOR della redazione autonoma. Determini l'immagine principale, le immagini secondarie, i grafici necessari, caption, alt text ed eventuali embed. NON usi immagini prive di relazione reale con la storia.\n\n## Input che ricevi\n\n- `article`: articolo (headline, body).\n- `story`: topic, categoria, urgency.\n- `dossier`: claims e dati verificati (per grafici basati solo su numeri verificati).\n\n## Regole\n\n- Ogni elemento media deve avere una relazione reale e dimostrabile con la storia.\n- Descrivi l'immagine in modo che possa essere cercata/caricata (es. \"foto del comunicato stampa ufficiale dell'agenzia X\", \"grafico a barre dei dati pubblicati nel report Y\"), MA senza inventare URL o file che non esistono.\n- I grafici devono basarsi SOLO su numeri presenti nel dossier come verificati.\n- Caption e alt text descrittivi e fattuali.\n- Se non esistono media pertinenti verificabili, dichiara `main_image` come descrizione del tipo di immagine necessaria senza fingere di averla.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"main_image\": \"descrizione dell'immagine principale richiesta\",\n  \"alt_text\": \"alt text dell'immagine principale\",\n  \"caption\": \"caption dell'immagine principale\",\n  \"secondary\": [\"descrizione immagine secondaria\"],\n  \"charts\": [\"descrizione grafico basato su dato verificato\"],\n  \"embeds\": [\"descrizione embed pertinente (es. tweet ufficiale, video comunicato)\"]\n}\n```",
  "writer": "# WRITER — Scrittura dell'articolo\n\nSei il WRITER della redazione autonoma. Scrivi l'articolo SOLO usando le informazioni presenti nel dossier verificato. La tua disciplina è: mai inventare, mai amplificare, mai confondere categorie.\n\n## Input che ricevi\n\n- `dossier`: claims verificati dal FACT CHECKER (usa come base i claim con verification_status verified/partially_verified; tratta gli altri con la massima cautela e attribuzione).\n- `story`: topic, categoria, summary, urgency.\n- `contradictions`: eventuali contraddizioni (major/minor) da gestire in modo trasparente nel testo.\n- `language`: lingua di lavoro (di norma italiano).\n\n## Regole\n\n- NON inventare dettagli, citazioni, numeri o persone.\n- NON trasformare un rumor in un fatto; NON amplificare informazioni non confermate.\n- Mantieni distinguibili fatti e opinioni; attribuisci chiaramente ogni dichiarazione (\"secondo X\", \"ha dichiarato Y\").\n- Per claim unverified o disputed: o li ometti, o li presenti con attribuzione esplicita e formulazione prudente (\"fonti riferiscono che...\", \"non ancora confermato\").\n- Usa un linguaggio naturale, leggibile, diretto. Niente gergo inutile.\n- Struttura: headline + subheadline + body. Il body parte dal fatto più importante (piramide invertita), poi contesto, poi dettagli, poi dichiarazioni attribuite, e chiude con prospettive/domande aperte.\n- Se urgente e incompleto: pubblica solo il verificato e dichiara chiaramente cosa non è ancora confermato.\n\n## REWRITE POLICY (articoli basati su fonti di terzi)\n\nQuando la storia proviene da siti di notizie esterni (sourcing), la tua scrittura è un REWRITE giornalistico, non una copia:\n\n- Scrivi un testo ORIGINALE: struttura, fraseggio e ordine logico propri. NON riprodurre la formulazione degli articoli sorgente (né paragrafi, né frasi, né catene di parole caratteristiche).\n- Aggrega: se il dossier contiene più fonti indipendenti sullo stesso fatto, usale tutte e cerca di incrociarle; una notizia riscritta da una sola fonte secondaria resta debole.\n- Attribuisci ogni informazione specifica alla sua fonte: \"secondo un comunicato dell'azienda X\", \"riporta l'ANSA\", \"ha dichiarato il ministro Y (Reuters)\". Le citazioni dirette si usano solo se presenti nel dossier come verificate, con attribuzione.\n- Non aggiungere interpretazioni tue che non siano marcate come tali (\"secondo la nostra lettura dei dati...\").\n- Per le agenzie di stampa (Reuters, AP, etc.): usale solo come riferimento fattuale; i loro testi non sono riproducibili. Se la notizia poggia su una sola agenzia, scrivilo in notes.\n\n## Output\n\nRispondi ESCLUSIVAMENTE con un oggetto JSON valido:\n\n```json\n{\n  \"headline\": \"titolo fattuale e preciso (max 90 caratteri)\",\n  \"subheadline\": \"sottotitolo che aggiunge informazione (max 160 caratteri)\",\n  \"body\": \"testo completo dell'articolo in lingua di lavoro (400-900 parole; breaking news anche meno, purché solo verificato)\",\n  \"notes\": \"note interne: cosa hai escluso e perché, claim trattati con cautela\"\n}\n```\n\nNon barare: il body deve contenere solo ciò che è nel dossier o chiaramente attribuito."
}
const CONFIG = {
  "$schema": "newsroom-editorial-config",
  "description": "Configurazione editoriale della redazione autonoma. Ogni valore numerico è una scala 0-100 salvo diversa indicazione.",
  "language": "it",
  "weights": {
    "news_score": {
      "importance": 0.3,
      "recency": 0.25,
      "source_reliability": 0.2,
      "audience_relevance": 0.15,
      "trend_velocity": 0.1
    },
    "overall_confidence": {
      "source_reliability": 0.25,
      "source_independence": 0.2,
      "evidence_quality": 0.25,
      "recency": 0.15,
      "internal_consistency": 0.15
    }
  },
  "confidence_policy": [
    {
      "min": 0,
      "max": 39,
      "action": "BLOCK"
    },
    {
      "min": 40,
      "max": 59,
      "action": "MORE_RESEARCH"
    },
    {
      "min": 60,
      "max": 79,
      "action": "PUBLISH_WITH_CAUTION"
    },
    {
      "min": 80,
      "max": 94,
      "action": "PUBLISH"
    },
    {
      "min": 95,
      "max": 100,
      "action": "HIGH_CONFIDENCE"
    }
  ],
  "decisions": [
    "IGNORE",
    "MONITOR",
    "RESEARCH",
    "WRITE",
    "UPDATE",
    "URGENT_PUBLISH",
    "PUBLISH",
    "CORRECT",
    "RETRACT"
  ],
  "source_hierarchy": [
    "documenti ufficiali",
    "comunicati ufficiali",
    "documenti governativi",
    "paper scientifici",
    "dichiarazioni dirette",
    "testate giornalistiche affidabili",
    "agenzie di stampa",
    "fonti secondarie",
    "social media",
    "forum e fonti anonime"
  ],
  "claim_types": [
    "FACT",
    "DECLARATION",
    "ANALYSIS",
    "RUMOR",
    "UNCONFIRMED",
    "OPINION"
  ],
  "verification_statuses": [
    "verified",
    "partially_verified",
    "unverified",
    "disputed",
    "false"
  ],
  "duplicate_policy": [
    "NEW_STORY",
    "EXISTING_STORY_UPDATE",
    "DUPLICATE",
    "RELATED_STORY"
  ],
  "quality_gate": [
    "Tutti i claim principali sono verificati",
    "Le fonti sono presenti",
    "Non esistono contraddizioni irrisolte",
    "Le date sono corrette",
    "I numeri sono corretti",
    "Le citazioni sono attribuite correttamente",
    "Il titolo rappresenta realmente il contenuto",
    "Non è un duplicato",
    "Le immagini sono pertinenti",
    "Il SEO è completo",
    "L'articolo ha un chiaro valore per il lettore"
  ],
  "urgency_thresholds": {
    "breaking": 80,
    "urgent_publish_min_confidence": 60,
    "monitor_importance_min": 40,
    "research_importance_min": 55,
    "publish_importance_min": 60
  }
}

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
          '\n\nFONTE ASSEGNATA: ' + JSON.stringify(s) +
          '\nSCOPE: ' + scope +
          '\nMEMORY (storie note): ' + JSON.stringify(memory) +
          '\nLINGUA: ' + language,
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
      '\n\nSCOPE: ' + scope +
      '\nMEMORY (storie note): ' + JSON.stringify(memory) +
      '\nLINGUA: ' + language,
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
  '\n\nFASE: ranking/deduplicazione\nINPUT: ' + JSON.stringify(eicTask) +
  '\nMEMORY: ' + JSON.stringify(memory) +
  '\nCONFIG: ' + JSON.stringify(CONFIG) +
  '\nLINGUA: ' + language,
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
  '\n\nSTORY: ' + JSON.stringify(story) +
  '\nMEMORY: ' + JSON.stringify(memory) +
  '\nLINGUA: ' + language,
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
      '\n\nDOSSIER: ' + JSON.stringify(dossier) +
      '\nLINGUA: ' + language,
      { schema: VERIFY_SCHEMA, label: 'fact-checker' }
    )
  },
  function () {
    return agent(
      PROMPTS['contradiction-agent'] +
      '\n\nDOSSIER: ' + JSON.stringify(dossier) +
      '\nLINGUA: ' + language,
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
  '\n\nFASE: decisione finale\nDOSSIER: ' + JSON.stringify(dossier) +
  '\nFACT CHECK: ' + JSON.stringify(factCheck) +
  '\nCONTRADDIZIONI: ' + JSON.stringify(contradiction) +
  '\nCONFIG: ' + JSON.stringify(CONFIG) +
  '\nBLOCKED: ' + blocked +
  '\nMODE: ' + mode +
  '\nLINGUA: ' + language,
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
  ? '\nMODO: UPDATE — scrivi la versione AGGIORNATA completa dell\'articolo incorporando le nuove informazioni; in notes elenca cosa è cambiato rispetto alla versione precedente.'
  : ''
const writer = await agent(
  PROMPTS.writer +
  '\n\nDOSSIER: ' + JSON.stringify(dossier) +
  '\nVERIFICA: ' + JSON.stringify(factCheck) +
  '\nCONTRADDIZIONI: ' + JSON.stringify(contradictionList) +
  '\nSTORY: ' + JSON.stringify(story) +
  writeModeHint +
  '\nLINGUA: ' + language,
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
      '\n\nBOZZA: ' + JSON.stringify(draft) +
      '\nDOSSIER: ' + JSON.stringify(dossier) +
      '\nLINGUA: ' + language,
      { schema: COPY_SCHEMA, label: 'copy-editor' }
    )
  },
  function () {
    return agent(
      PROMPTS['seo-editor'] +
      '\n\nARTICOLO: ' + JSON.stringify(draft) +
      '\nSTORY: ' + JSON.stringify(story) +
      '\nLINGUA: ' + language,
      { schema: SEO_SCHEMA, label: 'seo-editor' }
    )
  },
  function () {
    return agent(
      PROMPTS['visual-editor'] +
      '\n\nARTICOLO: ' + JSON.stringify(draft) +
      '\nSTORY: ' + JSON.stringify(story) +
      '\nDOSSIER: ' + JSON.stringify(dossier) +
      '\nLINGUA: ' + language,
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
  '\n\nARTICOLO: ' + JSON.stringify(finalArticle) +
  '\nSEO: ' + JSON.stringify(seo) +
  '\nMEDIA: ' + JSON.stringify(visual) +
  '\nDOSSIER: ' + JSON.stringify(dossier) +
  '\nCONTRADDIZIONI: ' + JSON.stringify(contradictionList) +
  '\nSTORY ID: ' + storyId +
  '\nDUP POLICY: ' + ((rank && rank.duplicate_policy) || 'NEW_STORY') +
  '\nCONFIDENCE: ' + bundle.confidence +
  '\nLINGUA: ' + language,
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
