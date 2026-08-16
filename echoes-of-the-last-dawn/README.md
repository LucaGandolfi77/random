# L'Ultimo Rintocco

Un JRPG browser-based a turni con parry a tempo, grafica 3D low-poly e una trama filosofica sull'amore, la memoria e la paura della morte. Giocabile interamente offline.

## Trama

Ogni anno, una sola volta, la campana della città di Nivea suona per ogni figlio che morirà. È un rintocco gentile, un addio anticipato: gli abitanti lo chiamano "il risveglio".

Stasera la campana ha suonato due volte. Il secondo rintocco porta il nome di **Mara Venn**, la sorella di Elia, morta da sette anni.

Nella valle oltre le mura sorge la **Torre dei Rintocchi**, custodia dei ricordi dei defunti. La città sopravvive cancellando il dolore dalla memoria dei suoi abitanti. Mara, da viva, ha attraversato quel confine per restarci e impedire che i ricordi venissero spenti.

Il gruppo di Elia deve scegliere il proprio finale:

- **Resta nell'oblio** — un mondo senza sofferenza, ma anche senza memoria e amore autentico.
- **Accetta la memoria** — riportare il ricordo, accettando il lutto e la mortalità.
- E se il gruppo cade… anche i loro nomi vengono cancellati.

## Personaggi

| Personaggio | Ruolo | Conflitto |
|---|---|---|
| **Elia Venn** | Protagonista | Vuole riportare Mara tra i vivi, ma teme che il suo desiderio sia solo l'incapacità di accettare la perdita. |
| **Toma** | Ex guardiano della torre | Odia Elia perché suo fratello è morto in una spedizione simile. Ma la sua rabbia nasconde la stessa paura di dimenticare. |
| **Iria** | Musicista senza memoria | Ha smesso di suonare per paura di arrivare alla fine della sua canzone: di scoprire chi era prima di dimenticare. |
| **Il Custode del Rintocco** | Antagonista | Tragico e quasi gentile: convinto che la morte sia un errore correggibile, disposto a cancellare ogni sofferenza, anche al prezzo dell'identità. |
| **Renzo** | Rintoccante della soglia | Prigioniero del silenzio: non suonò la campana quando Sole cadde. Non chiede aiuto, chiede che si dica il suo nome. |
| **Adele** | Custode della lanterna della soglia | Accende ancora la luce per una figlia che non tornerà. Ricorda che i calori restano, anche quando i nomi svaniscono. |
| **Nino** | Bambino nella Sala dei Nomi | Custodisce la ninna nanna che Iria compose e dimenticò. Restituisce a chi ha perso la memoria un frammento di sé. |
| **Cera** | Accordatrice dei rintocchi | Sente la torre "stonata": ogni campana ha perso una nota. Allarga la cassa del party perché le voci tengano di più. |
| **Argo** | Maestro dei colori nella Galleria | Dipinge i volti dei morti per salvarli e cancella quelli che fanno troppo male. Non ha mai amato nessuno da vivo. |
| **Araldo** | Il disertore della Cripta | Era con il fratello di Toma l'ultima notte, e fuggì quando le campane suonarono per lui. Non ha mai smesso di correre. |
| **Notturno** | Ultimo guardiano della Cripta | Vigila sulle ore piccole per una promessa, non per ordine. Tramanda a Elia il suono che un nome fa prima di tacere. |
| **Sibilla** | Guida della Vetta | Le sue profezie sono già avvenute. Rivela a Elia che il secondo rintocco annunciava anche il suo vuoto, non solo la morte di Mara. |

## Come si gioca

### Avvio

Il gioco richiede Node.js (qualsiasi versione recente) per il server statico:

```bash
cd echoes-of-the-last-dawn
node server.mjs
```

Poi apri nel browser: **http://localhost:8080**

In alternativa, il porto si può cambiare con la variabile d'ambiente:

```bash
PORT=9000 node server.mjs
```

### Controlli

| Azione | Input |
|---|---|
| Muoversi in esplorazione | `W A S D` o frecce (tastiera) / joystick virtuale (touch) |
| Conferma / prosegui | `Spazio` o `Invio` |
| Parry | `Spazio` o pulsante **PARA** |
| Azioni in battaglia | Clic sui pulsanti |

### Esplorazione

Dopo l'introduzione controlli Elia nelle sale della Torre dei Rintocchi con la camera in terza persona. La mappa di ogni zona è ampia e tematica: **prati, colonne e lapidi, tele da cavalletto, cripta con candele e arcate, vetta innevata con la campana di Mara**. Il colore del suolo, della nebbia e delle luci cambia con la zona.

In ogni zona ci sono **figure da avvicinare**: i personaggi secondari (con cui parlare e sbloccare sottotrame e ricompense) e la luce del nemico all'orizzonte (che innesca lo scontro). L'avanzata attraversa cinque zone:

1. **La Soglia** — incontri Renzo, Adele e l'Eco del Guardiano.
2. **La Sala dei Nomi** — incontri Nino, Cera e La Dimenticata.
3. **La Galleria delle Voci** — incontri Argo e La Maestra del Chiaroscuro.
4. **La Cripta dei Debiti** — incontri Araldo, Notturno e Il Giudice di Bronzo.
5. **La Vetta** — incontri Sibilla, il Custode del Rintocco e la scelta finale.

