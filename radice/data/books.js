const BOOKS = [
  // === SALOTTINO - Comune ===
  { id: 'lib-001', title: 'Il Tè delle Cinque', roomType: 'salottino', rarity: 'comune', pages: 4, story: 'Una tazza di tè, un libro aperto, e il crepuscolo che filtra dalle finestre. Nulla di più necessario.', flavor: 'Il profumo del tè si mescola alla carta.' },
  { id: 'lib-002', title: 'La Poltrona Rossa', roomType: 'salottino', rarity: 'comune', pages: 3, story: 'Una poltrona di velluto rosso attende nel salottino. Chi ci si siede trova storie che non sapeva di cercare.', flavor: 'Il velluto è caldo come il ricordo di qualcuno.' },
  { id: 'lib-003', title: 'La Lettura Serale', roomType: 'salottino', rarity: 'comune', pages: 5, story: 'La notte scende dolcemente. Le pagine si voltano al ritmo del respiro. Ogni storia è un rifugio.', flavor: 'Le luci si abbassano automaticamente.' },
  { id: 'lib-004', title: 'Il Camino Imaginario', roomType: 'salottino', rarity: 'comune', pages: 3, story: 'Non c\'è fuoco, ma il calore c\'è. È il calore di una storia ben raccontata che scalda il cuore.', flavor: 'Le radici formano un cerchio come un camino.' },
  { id: 'lib-005', title: 'Il Libro Dimenticato', roomType: 'salottino', rarity: 'comune', pages: 4, story: 'Qualcuno ha lasciato questo libro sullo schienale. Le pagine sono ancora calde dell\'ultima lettura.', flavor: 'C\'è una pagina barrata a mano.' },
  { id: 'lib-006', title: 'Il Cuscino di Pagina', roomType: 'salottino', rarity: 'comune', pages: 2, story: 'Un cuscino fatto di pagine vecchie. Morbido come una storia e caldo come un ricordo.', flavor: 'Sussurra quando lo si accarezza.' },
  { id: 'lib-007', title: 'La Coperta di Filo', roomType: 'salottino', rarity: 'comune', pages: 3, story: 'Una coperta tessuta con fili di inchiostro. Copre chi la usa come una carezza di parole.', flavor: 'I fili brillano debolmente.' },

  // === ATARIO - Raro ===
  { id: 'lib-008', title: 'L\'Arco di Luce', roomType: 'atrio', rarity: 'raro', pages: 6, story: 'Il sole entra attraverso l\'arco e disegna figure sulla parete di pietra. Sono storie proiettate dalla luce.', flavor: 'Le ombre danzano come attori.' },
  { id: 'lib-009', title: 'Il Corridoio dei Sussurri', roomType: 'atrio', rarity: 'raro', pages: 5, story: 'I libri lungo le pareti sussurrano segreti. Ma solo chi cammina con calma può sentirli.', flavor: 'Il silenzio è parte della storia.' },
  { id: 'lib-010', title: 'La Fontana del Sapere', roomType: 'atrio', rarity: 'raro', pages: 7, story: 'Acqua color inchiostro zampilla da una fontana marmorea. Bere da essa è leggere la storia dell\'acqua stessa.', flavor: 'L\'acqua ha un sapore di carta.' },
  { id: 'lib-011', title: 'Il Grande Oblò', roomType: 'atrio', rarity: 'raro', pages: 4, story: 'Un vetro enorme mostra il cielo come un\'opera d\'arte. Nuvole, stormi, tramonti: tutti narrano qualcosa.', flavor: 'Il vetro è caldo al tatto.' },
  { id: 'lib-012', title: 'La Scala di Pagina', roomType: 'atrio', rarity: 'raro', pages: 5, story: 'Una scala di pietra porta in alto. Ogni gradino è una pagina di un libro che non hai ancora letto.', flavor: 'La scala brilla leggermente.' },
  { id: 'lib-013', title: 'Il Mappamondo Vivente', roomType: 'atrio', rarity: 'raro', pages: 6, story: 'Una mappa che si muove da sola. I continenti cambiano posizione in base alle storie letti.', flavor: 'La carta geografica pulsa.' },

  // === SERRA - Epico ===
  { id: 'lib-014', title: 'La Pianta di Carta', roomType: 'serra', rarity: 'epico', pages: 8, story: 'Una pianta fatta di pagine cresce rigogliosa. Le sue foglie sono storie che non hanno ancora finito di nascere.', flavor: 'Il fogliame canta un coro sottile.' },
  { id: 'lib-015', title: 'Il Vapore delle Parole', roomType: 'serra', rarity: 'epico', pages: 7, story: 'Il vapore sale dalle pagine umide. Ogni parola ha il suo profumo: lavanda per le poesie, legno per i romanzi.', flavor: 'L\'aria è densa di storie.' },
  { id: 'lib-016', title: 'Il Germoglio', roomType: 'serra', rarity: 'epico', pages: 6, story: 'Qualcosa sta crescendo tra le pagine. Un germoglio verde che promette un raccolto di nuovi beginning.', flavor: 'Il germoglio è luminoso.' },
  { id: 'lib-017', title: 'La Luce Filtrata', roomType: 'serra', rarity: 'epico', pages: 8, story: 'Il sole passa attraverso le pagine delle piante. Ogni foglia è una storia diversa, ogni ombra una promessa.', flavor: 'I raggi creano disegni sul pavimento.' },
  { id: 'lib-018', title: 'Il Giardino di Cristallo', roomType: 'serra', rarity: 'epico', pages: 7, story: 'Piante di cristallo crescono tra le pagine. Ogni cristallo è una storia congelata nel tempo, luminosa e perfetta.', flavor: 'I cristalli tintinnano dolcemente.' },
  { id: 'lib-019', title: 'La Serra dei Sogni', roomType: 'serra', rarity: 'epico', pages: 9, story: 'Qui crescono piante che sognano. Le foglie si muovono anche quando non c\'è vento. Stanno sognando nuove storie.', flavor: 'Le piante sussurrano nel sonno.' },

  // === CAPITOLI RARI ===
  { id: 'lib-020', title: 'Prologo: Radici Antiche', roomType: 'atrio', rarity: 'leggendario', pages: 10, story: 'Prima che l\'albero fosse albero, era un seme. Un seme di carta e inchiostro, caduto dal cielo come una promessa.', flavor: 'Il gufo si posa sulla prima pagina.' },
  { id: 'lib-021', title: 'Il Tempo delle Storie', roomType: 'serra', rarity: 'leggendario', pages: 10, story: 'Il tempo nell\'albero scorre diverso. Un minuto qui è un anno là fuori. Leggere è viaggiare nel tempo.', flavor: 'L\'orologio segna un\'ora impossibile.' },
  { id: 'lib-022', title: 'La Luce Dentro', roomType: 'serra', rarity: 'leggendario', pages: 10, story: 'La luce non viene da fuori. È generata dalle storie stesse. Ogni libro aperto emette un alone caldo.', flavor: 'Tutto l\'albero pulsa di luce.' },
  { id: 'lib-023', title: 'Radice Finale', roomType: 'atrio', rarity: 'leggendario', pages: 10, story: 'Alla base dell\'albero c\'è una radice che brilla. È la prima storia mai scritta. Se la leggi, capisci perché l\'albero esiste.', flavor: 'Il gufo si alza per l\'ultima volta.' },
  { id: 'lib-024', title: 'La Pagina Mancante', roomType: 'atrio', rarity: 'epico', pages: 8, story: 'Ogni libro ha una pagina mancante. Non è un difetto: è un invito. Il lettore deve completare la storia.', flavor: 'Una pagina bianca fluttua nell\'aria.' },
  { id: 'lib-025', title: 'Il Ponte di Carta', roomType: 'atrio', rarity: 'epico', pages: 8, story: 'Tra le stanze dell\'albero esiste un ponte fatto di carta. Attraversarlo è come passare da una storia all\'altra.', flavor: 'Il ponte sembra tremare leggermente.' },
  { id: 'lib-026', title: 'Il Sussurro delle Foglie', roomType: 'serra', rarity: 'raro', pages: 6, story: 'Le foglie non cadono: sussurrano. Ogni foglia che tocca il terreno diventa una pagina.', flavor: 'Si sente il fruscio di migliaia di pagine.' },
  { id: 'lib-027', title: 'Il Gufo Sonnolento', roomType: 'salottino', rarity: 'raro', pages: 6, story: 'Il gufo bibliotecario non è sempre stato gufo. Era un uomo che leggeva così tanto che si trasformò.', flavor: 'Pigola dolcemente, gli occhi chiusi.' },
  { id: 'lib-028', title: 'La Foglia che Ricorda', roomType: 'salottino', rarity: 'raro', pages: 5, story: 'Una foglia conserva ogni storia letta. Se la stringi tra le dita, puoi sentire le voci di chi l\'ha letta prima.', flavor: 'La foglia brillava leggermente.' },
  { id: 'lib-029', title: 'L\'Ombra del Lettore', roomType: 'salottino', rarity: 'raro', pages: 5, story: 'Quando leggi, la tua ombra si estende tra le pagine. Se sei abbastanza concentrato, puoi vedere l\'ombra muoversi.', flavor: 'L\'ombra ha la forma di un libro aperto.' },

  // === SEMPLICI COMUNE EXTRA ===
  { id: 'lib-030', title: 'Il Rifugio', roomType: 'salottino', rarity: 'comune', pages: 3, story: 'Un angolo perfetto tra le radici. Qui il tempo si ferma e la lettura è l\'unica fretta.', flavor: 'Le radici ti avvolgono come un abbraccio.' },
  { id: 'lib-031', title: 'La Pagina Calda', roomType: 'salottino', rarity: 'comune', pages: 2, story: 'Una pagina appena stampata. È ancora calda dalla stampante. L\'inchiostro profuma di promesse nuove.', flavor: 'Il calore si trasmette alle dita.' },
  { id: 'lib-032', title: 'Il Segnapagina', roomType: 'salottino', rarity: 'comune', pages: 2, story: 'Un segna pagina fatto di un filo d\'erba. Segna solo le pagine importanti, dove il cuore batte più forte.', flavor: 'Il filo brilla di un verde vivo.' },
  { id: 'lib-033', title: 'La Porta Segreta', roomType: 'atrio', rarity: 'raro', pages: 7, story: 'Una porta nascosta tra gli scaffali. La maniglia è calda. Qualcuno l\'ha appena lasciata aperta.', flavor: 'La porta si apre su un corridoio sconosciuto.' },
  { id: 'lib-034', title: 'Il Diário', roomType: 'atrio', rarity: 'raro', pages: 6, story: 'Un diario trovato su una panchina. Le pagine sono piene di appunti, schizzi e sogni non realizzati.', flavor: 'La calligrafia è nervosa e emozionata.' },
  { id: 'lib-035', title: 'L\'Archivio', roomType: 'serra', rarity: 'epico', pages: 9, story: 'Un archivio vivente dove ogni libro è una storia che ha ancora qualcosa da dire.', flavor: 'I libri si riconoscono tra loro.' },
];

