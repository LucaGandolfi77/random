# Presentazione accademica PhD

## Assunzioni esplicite

Poiché il prompt contiene campi segnaposto non compilati, assumo il seguente perimetro di lavoro, coerente con i materiali presenti nella cartella `qiskit`.

- Titolo del progetto: Ottimizzazione ibrida classico-quantistica per il workload placement di macchine virtuali su server fisici
- Ambito disciplinare: quantum computing, ottimizzazione combinatoria, cloud/data center optimization
- Contesto: proposta di ricerca PhD costruita a partire da un caso di studio preliminare già implementato in Qiskit
- Obiettivo della presentazione: presentazione proposta PhD con risultati preliminari e piano triennale
- Pubblico: commissione PhD, docenti di area informatica/ingegneria, ricercatori interessati a quantum optimization
- Durata assunta: 20 minuti
- Numero di slide: 20
- Livello tecnico: avanzato ma comunicabile in modo chiaro

Dati che sarebbe utile aggiungere nella versione finale:

- disponibilità di dataset reali o semi-reali di carico in data center
- accesso previsto a backend quantistici reali o solo simulatori
- baseline classiche aggiuntive oltre ad ADMM + NumPyMinimumEigensolver
- indicatori industriali da privilegiare: costo, energia, SLA, carbon footprint

## 1. Indice generale della presentazione

1. Titolo e posizionamento del progetto
2. Motivazione e contesto scientifico
3. Problema di ricerca
4. Gap nella letteratura
5. Domande di ricerca
6. Ipotesi di lavoro
7. Obiettivi generali e specifici
8. Stato dell'arte sintetico
9. Metodologia
10. Dataset, strumenti ed esperimenti previsti
11. Architettura e approccio tecnico
12. Piano di lavoro
13. Timeline del PhD
14. Risultati attesi
15. Contributo scientifico originale
16. Limiti e rischi del progetto
17. Impatto accademico, industriale e sociale
18. Conclusioni
19. Slide finale per domande
20. Bibliografia essenziale

## 2. Presentazione slide-by-slide

### Slide 1 — Titolo

**Contenuto slide:**

- Ottimizzazione ibrida classico-quantistica per il workload placement di macchine virtuali su server fisici
- Proposta di ricerca PhD con evidenze preliminari in ambiente Qiskit
- Area: quantum computing applicato all'ottimizzazione di infrastrutture cloud
- Candidato, supervisore, corso di dottorato, istituzione

**Note del relatore:**

Aprire la presentazione definendo con precisione il perimetro: non si tratta di una promessa generica sul quantum advantage, ma di un progetto di ricerca metodologicamente rigoroso su un problema reale di allocazione delle risorse. Chiarire subito che il lavoro parte da un prototipo già implementato e validato su istanze preliminari. Questo posizionamento trasmette maturità progettuale e fattibilità. Transizione: dopo aver definito il titolo, è necessario motivare perché il problema meriti attenzione scientifica.

**Visual suggerito:**

Schema iniziale con tre blocchi: Data Center, Modello di ottimizzazione, Pipeline ibrida classico-quantistica.

**Messaggio chiave:**

Il progetto affronta un problema applicativo concreto con una metodologia di ottimizzazione avanzata e verificabile.

### Slide 2 — Motivazione e contesto scientifico

**Contenuto slide:**

- I data center richiedono decisioni di allocazione sempre più efficienti, elastiche e sostenibili
- Il placement di VM coinvolge costi energetici, utilizzo delle risorse e vincoli operativi multipli
- Molti problemi di allocazione sono misti: binari, continui e vincoli accoppiati
- Il quantum computing è promettente, ma va valutato con benchmark rigorosi e comparazioni corrette
- Serve una pipeline sperimentale che distingua hype, limiti reali e potenziale scientifico

**Note del relatore:**

Enfatizzare che il contesto non è solo teorico: il placement influenza costo operativo, consumo energetico, qualità del servizio e scalabilità. Sottolineare che la novità del progetto non è applicare il quantum in modo ornamentale, ma costruire un protocollo sperimentale serio per capire dove e come approcci ibridi possano avere senso. Transizione: una volta motivato il contesto, bisogna definire il problema di ricerca in termini formalmente chiari.

**Visual suggerito:**

Grafico o icona che mostri crescita dei carichi cloud, consumo energetico dei data center e complessità decisionale del placement.

**Messaggio chiave:**

Il problema è rilevante perché combina impatto applicativo, difficoltà computazionale e interesse emergente per soluzioni ibride.

### Slide 3 — Problema di ricerca

**Contenuto slide:**

- Come modellare in modo rigoroso il placement di workload tra server fisici e VM?
- Come confrontare correttamente una pipeline classica e una pipeline quantistica simulata sulla stessa formulazione?
- Come garantire fattibilità numerica e confrontabilità dei risultati?
- Quali condizioni rendono il sottoproblema combinatorio adatto a tecniche tipo QUBO/QAOA?

**Note del relatore:**

