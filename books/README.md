# 📚 Books — Kit di scrittura

Template in Markdown per pianificare, scrivere e pubblicare un libro.

## Contenuto

| File | A cosa serve |
|------|--------------|
| [`template-bibbia-libro.md`](template-bibbia-libro.md) | Fase 1 — Pianificazione: premessa, personaggi, mondo, struttura della trama |
| [`template-libro.md`](template-libro.md) | Fase 2 — Bozza: scheletro completo del libro (parti, capitoli, front/back matter) |
| [`template-capitolo.md`](template-capitolo.md) | Fase 2 — Bozza: template per scrivere un singolo capitolo |
| [`template-checklist-pubblicazione.md`](template-checklist-pubblicazione.md) | Fase 3 — Revisione e pubblicazione: revisione, editing, formattazione, pubblicazione |

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
