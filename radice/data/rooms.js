const ROOMS = {
  salottino: {
    id: 'salottino',
    name: 'Salottino',
    description: 'Un angolo accogliente tra le radici dell\'albero',
    color: '#8b6f4e',
    lightColor: '#f5a623',
    icon: '🛋️',
    stories: [
      { title: 'Il tè delle cinque', text: 'Il gufo bibliotecario si sveglia dal sonno e sfoglia le pagine di un libro dimenticato. La stanza profuma di camphor e vecchie carte.' },
      { title: 'Il camino spento', text: 'Le radici intrecciano un camino immaginario. Il calore non è vero, ma la nostalgia lo è.' },
      { title: 'La poltrona di velluto', text: 'Una poltrona rosso fuoco attende chi vuole sognare ad occhi aperti tra le pagine.' },
      { title: 'Il libro dimenticato', text: 'Qualcuno ha lasciato un libro aperto sullo schienale. Le pagine sono ancora calde dall\'ultima lettura.' }
    ]
  },
  atrio: {
    id: 'atrio',
    name: 'Atrio',
    description: 'L\'ingresso maestoso dove la luce filtra dalle foglie',
    color: '#3d6b21',
    lightColor: '#c9f5d8',
    icon: '🏛️',
    stories: [
      { title: 'L\'arco di luce', text: 'Il sole passa attraverso le foglie dell\'albero e proietta giochi di luce sul pavimento di pietra.' },
      { title: 'Il corridoio dei sussurri', text: 'I libri disposti lungo le pareti sembrano parlare tra loro. Ma solo chi ascolta davvero capisce.' },
      { title: 'La fontana del sapere', text: 'Una fontana in marmo verde zampilla acqua che brilla come inchiostro liquido.' },
      { title: 'Il grande oblò', text: 'Un vetro enorme mostra il cielo. Passano uccelli, nuvole, e qualche pensiero fugace.' }
    ]
  },
  serra: {
    id: 'serra',
    name: 'Serra',
    description: 'Un giardino di carta e luce dove crescono storie viventi',
    color: '#2d8c4a',
    lightColor: '#b8e6c0',
    icon: '🌿',
    stories: [
      { title: 'La pianta di carta', text: 'Un foglio di carta è cresciuto fino a diventare una pianta. Le sue foglie sono pagine bianche che aspettano di essere scritte.' },
      { title: 'Il vapore delle parole', text: 'Il vapore sale dalle pagine umide. Ogni parola ha il suo profumo: lavanda per le poesie, legno per i romanzi.' },
      { title: 'Il germoglio di storie', text: 'Qualcosa sta crescendo tra le pagine. Un germoglio verde che promette un raccolto di nuovi beginning.' },
      { title: 'La luce filtrata', text: 'Il sole passa attraverso le pagine delle piante. Ogni foglia è una storia diversa, ogni ombra una promessa.' }
    ]
  }
};

const ROOM_TYPES = ['salottino', 'atrio', 'serra'];

function getRoomById(id) {
  return ROOMS[id] || null;
}

function getRoomType(rarity) {
  if (rarity === 'leggendario') return 'serra';
  if (rarity === 'epico') return 'atrio';
  return 'salottino';
}

function getRoomStats() {
  const stats = { salottino: 0, atrio: 0, serra: 0 };
  return stats;
}
