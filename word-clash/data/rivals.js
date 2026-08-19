/* RIVALS — le librerie rivali da assaltare. needCatalogo = livello minimo del tuo Catalogo.
   spec = edifici che possiede (per generare la mappa di battaglia). */
const RIVALS = [
  { id:'r1', name:'Biblioteca Comunale del Quartiere Alto', emoji:'🏘️', needCatalogo:1,
    loot:150, dobloni:1,
    spec:{ catalogo:1, banco:1, caffe:0, edicola:0, torretta:0, trappola:0, muro:4, muroLv:1 } },
  { id:'r2', name:'Libreria "Rotti dal Tempo"', emoji:'📜', needCatalogo:1,
    loot:220, dobloni:1,
    spec:{ catalogo:1, banco:2, caffe:1, edicola:0, torretta:0, trappola:1, muro:5, muroLv:1 } },
  { id:'r3', name:'La Cineteca dei Polverosi', emoji:'🎞️', needCatalogo:2,
    loot:420, dobloni:2,
    spec:{ catalogo:2, banco:3, caffe:2, edicola:1, torretta:1, trappola:1, muro:6, muroLv:2 } },
  { id:'r4', name:'Archivio Statale delle Ricette', emoji:'🍝', needCatalogo:2,
    loot:620, dobloni:2,
    spec:{ catalogo:2, banco:3, caffe:2, edicola:2, torretta:2, trappola:2, muro:8, muroLv:2 } },
  { id:'r5', name:'Emporio di Fantascienza Usata', emoji:'👽', needCatalogo:3,
    loot:950, dobloni:3,
    spec:{ catalogo:3, banco:4, caffe:3, edicola:3, torretta:2, trappola:2, muro:10, muroLv:3 } },
  { id:'r6', name:'Antichità Grammaticali & Figli', emoji:'🏺', needCatalogo:3,
    loot:1250, dobloni:3,
    spec:{ catalogo:3, banco:5, caffe:3, edicola:4, torretta:3, trappola:3, muro:12, muroLv:3 } },
  { id:'r7', name:'La Torre dei Dizionari', emoji:'🗼', needCatalogo:4,
    loot:1800, dobloni:4,
    spec:{ catalogo:4, banco:5, caffe:4, edicola:5, torretta:3, trappola:3, muro:14, muroLv:4 } },
  { id:'r8', name:'Il Grande Archivio Proibito', emoji:'🚫', needCatalogo:4,
    loot:2400, dobloni:5,
    spec:{ catalogo:4, banco:5, caffe:5, edicola:5, torretta:4, trappola:4, muro:16, muroLv:4 } }
];