const RARITY_CONFIG = {
  comune: { color: '#a0a0a0', weight: 55, name: 'Comune', icon: '📖' },
  raro: { color: '#3b82f6', weight: 25, name: 'Raro', icon: '🔵' },
  epico: { color: '#8b5cf6', weight: 15, name: 'Epico', icon: '🟣' },
  leggendario: { color: '#f59e0b', weight: 5, name: 'Leggendario', icon: '⭐' }
};

function getBookById(id) {
  return BOOKS.find(b => b.id === id) || null;
}

function getBooksByRoom(roomType) {
  return BOOKS.filter(b => b.roomType === roomType);
}

function getBooksByRarity(rarity) {
  return BOOKS.filter(b => b.rarity === rarity);
}

function rollBook(rarityBias) {
  const rarities = Object.keys(RARITY_CONFIG);
  const weights = rarities.map(r => RARITY_CONFIG[r].weight * (rarityBias === r ? 3 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let chosenRarity = rarities[0];
  for (let i = 0; i < rarities.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { chosenRarity = rarities[i]; break; }
  }
  const books = getBooksByRarity(chosenRarity);
  return books[Math.floor(Math.random() * books.length)];
}

function rollChapter() {
  const chapters = getChaptersByRarity('leggendario').concat(getChaptersByRarity('epico'));
  return chapters[Math.floor(Math.random() * chapters.length)];
}