Definire il problema come task di ottimizzazione a costo minimo con variabili binarie per lo stato dei server e variabili continue per l'allocazione di carico e la CPU minima. Chiarire che la vera domanda scientifica non è solo “chi è più veloce”, ma “come si costruisce un confronto metodologicamente corretto tra paradigmi diversi su un problema misto”. Questo è il centro della proposta. Transizione: per giustificare la ricerca, occorre mostrare cosa manca ancora in letteratura.

**Visual suggerito:**

Formulazione schematica con variabili `s_i`, `v_{j,i}`, `u_j`, funzione obiettivo e vincoli principali.

**Messaggio chiave:**

Il progetto studia non solo una soluzione, ma il modo corretto di formulare e valutare un confronto classico/quantistico.

### Slide 4 — Gap nella letteratura

**Contenuto slide:**

- La letteratura su cloud scheduling e quella su quantum optimization dialogano ancora poco
- Molti studi quantistici usano QUBO sintetici, ma meno spesso problemi applicativi misti con forte struttura vincolata
- I confronti tra solver non sempre isolano chiaramente il contributo del sottoproblema combinatorio
- La gestione della fattibilità numerica è spesso sottotrattata nei workflow ibridi
- Mancano benchmark riproducibili che uniscano modellazione, solving, aggregazione risultati e reportistica

**Note del relatore:**

Qui è importante essere netti ma prudenti. Non dire che la letteratura è assente; dire che è frammentata. Da un lato esistono studi maturi su resource allocation nei data center, dall'altro su QAOA, QUBO e algoritmi ibridi. Il gap emerge nell'intersezione: formulazioni realistiche, confronto fair, attenzione alla fattibilità e pipeline riproducibile end-to-end. Questo posiziona il contributo in modo credibile davanti alla commissione. Transizione: dal gap derivano le domande di ricerca.

**Visual suggerito:**

Diagramma di Venn con tre insiemi: cloud optimization, hybrid quantum optimization, experimental reproducibility; evidenziare la zona di intersezione come spazio del progetto.

**Messaggio chiave:**

L'originalità nasce dall'intersezione fra modellazione applicativa, ottimizzazione ibrida e rigore sperimentale.

### Slide 5 — Domande di ricerca

**Contenuto slide:**

- RQ1: Quale formulazione del problema preserva realismo applicativo e trattabilità computazionale?
- RQ2: In quali condizioni una decomposizione ADMM con sottoproblema QUBO è efficace e stabile?
- RQ3: Il comportamento della pipeline QAOA cambia al variare di scala, struttura dei costi e vincoli?
- RQ4: Come valutare correttamente correttezza, tempo, robustezza e qualità della soluzione?
- RQ5: Qual è il valore scientifico di risultati negativi, cioè assenza di speedup ma presenza di correttezza metodologica?

**Note del relatore:**

Presentare le RQ come una progressione logica: prima la formulazione, poi il metodo, poi la valutazione. La quinta domanda è importante perché mostra maturità scientifica: anche l'assenza di vantaggio prestazionale può essere un risultato utile se definita in modo rigoroso. Questo abbassa il rischio percepito del progetto senza indebolirne l'ambizione. Transizione: dalle domande derivano ipotesi verificabili.

**Visual suggerito:**

Elenco numerato con etichette RQ1-RQ5 e frecce che collegano formulazione, metodo e valutazione.

**Messaggio chiave:**

Le domande di ricerca sono verificabili, progressive e non dipendono da una narrativa di quantum advantage predefinita.

### Slide 6 — Ipotesi di lavoro

**Contenuto slide:**

- H1: una pipeline ADMM con componente QUBO può produrre soluzioni corrette e confrontabili con la baseline classica
- H2: la gestione esplicita della fattibilità numerica migliora affidabilità e interpretabilità dei risultati
- H3: l'eventuale vantaggio quantistico dipende dalla struttura dell'istanza più che dalla sola dimensione del problema
- H4: benchmark realistici e riproducibili generano un contributo scientifico anche in assenza di speedup

**Note del relatore:**

Spiegare che le ipotesi non sono formulate in modo promozionale, ma falsificabile. In particolare, H3 evita semplificazioni: non basta aumentare il numero di variabili per ottenere un vantaggio del quantum; conta la struttura del problema, la sparsità, la penalizzazione, la qualità dell'ansatz e la rumorosità del backend. Transizione: da queste ipotesi si passa agli obiettivi del progetto.

**Visual suggerito:**

Tabella a due colonne: ipotesi e metrica/criterio di verifica.

**Messaggio chiave:**

Le ipotesi sono scientificamente difendibili perché collegano metodo, validazione e impatto del risultato.

### Slide 7 — Obiettivi generali e specifici

**Contenuto slide:**

- Obiettivo generale: sviluppare un framework sperimentale per valutare metodi ibridi classico-quantistici nel placement server-VM
- O1: raffinare la formulazione matematica del problema con parametri più realistici
- O2: estendere il benchmark oltre le istanze preliminari 1-6 x 1-6
- O3: confrontare solver classici, ibridi e quantistici simulati con protocollo comune
- O4: analizzare robustezza, fattibilità, tempo, qualità e scalabilità
- O5: produrre risultati pubblicabili, codice riproducibile e materiali di disseminazione

