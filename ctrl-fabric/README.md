# Ctrl+Fabric

Un'azienda di moda simulata, guidata da AI, che opera come un'organizzazione
software. Ogni capo d'abbigliamento viene progettato, sviluppato, testato e
rilasciato seguendo cicli di vita, versioni, release notes, metriche di qualità
e feedback — esattamente come si farebbe con un prodotto software.

Il sistema è composto da **27 agenti AI** distribuiti in 5 reparti, un
orchestratore centrale, un database di capi con versionamento, e una web
dashboard in Flask per la visualizzazione.

---

## Indice

- [Visione](#visione)
- [Architettura del sistema](#architettura-del-sistema)
- [I 27 agenti](#i-27-agenti)
  - [Reparto Core Development](#reparto-core-development)
  - [Reparto Quality & Sustainability](#reparto-quality--sustainability)
  - [Reparto Market Intelligence](#reparto-market-intelligence)
  - [Reparto Operations](#reparto-operations)
  - [Reparto Business](#reparto-business)
- [Il modello Garment](#il-modello-garment)
- [Installazione](#installazione)
- [Configurazione](#configurazione)
- [Uso](#uso)
  - [Avviare il ciclo giornaliero](#avviare-il-ciclo-giornaliero)
  - [Eseguire agenti singoli](#eseguire-agenti-singoli)
  - [Demo ed esempi](#demo-ed-esempi)
  - [Test](#test)
  - [Dashboard web](#dashboard-web)
  - [API REST](#api-rest)
- [Integrazione con opencode CLI](#integrazione-con-opencode-cli)
  - [Cos'è opencode](#cosè-opencode)
  - [Configurazione](#configurazione-1)
  - [OpencodeClient — reference completa](#opencodeclient--reference-completa)
  - [Esempi pratici](#esempi-pratici)
  - [Usare opencode negli agenti](#usare-opencode-negli-agenti)
  - [Modelli disponibili](#modelli-disponibili)
  - [Risoluzione dei problemi](#risoluzione-dei-problemi)
- [Deployment](#deployment)
- [Struttura completa del progetto](#struttura-completa-del-progetto)
- [Licenza](#licenza)

---

## Visione

> Invece di vendere "vestiti per ingegneri", vendiamo **abbigliamento sviluppato
> come software**.

Ogni capo ha un ciclo di vita fatto di versioni, release notes, metriche
oggettive, test di qualità, certificazioni di sostenibilità, e persino feedback
della comunità. L'intera azienda è simulata come un **sistema multi-agente** in
cui ogni AI è un microservizio con un ruolo preciso: c'è chi progetta, chi
produce, chi testa, chi si occupa di marketing, chi segue i clienti.

Il risultato è un ecosistema coerente in cui un capo come `TEE-4.2` viene
tracciato con la stessa serietà con cui si traccerebbe un issue su GitHub.

---

## Architettura del sistema

```
ctrl-fabric/
├── ctrl_fabric/                    # Pacchetto Python principale
│   ├── __init__.py                 # Esporta classi pubbliche
│   ├── __main__.py                 # python -m ctrl_fabric
│   ├── main.py                     # CtrlFabricSystem (orchestratore)
│   ├── opencode_client.py          # Client per opencode CLI (NOVITÀ)
│   ├── agents/                     # 27 agenti AI
│   │   ├── base.py                 # BaseAgent (classe astratta)
│   │   ├── ceo_assistant.py
│   │   ├── creative_director.py
│   │   ├── fashion_architect.py
│   │   ├── textile_engineer.py
│   │   ├── cad_agent.py
│   │   ├── pattern_generator.py
│   │   ├── documentation_agent.py
│   │   ├── quality_assurance.py
│   │   ├── sustainability_agent.py
│   │   ├── fit_predictor.py
│   │   ├── color_ai.py
│   │   ├── competitor_spy.py
│   │   ├── inventory_optimizer.py
│   │   ├── return_predictor.py
│   │   ├── material_innovator.py
│   │   ├── supply_risk.py
│   │   ├── clv_predictor.py
│   │   ├── production_agent.py
│   │   ├── supply_chain_agent.py
│   │   ├── finance_agent.py
│   │   ├── legal_agent.py
│   │   ├── marketing_strategist.py
│   │   ├── brand_story_agent.py
│   │   ├── social_media_team.py
│   │   ├── advertising_agent.py
│   │   ├── customer_agent.py
│   │   └── data_scientist.py
│   ├── products/
│   │   └── garment.py              # Garment, Version, capi d'esempio
│   └── community/
│       └── engineering_council.py  # Consiglio di ingegneria
├── web/                            # Dashboard Flask
│   ├── app.py                      # Applicazione web
│   ├── requirements.txt            # Dipendenze web
│   ├── Dockerfile                  # Build container
│   ├── static/
│   │   └── style.css               # CSS ispirato a GitHub Dark
│   └── templates/                  # 10 template Jinja2
│       ├── base.html
│       ├── index.html
│       ├── garment.html
│       ├── simulation.html
│       ├── docs.html
│       ├── quality.html
│       ├── analytics.html
│       ├── issues.html
│       ├── new_issue.html
│       └── pull_requests.html
├── examples/                       # Script dimostrativi
│   ├── pattern_demo.py
│   ├── docs_demo.py
│   ├── analytics_demo.py
│   ├── qa_sustainability_demo.py
│   └── all_agents_demo.py
├── tests/
│   └── test_agents.py              # Test per 18 agenti core
├── .env.example                    # Configurazione opencode (NOVITÀ)
├── pyproject.toml                  # Dipendenze e metadati
├── render.yaml                     # Deployment Render
└── .github/workflows/
    └── deploy.yml                  # CI/CD
```

---

## I 27 agenti

Ogni agente estende `BaseAgent` (definito in `ctrl_fabric/agents/base.py`) e
implementa il metodo `run()` che esegue il suo compito principale. La classe
base fornisce:

- `name` — nome leggibile dell'agente
- `role` — descrizione del ruolo
- `status` — stato corrente (`idle`, `analyzing_trends`, ecc.)
- `run()` — metodo astratto da implementare
- `report()` — resoconto con timestamp corrente
- `log(message)` — stampa log con prefisso `[NomeAgente]`

### Reparto Core Development

Responsabile della progettazione e dello sviluppo tecnico dei capi.

| Agente | Ruolo | Cosa fa |
|--------|-------|---------|
| **Fashion Architect** | Progettazione collezioni | Pianifica stagioni, definisce architetture stile |
| **Textile Engineer** | Specifiche tessuti | Calcola efficienza termica, elasticità, abrasione |
| **CAD Agent** | Tech pack e CAD | Prepara pacchetti tecnici, integra pattern 3D |
| **Pattern Generator** | Pattern automatici | Crea cartamodelli, grading taglie, simulazione avatar |
| **Documentation Agent** | Documentazione tecnica | Genera specifiche PDF, guide utente, manuali manutenzione |

### Reparto Quality & Sustainability

Garanzia di qualità e impatto ambientale.

| Agente | Ruolo | Cosa fa |
|--------|-------|---------|
| **Quality Assurance** | Test e certificazione | Esegue test di abrasione, elasticità, lavaggio |
| **Sustainability Agent** | Impatto ambientale | Calcola impronta carbonio, consumo acqua, alternative eco |
| **Fit Predictor** | Predizione taglie | Analisi misure corporee, rischio reso |
| **Return Predictor** | Prevenzione resi | Identifica fattori di rischio, calcola risparmio |

### Reparto Market Intelligence

Analisi di mercato, competitor e dati.

| Agente | Ruolo | Cosa fa |
|--------|-------|---------|
| **Color AI** | Colori tendenza | Palette stagionali, psicologia del colore |
| **Competitor Spy** | Monitoraggio prezzi | Intelligence competitor, posizionamento mercato |
| **Data Scientist** | Analisi dati | Previsione trend, segmentazione clienti, pricing |
| **CLV Predictor** | Valore cliente | Lifetime value, tasso retention |

### Reparto Operations

Gestione della produzione, fornitura e logistica.

| Agente | Ruolo | Cosa fa |
|--------|-------|---------|
| **Inventory Optimizer** | Gestione stock | Previsione domanda, punti di riordino |
| **Supply Risk** | Valutazione rischi | Rischi geopolitici, meteo, fornitura |
| **Material Innovator** | Ricerca materiali | Mycelio, fibre algali, innovazioni tessili |
| **Production Agent** | Produzione | Coordinamento manifatturiero |
| **Supply Chain Agent** | Logistica | Gestione inventory, spedizioni |

### Reparto Business

Amministrazione, finanza, marketing e customer care.

| Agente | Ruolo | Cosa fa |
|--------|-------|---------|
| **CEO Assistant** | Report giornalieri | KPI, decisioni strategiche |
| **Finance Agent** | Gestione finanziaria | Cash flow, previsioni |
| **Legal Agent** | Compliance | Certificazioni, proprietà intellettuale |
| **Marketing Strategist** | Campagne marketing | Strategia, posizionamento |
| **Brand Story Agent** | Contenuti brand | Manifesto, storytelling |
| **Social Media Team** | Social media | Gestione multi-piattaforma |
| **Advertising Agent** | Pubblicità | Ottimizzazione piattaforme adv |
| **Customer Agent** | Supporto clienti | Servizio, feedback |

---

## Il modello Garment

Definito in `ctrl_fabric/products/garment.py`:

```python
@dataclass
class Version:
    version: str                    # "1.0", "2.0"
    release_date: datetime          # Data di rilascio
    changes: List[str]              # ["Initial release", "Improved collar"]
    specs: Dict[str, Any]           # {"weight_gsm": 210, ...}

@dataclass
class Garment:
    sku: str                        # "TEE-4.2"
    name: str                       # "Essential T-Shirt"
    category: str                   # "tops", "outerwear"
    versions: List[Version]         # Storico versioni
    current_version: Optional[str]  # Versione attiva
```

### Capi d'esempio inclusi

**TEE-4.2** — Essential T-Shirt
```
Weight: 210 gsm
Thermal Efficiency: 7.8/10
Stretch: 12%
Abrasion: 9800 cycles
Wrinkle Recovery: 92%
Expected Lifetime: 430 washes
Fabric: Combed cotton
Fit: Regular
```

**HOODIE-2.0** — Technical Hoodie
```
Weight: 420 gsm
Thermal Efficiency: 8.5/10
Stretch: 8%
Abrasion: 12000 cycles
Wrinkle Recovery: 88%
Expected Lifetime: 380 washes
Fabric: French Terry
Fit: Relaxed
Features: Hidden zipper pocket, Reflective details
```

---

## Installazione

### Prerequisiti

- Python 3.10 o superiore
- pip

### Procedura

```bash
# Clona il repository (se non lo hai già fatto)
git clone <url-del-repository>
cd ctrl-fabric

# Installa il pacchetto in modalità sviluppo
pip install -e .

# (Opzionale) Installa anche le dipendenze di sviluppo
pip install -e ".[dev]"

# (Opzionale) Se vuoi usare la web dashboard
cd web && pip install -r requirements.txt && cd ..
```

### Dipendenze

Il progetto richiede:
- `numpy>=1.26.0` — calcoli numerici
- `pandas>=2.2.0` — analisi dati
- `requests>=2.31.0` — chiamate HTTP
- `openai>=1.0.0` — riservato per future integrazioni LLM
- `python-dotenv>=1.0.0` — lettura file `.env` (usato da `OpencodeClient`)

Dipendenze opzionali di sviluppo:
- `pytest>=8.0` — test
- `black>=24.0` — formattazione codice

---

## Configurazione

### Variabili d'ambiente

Copiare il file `.env.example` come `.env` nella root del progetto:

```bash
cp .env.example .env
```

Il file `.env` è già escluso da git (presente nel `.gitignore` globale).

Le variabili disponibili sono:

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `OPENCODE_BIN` | `opencode` | Percorso del binario opencode |
| `OPENCODE_MODEL` | `opencode/hy3-free` | Modello da usare per le generazioni |
| `OPENCODE_AGENT` | `general` | Agente opencode da utilizzare |
| `OPENCODE_TIMEOUT` | `120` | Timeout in secondi per ogni chiamata |

---

## Uso

### Avviare il ciclo giornaliero

Simula una giornata lavorativa completa dell'azienda: il CEO genera un report
con KPI, poi ogni agente esegue il suo compito in sequenza.

```bash
python -m ctrl_fabric
```

Output tipico:
```
=== Ctrl+Fabric Daily Report ===

Cash Flow: $284700
Orders: 847
Problems: ['delay_materiali', 'resa_alta_modello_X']
Decisions Needed: ['approvare_nuova_linea_FW26', 'aumento_prezzo_TEE']

[Creative Director] Brand philosophy & trend analysis
  philosophy: Minimalismo ispirato all'ingegneria aerospaziale
  trends: Quiet Engineering +18%, Technical minimalism rising, ...

[Fashion Architect] Collection generation
  ...
```

### Eseguire agenti singoli

Puoi importare e usare qualsiasi agente singolarmente:

```python
from ctrl_fabric.agents import CreativeDirector, ColorAI

direttore = CreativeDirector()
risultato = direttore.run()
print(risultato["trends"])
# ['Quiet Engineering +18% interest', ...]

color = ColorAI()
palette = color.run("FW26")
print(palette["palette"])
# ['#2D4A6F', '#8BA1B4', ...]
```

### Demo ed esempi

Nella cartella `examples/` trovi script dimostrativi pronti all'uso:

```bash
# Generazione pattern e simulazione 3D
python examples/pattern_demo.py

# Documentazione tecnica automatica
python examples/docs_demo.py

# Analisi dati e trend
python examples/analytics_demo.py

# Qualità e sostenibilità
python examples/qa_sustainability_demo.py

# Demo completa di tutti gli agenti
python examples/all_agents_demo.py
```

### Test

```bash
python tests/test_agents.py
```

Esegue test su 18 agenti core e verifica che tutti rispondano senza errori.

### Dashboard web

L'interfaccia web è una Flask app che espone:

- Catalogo prodotti con storico versioni
- Simulazione 3D con canvas e metrica vestibilità
- Documentazione tecnica (specifiche, guide, manutenzione)
- Dashboard qualità e sostenibilità
- Analytics (trend, segmentazione, pricing)
- Issue tracker (stile GitHub)
- Pull request management

```bash
cd web
python app.py
# Apri http://localhost:5000
```

### API REST

La dashboard espone anche endpoint JSON:

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/garments` | GET | Elenca tutti i capi |
| `/api/garments/<sku>/specs` | GET | Specifiche tecniche |
| `/api/garments/<sku>/pattern` | GET | Pattern e simulazione |
| `/api/garments/<sku>/docs` | GET | Documentazione |
| `/api/garments/<sku>/quality` | GET | Test qualità |
| `/api/garments/<sku>/sustainability` | GET | Metriche sostenibilità |
| `/api/analytics` | GET | Analytics di mercato |

---

## Integrazione con opencode CLI

La novità più importante di questa versione è l'integrazione con **opencode
CLI**, lo strumento a riga di comando che ti permette di eseguire modelli AI
direttamente dal terminale.

### Cos'è opencode

[opencode](https://opencode.ai) è un'interfaccia CLI che funge da ponte tra il
tuo terminale e decine di modelli AI (proprietari e open-source). Permette di:

- Eseguire modelli da diversi provider (Anthropic, OpenAI, Google, Meta, ecc.)
- Usare "agenti" preconfigurati per task specifici (`general`, `explore`, ecc.)
- Ottenere output formattato (testo semplice o JSON)
- Funzionare in modalità server headless

Nel contesto di Ctrl+Fabric, opencode sostituisce i dati mock generati
casualmente con contenuti reali generati da modelli AI, rendendo ogni
esecuzione unica e contestualmente pertinente.

### Configurazione

#### 1. Verifica che opencode sia installato

```bash
which opencode
# Dovrebbe mostrare un percorso, es. /Users/tuo/.opencode/bin/opencode

opencode --version
# Mostra la versione installata
```

Se non è installato, segui le istruzioni su https://opencode.ai

#### 2. Copia il file di configurazione

```bash
cp .env.example .env
```

#### 3. Modifica il file `.env` secondo le tue esigenze

```env
# Percorso del binario opencode (default: "opencode" — lo cerca nel PATH)
OPENCODE_BIN=opencode

# Modello da utilizzare (lista completa con `opencode models`)
OPENCODE_MODEL=opencode/hy3-free

# Agente opencode da usare per le generazioni
OPENCODE_AGENT=general

# Timeout massimo per ogni chiamata (in secondi)
OPENCODE_TIMEOUT=120
```

#### 4. Verifica che il client funzioni

```python
from ctrl_fabric.opencode_client import OpencodeClient

client = OpencodeClient()
print("Disponibile:", client.is_available())  # True
print("Modello:", client.model)               # opencode/hy3-free

# Prova una generazione
risposta = client.run("Raccontami una breve storia sulla moda del futuro")
print(risposta)
```

### OpencodeClient — reference completa

La classe `OpencodeClient` si trova in `ctrl_fabric/opencode_client.py`.

#### Costruttore

```python
OpencodeClient(env_file: Optional[str] = None)
```

- `env_file` — percorso opzionale a un file `.env` specifico. Se non fornito,
  carica automaticamente il file `.env` presente nella directory corrente.

#### Metodi

##### `is_available() -> bool`

Verifica che il binario opencode sia installato e accessibile. Il risultato
viene cachato dopo la prima chiamata.

```python
if client.is_available():
    print("opencode è pronto all'uso")
else:
    print("opencode non trovato — verifica OPENCODE_BIN nel .env")
```

##### `run(prompt: str, *, model: Optional[str] = None, agent: Optional[str] = None) -> str`

Esegue opencode con un prompt testuale e restituisce la risposta come stringa.

Parametri:
- `prompt` — il testo da inviare al modello
- `model` — (opzionale) sovrascrive il modello di default per questa chiamata
- `agent` — (opzionale) sovrascrive l'agente di default per questa chiamata

Valore di ritorno: il testo generato dal modello.

Se opencode non è disponibile, solleva `RuntimeError`. Se il comando fallisce,
restituisce una stringa `[Opencode error: ...]`.

```python
# Chiamata base
resp = client.run("Descrivi 3 trend moda per l'autunno 2026")

# Con modello specifico
resp = client.run(
    "Genera una palette colori per una collezione primaverile",
    model="opencode/claude-sonnet-4"
)

# Con agente specifico
resp = client.run(
    "Analizza questo dataset di vendite",
    agent="explore"
)
```

##### `run_structured(prompt: str, *, model: Optional[str] = None, agent: Optional[str] = None) -> dict`

Come `run()`, ma tenta di parsare la risposta come JSON. Se il parsing fallisce,
restituisce `{"text": risposta}`.

Utile quando vuoi dati strutturati dal modello.

```python
# Prompt che chiede JSON
dati = client.run_structured("""
Rispondi SOLO con un JSON valido con questa struttura:
{
  "trends": ["trend1", "trend2", "trend3"],
  "colori_dominanti": ["#HEX1", "#HEX2"]
}
Descrivi 3 trend moda per la prossima stagione.
""")

print(dati["trends"])
# ['Tecnico-minimalismo', 'Aerocouture', 'Digital Textiles']
```

### Esempi pratici

#### Esempio 1: Generare un report trend moda

```python
from ctrl_fabric.opencode_client import OpencodeClient

client = OpencodeClient()

report = client.run("""
Sei un trend forecaster di moda. Descrivi 5 trend chiave per la prossima
stagione, includendo per ciascuno:
- Nome del trend
- Descrizione in una frase
- Materiali associati
- Palette colori suggerita
""")

print("=== REPORT TREND MODA ===")
print(report)
```

#### Esempio 2: Ottenere dati strutturati per un agente

```python
from ctrl_fabric.opencode_client import OpencodeClient

client = OpencodeClient()

# Prompt pensato per l'agente ColorAI
risultato = client.run_structured("""
Sei ColorAI, un esperto di psicologia del colore nella moda.
Data la stagione "FW26" e il tema "minimalismo tecnico",
genera una palette di 5 colori con nome, codice HEX e significato psicologico.

Rispondi SOLO con un JSON come questo:
{
  "season": "FW26",
  "palette": [
    {"name": "Nome Colore", "hex": "#HEX", "meaning": "significato"},
    ...
  ]
}
""")

for colore in risultato["palette"]:
    print(f"{colore['name']} ({colore['hex']}): {colore['meaning']}")
```

#### Esempio 3: Chiamata con modello diverso

```python
from ctrl_fabric.opencode_client import OpencodeClient

client = OpencodeClient()

# Usa un modello più potente per un compito complesso
analisi = client.run(
    "Analizza il seguente brief di prodotto e suggerisci miglioramenti: ...",
    model="opencode/claude-sonnet-4"      # sovrascrive il default
)
```

#### Esempio 4: Integrazione con un agente esistente

Puoi usare `OpencodeClient` dentro qualsiasi agente per sostituire i dati mock:

```python
from ctrl_fabric.agents.base import BaseAgent
from ctrl_fabric.opencode_client import OpencodeClient

class CreativeDirectorConAI(BaseAgent):
    """Creative Director che usa opencode invece dei dati mock."""

    def __init__(self):
        super().__init__(
            "Creative Director AI",
            "Brand philosophy & trend analysis (AI-powered)"
        )
        self.opencode = OpencodeClient()

    def run(self):
        self.status = "analyzing_trends_con_AI"

        if not self.opencode.is_available():
            self.log("opencode non disponibile, uso fallback mock")
            return self._fallback()

        # Genera trend con AI
        trends_text = self.opencode.run("""
            Sei un Creative Director nel mondo della moda.
            Identifica 3 trend moda emergenti per il 2026,
            con focus su minimalismo e tecnologia.
        """)

        # Genera una filosofia brand usando AI
        filosofia = self.opencode.run("""
            Definisci una brand philosophy per un'azienda di moda
            che unisce ingegneria aerospaziale e alta moda.
            Massimo 10 parole.
        """)

        self.status = "idle"
        return {
            "philosophy": filosofia.strip(),
            "trends": [t.strip() for t in trends_text.split("\n") if t.strip()],
            "fonte": "opencode AI"
        }

    def _fallback(self):
        """Fallback ai dati mock se opencode non è disponibile."""
        return {
            "philosophy": "Minimalismo ispirato all'ingegneria aerospaziale",
            "trends": [
                "Quiet Engineering +18% interest",
                "Technical minimalism rising",
                "GitHub aesthetic influencing fashion"
            ],
            "fonte": "mock (fallback)"
        }
```

#### Esempio 5: Ciclo giornaliero con opencode

```python
from ctrl_fabric.opencode_client import OpencodeClient
from ctrl_fabric.agents import (
    CreativeDirector, ColorAI, CompetitorSpy
)

client = OpencodeClient()

print("=== REPORT MATTINO ===")

# Trend analizzati da AI
trends = client.run_structured("""
Genera 3 trend moda per FW26. Rispondi SOLO con JSON:
{"trends": [{"nome": "...", "descrizione": "..."}]}
""")
print("Trend del giorno:", trends)

# Colori di stagione
colori = client.run(
    "Quali sono i 5 colori chiave per la moda maschile FW26? "
    "Rispondi in modo conciso."
)
print("Colori:", colori)

# Analisi competitor
competitor = client.run(
    "Cosa stanno facendo i brand di moda tech-oriented "
    "per distinguersi nel mercato 2026?",
    model="opencode/hy3-free"
)
print("Competitor insight:", competitor)
```

### Usare opencode negli agenti

Il sistema è stato progettato in modo che tu possa decidere **quando e come**
integrare opencode. Ecco le strategie possibili:

#### A. Sostituzione completa

Ogni agente chiama opencode nel proprio `run()` e ignora completamente i dati
mock. Richiede di modificare uno a uno i 27 agenti.

#### B. Wrapper generico

Puoi creare un wrapper che prende un agente qualunque e ne esegue il compito
tramite opencode:

```python
class OpencodeAgentWrapper:
    """Avvolge un agente e delega la generazione a opencode."""

    def __init__(self, agent, client: OpencodeClient):
        self.agent = agent
        self.client = client

    def run(self, *args, **kwargs):
        prompt = self._costruisci_prompt(*args, **kwargs)
        return self.client.run_structured(prompt)

    def _costruisci_prompt(self, *args, **kwargs):
        return f"""
        Sei {self.agent.name}, il cui ruolo è: {self.agent.role}.
        Esegui il tuo compito con questi parametri: {args}, {kwargs}.
        Rispondi con un JSON strutturato che rappresenti il tuo output.
        """
```

#### C. Ibrido (consigliato)

Gli agenti provano prima a chiamare opencode; se non è disponibile, usano il
fallback mock esistente. Questo assicura che il sistema funzioni sempre, con o
senza opencode installato.

### Modelli disponibili

Per vedere la lista completa dei modelli supportati da opencode:

```bash
opencode models
```

Alcuni dei modelli disponibili (al momento della scrittura):

| Modello | Provider | Note |
|---------|----------|------|
| `opencode/hy3-free` | opencode | **Gratuito**, ideale per test e sviluppo |
| `opencode/nemotron-3-ultra-free` | NVIDIA | Gratuito, buona qualità |
| `opencode/deepseek-v4-flash-free` | DeepSeek | Gratuito, molto veloce |
| `opencode/claude-sonnet-4` | Anthropic | Bilanciato qualità/velocità |
| `opencode/claude-haiku-4-5` | Anthropic | Veloce ed economico |
| `opencode/gpt-5.4-mini` | OpenAI | Compatto, buon rapporto qualità costo |
| `opencode/gemini-3-flash` | Google | Efficiente |

**Consiglio:** per lo sviluppo e i test usa `opencode/hy3-free` (gratuito).
Per produzione o analisi più profonde, passa a `opencode/claude-sonnet-4` o
`opencode/gpt-5.4-mini`.

### Risoluzione dei problemi

| Problema | Causa probabile | Soluzione |
|----------|-----------------|-----------|
| `is_available()` restituisce `False` | opencode non nel PATH | Installa opencode o imposta `OPENCODE_BIN` nel `.env` col percorso assoluto |
| `run()` solleva `subprocess.TimeoutExpired` | Il modello impiega troppo | Aumenta `OPENCODE_TIMEOUT` nel `.env` |
| `run()` restituisce `[Opencode error: ...]` | Errore interno di opencode | Controlla che il modello sia valido con `opencode models` |
| `run_structured()` restituisce `{"text": ...}` | Il modello non ha risposto in JSON | Rafforza l'istruzione "Rispondi SOLO con JSON valido" nel prompt |
| `ModuleNotFoundError: No module named 'dotenv'` | `python-dotenv` non installato | Esegui `pip install python-dotenv` |
| La chiamata è lenta | Modello gratuito / condiviso | Prova un modello più veloce come `opencode/deepseek-v4-flash-free` |

---

## Deployment

### Render

Il progetto include `render.yaml` per il deployment su Render.com:

```yaml
services:
  - type: web
    name: ctrl-fabric
    env: python
    buildCommand: pip install -r web/requirements.txt
    startCommand: cd web && gunicorn app:app
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: ctrl-fabric-db
          property: connectionString
```

### Docker

```bash
cd web
docker build -t ctrl-fabric .
docker run -p 5000:5000 ctrl-fabric
```

### CI/CD

Su ogni push, GitHub Actions esegue i test e (se passano) deploya su Render.

---

## Struttura completa del progetto

```
ctrl-fabric/
├── .env.example                        # Template configurazione opencode
├── .github/workflows/deploy.yml        # CI/CD
├── pyproject.toml                      # Metadati e dipendenze Python
├── README.md                           # Questo file
├── render.yaml                         # Configurazione Render
├── ctrl_fabric/                        # Pacchetto principale
│   ├── __init__.py                     # API pubblica
│   ├── __main__.py                     # Entry point CLI
│   ├── main.py                         # CtrlFabricSystem orchestrator
│   ├── opencode_client.py              # Client opencode CLI
│   ├── agents/                         # 27 agenti AI
│   │   ├── __init__.py
│   │   ├── base.py                     # Classe astratta BaseAgent
│   │   ├── ceo_assistant.py
│   │   ├── creative_director.py
│   │   ├── fashion_architect.py
│   │   ├── textile_engineer.py
│   │   ├── cad_agent.py
│   │   ├── pattern_generator.py
│   │   ├── documentation_agent.py
│   │   ├── quality_assurance.py
│   │   ├── sustainability_agent.py
│   │   ├── fit_predictor.py
│   │   ├── color_ai.py
│   │   ├── competitor_spy.py
│   │   ├── inventory_optimizer.py
│   │   ├── return_predictor.py
│   │   ├── material_innovator.py
│   │   ├── supply_risk.py
│   │   ├── clv_predictor.py
│   │   ├── production_agent.py
│   │   ├── supply_chain_agent.py
│   │   ├── finance_agent.py
│   │   ├── legal_agent.py
│   │   ├── marketing_strategist.py
│   │   ├── brand_story_agent.py
│   │   ├── social_media_team.py
│   │   ├── advertising_agent.py
│   │   ├── customer_agent.py
│   │   └── data_scientist.py
│   ├── products/
│   │   └── garment.py                  # Modello Garment e Version
│   └── community/
│       └── engineering_council.py      # Feedback aggregation
├── web/                                # Dashboard Flask
│   ├── app.py                          # Applicazione Flask
│   ├── requirements.txt                # Dipendenze web
│   ├── Dockerfile                      # Build container
│   ├── static/
│   │   └── style.css                   # Stile CSS
│   └── templates/
│       ├── base.html                   # Layout base
│       ├── index.html                  # Catalogo prodotti
│       ├── garment.html                # Dettaglio capo
│       ├── simulation.html             # Simulazione 3D
│       ├── docs.html                   # Documentazione
│       ├── quality.html                # Qualità e sostenibilità
│       ├── analytics.html              # Analytics
│       ├── issues.html                 # Issue tracker
│       ├── new_issue.html              # Nuovo issue
│       └── pull_requests.html          # Pull request
├── examples/                           # Script dimostrativi
│   ├── pattern_demo.py
│   ├── docs_demo.py
│   ├── analytics_demo.py
│   ├── qa_sustainability_demo.py
│   └── all_agents_demo.py
└── tests/
    └── test_agents.py                  # Test automatizzati
```

---

## Licenza

MIT License — Vedi il file LICENSE per i dettagli.
