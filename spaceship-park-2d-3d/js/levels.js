const SHIP_TYPES = [
  { name: 'Falco', size: 0.7, speed: 1.2, friction: 0.98, color: '#00d4ff' },
  { name: 'Cobra', size: 1.0, speed: 1.0, friction: 0.97, color: '#ff6b35' },
  { name: 'Titan', size: 1.4, speed: 0.8, friction: 0.96, color: '#ffd700' },
  { name: 'Ghost', size: 0.5, speed: 1.4, friction: 0.99, color: '#33ff66' }
];

const LEVELS = [
  {
    id: 1, name: 'Dock Base', desc: 'Un semplice parcheggio.',
    width: 800, height: 600,
    ship: 0, fuel: 100, timeLimit: 0,
    shipStart: { x: 100, y: 500, angle: 0 },
    parkingSpots: [{ x: 700, y: 100, angle: Math.PI/2, w: 80, h: 120 }],
    obstacles: [
      { x: 400, y: 300, w: 200, h: 20, type: 'rect' }
    ],
    movingObstacles: [],
    stars: 3
  },
  {
    id: 2, name: 'Corridoio Stretto', desc: 'Attraversa un corridoio stretto.',
    width: 900, height: 700,
    ship: 0, fuel: 100, timeLimit: 0,
    shipStart: { x: 50, y: 350, angle: 0 },
    parkingSpots: [{ x: 850, y: 350, angle: 0, w: 80, h: 100 }],
    obstacles: [
      { x: 300, y: 250, w: 30, h: 200, type: 'rect' },
      { x: 500, y: 300, w: 100, h: 30, type: 'rect' },
      { x: 600, y: 400, w: 100, h: 30, type: 'rect' }
    ],
    movingObstacles: [],
    stars: 4
  },
  {
    id: 3, name: 'Il Labirinto', desc: 'Navigate nel labirinto.',
    width: 1000, height: 800,
    ship: 0, fuel: 90, timeLimit: 0,
    shipStart: { x: 50, y: 50, angle: 0 },
    parkingSpots: [{ x: 950, y: 750, angle: Math.PI, w: 80, h: 120 }],
    obstacles: [
      { x: 200, y: 0, w: 30, h: 400, type: 'rect' },
      { x: 200, y: 400, w: 600, h: 30, type: 'rect' },
      { x: 800, y: 400, w: 30, h: 400, type: 'rect' },
      { x: 200, y: 750, w: 630, h: 30, type: 'rect' },
      { x: 400, y: 200, w: 30, h: 200, type: 'rect' },
      { x: 600, y: 0, w: 30, h: 250, type: 'rect' }
    ],
    movingObstacles: [],
    stars: 5
  },
  {
    id: 4, name: 'Rotazione Richiesta', desc: 'Parcheggia con angolazione.',
    width: 800, height: 600,
    ship: 1, fuel: 100, timeLimit: 0,
    shipStart: { x: 100, y: 500, angle: 0 },
    parkingSpots: [{ x: 700, y: 100, angle: Math.PI/4, w: 80, h: 120 }],
    obstacles: [
      { x: 400, y: 250, w: 150, h: 20, type: 'rect' },
      { x: 400, y: 400, w: 150, h: 20, type: 'rect' }
    ],
    movingObstacles: [],
    stars: 5
  },
  {
    id: 5, name: 'Doppio Parcheggio', desc: 'Due navi da parcheggiare.',
    width: 1000, height: 700,
    ship: 1, fuel: 100, timeLimit: 0,
    shipStart: { x: 50, y: 350, angle: 0 },
    parkingSpots: [
      { x: 250, y: 150, angle: Math.PI/2, w: 80, h: 100 },
      { x: 750, y: 500, angle: -Math.PI/2, w: 80, h: 100 }
    ],
    obstacles: [
      { x: 500, y: 0, w: 20, h: 350, type: 'rect' },
      { x: 500, y: 350, w: 20, h: 350, type: 'rect' }
    ],
    movingObstacles: [],
    stars: 6
  },
  {
    id: 6, name: 'Asteroide Field', desc: 'Campo di asteroidi!',
    width: 1000, height: 800,
    ship: 1, fuel: 80, timeLimit: 60,
    shipStart: { x: 50, y: 400, angle: 0 },
    parkingSpots: [{ x: 900, y: 400, angle: 0, w: 100, h: 120 }],
    obstacles: [],
    movingObstacles: [],
    gravityWells: [
      { x: 150, y: 100, r: 100, strength: 0.5 },
      { x: 300, y: 200, r: 80, strength: 0.3 },
      { x: 500, y: 100, r: 120, strength: 0.4 },
      { x: 400, y: 500, r: 100, strength: 0.5 },
      { x: 700, y: 300, r: 140, strength: 0.3 },
      { x: 800, y: 600, r: 80, strength: 0.3 },
      { x: 200, y: 600, r: 100, strength: 0.4 },
      { x: 650, y: 500, r: 80, strength: 0.3 }
    ],
    stars: 7
  },
  {
    id: 7, name: 'Navi Giganti', desc: 'Usa una nave grande.',
    width: 1000, height: 800,
    ship: 2, fuel: 80, timeLimit: 0,
    shipStart: { x: 50, y: 400, angle: 0 },
    parkingSpots: [{ x: 900, y: 400, angle: Math.PI/2, w: 120, h: 160 }],
    obstacles: [
      { x: 300, y: 200, w: 400, h: 30, type: 'rect' },
      { x: 300, y: 550, w: 400, h: 30, type: 'rect' },
      { x: 500, y: 250, w: 30, h: 300, type: 'rect' }
    ],
    movingObstacles: [
      { x: 400, y: 0, w: 30, h: 200, type: 'rect', axis: 'y', range: 600, speed: 1, originY: 0 }
    ],
    stars: 6
  },
  {
    id: 8, name: 'Speed Run', desc: 'Poco carburante!',
    width: 900, height: 700,
    ship: 3, fuel: 50, timeLimit: 45,
    shipStart: { x: 50, y: 350, angle: 0 },
    parkingSpots: [{ x: 850, y: 350, angle: 0, w: 80, h: 100 }],
    obstacles: [
      { x: 200, y: 0, w: 20, h: 200, type: 'rect' },
      { x: 400, y: 0, w: 20, h: 250, type: 'rect' },
      { x: 600, y: 0, w: 20, h: 350, type: 'rect' }
    ],
    movingObstacles: [],
    stars: 8
  },
  {
    id: 9, name: 'Parcheggio Sotterraneo', desc: 'Livello complesso con molti ostacoli.',
    width: 1200, height: 900,
    ship: 2, fuel: 100, timeLimit: 90,
    shipStart: { x: 60, y: 840, angle: Math.PI/2 },
    parkingSpots: [{ x: 1140, y: 60, angle: Math.PI/2, w: 100, h: 140 }],
    obstacles: [],
    movingObstacles: (function() {
      const mo = [];
      for (let i = 0; i < 3; i++) mo.push({ x: 150+i*150, y: 0, w: 30, h: 300, type: 'rect', axis: 'y', range: 600, speed: 0.8, originY: 0 });
      for (let i = 0; i < 2; i++) mo.push({ x: 0, y: 200+i*250, w: 300, h: 30, type: 'rect', axis: 'x', range: 700, speed: 1, originX: 0 });
      return mo;
    })(),
    stars: 9
  },
  {
    id: 10, name: 'Il Grande Skydock', desc: 'Il livello più grande!',
    width: 1400, height: 1000,
    ship: 3, fuel: 120, timeLimit: 120,
    shipStart: { x: 70, y: 1120, angle: Math.PI/2 },
    parkingSpots: [
      { x: 1330, y: 500, angle: 0, w: 120, h: 160 },
      { x: 700, y: 150, angle: Math.PI/2, w: 100, h: 140 }
    ],
    obstacles: [
      { x: 800, y: 200, w: 400, h: 30, type: 'rect' },
      { x: 800, y: 900, w: 400, h: 30, type: 'rect' }
    ],
    movingObstacles: (function() {
      const mo = [];
      mo.push({ x: 500, y: 0, w: 20, h: 500, type: 'rect', axis: 'y', range: 1000, speed: 1.5, originY: 0 });
      mo.push({ x: 1000, y: 200, w: 20, h: 600, type: 'rect', axis: 'y', range: 800, speed: 1.2, originY: 200 });
      mo.push({ x: 200, y: 0, w: 20, h: 400, type: 'rect', axis: 'y', range: 600, speed: 1, originY: 0 });
      mo.push({ x: 0, y: 500, w: 300, h: 20, type: 'rect', axis: 'x', range: 800, speed: 0.8, originX: 0 });
      mo.push({ x: 600, y: 0, w: 20, h: 300, type: 'rect', axis: 'y', range: 500, speed: 1.3, originY: 0 });
      mo.push({ x: 300, y: 800, w: 400, h: 20, type: 'rect', axis: 'x', range: 700, speed: 1, originX: 0 });
      return mo;
    })(),
    stars: 10
  },
  {
    id: 11, name: 'Centrifuga', desc: 'Gravità anomala! Ostacoli mobili!',
    width: 1000, height: 800,
    ship: 3, fuel: 80, timeLimit: 60,
    shipStart: { x: 500, y: 400, angle: 0 },
    parkingSpots: [{ x: 900, y: 100, angle: Math.PI/2, w: 80, h: 120 }],
    obstacles: [],
    movingObstacles: [
      { x: 300, y: 0, w: 30, h: 400, type: 'rect', axis: 'y', range: 800, speed: 1, originY: 0 },
      { x: 700, y: 0, w: 30, h: 400, type: 'rect', axis: 'y', range: 800, speed: 1.2, originY: 0 },
      { x: 0, y: 400, w: 400, h: 30, type: 'rect', axis: 'x', range: 600, speed: 0.8, originX: 0 },
      { x: 600, y: 400, w: 400, h: 30, type: 'rect', axis: 'x', range: 600, speed: 0.9, originX: 0 }
    ],
    gravityWells: [
      { x: 300, y: 200, r: 100, strength: 0.5 },
      { x: 700, y: 600, r: 150, strength: 0.3 },
      { x: 500, y: 500, r: 80, strength: 0.7 }
    ],
    stars: 10
  },
  {
    id: 12, name: 'La Fine dello Spazio', desc: 'Il livello finale - LEGGENDARIO!',
    width: 1600, height: 1200,
    ship: 2, fuel: 100, timeLimit: 180,
    shipStart: { x: 80, y: 1120, angle: Math.PI/2 },
    parkingSpots: [
      { x: 1520, y: 200, angle: Math.PI/4, w: 140, h: 180 },
      { x: 1200, y: 800, angle: -Math.PI/3, w: 100, h: 140 },
      { x: 400, y: 600, angle: Math.PI, w: 120, h: 160 }
    ],
    obstacles: [
      { x: 800, y: 200, w: 400, h: 30, type: 'rect' },
      { x: 800, y: 900, w: 400, h: 30, type: 'rect' }
    ],
    movingObstacles: (function() {
      const mo = [];
      mo.push({ x: 50, y: 100+i*100, w: 30, h: 80, type: 'rect', axis: 'y', range: 800, speed: 1, originY: 0 });
      mo.push({ x: 1000, y: 300, w: 20, h: 600, type: 'rect', axis: 'y', range: 800, speed: 1.5, originY: 0 });
      mo.push({ x: 200, y: 0, w: 200, h: 30, type: 'rect', axis: 'x', range: 1000, speed: 1, originX: 0 });
      mo.push({ x: 1300, y: 500, w: 30, h: 400, type: 'rect', axis: 'y', range: 800, speed: 1.2, originY: 0 });
      mo.push({ x: 400, y: 1000, w: 500, h: 20, type: 'rect', axis: 'x', range: 800, speed: 0.8, originX: 0 });
      return mo;
    })(),
    stars: 12
  }
];