**Note del relatore:**

Distinguere con chiarezza obiettivo generale e obiettivi specifici. La commissione deve vedere che il progetto non si limita a “provare QAOA”, ma costruisce conoscenza cumulativa: formulazione, benchmark, confronto, interpretazione e rilascio di artefatti riproducibili. Transizione: prima di spiegare il metodo proposto, conviene collocarlo nel panorama dello stato dell'arte.

**Visual suggerito:**

Mappa degli obiettivi con un nodo centrale e cinque rami operativi.

**Messaggio chiave:**

Gli obiettivi mostrano fattibilità, progressione e orientamento a risultati scientifici concretamente valutabili.

### Slide 8 — Stato dell'arte sintetico

**Contenuto slide:**

- Filone 1: resource allocation e VM placement nei cloud/data center, con focus su costo, energia e SLA
- Filone 2: formulazioni QUBO/Ising e conversione di problemi combinatori per solver quantistici
- Filone 3: algoritmi variazionali e QAOA per ottimizzazione discreta
- Filone 4: metodi ibridi e decomposizioni tipo ADMM per problemi misti
- Stato attuale: molte intuizioni promettenti, ma benchmark applicativi comparabili ancora limitati

**Note del relatore:**

Questa slide deve essere sintetica, non bibliografica in senso esteso. L'obiettivo è mostrare padronanza dei quattro filoni che il progetto integra. Conviene sottolineare che il valore della ricerca sta nel mettere in comunicazione comunità che spesso pubblicano in sedi diverse e con metriche differenti. Transizione: a questo punto si può entrare nella metodologia proposta.

**Visual suggerito:**

Timeline o schema a quattro colonne con i principali filoni di ricerca e la loro convergenza nel progetto.

**Messaggio chiave:**

Il progetto è interdisciplinare, ma ha un punto di convergenza metodologico preciso e leggibile.

### Slide 9 — Metodologia

**Contenuto slide:**

- Modellazione del problema in DOcplex e conversione in `QuadraticProgram`
- Decomposizione ADMM tra parte discreta e parte continua
- Baseline classica: ADMM + NumPyMinimumEigensolver + COBYLA
- Pipeline ibrida: ADMM + QAOA + COBYLA
- Correzione di fattibilità numerica tramite procedura `snap_to_feasible()`
- Valutazione con metriche su obiettivo, stato, tempo, residuali e stabilità

**Note del relatore:**

Questa è la slide metodologica centrale. Spiegare che il disegno sperimentale è fair perché la formulazione matematica e l'architettura ADMM sono identiche; cambia solo il motore che risolve il sottoproblema combinatorio. Evidenziare la procedura di correzione della fattibilità come punto metodologico originale e necessario per evitare interpretazioni fuorvianti di soluzioni quasi ammissibili. Transizione: dopo il metodo, è opportuno chiarire dati, strumenti e protocollo sperimentale.

**Visual suggerito:**

Diagramma di flusso: definizione modello → traduzione QP → ADMM → ramo classico / ramo QAOA → verifica di fattibilità → reportistica.

**Messaggio chiave:**

La forza del progetto è la controllabilità del confronto sperimentale, non una semplice giustapposizione di solver.

### Slide 10 — Dataset, strumenti, esperimenti o fonti previste

**Contenuto slide:**

- Evidenza preliminare: benchmark sintetico completo su 36 istanze `n_servers, n_vms in {1, ..., 6}`
- Tutte le istanze preliminari risultano fattibili e `SUCCESS` in entrambe le pipeline
- Nelle prove attuali gli obiettivi coincidono, mentre il classico è sempre più rapido del quantistico simulato
- Estensione prevista: istanze eterogenee, costi non uniformi, vincoli più realistici, scenari senza `require_all_on`
- Strumenti: Qiskit, qiskit-optimization, DOcplex, CPLEX/solver classici, Python, pipeline di merge e reportistica
- Fonti future: tracce di workload, dataset cloud pubblici, parametri energetici o economici realistici

**Note del relatore:**

Mostrare maturità empirica: il progetto non parte da zero, esiste già una base sperimentale preliminare. È però essenziale dire con onestà che i dati attuali indicano correttezza e non vantaggio prestazionale. Questo, davanti alla commissione, rafforza la credibilità. Subito dopo, spiegare come il PhD allargherà il dominio sperimentale per testare casi meno regolari e più scientificamente sfidanti. Transizione: definito il protocollo sperimentale, si può mostrare l'architettura tecnica complessiva.

**Visual suggerito:**

Tabella con metriche preliminari: 36/36 successi, obiettivi identici, tempo medio classico inferiore al quantum simulato.

**Messaggio chiave:**

Le evidenze preliminari dimostrano fattibilità della pipeline; la ricerca PhD serve a estenderne realismo, scala e capacità esplicativa.

### Slide 11 — Architettura/approccio tecnico

**Contenuto slide:**

