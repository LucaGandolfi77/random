# Hybrid Classical-Quantum Optimization for Server-VM Workload Placement
## Proposta di ricerca PhD — Versione tecnica

> **Nota sul formato.**
> Questa versione è redatta in stile da paper o technical report: usa notazione matematica
> formale, pseudocodice, tabelle con dati sperimentali reali e terminologia da conference
> proceedings (IEEE/ACM/AAAI). È pensata per pubblici di area theory/systems/quantum.

---

## Indice

1. Titolo, motivazione e problem statement formale
2. Formulazione matematica del problema (MICP)
3. Gap nella letteratura e posizionamento della ricerca
4. Research questions e ipotesi falsificabili
5. Obiettivi e contributi dichiarati
6. Stato dell'arte — cloud resource allocation
7. Stato dell'arte — QUBO, QAOA e VQA
8. Decomposizione ADMM: schema formale
9. Pipeline ibrida: implementazione e differenze controllate
10. Dettaglio tecnico: QAOA e mapping QUBO
11. Procedura `snap_to_feasible` — analisi e motivazione
12. Benchmark e setup sperimentale
13. Risultati preliminari — Tabelle e metriche
14. Analisi della scalabilità e costo computazionale
15. Piano di lavoro e WP
16. Timeline triennale
17. Risultati attesi e criteri di successo
18. Contributo originale vs background
19. Limiti, rischi e strategia di mitigazione
20. Domande

---

## Presentazione slide-by-slide

---

### Slide 1 — Titolo e Problem Statement

**Contenuto slide:**

- **Titolo:** *ADMM-based Hybrid Classical-Quantum Optimization for VM Workload Placement*
- **Classe del problema:** Mixed-Integer Convex Program (MICP) con decomposizione discreta/continua
- **Paradigma risolutivo:** ADMM + QUBO/QAOA (simulato) vs ADMM + QUBO/NumPyMinimumEigensolver
- **Piattaforma:** Qiskit 1.x, qiskit-optimization, DOcplex, StatevectorSampler
- **Dataset preliminare:** 36 istanze, griglia $N \times M$, $N, M \in \{1,\ldots,6\}$

**Note del relatore:**

Aprire fissando subito il tipo di problema e il paradigma di soluzione. Evitare ogni riferimento generico a "quantum computing": la commissione tecnica vuole sapere esattamente quale classe di problema, quale decomposizione, quale algoritmo. Il fatto che il backend sia un simulatore statevector va dichiarato esplicitamente; non è una limitazione imbarazzante, ma un parametro metodologico noto e controllato.

**Visual suggerito:**

```
┌─────────────────────────────────────────────────────────┐
│  Problema MICP                                          │
│  min  Σᵢ πᵢ sᵢ + πᵈᵢ Σⱼ uⱼ vⱼᵢ                       │
│  s.t. Σⱼ vⱼᵢ ≥ capᵢ - 1   ∀i          (server load)  │
│       Σᵢ vⱼᵢ ≤ limⱼ        ∀j          (VM alloc)     │
│       sᵢ ∈ {0,1},  vⱼᵢ,uⱼ ≥ 0                        │
└─────────────────────────────────────────────────────────┘
         │ DOcplex → QuadraticProgram │
         ▼                            ▼
   ADMM+NumPy (classico)      ADMM+QAOA (ibrido)
```

**Messaggio chiave:**

La domanda di ricerca non è "il quantum è più veloce?" ma "sotto quali condizioni strutturali una pipeline ibrida produce soluzioni corrette, comparabili e potenzialmente convenienti?"

---

### Slide 2 — Formulazione matematica del problema

**Contenuto slide:**

- **Variabili:**
  - $s_i \in \{0,1\}$: stato di attivazione del server $i$, $i=1,\ldots,N$
  - $v_{j,i} \geq 0$: quota di carico della VM $j$ sul server $i$
  - $u_j \geq u_{\min}$: livello minimo di CPU della VM $j$
- **Funzione obiettivo:**

$$\min \sum_{i=1}^{N} \left[ \pi_i s_i + \pi^d_i \sum_{j=1}^{M} u_j v_{j,i} \right]$$

- **Vincoli principali:**

$$\sum_{j=1}^{M} v_{j,i} \geq \text{cap}_i - 1 \quad \forall i \qquad \text{(server load)}$$

$$\sum_{i=1}^{N} v_{j,i} \leq \text{lim}_j \quad \forall j \qquad \text{(VM allocation)}$$

$$u_j \geq u_{\min} \quad \forall j \qquad \text{(CPU minima)}$$

- **Fattibilità strutturale (pre-check):**

$$\sum_{j=1}^{M} \text{lim}_j \;\geq\; \sum_{i=1}^{N} \text{cap}_i - N$$

**Note del relatore:**

Presentare la funzione obiettivo e i vincoli con la notazione matriciale/compatta. Sottolineare che il termine $u_j v_{j,i}$ introduce **non-linearità bilineare** nella parte continua; DOcplex la linearizza per la traduzione in `QuadraticProgram`. Il pre-check di fattibilità è un lower bound derivato dal vincolo di carico aggregato e va menzionato come garanzia di non avviare solver su istanze strutturalmente infeasible.

**Visual suggerito:**

Grafo bipartito $N$ server — $M$ VM con archi etichettati $v_{j,i}$, nodi server con $\text{cap}_i$ e nodi VM con $\text{lim}_j$.

**Messaggio chiave:**

Il problema è MICP con parte discreta $\{s_i\}$ e parte continua $\{v_{j,i}, u_j\}$: questa struttura giustifica formalmente la decomposizione ADMM.

---

### Slide 3 — Gap nella letteratura e posizionamento

**Contenuto slide:**

- **Cloud/HPC scheduling:** studi maturi su energy-aware placement (Beloglazov & Buyya, 2012; Ferdaus et al., 2014), ma rari workflow con confronto fair classico vs ibrido
- **Quantum optimization:** QAOA applicato a MaxCut, portfolio, routing — benchmark quasi sempre su QUBO puri, **senza parte continua accoppiata**
- **Hybrid ADMM+QAOA:** letteratura emergente (Gambella & Simonetto, 2020; Bravyi et al., 2020), ma senza analisi sistematica della fattibilità numerica post-solving
- **Gap identificato (1):** nessun protocollo riproducibile che compari ADMM+exact vs ADMM+QAOA su MICP applicativo con vincoli accoppiati discreto/continuo
- **Gap identificato (2):** la fattibilità numerica nei workflow ibridi è un problema noto ma non ancora formalizzato come componente metodologica indipendente

