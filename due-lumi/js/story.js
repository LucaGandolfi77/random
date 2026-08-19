/* I DUE LUMI — stato di gioco, contenuti, dialoghi, finali, salvataggi */
const STORY = {
  init(){
    G.party = {
      milo: { id:'milo', name:'Milo', hp:26, maxHp:26, pow:8, def:3, spd:5, lvl:1, xp:0, nebbia:false },
      tito: { id:'tito', name:'Tito', hp:22, maxHp:22, pow:7, def:2, spd:7, lvl:1, xp:0, nebbia:false },
    };
    G.crumbs = 24;
    G.inv = { pane:2, te:1, marm:1 };
    G.memories = {};
    G.flags = {};
    G.owns = ['foulard'];
    G.equipped = { foulard:true };
    G.chapter = 1;
    G.ending = null;
    G.memCount = () => Object.keys(G.memories).filter(k => G.memories[k]).length;
    G.invList = () => Object.keys(G.inv).filter(k => G.inv[k] > 0);
  },

  zoneWarmth(zone){
    const map = {
      hub:[], meadow:[1,2], forest:[3,4,5], coast:[6,7], wind:[8,9], final:[10,11,12], dark:[]
    };
    const ids = map[zone] || [];
    let done = 0;
    ids.forEach(id => { if(G.memories[id]) done++; });
    const bossZones = { forest:'custode', coast:'foca', wind:'vento', final:'ramenta' };
    if(bossZones[zone] && G.flags['boss:'+bossZones[zone]]) done++;
    const total = ids.length + (bossZones[zone] ? 1 : 0);
    return total ? done/total : 1;
  },

  save(){
    try {
      const data = JSON.stringify({
        party:G.party, crumbs:G.crumbs, inv:G.inv, memories:G.memories,
        flags:G.flags, owns:G.owns, equipped:G.equipped, chapter:G.chapter,
      });
      localStorage.setItem('duelumi_save', data);
    } catch(e){}
  },
  load(){
    try {
      const d = localStorage.getItem('duelumi_save');
      if(!d) return false;
      const s = JSON.parse(d);
      G.party = s.party; G.crumbs = s.crumbs; G.inv = s.inv;
      G.memories = s.memories; G.flags = s.flags;
      G.owns = s.owns || ['foulard']; G.equipped = s.equipped || {};
      G.chapter = s.chapter || 1;
      G.ending = null;
      G.memCount = () => Object.keys(G.memories).filter(k => G.memories[k]).length;
      G.invList = () => Object.keys(G.inv).filter(k => G.inv[k] > 0);
      return true;
    } catch(e){ return false; }
  },
  hasSave(){
    try { return !!localStorage.getItem('duelumi_save'); } catch(e){ return false; }
  },
  clearSave(){ try { localStorage.removeItem('duelumi_save'); } catch(e){} },

  afterMemory(){
    if(G.memCount() >= 12 && !G.flags['allmem']){
      G.flags['allmem'] = true;
      UI.notify('Tutte le memorie sono tornate a casa.');
    }
  },

  afterBattle(id){
    const unlocks = {
      foca:'move_cenere',
      vento:'stivali',
      specchio:'kind_specchio',
    };
    const u = unlocks[id];
    if(u === 'move_cenere'){ G.flags['move_cenere']=true; UI.notify('Milo ha imparato l\'Abbraccio di Cenere!'); }
    if(u === 'stivali'){ G.owns.push('stivali'); UI.notify('Stivali del Vento: vel.+2 a Tito.'); }
    if(id === 'custode'){
      G.flags['custode_done'] = true;
    }
    if(id === 'specchio'){
      G.party.milo.hp = G.party.milo.maxHp;
      G.party.tito.hp = G.party.tito.maxHp;
      G.crumbs += 99;
      UI.notify('Lo Specchio si incrina: 99 briciole e un sorriso.');
    }
    if(id === 'ramenta'){
      this.finalChoice();
    }
  },

  gameOver(){
    STORY.save();
    G.sceneOver = 'gameover';
    setScene('gameover');
  },

  diary(){
    const lines = [];
    lines.push('I due fratelli del Borgo del Miele.');
    lines.push('');
    lines.push('Quando la Nebbia ha cominciato a mangiare i colori, Milo e Tito hanno scelto di seguirla fino al fondo, perché una casa non si lascia sola.');
    lines.push('');
    if(G.memCount() > 0) lines.push('Ho ritrovato ' + G.memCount() + ' memoria su 12. Ogni memoria è un pezzetto di qualcuno che la Nebbia stava spegnendo.');
    if(G.flags['boss:custode']) lines.push('Il Custode del Bosco ha riabbracciato il nome del suo cerbiatto: Bastianino.');
    if(G.flags['boss:foca']) lines.push('La Foca ha consegnato un pugno di cenere. Dice che i fuochi amati si custodiscono camminando, non chiudendo la mano.');
    if(G.flags['boss:vento']) lines.push('Il Vento dei Rimpianti, per la prima volta, si è fermato ad ascoltare.');
    lines.push('');
    lines.push('Nonna Tessa ripete una frase strana: "io ricordo quello che non è mai successo."');
    lines.push('Forse è il cuore che aggiunge ciò che manca. Forse è l\'amore che inventa il passato.');
    lines.push('');
    lines.push('Alla fine ci sarà una scelta. Le scelte sono la parte più vera di una storia.');
    return lines;
  },

  resolveEnding(choice){
    const mems = G.memCount();
    let e = 'd';
    if(choice === 'A'){ e = mems >= 4 ? 'a' : 'd'; }
    else if(choice === 'B'){ e = 'b'; }
    else if(choice === 'C'){ e = 'c'; }
    G.ending = e;
    G.flags['ending:'+e] = true;
    STORY.save();
    DIALOGUE.close();
    AUD.stopSong();
    fadeTo(1, 0.8, () => {
      setScene('ending', { ending: e });
      fadeTo(0, 0.6);
    });
  },

  finalChoice(){
    const choices = [
      { label:'Lasciala andare', onEnd: () => STORY.resolveEnding('A') },
      { label:'Trattienila qui', onEnd: () => STORY.resolveEnding('B') },
    ];
    if(G.memCount() >= 12){
      choices.push({ label:'Camminaci accanto', onEnd: () => STORY.resolveEnding('C') });
    }
    DIALOGUE.open([
      { who:'ramenta', text:'Ho spento il colore per tenerlo al sicuro. Ma un colore che non si muove è solo un pigmento secco. Ora che mi avete raggiunto... chiedete.' },
      { who:'ramenta', text:'Cosa deve diventare il dolore di Nonna Tessa? Cosa deve diventare tutto ciò che finisce?', required:true, choices },
      { who:'milo', text:'...' },
    ]);
  },
};

