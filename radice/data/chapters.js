const CHAPTERS = [
  {
    id: 'cap-prologo',
    title: 'Prologo: Radici antiche',
    roomType: 'atrio',
    rarity: 'leggendario',
    text: 'Prima che l\'albero fosse albero, era un seme. Un seme di carta e inchiostro, caduto dal cielo come una promessa. Qualcuno lo ha piantato e ha atteso. Ha atteso così a lungo che le radici hanno iniziato a scrivere la loro storia.',
    flavor: 'Il gufo si posa sulla prima pagina e sorride.'
  },
  {
    id: 'cap-sussurro',
    title: 'Il Sussurro delle Foglie',
    roomType: 'serra',
    rarity: 'raro',
    text: 'Le foglie dell\'albero non cadono: sussurrano. Ogni foglia che tocca il terreno diventa una pagina. L\'inchiostro è la linfa, la carta è il tempo.',
    flavor: 'Si sente il fruscio di migliaia di pagine.'
  },
  {
    id: 'cap-gufo',
    title: 'Il Gufo Sonnolento',
    roomType: 'salottino',
    rarity: 'raro',
    text: 'Il gufo bibliotecario non è sempre stato gufo. Era un uomo che leggeva così tanto che si trasformò. Oggi dorme tra le pagine, e sogna storie che nessuno ha ancora scritto.',
    flavor: 'Pigola dolcemente, gli occhi chiusi.'
  },
  {
    id: 'cap-pagina',
    title: 'La Pagina Mancante',
    roomType: 'atrio',
    rarity: 'epico',
    text: 'Ogni libro ha una pagina mancante. Non è un difetto: è un invito. Il lettore deve completare la storia con la propria immaginazione. E quando lo fa, la pagina appare, luminosa e nuova.',
    flavor: 'Una pagina bianca fluttua nell\'aria.'
  },
  {
    id: 'cap-tempo',
    title: 'Il Tempo delle Storie',
    roomType: 'serra',
    rarity: 'leggendario',
    text: 'Il tempo nell\'albero scorre diverso. Un minuto qui è un anno là fuori. Le storie crescono come piante, con radici che affondano nel passato e rami che toccano il futuro. Leggere è viaggiare nel tempo, letteralmente.',
    flavor: 'L\'orologio dell\'albero segna un\'ora che non esiste altrove.'
  },
  {
    id: 'cap-foglia',
    title: 'La Foglia che Ricorda',
    roomType: 'salottino',
    rarity: 'raro',
    text: 'Una foglia conserva ogni storia letta. Se la stringi tra le dita, puoi sentire le voci di chi l\'ha letta prima di te. La biblioteca è viva, e ogni lettore aggiunge un ricordo.',
    flavor: 'La foglia brillava leggermente.'
  },
  {
    id: 'cap-bridge',
    title: 'Il Ponte di Carta',
    roomType: 'atrio',
    rarity: 'epico',
    text: 'Tra le stanze dell\'albero esiste un ponte fatto di carta. Attraversarlo è come passare da una storia all\'altra. Chiunque lo percorra porta con sé un pezzo di ogni stanza.',
    flavor: 'Il ponte sembra tremare leggermente.'
  },
  {
    id: 'cap-luce',
    title: 'La Luce Dentro',
    roomType: 'serra',
    rarity: 'leggendario',
    text: 'La luce non viene da fuori. È generata dalle storie stesse. Ogni libro aperto emette un alone caldo. Più storie leggi, più luminosa diventa l\'albero. L\'oscurità non esiste qui.',
    flavor: 'Tutto l\'albero pulsa di una luce dorata.'
  },
  {
    id: 'cap-ombra',
    title: 'L\'Ombra del Lettore',
    roomType: 'salottino',
    rarity: 'raro',
    text: 'Quando leggi, la tua ombra si estende tra le pagine. Se sei abbastanza concentrato, puoi vedere l\'ombra muoversi con le parole. Il gufo dice che sei tu la storia, non il contrario.',
    flavor: 'L\'ombra sul muro ha la forma di un libro aperto.'
  },
  {
    id: 'cap-radice',
    title: 'Radice Finale',
    roomType: 'atrio',
    rarity: 'leggendario',
    text: 'Alla base dell\'albero c\'è una radice che brilla. È la prima storia mai scritta. Se la leggi, capisci perché l\'albero esiste. Non è un albero di legno: è un albero di parole, e ogni parola è un lettore.',
    flavor: 'Il gufo si alza per l\'ultima volta.'
  }
];

function getChapterById(id) {
  return CHAPTERS.find(c => c.id === id) || null;
}

function getChaptersByRarity(rarity) {
  return CHAPTERS.filter(c => c.rarity === rarity);
}

function getRandomChapters(count, rarity) {
  const filtered = rarity ? CHAPTERS.filter(c => c.rarity === rarity) : CHAPTERS;
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
