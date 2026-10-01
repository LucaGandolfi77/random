# 📚 Books — Kit di scrittura

Template in Markdown per pianificare, scrivere e pubblicare un libro.

## Contenuto

| File | A cosa serve |
|------|--------------|
| [`template-bibbia-libro.md`](template-bibbia-libro.md) | Fase 1 — Pianificazione: premessa, personaggi, mondo, struttura della trama |
| [`template-libro.md`](template-libro.md) | Fase 2 — Bozza: scheletro completo del libro (parti, capitoli, front/back matter) |
| [`template-capitolo.md`](template-capitolo.md) | Fase 2 — Bozza: template per scrivere un singolo capitolo |
| [`template-checklist-pubblicazione.md`](template-checklist-pubblicazione.md) | Fase 3 — Revisione e pubblicazione: revisione, editing, formattazione, pubblicazione |
| [`proposte-temi-sociali.md`](proposte-temi-sociali.md) | 26 pitch su temi sociali nel stile della raccolta (6 pazzissime) |
| [`proposte-consumismo-capitalismo-tecnologia.md`](proposte-consumismo-capitalismo-tecnologia.md) | 20 pitch che esaltano consumismo, capitalismo e tecnologia (superficie critica, fondo esaltante) |
| [`proposta-la-prima-linea.md`](proposta-la-prima-linea.md) | pitch completo (idea + 12 variazioni): un uomo, la fonderia, il rugby, il Daghestan e i libri |

## In lavorazione (pianificazione)

| Libro | Lingua | Stato |
|-------|--------|-------|
| [`la-prima-linea/`](la-prima-linea/) | EN | Fase 2 🟨 — bozza in inglese (9/14 capitoli, midpoint scritto); bibbia e schede in italiano |

## Libri completati

| Libro | Lingua | Stato |
|-------|--------|-------|
| [`la-vita-minore/`](la-vita-minore/) | IT | prima bozza ✅ + revisione in corso |
| [`mai-pen-rai/`](mai-pen-rai/) | IT | fino a Fase 6 🟨 (testi di pubblicazione pronti) |
| [`lattraversamento/`](lattraversamento/) | IT | fino a Fase 6 🟨 (testi di pubblicazione pronti) |
| [`il-permesso/`](il-permesso/) | IT | revisione strutturale ✅ (fino a Fase 2) |
| [`the-regained-hours/`](the-regained-hours/) | EN | fino a Fase 6 🟨 (primo romanzo in inglese) |

## Traduzioni inglesi

| Libro | Cartella | Manoscritto | Glossario condiviso |
|-------|----------|-------------|---------------------|
| *The Smaller Life* | [`la-vita-minore-en/`](la-vita-minore-en/) | ✅ (~14.900 parole) | le cose che si tengono → the things you keep |
| *Mai pen rai* | [`mai-pen-rai-en/`](mai-pen-rai-en/) | ✅ (~18.400 parole) | mai pen rai, farang, il timbro → the stamp |
| *The Crossing* | [`lattraversamento-en/`](lattraversamento-en/) | ✅ (~15.400 parole) | inshallah, jërëjëf, il foglio piegato → the folded sheet |
| *The Permit* | [`il-permesso-en/`](il-permesso-en/) | ✅ (~10.900 parole) | il cancello → the gate, la conta → the count, lavoro esterno → work release |
| *The C++ Manual* | [`cpp-manual/`](cpp-manual/) | ✅ (~21.000 parole, EN) | manuale tecnico comico: da Hello World alla morte termica, con gag su Python |

> Glossario condiviso della collezione: "le cose piccole" → the small things · "le cose che si tengono" → the things you keep · "le cose che si piantano" → the things you plant · "il cortile interno" → the inner courtyard · "com'è l'abitudine" → as is their habit · "di mattina/di sera" → in the morning/in the evening · il "si" impersonale → il "you" generico. I nomi propri, mai pen rai, farang, inshallah, jërëjëf e i titoli italiani di Leopardi (*L'infinito*, *A Silvia*, *Zibaldone*) restano invariati.

## Come usarlo

1. **Copia i template** in una nuova cartella dedicata al tuo libro, ad esempio:
   ```bash
   mkdir -p books/mio-libro/{capitoli}
   cp books/template-*.md books/mio-libro/
   ```
2. **Compila la bibbia del libro** prima di scrivere: ti eviterà buchi di trama e incoerenze.
3. **Crea un file per capitolo** partendo da `template-capitolo.md` (es. `capitoli/01.md`, `capitoli/02.md`...).
4. **Tieni aggiornato** `template-libro.md` come indice generale dello stato di avanzamento.
5. **In chiusura**, passa in rassegna la checklist di pubblicazione.

## Struttura consigliata di un progetto libro

```
books/mio-libro/
├── bibbia.md              # premessa, personaggi, mondo, timeline
├── libro.md               # indice e stato di avanzamento
├── checklist.md           # revisione e pubblicazione
├── capitoli/
│   ├── 00-prologo.md
│   ├── 01.md
│   ├── 02.md
│   └── ...
└── note/
    └── ricerche.md        # appunti, fonti, riferimenti
```

## Convenzioni di scrittura

- Un file = un capitolo: facile da riordinare, revisionare e convertire.
- Usa i commenti HTML `<!-- ... -->` per note che non devono finire nel libro finale.
- Segna lo stato di ogni capitolo con emoji: ⬜ da scrivere · 🟨 in corso · ✅ completo · 🔁 da rivedere.
- Scrivi ogni giorno, anche poco: la costanza batte l'ispirazione.
