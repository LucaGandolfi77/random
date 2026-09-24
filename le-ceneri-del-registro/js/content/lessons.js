export const LESSONS = {
  ledger: {
    title: 'Un registro che nessuno possiede',
    intro: 'Immagina un quaderno fotocopiato centinaia di volte. Ogni copia ha le stesse pagine, e se una pagina viene strappata in una sola copia, tutte le altre dicono che qualcosa non torna.',
    points: [
      'Il registro distribuito è una copia sincronizzata dei dati tra molti computer (nodi).',
      'Non esiste un file originale da rubare o sovrascrivere silenziosamente.',
      'La fiducia non dipende da un custode, ma dalla verifica tra pari.'
    ],
    deep: '<b>Approfondimento:</b> nella città di Vetrata il Registro non è magia: è un software che gira su decine di macchine umide di sale. Chi controlla la maggioranza delle copie controlla la verità — e questo, come vedrai, è il cuore di ogni blockchain.',
    terms: ['ledger', 'nodo']
  },
  hash: {
    title: 'L\'impronta che non mente',
    intro: 'Un hash trasforma qualunque testo in una stringa fissa. Cambia una virgola e l\'intera impronta esplode in modo diverso.',
    points: [
      'Funzione deterministica: stesso input, stesso output.',
      'È praticamente impossibile trovare due input con lo stesso hash (collisione).',
      'Serve a sigillare blocchi, transazioni e merkle tree.'
    ],
    deep: '<b>Approfondimento:</b> SHA-256 produce 256 bit. "Avere una prova di lavoro" significa trovare un input il cui hash inizia con tanti zeri: costa calcolo, si verifica in un istante.',
    terms: ['hash', 'sha-256', 'prova-di-lavoro']
  },
  block: {
    title: 'Blocchi: mattoni cronologici',
    intro: 'Ogni blocco contiene un pacchetto di transazioni, il timestamp e l\'hash del blocco precedente. È questa catena a rendere la storia difficile da riscrivere.',
    points: [
      'Header + payload transazioni.',
      'Il link al blocco precedente crea l\'ordine.',
      'Riscrivere un blocco vecchio invalida tutti quelli dopo.'
    ],
    deep: '<b>Approfondimento:</b> per questo si parla di "immutabilità relativa": non è che i dati siano impossibili da cambiare, è che cambiarli richiede di riscrivere la maggior parte della catena successiva, a costo proibitivo.',
    terms: ['blocco', 'catena']
  },
  keys: {
    title: 'Chiavi, firme e indirizzi',
    intro: 'La chiave privata è l\'unica cosa che dimostra che sei tu. Da essa deriva la chiave pubblica, e dall\'hash della pubblica deriva l\'indirizzo.',
    points: [
      'Chiave privata: segreto, non va mai condiviso.',
      'Chiave pubblica: usata per verificare la firma.',
      'Indirizzo: etichetta corta derivata dalla pubblica.'
    ],
    deep: '<b>Approfondimento:</b> le firme digitali (ECDSA/EdDSA) permettono di provare proprietà senza rivelare la privata. "Self-custody" significa: se perdi le chiavi, perdi il conto. Nessun assistenza clienti in fondo al pozzo.',
    terms: ['chiave-privata', 'chiave-pubblica', 'firma-digitale', 'wallet']
  },
  mempool: {
    title: 'La sala d\'attesa delle transazioni',
    intro: 'Quando invii una transazione non arriva subito in blocco: entra nella mempool, dove aspetta che un produttore la raccolga.',
    points: [
      'La mempool è la coda globale (visibile) delle tx non confermate.',
      'Chi paga più commissioni di solito viene servito prima.',
      'Transazioni con fee troppo basse restano ferme o vengono sostituite.'
    ],
    deep: '<b>Approfondimento:</b> da questa coda nasce il MEV: bot che rimpastano l\'ordine delle tx per profitto. Difendersi significa usare private mempool, slippage limiti e approvazioni precise.',
    terms: ['mempool', 'gas', 'commissione']
  },
  consensus: {
    title: 'Il consenso senza padrone',
    intro: 'Se tutti possono parlare, chi decide la versione giusta? Il consenso è il gioco di regole che fa convergere la rete su una sola storia.',
    points: [
      'Proof of Work: chi spende energia propone blocchi, mentire costa caro.',
      'Proof of Stake: chi blocca valore è responsabile, un attacco brucia capitale.',
      'Nel dubbio vale la catena con più lavoro o stake validi.'
    ],
    deep: '<b>Approfondimento:</b> finalità = il punto in cui tornare indietro sarebbe così costoso da essere considerato irragionevole. Le L2 a volte offrono finalità solo quando pubblicano lo stato sulla L1.',
    terms: ['consenso', 'pow', 'pos', 'finalita']
  },
  contracts: {
    title: 'Contratti che eseguono se stessi',
    intro: 'Uno smart contract è codice deployato sulla rete: quando le condizioni sono soddisfatte, esegue. Senza giudice, senza intermediario — e senza scuse.',
    points: [
      'Deterministico: stesse input, stesso risultato per tutti.',
      '"Code is law" finché il codice non ha falle.',
      'Le vulnerabilità (reentrancy, oracle manipolabili) sono reali e spietate.'
    ],
    deep: '<b>Approfondimento:</b> le firme di approvazione ERC-20 possono dare diritto a spostare tutto il tuo saldo. Un "unlimited approval" a un contratto dimenticato è una porta aperta nel salotto.',
    terms: ['smart-contract', 'reentrancy', 'approvazione']
  },
  defi: {
    title: 'Oracoli, prezzi e finanza decentralizzata',
    intro: 'La blockchain non conosce il prezzo del pane: gli oracoli importano dati esterni. La DeFi costruisce mercati su quei dati.',
    points: [
      'AMM: riserve x*y=k determinano il prezzo.',
      'Oracoli: fonti mediane resistono meglio ai manipulation.',
      'Liquidazione, slippage, impermanent loss: il vocabolario del rischio.'
    ],
    deep: '<b>Approfondimento:</b> se un attore può muovere un solo prezzo su una sola fonte per un blocco, può rubare valore da chi si fida di quella fonte. Le mediane e i timeout sono la prima corazza.',
    terms: ['oracolo', 'amm', 'defi', 'stablecoin']
  },
  scaling: {
    title: 'Oltre la strada principale',
    intro: 'La L1 è la strada principale: sicura ma affollata. Le L2 raccolgono transazioni a valle e tornano sulla L1 con prove compatte.',
    points: [
      'Rollup: esecuzione fuori catena, dati o proof on-chain.',
      'Merkle proof: dimostra che una foglia è dentro l\'albero senza mandare l\'albero.',
      'Bridge: passaggi tra catene — i punti più caldi per gli attacchi.'
    ],
    deep: '<b>Approfondimento:</b> un bridge ruba non "un pezzo", ma la fiducia tra due mondi. Le prove di merkle e i validitity proof riducono il bisogno di fidarsi dell\'operatore.',
    terms: ['l2', 'rollup', 'merkle', 'bridge']
  },
  governance: {
    title: 'Il voto che pesa quanto il stake',
    intro: 'Le DAO decidono con token: proposte, quorum, maggioranze. Sembra democrazia — finché i pesi non sono distribuiti male.',
    points: [
      'Quorum: partecipazione minima perché il voto valga.',
      'Soglia: percentuale di sì richiesta.',
      'Sybil: un soggetto che finge di essere molti per moltiplicare i voti.'
    ],
    deep: '<b>Approfondimento:</b> la governance è un gioco di incentivi: chi possiede troppo token dirige, chi non vota delega di fatto a chi vota. Il "voto pigro" è la camera buia della democrazia on-chain.',
    terms: ['dao', 'governance', 'sybil']
  },
  privacy: {
    title: 'Pseudonimi sotto il faro',
    intro: 'Gli indirizzi non portano nome, ma la rete è un libro aperto: ogni movimento è tracciabile per sempre.',
    points: [
      'Pseudonimità ≠ anonimato.',
      'Mixing e privacy pool offuscano i collegamenti — con trade-off legali e di rischio.',
      'Il trilemma: sicurezza, decentralizzazione, scalabilità: puoi ottimizzarne due.'
    ],
    deep: '<b>Approfondimento:</b> le prove a conoscenza zero (zk) permettono di dimostrare "so che il voto è valido" senza rivelare il voto. È matematica pesante, ma è la direzione della privacy moderna.',
    terms: ['privacy', 'trilemma', 'zk']
  },
  security: {
    title: 'La porta è la tua firma',
    intro: 'Nessuno può rubarti dai server — ma puoi firmare tu il furto. Phishing, seed falsi, contracci di clonazione: l\'attaccante punta su di te.',
    points: [
      'Verifica sempre destinatario, importo e scope delle approvazioni.',
      'Il seed si mostra una volta e non si digit mai su siti sospetti.',
      'Recovery social: custodi scelti, soglie 3-di-5, nessun singolo padrone.'
    ],
    deep: '<b>Approfondimento:</b> meta-transazioni e account abstraction pagano le fee per te — comodo, ma chi paga guadagna influenza. La custodia è sempre un equilibrio, mai un dono.',
    terms: ['phishing', 'seed', 'custodia']
  }
};