**Note del relatore:**

Il gap non è assenza di algoritmi; è assenza di un **experimental framework** coerente che: (a) usi la stessa formulazione per entrambe le pipeline, (b) gestisca la fattibilità numerica in modo esplicito, (c) distingua il contributo della componente quantistica da quello della parte continua. Questo è il contributo centrale che differenzia il PhD da un'implementazione stand-alone.

**Visual suggerito:**

Tabella 3×4:

| | Cloud optim. | Quantum optim. | Questo lavoro |
|---|:---:|:---:|:---:|
| Formulazione MICP realistica | ✔ | ✗ | ✔ |
| Pipeline ibrida ADMM+QAOA | ✗ | parziale | ✔ |
| Gestione fattibilità numerica | — | ✗ | ✔ |
| Benchmark riproducibile end-to-end | parziale | ✗ | ✔ |

**Messaggio chiave:**

Il contributo è metodologico: costruire il framework che mancava, non proporre un nuovo algoritmo.

---

### Slide 4 — Research Questions e Ipotesi Falsificabili

**Contenuto slide:**

- **RQ1:** Esiste una formulazione MICP del problema server-VM che, sotto ADMM, produce sottoproblemi QUBO ben condizionati e risolvibili con QAOA in regime NISQ?
- **RQ2:** Il gap di performance $\Delta_t = t_{\text{QAOA}} / t_{\text{exact}}$ dipende dalla struttura dell'istanza (densità vincoli, ratio $N/M$, varianza di $\pi_i$, $\text{cap}_i$) o solo dalla dimensione?
- **RQ3:** La procedura di correzione numerica post-ADMM è necessaria e sufficiente per garantire $\text{status} = \texttt{SUCCESS}$ con tolleranza $\varepsilon = 10^{-4}$?
- **RQ4:** Quali classi di istanze presentano $|\text{obj}_{\text{QAOA}} - \text{obj}_{\text{exact}}| > 0$, e con quale frequenza?
- **Ipotesi falsificabili:**
  - H1: $\text{obj}_{\text{QAOA}} = \text{obj}_{\text{exact}}$ su tutte le istanze della griglia $6\times6$ — *già confermata preliminarmente*
  - H2: $\Delta_t < 1$ per tutte le istanze simulate — *già confermata: $\bar{\Delta}_t = 0.229$*
  - H3: $\Delta_t$ dipende in modo statisticamente significativo dalla struttura dell'istanza — *da verificare sul benchmark esteso*

**Note del relatore:**

Presentare le RQ in modo che la commissione veda chiaramente cosa è già risposto (H1, H2) e cosa è aperto (H3, RQ1, RQ4). Le ipotesi già confermate non sono una debolezza; mostrano che il progetto ha già prodotto risultati netti e ha quindi basi concrete su cui costruire la ricerca triennale.

**Visual suggerito:**

Matrice RQ vs stato: confermata / da verificare / aperta.

**Messaggio chiave:**

Le ipotesi sono formulate in modo che siano falsificabili con le metriche già definite nel sistema.

---

### Slide 5 — Obiettivi e Contributi Dichiarati

**Contenuto slide:**

- **O1:** Formalizzare la riduzione MICP → QUBO sotto ADMM con analisi delle condizioni di correttezza
- **O2:** Costruire un benchmark sistematico: griglia $N \times M$, $N, M \in \{1,\ldots,10\}$, con campionamento stratificato su densità e eterogeneità parametrica
- **O3:** Sviluppare un protocollo di verifica della fattibilità post-ADMM con garanzie analitiche o euristiche quantificate
- **O4:** Produrre una mappa di convenienza: classi di istanze in cui $\Delta_t \lesssim 1$ o $|\Delta_{\text{obj}}| > \varepsilon$
- **O5:** Pubblicare codice, dataset, pipeline e risultati secondo i principi FAIR (Findable, Accessible, Interoperable, Reusable)

**Note del relatore:**

Il contributo dichiarato ha tre livelli: (a) *teorico* — analisi della riduzione MICP→QUBO e condizioni di correttezza; (b) *sperimentale* — benchmark esteso, mappa di convenienza; (c) *ingegneristico* — pipeline riproducibile, codice FAIR. È importante separare questi livelli davanti alla commissione per mostrare che il progetto produce conoscenza a più granularità.

**Visual suggerito:**

Schema a tre livelli sovrapposti: formalizzazione teorica — sperimentazione empirica — artefatti software.

**Messaggio chiave:**

Ogni obiettivo ha un deliverable verificabile e misurabile.

---

### Slide 6 — Stato dell'Arte: Cloud Resource Allocation

**Contenuto slide:**

- **Beloglazov & Buyya (2012):** energy-aware VM consolidation con migrazione live; euristica PABFD per bin-packing
- **Ferdaus et al. (2014):** network-aware VM placement, formulazione ILP, solver CPLEX
- **Wood et al. (2009):** Sandpiper, scalabilità ma soluzioni euristiche senza garanzie di ottimalità
- **Tarafdar et al. (2020):** survey su placement con deep reinforcement learning; confronto con LP relaxation
- **Limitazione comune:** nessuno dei lavori citati usa componenti quantistiche o descrive il comportamento numerico del solver con precisione sufficiente per un confronto fair

**Note del relatore:**

Questa slide serve a stabilire che la comunità di cloud optimization è già matura, con strumenti classici potenti. Il punto non è ignorarli: la baseline classica del progetto ne eredita l'approccio (CPLEX/COBYLA). Il contributo quantistico deve essere valutato *rispetto a* questi strumenti, non in isolamento.

**Visual suggerito:**

Timeline degli articoli principali con indicazione del tipo di solver usato.

**Messaggio chiave:**

La baseline classica è forte; il confronto con essa è l'unico modo per dare un senso al componente ibrido.

---

### Slide 7 — Stato dell'Arte: QUBO, QAOA e VQA