- Livello 1: acquisizione o generazione dei parametri dell'istanza
- Livello 2: modellazione matematica e validazione strutturale di fattibilità
- Livello 3: risoluzione ibrida con decomposizione ADMM
- Livello 4: verifica numerica, aggregazione risultati e confronto fra solver
- Livello 5: analisi statistica, visualizzazione e reporting scientifico

**Note del relatore:**

Presentare il progetto come architettura di ricerca, non come singolo script. La pipeline è importante perché rende il lavoro riproducibile, estendibile e pubblicabile. Sottolineare che i controlli di fattibilità prima e dopo la risoluzione riducono il rischio di conclusioni spurie. Questo è un segnale forte di maturità sperimentale. Transizione: una volta chiarita l'architettura, si può articolare il piano di lavoro in work package.

**Visual suggerito:**

Diagramma a livelli o a blocchi con input, optimization core, validation layer, analytics layer.

**Messaggio chiave:**

L'approccio tecnico è una pipeline di ricerca completa, non un esperimento isolato.

### Slide 12 — Piano di lavoro

**Contenuto slide:**

- WP1: rifinire il modello e introdurre parametri più realistici per costi, energia e capacità
- WP2: costruire benchmark più ampi e scenari di stress con eterogeneità controllata
- WP3: testare varianti del sottoproblema combinatorio e configurazioni QAOA differenti
- WP4: confrontare baseline classiche aggiuntive e misure di robustezza
- WP5: produrre articoli, release del codice e materiali per la disseminazione accademica

**Note del relatore:**

Qui conviene mostrare un piano sequenziale ma non rigido: ogni work package produce output autonomi e utili, così il progetto resta difendibile anche se alcuni risultati non confermano le aspettative iniziali. Enfatizzare che i WP sono disegnati per generare sia conoscenza metodologica sia evidenza empirica. Transizione: il piano di lavoro può essere collocato lungo i tre anni del dottorato.

**Visual suggerito:**

Schema a work package con deliverable associati.

**Messaggio chiave:**

Il progetto è segmentato in attività gestibili, con deliverable che riducono il rischio complessivo.

### Slide 13 — Timeline del PhD

**Contenuto slide:**

- Anno 1: revisione della letteratura, consolidamento del modello, riproduzione e pulizia della pipeline preliminare
- Anno 1: definizione del protocollo sperimentale e delle metriche di valutazione
- Anno 2: ampliamento del benchmark, esperimenti sistematici, confronto con baseline multiple
- Anno 2: prime sottomissioni a workshop o conferenze di settore
- Anno 3: test su backend più realistici, analisi finale, scrittura della tesi e pubblicazioni estese

**Note del relatore:**

La timeline deve apparire credibile e non sovraccarica. È utile specificare che la pipeline preliminare riduce il rischio dell'anno 1, perché esiste già una base software da consolidare. L'anno 2 è il cuore sperimentale; l'anno 3 è dedicato a generalizzazione, validazione finale e scrittura. Transizione: dopo il piano temporale, è naturale esplicitare quali risultati ci si attende.

**Visual suggerito:**

Gantt semplificato per trimestri o semestri.

**Messaggio chiave:**

La scansione temporale è realistica e supportata da un punto di partenza già operativo.

### Slide 14 — Risultati attesi

**Contenuto slide:**

- Una formulazione più realistica e parametrica del problema server-VM
- Un benchmark riproducibile per confronti fair tra pipeline classiche e ibride
- Evidenza quantitativa su correttezza, robustezza, costi temporali e limiti di scalabilità
- Identificazione di classi di istanze favorevoli o sfavorevoli a metodi ibridi
- Un contributo pubblicabile anche in caso di risultati negativi sul piano dello speedup

**Note del relatore:**

Spiegare bene che “risultato atteso” non significa “vantaggio quantistico garantito”. I risultati attesi includono benchmark, criteri, protocolli, mappe di comportamento e condizioni limite. Questa impostazione è molto più forte davanti a una commissione rispetto a una promessa di performance difficilmente sostenibile. Transizione: da qui si passa al contributo scientifico originale del progetto.

**Visual suggerito:**

Matrice con righe sulle metriche e colonne sui possibili esiti: positivo, neutro, negativo ma informativo.

**Messaggio chiave:**

Il progetto è scientificamente valido perché produce conoscenza anche se il quantum non supera il classico in tempo di esecuzione.

### Slide 15 — Contributo scientifico originale

**Contenuto slide:**

- Integrazione rigorosa tra modellazione applicativa server-VM e ottimizzazione ibrida classico-quantistica
- Protocollo sperimentale fair basato sulla stessa formulazione e sulla stessa decomposizione ADMM
- Gestione esplicita della fattibilità numerica come parte del contributo metodologico
- Benchmark riproducibile con pipeline completa: solving, merge, analisi, visualizzazione, reporting
- Produzione di evidenza utile a delimitare realisticamente il perimetro di applicabilità di QAOA

**Note del relatore:**

Questa è una delle slide da enfatizzare maggiormente. Distinguere chiaramente ciò che appartiene al background da ciò che costituisce contributo personale. Il contributo non è “aver usato Qiskit”, ma aver costruito un quadro sperimentale rigoroso per un problema misto, con attenzione a fairness, fattibilità e interpretazione dei risultati. Transizione: subito dopo è importante mostrare consapevolezza dei limiti.

