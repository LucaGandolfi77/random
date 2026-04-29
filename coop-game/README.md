# Cedole & Catastrofi

Web app cooperativa in HTML, CSS e JavaScript puro, ora pronta per deploy statico e installazione come PWA.

## Struttura

La root del progetto e' gia' la cartella di pubblicazione.

- `index.html`: entry point
- `style.css`: stile principale
- `js/`: logica divisa per responsabilita'
- `manifest.webmanifest`: manifest PWA
- `sw.js`: service worker
- `icons/`: icone PWA

## Prova Locale

Serve esporla via HTTP o HTTPS, non via `file://`, se vuoi testare installazione e service worker.

```bash
python3 -m http.server 4173
```

Poi apri `http://127.0.0.1:4173/index.html`.

## Deploy Su GitHub Pages

Il workflow e' gia' pronto in `.github/workflows/deploy-pages.yml`.

1. Carica il progetto su un repository GitHub.
2. Usa `main` come branch di default.
3. In GitHub vai su `Settings > Pages`.
4. Come source scegli `GitHub Actions`.
5. Fai push su `main`.

Dopo il deploy la PWA sara' servita in HTTPS e potra' essere installata dal telefono.

## Deploy Su Netlify

La config e' gia' pronta in `netlify.toml`.

1. Crea un nuovo sito su Netlify collegando il repository.
2. Lascia vuoto il build command.
3. Usa publish directory `.` se Netlify la chiede.
4. Pubblica il sito.

## Installazione Sul Telefono

- Android Chrome: usa il pulsante installazione quando disponibile.
- iPhone/iPad Safari: usa `Condividi > Aggiungi alla schermata Home`.

## Nota Importante

La PWA non puo' essere installata correttamente da `file://`. Per questo la build di deploy e il test reale passano da GitHub Pages, Netlify o almeno `localhost`.