**Contenuto slide:**

- **Lucas (2014):** catalogo di riduzioni NP-hard → Ising/QUBO; fondamento teorico per il mapping del sottoproblema discreto
- **Farhi et al. (2014):** QAOA originale, profondità $p$, parametri $(\boldsymbol{\gamma}, \boldsymbol{\beta})$; approssimazione ratio garantita per MaxCut a $p=1$
- **Zhou et al. (2020):** landscape QAOA, concentrazione dei parametri, strategie di inizializzazione
- **Gambella & Simonetto (2020):** ADMM+VQE per problemi misti; primo framework ibrido applicativo strutturato
- **Bravyi et al. (2022):** limitazioni teoriche di QAOA su shallow circuits; rilevanza per NISQ
- **Quantum volume e NISQ constraints:** profondità circuito $O(p \cdot |E_{\text{QUBO}}|)$; limitazioni di decoerenza su hardware reale

**Note del relatore:**

Lucas (2014) è il riferimento chiave per giustificare la riduzione del sottoproblema binario in QUBO. Il lavoro di Gambella & Simonetto è il più vicino al progetto in termini di struttura (ADMM + componente quantum); va citato esplicitamente come punto di partenza e distinto dal contributo proprio. Bravyi et al. aiuta a inquadrare le limitazioni teoriche di QAOA su circuiti shallow, rilevante per giustificare i limiti del simulatore statevector.

**Visual suggerito:**

Schema del circuito QAOA a profondità $p$: layer di mixing $U_B(\beta_k)$ alternati a layer di phase $U_C(\gamma_k)$.

**Messaggio chiave:**

Il mapping QUBO e la profondità $p$ del circuito determinano direttamente il costo di simulazione e le garanzie di approssimazione di QAOA.

---

### Slide 8 — Decomposizione ADMM: Schema Formale

**Contenuto slide:**

- **Formulazione aumentmentata di Lagrange:**

$$\mathcal{L}_\rho(x, z, \lambda) = f(x) + g(z) + \lambda^\top(Ax + Bz - c) + \frac{\rho}{2}\|Ax + Bz - c\|^2$$

- **Iterazioni ADMM:**

  1. $x^{k+1} \leftarrow \arg\min_x \mathcal{L}_\rho(x, z^k, \lambda^k)$ — *sottoproblema discreto (QUBO)*
  2. $z^{k+1} \leftarrow \arg\min_z \mathcal{L}_\rho(x^{k+1}, z, \lambda^k)$ — *sottoproblema continuo (COBYLA)*
  3. $\lambda^{k+1} \leftarrow \lambda^k + \rho(Ax^{k+1} + Bz^{k+1} - c)$ — *aggiornamento duale*

- **Criteri di arresto:** residuo primale $r^k = Ax^k + Bz^k - c$ e residuo duale $s^k = \rho A^\top(z^k - z^{k-1})$ sotto soglia `tol=1e-4`
- **Parametri usati:** $\rho=100$, $\beta=1000$, `factor_c`$=900$, `maxiter`$=100$ (classico), $300$ (ibrido)

**Note del relatore:**

La presentazione delle iterazioni ADMM in forma lagrangiana è essenziale davanti a una commissione tecnica. Va spiegato che il passo (1) è il **collo di bottiglia combinatorio**: è qui che classico ed ibrido differiscono, e tutto il resto della pipeline è invariante. La scelta di `maxiter=300` per il ramo QAOA riflette la maggiore varianza del solver quantistico; questo è un parametro che il progetto intende studiare sistematicamente.

**Visual suggerito:**

Pseudocodice formale ADMM con evidenziato il passo (1) come punto di biforcazione classico/quantum.

**Messaggio chiave:**

La correttezza del confronto sperimentale dipende dall'invarianza di tutti i parametri ADMM tranne il solver del sottoproblema $x$.

---

### Slide 9 — Pipeline Ibrida: Implementazione e Differenze Controllate

**Contenuto slide:**

- **Componenti condivise:** formulazione DOcplex, traduzione `from_docplex_mp`, `ADMMOptimizer`, `CobylaOptimizer`, `snap_to_feasible`, metriche di output
- **Unica differenza controllata:**

| Componente | Pipeline classica | Pipeline ibrida |
|---|---|---|
| Solver QUBO | `MinimumEigenOptimizer(NumPyMinimumEigensolver())` | `MinimumEigenOptimizer(QAOA(...))` |
| Complessità | $O(2^n)$ esatta | Variazionale, $p$ layers |
| Backend | CPU, statevector | StatevectorSampler |
| Garanzia | Ottimo globale esatto | Approssimazione con probabilità dipendente da $p$ e paesaggio energetico |

- **Configurazione QAOA:** `reps=3`, `maxiter=300` (standard), `reps=2`, `maxiter=50` (fast mode)
- **Confrontabilità:** tutti i risultati usano lo stesso seed per la generazione dei parametri iniziali (dove applicabile)

**Note del relatore:**

Questa slide è il punto più importante per la credibilità del confronto. La commissione deve vedere con chiarezza che le due pipeline differiscono **esattamente e solo** nel solver del sottoproblema QUBO. Ogni altra differenza (parametri ADMM diversi, seed diversi, preprocessing diverso) invaliderebbe il confronto. Sottolineare che la tabella sopra riassume questa garanzia metodologica.

**Visual suggerito:**

Diagramma a due rami paralleli con evidenziazione del solo punto di differenza.

**Messaggio chiave:**

La validità scientifica del confronto riposa interamente sull'invarianza di ogni componente non controllata.

---

### Slide 10 — QAOA: Mapping QUBO e Profondità del Circuito

**Contenuto slide:**

- **Riduzione al sottoproblema discreto:** dopo ADMM, il passo (1) diventa

$$\min_{s \in \{0,1\}^N} s^\top Q s + c^\top s \quad \text{(QUBO)}$$

dove $Q$ e $c$ dipendono dai valori correnti $z^k, \lambda^k$ e dai parametri $\rho, \beta, \text{factor\_c}$

- **Mapping Ising:** $s_i = (1 - \sigma^z_i)/2$, con hamiltoniano del problema $H_C = \sum_{ij} J_{ij} Z_i Z_j + \sum_i h_i Z_i$
- **Circuito QAOA a profondità $p$:**