**Visual suggerito:**

Tabella “stato attuale della letteratura” vs “contributo della ricerca” con tre o quattro righe nette.

**Messaggio chiave:**

L'originalità risiede nella metodologia sperimentale e nella qualità del confronto, non in un claim di superiorità a priori.

### Slide 16 — Limiti e rischi del progetto

**Contenuto slide:**

- Le evidenze preliminari usano istanze piccole e quantum simulato, non hardware reale
- Il vincolo `require_all_on = True` riduce la componente decisionale discreta nelle prime prove
- La simulazione QAOA può diventare rapidamente costosa al crescere della scala
- Potrebbe non emergere alcun vantaggio prestazionale quantistico nel perimetro studiato
- L'accesso a dataset reali e backend hardware può limitare l'estensione sperimentale
- Mitigazione: benchmark progressivi, baseline multiple, risultati negativi formalizzati come contributo

**Note del relatore:**

Questa slide va gestita con trasparenza, non con difensivismo. Una buona commissione apprezza la capacità di delimitare i rischi e di mostrare strategie di mitigazione. Il rischio principale non è “fallire”, ma produrre risultati poco interpretabili; per questo il progetto investe molto in protocolli e validazione. Transizione: riconosciuti i limiti, si può mostrare l'impatto potenziale della ricerca.

**Visual suggerito:**

Tabella rischio-mitigazione con tre colonne: rischio, impatto, contromisura.

**Messaggio chiave:**

Il progetto è ambizioso ma governato, perché i principali rischi sono già identificati e gestiti metodologicamente.

### Slide 17 — Impatto accademico, industriale o sociale

**Contenuto slide:**

- Impatto accademico: benchmark e protocollo replicabile per studi futuri su hybrid quantum optimization
- Impatto metodologico: chiarimento su quando i risultati negativi sono scientificamente informativi
- Impatto industriale: supporto a decisioni di allocazione più interpretabili e misurabili in ambienti cloud
- Impatto energetico/sociale: potenziale contributo a efficienza, sostenibilità e riduzione dei costi operativi
- Impatto formativo: ponte tra ottimizzazione operativa, quantum computing e ingegneria del software sperimentale

**Note del relatore:**

Mostrare che l'impatto non dipende esclusivamente dall'adozione industriale immediata del quantum. Anche la definizione di benchmark rigorosi e di protocolli di confronto è un risultato con valore scientifico elevato. Se possibile, collegare il tema alla sostenibilità energetica dei sistemi digitali, che è molto ben percepita dalle commissioni multidisciplinari. Transizione: dopo l'impatto, si può chiudere la narrativa scientifica.

**Visual suggerito:**

Infografica a tre blocchi: accademia, industria, sostenibilità.

**Messaggio chiave:**

Il progetto ha valore anche oltre il singolo caso di studio, perché produce metodo, strumenti e criteri di valutazione.

### Slide 18 — Conclusioni

**Contenuto slide:**

- Il progetto affronta un problema applicativo rilevante con una metodologia rigorosa e verificabile
- Esiste già una base preliminare che dimostra correttezza e fattibilità della pipeline
- Il PhD estenderà scala, realismo e profondità comparativa del benchmark
- Il contributo atteso è soprattutto metodologico, con potenziale estensione applicativa
- La ricerca è solida anche senza assumere un vantaggio quantistico come esito obbligato

**Note del relatore:**

La chiusura deve riportare la commissione su tre parole: rilevanza, originalità, fattibilità. Conviene ribadire che il progetto è costruito in modo scientificamente serio proprio perché non dipende da una promessa non controllabile. Il valore è nella capacità di produrre conoscenza robusta. Transizione: aprire quindi alla discussione.

**Visual suggerito:**

Slide molto pulita con tre parole chiave in evidenza: rilevanza, rigore, fattibilità.

**Messaggio chiave:**

La proposta è convincente perché unisce problema reale, metodo rigoroso e piano di ricerca realistico.

### Slide 19 — Domande

**Contenuto slide:**

- Grazie per l'attenzione
- Domande e discussione
- Contatti del candidato

**Note del relatore:**

Chiudere con una formula breve e professionale. Se il contesto è molto formale, è utile aggiungere una riga finale come: “Sarò lieto di approfondire sia gli aspetti metodologici sia le implicazioni applicative del progetto”. Questa formulazione orienta la commissione verso una discussione di merito. 

**Visual suggerito:**

Background essenziale con una figura stilizzata del workflow o del data center.

**Messaggio chiave:**

La discussione è aperta sia sul valore teorico sia sulla fattibilità operativa del progetto.

### Slide 20 — Bibliografia essenziale

**Contenuto slide:**