G.memCount = () => Object.keys(G.memories).filter(k => G.memories[k]).length;
G.invList = () => Object.keys(G.inv).filter(k => G.inv[k] > 0);

/* =========================================================
   SCRIPT — tutti i dialoghi
   ========================================================= */
const SCRIPT = {
  named(key){
    switch(key){
      case 'intro': return this.intro();
      case 'fountain': return this.fountain();
      default: return [{ text:'...' }];
    }
  },

  enter(roomId){
    switch(roomId){
      case 'forestC':
        return [
          { who:'custodeeco', text:'Questa è la radura del Cervo Grande. La nebbia qui è più alta: come se anche la memoria avesse i suoi capolavori.' },
          { who:'milo', text:'Non serve vincere. Basta restituirgli una parola.' },
        ];
      case 'coastA':
        return [
          { who:'tito', text:'Il mare non fa rumore, oggi. Sembra che stia ascoltando.' },
          { who:'milo', text:'La costa porta i ricordi di tutti i fuochi spenti. Camminiamo piano.' },
        ];
      case 'windB':
        return [
          { who:'vento', text:'Se siete arrivati fin qui, i vostri piedi hanno imparato a fidarsi del vuoto. Benvenuti al mio paese.' },
        ];
      case 'finalA':
        return [
          { who:'milo', text:'Qui il colore è finito davvero. Solo grigio, e il peso di tutto ciò che è stato.' },
          { who:'tito', text:'Allora è il posto giusto. Qui c\'è più spazio per accendere qualcosa.' },
        ];
      case 'specchio':
        return [
          { who:'specchio', text:'Non aprire gli occhi se non sei pronto a rivederti.' },
        ];
      default: return null;
    }
  },

  intro(){
    return [
      { who:'nonna', text:'Ecco, vedi. La mattina sa ancora di miele, e questo, per me, basta a chiamarla felicità.' },
      { text:'Nel Borgo del Miele la colazione ha sempre profumo di pane e di lentezza.' },
      { who:'milo', text:'Nonna, oggi la piazza è più grigia di ieri. Anche i gerani sembrano... stanchi.' },
      { who:'tito', text:'Ma dai, è solo la nuvola! Nonna, facciamo frittelle? Tante?' },
      { who:'nonna', text:'La nuvola, dite? Io la chiamo la Nebbia. E la Nebbia non porta frittelle, piccini. Porta silenzio.' },
      { who:'nonna', text:'Ieri sera mi è parso di non ricordare più il sapore del mosto d\'autunno. È la prima cosa che ho dimenticato.' },
      { who:'milo', text:'Si può dimenticare il sapore delle cose? Anche quello della mostarda della signora Marta?' },
      { who:'nonna', text:'Tutto si può dimenticare, Milo. Anche il colore del cielo, se la Nebbia lo tocca abbastanza a lungo.' },
      { who:'tito', text:'Allora andiamo a cacciarla! Io e Milo le insegniamo a ricordare!' },
      { who:'nonna', text:'Il vento del borgo va verso i prati, poi verso il bosco, poi verso dove le cose vengono conservate. Seguitelo.' },
      { who:'nonna', text:'Ma prima, un patto tra noi tre. Tornate. Qualunque cosa la Nebbia vi dica, qualunque cosa vi prometta: tornate a casa. Il focolare, per me, siete voi.' },
      { who:'milo', text:'Torniamo, Nonna. Te lo prometto.' },
      { who:'tito', text:'E portiamo anche un po\' di colore per i gerani!' },
      { text:'B: martello. A: parla e usa. A destra il Prato delle Zucche.' },
    ];
  },

  fountain(){
    return [
      { who:'milo', text:'La fontana della piazza non butta più acqua. Butta ricordi che nessuno reclamava.' },
      { who:'tito', text:'Il signor Tostino dice che una volta qui sotto c\'era una stella. Io ci credo.' },
    ];
  },

  npc(id){
    const s = [];
    switch(id){
      case 'nonna':
        if(G.flags['boss:ramenta']) s.push({ who:'nonna', text:'Avete scelto, e la scelta era vostra. Qualunque cosa sia accaduta: qui la cena è sempre calda.' });
        else if(G.memCount() >= 3) s.push({ who:'nonna', text:'Ricordo sempre più cose. E so che le ricordo perché camminate voi. La mia memoria, a volte, ha i vostri passi.' });
        else s.push({ who:'nonna', text:'Il patto è questo: tornate. Ogni cosa che finisce ha bisogno di qualcuno che la accompagni fino a casa.' });
        s.push({ who:'nonna', text:'Vuoi guardare la Cesta? Tutto qui costa briciole di pane e sorrisi.' });
        s.push({ text:'La Cesta di Nonna si apre.', onEnd: () => MENU.open('shop') });
        break;
      case 'signora':
        s.push({ who:'signora', text:'La mia Marta non dimentica nulla, poverina. È la più coraggiosa di noi: va a letto ogni sera ricordando tutto.' });
        s.push({ who:'signora', text:'Forse per questo la Nebbia non è mai entrata nella sua stanza. C\'è poco da spegnere, in una luce accesa da soli.' });
        break;
      case 'falco':
        if(G.flags['boss:ramenta']) s.push({ who:'falco', text:'Sono passato a salutare. Le strade che si chiudono, se le hai camminate bene, si aprono da un\'altra parte.' });
        else s.push({ who:'falco', text:'Non sono qui per caso, e non sono nemmeno di qui. Cerco qualcuno che ricordi quello che non è mai successo.' });
        s.push({ who:'falco', text:'C\'è un\'entità, oltre il vento, che conserva ogni cosa affinché nulla finisca. La chiamano Ramenta.' });
        if(!G.flags['move_turbo']){
          s.push({ who:'falco', text:'Se il Bosco ti sembra stretto, in battaglia prova a saltare due volte nello stesso respiro. Ecco: il Salt.Ello Rotante, te lo regalo. Riscaldalo, non sai mai.' });
          s.push({ who:'tito', text:'SALT.ELLO ROTANTE! Lo uso subito!' });
          s.push({ who:'tito', text:'...dopo il tè, però.', onEnd: () => { G.flags['move_turbo'] = true; UI.notify('Tito ha imparato il Salt.Ello Rotante!'); } });
        }
        break;
      case 'bambina':
        if(G.flags['quest_bambina']) s.push({ who:'bambina', text:'Stasera conto le stelle e dico il suo nome a ognuna. Nessuna resta da sola, così.' });
        else {
          s.push({ who:'bambina', text:'Ho perso una stellina. È caduta da questa parte del prato, e la Nebbia l\'ha spenta prima che potessi dirle grazie.' });
          s.push({ who:'bambina', text:'Quando una cosa ti dice grazie per essere esistita, tu che fai? La lasci lì a spegnersi, o la fai girare per il mondo?' });
          s.push({ who:'milo', text:'...Fai un patto con me. Ogni volta che ne trovi una, la fai viaggiare. Le stelle stanno bene in cammino.' });
          s.push({ who:'bambina', text:'Va bene. Allora ti regalo questo: la gentilezza conta, eccome. La Nebbia non sa contarla.' });
          s.push({ who:'milo', text:'Hai aiutato la bambina. (Gentilezza: +1)' });
          s.push({ who:'bambina', text:'Vai, Milo. E ricordati: il tuo passo pesa più della Nebbia.', onEnd: () => { G.flags['quest_bambina'] = true; G.flags['kind_bambina'] = true; } });
        }
        break;
      case 'contadina':
        s.push({ who:'contadina', text:'Il grano che non cresce grigio è il grano che qualcuno ha seminato due volte: una con la mano, una con il cuore.' });
        break;
      case 'custodeeco':
        if(G.flags['boss:custode']) s.push({ who:'custodeeco', text:'Bastianino. Lo ripeto ogni mattina come una campana piccola. Grazie per avermelo restituito.' });
        else s.push({ who:'custodeeco', text:'Nel cuore del bosco vive un cervo grande, che la Nebbia ha privato del nome di suo figlio. Non gli chiedere di combattere. Chiedigli solo di ricordare.' });
        break;
      case 'focascena':
        if(G.flags['boss:foca']) s.push({ who:'focascena', text:'La foca ti consegnerà la cenere. Non è un addio: è il fuoco che impara a camminare.' });
        else s.push({ who:'focascena', text:'Sulla costa abita una foca che custodisce la cenere di un fuoco amatissimo. Ha paura che, se la lascia andare, il calore non sia mai esistito.' });
        break;
      default:
        s.push({ text:'...' });
    }
    return s;
  },

  memory(id){
    const m = {
      1:{ who:'signora', text:'Memoria: la prima neve. La signora Marta ricorda di aver toccato la prima neve con la punta del naso, a sette anni. Non fa più freddo, ora che lo ricorda.' },
      2:{ who:'contadina', text:'Memoria: la cicala. Il nonno di una bambina le insegnò che le cicale cantano per un\'estate sola. Lei, da allora, canta ogni giorno come se fosse quella.' },
      3:{ who:'bambina', text:'Memoria: la giostra. Un ragazzo ricorda il rumore della giostra del borgo, e che sua madre lo lasciava salire gratis perché lo vedeva felice da lontano.' },
      4:{ who:'custodeeco', text:'Memoria: il fischietto. Qualcuno ricorda un fischietto di legno. Non ricorda chi glielo aveva dato, ma ricorda che era la voce più dolce del mondo.' },
      5:{ who:'falco', text:'Memoria: la corriera. Un uomo ricorda di aver aspettato la corriera delle sei per tutta la vita, sperando di non dover partire mai.' },
      6:{ who:'focascena', text:'Memoria: il fuoco. La foca ricorda un camino in cui il legno profumava di pino. La cenere, dice, è il fuoco che ha finito di avere fretta.' },
      7:{ who:'signora', text:'Memoria: l\'orologio. Una donna ricorda l\'orologio di suo padre che batteva nel corridoio come un cuore di casa. Quando si è fermato, ha capito che anche i cuori si fermano. E che gli orologi, se li ascolti bene, si rimontano.' },
      8:{ who:'vento', text:'Memoria: la vela. Un bambino ricorda una barca di carta che mise nel ruscello. Non l\'ha mai vista arrivare al mare, ma giurerebbe che c\'è.' },
      9:{ who:'vento', text:'Memoria: il treno. Un uomo ricorda di aver salutato qualcuno da un treno in movimento, e di non aver mai saputo se il saluto era stato visto. Salutò di nuovo, con tutta la mano, per tutta la vita.' },
      10:{ who:'elide', text:'Memoria: la risata. Qualcuno ricorda la risata di una madre, che riempiva la stanza anche quando la stanza era vuota.' },
      11:{ who:'elide', text:'Memoria: il tè. Qualcuno ricorda due tazze sempre sul tavolo, anche quando la casa era sola. Una per chi c\'era. Una per chi sarebbe tornato.' },
      12:{ who:'ramenta', text:'Memoria: la promessa. L\'ultima memoria è un patto tra due fratelli, pronunciato sotto il portico: "se uno si perde, l\'altro lo va a prendere. Sempre. Anche oltre la nebbia."' },
    };
    const mm = m[id];
    return mm ? [ mm, { who:'milo', text:'Mettiamo questa memoria nella tasca del foulard. Sta al caldo, lì.' } ] : [{ text:'Un ricordo tiepido.' }];
  },

  battleIntro(id){
    const intro = {
      ombra:[ { text:'Un lembo di Nebbia si è alzato dal prato. Non ha occhi, ma vi guarda.' }, { who:'milo', text:'Siamo due. I ricordi che viaggiano in due non si spengono facilmente.' } ],
      lucciola:[ { text:'Una Lucciola Grigia si aggira, cercando la sua luce.' }, { who:'tito', text:'Ehi, noi sappiamo dove finiscono le luci! Si tengono, e si riaccendono.' } ],
      custode:[
        { text:'Il grande cervo del bosco si è voltato. La sua ombra riempie la radura.' },
        { who:'custodeeco', text:'Bastianino...' },
        { who:'milo', text:'Non abbiamo nome per questo dolore, e non ne serve uno. Ti restituiamo il tuo.' },
        { text:'Il Custode china le corna. La battaglia non è contro di lui: è per lui.' },
      ],
      foca:[
        { text:'La Foca della Cenere chiude gli occhi sopra il suo mucchio di calore spento.' },
        { who:'foca', text:'Se lo lascio andare... allora non è mai esistito. Se non è mai esistito, non l\'ho mai amato. E se non l\'ho mai amato, cosa resta di me?' },
        { who:'milo', text:'Resta ciò che hai fatto con quel fuoco. Il calore non era nel fuoco: era nel modo in cui ci si è seduti vicino.' },
      ],
      vento:[
        { text:'Il vento che sa tutti i "se" si è fermato davanti a voi. Non ha corpo, ma ha rimpianti.' },
        { who:'vento', text:'Se solo avessi detto. Se solo fossi stato. Se solo avessi camminato un metro in più.' },
        { who:'tito', text:'I "se" non hanno gambe, signor Vento. Ma i passi veri sì. Ne abbiamo fatti parecchi, oggi.' },
      ],
      ramenta:[
        { text:'La Nebbia ha una casa. Al centro di tutto, una figura di vapore tiene tra le mani il colore del Borgo del Miele.' },
        { who:'ramenta', text:'Io non rubo. Conservo. Ogni colore che spengo è un colore che non può più morire.' },
        { who:'milo', text:'Ma un colore che non si muove non è un colore, Ramenta. È una prigione che si crede un ricordo.' },
        { who:'ramenta', text:'Allora giudicatemi con i vostri gesti. Se i vostri passi sanno di casa, forse anch\'io imparerò a camminare.' },
      ],
      specchio:[
        { text:'In fondo a una stanza che nessuno ha mai aperto, uno specchio riflette qualcosa di familiare.' },
        { who:'specchio', text:'Non combattermi. Dimmi soltanto: la scelta che stai per fare, la faresti davanti a te stesso? Guardami. Guardatevi.' },
      ],
    };
    return intro[id] || [{ text:'Una Nebbia si avvicina!' }];
  },

  bossPhase(id){
    const p = {
      custode:[ { who:'custode', text:'Bastianino... Bastianino...' }, { who:'custode', text:'Il nome brucia come un corno spezzato. Il dolore è la prova che l\'amore non è finito: è solo cambiato stanza.' } ],
      foca:[ { who:'foca', text:'La cenere! La mia cenere!' }, { who:'foca', text:'E se il calore tornasse solo camminando? Se custodire significasse portare, e non stringere?' } ],
      vento:[ { who:'vento', text:'Nessuno ha mai scelto di camminare contro di me.' }, { who:'vento', text:'Il vento non sa fermarsi. Ma sa, ora, che può ascoltare.' } ],
      ramenta:[ { who:'ramenta', text:'Ho tenuto il Borgo intero, e il Borgo intero mi pesa come la neve su un tetto.' }, { who:'ramenta', text:'Conservare tutto è un modo di conservare niente. Fammi sentire come finisce una cosa, quando la si ama davvero.' } ],
      specchio:[ { who:'specchio', text:'Hai scelto. Lo specchio non giudica: riflette. Guarda come hai combattuto: con le mani, con i piedi, con il cuore. È quello che farai, anche domani.' } ],
    };
    return p[id] || [{ text:'...' }];
  },

  battleWin(id){
    const w = {
      custode:[
        { who:'custode', text:'Bastianino. Lo dirò finché ci sarà luce per dirlo. Grazie, piccoli passi.' },
        { who:'milo', text:'Il nome di chi ami non va custodito stretto. Va detto, ad alta voce, ogni tanto. Così cammina da solo.' },
      ],
      foca:[
        { who:'foca', text:'Prendete la cenere. Va messa sotto un albero, dove cresce qualcosa. È il modo che ho imparato, ora, di tenere un fuoco.' },
        { who:'tito', text:'Crescerà un albero, e l\'albero farà ombra, e sotto l\'ombra qualcuno si siederà. Ecco: il fuoco cammina.' },
      ],
      vento:[
        { who:'vento', text:'Per la prima volta mi hanno ascoltato, invece di farmi il verso. Vado a portare i rimpianti dove possono diventare passi.' },
      ],
      ramenta:[
        { who:'ramenta', text:'Il colore del Borgo vi appartiene. E ora... tocca a voi dire che fine deve fare il mio cuore.' },
      ],
      specchio:[
        { who:'specchio', text:'Ti ho visto. Ti ho visto bene. Ora vai a fare la scelta con gli occhi che hai adesso.' },
      ],
    };
    return w[id] || [];
  },
};

