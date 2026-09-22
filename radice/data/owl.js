const OWL_DIALOGUES = {
  greeting: {
    morning: 'Buongiorno, lettore. Il gufo è ancora un po\' sonnolento...',
    afternoon: 'Buon pomeriggio. Le pagine ti aspettano, se hai voglia di leggere.',
    evening: 'Sera dolce. Il crepuscolo è il momento migliore per leggere.',
    night: 'La notte è il regno delle storie. Il gufo non dorme mai... davvero.'
  },
  idle: [
    'Shhh... leggi. Il gufo sta ascoltando.',
    'Questa pagina ha un profumo speciale. Lo senti?',
    'Il gufo sogna storie. E tu?',
    'Leggere è come respirare, ma con le parole.',
    'Ogni libro è una stanza. Ogni stanza è un mondo.',
    'Le radici scrivono mentre tu leggi.',
    'Il gufo non sempre parla. A volte basta pigolare.',
    'Sai qual è la differenza tra leggere e vivere? Nessuna, se il libro è abbastanza bello.'
  ],
  chapterFound: [
    'Hai trovato un capitolo raro! Il gufo si sveglia per un istante.',
    'Un capitolo! Il gufo è orgoglioso di te.',
    'Mamma mia, un capitolo leggendario! Il gufo non può credere ai suoi occhi.',
    'Il gufo trema dall\'emozione. Questo capitolo è speciale.'
  ],
  roomUnlocked: [
    'Una nuova stanza! Il gufo ti porta lì subito.',
    'Guarda, si è aperta una nuova porta nell\'albero!',
    'Il gufo è felice. La biblioteca cresce grazie a te.',
    'Un\'altra stanza si aggiunge alla collezione. Ottimo lavoro!'
  ],
  reading: [
    'Continua... il gufo aspetta.',
    'Le parole si muovono. Lasciale guidare.',
    'Leggi con il cuore, non solo con gli occhi.',
    'Il gufo si avvicina per vedere meglio.',
    'La storia sta prendendo forma. Il gufo ci crede.'
  ],
  finished: [
    'Hai finito! Il gufo applaude con il becco.',
    'Bellissima storia. Il gufo ne parla ancora.',
    'Il gufo si è appollaiato. E soddisfatto.',
    'Grazie per aver letto. Il gufo ti è grato.',
    'Ogni storia letta fa crescere l\'albero. Il gufo lo sa.'
  ],
  gacha: [
    'Il gufo è nervoso. La prossima estrazione potrebbe cambiare tutto.',
    'Le pagine si mescolano... il gufo tiene gli occhi chiusi.',
    'Aspetta... il gufo sente una storia forte uscire dal mucchio.',
    'Il mucchio di libri brilla. Il gufo sa che qualcosa di grande sta per accadere.',
    'Le pagine volano! Il gufo cerca di seguirle con lo sguardo.'
  ],
  tree: [
    'Guarda l\'albero. È cresciuto grazie a te.',
    'L\'albero è vivo. Lo senti? Il gufo lo sente.',
    'Ogni stanza illuminata è una storia che hai scritto.',
    'L\'albero ti ringrazia per ogni pagina letta.',
    'Il gufo vola intorno all\'albero. È felice. Anche tu dovresti esserlo.'
  ],
  rareChapter: [
    'Guarda! Un capitolo raro! Il gufo non riesce a parlare.',
    'Una rarità! Il gufo ha aspettato mesi per questo.',
    'Questo capitolo è speciale. Il gufo lo sa. Lo sai anche tu.',
    'I capitoli rari sono i pezzi più preziosi della biblioteca.'
  ]
};

function getRandomDialogue(type, timeOfDay) {
  const pool = OWL_DIALOGUES[type] || OWL_DIALOGUES.idle;
  if (Array.isArray(pool)) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return pool[timeOfDay] || OWL_DIALOGUES.idle[0];
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night';
}

function getOwlState(roomCount) {
  if (roomCount === 0) return { mood: 'sleepy', animation: 'sleeping' };
  if (roomCount < 3) return { mood: 'drowsy', animation: 'perched' };
  if (roomCount < 7) return { mood: 'happy', animation: 'perched-wings' };
  if (roomCount < 12) return { mood: 'proud', animation: 'flying' };
  return { mood: 'ecstatic', animation: 'flying-circles' };
}
