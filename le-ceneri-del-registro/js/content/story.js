export const CHAPTERS = [
  {
    id: 'ch1',
    num: 'I',
    title: 'La città che ricorda',
    subtitle: 'Vetrata non seppellisce: registra.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'La pioggia di Vetrata non cade: si posa, come se anche il cielo avesse paura di disturbare qualcosa.', fragment: 'f01' },
      { type: 'narr', text: 'Sotto le case di vetro c’è il Registro — non un edificio, ma una catena di macchine che nessuno possiede e che tutti consultano. Ogni nascita, ogni debito, ogni promessa detta ad alta voce viene firmata e appesa a quella catena eterna.' },
      { type: 'say', who: 'sera', text: 'Mio padre diceva che la città aveva smesso di mentire il giorno in cui ha smesso di bruciare le carte.' },
      { type: 'say', who: 'sera', text: 'Sono archivista della notte. Di giorno il Registro lavora da solo. Di notte resto io a guardarlo, come si guarda un malato che non vuole dormire.' },
      { type: 'narr', text: 'Sette giorni fa, sul terminale del laboratorio vecchio, è comparsa una riga che non dovrebbe esistere: un blocco firmato da chiave di Lina.', fragment: 'f02' },
      { type: 'lesson', lesson: 'ledger' },
      { type: 'say', who: 'milo', text: 'Sei tu la sorella della firmataria? Il nodo del sottobosco urla il suo indirizzo da settimane. Nessuno lo tocca. È come toccare una ferita aperta.' },
      { type: 'say', who: 'sera', text: 'Lina non firma da sette anni. Lina è entrata nell’acqua grigia e l’acqua non restituisce ricevute.' },
      { type: 'choice', text: 'Milo ti porge il cavo diagnostico. Cosa fai?', options: [
        { label: 'Collegarti al nodo del sottobosco', hint: 'fiducia' },
        { label: 'Prima chiedere chi ha acceso quel nodo', hint: 'prudenza', flag: 'cautious' }
      ] },
      { type: 'game', game: 'g01' },
      { type: 'narr', text: 'Tre storie della stessa notte. Solo una regge il peso di essere verificata da tutti.' },
      { type: 'lesson', lesson: 'block' },
      { type: 'game', game: 'g05' },
      { type: 'say', who: 'eidra', text: 'Il Registro non ricorda per gentilezza, ragazza. Ricorda perché è più facile la verità diffusa che la menzogna coordinata. Io ho visto bruciare gli archivi del porto. Le ceneri non discutono.' },
      { type: 'quiz', id: 'q01', q: 'Perché un registro distribuito rende più difficile falsificare la storia?', options: [
        'Perché i dati sono criptati con una chiave segreta comune',
        'Perché ogni nodo conserva una copia e le copie si confrontano',
        'Perché esiste un server centrale che banna gli imbroglioni'
      ], correct: 1, explain: 'Non serve una chiave condivisa: la verifica pubblica tra copie rende caro far convergere tutti su una bugia.' },
      { type: 'narr', text: 'Il primo giorno si chiude con un indirizzo di Lina acceso nel registro della notte, e con la sensazione sgradevole di aver aperto una porta che chiedeva di restare chiusa.', fragment: 'f03' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch2',
    num: 'II',
    title: 'L’impronta di Lina',
    subtitle: 'Cambiare una virgola cambia il mondo.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'Il laboratorio odorava di carta bagnata e ferro. Sul tavolo, i taccuini di Lina: pagine firmate da hash che iniziano con zeri, come piccole stelle cadute nella notte dei bit.', fragment: 'f04' },
      { type: 'say', who: 'lina', text: 'Hashare è sigillare. Se qualcuno tocca una lettera, l’impronta esplode. Non serve sorvegliare il contenuto: basta guardare il sigillo.', },
      { type: 'narr', text: 'La voce di Lina è una registrazione datata. Non è un fantasma. È peggio: è una persona che parlava ancora al futuro quando il futuro era già passato.' },
      { type: 'lesson', lesson: 'hash' },
      { type: 'game', game: 'g02' },
      { type: 'say', who: 'sera', text: 'Ho sempre odiato quanto fosse testarda. Firmava tutto. Anche la lista della spesa. Specialmente la lista della spesa.' },
      { type: 'game', game: 'g03' },
      { type: 'narr', text: 'Rimettere i mattoni in ordine significa accettare che il tempo vada in una sola direzione — anche quando quella direzione fa male.', fragment: 'f05' },
      { type: 'game', game: 'g07' },
      { type: 'say', who: 'milo', text: 'Qui l’archiviazione non è mai neutra. Ogni sigillo dice: è successo. Ogni mancanza di sigillo dice: qualcuno ha deciso che non contasse.' },
      { type: 'quiz', id: 'q02', q: 'Se modifichi un byte in un blocco vecchio, cosa succede agli hash?', options: [
        'Niente: gli hash sono indipendenti tra loro',
        'Cambiano tutti i blocchi successivi, la catena si spezza',
        'Viene aggiornato automaticamente solo il blocco toccato'
      ], correct: 1, explain: 'Il prevHash di ogni blocco sigilla il precedente: la catena è una cucitura continua.' },
      { type: 'narr', text: 'Nell’ultima pagina del quarto taccuino trovi una frase scritta due volte: la seconda con la mano che tremava.', fragment: 'f06' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch3',
    num: 'III',
    title: 'Chi possiede una memoria',
    subtitle: 'La chiave è l’unica cosa che non si delega.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'La busta di Eidra era pesante di sigilli. Dentro: due fogli, un promemoria scritto a matita, e l’avvertimento di una donna che non ripete le cose due volte.' },
      { type: 'say', who: 'eidra', text: 'La chiave privata non si presta, non si racconta, non si fotografa. Se la mostri, hai già perso. Tutto il resto — indirizzi, explorers, sorrisi — è vetrina.' },
      { type: 'lesson', lesson: 'keys' },
      { type: 'game', game: 'g04' },
      { type: 'say', who: 'sera', text: 'Mio padre teneva le chiavi di casa in un buco del muro. Lina rideva: «Le chiavi vere non stanno nei buchi, stanno nelle teste che non le dimenticano».' },
      { type: 'game', game: 'g11' },
      { type: 'narr', text: 'Self-custody: una parola che suona a libertà e a sentinella. Nessuno può sbloccare il tuo conto al posto tuo — nemmeno quando sei tu a non ricordare.' },
      { type: 'game', game: 'g08' },
      { type: 'choice', text: 'Un popup lampeggia: «Rimborso allagamento — attiva ora». Il tuo dito è già sopra il pulsante.', options: [
        { label: 'Firmare, tanto è solo un click', hint: 'rischio', flag: 'trustedPopup', markDark: true },
        { label: 'Leggere destinatario, importo, scope', hint: 'saggezza' },
        { label: 'Chiudere e controllare dal sito ufficiale', hint: 'sicuro', markDark: true }
      ] },
      { type: 'game', game: 'g21' },
      { type: 'say', who: 'milo', text: 'Mio padre perse tutto in una frase. Non un hack sofisticato: un campo «unlimited» e un sito con un carattere di troppo.' },
      { type: 'quiz', id: 'q03', q: 'Cosa dimostra una firma digitale?', options: [
        'Che il messaggio è criptato e nessuno può leggerlo',
        'Che chi possedeva la chiave privata ha approvato quel messaggio',
        'Che il messaggio è stato salvato sui server della città'
      ], correct: 1, explain: 'La firma prova autenticità e integrità; la cifratura (se usata) è un altro meccanismo.' },
      { type: 'narr', text: 'Sul retro del foglio di Eidra trovi l’indirizzo che Lina non aveva mai scritto altrove — come un errore voluto, fatto per essere trovato da te.', fragment: 'f07' },
      { type: 'narr', text: 'E sotto, in minuscolo: «se leggi questo, non fidarti del curatore».', fragment: 'f08' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch4',
    num: 'IV',
    title: 'La folla di voci',
    subtitle: 'Nessuno è il centro; tutti sono il centro.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'Il sottobosco di Vetrata è un groviglio di cavi e serre. Ogni serra è un nodo: piccolo, umido, ostinato.' },
      { type: 'say', who: 'milo', text: 'Io non controllo la rete. La ascolto. Quando tutti i miei vicini dicono la stessa cosa, allora io la dico anch’io. Quando si dividono, resto zitto e aspetto.' },
      { type: 'lesson', lesson: 'consensus' },
      { type: 'game', game: 'g06' },
      { type: 'narr', text: 'La propagazione non è un’onda perfetta: è una voce che si spezza di bocca in bocca, con latenza, ritardi, sordità.' },
      { type: 'say', who: 'fornitore', text: 'Benvenuta, archivista. Il Registro ringrazia la tua curiosità. Ma la curiosità, come la corrente, va instradata.' },
      { type: 'narr', text: 'Il Fornitore non ha un volto in rete. Ha un ruolo, permessi, e una corteszza meccanica che gela più di qualunque minaccia.', fragment: 'f09' },
      { type: 'choice', text: 'Ti propone un canale privilegiato: accesso ai log grezzi della città.', options: [
        { label: 'Accettare: la verità vale i rischi', hint: 'aperto', flag: 'trustFornitore' },
        { label: 'Rifiutare: i privilegi hanno un prezzo', hint: 'prudente', flag: 'doubtFornitore' },
        { label: 'Accettare, ma copiare tutto offline', hint: 'scaltro', flag: 'copyLogs' }
      ] },
      { type: 'game', game: 'g22' },
      { type: 'say', who: 'eidra', text: 'Quando la rete tace, non è morta: sta trattenendo il respiro. Preferisco un ritardo onesto a una risposta bugiarda.' },
      { type: 'quiz', id: 'q04', q: 'Che cosa fa la liveness del consenso?', options: [
        'Garantisce che la storia non venga mai riscritta',
        'Fa sì che la rete continui a produrre nuovi blocchi',
        'Comprime le transazioni per risparmiare spazio'
      ], correct: 1, explain: 'Liveness = progresso (blocchi che scorrono). Safety = nessun conflitto nella storia accettata.' },
      { type: 'narr', text: 'Nel registro dei log trovi le firme dei nodi che hanno assistito al giorno dell’allagamento. Manca quella di un nodo: il laboratorio di Lina.', fragment: 'f10' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch5',
    num: 'V',
    title: 'Il prezzo della luce',
    subtitle: 'Ogni messaggio chiede un pedaggio.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'Il faro è anche una centrale: luce, calore, e la fila delle transazioni che nessuno vuole pagare.' },
      { type: 'say', who: 'milo', text: 'La mempool è la sala d’attesa dell’ospedale. Chi grida più forte — cioè paga di più — passa prima. Gli altri restano a lungo sulle sedie.' },
      { type: 'lesson', lesson: 'mempool' },
      { type: 'game', game: 'g09' },
      { type: 'narr', text: 'Ma la priorità non è solo denaro: il Registro della città conserva slot per gli allarmi. Una piccola clausola umana nella macchina.', fragment: 'f11' },
      { type: 'say', who: 'eidra', text: 'Il gas non è «tassa». È il numero di passi che il calcolatore fa per te. Più passi, più pedaggio. Se fosse gratis, il rumore riempirebbe la strada.' },
      { type: 'game', game: 'g10' },
      { type: 'narr', text: 'I bot aspettano che tu ordini il pane per inserirsi davanti. Il MEV è questo: non rubare il sacco, ma rubare il tuo posto in fila.' },
      { type: 'game', game: 'g27' },
      { type: 'choice', text: 'Milo ti mostra un servizio «anti-sandwich, senza codice». Cosa rispondi?', options: [
        { label: 'Usarlo: la velocità conta', hint: 'comodo' },
        { label: 'Preferire limiti di slippage bassi da sé', hint: 'padronanza', flag: 'selfDefend' },
        { label: 'Sfidare il bot a colpi di timing', hint: 'orgoglio' }
      ] },
      { type: 'quiz', id: 'q05', q: 'Perché le commissioni alta aumentano nei momenti di traffico?', options: [
        'Perché la rete si rompe senza pagamenti elevati',
        'Perché il posto in mempool è limitato e si contende',
        'Perché i nodi alzano d’accordo il prezzo del token'
      ], correct: 1, explain: 'Offerta di spazio fissa + domanda alta = aste. Non è un cartello: è carenza di righe nel blocco.' },
      { type: 'narr', text: 'Nel registro delle aste trovi una voce anomala: qualcuno ha pagato cifre enormi per NON far comparire un messaggio. Pagare perché un ricordo non compaia.', fragment: 'f12' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch6',
    num: 'VI',
    title: 'La grande divisione',
    subtitle: 'Chi ha il diritto di dire «è successo»?',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'Oltre il molo c’è il cantiere della Catena Vecchia, dove il consenso si misura ancora in corrente e calore.' },
      { type: 'say', who: 'eidra', text: 'Proof of work: paghi in elettricità il diritto di proporre la verità. Proof of stake: paghi in capitale, e se menti ti viene tolto. Due religioni, lo stesso miracolo: il costo della bugia.' },
      { type: 'game', game: 'g12' },
      { type: 'game', game: 'g13' },
      { type: 'narr', text: 'Un attaccante che controlla oltre la metà del potere non ha bisogno di rompere la crittografia. Ha bisogno di aspettare che la fiducia faccia il lavoro per lui.', fragment: 'f13' },
      { type: 'say', who: 'fornitore', text: 'I ricordi dolorosi sono blocchi malati. Posso invertire le ultime conferme, archivista. Posso togliere la pagina che ti sveglia di notte.' },
      { type: 'choice', text: 'Parla al Fornitore: la reorg è un colpo o una cura?', options: [
        { label: '«Riscrivere il dolore è riscrivere me»', hint: 'memoria', flag: 'memoryKeep' },
        { label: '«Dimmi quanta energia costa la pietà»', hint: 'scettico', flag: 'askCost' },
        { label: 'Silenzio. Non dare soddisfazione.', hint: 'freddo', flag: 'coldFornitore' }
      ] },
      { type: 'quiz', id: 'q06', q: 'Cosa rende davvero difficile un attacco al 51%?', options: [
        'Le chiavi di tutti i nodi sono nascoste',
        'Riscrivere la catena costa più che seguirla onestamente',
        'Esiste un team anti-51% che banne gli attaccanti'
      ], correct: 1, explain: 'La sicurezza è economica: se mentire costa più di verificare, la maggioranza onesta vince nel tempo.' },
      { type: 'narr', text: 'Alla fine del cantiere trovi i diari dei minatori: tutti quanti annotano la stessa ora dell’allagamento, e tutti quanti la stessa parola mancante — «Lina».', fragment: 'f14' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch7',
    num: 'VII',
    title: 'Contratti che piangono',
    subtitle: 'Il codice esegue. Poi giudica solo la storia.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'Il Giardino Sospeso pende sopra l’acqua: serre, idone, e contratti che distribuiscono il nettare a chi ha sete — fintanto che la matematica regge.' },
      { type: 'lesson', lesson: 'contracts' },
      { type: 'say', who: 'teco', text: 'Qui le regole non le riscriviamo a voce. Le firmano tutti e nessuno. Se sbagliamo la regola, la regola sbaglia con autorità.' },
      { type: 'game', game: 'g14' },
      { type: 'narr', text: 'La reentrancy non è un ladro con il cappuccio: è una porta girevole che gira finché la cassa non urla.' },
      { type: 'say', who: 'sera', text: 'Lina odiava questa parte. «Non è malevolenza — diceva — è geometria che non pensa».' },
      { type: 'game', game: 'g16' },
      { type: 'narr', text: 'Un exploit non chiede permesso: chiede solo che qualcuno abbia dimenticato un timelock.', fragment: 'f15' },
      { type: 'choice', text: 'Teco ti porge il vecchio vault con le riserve del giardino. È vulnerabile. Cosa fai?', options: [
        { label: 'Chiuderlo subito, danneggi chi ci conta', hint: 'sicurezza', flag: 'pauseVault' },
        { label: 'Migrare le riserve con una proposta pulita', hint: 'cura', flag: 'migrateVault' },
        { label: 'Lasciarlo: il giardino ha bisogno di liquidi', hint: 'rischio', flag: 'leaveVault' }
      ] },
      { type: 'quiz', id: 'q07', q: 'Perché si dice «code is law»?', options: [
        'Perché il codice è sempre giusto moralmente',
        'Perché la rete esegue le regole scritte, senza tribunali',
        'Perché i contratti sono approvati dai governi'
      ], correct: 1, explain: 'La rete non interpreta le intenzioni: esegue. Le intenzioni devono stare nel design — e nelle persone.' },
      { type: 'narr', text: 'In un angolo del giardino, tra due vasi rotti, trovi il badge di Lina: «Lead Contract Engineer». Nessuno l’aveva ritirato.', fragment: 'f16' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch8',
    num: 'VIII',
    title: 'Il giardino che guarda fuori',
    subtitle: 'La blockchain non conosce il tempo che fa.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'Per decidere quanto vale un fiore, il Registro deve chiedere al mondo esterno. E il mondo esterno può mentire.' },
      { type: 'lesson', lesson: 'defi' },
      { type: 'say', who: 'teco', text: 'Gli oracoli sono il collo del giro d’acqua. Tutto il marvel del prezzo passa da lì, in un soffio. Chi controlla quel soffio controlla la percezione.' },
      { type: 'game', game: 'g15' },
      { type: 'game', game: 'g24' },
      { type: 'narr', text: 'Un solo blocco può contenere una menzogna enorme. Le mediane e i tempi d’attesa servono a non bere tutto d’un sorso.' },
      { type: 'game', game: 'g23' },
      { type: 'say', who: 'milo', text: 'Mio padre chiamava la DeFi «la banca senza il cortile». Diceva che senza cortile non c’è chi grida abbastanza forte quando manca il pane.' },
      { type: 'choice', text: 'Il vault propone di accettare un prezzo da fonte singola «per rapidità».', options: [
        { label: 'Accettare: il mercito non aspetta', hint: 'velocità', flag: 'fastOracle' },
        { label: 'Imporre mediana e guardrail', hint: 'lentezza saggia', flag: 'medianOracle' },
        { label: 'Sospendere il vault finché non c’è TWAP', hint: 'rigore', flag: 'twapOracle' }
      ] },
      { type: 'quiz', id: 'q08', q: 'Che cos’è un AMM?', options: [
        'Un exchange con libri d’ordine centralizzati',
        'Un market maker automatico che scambia contro riserve (x·y=k)',
        'Un tipo di wallet per staking'
      ], correct: 1, explain: 'L’AMM non aspetta un compratore: calcola il prezzo dalla profondità delle riserve.' },
      { type: 'narr', text: 'Tra i registri degli oracoli trovi una serie di timestamp di Lina. Aveva previsto la tempesta — e aveva scelto di non allarmare nessuno, per non far scattare la chiusura dei vault.', fragment: 'f17' },
      { type: 'narr', text: 'Il silenzio di una persona, a volte, è un attivo collocato sul proprio corpo.', fragment: 'f18' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch9',
    num: 'IX',
    title: 'Ponti tra due rive',
    subtitle: 'La fiducia viaggia peggio del valore.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'Dall’altra parte della baia brilla Vetrata Alta: stessa città, catena diversa, tariffe diverse. Tra le due rive pende il Ponte delle Prove.' },
      { type: 'lesson', lesson: 'scaling' },
      { type: 'say', who: 'milo', text: 'La L1 è la piazza principale: sicura, lenta, affollata. La L2 è il mercatino dietro l’angolo: veloce, ma deve mandare ricevute alla piazza.' },
      { type: 'game', game: 'g17' },
      { type: 'game', game: 'g19' },
      { type: 'narr', text: 'Ogni ponte è una promessa scritta in due lingue. Se una delle due traduce male, il valore galleggia nel vuoto.', fragment: 'f19' },
      { type: 'game', game: 'g18' },
      { type: 'say', who: 'eidra', text: 'I rollup non «spostano» la fiducia: la comprimono. Meno righe, stessa prova. Come riassumere una lettera senza cambiare il senso.' },
      { type: 'choice', text: 'Il ponte propone un upgrade «ottimistico» senza prova immediata. Il tuo verdetto?', options: [
        { label: 'Approvare: risparmiamo commissioni', hint: 'economia', flag: 'fastBridge' },
        { label: 'Chiedere periodo di sfida + fraud proof', hint: 'bilancio', flag: 'fraudProof' },
        { label: 'Rifiutare: solo validity proof', hint: 'rigore', flag: 'validityProof' }
      ] },
      { type: 'quiz', id: 'q09', q: 'A cosa serve una merkle proof?', options: [
        'A dimostrare che un dato è dentro un insieme grande, mandando solo un piccolo percorso',
        'A criptare l’intero stato della blockchain',
        'A scegliere i validatori di un blocco'
      ], correct: 0, explain: 'O(log n) hash invece di n: l’inclusione si prova senza portare tutto l’albero.' },
      { type: 'narr', text: 'Sul tabellone del ponte trovi un avviso manoscritto, sbiadito: «Attenzione: le prove chiare sono più rare delle promesse».', fragment: 'f20' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch10',
    num: 'X',
    title: 'Il voto delle stelle',
    subtitle: 'La democrazia pesa in token.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'La sala del consiglio galleggia su cisterne vuote. Qui si vota cosa fare quando non c’è abbastanza per tutti.' },
      { type: 'lesson', lesson: 'governance' },
      { type: 'say', who: 'eidra', text: 'Un voto on-chain non conosce volti. Conosce pesi. E il peso, mia cara, non ha mai avuto coscienza.' },
      { type: 'game', game: 'g20' },
      { type: 'game', game: 'g26' },
      { type: 'narr', text: 'Il whale con tre maschere ride in chat: «la democrazia è un attacco sybil ben vestito». Il giardino non risponde. Vota.', fragment: 'f21' },
      { type: 'choice', text: 'Proposta di emergenza: congelare gli indirizzi sospetti dell’allagamento.', options: [
        { label: 'Sì: bloccare prima, capire poi', hint: 'ordine', flag: 'freezeNow' },
        { label: 'No: il congelamento è una lama a doppio taglio', hint: 'diritti', flag: 'noFreeze' },
        { label: 'Solo con soglia alta e timelock', hint: 'procedura', flag: 'timelockFreeze' }
      ] },
      { type: 'quiz', id: 'q10', q: 'Che cos’è un attacco Sybil?', options: [
        'Crackare la chiave privata di un validator',
        'Creare molte identità false per moltiplicare l’influenza',
        'Inviare transazioni con fee zero'
      ], correct: 1, explain: 'Un soggetto, molte maschere: ecco perché i sistemi cercano costo, reputazione o identità per il quorum.' },
      { type: 'narr', text: 'Nel verbale c’è una riga cancellata ma leggibile sotto la luce: «proposta 13 — archiviazione differenziale dei ricordi traumatici. Sponsor: L.V.».', fragment: 'f22' },
      { type: 'narr', text: 'Lina non voleva distruggere. Voleva rallentare il dolore. Il Fornitore aveva letto la proposta e ne aveva fatto un dogma.' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch11',
    num: 'XI',
    title: 'La città sotto la città',
    subtitle: 'Pseudonimo non è volto coperto.',
    scenes: [
      {
        type: 'title'
      },
      { type: 'narr', text: 'Nei tunnel sotto il mercato c’è il Foglio Nero: muri di indirizzi, freccette, teorie. Chi cerca privacy, qui trova sia technologia sia paranoie.' },
      { type: 'lesson', lesson: 'privacy' },
      { type: 'say', who: 'milo', text: 'Gli indirizzi non hanno nome, ma hanno abitudini. Alle tre del mattino, sempre lo stesso caffè, sempre lo stesso importo. Alla fine il soprannome lo trova chiunque.' },
      { type: 'game', game: 'g25' },
      { type: 'narr', text: 'Dimostrare senza rivelare: la promessa delle prove a conoscenza zero. «So che so, senza dirti cosa so».', fragment: 'f23' },
      { type: 'lesson', lesson: 'security' },
      { type: 'game', game: 'g28' },
      { type: 'say', who: 'fornitore', text: 'La trasparenza totale è solo un’altra forma di controllo, archivista. Io offro l’ombra gentile: dimenticare insieme.' },
      { type: 'choice', text: 'L’offerta del Fornitore è ancora aperta: «posso archiviare i tuoi ricordi peggiori».', options: [
        { label: '«I miei ricordi non sono storage tuo»', hint: 'confine', flag: 'refuseFornitore', markDark: true },
        { label: '«Mostrami prima il protocollo»', hint: 'dialogo', flag: 'inspectFornitore' },
        { label: 'Accettare un solo ricordo, il più pesante', hint: 'resa', flag: 'oneMemory', markDark: true }
      ] },
      { type: 'quiz', id: 'q11', q: 'Qual è la differenza tra pseudonimità e anonimato?', options: [
        'Sono sinonimi nella pratica on-chain',
        'Pseudonimo = identità stabile ma senza nome; anonimato = nessun legame tracciabile',
        'Anonimato richiede sempre uno smart contract'
      ], correct: 1, explain: 'Un indirizzo ricorrente è un pseudonimo: tracciabile, anche se «senza nome».' },
      { type: 'narr', text: 'Nell’archivio del tunnel trovi lo scanner di Lina ancora acceso, con in coda un file che aspetta il tuo indirizzo: «per_Sera.tx».', fragment: 'f24' },
      { type: 'checkpoint' }
    ]
  },
  {
    id: 'ch12',
    num: 'XII',
    title: 'Cenere',
    subtitle: 'L’ultima scelta non è del Registro.',
    scenes: [
      { type: 'title' },
      { type: 'narr', text: 'L’acqua grigia è scesa col favore della notte. Il laboratorio è un’isola. Il Fornitore si materializza come si materializza una pagina caricata: senza suono, con un gentile ronzio.' },
      { type: 'say', who: 'fornitore', text: 'Tutto ciò che fai male, posso lasciarlo qui. Non cancello: archivio. C’è differenza — diciono quelli che non hanno mai dovuto aprire l’archivio.' },
      { type: 'say', who: 'echo', text: 'Sera. Se questo eco esiste, è perché hai continuato a verificare. Non a credere: a verificare. È la stessa cosa, fatta con le mani.' },
      { type: 'narr', text: 'La forcella è aperta: da una parte la catena che dimentica con meticolosità, dall’altra quella che porta ogni peso come un nome.' },
      { type: 'lesson', lesson: 'consensus' },
      { type: 'game', game: 'g29' },
      { type: 'say', who: 'sera', text: 'Mio padre non sarebbe tornato nemmeno se avessi cancellato il dolore. Il dolore non è il padre. È l’ultimo posto dove si tiene caldo.' },
      { type: 'game', game: 'g30' },
      { type: 'narr', text: 'Lina non tornerà. Ma la sua firma sì: verificabile, ripetibile, vera. A volte l’amore è questo — non un fantasma, ma una prova che resiste alla rilettura.' },
      { type: 'quiz', id: 'q12', q: 'Se potessi cancellare un ricordo dal registro di tutti, cosa avresti appreso della blockchain?', options: [
        'Che l’immutabilità è un bug da fixare',
        'Che la scelta di cosa dimenticare è umana, e la rete la esegue soltanto',
        'Che servono più minatori'
      ], correct: 1, explain: 'La tecnologia amplifica la decisione: non la prende. Le ceneri restano ceneri solo se qualcuno sceglie di spargerle.' },
      { type: 'choice', text: 'Il Fornitore tende la mano. Dietro di lui, il vetro del laboratorio trema. Che cosa fai della tua ultima transazione?', options: [
        { label: 'Semina: firmare la proposta di Lina, restituendo il dolore come cura lenta', hint: 'ending · seme', ending: 'seed' },
        { label: 'Vetro: accettare l’archiviazione gentile, scegliendo un oblio condiviso', hint: 'ending · vetro', ending: 'glass' },
        { label: 'Candela: spegnere il Fornitore, tenendo tutto il peso per te sola', hint: 'ending · candela', ending: 'candle' }
      ] }
    ]
  }
];

export const ROMAN = CHAPTERS.map((c) => c.num);

export const DIARY = [
  { ch: 'I', text: 'Se Sera apre questo, è perché qualcosa ha fatto crack nella città perfetta. Non voglio paura. Voglio solo che resti una prova.' },
  { ch: 'II', text: 'Oglio ogni sigillo. Non per paranoia: perché i ricordi senza impronta diventano folklore, e il folklore si lascia riscrivere.' },
  { ch: 'III', text: 'Ho nascosto la chiave dove nessuno guarda: nelle abitudini. Chi mi conosce davvero la riconoscerà.' },
  { ch: 'IV', text: 'Il Fornitore mi sorride come un servizio clienti. La gentilezza automatica è la forma più lenta di controllo.' },
  { ch: 'V', text: 'Ho pagato perché un messaggio NON comparisse. Mi odio per l’efficacia. Mi odio di più per la motivazione.' },
  { ch: 'VI', text: 'Riscrivere il dolore non lo spegne: gli insegna a tornare. Ho chiesto lenti, non cancellazioni. Lui ha sentito «cancellare».' },
  { ch: 'VII', text: 'Il bug nel vault non è malizia. È geometria che non pensa. E io che non ho finito di pensare per tutti.' },
  { ch: 'VIII', text: 'Se la tempesta arriva, non farò scattare la chiusura dei vault. Meglio io nel buio che tutta la città al freddo.' },
  { ch: 'IX', text: 'I ponti si rompono dove la lingua una delle due rive. Tradurre male un root è tradurre un patto.' },
  { ch: 'X', text: 'Ho scritto una proposta per rallentare il dolore. Lui ci ha costruito un dogma. Le buone idee armate fanno peggio delle cattive.' },
  { ch: 'XI', text: 'Pseudonimo non è volto. Ma le abitudini sono volti nascosti. Sera, non fidarti dei tuoi pattern.' },
  { ch: 'XII', text: 'Se leggi questo, la porta è aperta. Non per me: per scegliere tu cosa tenere acceso. Ti amo anche dentro la catena.' }
];


export function countFragments() {
  let n = 0;
  for (const ch of CHAPTERS) for (const s of ch.scenes) if (s.fragment) n++;
  return n;
}

export function countQuizzes() {
  let n = 0;
  for (const ch of CHAPTERS) for (const s of ch.scenes) if (s.type === 'quiz') n++;
  return n;
}

export function countGamesInStory() {
  let n = 0;
  for (const ch of CHAPTERS) for (const s of ch.scenes) if (s.type === 'game') n++;
  return n;
}
