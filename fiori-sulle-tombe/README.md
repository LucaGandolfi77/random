<div align="center">

# 🌺 Fiori sulle Tombe

### Una telenovela che finisce nel cimitero. Non attacchi: **offri**.

**6 atti · 28 ricordi · 7 persone · 6 vasi · 5 finali · una puntata · 100% offline · zero dipendenze**

</div>

---

> I fiori di questa città fioriscono **solo sui cadaveri**.
>
> L'unico modo per far crescere il mondo è ferirti.
>
> Sei **Nadia Ferro**. Hai passato la vita a dare fiori a gente che non te li chiedeva, e i titoli di coda ti chiamano «la signora dei giardini». Non ti chiedono come fai. Ti chiedono solo di continuare.
>
> Ci sono **sei vasi** nell'orto, e hanno tutti un nome scritto a matita sulla ceramica. La matita è la tua calligrafia.
>
> Uno di quei sei nomi è **Sauro**.

---

## Indice

1. [Requisiti](#1-requisiti)
2. [Avvio](#2-avvio)
3. [I due numeri](#3-i-due-numeri)
4. [Le quattro mosse](#4-le-quattro-mosse)
5. [La resa](#5-la-resa)
6. [L'arc[o]: sette persone che cambiano](#6-larco-sette-persone-che-cambiano)
7. [I sei vasi](#7-i-sei-vasi)
8. [I cinque finali e la puntata](#8-i-cinque-finali-e-la-puntata)
9. [Il Mazzetto](#9-il-mazzetto)
10. [Stack tecnologico](#10-stack-tecnologico)
11. [Struttura del progetto](#11-struttura-del-progetto)
12. [Architettura](#12-architettura)
13. [Le scelte che cambiano il gioco](#13-le-scelte-che-cambiano-il-gioco)
14. [Perché funziona su iPhone](#14-perché-funziona-su-iphone)
15. [Accessibilità](#15-accessibilità)
16. [Privacy](#16-privacy)
17. [Test e qualità](#17-test-e-qualità)
18. [Strumenti di sviluppo](#18-strumenti-di-sviluppo)
19. [Roadmap](#19-roadmap)
20. [Deploy](#20-deploy)

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
cd fiori-sulle-tombe
node serve.js
```

Poi apri **http://localhost:4184**

```bash
npm start          # stesso di node serve.js
npm run dev        # ascolta su 0.0.0.0: apribile dal telefono sulla stessa rete
PORT=8080 npm start
```

**Per provarlo sul telefono** (il modo giusto, dato che il gioco è un dito):

```bash
HOST=0.0.0.0 node serve.js
```

Trova il tuo IP con `ip addr` o `ipconfig`, apri `http://<tuo-ip>:4184` dal telefono, e su iOS **Condividi → Aggiungi alla schermata Home**.

---

## 3. I due numeri

Ogni combattimento ha **due numeri**, e sono tuoi. Non c'è una barra di vita: c'è il vaso e c'è te.

```
COMBATTIMENTO
├── HUD sopra     · il nome del vaso, la sua sete, e i due numeri
├── ORTO al centro · la figura a stampa. La riempi.
└── MENU in basso · Offri · Accarezza · Mazzo · Chiedi
```

| Cosa vedi | Cosa significa |
|---|---|
| **lui deve** | quanta cura ti manca perché il vaso sia pieno. Scende a ogni offerta |
| **hai dato** | quanta parte di te hai già speso. Sale a ogni offerta, **anche quando il fiore non prende** |
| **sete** (i pallini) | quanto il vaso ha da bere. A sei fa una domanda |
| **i fiori** | quanti ne hai **in mano**: il mazzetto di questo turno. Quando finiscono, il tratto si interrompe |
| **ricordi** | quante schede ti restano nel Mazzetto |
| **i colori** in basso | di chi è il fiore che stai dando: Nadia, Betta, Anselmo, Orielia, Donata, Sauro |

I due numeri non possono contraddirsi, e la ragione è tecnica ma anche morale: `lui deve` conta **la cura** che il vaso ha ricevuto, `hai dato` conta **il terreno che hai toccato**. Sono misurati in modo diverso.

**Il conto lo paga `hai dato`,** e il limite è **di ogni vaso**, non uno solo per tutto il gioco. Sta sotto il costo della mossa base e sopra il costo dell'Accarezza: è la regola che rende necessaria una scelta. Prima valeva 150 per tutti e nessuno ci arrivava mai — la sconfitta esisteva solo sulla carta.

### I fiori: un tetto, non una riserva

Prima si chiamavano **semi** e si riempivano **toccando il terreno**. Era un contatore che cresceva con la terra che pagavi: chi spendeva di più aveva più semi da spendere, e i due numeri erano la stessa cosa misurata due volte. Con un `semi` così fatto **un colpo solo bastava a vuotare un vaso**, e il gioco si vinceva al primo gesto.

Adesso i fiori sono un **mazzetto per turno**: dieci, quattordici, ventidue a seconda della mossa, e quando finiscono il tratto si interrompe dove finiscono. Non tornano indietro, e non crescono toccando.

La conseguenza non è una regola in più: è che **le tre mosse sono davvero tre mosse**. Con dieci fiori copri una fissa, con ventidue copri quasi un quinto del vaso, e non è la stessa cosa pagare la stessa area.

> Il tratto *disegnato* resta intero anche oltre il mazzetto: vedi dove sei andata, e vedi che i fiori sono finiti lì.

---

## 4. Le quattro mosse

### `〰` **Offri** — 10 fiori, sempre disponibile

Traccia col dito sopra il vaso. La cura è **l'area che tocchi davvero**: nessuna barra, nessuna casualità, nessun numero nascosto. Il tuo segno è la verità.

Non ha bisogno di nessuna scheda e non può bloccarsi: è l'unica mossa che ti resta quando tutto il resto è finito. Ma **non basta mai**, da sola, in nessuno dei cinque vasi: è troppo lenta. Serve per when non hai nient'altro, e in un gioco dove la scelta è la meccanica questo è già un peso.

> Offrire al **cuore** vale 2,2 volte. Il cuore è segnato con due trattini: trovalo e guardalo.
> E perché il cuore vale il doppio? Perché offrire al cuore di una persona è il gesto che conta.

### `◗` **Accarezza** — 14 fiori

Passa il dito lentamente, con peso. Fa 2,2 volte la cura.

**Il prezzo:** se **alzi la mano** prima di arrivare in fondo, il fiore non prende. La cura va a zero ma il terreno resta tuo: **perdi la cura e paghi comunque**. L'impazienza si paga due volte, ed è l'unica cosa che si paga due volte.

### `●` **Mazzo** — 22 fiori, brucia 2 ricordi

Il colpo più forte (4 volte), e **azzera la sete** del vaso.

Ma non è gratis: devi **scegliere due schede del Mazzetto** da dare in pasto alla terra. Non puoi farlo a caso — il gioco ti lascia il tempo di pensarci, e te le mostra tutte.

> Le schede che insegnano il Mazzo sono **i segreti**: la gravidanza di Betta, la bambina che nessuno ha nominato, l'attesa di Orielia, il primo fiore. **Il colpo più forte del gioco costa esattamente quello che ti serve sapere.** Non è un bilanciamento: è la trama.

### `❝` **Chiedi** — gratis, ma serve un ricordo

Non offri: **parli**.

Se ricordi ancora **come si parla con la gente** (cioè se possiedi una scheda con la chiave «parla»), il vaso ti ascolta, si distrae, e ti restituisce **un ricordo**. È la mossa lenta: non riempi niente, ma non perdi niente.

Se non ricordi più come si fa, parli a vuoto: lui ti risponde e ti costa un ricordo uguale.

---

## 5. La resa

> **La parata è diventata un atto di resa.** Il nemico non ti restituisce una riga da tracciare: ti **restituisce un fiore**, e devi **lasciarlo andare**.

Quando un attacco si può lasciar andare, un anello si chiude attorno al fiore. **Tieni premuto e rilascia.** Non si traccia: si tiene.

- **Riuscita** → prendi zero danno **e recuperi un ricordo**
- **Fallita** → prendi il colpo **e perdi un ricordo**

Non è uno scermo: è l'unico modo di riavere indietro quello che hai appena perso. Il fallimento ha **quattro nomi diversi**, perché «hai sbagliato» e «sei arrivato tardi» sono rimproveri diversi:

| Motivo | Cosa hai fatto |
|---|---|
| `troppo presto` | hai rilasciato prima che il fiore fosse tuo |
| `troppo breve` | non l'hai nemmeno preso |
| `troppo mosso` | **l'hai stretto** — è il «tracciare troppo = non lo tieni» |
| `troppo tardi` | l'hai tenuto troppo, ed è cascato |

E c'è un quinto caso, che non è un modo di sbagliare il gesto: **non farlo affatto**. La finestra ha un orologio, e quando scade il fiore se n'è andato. Scadere costa un ricordo — come ogni altra resa persa — ma **non è il tuo turno**: perdi il premio, non il diritto di dare.

Questa cosa prima non esisteva. Il fiore era un'icona con una finestrella disegnata dentro, nessuno guardava il tempo, e `resaScaduta` non era chiamata da nessuna parte: si poteva premere quando si voleva, e la pazienza era gratis. Adesso la finestra è una finestra, e decidere ha una scadenza.

**Nota:** se la resa fallisce, **offri lo stesso**. Non è un turno perso. Se non si potesse comunque riempire, punire e non ricompensare insieme sarebbe doppia punizione.

E c'è un prezzo, in un caso solo: se per lasciarlo andare serve **consegnare qualcuno**, la scelta è già scritta. Si paga con la persona che ti stavi salvando.

---

## 6. L'arc[o]: sette persone che cambiano

Ogni persona del cast ha **tre stati**, e lo stato **non dipende dall'atto**: dipende da **come l'hai trattata**. È l'unica vista che rende la telenovela leggibile mentre la stai giocando.

| Stato | Quando | La frase che cambia |
|---|---|---|
| **0** | all'inizio | *chi è* |
| **1** | hai bruciato almeno una scheda sua — **le hai date al terreno** | *chi hai perso* |
| **2** | hai riempito il suo vaso — **l'hai fatto fiorire e morire** | *chi ti ha piantato* |

Non è decorativo. Cambia tre cose in combattimento:

1. **La sete cresce più in fretta** (da 1,7 a 3,6 a turno). Chi è stato tradito beve di più.
2. **Le domande cambiano interamente.** Da *«l'hai saputo prima di me?»* a *«perché hai dato via la mia parte?»*.
3. **Il cuore si inverte allo stato 2**: normalmente è ×2,2 di cura, ma lì offrire al cuore di chi ti ha piantato **ti restituisce** invece di costare. È l'unico punto del gioco in cui dare ti fa tornare qualcosa, e arriva a fine partita.

E sulla tela, l'arc[o] si vede:

- **stato 1 → cadono gli ornamenti.** Il braccio teso, le mani in grembo, il bancone, la lastra: è sempre l'ultima forma dello sbozzo, e sparisce per prima.
- **stato 2 → la figura è quasi sparita.** Tutte tranne una, e l'eccezione è il punto: il giardino **cresce** sopra gli altri cinque, ed è per questo che è l'ultimo.

---

## 7. I sei vasi

I sei vasi sono **sei delle sette persone di cui porti le schede**. Questo non è un vezzo: è la tesi del gioco. A metà partita ti accorgi che il cimitero che stai coltivando è fatto della tua stessa vita.

| # | Atto | Il vaso | Chi è *davvero* | Frase del titolo |
|---|---|---|---|---|
| **0** | Il vaso di terra | `il-vaso` | — | *impari che dare costa* |
| **I** | La sorella | `betta` | è partita con metà di tutto ed è tornata per fermarti | «è tornata per fermarti» |
| **II** | Il giuramento | `ansi` | ha giurato di non dirti niente e ti ha detto tutto | «sa chi è la bambina» |
| **III** | Orielia | `orielia` | ha smesso di aspettare e ha cominciato a fiorire | «fiorisce perché tu continui a dargliele» |
| **IV** | Il prezzo | `donata` | ha fatto mercato dei tuoi morti | «ha fatto mercato dei tuoi morti» |
| **V** | Il giardino | `sauro` | **non è una persona: è la tomba** | «è sotto da sempre» |

`brizio` non è un vaso: è il giardiniere, e non è nessuno dei due. Dà fiori, non li riceve, ed è l'unico che ti dice la verità e non la vuole.

**Il segreto centrale**, in sei pezzi e nell'ordine sbagliato:
> *di chi è la bambina che nessuno ha mai nominato?*

E alla fine la risposta è nella lastra dietro l'orto, dove ci sei passata davanti **ventisette volte** senza leggerla.

---

## 8. I cinque finali e la puntata

Il finale dipende da **quanti ricordi ti restano**, da **quanti vasi hai riempito**, e da una cosa sola: **se la promessa che hai fatto al primo atto l'hai mantenuta**. Sei sola tu a poterlo sapere, e il gioco non lo deduce.

| Finale | Condizione | Cosa succede |
|---|---|---|
| **Il Giardino** ⭐ | 6 vasi + 12+ ricordi + promessa mantenuta | Il **finale vero**. La città fiorisce intera e i titoli di coda parlano di te |
| **La Vigna** | 6 vasi + 7-11 ricordi | fiorisce, ma con i buchi dove mancavi tu |
| **Il Prato** | 2-6 ricordi | fiorisce, e i nomi non tornano più |
| **Lo Spoglio** | 1 ricordo | una persona sola, e non è nemmeno lei |
| **La Terra** | 0 ricordi | Il vaso è pieno e tu non c'entri più. **Non è una sconfitta.** |

> Il finale vero non si sblocca con un punteggio: si sblocca con i sei petali **e** con una promessa. Sotto gli otto ricordi un giardino non è un giardino: è un orto, e la differenza te la dice il finale, non il numerino.

### La puntata

Sotto l'epitaffio non c'è un ringraziamento. C'è una **puntata**: il titolo, e poi **i titoli di coda** — il destino di ognuno dei sette, letto dall'arc[o] che gli hai costruito giocando. Non è una tabella di finali: è la stessa funzione che mostra l'arc[o] nel Cast, con due righe in più.

> *Il giardino è pieno. E va tutto bene: è questo il punto, e ci si arriva solo così.*
>
> *Chi ti amava ti ha dimenticata in modo caldo, come si dimentica un buon odore.*

L'epitaffio è generato: una piccola grammatica che incrocia che cosa hai scelto di tenere e che cosa hai scelto di dare al terreno. **Replay = un epitaffio diverso.** È la stessa partita, ed è un'altra persona.

---

## 9. Il Mazzetto

Le 28 schede sono **ricordi concreti**, non potenze da migliorare:

- *L'orecchio che non sente* → *Da bambina, un inverno e un'idraulica già aperta. Il sinistro non sente niente, e da allora ride storto. Non l'ha detto a nessuno, e tu lo dirai a un orto.*
- *La pelle del suo ginocchio destro* → *Si spalla dopo la pioggia, da sempre. Glielo guardi da vent'anni e non gli hai mai detto niente. È l'unica cosa di lei che il giardino non è riuscito a prendere.*

Ogni scheda porta con sé **due righe di poesia** e, a volte, una capacità. Il Mazzetto si filtra per persona e mostra anche i **petali secchi** di quello che hai dato al terreno: non sparisce, resta.

In fondo a ogni atto ci sono tre faccine:

- **✧ Annusa** — rileggi un ricordo che possiedi. Non dà vantaggi. Dà quello che ti spetta.
- **◈ Il Cast** — le sette persone, e che cosa hai fatto di ognuna.
- **✚ Rinnova** — riprendi un ricordo dato al terreno. **Paghi con il più fresco**: è l'unico scambio onesto del gioco, e non è mai vantaggioso. Una volta per atto.

---

## 10. Stack tecnologico

Nessuno. È il punto.

| Cosa | Come |
|---|---|
| Linguaggio | JavaScript ES2020 puro, nessun framework |
| Grafica | **Canvas 2D** — la meccanica *è* il disegno |
| Estetica | serigrafia: due piatti di stampa, retino ed errore di registro |
| Audio | **Web Audio** sintetizzato: nessun file, nessuna licenza |
| Asset | **Zero binari.** Icone e screenshot generati da `tools/gen-icons.mjs` |
| Testi | `data/story.json` — 52 kB, e il gioco è anche un quaderno |
| Persistenza | `localStorage` con deep-merge e migrazioni |
| Offline | Service worker, app shell precachata |
| Test | `node:test` + un DOM scritto a mano (~490 righe, al posto di jsdom) |
| Dipendenze | **0** runtime, **0** dev |

---

## 11. Struttura del progetto

```
fiori-sulle-tombe/
├── index.html            # una sola pagina, sette viste
├── offline.html          # cosa dire quando la rete manca
├── manifest.webmanifest  # installabile, portrait, it
├── sw.js                 # app shell, strategia onesta
├── serve.js              # server statico, zero dipendenze
├── package.json
│
├── css/style.css         # mobile-first, niente hover, niente :active
│
├── data/story.json       # 6 atti, 28 schede, 15 scelte, 5 finali, 7 nel cast
│
├── js/
│   ├── save.js           # persistenza, deep-merge, migrazioni
│   ├── memoria.js        # IL MAZZETTO — economia dei ricordi, petali, l'arc[o]
│   ├── epitaffio.js      # la grammatica che scrive il tuo epitaffio e i titoli di coda
│   ├── audio.js          # suono sintetizzato
│   ├── orto.js           # il motore di semina (geometria + Canvas)
│   ├── dono.js           # la macchina a doni
│   ├── vasi.js           # chi sta dentro il vaso, e i suoi tre stati
│   ├── scena.js          # formattazione, scelte, e il branch
│   ├── app.js            # l'orchestra
│   └── pwa.js            # installazione, aggiornamenti, iOS
│
├── test/
│   ├── harness.mjs       # DOM finto, carica i veri js/
│   ├── memoria.test.mjs
│   ├── orto.test.mjs
│   ├── dono.test.mjs
│   ├── scena.test.mjs
│   ├── vasi.test.mjs
│   ├── epitaffio.test.mjs
│   ├── flusso.test.mjs
│   ├── bilancio.test.mjs  # gioca il gioco male, e dice se è giocabile
│   ├── partita.test.mjs   # una partita intera, dal primo atto al finale
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

## 12. Architettura

### La regola che tiene insieme tutto

> **Il giocatore non ha una barra di vita. Ha una spesa, e la spesa è sua.**

Da lì discende tutto:

```
resa riuscita          →  perdi niente, +1 ricordo, e semini lo stesso
resa fallita           →  -1 ricordo,   e semini lo stesso
chiedi (con «parla»)   →  -0, +1 ricordo, ma NON semini
chiedi (senza «parla») →  -1 ricordo, e non semini
mossa non resabile     →  -1 ricordo, e non puoi seminare
domanda senza risposta →  -1 ricordo + un turno perso
accarezza con le mani alzate →  cura a zero, ma paghi il terreno come se fosse andata
speso oltre il limite   →  la partita finisce, e finisci male
esaurimento ricordi    →  la partita finisce, e finisci peggio
```

### L'inversione sta in una riga

`orto.js:465` non restituisce `danno`: restituisce **`cura`**. Coprire non toglie vita a nessuno — coprire *dà*. Il nemico ne guarisce, e tu ne paghi il conto.

### I due numeri non si contraddicono

`spesa` è funzione della **cura** (che dipende dalla mossa e dal cuore). `speso` è funzione dell'**area toccata** (che non dipende da niente). Per questo le mosse potenti ti **risparmiano**: raddoppiare la cura per tratto dimezza l'orto che ti resta da toccare.

### La geometria è separata dal disegno

`orto.js` ha due metà che non si toccano:

- **`maschera()` e `copre()`** sono funzioni pure su una `Uint8Array`. Nessun DOM, deterministiche, testate senza browser. Se qui sbagli di un fattore due, tutto il gioco è sbagliato, e nessuno se ne accorge giocando. Per questo la copertura è verificata con una **formula**, non con una tolleranza: un tratto lungo *L* copre `(L + larghezza) × larghezza`, e il test lo controlla tratto per tratto.
- **Il Canvas** disegna, ma solo quando serve. Lo sbozzo si ridipinge quando cambia qualcosa; i tuoi tratti si disegnano una volta sola quando terminano. Ridisegnare tutto ogni frame è la via più rapida per far scaldare la batteria di un telefono.

### L'arc[o] è una funzione, non una tabella

`memoria.js:statoDi()` legge il Mazzetto e i petali, e basta. Non c'è nessun posto in cui si decide «questa persona è allo stato 2»: si calcola, e siccome è pura si testa senza browser. `vasi.js:per(id, stato)` fa il resto, restituendo sempre un vaso giocabile.

### Il testo è un linguaggio chiuso

In `story.json` si scrive `{a}` `{b}` `{c}` `{d}` per le voci e `{/}` per chiudere, `>` all'inizio di riga per un verso. `colora()` è l'unico punto in cui si genera markup, e produce solo quattro `<span>` con nome di classe fisso. Tutto il resto viene scappato **prima** di entrare: nessuna graffa, nessuna parentesi angolare e nessun `&` del contenuto può finire dentro un tag.

---

## 13. Le scelte che cambiano il gioco

Le scelte scrivono **sei flag** in `salva.scelte`. E i flag non sono decorazione: vengono letti.

| Flag | Dove si sceglie | Cosa cambia dopo |
|---|---|---|
| `a0_porta` | atto 0 | due versioni diverse della chiusura del gioco, in due atti diversi |
| `a1_promise` | atto I | tre battute diverse nell'atto II, e la **promessa** del finale vero |
| `a2_promise` | atto II | il bancone di Donata legge in tre modi diversi |
| `a3_seduta` | atto III | due battute diverse, una delle quali cambia l'aiuola per sempre |
| `a4_nome` | atto IV | **la svolta finale.** Tre finali diversi dell'ultimo atto |
| `a5_come` | atto V | l'ultima battuta cambia: se hai letto il nome tu o lo ha letto qualcun altro |

18 battute hanno una condizione `se`, e vengono lette o no a seconda di quello che hai scelto prima.

> **Il gate più importante di questo progetto** è in `tools/check.mjs`: **ogni flag scritto da una scelta deve essere letto da almeno una battuta, un'azione o un finale.** Se no, la scelta non cambia niente.
>
> Non è una paranoia. Il gioco da cui deriva questo progetto aveva **dodici flag e zero lettori**: dodici scelte che sembravano contare e non contavano niente, e nessuno se n'era accorto fino a quando non sono state cercate.

---

## 14. Perché funziona su iPhone

Le trappole di un gioco a gesto-continuo su iOS sono specifiche e insidiose. Queste sono quelle risolte:

| Problema | Cosa è successo | Cosa facciamo |
|---|---|---|
| **iOS non ha `Vibration API`** | il feedback della resa non può essere aptico | **solo visivo e audio**: flash + splash d'inchiostro + suono secco. E l'errore è l'anello che si chiude di rosso: *vedi* la colpa |
| **`pointermove` arriva a 3-5 eventi/sec su un drag veloce** | le pennellate diventano polilinee a zig-zag | **`getCoalescedEvents()`**: si legge ogni punto campionato dal browser, non solo quelli consegnati |
| **`100vh` sbaglia con la barra di Safari** | il layout salta quando compare la barra | `100dvh` e `env(safe-area-inset-*)` ovunque |
| **iOS non ha doppio-tap-to-zoom** con gesture | il pennello si rompe | `touch-action: none` sull'orto, `touchstart` con `preventDefault` |
| **Safari chiude i tab in background** | perdi la partita | `visibilitychange` → salva e sospende il `rAF`; `navigator.storage.persist()` chiesto in primo piano |
| **Chrome ha `beforeinstallprompt`, Safari no** | su iPhone non puoi chiedere di installare | il pulsante dice **esattamente cosa fare**: *Condividi → Aggiungi alla schermata Home* |
| **120 Hz ProMotion** | finestre di timing strette sono ingiocabili | finestra **700 ms**, verificata con `performance.now()` e con un orologio iniettato nei test |
| **I tasti grandi scivolano col pollice** | il menu è irraggiungibile in basso | menu in basso (pollice), barra sopra (indice), e l'opzione **«Colpo mano»** che specchia il layout per chi gioca col pollice sinistro |

In più: **nessun `hover`, nessun `:active`, nessun tasto sotto i 44px**, `apple-touch-icon-180`, `viewport-fit=cover`, `apple-mobile-web-app-capable`, audio sbloccato al primo tocco, DPR limitato a 2.

---

## 15. Accessibilità

- **Nessun color-only**: ogni comando disabilitato dice **perché** nel `title`, e il testo del pulsante resta.
- **Contrasto verificato**, non sperato: `tools/contrast.mjs` controlla le **48 coppie** di colori che compaiono davvero sullo schermo, e i colori citati devono esistere nel CSS (altrimenti il controllo sta guardando il passato).
- **Lettura ad alta voce** opzionale, con voce italiana.
- **Movimento ridotto** disattivabile, e rispettato automaticamente con `prefers-reduced-motion`.
- **Focus visibile** su tutto, `:focus-visible` con outline.
- **Nessun colore solo per capire lo stato**: la barra di `hai dato` ha un numero accanto, il vaso ha una percentuale, e le **tacche dell'arc[o]** hanno un `aria-label` che dice a parole che cosa sono.
- **Il Mazzetto è navigabile da tastiera** ed è una lista di schede reali, non un'immagine.
- **La lettura dei testi è scelta, non imposta**: si può saltare con un tocco.

---

## 16. Privacy

- **Nessun account, nessun server, nessuna rete dopo il primo avvio.**
- Tutto il save sta in `localStorage`, sul dispositivo.
- **Zero richieste esterne**: nessun CDN, nessun font remoto, nessuna telemetria. È controllato da `test/pwa.test.mjs`.
- L'unica cosa che chiede il permesso è la **persistenza** dei dati locali (`navigator.storage.persist()`), per evitare che il browser li sfratti dopo settimane.

---

## 17. Test e qualità

```bash
npm test           # 272 test
npm run check      # gate unico: sintassi, risorse, testi, vasi, scelte, contrasto, peso, test
npm run check:fast # tutto tranne i test
```

Il DOM è finto a mano in `test/harness.mjs` (~490 righe) invece di usare jsdom: serve `getElementById`, un canvas finto, `addEventListener`, `localStorage` e `performance.now()`. Tutto il resto sarebbe rumore. E i test girano **sui veri `js/*.js`**, non su una copia.

I test non sono di copertura, sono di **onestà**:

- **`dono.test.mjs`** — verifica che la resa sia davvero l'unico modo di recuperare un ricordo, e che **i quattro modi di fallire abbiano quattro nomi diversi**. Se due di questi cambiano, il gioco mente, e un gioco che mente sul lutto è peggio di un gioco brutale. Verifica anche le **frontiere esatte** dei quattro veredetti, al millisecondo.
- **`orto.test.mjs`** — la copertura è verificata **con la formula**, non con una tolleranza: un tratto lungo *L* copre `(L + presa) × presa`, e il test lo controlla su quattro lunghezze. E verifica che **il cuore si inverta davvero** al terzo stato.
- **`vasi.test.mjs`** — verifica che **l'arc[o] sia reale**: che le forme cambino a ogni stato, che la domanda cambi, che la figura si restringa, e che **il giardino faccia il contrario di tutti gli altri**. Se un giorno un vaso non si stringe, il test va aggiornato insieme alla forma, e non a caso.
- **`scena.test.mjs`** — che il branch filtri davvero: una scena con una battuta condizionata dà atti diversi, della stessa lunghezza, a seconda di quello che hai scelto.
- **`flusso.test.mjs`** — una partita intera, dal primo tocco ai titoli di coda, **inclusi i pointer events sull'orto** e la resa. Se i pezzi sono agganciati, questo passa.
- **`bilancio.test.mjs`** — **gioca il gioco**. Non prova funzioni: gioca, e gioca male di proposito, con le strategie che un giocatore non avrebbe scelto. Offri da sola deve essere perdente, la catena del giocatore deve vincere quasi sempre, le domande devono suonare, e ogni vasetto deve restare **riempibile**: `spesa` non può superare la cura che la sua figura contiene davvero, altrimenti il vaso è invincibile e nessun altro test se ne accorge.
- **`partita.test.mjs`** — una partita intera dal primo atto al finale, senza browser: sei vasi, sei petali, le domande che suonano, le finestre che si aprono e **una che scade senza risposta**, e i flag che ricordano l'atto in cui li hai scelti.
- **`epitaffio.test.mjs`** — che ogni ricordo citato compaia davvero nel testo, e che nessuno si perda strada.

`tools/check.mjs` fa il resto con otto gate: verifica che **ogni scheda citata nelle scelte esista**, che **ogni scheda sia assegnabile**, che **ogni domanda di un vaso abbia una risposta esistente**, che **ogni id cercato da `app.js` sia in `index.html`**, che **ogni flag scritto sia riletto entro due atti**, e che ogni scelta di testo sia formattabile senza perdere una parola.

Il gate dei flag era verde per un motivo sbagliato: contava come «letti» anche i flag nominati dentro i **commenti** del codice, perché cercava con una regex sul sorgente invece di chiamare il modulo. Un gate che passa perché ha letto la mia stessa prosa è peggio di un gate assente, perché sembra a posto. Adesso chiama `promessaMantenuta` e gli chiede «se metto questo flag, cambia qualcosa?», e poi misura la **distanza**: una scelta riletta cinque atti dopo non è una scelta, è un tasto premuto una volta e sei mesi fa.

---

## 18. Strumenti di sviluppo

```bash
npm run icons        # rigenera icone e screenshot
npm run contrast     # controlla WCAG AA
node tools/check.mjs # tutto
```

`tools/gen-icons.mjs` contiene un **encoder PNG scritto a mano** (zlib + CRC32) e un rasterizzatore SDF con supersampling 3×3. Le icone non sono un asset: sono una **descrizione di forma dentro a un file di sorgente**, quindi si correggono senza toccare un binario.

L'icona è la tesi del gioco in un quadrato: **un gambo che esce da una pietra, e metà del gambo già fiorito**. La parte fiorita è l'unica che hai pagato, e non la paghi subito — perché nel gioco si paga per quattro atti, e la pietra sotto è un cadavere con la faccia cancellata.

---

## 19. Roadmap

Lo stato di oggi è **fatto e misurato**, non previsto. Quello che segue è quello che manca.

### Fatto, con la misura accanto

| Cosa | Come si sa che è fatta |
|---|---|
| I fiori sono un tetto di turno | `orto.semina` tronca il tratto dove finiscono; `dono.js` chiude la mossa dopo il primo uso |
| Le tre mosse sono tre mosse | su 40 semi per vaso: **Offri 0%**, catena del giocatore **100%** |
| Ogni vaso si può riempire | `spesa` è derivata dalla figura; il gate lo verifica in tutti e tre gli stati |
| Il limite sta fra Offri e Accarezza | `limiteQuota` per vaso, e scende a ogni atto |
| La finestra della resa scade | `app.js` ha un orologio; `dono.scadeResa()` chiude e costa un ricordo |
| Il terreno appassito vieta solo l'Accarezza | il Mazzo resta aperto, e non è più l'unica riserva a caso |
| Ogni scelta torna entro due atti | gate sui flag, con la distanza misurata |
| Una partita si attraversa tutta | `test/partita.test.mjs`, sei atti e un finale |

### Da fare

**Il telefono.** Suona, e lo schermo sale dal basso. Un sms — o una chiamata — che arriva mentre sei in mezzo all'aiuola, e che devi rispondere o ignorare. La domanda che deve fare: *un messaggio che arriva quando non guardi è un intervento nella storia o solo un effetto?* La risposta che vale è la seconda, se il telefono resta spento per la scena e suona solo durante l'orto. Così è un ritmo, non un capitolo.

**Il Giardino.** Sei piante procedurali, disegnate da un seme, non scritte a mano: una per persona, e cambiano con lo stato dell'arco. Non è una schermata in più, è il posto dove si vede cosa hai perso. Il rischio è lamaniera: si deve sentire che sono cresciute, non che sono state disegnate.

**La rinascita.** Al secondo giro, con `stato >= 1`, l'arc[o] parte già avanti: il vaso che avevi riempito è più piccolo, e la spesa è quella giusta, non quella di prima. È il Blocco 1 applicato alla memoria.

**Le voci troncate.** Sotto gli otto ricordi, le battute si spezzano. Non diventano un altro testo: diventano la stessa frase con un buco dove c'era una parola, e il buco è dove hai perso la scheda. È l'unica cosa che rende visibile il vuoto senza spiegarlo.

### Cosa non si farà

- **Non un settimo vaso.** Sei è il numero, e aggiungerne uno è come aggiungere un capitolo a una cosa che sta in piedi per sei.
- **Niente statistiche di abilità.** Il gioco non deve sapere che sei bravo. Deve sapere cosa hai perso.
- **Niente difficoltà a scelta.** Un'opzione «facile» è un modo per non scegliere.

## 20. Deploy

Il gioco è statico e senza dipendenze: **qualsiasi hosting di file basta**.

Per i **GitHub Pages**, nessuna configurazione speciale — è già tutto alla radice.

Verifiche importanti:
- il server deve rispondere in **HTTPS** (o `localhost`), altrimenti il service worker non si registra
- `sw.js` deve essere servito dalla **radice** dell'app, non da una sottocartella
- le cache sono prefissate `fst-`, per non mescolarsi con le altre app del repo

Il primo avvio richiede la rete (per `story.json`). Dopo, funziona tutto offline.

---

## Changelog

### 1.0.0
- Prima versione completa: 6 atti, 28 schede, 7 persone, 6 vasi, 5 finali, puntata generata
- Combattimento **a dono**: `orto.js` restituisce `cura` invece di `danno`
- **Due contatori** — la spesa del vaso e la spesa tua — che non possono contraddirsi
- La parata è diventata una **resa**: tenere e rilasciare, con quattro modi di fallire
- **Arc[o] meccanico**: ogni persona ha tre stati che cambiano sete, domande, forme e il segno del cuore
- **Branch reale**: 6 flag, 18 battute condizionali, e un gate che vieta le scelte inutili
- Vista **Il Cast** e schermata finale a **puntata** con i titoli di coda
- Estetica serigrafia: due piatti, retino ed errore di registro
- PWA installabile, 100% offline, ottimizzata per iPhone (colpo mano, safe-area, nessun feedback aptico)
- 230 test, gate unico di qualità, contrasto WCAG AA verificato su 48 coppie

---

## Licenza

MIT. Vedi `LICENSE`.

Il gioco non contiene asset di terze parti: le icone sono generate da codice, il suono è sintetizzato, i testi sono scritti qui.