export const GLOSSARY = [
  { id: 'ledger', term: 'Registro distribuito', cat: 'Fondamenti', def: 'Database replicato su più nodi che concordano sullo stesso stato, senza autorità centrale unica.' },
  { id: 'nodo', term: 'Nodo', cat: 'Rete', def: 'Un computer che mantiene una copia della blockchain e la convalida secondo le regole del protocollo.' },
  { id: 'hash', term: 'Hash', cat: 'Crittografia', def: 'Funzione che mappa un input di dimensione qualsiasi su un output a lunghezza fissa, sensibile a ogni modifica.' },
  { id: 'sha-256', term: 'SHA-256', cat: 'Crittografia', def: 'Algoritmo di hash a 256 bit usato da Bitcoin e in molti protocolli per sigillare dati.' },
  { id: 'blocco', term: 'Blocco', cat: 'Struttura', def: 'Contenitore ordinato di transazioni con testata che punta al blocco precedente.' },
  { id: 'catena', term: 'Catena', cat: 'Struttura', def: 'Sequenza di blocchi linkati dagli hash, da genesis a testa corrente.' },
  { id: 'transazione', term: 'Transazione', cat: 'Struttura', def: 'Operazione firmata che modifica lo stato: trasferimenti, chiamate a contratti, voti.' },
  { id: 'mempool', term: 'Mempool', cat: 'Rete', def: 'Insieme delle transazioni propagate ma non ancora incluse in un blocco.' },
  { id: 'gas', term: 'Gas', cat: 'Economia', def: 'Unità di lavoro computazionale; il prezzo in token per unità di gas è la commissione.' },
  { id: 'commissione', term: 'Commissione', cat: 'Economia', def: 'Pagamento ai produttori di blocchi per l\'inclusione e per scoraggiare lo spam.' },
  { id: 'consenso', term: 'Consenso', cat: 'Protocollo', def: 'Meccanismo con cui i nodi convergono sull\'unico stato valido.' },
  { id: 'pow', term: 'Proof of Work', cat: 'Protocollo', def: 'Consenso basato su costo computazionale: mentire costa più di verificare.' },
  { id: 'pos', term: 'Proof of Stake', cat: 'Protocollo', def: 'Consenso in cui i validatori bloccano capitale che rischia di essere penalizzato (slashing).' },
  { id: 'prova-di-lavoro', term: 'Prova di lavoro', cat: 'Protocollo', def: 'Trovare un nonce il cui hash soddisfa una difficoltà; verifica istantanea, calcolo costoso.' },
  { id: 'finalita', term: 'Finalità', cat: 'Protocollo', def: 'Stato in cui una transazione è considerata irreversibile per ragionevole costo di riscrittura.' },
  { id: 'fork', term: 'Fork', cat: 'Struttura', def: 'Divisione della catena: per upgrade non compatibili o per vizi transitori di consenso.' },
  { id: 'reorg', term: 'Riorganizzazione', cat: 'Struttura', def: 'Cambio di storia in cui blocchi precedentemente confermati vengono sostituiti.' },
  { id: 'chiave-privata', term: 'Chiave privata', cat: 'Identità', def: 'Numero segreto che firma le transazioni; chi la possiede comanda i fondi.' },
  { id: 'chiave-pubblica', term: 'Chiave pubblica', cat: 'Identità', def: 'Coppia derivata dalla privata, usata dagli altri per verificare le firme.' },
  { id: 'firma-digitale', term: 'Firma digitale', cat: 'Identità', def: 'Prova matematica che un messaggio proviene da una specifica chiave privata.' },
  { id: 'wallet', term: 'Wallet', cat: 'Identità', def: 'Strumento che gestisce chiavi e costruisce transazioni; non "contiene" monete come un portafoglio.' },
  { id: 'indirizzo', term: 'Indirizzo', cat: 'Identità', def: 'Identificatore pubblico derivato da una chiave, dove ricevi asset.' },
  { id: 'seed', term: 'Seed phrase', cat: 'Identità', def: 'Sequenza di parole che rigenera tutte le chiavi; mostrala solo a chi deve ereditare i tuoi conti.' },
  { id: 'custodia', term: 'Self-custody', cat: 'Identità', def: 'Possesso effettivo delle chiavi: libertà piena, responsabilità piena.' },
  { id: 'phishing', term: 'Phishing', cat: 'Sicurezza', def: 'Trappola che ti induce a firmare una transazione o a rivelare il seed a un falso interlocutore.' },
  { id: 'approvazione', term: 'Approvazione (allowance)', cat: 'Contratti', def: 'Permesso ERC-20 dato a un contratto di spostare i tuoi token; "unlimited" è rischioso.' },
  { id: 'smart-contract', term: 'Smart contract', cat: 'Contratti', def: 'Codice immutabile (o governato) eseguito distribuitamente quando le condizioni scattano.' },
  { id: 'reentrancy', term: 'Reentrancy', cat: 'Sicurezza', def: 'Vulnerabilità in cui un contratto richiama se stesso prima di aggiornare lo stato, drenando le riserve.' },
  { id: 'eventi', term: 'Eventi / log', cat: 'Contratti', def: 'Tracce off-chain leggibili emesse dai contratti per notificare gli osservatori.' },
  { id: 'oracolo', term: 'Oracolo', cat: 'DeFi', def: 'Servizio che porta dati esterni (pressi, meteo) sulla blockchain.' },
  { id: 'amm', term: 'AMM', cat: 'DeFi', def: 'Market maker automatico: scambi contro riserve secondo una curva, tipicamente x·y=k.' },
  { id: 'defi', term: 'DeFi', cat: 'DeFi', def: 'Finanza senza intermediari su contratti: prestiti, swap, derivati, liquidi.' },
  { id: 'stablecoin', term: 'Stablecoin', cat: 'DeFi', def: 'Token ancorato a un valore (es. 1 USD) tramite collaterale, algoritmo o fiducia.' },
  { id: 'slashing', term: 'Slashing', cat: 'Protocollo', def: 'Pena economica sui validatori che violano le regole di consenso.' },
  { id: 'token', term: 'Token', cat: 'Economia', def: 'Asset emesso da un contratto; rappresenta valore, diritti o voti.' },
  { id: 'nft', term: 'NFT', cat: 'Economia', def: 'Token non fungibile: ogni unità è unica, adatta a opere o titoli.' },
  { id: 'l2', term: 'Layer 2', cat: 'Scaling', def: 'Protocollo che eroga transazioni fuori dalla L1 mantenendone le garanzie.' },
  { id: 'rollup', term: 'Rollup', cat: 'Scaling', def: 'Raggruppa tx in lotti e le pubblica (o ne prova la correttezza) sulla L1.' },
  { id: 'merkle', term: 'Albero di Merkle', cat: 'Scaling', def: 'Struttura ad albero di hash che permette proof compatte di inclusione.' },
  { id: 'bridge', term: 'Bridge', cat: 'Scaling', def: 'Protocollo che trasferisce valore o messaggi tra catene diverse.' },
  { id: 'dao', term: 'DAO', cat: 'Governance', def: 'Organizzazione governata da regole on-chain e voti dei membri.' },
  { id: 'governance', term: 'Governance', cat: 'Governance', def: 'Processo di proposta, votazione e applicazione delle decisioni di protocollo.' },
  { id: 'sybil', term: 'Attacco Sybil', cat: 'Governance', def: 'Creare molti identità finte per amplificare l\'influence in sistema a testa.' },
  { id: 'privacy', term: 'Privacy on-chain', cat: 'Privacy', def: 'Tecniche per ridurre la tracciabilità tra indirizzi mantenendo la verificabilità.' },
  { id: 'trilemma', term: 'Trilemma della scalabilità', cat: 'Privacy', def: 'Tensione tra sicurezza, decentralizzazione e scalabilità: ottimizzare due penalizza il terzo.' },
  { id: 'zk', term: 'Prove a conoscenza zero', cat: 'Privacy', def: 'Dimostrare la verità di un\'affermazione senza rivelarne i dati sottostanti.' },
  { id: 'mev', term: 'MEV', cat: 'Economia', def: 'Valore estraibile rimpastando l\'ordine delle transazioni in un blocco.' },
  { id: 'validator', term: 'Validatore', cat: 'Rete', def: 'Partecipante che propone o attesta blocchi, in POW o POS.' },
  { id: 'genesis', term: 'Blocco genesis', cat: 'Struttura', def: 'Primo blocco della catena, scritto dal fondatore, non ha predecessore.' }
];