$$|\psi(\boldsymbol{\gamma},\boldsymbol{\beta})\rangle = \prod_{k=1}^{p} e^{-i\beta_k H_B} \, e^{-i\gamma_k H_C} \, |+\rangle^{\otimes N}$$

- **Complessità circuito:** $O(p \cdot N + p \cdot |\text{nnz}(Q)|)$ gate a due qubit
- **Numero di qubit usati nel benchmark:** $N \in \{1,\ldots,6\}$ qubit per il sottoproblema binario

**Note del relatore:**

Questa slide va presentata con formula esplicita solo se in commissione ci sono esperti di quantum computing. In caso di pubblico misto, si può omettere la formula del circuito e concentrarsi sulla tabella qubit/profondità. Il punto chiave da comunicare è che il numero di qubit nel passo QUBO è $N$ (numero di server), non il numero totale di variabili del problema originale: questo è un effetto diretto della decomposizione ADMM.

**Visual suggerito:**

Schema del circuito quantistico con alternanza di layer $U_C(\gamma)$ e $U_B(\beta)$, etichettato con $p=3$.

**Messaggio chiave:**

ADMM riduce il numero di qubit necessari da $O(N + NM + M)$ a $O(N)$: questo è il razionale tecnico per scegliere la decomposizione.

---

### Slide 11 — `snap_to_feasible`: Analisi e Motivazione

**Contenuto slide:**

- **Problema osservato:** ADMM produce soluzioni $\hat{x}$ con violazioni dell'ordine $\varepsilon \sim 10^{-4}$ sui vincoli lineari, classificate come `INFEASIBLE` dal checker interno di Qiskit (tolleranza zero)
- **Procedura implementata:**

```
Input: risultato ADMM x, QuadraticProgram qp
1. clip(x, lb, ub)                    # rispetta i bound
2. per ogni vincolo GE violato:
     distribuire il deficit sulle     # ripara GE
     variabili continue con head-room
3. per ogni vincolo LE violato:
     ridurre proporzionalmente         # ripara LE
     le variabili continue
4. ripetere fino a convergenza (max 20 iter)
5. verifica qp.is_feasible(x)
6. aggiornare _status e _fval
```

- **Condizione di correttezza:** la procedura è sound se e solo se il problema è strutturalmente feasible e le violazioni sono solo numeriche (non strutturali)
- **Garanzia del pre-check:** il pre-check strutturale garantisce che la procedura non mascheri infeasibility reale

**Note del relatore:**

Questa è una delle parti più originali del progetto dal punto di vista implementativo. Va presentata come decisione metodologica consapevole, non come patch di debugging. Il punto chiave è che senza `snap_to_feasible` l'intero benchmark sarebbe distorto: soluzioni sostanzialmente corrette verrebbero conteggiate come fallimenti, invalidando la metrica di success rate. La procedura è sound sotto le assunzioni dichiarate.

**Visual suggerito:**

Grafico scatter: violazione prima della correzione (asse x) vs dopo (asse y), su tutte le 36 istanze, separato per classico e quantum.

**Messaggio chiave:**

La fattibilità numerica nei workflow ibridi non è un dettaglio implementativo; è una componente metodologica che va formalizzata e giustificata esplicitamente.

---

### Slide 12 — Benchmark e Setup Sperimentale

**Contenuto slide:**

- **Griglia:** $N \times M$, $N, M \in \{1,\ldots,6\}$ → 36 istanze
- **Parametri fissati nelle run preliminari:**

| Parametro | Valore |
|---|---|
| `require_all_on` | `True` |
| `min_cpu_per_vm` | 1.0 |
| $\pi_i = \pi^d_i$ | 1.0 ∀i |
| `capacities` | `[11,11,11,10,10,10]` troncato |
| `vm_allocation_limits` | generati con `safe_vm_alloc(margin=1.25)` |

- **Modalità:** `--fast False` (standard), `reps=3`, `maxiter_QAOA=300`
- **Metriche raccolte per ogni istanza:** `classic_objective`, `quantum_objective`, `classic_time_s`, `quantum_time_s`, `speedup_x = classic_time / quantum_time`, `best_solver`, vettori $x$, residuali ADMM
- **Artefatti:** 36 file JSON, 1 CSV aggregato, 1 JSON aggregato, grafici PNG per run

**Note del relatore:**

Questa slide fissa con precisione le condizioni sperimentali. Va detto esplicitamente che `require_all_on=True` riduce la componente decisionale discreta (i $s_i$ sono fissati a 1), il che semplifica il QUBO. Questo è un limite del setup preliminare che il PhD vuole superare. Anche la scelta di costi uniformi $\pi_i = 1$ è una semplificazione da rilassare.

**Visual suggerito:**

Tabella del setup con evidenziazione delle assunzioni semplificanti da rilassare nel progetto.

**Messaggio chiave:**

Il setup preliminare è controllato e riproducibile; le assunzioni semplificanti sono esplicite e definiscono il programma di lavoro futuro.

---

### Slide 13 — Risultati Preliminari: Tabelle e Metriche

**Contenuto slide:**

- **Success rate:** 36/36 per entrambe le pipeline (100%)
- **Coincidenza delle soluzioni:** $\|x_{\text{classic}} - x_{\text{QAOA}}\|_1 = 0$ per tutte le 36 istanze
- **Tempi di esecuzione (secondi):**

| Metrica | Classico | Quantum simulato |
|---|---:|---:|
| Media | 2.294 | 11.499 |
| Mediana | 1.047 | 4.945 |
| Min | 0.080 | 1.256 |
| Max | 15.080 | 70.791 |

- **Speedup $\Delta_t = t_{\text{classic}} / t_{\text{QAOA}}$:**

| Metrica | Valore |
|---|---:|
| Media | 0.229 |
| Mediana | 0.222 |
| Min | 0.021 |
| Max | 0.477 |

- **Caso più critico:** $6 \times 3$ → classico 5.278 s, QAOA 70.791 s, $\Delta_t = 0.075$

**Note del relatore:**

