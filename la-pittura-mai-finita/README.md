<div align="center">

# 🎨 La Pittura Mai Finita

### Un JRPG a turni dove dipingi il nemico col dito, e ogni pennellata cancella un ricordo tuo.

**5 tele · 28 memorie · 5 finali · un epitaffio che il gioco ti scrive · 100% offline · zero dipendenze**

</div>

---

> Sei **Ada**, allieva di **Aurelio Nardi**, il pittore che ha fermato il **Male**: una marea lenta che ogni anno cancella una cosa — un colore, una voce, un nome.
>
> L'unica arma contro il Male è la pittura. Ma per ricoprire il Male, una tela va **finita**, e per finirla bisogna **dipingere sopra la persona** che c'è dentro.
>
> Il maestro è morto a metà quadro. Ti ha lasciato i pennelli e una parola: *ricopri*.
>
> **Ogni pennellata che metti sopra la figura brucia un ricordo tuo. Quando la tela è finita, non ti ricordi più perché hai dipinto.**

---

## Indice

1. [Requisiti](#1-requisiti)
2. [Avvio](#2-avvio)
3. [Come si gioca](#3-come-si-gioca)
4. [Le quattro mosse](#4-le-quattro-mosse)
5. [I cinque atti](#5-i-cinque-atti)
6. [I finali](#6-i-finali)
7. [L'epitaffio](#7-l-epitaffio)
8. [Il Quaderno](#8-il-quaderno)
9. [Stack tecnologico](#9-stack-tecnologico)
10. [Struttura del progetto](#10-struttura-del-progetto)
11. [Architettura](#11-architettura)
12. [Perché funziona su iPhone](#12-perché-funziona-su-iphone)
13. [Accessibilità](#13-accessibilità)
14. [Privacy](#14-privacy)
15. [Test e qualità](#15-test-e-qualità)
16. [Strumenti di sviluppo](#16-strumenti-di-sviluppo)
17. [Deploy](#17-deploy)
18. [🔮 Le altre proposte](#18-le-altre-proposte)

---

## 1. Requisiti

**Per giocare** l'app è statica, non serve installare nulla:

| Piattaforma | Minimo | Note |
|---|---|---|
| iOS / iPadOS Safari | 15.4 | `Condividi → Aggiungi alla schermata Home` per lo standalone |
| Android Chrome | 90+ | Installazione con prompt automatico |
| Desktop Chrome / Edge / Firefox | 90+ / 115+ | Pensato per il telefono, si gioca anche da tastiera |

> **I service worker richiedono un contesto sicuro**: `https://` oppure `http://localhost`.
> Aprire `index.html` con `file://` **non funziona** e non funzionerà: niente cache, niente SW, niente testi.
> Se apri il file così, la pagina te lo dice e ti dice cosa lanciare.

**Per sviluppare**: qualsiasi Node.js ≥ 20. Nessuna dipendenza, nessun passo di build.

---

## 2. Avvio

```bash
cd la-pittura-mai-finita
node serve.js
```

Poi apri **http://localhost:4173**

```bash
npm start          # stesso di node serve.js
npm run dev        # ascolta su 0.0.0.0: apribile dal telefono sulla stessa rete
PORT=8080 npm start
```

**Per provarlo sul telefono** (il modo giusto, dato che il gioco è un pennello):

```bash
HOST=0.0.0.0 node serve.js
```

Trova il tuo IP con `ip addr` o `ipconfig`, apri `http://<tuo-ip>:4173` dal telefono, e su iOS **Condividi → Aggiungi alla schermata Home**.

---

## 3. Come si gioca

Ogni atto è una sequenza di passi: leggi, dipingi, leggi. Il combattimento è a turni come qualsiasi JRPG, ma **la mossa la esegui col dito sulla tela**.

```
COMBATTIMENTO
├── HUD sopra   · nome del nemico, ansia, inchiostro, % di ritratto scoperto, memorie rimaste
├── TELA al centro · il ritratto incompiuro. Lo copri.
└── MENU in basso · Traccia · Lavora · Inchiostro · Chiedi
```

**Il ritratto è la sua barra di vita.** Non c'è un numero: c'è una figura da ricoprire. Quando è tutta sotto inchiostro, il nemico è finito.

**Il tuo numero è uno solo:** quanti ricordi ti restano. Non hai una barra di vita, non hai una barra di recupero. Quello che perdi è memoria, e la memoria non si recupera facendoEXP.

| Cosa vedi | Cosa significa |
|---|---|
| **ansia** (i pallini rossi) | quanto il nemico sta per chiederti qualcosa |
| **inchiostro** (barra) | la riserva: si riempie **coprendo**, non lo trovi |
| **resta** (percentuale) | quanto ritratto c'è ancora scoperto |
| **memorie** | quante schede ti restano nel Quaderno |
| **inchiestri** in alto | con chi stai dipingendo: Ada, Tecla, Ansi, Brizio |

---

## 4. Le quattro mosse

### `〰` **Traccia** — gratis, sempre disponibile

Traccia col dito sopra il ritratto. Il danno è **l'area del ritratto che copri davvero**: nessuna barra, nessuna casualità, nessun numero nascosto. Il tuo segno è la verità.

> Coprire **il viso** fa 2,2 volte tanto. Il volto è segnato con due trattini: trovalo e guardalo.

### `◗` **Lavora** — 6 inchiostro

Passa il pennello lentamente, con peso. Fa 2,2 volte il danno.

**Il prezzo:** se **alzi il pennello** prima di arrivare in fondo, il colpo si sfilaccia e lasci uno **sgorbio**: la tela si beve il 45% del danno e ricomincia a vedersi. La pazienza premia, l'impazienza si paga.

### `●` **Inchiostro** — 18 inchiostro, brucia 2 ricordi

Il colpo più forte del gioco (4 volte), e **azzera l'ansia** del nemico.

Ma non è gratis: devi **scegliere due schede del Quaderno** da mandare a fuoco. Non puoi farlo a caso — il gioco ti lascia il tempo di pensarci, e te le mostra tutte.

> Bruciare una scheda non la cancella per sempre: la vedi ancora nella schermata finale, fra i bordi scottati. Ma non puoi più usarla.

### `❝` **Chiedi** — gratis, ma serve una memoria

Non dipingi: **parli**.

Se ricordi ancora **come si parla con la gente** (cioè se possiedi una scheda con la chiave «parla»), il nemico ti ascolta, si distrae, e ti restituisce **un ricordo**. È la mossa lenta: non copri niente, ma non perdi niente.

Se non ricordi più come si fa, parli a vuoto: lui ti risponde e ti costa un ricordo uguale.

### La parata: **non è una mossa, è un momento**

Ogni tanto il nemico attacca. Si disegna una **riga rossa** sulla tela, e hai ~700 ms per **tracciarla col dito**.

- **Riuscita** → prendi zero danno **e recuperi un ricordo**
- **Fallita** → prendi il colpo **e perdi un ricordo**

Non è uno scermo: è l'unico modo di riavere indietro quello che hai appena perso. Il fallimento ha quattro nomi diversi — *troppo tardi*, *fuori dal segno*, *troppo tremolante*, *troppo corto* — perché «hai sbagliato» e «sei arrivato tardi» sono rimproveri diversi.

**Nota:** se la parata fallisce, **dipingi lo stesso**. Non è un turno perso.

---

## 5. I cinque atti

| # | Atto | La tela | Il nemico | Cosa impara |
|---|---|---|---|---|
| **0** | Il peso della carta | — | *La Tela Bianca* | Impari a sporcarti |
| **I** | Il ritratto della fidanzata | *Ritratto di ignoto* | **Il Commiato** — un gentiluomo che si scusa mentre ti cancella | Traccia e parata |
| **II** | Il ritratto del figlio | *Ritratto di ignota* | **L'Attesa** — una madre che aspetta da undici anni | Scegliere **chi** bruciare |
| **III** | Il ritratto del maestro | *Il maestro* | **Il Male in Figura** — la marea con un volto | Lavora, ansia |
| **IV** | Il ritratto di Tecla | *Tecla* | **Tecla** — si sta dipingendo per morire al tuo posto | Devi coprire **la persona che ami** |
| **V** | Il Male | *La cornice* | **Il Male** — una tela vuota in attesa | Non lo sconfiggi: **lo finisci** |

Alla fine di ogni atto ci sono due faccine:

- **✧ Ascolta** — rileggi un ricordo che possiedi. Non dà vantaggi. Dà quello che ti spetta.
- **✚ Rammenda** — riprendi un ricordo bruciato. **Paghi con il più fresco**: è l'unico scambio onesto del gioco, e non è mai vantaggioso. Una volta per atto.

---

## 6. I finali

Il finale dipende da **quanti ricordi ti restano**, e da una cosa sola: se te la sei giocata bene.

| Finale | Condizione | Cosa succede |
|---|---|---|
| **La Voce** | 13+ ricordi | Ricordi ancora tutto, **incluso il suono di lei**. Finale aperto, triste, caldo. |
| **Lo Studio del Cielo** ⭐ | 4 schizzi + 8+ ricordi | Il **finale vero**. Non rifinisc il volto: dipini il **cielo** della finestra che il maestro non finì mai. |
| **Il Calore** | 5–12 ricordi | Non ricordi le parole, ricordi il **calore** e la **direzione** in cui il peso poggia. |
| **Il Cielo** | 1–4 ricordi | Non ricordi un nome. Ma il cielo è bellissimo. Vivere senza la storia è possibile. |
| **La Cenere** | 0 ricordi | Il Male ha vinto. **È un finale valido, non una sconfitta.** |

> Il finale vero non si sblocca con un punteggio: si sblocca con **i quattro schizzi di cielo** del maestro, sparsi in tutto il gioco. E sotto gli otto ricordi, un cielo non lo riconosci: la carta resta carta.

---

## 7. L'epitaffio

Alla fine, il gioco **compone il tuo epitaffio** con una piccola grammatica che incrocia che cosa hai scelto di tenere e che cosa hai scelto di bruciare:

> *Qui riposa Ada Sartori, che ha finito il quadro e si è ricordata di tutto.*
>
> *Tolse dal mondo: la voce di Tecla quando dice «sta' zitta», il modo in cui Ansi tiene il pennello.*
>
> *Tenne: il profumo di trementina di Tecla, la risata di sua madre, che finiva prima.*
>
> *Non dipingeva per gli altri. Dipingeva perché il cielo era a metà.*

Replay = un epitaffio diverso. È la stessa partita, ed è un'altra persona.

---

## 8. Il Quaderno

Le 28 schede sono **ricordi concreti**, non potenze da migliorare:

- *La mano della madre sulla tela* → *Aveva le mani sempre fredde e non le nascondeva mai. Diceva: la stoffa sente. Tu non ci hai mai creduto. Adesso la stoffa è lei.*
- *Il gomito di Tecla sul tuo braccio* → *Lo appoggiava lì senza chiedere, tutto il peso. Tu non ti spostavi. Ora ti sposti.*

Ogni scheda porta con sé **due righe di poesia** e, a volte, una capacità. Il Quaderno si filtra per persona, e mostra anche i **bordi scottati** di quello che hai bruciato: non sparisce, resta.

---

## 9. Stack tecnologico

Nessuno. È il punto.

| Cosa | Come |
|---|---|
| Linguaggio | JavaScript ES2020 puro, nessun framework |
| Grafica | **Canvas 2D** — la meccanica *è* il disegno |
| Audio | **Web Audio** sintetizzato: nessun file, nessuna licenza |
| Asset | **Zero binari.** Icone e screenshot generati da `tools/gen-icons.mjs` |
| Testi | `data/story.json` — il gioco è anche un quaderno |
| Persistenza | `localStorage` con deep-merge e migrazioni |
| Offline | Service worker, app shell precachata |
| Test | `node:test` + un DOM scritto a mano (~330 righe, al posto di jsdom) |
| Dipendenze | **0** runtime, **0** dev |

---

## 10. Struttura del progetto

```
la-pittura-mai-finita/
├── index.html            # una sola pagina, sei viste
├── offline.html          # cosa dire quando la rete manca
├── manifest.webmanifest  # installabile, portrait, it
├── sw.js                 # app shell, strategia onesta
├── serve.js              # server statico, zero dipendenze
├── package.json
│
├── css/style.css         # mobile-first, niente hover, niente :active
│
├── data/story.json       # 6 atti, 28 schede, 15 scelte, 5 finali
│
├── js/
│   ├── save.js           # persistenza, deep-merge, migrazioni
│   ├── memoria.js        # IL QUADERNO — economia dei ricordi
│   ├── epitaffio.js      # la grammatica che scrive il tuo epitaffio
│   ├── audio.js          # suono sintetizzato
│   ├── tela.js           # il motore di pittura (geometria + Canvas)
│   ├── combat.js         # la macchina a turni
│   ├── nemici.js         # chi sta sulla tela
│   ├── scena.js          # formattazione testi, scelte, rammendo
│   ├── app.js            # l'orchestra
│   └── pwa.js            # installazione, aggiornamenti, iOS
│
├── test/
│   ├── harness.mjs       # DOM finto, carica i veri js/
│   ├── memoria.test.mjs
│   ├── tela.test.mjs
│   ├── combat.test.mjs
│   ├── epitaffio.test.mjs
│   ├── scena.test.mjs
│   ├── flusso.test.mjs
│   └── pwa.test.mjs
│
├── tools/
│   ├── check.mjs         # gate unico di qualità
│   ├── gen-icons.mjs     # PNG veri, encoder scritto a mano
│   └── contrast.mjs      # WCAG AA sulle coppie che vedi davvero
│
└── icons/                # generati, mai scritti a mano
```

---

## 11. Architettura

### La regola che tiene insieme tutto

> **Il giocatore non ha una barra di vita. L'unica cosa che perde sono i ricordi.**

Da lì discende tutto:

```
parata riuscita  →  -0 ricordi,  +1 ricordo recuperato, e dipingi lo stesso
parata fallita  →  -1 ricordo,   e dipingi lo stesso
chiedi (con «parla»)  →  -0, +1 ricordo, ma NON dipingi
chiedi (senza «parla») →  -1 ricordo, e non dipingi
mossa non parabile →  -1 ricordo, e non puoi dipingere
domanda senza risposta → -1 ricordo + un turno perso
esaurimento ricordi →  la partita finisce, e finisci male
```

### L'inchiostro è la copertura, non una barra a parte

Non esiste una riserva separata. L'inchiostro è **funzione di quanta superficie hai già ricoperto**: il pigmento che hai tolto al nemico è il tuo. Lo vedi sulla tela, non in un HUD. Non esiste il caso in cui bar e immagine possano contraddirsi.

### La geometria è separata dal disegno

`tela.js` ha due metà che non si toccano:

- **`maschera()` e `copre()`** sono funzioni pure su una `Uint8Array`. Nessun DOM, deterministiche, testate senza browser. Il danno è l'intersezione fra il tuo segno e la maschera del ritratto — se qui sbaglia di un fattore due, tutto il gioco è sbagliato, e nessuno se ne accorge giocando.
- **Il Canvas** disegna, ma solo quando serve. Lo sbozzo si ridipinge quando cambia qualcosa; i tuoi tratti si disegnano una volta sola quando terminano. Ridisegnare tutto ogni frame è la via più rapida per far scaldare la batteria di un telefono.

### Il testo è un linguaggio chiuso

In `story.json` si scrive `{a}` `{b}` `{c}` `{d}` per le voci e `{/}` per chiudere, `>` all'inizio di riga per un verso. `colora()` è l'unico punto in cui si genera markup, e produce solo quattro `<span>` con nome di classe fisso. Tutto il resto viene scappato **prima** di entrare: nessuna graffa, nessuna parentesi angolare e nessun `&` del contenuto può finire dentro un tag.

### Le perdite non si riprendono, ma si dichiarano

`Memoria.brucia()` non cancella: mette in `bruciate`, in ordine. Così l'epitaffio può nominarle, il Quaderno può mostrarle come bordi scottati, e la parata può restituirti **l'ultima che hai scelto di perdere** — che è un riscatto denso, non un bonus.

---

## 12. Perché funziona su iPhone

Le trappole di un gioco a parry su iOS sono specifiche e insidiose. Queste sono quelle che ho incontrato e risolto:

| Problema | Cosa è successo | Cosa facciamo |
|---|---|---|
| **iOS non ha `Vibration API`** | il feedback del parry non può essere aptico | **solo visivo e audio**: flash + splash d'inchiostro + suono secco. E l'errore è il pennello che sbava fuori dal contorno: *vedi* la colpa |
| **`pointermove` arriva a 3-5 eventi/sec su un drag veloce** | le pennellate diventano polilinee a zig-zag | **`getCoalescedEvents()`**: si legge ogni punto campionato dal browser, non solo quelli consegnati |
| **`100vh` sbaglia con la barra di Safari** | il layout salta quando compare la barra | `100dvh` e `env(safe-area-inset-*)` ovunque |
| **iOS non ha doppio-tap-to-zoom** con gesture | ilPennello si rompe | `touch-action: none` sulla tela, `touchstart` con `preventDefault` |
| **Safari chiude i tab in background** | perdi la partita | `visibilitychange` → salva e sospende il `rAF`; `navigator.storage.persist()` chiesto in primo piano |
| **Chrome ha `beforeinstallprompt`, Safari no** | su iPhone non puoi chiedere di installare | il pulsante dice **esattamente cosa fare**: *Condividi → Aggiungi alla schermata Home* |
| **120 Hz ProMotion** | finestre di timing strette sono ingiocabili | finestra **700 ms**, verificata con `performance.now()` |
| **i tasti grandi scivolano col pollice** | il menu è irraggiungibile in basso | menu in basso (pollice), barra sopra (indice), e l'opzione **«Colpo mano»** che specchia il layout per chi gioca col pollice sinistro |

In più: **nessun `hover`, nessun `:active`, nessun tasto sotto i 44px**, `apple-touch-icon-180`, `viewport-fit=cover`, `apple-mobile-web-app-capable`, audio sbloccato al primo tocco, DPR limitato a 2.

---

## 13. Accessibilità

- **Nessun color-only**: ogni comando disabilitato dice **perché** nel `title`, e il testo del pulsante resta.
- **Contrasto verificato**, non sperato: `tools/contrast.mjs` controlla le 37 coppie di colori che compaiono davvero sullo schermo, e i colori citati devono esistere nel CSS (altrimenti il controllo sta guardando il passato).
- **Lettura ad alta voce** opzionale, con voce italiana.
- **Movimento ridotto** disattivabile, e rispettato automaticamente con `prefers-reduced-motion`.
- **Focus visibile** su tutto, `:focus-visible` con outline.
- **Nessun colore solo per capire lo stato**: la barra dell'inchiostro ha un numero accanto, il nemico ha una percentuale.
- **Il Quaderno è navigabile da tastiera** ed è una lista di schede reali, non un'immagine.
- **La lettura dei testi è scelta, non imposta**: si può saltare con un tocco.

---

## 14. Privacy

- **Nessun account, nessun server, nessuna rete dopo il primo avvio.**
- Tutto il save sta in `localStorage`, sul dispositivo.
- **Zero richieste esterne**: nessun CDN, nessun font remoto, nessuna telemetria. È controllato da `test/pwa.test.mjs`.
- L'unica cosa che chiede il permesso è la **persistenza** dei dati locali (`navigator.storage.persist()`), per evitare che il browser li sfratti dopo settimane.

---

## 15. Test e qualità

```bash
npm test           # 161 test
npm run check      # gate unico: sintassi, risorse, testi, nemici, contrasto, peso, test
npm run check:fast # tutto tranne i test
```

Il DOM è finto a mano in `test/harness.mjs` (~330 righe) invece di usare jsdom: serve `getElementById`, un canvas finto, `addEventListener`, `localStorage` e `performance.now()`. Tutto il resto sarebbe rumore. E i test girano **sui veri `js/*.js`**, non su una copia.

I test non sono di copertura, sono di **onestà**:

- **`combat.test.mjs`** — verifica che la parata sia davvero l'unico modo di recuperare un ricordo, e che i quattro modi di fallire abbiano quattro nomi diversi. Se due di questi cambiano, il gioco mente, e un gioco che mente sul lutto è peggio di un gioco brutale.
- **`tela.test.mjs`** — geometria verificabile a mano: un tratto che copre metà del ritratto deve valere circa metà, e ridisegnare lo stesso tratto non deve ricoprire niente.
- **`flusso.test.mjs`** — una partita intera, dal primo tocco all'epitaffio, **inclusi i pointer events sulla tela**. Se i pezzi sono agganciati, questo passa.
- **`epitaffio.test.mjs`** — che ogni ricordo citato compaia davvero nel testo, e che nessuno si perda strada.
- **`pwa.test.mjs`** — che ogni risorsa dichiarata esista davvero, che i meta di iOS ci siano, che il peso resti sotto.

`tools/check.mjs` fa il resto: verifica che **ogni scheda citata nelle scelte esista**, che **ogni scheda sia assegnabile** (una scheda irraggiungibile è un Quaderno con un buco), che **ogni domanda di un nemico abbia una risposta esistente**, e che ogni schelta di testo sia formattabile senza perdere una parola.

---

## 16. Strumenti di sviluppo

```bash
npm run icons        # rigenera icone e screenshot
npm run contrast     # controlla WCAG AA
node tools/check.mjs # tutto
```

`tools/gen-icons.mjs` contiene un **encoder PNG scritto a mano** (zlib + CRC32) e un rasterizzatore SDF con supersampling 3×3. Le icone non sono un asset: sono una **descrizione di forma dentro a un file di sorgente**, quindi si correggono senza toccare un binario.

L'icona è la tesi del gioco in un quadrato: un ritratto a carboncino senza volto, e metà del ritratto già coperta dall'inchiostro che lo cancella.

---

## 17. Deploy

Il gioco è statico e senza dipendenze: **qualsiasi hosting di file basta**.

Per i **GitHub Pages**, nessuna configurazione speciale — è già tutto alla radice.

Verifiche importanti:
- il server deve rispondere in **HTTPS** (o `localhost`), altrimenti il service worker non si registra
- `sw.js` deve essere servito dalla **radice** dell'app, non da una sottocartella
- le cache sono prefissate `lpmf-`, per non mescolarsi con le altre app del repo

Il primo avvio richiede la rete (per `story.json`). Dopo, funziona tutto offline.

---

## 18. 🔮 Le altre proposte

Cinque idee nate nello stesso brainstorming di questa. Condividono la stessa ossessione — **il lutto come meccanica, non come decorazione** — e lo stesso vincolo: PWA, mobile-first, zero asset. Nessuna è stata scelta, ma nessuna è persa.

---

### 🐺 **GLI ULTIMI GIORNI** — *la barra HP è un contatore alla rovescia*

> Tutti hanno una data di morte stampata sulla faccia. Tu vedi la loro. Loro vedono la tua.

**Meccanica firma:** la barra HP **è** il contatore dei giorni che ti restano. Ogni turno di lotta costa **un giorno**. Non c'è una barra e un timer: sono la stessa cosa.

**Il dilemma che spacca una partita:** la dottoressa può curare **solo chi sta per morire**, e l'unica risorsa è il tempo dei tuoi compagni. Salvarla significa invecchiare un giorno *loro*.

**Il parry diventa gestione del tempo:** ogni difesa riuscita ti restituisce mezzo giorno. Combattere in fretta = invecchiare in fretta. **Il gioco ti insegna a correre *e* a perdere tempo** per amore.

**Rinascita:** non si vince, si sceglie chi arriva invecchiato. Quattro finali in base ai giorni risparmiati; il migliore è quello in cui il protagonista muore giovane e gli altri vivono.

**Perché funziona su telefono:** 2-4 minuti a combattimento, sei schermate, un pollice.

---

### 🌺 **FIORI SULLE TOMBE** — *vince chi dona di più*

> I fiori di questa città fioriscono solo sui cadaveri. L'unico modo per far crescere il mondo è ferirti.

**Meccanica firma:** il combattimento è a **dono**. Non attacchi: **offri**. Un fiore a un nemico lo guarisce e ti ferisce una volta tanto. Vince chi arriva a zero spese per primo — cioè chi ha donato di più.

Ogni nemico abbattuto è una tomba e un fiore: guadagni un petalo, perdi un ricordo. A metà partita ti accorgi di star camminando in un cimitero fatto della tua stessa vita.

**Il parry diventa un gesto di resa:** il nemico ti restituisce il fiore e devi **lasciarlo andare** al momento giusto, rilasciando il tocco. Tracciare troppo = non lo tieni.

**Rinascita:** il finale è il tuo giardino. Il mondo rifiorisce **sopra la tua tomba**, e chi ti amava ti dimentica — ma in modo caldo, come si dimentica un buon odore.

**Estetica:** serigrafia, verde muschio e ocra, piante che si disegnano a runtime.

---

### 🏠 **IL RITORNO** — *combattere è convincere, e vincere è ferire*

> Il soldato torna a casa. Il paese lo ha dimenticato. Deve convincerli che esiste — e ogni prova ricorda a loro il loro morto.

**Meccanica firma:** il combattimento è **dialogo e fiducia**. Hai cinque oggetti (un cucchiaio, una cicatrice, una voce, un nome) e ogni prova consuma l'oggetto **per sempre**. Se lo abbatti, gli hai ricordato la moglie morta: **lo hai salvato e fatto soffrire**.

**Il parry è non reagire:** l'NPC ti contrattacca con un ricordo suo; devi **non esagerare la reazione**. Troppa reazione = perdi l'oggetto.

**Zero azione, cento per cento testo.** Si vince con la scrittura, con la punteggiatura, con le frasi brevi. Enorme, gratis, e bellissimo su iPhone in verticale.

**Rinascita (l'ultima scena, da far leggere lentamente):** sua madre non lo riconosce. Gli chiede comunque di restare a cena. Lui resta.

---

### 🎭 **L'ULTIMA REPLICA** — *recitare è combattere, e i morti sono più veri*

> Un teatro dove i morti recitano. Tu sei lo sfrenatore. Più reciti, più loro sono reali — e tu sei meno.

**Meccanica firma:** recitare è combattere. Le battute sono le mosse, l'intonazione è la potenza, **la memoria è la riserva**: se sbagli una battuta dimenticata, il personaggio che reciti dentro *sbiadisce* e perdi una capacità.

Il teatro si svuota di spettatori vivi e si riempie di morti che pagano il biglietto. La troupe accetta, perché un morto che recita è più vero di un attore vivo.

**Finale:** devi recitare il ruolo del morto **senza saperlo fare**. Il pubblico applaude al buio. Non si sa chi sia in scena. Nessuno lo saprà mai.

**Estetica:** palcoscenico, tenda rossa, una sola luce, tipografia tipografica.

---

### 💃 **L'ULTIMA FESTA** — *la musica tiene in vita, e la musica uccide*

> Tutti gli invitati stanno morendo. La musica li tiene in vita. Ma la musica li uccide.

**Meccanica firma:** **ritmo**. Un cerchio di battute pulsa; tieni il party in vita colpendi al tempo giusto. Più duri, più restano vivi — ma il ballo li sta consumando: ogni giro è una settimana in meno.

**La scelta che definisce il finale:** puoi **fermare la musica** — salvi un invitato, ma ti dimentica. Puoi continuare — lo tieni in vita fino alla fine del brano, che gli costa la vita intera.

**Finale:** l'ultima nota. Chi ha ballato fino in fondo non muore: **sparisce**. Chi hai salvato non si ricorda di te, ma ti ha regalato un'estate.

**Estetica:** ballo Belle Époque, oro e bruciature, pulviscolo nell'aria (leggerissimo).

---

### Come realizzarle, se un giorno ci si mette

Il motore esiste già. `combat.js`, `memoria.js` e `tela.js` sono **astratti sul tema**: cambiano i numeri, non la logica. Concretamente:

- **Gli Ultimi Giorni** — sostituisci `INCHIOSTRO_PER_QUOTA` con un contatore di giorni e inverti il segno della perdita nella `rispostaParata`. Il resto è il gioco che c'è, con la barra letta al contrario.
- **Fiori sulle Tombe** — inverti il danno: `pittura()` restituisce `cura` invece di `danno`, e il nemico è `totale` di fiori, non di vita.
- **Il Ritorno** — `tela.js` sparisce quasi del tutto; il motore diventa un parser di scelte e un orologio. Il file più grande diventa `data/story.json`.
- **L'Ultima Replica** — scambia `maschera()` con una **griglia di battute** e `copre()` con una **soglia di memoria**; il resto della meccanica è già giusta.
- **L'Ultima Festa** — la meccanica centrale (`generaContorno`, `rispostaParata`, `caratteristiche`) è **già un sistema ritmico**: basta sostituire la finestra di 700 ms con una battuta e mostrare il cerchio al posto della riga.

Nessuna delle cinque richiederebbe di riscrivere il motore. È la parte che mi ha fatto scegliere questa prima: **costruire il motore una volta sola e poi cambiare il tema è più onesto che fare cinque giochi mediocre.**

---

## Changelog

### 1.0.0
- Prima versione completa: 6 atti, 28 schede, 6 nemici, 5 finali, epitaffio generato
- Motore di pittura su Canvas 2D con maschere pure e testate
- Cinque mosse (Traccia, Lavora, Inchiostro, Chiedi) e parata a tempo
- Quaderno filtrabile per persona, con bordi scottati
- PWA installabile, 100% offline, ottimizzata per iPhone (colpo mano, safe-area, nessun feedback aptico)
- 161 test, gate unico di qualità, contrasto WCAG AA verificato

---

## Licenza

MIT. Vedi `LICENSE`.

Il gioco non contiene asset di terze parti: le icone sono generate da codice, il suono è sintetizzato, i testi sono scritti qui.