Parlare con i personaggi non è obbligatorio, ma dona abilità e potere:
- **Renzo** → Toma impara la **Veglia Infinita** e l'Essenza massima cresce a 115.
- **Adele** → l'Essenza massima cresce di altri 10.
- **Nino** → Iria impara la **Ninna Nanna**.
- **Cera** → tutti i PV massimi crescono di 12.
- **Argo** → Elia impara **Nome Scolpito**.
- **Araldo** → Toma impara la **Redenzione**, una cura per tutto il party.
- **Notturno** → Elia impara **Rintocco della Mezzanotte**.
- **Sibilla** → l'Essenza massima cresce di altri 10.

### Combattimento

- Il party è composto da **Elia, Toma e Iria**, ciascuno con la propria barra vita.
- Ogni turno **ogni personaggio agisce una volta**; quando tutti hanno agito, tocca al nemico.
- L'**Essenza** (barra blu) alimenta le tecniche; si rigenera di 5 punti a turno.

| Personaggio | Abilità | Effetto |
|---|---|---|
| Elia | Lama del Ricordo | Attacco gratuito |
| Elia | Rintocco Perduto | Attacco pesante (18 Essenza) |
| Elia | *Nome Scolpito* | Attacco pesantissimo, sbloccato da Argo (16 Essenza) |
| Elia | *Rintocco della Mezzanotte* | L'attacco più potente del party, sbloccato da Notturno (22 Essenza) |
| Toma | Pugno della Vigilanza | Attacco gratuito |
| Toma | Scudo del Guardiano | Assorbe il colpo nemico successivo |
| Toma | Oblio | Danno + attacco nemico indebolito |
| Toma | *Veglia Infinita* | Attacco del party potenziato, sbloccata da Renzo (12 Essenza) |
| Toma | *Redenzione* | Cura tutto il party, sbloccata da Araldo (18 Essenza) |
| Iria | Nota Tagliente | Attacco gratuito |
| Iria | Melodia | Cura il compagno più ferito |
| Iria | Risonanza | Attacco del party potenziato |
| Iria | *Ninna Nanna* | Cura molto più potente, sbloccata da Nino (16 Essenza) |

#### Parry

Quando il nemico attacca appare un **anello che si chiude** sul centro dello schermo.

- La zona **dorata** indica il momento perfetto.
- Premi `Spazio` (o **PARA**) dentro la zona dorata: **parry perfetto** → il colpo è annullato e il nemico subisce un contrattacco.
- Premi fuori dalla zona dorata: **parata imperfetta** → danni ridotti del 60%.
- Non premere: subisci il colpo intero.

Le tecniche **Scudo** e **Oblio** riducono ulteriormente i danni subiti.

### Boss

- **L'Eco del Guardiano** — primo scontro, insegna il parry.
- **La Dimenticata** — canta un numero che non sa più a chi appartenga; al 50% dei PV il suo lamento la rende più feroce.
- **La Maestra del Chiaroscuro** — ridipinge le proprie ferite al 50% dei PV e colpisce più forte.
- **Il Giudice di Bronzo** — una campana che giudica i colpevoli; al 50% dei PV il suo verso diventa più feroce e cura le sue crepe.
- **Il Custode del Rintocco** — al 50% dei PV innesca un dialogo e una seconda fase più feroce (si cura e colpisce più forte).

### Finali

Tre finali diversi in base alla scelta finale e agli esiti degli scontri. L'oblio e la memoria coinvolgono il destino di Renzo, Adele, Nino, Cera, Argo, Araldo, Notturno e Sibilla.

## Caratteristiche tecniche

- **Zero dipendenze a runtime**: Three.js è bundle localmente in `vendor/three.module.js` — il gioco funziona completamente offline.
- **HTML + CSS + JavaScript** puri (ES Modules), nessun framework.
- **Three.js** (~150 KB gzip) per la scena 3D: personaggi low-poly costruiti da primitive, **mappe ampie e tematiche per zona** (alberi, colonne, lapidi, tele, arcate, candele, cripta, vetta innevata), torre sullo sfondo, particelle, ombre.
- Animazioni in stile Pokémon: idle che ondeggia, affondo in attacco, lampo al colpo subito, caduta al KO.
- **Canvas 2D** dedicato per l'indicatore di parry (anello di precisione).
- Narrativa con effetto macchina da scrivere e narrazione a tappe.
- Responsive e giocabile su mobile (tasto PARA on-screen).
- Nessun asset esterno, nessuna chiamata di rete.

## Struttura dei file

```
echoes-of-the-last-dawn/
├── index.html          # struttura e importmap
├── styles.css          # interfaccia e tema
├── server.mjs          # server statico (Node.js, senza dipendenze)
├── package.json
├── vendor/
│   └── three.module.js # Three.js locale (offline)
└── src/
    ├── main.js         # avvio, loop di gioco, flusso della storia
    ├── scene.js        # scena 3D, personaggi, animazioni, particelle
    ├── combat.js       # macchina a stati del combattimento e parry
    ├── story.js        # trama, dialoghi, finali, dati dei personaggi
    └── ui.js           # schermate, narrazione, scelte, finali
```