I dati vanno presentati senza retorica: il classico è sempre più veloce. Il punto scientifico importante è che **le due pipeline convergono sempre alla stessa soluzione**, il che valida la correttezza della pipeline QAOA e del processo di snap. Il $\Delta_t < 1$ in tutti i casi è previsto per un simulatore statevector; non è una sorpresa, è una conferma di un'attesa teorica.

**Visual suggerito:**

Scatter plot $t_{\text{classic}}$ vs $t_{\text{QAOA}}$ con linea diagonale $y=x$ come riferimento; tutti i punti stanno sopra la diagonale (quantum più lento).

**Messaggio chiave:**

La coerenza delle soluzioni è il risultato forte; il gap temporale è atteso e non cambia il valore scientifico del progetto.

---

### Slide 14 — Analisi della Scalabilità e Costo Computazionale

**Contenuto slide:**

- **Costo del solver QAOA:** dipende da numero di qubit $N$, profondità $p$, iterazioni COBYLA, e overhead di sampling
- **Costo di simulazione statevector:** $O(2^N)$ in memoria e tempo per ogni valutazione dell'energia
- **Trend osservato nel benchmark:**

| $(N, M)$ | $t_{\text{QAOA}}$ (s) | $t_{\text{classic}}$ (s) |
|---|---:|---:|
| (1,1) | 1.256 | 0.080 |
| (3,3) | 2.765 | 0.744 |
| (5,5) | ≈ 10–15 | ≈ 2–5 |
| (6,3) | 70.791 | 5.278 |

- **Nota:** la dipendenza da $M$ per il QAOA è indiretta (attraverso la dimensione del QUBO in ogni step ADMM)
- **Limite pratico:** per $N > 6$, il simulatore statevector richiede $> 64$ qubit; la simulazione diventa proibitiva senza hardware reale o approssimazione

**Note del relatore:**

Questa slide è importante per mostrare che il progetto è consapevole dei limiti computazionali del simulatore. La crescita esponenziale del costo per $N$ grande è il motivo principale per cui il benchmark preliminare si ferma a $N=6$. Il PhD deve affrontare questo problema: o con tecniche di approssimazione (MPS, tensor network), o con accesso a backend quantistici reali, o con riduzione della dimensione del QUBO tramite pre-processing.

**Visual suggerito:**

Grafico log-log di $t_{\text{QAOA}}$ vs $N$ con fit della curva di crescita.

**Messaggio chiave:**

Il collo di bottiglia è il costo della simulazione statevector; il PhD deve proporre una strategia per superarlo.

---

### Slide 15 — Piano di Lavoro (WP)

**Contenuto slide:**

| WP | Titolo | Output principale | Periodo |
|---|---|---|---|
| WP1 | Model refinement | MICP esteso con costi eterogenei, senza `require_all_on`, metriche energetiche | Anno 1 |
| WP2 | Benchmark extension | Griglia $10\times10$, campionamento stratificato, dataset pubblico | Anno 1–2 |
| WP3 | QAOA configuration study | Analisi di sensibilità su $p$, `maxiter`, inizializzazione, warm-start | Anno 2 |
| WP4 | Scalability beyond statevector | Tensor network simulator / backend reale / riduzione QUBO | Anno 2–3 |
| WP5 | Comparative analysis | Mappa di convenienza, paper 1 (metodologico), paper 2 (empirico) | Anno 2–3 |
| WP6 | Dissemination & thesis | Codice FAIR, tesi, paper | Anno 3 |

**Note del relatore:**

Ogni WP ha un output verificabile dalla commissione. WP4 è il più rischioso perché dipende da risorse esterne (hardware quantistico, accesso a backend cloud); per questo è collocato nel secondo e terzo anno, quando la maturità metodologica è sufficiente per affrontarlo con strumenti più robusti.

**Visual suggerito:**

Tabella WP con frecce di dipendenza tra i pacchetti.

**Messaggio chiave:**

I WP sono progettati in sequenza dipendente; ogni pacchetto riduce il rischio del successivo.

---

### Slide 16 — Timeline Triennale

**Contenuto slide:**

```
Anno 1 (mesi 1–12)
├── M1–M3:  Survey sistematica, posizionamento RQ nel panorama attuale
├── M3–M6:  Raffinamento modello MICP, rimozione di require_all_on
├── M6–M9:  Benchmark $8\times8$, analisi di sensibilità parametrica
└── M9–M12: Protocollo di fattibilità formalizzato, report interno WP1+WP2

Anno 2 (mesi 13–24)
├── M13–M16: QAOA configuration study (WP3), analisi $p$, landscape
├── M16–M20: Primo confronto con baseline quantum-inspired (SA, tabu search QUBO)
├── M20–M22: Sottomissione paper metodologico (workshop IEEE Quantum / IJCAI)
└── M22–M24: Avvio WP4, accesso backend simulato MPS o IBM Quantum

Anno 3 (mesi 25–36)
├── M25–M28: Validazione su backend realistici, analisi rumore
├── M28–M32: Mappa di convenienza, paper empirico (journal)
├── M32–M35: Scrittura tesi, revisione articoli
└── M35–M36: Difesa PhD
```

**Note del relatore:**

Questa timeline va presentata come piano realistico, non come garanzia. I milestone interni (report, sottomissioni) sono punti di verifica per la commissione annuale di avanzamento. La struttura è deliberatamente conservativa nel primo anno per consolidare le basi metodologiche.

**Visual suggerito:**

Gantt a tre barre (una per anno) con milestone evidenziate.

**Messaggio chiave:**

La timeline è progettata per produrre output verificabili ogni 6 mesi, riducendo il rischio di blocchi prolungati.

---

### Slide 17 — Risultati Attesi e Criteri di Successo

**Contenuto slide:**

- **Risultato minimo accettabile (lower bound del PhD):**
  - Benchmark $\geq 100$ istanze con griglia estesa e parametri eterogenei
  - Protocollo di fattibilità formalizzato con analisi di correttezza
  - Almeno un paper accettato in venue peer-reviewed

- **Risultato atteso (target principale):**
  - Mappa di convenienza: classi di istanze con $\Delta_t \lesssim 1$ identificate con criterio statistico
  - Confronto con $\geq 2$ baseline classiche (CPLEX, simulated annealing su QUBO)
  - Due paper pubblicati o in revisione