- Algoritmi quantistici variazionali e QAOA: filone Farhi e sviluppi successivi su VQA e performance landscape
- QUBO/Ising formulations: filone Lucas; Glover, Kochenberger e Du per modellazione combinatoria
- ADMM e decomposizione: filone Boyd e collaboratori su optimization by splitting and statistical learning
- Hybrid quantum optimization: review recenti su metodi ibridi, benchmarking e limiti sperimentali
- Cloud/resource allocation: survey e lavori su energy-aware VM placement e data center optimization
- Documentazione tecnica: Qiskit Optimization, DOcplex, eventuali benchmark pubblici di workload cloud

**Note del relatore:**

Specificare che questa è una bibliografia essenziale orientativa, da trasformare nella versione finale in riferimenti completi con DOI, venue e anno. Se la commissione chiede maggiore precisione, indicare che i pilastri teorici della proposta sono: QAOA, formulazioni QUBO, ADMM e cloud resource allocation. È importante non sovraccaricare questa slide con troppo testo. 

**Visual suggerito:**

Lista bibliografica minimale in due colonne oppure mappa dei filoni con autori chiave.

**Messaggio chiave:**

La bibliografia deve dimostrare padronanza dei filoni rilevanti e offrire una base solida per l'inquadramento teorico.

## 3. Script orale per una presentazione di 20 minuti

Di seguito uno script sintetico ma già pronto per essere pronunciato, calibrato su una durata di circa 20 minuti.

### Apertura

“Buongiorno, oggi presento una proposta di ricerca PhD dedicata all'ottimizzazione ibrida classico-quantistica per il workload placement di macchine virtuali su server fisici. Il progetto si colloca all'intersezione fra quantum computing, ottimizzazione combinatoria e gestione efficiente delle infrastrutture cloud. L'obiettivo non è formulare promesse generiche sul quantum advantage, ma costruire un protocollo sperimentale rigoroso per capire se, quando e in che misura un approccio ibrido possa essere utile su un problema applicativo realistico.”

### Motivazione

“Il placement di VM è un problema di forte rilevanza pratica. In un data center ogni decisione di allocazione impatta costi, consumo energetico, utilizzo delle risorse e qualità del servizio. Dal punto di vista computazionale, si tratta spesso di problemi misti, dove coesistono variabili binarie, variabili continue e vincoli accoppiati. Questo rende il dominio particolarmente interessante per testare tecniche ibride che combinano ottimizzazione classica e quantistica.”

### Problema di ricerca

“La domanda centrale del progetto è duplice. Da un lato, come modellare in modo rigoroso il problema di allocazione server-VM mantenendo un legame con il dominio applicativo. Dall'altro, come confrontare correttamente una pipeline classica e una pipeline quantistica simulata sulla stessa formulazione, evitando confronti distorti o metriche poco significative.”

### Gap nella letteratura

“La letteratura esistente è ricca ma frammentata. I lavori sul cloud scheduling e quelli su QAOA e quantum optimization spesso procedono in parallelo. Inoltre, molti benchmark quantistici utilizzano QUBO sintetici, mentre sono meno frequenti studi su problemi applicativi misti con forte struttura vincolata. Un ulteriore punto critico riguarda la fattibilità numerica: nei workflow ibridi questo aspetto è spesso trattato in modo marginale, pur essendo decisivo per interpretare correttamente i risultati.”

### Domande e ipotesi

“Da qui derivano alcune domande di ricerca precise: quale formulazione è più adatta a bilanciare realismo e trattabilità? In quali condizioni una decomposizione ADMM con sottoproblema QUBO è efficace? Come variano correttezza, robustezza e tempi al variare della struttura delle istanze? Le ipotesi di lavoro sono prudenti ma verificabili: mi aspetto che una pipeline ibrida possa essere corretta e metodologicamente utile, che la gestione esplicita della fattibilità numerica migliori l'affidabilità sperimentale e che l'eventuale vantaggio quantistico dipenda soprattutto dalla struttura del problema, non soltanto dalla sua dimensione.”

### Obiettivi

“L'obiettivo generale è sviluppare un framework sperimentale riproducibile per valutare metodi ibridi classico-quantistici nel placement server-VM. Gli obiettivi specifici includono il raffinamento del modello matematico, l'estensione del benchmark, il confronto con baseline multiple e la produzione di risultati pubblicabili, accompagnati da codice e materiali di analisi.”

### Stato dell'arte

“Il progetto integra quattro filoni principali: resource allocation nei data center, formulazioni QUBO e Ising, algoritmi variazionali come QAOA e metodi ibridi con decomposizione ADMM. Il contributo della ricerca nasce precisamente dalla convergenza di questi filoni in un quadro sperimentale unico e coerente.”

### Metodologia

“La metodologia proposta parte dalla modellazione del problema in DOcplex, con successiva conversione in `QuadraticProgram` di Qiskit. Il problema viene poi trattato mediante una decomposizione ADMM che separa il sottoproblema discreto dalla parte continua. La baseline classica utilizza `NumPyMinimumEigensolver` e COBYLA, mentre la pipeline ibrida sostituisce il risolutore del sottoproblema combinatorio con QAOA. Un elemento metodologico centrale è la correzione della fattibilità numerica attraverso una procedura dedicata, necessaria per evitare che soluzioni quasi ammissibili vengano erroneamente classificate come infeasible.”

