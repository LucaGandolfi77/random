# *Il Manuale C++: Da Hello World alla Morte Termica dell'Universo*

**Autore:** [Nome] · **Genere:** manuale tecnico / saggio comico · **Lingua:** italiano · **Data inizio:** 2025-10-01

> Indice e stato di avanzamento. Un capitolo = un file in `capitoli/`.
> I primi capitoli sono catchy; quelli centrali diventano tecnici e precisi; gli ultimi sono fantascienza.
> Traduzione accurata di `cpp-manual/manuale.md` — glossario tecnico condiviso in fondo.

## Stato

- Parole totali: **~21.000** / obiettivo: 18.000
- Capitoli completati: **18 / 18** — **COMPLETO** ✅
- Manoscritto compilato: `manoscritto.md` ✅

---

## Struttura

| Parte | Capitolo | File | Contenuti | Stato |
|-------|----------|------|-----------|-------|
| — | Prologo | `capitoli/00-prologo.md` | Perché esiste questo manuale (e perché lo stai leggendo alle 3 di notte) | ✅ |
| I | 1. Hello, World! (E il tuo primo segfault) | `capitoli/01.md` | catchy: il primo programma, il compilatore, il primo crash | ✅ |
| I | 2. Le variabili: le scatole che mentono | `capitoli/02.md` | catchy: tipi, inizializzazione, le scatole | ✅ |
| I | 3. I puntatori: l'errore da un miliardo di dollari | `capitoli/03.md` | catchy→tecnico: puntatori, la confessione di Tony Hoare | ✅ |
| I | 4. I riferimenti: gli alias che ti salvano | `capitoli/04.md` | catchy→tecnico: riferimenti, passaggio per riferimento | ✅ |
| II | 5. RAII: pulire dopo di sé, automaticamente | `capitoli/05.md` | tecnico: Resource Acquisition Is Initialization | ✅ |
| II | 6. La libreria standard: addio, strlen | `capitoli/06.md` | tecnico: std::string, std::vector, gli algoritmi | ✅ |
| II | 7. I template: il codice che scrive codice | `capitoli/07.md` | tecnico: template, gli errori-romanzo | ✅ |
| II | 8. La move semantics: la grande migrazione | `capitoli/08.md` | tecnico: rvalue, std::move, la regola dei cinque | ✅ |
| II | 9. Gli smart pointer: la morte di delete | `capitoli/09.md` | tecnico: unique_ptr, shared_ptr, weak_ptr | ✅ |
| II | 10. La concorrenza: la verità atomica | `capitoli/10.md` | tecnico: thread, data race, atomic, il memory model | ✅ |
| III | 11. Dal C++11 al C++26: il rinascimento | `capitoli/11.md` | stato dell'arte: cadenza triennale, concepts, ranges | ✅ |
| III | 12. Le librerie: un tour dell'ecosistema | `capitoli/12.md` | stato dell'arte: Boost, Qt, Eigen, OpenCV, le implementazioni STL | ✅ |
| III | 13. Il C++ nel mondo: dai giochi a Marte | `capitoli/13.md` | stato dell'arte: Unreal, Chromium, HFT, sonde spaziali, PyTorch | ✅ |
| III | 14. Le feature di domani: reflection, contracts, senders | `capitoli/14.md` | implementazioni future: C++26 e oltre | ✅ |
| IV | 15. Il C++ tra 100 anni: la morte termica dell'universo | `capitoli/15.md` | fantascienza: template quantistici, compilazione precognitiva | ✅ |
| IV | 16. Il C++ tra 1000 anni: un intermezzo | `capitoli/16.md` | fantascienza: la cadenza trecentennale, l'universo come compile, il museo del punto e virgola | ✅ |
| — | Epilogo | `capitoli/17-epilogo.md` | l'ultima compilazione | ✅ |

## Back matter

- [x] Nota sulle citazioni (tutte reali e attribuite)
- [x] Nota sul codice (C++20/23/26, compilato con -Wall -Wextra)
- [ ] Copertina

---

## Glossario tecnico condiviso

| Termine inglese | Resa italiana | Nota |
|-----------------|---------------|------|
| pointer | puntatore | |
| reference | riferimento | |
| template | template | invariato (convenzione italiana) |
| smart pointer | smart pointer | invariato |
| move semantics | move semantics | invariato; prima occorrenza: "(la semantica di spostamento)" |
| undefined behavior | comportamento indefinito | |
| data race | data race | invariato; prima occorrenza: "(gara sui dati)" |
| garbage collector | garbage collector | invariato |
| lifetime | durata di vita (lifetime) | |
| scope | scope | invariato |
| dangling | dangling | invariato |
| decay | decay | invariato; prima occorrenza: "(decadimento)" |
| work release | lavoro esterno | |
| build, bug, leak, segfault, linker, heap, stack, buffer, thread, mutex, lambda, concept, ranges, coroutine, reflection, contracts, framework, pipeline, lazy, hardware, Heisenbug | invariati | convenzione italiana |
| heat death | morte termica | |