/* finali */
const ENDINGS = {
  a: {
    title:'IL PAESE CHE RESPIRO',
    song:'epilogue',
    lines:[
      'Hai lasciato andare la Nebbia.',
      'La valle ha ricominciato a respirare, e con lei i suoi colori: il miele è tornato a essere oro che si scioglie, non oro fermo in un barattolo sigillato.',
      'Nonna Tessa ha pianto una sola volta, e poi ha ridere per tre giorni. La memoria, ha detto, è come il tè: si versa, si condivide, e ogni tanto si riempie di nuovo la tazza.',
      'Milo e Tito hanno piantato la cenere sotto il vecchio noce. In primavera è spuntato un germoglio che nessuno sapeva spiegare, e nessuno ha chiesto di spiegare.',
      'Falcò è passato un\'ultima volta. "Le strade che si chiudono bene", ha detto, "si aprono da un\'altra parte." Non l\'hanno più visto. Ma al portico, quella notte, c\'erano due tazze in più.',
      'Elide? Nessuno ne ha parlato. Eppure, quando il vento girava verso il borgo, qualcuno giurava di sentire una risata, di quelle che riempiono la stanza anche quando la stanza è vuota.',
      'Ogni fine è una porta. Milo e Tito hanno scelto di camminarci attraverso, tenendosi per mano.',
      '...e la porta si è aperta sul focolare, dove la cena era calda.',
    ],
  },
  b: {
    title:'LA LUCE FERMA',
    song:'epilogue',
    lines:[
      'Hai trattenuto la Nebbia.',
      'Il Borgo del Miele è rimasto perfetto: i gerani sempre rossi, la fontana sempre piena, le frittelle sempre calde. Nessuno invecchia, nessuno parte, nessuna tazza si svuota.',
      'Ma dopo un po\' i fratelli hanno notato una cosa: la signora Marta raccontava sempre la stessa storia, alla stessa ora, con le stesse parole. E rideva, ma come si ride a uno spettacolo già visto.',
      'La perfezione è un ricordo che ha smesso di camminare. E un ricordo fermo, alla fine, non è più un ricordo: è un museo con le luci accese di notte.',
      'Una sera Milo ha guardato Tito. Non hanno detto nulla. Ma hanno capito, tutti e due, che la felicità che non può finire è una felicità che non può cominciare.',
      'Hanno scelto di lasciare il Borgo, una volta ogni tanto, per vedere il colore finire e rinascere. Tornano sempre. Perché la casa, hanno capito, è il posto da cui si parte sapendo di tornare.',
      'Nonna Tessa, il giorno della loro partenza, ha sorriso. "Allora il patto era giusto", ha detto. "Il focolare siete voi, non il fuoco."',
    ],
  },
  c: {
    title:'LE STELLE CAMMINANO',
    song:'epilogue',
    lines:[
      'Hai scelto la via che nessuna voce aveva promesso: camminare accanto a ciò che finisce, senza trattenerlo e senza lasciarlo.',
      'Ramenta, per la prima volta, ha mosso un passo. Il vapore ha preso la forma di una piccola fiamma, e si è seduta nel focolare della Nonna, accanto alla sua tazza di sempre.',
      'E alla Nonna è successa una cosa strana: ha ricordato quello che non è mai successo. Ha ricordato Elide che versava il tè, Elide che cantava, Elide che rincorreva due bambini sotto il portico.',
      '"Io ricordo quello che non è mai successo", ha detto. E la fiamma ha tremato, perché era vero: non era successo. Ma ora, ricordato da un cuore che lo amava, era accaduto.',
      'La memoria non serve a conservare ciò che è stato. Serve a rendere vero ciò che avrebbe potuto essere, e che l\'amore ha deciso che fosse.',
      'Milo e Tito hanno aggiunto una terza tazza al tavolo. Non perché ci fosse qualcuno. Perché la tazza, come la casa, è il posto dove il possibile si siede.',
      'Fuori, nel buio, la Nebbia non è scomparsa: ha imparato a camminare. E quando passa sul Borgo, lascia cadere stelle.',
      'Le stelle, adesso, camminano. E chi le vede, ricorda ciò che non è mai successo: che ogni addio, se lo accompagni abbastanza, diventa un arrivederci.',
      'FINE. Grazie per aver camminato con Milo e Tito.',
    ],
  },
  d: {
    title:'IL BORGO SENZA VOCI',
    song:'coast',
    lines:[
      'La scelta è arrivata troppo presto, e il mondo è rimasto a metà: metà colore, metà nebbia, metà voce.',
      'Le memorie disperse non sono state riportate a casa. Le voci del Borgo, alcune, sono rimaste sospese, come lettere senza indirizzo.',
      'Milo e Tito sono tornati. La cena era calda, perché per Nonna lo sarebbe sempre stata.',
      'Ma al portico, a volte, si sente una domanda senza risposta. Non fa male. Semplicemente, aspetta.',
      'Il Borgo vive. E ogni memoria che resta fuori, una sera, si ricorda da sola di come si torna a casa.',
      'Forse non era il finale. Ma era il vostro cammino. E ogni cammino, anche il più corto, insegna a chi lo percorre il modo di allungarsi.',
    ],
  },
};