### Evidenze preliminari

“Il progetto dispone già di un caso di studio preliminare implementato e testato. Su 36 istanze sintetiche, entrambe le pipeline hanno restituito soluzioni di stato `SUCCESS`, con valore obiettivo identico. Dal punto di vista temporale, tuttavia, il solver classico è sempre risultato più rapido rispetto alla pipeline quantistica simulata. Questo risultato non indebolisce il progetto; al contrario, ne rafforza la credibilità, perché mostra che la ricerca parte da un'osservazione empirica onesta e non da una tesi preconfezionata.”

### Estensione sperimentale

“Il PhD servirà ad ampliare questo perimetro preliminare. Le estensioni previste includono istanze eterogenee, costi non uniformi, rimozione di ipotesi semplificative come l'attivazione obbligatoria di tutti i server, introduzione di metriche energetiche e confronto con baseline classiche aggiuntive. In parallelo, saranno valutati backend più realistici e configurazioni QAOA differenti.”

### Architettura e piano di lavoro

“Dal punto di vista tecnico, il progetto è organizzato come pipeline completa: generazione o acquisizione dell'istanza, validazione di fattibilità, solving ibrido, verifica numerica, aggregazione dei risultati e analisi statistica. Il piano di lavoro è articolato in work package: raffinamento del modello, costruzione del benchmark, sperimentazione metodologica e disseminazione. Questa struttura riduce il rischio e garantisce deliverable progressivi.”

### Timeline

“Nel primo anno prevedo revisione sistematica della letteratura, consolidamento della pipeline esistente e definizione delle metriche. Il secondo anno sarà dedicato alla campagna sperimentale principale e ai primi articoli. Il terzo anno riguarderà validazione finale, test su backend più realistici, sintesi dei risultati e scrittura della tesi.”

### Risultati attesi e contributo originale

“I risultati attesi non si limitano a una misura di speedup. Mi aspetto di produrre una formulazione più realistica del problema, un benchmark riproducibile, un protocollo fair per il confronto classico/ibrido e un'analisi delle condizioni in cui i metodi quantistici simulati sono promettenti o invece poco competitivi. Il contributo originale del progetto risiede proprio in questa integrazione tra modellazione applicativa, rigore sperimentale e trattamento esplicito della fattibilità numerica.”

### Limiti, rischi e impatto

“Il progetto presenta limiti chiari: scala ancora ridotta, uso attuale di simulatori, possibile assenza di vantaggio quantistico e disponibilità non garantita di dati reali o hardware. Tuttavia questi rischi sono mitigati da un disegno sperimentale che attribuisce valore anche ai risultati negativi, purché ben controllati. L'impatto atteso è accademico, perché offre benchmark e metodo, ma anche potenzialmente industriale e sociale, in termini di efficienza e sostenibilità dei sistemi cloud.”

### Chiusura

“In conclusione, la proposta unisce un problema applicativo rilevante, una metodologia rigorosa e un piano di ricerca realistico. Il progetto è forte non perché prometta un vantaggio quantistico a priori, ma perché costruisce le condizioni per verificarlo, delimitarlo o eventualmente smentirlo in modo scientificamente utile. Grazie per l'attenzione, sarò lieto di discutere sia gli aspetti metodologici sia le implicazioni applicative del lavoro.”

## 4. Possibili domande della commissione con risposte suggerite

### 1. Perché questo progetto è da PhD e non solo da tesi magistrale avanzata?

**Risposta suggerita:**

Perché non si limita a implementare un algoritmo, ma costruisce un quadro di ricerca completo: formulazione del problema, benchmark, protocollo sperimentale, confronto tra paradigmi, analisi di robustezza e interpretazione metodologica dei risultati. La dimensione di ricerca sta nella generalizzazione, nella validazione comparativa e nella produzione di conoscenza trasferibile oltre il singolo caso di studio.

### 2. Se il solver quantistico simulato è già più lento, dov'è il valore scientifico?

**Risposta suggerita:**

Il valore scientifico non coincide con il speedup. Un risultato negativo, se ottenuto con confronto fair e controlli rigorosi, è informativo perché delimita il perimetro di applicabilità dei metodi ibridi. Inoltre il progetto contribuisce con benchmark, protocolli e trattamento della fattibilità numerica, che sono risultati utili indipendentemente dalla performance temporale.

### 3. Perché usare ADMM in questo contesto?

**Risposta suggerita:**

Perché il problema ha natura mista, con parte discreta e parte continua. ADMM consente una decomposizione strutturalmente coerente, che rende possibile isolare il sottoproblema combinatorio e confrontare in modo controllato diverse strategie di soluzione mantenendo invariata la parte continua.

### 4. In che senso la gestione della fattibilità numerica è un contributo originale?

**Risposta suggerita:**

Nei workflow ibridi, piccole violazioni numeriche possono portare a classificazioni errate di infeasibility. Introdurre una procedura esplicita di correzione e verifica consente di separare l'errore numerico dalla qualità reale della soluzione. Questo migliora affidabilità, riproducibilità e correttezza interpretativa del benchmark.

