# 🗣️ QUOTESMITH — Chi ha detto questa frase?

Quiz **100% offline** per il telefono (PWA): ti mostriamo una citazione e tu indovini chi l'ha detta.
4 opzioni, 10 domande a partita, tre difficoltà e 8 categorie, tutto salvato sul dispositivo.

## Categorie
- 🎬 **Film** · 📺 **Serie TV** · 🎨 **Cartoni animati** · 🎵 **Canzoni**
- 📚 **Libri** · 🏛️ **Storia e Personaggi** · 🕹️ **Videogiochi** · 🗣️ **Proverbi e Detti**

Il database è bilingue (**italiano + inglese**, 733 citazioni) e scritto a mano: nessuna API, tutto offline.

## Come si gioca
1. Scegli la **lingua** delle citazioni.
2. Scegli la **categoria**.
3. Scegli la **difficoltà**: 🌱 facile, ⚖️ medio, 🔥 difficile.
4. Rispondi alle **10 domande**: streak 🔥 per le risposte consecutive, punteggio a fine partita (⭐⭐⭐ da 9/10, ⭐⭐ da 7/10, ⭐ da 5/10).
5. Il **record** (punteggio e streak migliore) resta salvato sul telefono.

## Avvio

```bash
python3 -m http.server 8123
# apri http://localhost:8123/index.html
```

Sul telefono puoi installarla come app: su Android con *Aggiungi alla schermata Home*,
su iPhone dal menu di Safari → *Aggiungi a Home*.

## Test

```bash
npm install        # una volta sola (scarica puppeteer-core)
npm test           # 33 test sul motore di gioco (engine + database)
npm run test:smoke # test end-to-end in Chrome headless (serve il server attivo su 8123)
npm run icons      # rigenera le icone PNG da tools/make_icons.py
```

## Struttura
```
quotesmith/
├── index.html         # 3 schermate: setup · gioco · fine (i18n con data-i18n)
├── style.css          # tema dark, mobile-first
├── script.js          # UI: setup, round, streak, punteggio, record, voce 🔊
├── engine.js          # motore puro (window.QuoteSmith / module.exports)
├── data.js            # 733 citazioni (window.QUOTESMITH_DB)
├── sw.js              # service worker (offline + installazione PWA)
├── manifest.webmanifest
├── icons/             # icone SVG + PNG (192/512)
└── tools/
    ├── engine.test.js        # 33 test sul motore
    ├── smoke-quotesmith.js   # test end-to-end in Chrome
    └── make_icons.py         # genera le PNG delle icone
```