- **Risultato possibile (upper bound):**
  - Evidenza di $\text{obj}_{\text{QAOA}} < \text{obj}_{\text{exact}}$ su istanze specifiche (potenziale indicatore di comportamento non-classico)
  - Validazione su backend quantistico reale, anche limitata a $N \leq 5$

- **Criteri di falsificazione del progetto:**
  - Se $|\Delta_{\text{obj}}| > \varepsilon$ su $> 10\%$ delle istanze senza pattern strutturale identificabile, la pipeline QAOA non è affidabile
  - Se $\Delta_t > 10$ su tutta la griglia estesa senza dipendenza da parametri strutturali, il valore del benchmark è limitato

**Note del relatore:**

I criteri di falsificazione sono importanti: una commissione tecnica li apprezza perché mostrano che il progetto non è costruito per "non poter fallire". Anche gli scenari negativi portano a conclusioni scientifiche nette, che è esattamente il tipo di contributo che vale una pubblicazione.

**Visual suggerito:**

Matrice outcomes: asse x = qualità della soluzione, asse y = performance temporale; quattro quadranti con interpretazione.

**Messaggio chiave:**

Il progetto produce conoscenza in tutti e quattro i quadranti della matrice degli esiti.

---

### Slide 18 — Contributo Originale vs Background

**Contenuto slide:**

| | Background (letteratura) | Questo progetto |
|---|---|---|
| Formulazione MICP server-VM | Beloglazov, Ferdaus, Wood | Formulazione estesa con $\pi^d_i$, $u_j$, pre-check strutturale |
| ADMM per problemi misti | Boyd et al., Gambella & Simonetto | Integrazione in pipeline riproducibile end-to-end |
| QAOA su QUBO | Farhi, Zhou, Bravyi | Applicazione al sottoproblema ADMM con analisi sistematica |
| Fattibilità numerica post-solver | Non formalizzato in letteratura | `snap_to_feasible`: procedura con analisi di correttezza |
| Benchmark ibrido classico/quantum | Assente su questo dominio | 36 istanze (→ $\geq100$), metriche standardizzate, CSV/JSON pubblici |

**Note del relatore:**

Questa tabella è la risposta più efficace alla domanda "cosa è originale nel tuo lavoro?". Va presentata con calma, riga per riga. Il punto di forza è la colonna di destra: ogni riga ha un deliverable concreto, non solo un'affermazione generica.

**Visual suggerito:**

Tabella a due colonne con sfondo grigio per il background e sfondo verde per il contributo proprio.

**Messaggio chiave:**

L'originalità è distribuita su quattro assi: formulazione, pipeline, procedura numerica, benchmark.

---

### Slide 19 — Limiti, Rischi e Mitigazione

**Contenuto slide:**

| Rischio | Probabilità | Impatto | Mitigazione |
|---|:---:|:---:|---|
| Simulatore statevector non scalabile oltre $N=8$ | Alta | Alto | Tensor network (MPS) o backend IBM Quantum free-tier |
| Assenza di $\Delta_t < 1$ su benchmark esteso | Media | Medio | Pubblicare come risultato negativo strutturato |
| `require_all_on` generalizza male | Alta | Basso | Rimozione nel WP1, già pianificata |
| QAOA non converge su QUBO mal condizionati | Media | Alto | Studio landscape energetico (WP3), warm-start |
| Accesso limitato a hardware quantistico reale | Alta | Medio | Backend simulati ad alta fedeltà (AerSimulator con rumore) |
| Parametri ADMM non ottimali per il ramo QAOA | Media | Medio | Grid search su $\rho$, $\beta$, `factor_c` nel benchmark esteso |

**Note del relatore:**

Ogni rischio ha una mitigazione tecnica specifica, non generica. Questo è ciò che distingue una gestione del rischio da PhD da una da tesi magistrale. Il rischio più alto in termini di impatto è la mancanza di scalabilità del simulatore; per questo WP4 è dedicato esplicitamente a questo tema.

**Visual suggerito:**

Matrice rischio (probabilità × impatto) con i sei rischi posizionati nei quadranti.

**Messaggio chiave:**

Tutti i rischi identificati hanno una contromisura tecnica che produce comunque output scientifici.

---

### Slide 20 — Domande

**Contenuto slide:**

- Disponibile per discussione tecnica su:
  - Formulazione MICP e condizioni di fattibilità strutturale
  - Mapping QUBO e profondità circuito QAOA
  - Procedura `snap_to_feasible` e garanzie analitiche
  - Disegno del benchmark e scelta delle metriche
  - Scalabilità della simulazione statevector e alternative

**Note del relatore:**

Chiudere lasciando spazio a tre tipi di domande: (a) domande di verifica della comprensione, (b) domande di critica metodologica, (c) suggerimenti da parte della commissione. Essere pronti a disegnare alla lavagna le iterazioni ADMM e il circuito QAOA se richiesto.

**Visual suggerito:**

Slide pulita con il diagramma di flusso dell'intera pipeline come sfondo.

**Messaggio chiave:**

Apertura al confronto tecnico su tutti e quattro i livelli del contributo.

---

## Script orale — 20 minuti (versione tecnica)

### [0:00 – 1:30] Apertura e Problem Statement

"Il progetto che presento studia la risolubilità di un problema di ottimizzazione misto — di classe MICP — attraverso una pipeline ibrida classico-quantistica basata su decomposizione ADMM. Il dominio applicativo è il placement di macchine virtuali su server fisici in ambienti cloud. La formulazione prevede variabili binarie $s_i$ per l'attivazione dei server, variabili continue $v_{j,i}$ per l'allocazione del carico e $u_j$ per il livello minimo di CPU. La funzione obiettivo combina costo fisso di attivazione e costo variabile bilineare di utilizzo."

### [1:30 – 3:00] Motivazione e Gap

"Il motivo per cui questo problema è scientificamente interessante per un PhD non è la promessa di speedup quantistico, ma l'assenza di un framework sperimentale rigoroso per valutarlo. La letteratura su cloud scheduling usa solver classici potenti, ma non confronta sistematicamente con pipeline ibride. La letteratura su QAOA usa benchmark QUBO sintetici, raramente applicativi misti con parte continua accoppiata. Manca inoltre una gestione formalizzata della fattibilità numerica post-ADMM, che nel nostro caso si rivela necessaria per evitare classificazioni errate."

