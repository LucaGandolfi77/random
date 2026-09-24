export const GAMES = {
  g01: {
    engine: 'consensus',
    title: 'Tre voci, una città',
    intro: 'Tre nodi ti mandano tre storie della stessa notte. Scegli la catena che tutti possono verificare.',
    config: {
      correct: 'b',
      chains: [
        { id: 'a', label: 'Catena del molo', height: 12, hash: '9c1f…a02', valid: false, note: 'manca il genesis' },
        { id: 'b', label: 'Catena del registro', height: 14, hash: '44ab…71e', valid: true, note: 'lunghissima e coerente' },
        { id: 'c', label: 'Catena del faro', height: 13, hash: '44ab…71e', valid: true, note: 'una coda in meno' }
      ]
    },
    debrief: 'Nella rete vale la regola del \"longest valid chain\": la storia più lunga che rispetti ancora le regole di validità. Non la più bella — la più costosa da falsificare.',
    terms: ['consenso', 'catena']
  },
  g02: {
    engine: 'hashmill',
    title: 'La prova che costa qualcosa',
    intro: 'Lina lasciava un sigillo su ogni taccuino: un hash che inizia con uno zero. Trovane uno con due zeri.',
    config: { zeros: 2, seed: 'cenere-di-lina-' },
    debrief: 'La proof of work non serve a \"calcolare meglio\": serve a rendere il falso più costoso del vero. Ogni zero in più moltiplica il tentativi attesi.',
    terms: ['hash', 'prova-di-lavoro']
  },
  g03: {
    engine: 'chainlink',
    title: 'Rimetti i mattoni in ordine',
    intro: 'Il taccuino di Lina è stato miscelato. Ogni blocco porta il riferimento a quello precedente: ricostruisci la sequenza.',
    config: {
      prev: 'GENESIS',
      txs: [
        { id: 't1', label: 'Sera compra pane', order: 1, hash: 'a11' },
        { id: 't2', label: 'Milo aggiorna il nodo', order: 2, hash: 'b22' },
        { id: 't3', label: 'Eidra registra la marea', order: 3, hash: 'c33' },
        { id: 't4', label: 'Lina scrive un addio', order: 4, hash: 'd44' }
      ]
    },
    debrief: 'L\'ordine dei blocchi non è decorativo: il campo prevHash crea causalità. Alterare un blocco rompe ogni anello successivo.',
    terms: ['blocco', 'catena']
  },
  g04: {
    engine: 'signit',
    title: 'Chi ha scritto davvero?',
    intro: 'Un messaggio firmato arriva dal vecchio laboratorio. Trova la chiave pubblica che lo verifica.',
    config: {
      task: 'verify',
      message: 'Non dimenticare il giardino. — L.',
      keys: [
        { id: 'k1', label: 'Pubblica del laboratorio', fp: '04af…91c', right: true },
        { id: 'k2', label: 'Pubblica del mercato', fp: '77d2…e40', right: false },
        { id: 'k3', label: 'Pubblica del faro', fp: 'c01b…3aa', right: false }
      ]
    },
    debrief: 'La firma dimostra che chi possedeva la privata ha approvato il messaggio, senza rivelare la privata stessa. È autenticazione + integrità.',
    terms: ['firma-digitale', 'chiave-pubblica']
  },
  g05: {
    engine: 'quorum',
    title: 'Riaccendi la quorum',
    intro: 'Il distretto è in blackout: servono almeno 5 nodi onesti collegati per far rispondere il Registro.',
    config: { total: 8, need: 5, honest: [0, 1, 2, 4, 5, 6, 7], start: [0, 1, 8, 9] },
    debrief: 'I sistemi BFT chiedono generalmente superquorum (≈2/3+1). Sotto quella soglia la rete non può ordinare eventi in modo unanime.',
    terms: ['nodo', 'consenso']
  },
  g06: {
    engine: 'timing',
    title: 'Il battito del propagatore',
    intro: 'La notizia di Lina deve partire nel momento giusto: troppo presto il nodo non è pronto, troppo tardi la marea vince.',
    config: { label: 'Tocca nell\'anello d\'oro', window: 0.17, speed: 1.35, retries: 4 },
    debrief: 'La propagazione non è istantanea: latenza e jitter contano. I finality gadget lavorano su attestazioni sincronizzate, non su speranze.',
    terms: ['finalita', 'nodo']
  },
  g07: {
    engine: 'hashmill',
    title: 'Il sigillo del taccuino',
    intro: 'Anche le pagine ordinarie portavano il segno della Lina: basta uno zero iniziale per sigillarle.',
    config: { zeros: 1, seed: 'taccuino-umido-' },
    debrief: 'Anche una difficoltà bassa insegna il principio: calcolo in avanti, verifica istantanea. Le difficoltà reali alzano solo lo zero.',
    terms: ['hash', 'blocco']
  },
  g08: {
    engine: 'phishguard',
    title: 'Il messaggio dal quartiere alto',
    intro: 'Un pop-up promette \"recupero fondi\" dopo l\'allagamento. Guarda i dettagli prima di firmare.',
    config: {
      correct: 'reject',
      fields: [
        ['App', 'Registro-Rimborso'],
        ['Destinatario', '0x9f2a…C41e (cambia ogni ora)'],
        ['Importo', 'Tutti i tuoi CEN'],
        ['Approvazione', 'UNLIMITED'],
        ['Nonce', 'non impostato']
      ],
      note: 'L\'indirizzo destinatione non compare nel sito ufficiale della città.',
      why: 'Approvazioni illimitate a destinatari che mutano sono la firma classica del furto. Rifiutare costa zero; firmare può costare tutto.'
    },
    debrief: 'Verifica sempre: app, destinatario esatto, importo, scope. Le allowance unlimited sono comode e pericolosissime.',
    terms: ['phishing', 'approvazione']
  },
  g09: {
    engine: 'priority',
    title: 'La coda del carico notturno',
    intro: 'Il faro ha un limite di gas. Inserisci le transazioni critiche senza sforare, rispettando le priorità.',
    config: {
      blockGas: 100,
      must: ['warn', 'fam'],
      txs: [
        { id: 'warn', label: 'Allarme di allagamento', gas: 30, fee: 2 },
        { id: 'fam', label: 'Rimborso orfani', gas: 25, fee: 1 },
        { id: 'art', label: 'Asta poster vintage', gas: 35, fee: 40 },
        { id: 'spam', label: 'Meme del ponte', gas: 20, fee: 30 },
        { id: 'lab', label: 'Backup laboratorio', gas: 25, fee: 8 }
      ]
    },
    debrief: 'I produttori di blocchi massimizzano fee ma hanno limiti di gas; alcuni includono tx \"importanti\" anche a basso prezzo (priorità sociale o regolatoria).',
    terms: ['mempool', 'gas']
  },
  g10: {
    engine: 'timing',
    title: 'Difendi l\'ordine',
    intro: 'Un bot vuole sandwichare la tua swap. Invia nel momento in cui la finestra d\'attacco è chiusa.',
    config: { label: 'Invia prima del sandwich', window: 0.14, speed: 1.8, retries: 4 },
    debrief: 'MEV = estrarre valore rimpastando la coda. Difese: slippage basso, private orderflow, batch auction.',
    terms: ['mev', 'mempool']
  },
  g11: {
    engine: 'signit',
    title: 'La chiave che non devi perdere',
    intro: 'Eidra ti passa una busta: due numeri, una sola è tua. Quale deriva l\'indirizzo che conosci?',
    config: {
      task: 'sign',
      message: 'Indirizzo atteso: 0x3c…A91',
      keys: [
        { id: 'p1', label: 'Coppia A', fp: 'privata→0x3c…A91', right: true },
        { id: 'p2', label: 'Coppia B', fp: 'privata→0x77…10f', right: false }
      ]
    },
    debrief: 'Dalla privata si derivano pubblica e indirizzo; l\'inverso è computazionalmente impossibile. Per questo la privata è tutto.',
    terms: ['chiave-privata', 'wallet']
  },
  g12: {
    engine: 'consensus',
    title: 'Una catena troppo bella',
    intro: 'Un nodo \"regala\" una storia più lunga ma con hash incoerenti. Quale catena accetti?',
    config: {
      correct: 'c',
      chains: [
        { id: 'a', label: 'Catena corta reale', height: 9, hash: '0f31…aa2', valid: true, note: 'coerente con le regole' },
        { id: 'b', label: 'Catena lunga forgiata', height: 15, hash: 'zz91…?!', valid: false, note: 'hash invalidi' },
        { id: 'c', label: 'La tua copia locale', height: 10, hash: '0f31…aa2', valid: true, note: 'valida e più lunga' }
      ]
    },
    debrief: 'Lunghezza da sola non basta: prima devono passare tutte le verifiche di consenso. Un attaccante deve rifare il lavoro, non solo contare blocchi.',
    terms: ['pow', 'finalita']
  },
  g13: {
    engine: 'hashmill',
    title: 'Cinquantauno per cento',
    intro: 'Per riscrivere la storia ti serve potere di calcolo superiore alla rete onesta. Trova uno sigillo a tre zeri come prova del tuo minatorio.',
    config: { zeros: 3, seed: '51%-della-notte-' },
    debrief: 'Un attacco al 51% non \"ruberebbe\" vecchie transazioni facilmente: permette di riscrivere recenti conferme e di doppia spesa. Costo proibitivo sui grandi network.',
    terms: ['pow', 'finalita']
  },
  g14: {
    engine: 'bughunt',
    title: 'Il contratto che piange',
    intro: 'Il contratto del Giardino Sospeso drena le casse. Individua la riga che permette la reentrancy.',
    config: {
      vulnerable: 3,
      lines: [
        'function withdraw(amount) public {',
        '  require(balances[msg.sender] >= amount);',
        '  (bool ok, ) = msg.sender.call{value: amount}("");',
        '  balances[msg.sender] -= amount;',
        '}'
      ],
      why: 'Lo stato viene aggiornato dopo il trasferimento: il chiamante richiama withdraw prima che il saldo si aggiorni (checks-effects-interactions).'
    },
    debrief: 'Pattern sicuro: prima aggiorna lo stato, poi interagisci. O meglio, usа pull-payment e reentrancy guard.',
    terms: ['smart-contract', 'reentrancy']
  },
  g15: {
    engine: 'feedpick',
    title: 'Tre oracoli, un prezzo',
    intro: 'Il prezzo del sale galleggiante arriva da tre fonti. Una è manipolata. Scegli la lettura mediana onesta.',
    config: {
      correct: 'b',
      feeds: [
        { id: 'a', label: 'Faro est', value: '1 CEN = 0.42', time: 'ora', ok: false },
        { id: 'b', label: 'Mercato centrale', value: '1 CEN = 0.51', time: 'ora', ok: true },
        { id: 'c', label: 'Deposito sud', value: '1 CEN = 0.49', time: '6 min fa', ok: false }
      ],
      hint: 'Scarta il valore fuori scala e i feed vecchi: resta la mediana fresca.'
    },
    debrief: 'Le mediane sui feed e i timeout sui dati vecchi riducono l\'attacco da singola fonte. Gli oracoli sono il collo della DeFi.',
    terms: ['oracolo', 'defi']
  },
  g16: {
    engine: 'phishguard',
    title: 'La proposta dal seme',
    intro: 'Una DAO propone di \"migrare i fondi in un vault nuovo\". Firma o rifiuti?',
    config: {
      correct: 'reject',
      fields: [
        ['Proposta', '#88 MigrVault'],
        ['Esecutore', 'EOA personale (non multisig)'],
        ['Importo', 'Tutta la tesoreria'],
        ['Vocalità', 'Voti 4h, nessun timelock'],
        ['Allegato', 'codice non verificato']
      ],
      note: 'Nessun timelock significa esecuzione istantanea dopo il voto.',
      why: 'Esecutore EOA + nessun timelock + tesoreria piena = scenario classico di governance exploit.'
    },
    debrief: 'Le governance sane usano multisig, timelock, limiti di export e audit. La velocità non è un lusso che ci si può permettere con i fondi comuni.',
    terms: ['dao', 'governance']
  },
  g17: {
    engine: 'merkle',
    title: 'La prova del ricordo',
    intro: 'Dimostra che il frammento di Lina sta nel registro senza mandare l\'intero albero.',
    config: { leaf: 2, leaves: ['Sera', 'Milo', 'Lina', 'Eidra'], root: 'f0c1…9ab' },
    debrief: 'Una merkle proof costa log(n) hash invece di n: le L2 la usano per dimostrare inclusione di tx nella L1.',
    terms: ['merkle', 'l2']
  },
  g18: {
    engine: 'timing',
    title: 'La chiusura del batch',
    intro: 'Il rollup chiude il lotto sulla L1. Colpisci il momento della finestra di pubblicazione.',
    config: { label: 'Pubblica il batch', window: 0.15, speed: 1.6, retries: 4 },
    debrief: 'I rollup raggruppano tx e tornano sulla L1 con dati o proof: costi condivisi, sicurezza ereditata dalla L1.',
    terms: ['rollup', 'l2']
  },
  g19: {
    engine: 'chainlink',
    title: 'Ricostruisci il ponte',
    intro: 'I messaggi tra le due rive sono caduti. Riordina i pacchetti del bridge.',
    config: {
      prev: 'L1-HEAD',
      txs: [
        { id: 'b1', label: 'Lock su L1', order: 1, hash: 'm1' },
        { id: 'b2', label: 'Merkle root aggiornato', order: 2, hash: 'm2' },
        { id: 'b3', label: 'Attestazione validatori', order: 3, hash: 'm3' },
        { id: 'b4', label: 'Mint su L2', order: 4, hash: 'm4' }
      ]
    },
    debrief: 'I bridge sono sequenze di eventi verificabili: se salti un anello (attestazione), il mint non dovrebbe esistere. Buoni bridge provano, non \"si fidano\".',
    terms: ['bridge', 'merkle']
  },
  g20: {
    engine: 'governance',
    title: 'Il voto del consiglio di marea',
    intro: 'Approva la proposta di Eidra: serve il 60% dei sì e almeno il 70% di partecipazione.',
    config: {
      threshold: 60,
      quorum: 70,
      members: [
        { id: 'm1', label: 'Eidra', weight: 18, align: 'yes' },
        { id: 'm2', label: 'Milo', weight: 14, align: 'yes' },
        { id: 'm3', label: 'Teco', weight: 12, align: 'yes' },
        { id: 'm4', label: 'Molo nord', weight: 20, align: 'no' },
        { id: 'm5', label: 'Mercato', weight: 16, align: 'yes' },
        { id: 'm6', label: 'Faro', weight: 20, align: 'swing' }
      ]
    },
    debrief: 'Quorum e soglia sono bilance: troppo bassi, pochi decidono per tutti; troppo alti, nulla passa mai. Il peso è lo stake, non il numero di persone.',
    terms: ['governance', 'dao']
  },
  g21: {
    engine: 'phishguard',
    title: 'Seed nella polvere',
    intro: 'Un sito \"richiede la frase di recupero\" per sincronizzare il diario. Cosa fai?',
    config: {
      correct: 'reject',
      fields: [
        ['Sito', 'ceneri-recupero[.]win'],
        ['Chiede', '12 parole del seed'],
        ['Promette', 'accesso bonus ai frammenti'],
        ['Certificato', 'scade tra 3 giorni'],
        ['Urgenza', '\"entro 10 minuti\"']
      ],
      note: 'Il vero Registro non chiede mai il seed.',
      why: 'Nessun servizio legittimo deve conoscere il tuo seed. L\'urgenza e il dominio strano sono l\'intero copione del phishing.'
    },
    debrief: 'Il seed va digitato solo su dispositivi fidati che stai configurando, mai su link ricevuti. La fretta è un virus.',
    terms: ['seed', 'phishing']
  },
  g22: {
    engine: 'quorum',
    title: 'La metà che tace',
    intro: 'Metà della rete è sommersa. Riattiva abbastanza nodi onesti per superare i 2/3.',
    config: { total: 9, need: 7, honest: [0, 1, 2, 3, 5, 6, 7, 8], start: [0, 9] },
    debrief: 'Con nodi offline la finalità si ferma (liveness). La sicurezza (safety) preferisce bloccarsi piuttosto che sbagliare: è il compromesso CAP nella catena.',
    terms: ['nodo', 'finalita']
  },
  g23: {
    engine: 'bughunt',
    title: 'L\'oracolo gonfio',
    intro: 'Il prezzo legge un solo tick di un pool sottoliquidato. Trova la riga debole.',
    config: {
      vulnerable: 2,
      lines: [
        'function getPrice() view returns (uint) {',
        '  uint bal = pool.balance;',
        '  uint p = bal * 1e18 / totalSupply;',
        '  return p;',
        '}'
      ],
      why: 'Calcolare il prezzo da un singolo saldo manipolabile in un blocco permetce di gonfiarlo e di liquidare a sconto.'
    },
    debrief: 'Serve TWAP, multiple fonti, collateralizzazione elevata. Un blocco è un attimo: chi può muovere il mercato per un attimo può mentire per un attimo.',
    terms: ['oracolo', 'amm']
  },
  g24: {
    engine: 'feedpick',
    title: 'Prezzo o menzogna',
    intro: 'Il vault chiede il cambio CEN/OND. Due feed sono vecchi, uno è corrotto ma \"fresco\". Scegli con criterio.',
    config: {
      correct: 'c',
      feeds: [
        { id: 'a', label: 'Feed A (vecchio)', value: '1.02', time: '40 min fa', ok: false },
        { id: 'b', label: 'Feed B (mediana)', value: '1.00', time: '2 min fa', ok: true },
        { id: 'c', label: 'Feed C (anomalo)', value: '3.70', time: 'ora', ok: false },
        { id: 'd', label: 'Feed D (mediana)', value: '1.01', time: '2 min fa', ok: false }
      ],
      hint: 'Guarda freschezza E plausibilità: il valore fuori scala resta fuori, anche se è nuovo.'
    },
    debrief: 'I feed migliori combinano multi-sorgente, mediana e guardrail sui salti. La freschezza da sola non salva un dato corrotto.',
    terms: ['oracolo', 'stablecoin']
  },
  g25: {
    engine: 'merkle',
    title: 'Albero delle presenze',
    intro: 'Prova che \"Milo\" è nella lista del refettorio senza mandare tutti i nomi.',
    config: { leaf: 1, leaves: ['Sera', 'Milo', 'Eidra', 'Teco', 'Lina', 'Faro', 'Molo', 'Giardino'], root: '77ab…10d' },
    debrief: 'Radice fissa + proof = verifica locale. È la spina dorsale delle light client e delle prove di inclusione.',
    terms: ['merkle', 'l2']
  },
  g26: {
    engine: 'governance',
    title: 'Sybil nella sala',
    intro: 'Un whale finge di essere dieci deleghe. Componi una maggioranza onesta che raggiunga quorum e soglia.',
    config: {
      threshold: 55,
      quorum: 65,
      members: [
        { id: 'w1', label: 'Delega 1 (stesso whale)', weight: 10, align: 'no' },
        { id: 'w2', label: 'Delega 2 (stesso whale)', weight: 10, align: 'no' },
        { id: 'w3', label: 'Delega 3 (stesso whale)', weight: 10, align: 'no' },
        { id: 'w4', label: 'Laboratorio', weight: 22, align: 'yes' },
        { id: 'w5', label: 'Giardino', weight: 18, align: 'yes' },
        { id: 'w6', label: 'Quartiere basso', weight: 20, align: 'yes' },
        { id: 'w7', label: 'Faro', weight: 20, align: 'swing' }
      ]
    },
    debrief: 'Voto per token = voto per capitale. Identity-based quorum e reputazione provano a limitare il Sybil senza introdurre KYC ovunque.',
    terms: ['sybil', 'governance']
  },
  g27: {
    engine: 'priority',
    title: 'Il blocco di mezzanotte',
    intro: 'Limite 120 di gas. Porta a casa i due rimborsi critici senza superare il tetto.',
    config: {
      blockGas: 120,
      must: ['orfo', 'pompa'],
      txs: [
        { id: 'orfo', label: 'Rimborso orfani', gas: 40, fee: 3 },
        { id: 'pompa', label: 'Attivazione pompe', gas: 35, fee: 4 },
        { id: 'art', label: 'Collezione bollette', gas: 30, fee: 50 },
        { id: 'game', label: 'Sfida a dadi', gas: 25, fee: 45 },
        { id: 'back', label: 'Snapshot notturno', gas: 30, fee: 9 }
      ]
    },
    debrief: 'Gas limit per blocco = banda della città. Fee al rialzo fanno salire le offerte, ma il tetto resta fisico.',
    terms: ['gas', 'commissione']
  },
  g28: {
    engine: 'signit',
    title: 'La firma dell\'addio',
    intro: 'L\'ultima nota di Lina porta una firma. Individua la chiave che il Registro riconosce.',
    config: {
      task: 'verify',
      message: 'Se leggi questo, il giardino è ancora nostro.',
      keys: [
        { id: 'a', label: 'Pubblica 0xCEN…11a', fp: '0xCEN…11a', right: false },
        { id: 'b', label: 'Pubblica 0xASH…9e2', fp: '0xASH…9e2', right: true },
        { id: 'c', label: 'Pubblica 0xF0G…00b', fp: '0xF0G…00b', right: false }
      ]
    },
    debrief: 'Firma valida ≠ buone intenzioni. Il Registro prova autenticità, non bontà: giudicare resta compito umano.',
    terms: ['firma-digitale', 'wallet']
  },
  g29: {
    engine: 'consensus',
    title: 'La forcella del Fornitore',
    intro: 'Il Fornitore spinge una catena che cancella i ricordi dolorosi, ma con meno attestazioni. Quale resti?',
    config: {
      correct: 'b',
      chains: [
        { id: 'a', label: 'Catena-lampo del Fornitore', height: 30, hash: 'dead…000', valid: false, note: 'attestazioni false' },
        { id: 'b', label: 'Catena concreta della città', height: 28, hash: 'c0de…f71', valid: true, note: 'regole rispettate' },
        { id: 'c', label: 'Catena vuota', height: 0, hash: '0000…000', valid: true, note: 'genesis' }
      ]
    },
    debrief: 'Le forcelle malevole promettono miracoli e omettono prova. La verifica indipendente è l\'unico antidoto alla gentilezza forzata.',
    terms: ['fork', 'consenso']
  },
  g30: {
    engine: 'hashmill',
    title: 'L\'ultimo sigillo',
    intro: 'Prima di firmare la scelta finale, sigilla il percorso: uno hash a tre zeri per la porta che apri.',
    config: { zeros: 3, seed: 'ultima-cenere-' },
    debrief: 'Congratulazioni: hai attraversato proof of work, firme, consenso, contratti, oracoli, rollup e governance. Il resto della strada è umano.',
    terms: ['hash', 'prova-di-lavoro']
  }
};

export const GAME_ORDER = Object.keys(GAMES);