### 5. Il problema modellato è abbastanza realistico?

**Risposta suggerita:**

Nella forma preliminare è un caso di studio controllato, utile per costruire e validare la pipeline. Il PhD estende il modello introducendo costi eterogenei, scenari senza attivazione obbligatoria dei server, dati più realistici e metriche energetiche o SLA. Quindi il realismo è un asse di sviluppo esplicito del progetto, non un presupposto già esaurito.

### 6. Perché usare QAOA e non altri approcci quantistici o quantum-inspired?

**Risposta suggerita:**

QAOA è un punto di partenza naturale perché è uno degli algoritmi variazionali più studiati per problemi combinatori e si integra bene con la formulazione QUBO. Tuttavia il progetto non è dogmaticamente legato a QAOA: una possibile estensione è il confronto con varianti warm-start, heuristiche quantum-inspired o altri solver ibridi.

### 7. Come garantirete la riproducibilità?

**Risposta suggerita:**

Attraverso versionamento del codice, configurazioni sperimentali esplicite, pipeline automatizzate di esecuzione batch, salvataggio dei risultati grezzi, merge strutturato, metriche standardizzate e reportistica ripetibile. La riproducibilità è trattata come deliverable centrale del progetto.

### 8. Quali metriche userete oltre al tempo di esecuzione?

**Risposta suggerita:**

Valore obiettivo, stato di fattibilità, distanza tra soluzioni, residuali ADMM, robustezza rispetto ai parametri, scalabilità, stabilità numerica e, dove possibile, metriche applicative come costo energetico, utilizzo delle risorse o violazioni di SLA.

### 9. Come affronterete il rischio di non avere accesso a hardware quantistico?

**Risposta suggerita:**

Il progetto resta valido anche in ambiente simulato, purché il focus rimanga sul benchmarking e sulla metodologia. In parallelo, prevedo di usare backend accessibili tramite ecosistemi accademici o cloud provider, ma l'assenza di hardware non compromette il nucleo scientifico della ricerca.

### 10. In che modo i risultati possono interessare l'industria?

**Risposta suggerita:**

Anche senza adozione immediata di solver quantistici, l'industria beneficia di modelli più chiari, benchmark più rigorosi e analisi comparative su costi, efficienza e robustezza. Il progetto può quindi produrre impatto industriale soprattutto come strumento di valutazione e decision support.

### 11. Quale sarebbe l'esito minimo di successo del PhD?

**Risposta suggerita:**

L'esito minimo di successo è la produzione di un benchmark riproducibile, di una formulazione ben motivata del problema e di un protocollo comparativo che chiarisca limiti e potenzialità delle pipeline ibride. L'esito massimo include anche l'identificazione di classi di istanze in cui l'approccio ibrido mostri vantaggi qualitativi o quantitativi.

### 12. Quale pubblicazione potrebbe nascere da questo progetto?

**Risposta suggerita:**

Una prima pubblicazione potrebbe essere metodologica, focalizzata sulla pipeline, sulla formulazione del problema e sulla gestione della fattibilità numerica. Una seconda potrebbe essere empirica, centrata sul benchmark esteso e sull'analisi comparativa fra solver classici e ibridi in scenari più realistici.

## 5. Miglioramenti per rendere la presentazione più convincente

1. Inserire nella versione finale il nome esatto del corso di dottorato, del supervisore e dell'istituzione per aumentare il livello di concretezza.
2. Aggiungere una slide opzionale iniziale con una figura molto intuitiva del problema server-VM, utile se in commissione sono presenti membri non specialisti di quantum computing.
3. Trasformare la slide sul gap nella letteratura in una tabella “cosa esiste / cosa manca / cosa propone il progetto”, perché è una struttura molto efficace in sede di valutazione.
4. Mostrare una mini-tabella con i risultati preliminari già ottenuti, perché la presenza di evidenza empirica rende il progetto molto più credibile.
5. Preparare una versione breve da 10 minuti con 10-12 slide, nel caso la commissione riduca i tempi.
6. Rendere esplicita la strategia di pubblicazione: workshop nel secondo anno, conferenza o journal nel terzo anno.
7. Se possibile, collegare il progetto a una metrica di sostenibilità energetica o carbon footprint, perché amplia l'impatto percepito.
8. Inserire nella bibliografia finale riferimenti completi e verificati con DOI o venue, evitando qualsiasi citazione approssimativa.
9. Preparare una slide di backup non mostrata durante il talk con dettagli matematici della formulazione e della procedura di fattibilità, utile in discussione.
10. Allenare la chiusura finale in modo molto netto: problema rilevante, gap chiaro, metodo rigoroso, contributo originale, fattibilità dimostrata.

## Nota finale

Se vuoi, questo testo può essere convertito nel passo successivo in uno dei seguenti formati:

- scaletta ridotta da 10 minuti
- versione più tecnica per commissione di area quantum/informatica teorica
- file `.pptx` o `.md` ottimizzato per slide automatiche
- speaker notes più brevi, una per slide, da leggere durante l'esposizione