### [3:00 – 5:00] Formulazione matematica

"La decomposizione ADMM separa il problema in due sottoproblemi iterativi. Il primo — il passo $x$ — è un QUBO sulle variabili binarie $s_i$: è qui che le due pipeline divergono. Il secondo — il passo $z$ — è un problema continuo risolto con COBYLA in entrambi i casi. Il passo $x$ nella pipeline classica usa NumPyMinimumEigensolver, che restituisce la soluzione esatta in $O(2^N)$. Nella pipeline ibrida usa QAOA con $p=3$ layer, che approssima la soluzione con varianza dipendente dal paesaggio energetico dell'hamiltoniano del problema."

### [5:00 – 7:00] Procedura snap e fattibilità

"Un elemento metodologico rilevante è la procedura `snap_to_feasible`. ADMM produce soluzioni con violazioni numeriche dell'ordine $10^{-4}$. Il checker interno di Qiskit usa tolleranza zero, per cui queste soluzioni verrebbero classificate come INFEASIBLE. La procedura corregge le violazioni distribuendo il deficit o l'eccesso sulle variabili continue con head-room disponibile, rispettando i bound e iterando fino a convergenza. La procedura è sound sotto la condizione che il problema sia strutturalmente feasible — garantita dal pre-check analizzato nella formulazione."

### [7:00 – 10:00] Risultati preliminari

"Sul benchmark preliminare di 36 istanze, entrambe le pipeline raggiungono il 100% di success rate e producono vettori di soluzione identici — differenza $L_1$ pari a zero. I tempi medi sono 2.3 secondi per il classico e 11.5 per il quantistico simulato. Il rapporto $\Delta_t$ ha media 0.229 e massimo 0.477: il classico è sempre più veloce, con picco estremo nel caso $6\times3$ dove il QAOA impiega 70 secondi. Questo risultato è atteso: il simulatore statevector ha costo esponenziale in $N$, e per $N=6$ la simulazione è già onerosa."

### [10:00 – 12:30] Estensioni e WP

"Il PhD estenderà questo benchmark in tre direzioni. Prima: rimozione del vincolo `require_all_on=True`, che nel setup attuale azzera la variabilità del sottoproblema binario e riduce la QUBO a una semplice ristrettura dei parametri. Seconda: parametri eterogenei — $\pi_i$ e $\text{cap}_i$ non uniformi — per testare istanze con struttura più sfidante. Terza: scala fino a $N=10$, con uso di simulatori approssimati come tensor network o MPS per aggirare il limite esponenziale del simulatore statevector."

### [12:30 – 15:00] Contributo originale

"Il contributo originale del progetto si articola su quattro livelli. Primo, la formulazione MICP estesa con pre-check di fattibilità strutturale. Secondo, la pipeline ADMM riproducibile con confronto fair tra solver. Terzo, la procedura `snap_to_feasible` con analisi di correttezza. Quarto, il benchmark sistematico con metriche standardizzate e dati pubblici. Nessuno di questi quattro livelli è presente in letteratura nella combinazione qui proposta."

### [15:00 – 17:30] Scalabilità e rischi

"Il rischio tecnico principale è la scalabilità della simulazione oltre $N=6$. Per affrontarlo, il WP4 prevede l'integrazione con simulatori ad alta fedeltà come AerSimulator con rumore o MPS, e l'esplorazione di backend IBM Quantum nel regime free-tier. Un secondo rischio è che QAOA non converga su QUBO mal condizionati, problema affrontato nel WP3 con studio sistematico del landscape energetico e warm-start. Il rischio di assenza di speedup su benchmark esteso è considerato accettabile: anche un risultato negativo strutturato è pubblicabile."

### [17:30 – 20:00] Chiusura

"In sintesi, il progetto costruisce ciò che manca: un framework sperimentale rigoroso per valutare pipeline ibride classico-quantistiche su un problema MICP applicativo realistico. I risultati preliminari confermano correttezza e fattibilità metodologica. Il piano triennale punta a rispondere a tre domande aperte: la dipendenza strutturale del gap di performance, la scalabilità oltre il regime simulato, e l'identificazione di classi di istanze genuinamente vantaggiose per l'approccio ibrido. Grazie. Sono disponibile per domande su tutti i livelli tecnici del progetto."

---

## Domande della commissione — Versione tecnica

### 1. Come garantisci che il QUBO generato da ADMM sia ben condizionato per QAOA?

**Risposta:**
Il QUBO in ogni iterazione ADMM dipende da $\rho$, $\beta$, `factor_c` e dai valori correnti di $z^k$ e $\lambda^k$. Un QUBO mal condizionato (autovalori di $Q$ molto asimmetrici) produce un landscape energetico piatto che QAOA fatica a navigare. Il WP3 affronta questo problema con uno studio sistematico dei parametri ADMM e delle loro conseguenze sul condizionamento del QUBO. Una possibile mitigazione è la penalizzazione adattiva del termine quadratico.

### 2. Perché COBYLA per il sottoproblema continuo e non L-BFGS-B o altri gradient-based?

**Risposta:**
COBYLA è un metodo derivative-free, adatto quando la funzione obiettivo del passo $z$ è valutata numericamente senza gradiente esplicito. In `qiskit-optimization`, il `CobylaOptimizer` è il default per il passo continuo nell'ADMM ibrido. L'analisi della sensibilità del solver continuo rispetto alla scelta dell'ottimizzatore è un punto che il progetto può esplorare nel WP3, ma non è il focus principale del confronto.

### 3. La procedura `snap_to_feasible` può introdurre bias nel valore obiettivo?

**Risposta:**
Sì, in linea di principio. La correzione sposta le variabili continue verso i bound, il che può alterare il valore di $f(x)$. Tuttavia, nel benchmark preliminare, dopo `snap` il valore obiettivo coincide con quello del classico su tutte le 36 istanze, indicando che lo spostamento è trascurabile rispetto alla tolleranza del problema. Un'analisi formale del bias introdotto dalla procedura è prevista nel WP1 come parte della formalizzazione metodologica.

