# FRIENDS TYCOON — Impero del Divertimento

Un gruppo di amici, una casa mezza distrutta e €1.000. L'obiettivo: trasformare tutto
in un **Impero del Divertimento**. Idle tycoon comico, 100% client-side, senza librerie.

> "Abbiamo iniziato con una casa mezza distrutta e adesso possediamo mezzo mondo."

## Come si gioca

Basta aprire `index.html` (funziona anche dal file system). Oppure da server:

```bash
python3 -m http.server 8000
# apri http://localhost:8000
```

**Meccanica base**
- Il calendario è settimanale: **Lun–Ven** gli amici lavorano (stipendio!) e sono liberi
  solo **sera e notte**; nel **weekend** sono liberi tutto il giorno.
- La **Casa** è una vista 3D in tempo reale (mini-motore su Canvas, zero librerie):
  i personaggi stilizzati **vagano per la stanza** e quando si svolge un'attività si
  spostano nella zona giusta — cucina per pizza/cena, divano per film/serata tranquilla,
  piscina per la piscina, porta per chi parte per un viaggio. Trascina col dito per
  ruotare la camera.
- Nel tab **🎉 Eventi** scegli un'attività, i partecipanti, e organizzi: costi, felicità,
  reputazione, energia, skill che contano e **eventi casuali** (spesso assurdi).
- Con i soldi compri **auto** (i posti contano davvero: se non bastano, si paga il taxi),
  **case** più grandi e **upgrade** delle stanze (Divano → *Portale dimensionale del relax*).
- Ogni attività ha un **minigioco** coerente con l'occasione: dadi (Gaming, Festa,
  Viaggio…), reazione a tempo (Tuffo Perfetto, Resta Sveglio, Assolo Epico…), memoria
  (la Ricetta Segreta) e veri **giochi d'azzardo** (Gratta e Vinci, Lo Spritz Raddoppia,
  Posta sul Campione): vincere moltiplica felicità e reputazione e può portare soldi.
- Gli **amici** hanno abilità assurde (Chef, GPS Umano, Scrocco Professionista…) e ognuno ha un
  **potere speciale** unico (Cerimoniere, Salsa Segreta, Sistema Gando…) che cambia davvero il gioco.
- Il gruppo si **sblocca man mano**: all'inizio si parte in 4 (Dario, Armandino, Doris, Tommy),
  gli altri si uniscono raggiungendo obiettivi (reputazione, case) e pagando un invito.
- Le **missioni** guidano la progressione; i **soldi** si fanno con gli stipendi, gli
  affitti delle proprietà e tornando a giocare (sistema **idle**: al rientro arriva il
  riepilogo "BENTORNATO!").

**Cheat di debug (tastiera)**: `F1` = +€9.999 e tutti riposati · `F2` = avanza di un turno.

## Struttura

```
index.html                # shell + ordine dei <script>
style.css                 # UI mobile-first, portrait+landscape
data/                     # TUTTO data-driven (oggetti JS centralizzati)
  balance.js              # costanti economiche: stipendi, curve, soglie
  characters.js           # 14 amici + registro skill assurde
  houses.js               # 5 proprietà + stanze upgradeabili
  vehicles.js             # 8 auto + taxi
  activities.js           # 18 attività con costi/requisiti/eventi
  minigames.js            # 1 minigioco per ogni attività (dadi, reazione, memoria, azzardo)
  randomevents.js         # 20 eventi casuali pesati
  missions.js             # 12 missioni
  scenes.js               # layout 3D di ogni casa + zone + coreografia attività
js/
  state.js                # G globale, lookups, RNG, newGame(), missioni
  time.js                 # calendario, fasce orarie, avanzamento, stipendi
  audio.js                # WebAudio procedurale: cha-ching, fanfare, suoni comici
  save.js                 # autosave, manuale, reset, import/export base64
  idle.js                 # progressi offline + schermata BENTORNATO!
  characters.js           # XP/livelli, umore, relazioni
  economy.js              # stipendi, sconti skill, acquisti (case/auto/upgrade/inviti)
  sim.js                  # simulazione attività: costi → output → eventi → ricompense
  minigame.js             # motore dei minigiochi: 5 tipi (dice, catch, double, scratch, sequence)
  render3d.js             # mini-motore 3D su Canvas: proiezione, quads, camera orbit
  charscene.js            # personaggi stilizzati: vagabondaggio + coreografia attività
  ui.js                   # viste DOM, popup risultato, toast, ticker
  main.js                 # bootstrap, loop 3D, idle all'avvio, cheat
tools/
  check.js                # valida sintassi + schema di tutti i dati
  smoke.js                # simula una partita completa in Node (stub DOM)
```

## Sviluppo

```bash
node tools/check.js    # validazione statica (sintassi + schema dati)
node tools/smoke.js    # partita completa simulata (no browser, zero errori runtime)
```

Entrambi devono terminare con successo prima di una modifica. **Per aggiungere contenuti**
basta modificare i file in `data/`: nuovi personaggi, case, auto, attività ed eventi si
integrano senza toccare il motore.