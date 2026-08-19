/* SCENES — layout 3D di ogni casa (piano a vista, dollhouse) + zone + coreografia attività.
   Coordinate: x = larghezza, z = profondità (porta a z≈0, fronte aperta), y = alto. */
const SCENES = {
  stanza_studenti: {
    floorW: 7, floorD: 6, floorColor: '#d9b084', wallColor: '#f4dbe6',
    furniture: [
      { type:'divano', x:1.6, z:3.4, w:2.4, d:1.0 },
      { type:'tv',     x:6.0, z:3.0, w:1.2, d:0.5 },
      { type:'tavolo', x:3.4, z:3.6, w:1.6, d:1.1 },
      { type:'sedia',  x:3.4, z:2.95 },
      { type:'sedia',  x:2.7, z:3.6 },
      { type:'sedia',  x:4.1, z:3.6 },
      { type:'cucina', x:5.4, z:5.2, w:1.8, d:0.7 },
      { type:'bagno',  x:1.2, z:5.3, w:1.3, d:0.7 },
      { type:'cassa',  x:2.6, z:5.2, w:0.7, d:0.7 },
      { type:'scaffale',x:0.9, z:0.8, w:1.1, d:0.4 },
      { type:'lampada',x:6.2, z:0.9 },
      { type:'tappeto',x:3.5, z:2.0, w:2.6, d:1.7 },
      { type:'entrata',x:3.5, z:0.5, w:1.4, d:0.8 }
    ],
    zones: { living:{x:1.9,z:3.4}, cucina:{x:5.4,z:5.0}, tavolo:{x:3.4,z:3.6}, centro:{x:3.5,z:2.6}, porta:{x:3.5,z:1.0} }
  },
  appartamento: {
    floorW: 8, floorD: 7, floorColor: '#d9b084', wallColor: '#e9f0fa',
    furniture: [
      { type:'divano', x:1.8, z:4.8, w:2.8, d:1.1 },
      { type:'tv',     x:7.0, z:3.6, w:1.4, d:0.5 },
      { type:'tavolo', x:4.2, z:4.2, w:1.8, d:1.2 },
      { type:'sedia',  x:4.2, z:3.4 },
      { type:'sedia',  x:3.3, z:4.2 },
      { type:'sedia',  x:5.1, z:4.2 },
      { type:'cucina', x:6.0, z:6.0, w:2.0, d:0.8 },
      { type:'bagno',  x:1.3, z:6.2, w:1.5, d:0.8 },
      { type:'cassa',  x:2.8, z:6.1, w:0.7, d:0.7 },
      { type:'scaffale',x:1.0, z:0.9, w:1.3, d:0.4 },
      { type:'lampada',x:7.0, z:1.2 },
      { type:'tappeto',x:4.2, z:2.4, w:2.8, d:1.9 },
      { type:'entrata',x:4.0, z:0.5, w:1.5, d:0.8 }
    ],
    zones: { living:{x:2.2,z:4.8}, cucina:{x:6.0,z:5.8}, tavolo:{x:4.2,z:4.2}, centro:{x:4.0,z:2.9}, porta:{x:4.0,z:1.1} }
  },
  casa: {
    floorW: 9, floorD: 8, floorColor: '#d9b084', wallColor: '#ffe8ee',
    furniture: [
      { type:'divano', x:2.0, z:5.6, w:3.0, d:1.1 },
      { type:'tv',     x:8.0, z:4.2, w:1.5, d:0.5 },
      { type:'tavolo', x:4.6, z:4.6, w:1.9, d:1.3 },
      { type:'sedia',  x:4.6, z:3.75 },
      { type:'sedia',  x:3.65, z:4.6 },
      { type:'sedia',  x:5.55, z:4.6 },
      { type:'sedia',  x:4.6, z:5.4 },
      { type:'cucina', x:6.6, z:6.9, w:2.2, d:0.9 },
      { type:'bagno',  x:1.4, z:7.0, w:1.6, d:0.9 },
      { type:'cassa',  x:3.2, z:7.1, w:0.8, d:0.7 },
      { type:'pianta', x:1.0, z:7.3, w:0.6, d:0.6 },
      { type:'prato',  x:2.2, z:7.3, w:2.6, d:1.2 },
      { type:'scaffale',x:1.2, z:0.9, w:1.4, d:0.4 },
      { type:'lampada',x:8.2, z:1.0 },
      { type:'tappeto',x:4.8, z:2.8, w:3.0, d:2.0 },
      { type:'entrata',x:4.5, z:0.5, w:1.6, d:0.8 }
    ],
    zones: { living:{x:2.4,z:5.6}, cucina:{x:6.6,z:6.7}, tavolo:{x:4.6,z:4.6}, giardino:{x:2.4,z:7.3}, centro:{x:4.8,z:3.4}, porta:{x:4.5,z:1.1} }
  },
  villa: {
    floorW: 11, floorD: 9, floorColor: '#d9b084', wallColor: '#e6f4ff',
    furniture: [
      { type:'divano', x:2.2, z:6.0, w:3.4, d:1.2 },
      { type:'tv',     x:10.0, z:4.6, w:1.6, d:0.5 },
      { type:'tavolo', x:5.4, z:5.2, w:2.0, d:1.4 },
      { type:'sedia',  x:5.4, z:4.3 },
      { type:'sedia',  x:4.4, z:5.2 },
      { type:'sedia',  x:6.4, z:5.2 },
      { type:'sedia',  x:5.4, z:6.0 },
      { type:'cucina', x:7.6, z:7.8, w:2.6, d:1.0 },
      { type:'bagno',  x:1.6, z:8.0, w:1.7, d:0.9 },
      { type:'cassa',  x:3.6, z:8.0, w:0.8, d:0.8 },
      { type:'pianta', x:1.1, z:8.4, w:0.7, d:0.7 },
      { type:'prato',  x:2.4, z:7.6, w:2.8, d:1.4 },
      { type:'piscina',x:8.6, z:2.2, w:2.6, d:1.8 },
      { type:'scaffale',x:1.3, z:0.9, w:1.5, d:0.4 },
      { type:'lampada',x:10.2, z:1.0 },
      { type:'tappeto',x:5.4, z:2.8, w:3.2, d:2.0 },
      { type:'entrata',x:5.5, z:0.5, w:1.7, d:0.8 }
    ],
    zones: { living:{x:2.8,z:6.0}, cucina:{x:7.6,z:7.6}, tavolo:{x:5.4,z:5.2}, piscina:{x:8.6,z:2.2}, giardino:{x:2.6,z:7.8}, centro:{x:5.6,z:3.8}, porta:{x:5.5,z:1.1} }
  },
  mega_villa: {
    floorW: 13, floorD: 10, floorColor: '#d9b084', wallColor: '#fff0f5',
    furniture: [
      { type:'divano', x:2.4, z:6.6, w:3.8, d:1.3 },
      { type:'tv',     x:12.0, z:5.0, w:1.8, d:0.5 },
      { type:'tavolo', x:6.2, z:5.8, w:2.2, d:1.5 },
      { type:'sedia',  x:6.2, z:4.8 },
      { type:'sedia',  x:5.1, z:5.8 },
      { type:'sedia',  x:7.3, z:5.8 },
      { type:'sedia',  x:6.2, z:6.7 },
      { type:'cucina', x:8.8, z:8.8, w:3.0, d:1.1 },
      { type:'bagno',  x:1.7, z:9.0, w:1.9, d:1.0 },
      { type:'cassa',  x:4.0, z:9.0, w:0.9, d:0.8 },
      { type:'pianta', x:1.1, z:9.4, w:0.7, d:0.7 },
      { type:'prato',  x:2.6, z:8.2, w:3.0, d:1.6 },
      { type:'piscina',x:10.0, z:2.6, w:2.8, d:2.0 },
      { type:'dj',     x:11.4, z:8.6, w:1.2, d:0.8 },
      { type:'bar',    x:11.8, z:7.0, w:1.6, d:0.7 },
      { type:'scaffale',x:1.4, z:0.9, w:1.6, d:0.4 },
      { type:'lampada',x:11.6, z:1.0 },
      { type:'tappeto',x:6.2, z:3.0, w:3.6, d:2.2 },
      { type:'entrata',x:6.5, z:0.5, w:1.8, d:0.8 }
    ],
    zones: { living:{x:2.9,z:6.6}, cucina:{x:8.8,z:8.6}, tavolo:{x:6.2,z:5.8}, piscina:{x:10.0,z:2.6}, giardino:{x:2.8,z:8.4}, discoteca:{x:11.4,z:8.6}, centro:{x:6.6,z:4.2}, porta:{x:6.5,z:1.1} }
  }
};

/* Attività → zona + animazione dei personaggi */
const ACTIVITY_ZONE = {
  serata_tranquilla:['living','sit'],
  pizza:            ['cucina','cook'],
  cena:             ['tavolo','eat'],
  film:             ['living','sit'],
  gaming:           ['living','sit'],
  grattata:         ['living','sit'],
  aperitivo:        ['tavolo','eat'],
  karaoke:          ['centro','dance'],
  festa:            ['centro','party'],
  discoteca:        ['discoteca','dance'],
  grigliata:        ['giardino','cook'],
  piscina:          ['piscina','swim'],
  mare:             ['porta','leave'],
  montagna:         ['porta','leave'],
  viaggio:          ['porta','leave'],
  torneo:           ['centro','party'],
  concerto:         ['centro','party'],
  recupero:         ['living','sit']
};