### 4. Perché non usare SDP (Semidefinite Programming) o branch-and-bound come baseline aggiuntiva?

**Risposta:**
SDP e branch-and-bound sono baseline più forti del NumPyMinimumEigensolver su istanze grandi. Il progetto prevede di includere CPLEX e almeno una euristica classica sul QUBO (simulated annealing o tabu search) nel WP4 per avere un confronto più completo. Il NumPyMinimumEigensolver è usato nella fase preliminare perché restituisce la soluzione esatta e consente di isolare il comportamento di QAOA senza ambiguità.

### 5. Come intendi gestire il rumore quantistico nei test su hardware reale?

**Risposta:**
Il rumore introduce errori di bitflip e depolarizzazione che modificano la distribuzione di probabilità dell'output del circuito. Per gestirlo, si possono usare: (a) error mitigation via zero-noise extrapolation (ZNE); (b) readout error mitigation tramite calibrazione; (c) circuit transpilation ottimizzata per ridurre la profondità. L'analisi del rumore è pianificata per il WP4, dopo che la validazione su simulatore è completata.

### 6. Il valore `speedup_x = classic_time / quantum_time` è una metrica appropriata?

**Risposta:**
Come definita nel progetto, la metrica misura l'inverso dello speedup: $\Delta_t < 1$ significa che il classico è più veloce. È una metrica operativa corretta per confrontare i tempi, ma non cattura la qualità della soluzione né la scalabilità. Per questo il benchmark usa anche `objective_gap`, `feasibility_rate` e `solution_distance`. Il nome `speedup_x` è potenzialmente fuorviante nella direzione; nella versione finale del paper andrà rinominato o ridefinito.

### 7. Quali sono le condizioni sufficienti perché QAOA superi il classico su questo problema?

**Risposta:**
Non è noto un criterio generale. Dai risultati teorici (Bravyi et al., 2022), QAOA a profondità bassa ha garanzie limitate su problemi arbitrari. Per questo dominio, le condizioni più probabilmente favorevoli al quantum sono: QUBO con struttura sparse e frustrazione elevata, parametri ADMM che producono un landscape energetico concentrato intorno all'ottimo, e profondità $p$ sufficientemente alta da superare le barriere del landscape. Il WP3 è progettato esattamente per identificare queste condizioni empiricamente.

### 8. Come validerai che i risultati su simulatore sono rappresentativi del comportamento su hardware reale?

**Risposta:**
La validazione sarà parziale: per $N \leq 4$ o $5$, un confronto diretto con un backend reale (IBM Quantum, IonQ se accessibile) è fattibile nel regime free-tier. Per $N > 5$, la validazione sarà indiretta tramite AerSimulator con modello di rumore calibrato sull'hardware target. L'obiettivo non è replicare esattamente l'hardware, ma verificare che le tendenze qualitative osservate su simulatore (coincidenza degli obiettivi, dipendenza da $p$) si mantengano in presenza di rumore.

### 9. Perché la griglia $N \times M$ è il design del benchmark e non un campionamento random?

**Risposta:**
La griglia garantisce copertura sistematica dello spazio $(N, M)$ e consente l'analisi dell'andamento delle metriche lungo entrambi gli assi. Un campionamento random richiederebbe molte più istanze per coprire lo stesso spazio con la stessa densità. Nel benchmark esteso, la griglia sarà affiancata da un campionamento stratificato su parametri come ratio $N/M$, varianza di $\pi_i$ e densità dei vincoli, per testare l'ipotesi H3 sulla dipendenza strutturale.

### 10. Cosa succede se si toglie `require_all_on=True`?

**Risposta:**
Il problema diventa genuinamente misto: le variabili $s_i$ sono libere, il QUBO ha un contenuto combinatorio reale e l'ottimo potrebbe disattivare alcuni server. Questo rende il problema più difficile per entrambe le pipeline e più informativo per il confronto. È la prima modifica pianificata nel WP1, ed è il cambiamento più atteso dal punto di vista scientifico perché rimuove il principale fattore di trivializzazione del sottoproblema discreto.

---

## Miglioramenti tecnici per rafforzare la proposta

1. Aggiungere una slide di backup con la derivazione esplicita del QUBO dal problema duale aumentmentato ADMM, per rispondere a domande sul condizionamento del mapping.
2. Includere nel benchmark la metrica `objective_gap_normalized = |obj_Q - obj_C| / obj_C` per confronti tra istanze di scala diversa.
3. Formalizzare la procedura `snap_to_feasible` come lemma con enunciato e condizioni di applicabilità, rendendola citabile nel paper metodologico.
4. Aggiungere almeno una baseline quantum-inspired (simulated annealing sul QUBO) per distinguere il contributo specifico della componente variationale di QAOA dalla semplice natura stocastica del solver.
5. Definire formalmente la mappa di convenienza come funzione $\mathcal{C}: \mathcal{I} \to \{0, 1\}$ su uno spazio di istanze parametrizzato, con criterio di classificazione esplicito (e.g., $\Delta_t < 1$ e $|\Delta_{\text{obj}}| < \varepsilon$).
6. Nel paper metodologico, analizzare separatamente il contributo di `snap_to_feasible` rispetto alla qualità intrinseca della soluzione ADMM, usando un ablation study su un sottoinsieme delle istanze.
7. Inserire una tabella di complessità comparata: NumPyMinimumEigensolver ($O(2^N)$), QAOA ($O(p \cdot N \cdot \text{shots})$), SA sul QUBO ($O(\text{steps} \cdot N)$).
8. Valutare l'uso di `warm_start_qaoa` disponibile in qiskit-optimization per ridurre il numero di iterazioni COBYLA necessarie a convergere.
9. Dichiarare esplicitamente nel paper il numero di qubit effettivamente usati in ogni run (non $N$ variabili totali ma $N$ qubit del sottoproblema QUBO post-ADMM), perché questo è il parametro rilevante per il confronto con la letteratura quantistica.
10. Considerare la sottomissione a venue che esplicitamente trattano hybrid quantum-classical optimization: IEEE Transactions on Quantum Engineering, Quantum Science and Technology (IOP), workshop QAOA/VQA presso AAAI, NeurIPS o QIP.
