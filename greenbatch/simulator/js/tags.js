/*
 * GreenBatch GB-8S — modello dati impianto (fonte unica di verità).
 * Usato da: simulatore (plant.js/hmi.js), export I/O (tools/export-io.js),
 * mockup elettronico (docs/03) e documenti di progetto.
 *
 * Convenzione tag (ispirata a ISA-5.1, mantenendo i nomi già presenti
 * nell'HMI originale: G1..G8, EV101, EV201..EV208, EV250, M101, LSL151):
 *   WT-20i  trasmettitore di peso silo i (celle di carico sommate)
 *   LS-20iH / LS-20iL  interruttori di livello alto/basso silo i
 *   EV-20i  valvola di scarico silo i
 *   DV-10i  valvola deviatrice superiore silo i
 *   CY-101 / LSL-151 / EV-101 / M-101  ciclone, liv. basso, ghigliottina, valvola rotativa
 *   BL-01 / VFD-01 / CT-01  soffiante, inverter, lettura corrente
 *   PI-102 / PDT-103 / FL-101 / EV-104  vuoto, pressione differenziale filtro, filtro, pulizia
 *   LC-01..03 / WT-250 / EV-250  celle di carico, trasmettitore, scarico tramoggia di pesa
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GB_TAGS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const META = {
    product: 'GreenBatch',
    model: 'GB-8S',
    description: 'Sistema di stoccaggio, dosaggio a lotti e tracciabilità per caffè verde (8 silos, trasporto pneumatico in depressione).',
    revision: 'A',
    date: '2025-01-15',
    plant: 'Torrefazione — linea verde',
  };

  /* ── parametri di processo (usati dal simulatore e dai calcoli di sizing) ── */
  const PARAMS = {
    silo: {
      capacityKg: 1000,
      highAlarmPct: 97,
      lowAlarmPct: 8,
      coneDeg: 60,
      cylinderMm: 1000,
      coneHeightMm: 866,
      cylinderHeightMm: 2000,
    },
    blower: {
      vacuumSetpointKpa: 42,
      vacuumMaxKpa: 55,
      spinUpTauS: 1.1,
      motorKw: 7.5,
      currentNoLoadA: 4.2,
      currentFullA: 13.6,
    },
    conveying: {
      loadRateKgSPerKpa: 0.026,   // ~1.09 kg/s a 42 kPa
      batchRateKgSPerKpa: 0.018,  // ~0.76 kg/s a 42 kPa (valvola di regolazione 100%)
      transportDelayS: 0.8,       // tempo di volo granaglie valvola -> tramoggia
      saltationMinKpa: 22,
      throttle: { coarsePct: 100, finePct: 12, topoffPct: 6 },
    },
    cyclone: { bufferCapacityKg: 25, airlockRateKgS: 3.0 },
    filter: { dpCleanKpa: 0.4, dpAlarmKpa: 3.5, cleanIntervalS: 300, cleanDurationS: 6 },
    weigher: {
      capacityKg: 120,
      resolutionKg: 0.05,
      tolerancePct: 0.5,
      toleranceMinKg: 0.1,
      inflightInitialKg: 0.08,   // anticipo in fase fine (EV-260 al 12%): ~0.095 kg/s × 0.8 s
      inflightAdapt: 0.35,
      settleTimeS: 1.2,
      dischargeRateKgS: 1.4,
      overloadPct: 102,
    },
    roaster: { hopperCapacityKg: 80, lowAlarmKg: 5 },
    batch: { maxComponents: 6, timeoutS: 180 },
  };

  /* ── prodotti: la lavorazione cambia densità, scorrimento e colore in HMI ── */
  const PRODUCTS = {
    W: { code: 'W', name: 'Washed', densityKgM3: 720, flowFactor: 0.95, color: '#7ee081', tint: '#3f8f57', note: 'Lavato: superficie pulita, colore verde-bluastro' },
    N: { code: 'N', name: 'Natural (Sun Dried)', densityKgM3: 680, flowFactor: 1.05, color: '#ffd166', tint: '#a8761f', note: 'Naturale: residui di polpa, colore giallo-dorato' },
  };

  /* ── banco silos G1..G8 (i valori iniziali riproducono lo stato delle foto) ── */
  const SILOS = [
    { id: 'G1', variety: 'R Exc Cauca', process: 'W', grade: 'Excelso', origin: 'Colombia, Cauca', lot: 'L-2401', weightKg: 974.5, capacityKg: 1000, highAlarm: true },
    { id: 'G2', variety: 'Brazil SD', process: 'N', grade: 'SD', origin: 'Brasile, Cerrado', lot: 'L-2402', weightKg: 985.5, capacityKg: 1000, highAlarm: true },
    { id: 'G3', variety: 'Yirgacheffe M', process: 'N', grade: 'M', origin: 'Etiopia, Yirgacheffe', lot: 'L-2403', weightKg: 976.6, capacityKg: 1000, highAlarm: true },
    { id: 'G4', variety: 'Colombia Supremo', process: 'W', grade: 'Supremo', origin: 'Colombia, Huila', lot: 'L-2404', weightKg: 540.0, capacityKg: 1000, highAlarm: false },
    { id: 'G5', variety: 'Guatemala SHB', process: 'W', grade: 'SHB', origin: 'Guatemala, Antigua', lot: 'L-2405', weightKg: 720.0, capacityKg: 1000, highAlarm: false },
    { id: 'G6', variety: 'Ethiopia Guji', process: 'N', grade: 'Grade 1', origin: 'Etiopia, Guji', lot: 'L-2406', weightKg: 610.0, capacityKg: 1000, highAlarm: false },
    { id: 'G7', variety: 'Kenya AA', process: 'W', grade: 'AA', origin: 'Kenya, Nyeri', lot: 'L-2407', weightKg: 430.0, capacityKg: 1000, highAlarm: false },
    { id: 'G8', variety: 'Decaf Colombia', process: 'W', grade: 'Decaffeinato', origin: 'Colombia', lot: 'L-2408', weightKg: 355.0, capacityKg: 1000, highAlarm: false },
  ];

  /* ── layout 3D (metri): il peso/hopper conserva la posizione del JSON originale ── */
  const LAYOUT = {
    frame: { id: 'FRAME_01', position_3d: { x: 4.0, y: 0.0, z: 0.0 }, size: { x: 12.4, y: 4.4, z: 2.2 } },
    silos: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ id: 'G' + i, position_3d: { x: (i - 1) * 1.55, y: 0.9, z: 0.0 } })),
    distributionManifold: { id: 'DISTRIBUTION_MANIFOLD', position_3d: { x: 6.2, y: 4.55, z: 0.0 }, length_m: 12.0 },
    collectionManifold: { id: 'COLLECTION_MANIFOLD', position_3d: { x: 6.2, y: 0.95, z: 0.0 }, length_m: 12.0 },
    cyclone: { id: 'CYCLONE_101', position_3d: { x: 10.6, y: 4.1, z: 0.0 }, size: { diameter_m: 0.9, height_m: 2.1 } },
    filter: { id: 'FL-101', position_3d: { x: 12.0, y: 4.4, z: 0.0 } },
    blower: { id: 'BLOWER_01', position_3d: { x: 13.6, y: 4.15, z: 0.0 } },
    airlock: { id: 'M-101', position_3d: { x: 10.6, y: 2.75, z: 0.0 } },
    knifeGate: { id: 'EV-101', position_3d: { x: 10.6, y: 3.15, z: 0.0 } },
    weighHopper: { id: 'WEIGH_SCALE_HOPPER', position_3d: { x: 2.0, y: 0.5, z: 0.0 }, size: { capacity_kg: 120 } },
    roasterHopper: { id: 'ROASTER_LOADING_HOPPER', position_3d: { x: 0.2, y: 0.5, z: 1.8 } },
  };

  const PIPING = [
    { source: 'BLOWER_01', destination: 'CYCLONE_101', medium: 'Air Flow / Vacuum', via: 'FL-101 (filter, clean side)' },
    { source: 'CYCLONE_101', destination: 'DISTRIBUTION_MANIFOLD', via: 'EV-101 (knife gate) -> M-101 (rotary airlock)' },
    { source: 'DISTRIBUTION_MANIFOLD', destination: 'SILO_BANK (G1-G8)', via: 'Top diverter valves DV-101..DV-108' },
    { source: 'SILO_BANK (G1-G8)', destination: 'COLLECTION_MANIFOLD', via: 'Bottom discharge valves EV-201..EV-208' },
    { source: 'COLLECTION_MANIFOLD', destination: 'WEIGH_SCALE_HOPPER', medium: 'Pneumatic Transport Line (vacuum batch line)', via: 'DV-109 batch diverter' },
    { source: 'WEIGH_SCALE_HOPPER', destination: 'Roaster Loading Hopper', via: 'Discharge valve EV-250' },
  ];

  /* ── ricette / miscele (kg su lotto) ── */
  const RECIPES = [
    {
      id: 'RCP-ESP-01', name: 'Espresso House Blend', batchKg: 50, tolerancePct: 0.5,
      components: [
        { silo: 'G2', kg: 30 }, { silo: 'G4', kg: 15 }, { silo: 'G1', kg: 5 },
      ],
    },
    {
      id: 'RCP-FIL-02', name: 'Filter Single Origin', batchKg: 25, tolerancePct: 0.5,
      components: [{ silo: 'G3', kg: 25 }],
    },
    {
      id: 'RCP-MOK-03', name: 'Moka Classica', batchKg: 40, tolerancePct: 0.5,
      components: [{ silo: 'G1', kg: 20 }, { silo: 'G5', kg: 10 }, { silo: 'G7', kg: 10 }],
    },
    {
      id: 'RCP-DEC-04', name: 'Decaf Blend', batchKg: 30, tolerancePct: 0.75,
      components: [{ silo: 'G8', kg: 21 }, { silo: 'G2', kg: 9 }],
    },
  ];

  /* ── lista I/O (type: DI|DO|AI|AO|MB) — il mockup elettronico e l'export CSV ──
     derivano da qui; i canali/moduli sono assegnati da tools/export-io.js.        */
  const IO = [];
  const add = (tag, desc, type, signal, area, notes) => IO.push({ tag, desc, type, signal, area, notes: notes || '' });

  // soffiante + filtro
  add('BL-01-RUN', 'Soffiante BL-01 — comando marcia', 'DO', '24 VDC / relè', 'Trasporto', 'Avvio da sequenza o manuale');
  add('BL-01-FB', 'Soffiante BL-01 — feedback marcia', 'DI', '24 VDC', 'Trasporto', 'Contattore/ausiliario');
  add('BL-01-FLT', 'Soffiante BL-01 — allarme termico/inverter', 'DI', '24 VDC', 'Trasporto', 'NC, apre su guasto');
  add('VFD-01-REF', 'Inverter soffiante — riferimento velocità', 'AO', '0/10 V', 'Trasporto', 'Regolazione vuoto');
  add('CT-01', 'Corrente motore soffiante', 'AI', '4-20 mA', 'Trasporto', '0-20 A');
  add('PI-102', 'Trasmettitore vuoto linea', 'AI', '4-20 mA', 'Trasporto', '-100..0 kPa');
  add('PDT-103', 'Pressione differenziale filtro', 'AI', '4-20 mA', 'Trasporto', '0-6 kPa, allarme intasamento');
  add('EV-104', 'Elettrovalvola pulizia filtro (controsoffio)', 'DO', '24 VDC', 'Trasporto', 'Ciclo temporizzato');
  add('LSL-151', 'Ciclone CY-101 — livello basso (passaggio libero)', 'DI', '24 VDC', 'Trasporto', 'Sonda capacitiva');

  // ciclone / airlock
  add('EV-101-O', 'Valvola ghigliottina EV-101 — apri', 'DO', '24 VDC', 'Trasporto', 'Isolamento ciclone');
  add('EV-101-C', 'Valvola ghigliottina EV-101 — chiudi', 'DO', '24 VDC', 'Trasporto', 'Bistabile');
  add('EV-101-OP', 'EV-101 — feedback aperta', 'DI', '24 VDC', 'Trasporto', 'Finecorsa');
  add('EV-101-CL', 'EV-101 — feedback chiusa', 'DI', '24 VDC', 'Trasporto', 'Finecorsa');
  add('M-101-RUN', 'Valvola rotativa M-101 — marcia', 'DO', '24 VDC / relè', 'Trasporto', 'Airlock, mantiene il vuoto');
  add('M-101-FB', 'M-101 — feedback marcia', 'DI', '24 VDC', 'Trasporto', '');
  add('M-101-FLT', 'M-101 — allarme termico', 'DI', '24 VDC', 'Trasporto', 'NC');

  // valvole deviatrici superiori + livelli + pesi silo
  for (let i = 1; i <= 8; i++) {
    add('DV-10' + i, 'Deviatrice superiore silo G' + i, 'DO', '24 VDC', 'Silos', 'Un solo deviatore aperto per volta');
    add('DV-10' + i + '-OP', 'Deviatrice G' + i + ' — feedback aperta', 'DI', '24 VDC', 'Silos', '');
    add('LS-20' + i + 'H', 'Livello alto silo G' + i, 'DI', '24 VDC', 'Silos', 'Blocca deviatore (intangibile)');
    add('LS-20' + i + 'L', 'Livello basso silo G' + i, 'DI', '24 VDC', 'Silos', 'Consenso dosaggio');
  }
  for (let i = 1; i <= 8; i++) {
    add('WT-20' + i, 'Peso silo G' + i + ' (somma 3 celle)', 'MB', 'Modbus RTU 9600 8E1', 'Silos', 'Risoluzione 0.1 kg, classe III');
    add('EV-20' + i + '-O', 'Valvola scarico silo G' + i + ' — apri', 'DO', '24 VDC', 'Silos', '');
    add('EV-20' + i + '-C', 'Valvola scarico silo G' + i + ' — chiudi', 'DO', '24 VDC', 'Silos', '');
    add('EV-20' + i + '-OP', 'Scarico G' + i + ' — feedback aperta', 'DI', '24 VDC', 'Silos', '');
    add('EV-20' + i + '-CL', 'Scarico G' + i + ' — feedback chiusa', 'DI', '24 VDC', 'Silos', '');
  }

  // linea di dosaggio verso la bilancia
  add('DV-109', 'Deviatrice linea dosaggio verso bilancia', 'DO', '24 VDC', 'Dosaggio', '');
  add('DV-109-OP', 'DV-109 — feedback aperta', 'DI', '24 VDC', 'Dosaggio', '');
  add('EV-260-REF', 'Valvola di regolazione linea dosaggio — riferimento apertura', 'AO', '0/10 V', 'Dosaggio', 'Dosaggio grossolano/fine (100%/12%)');
  add('EV-260-POS', 'EV-260 — posizione reale', 'AI', '4-20 mA', 'Dosaggio', '0-100 %');
  add('LC-01', 'Cella di carico 1 tramoggia di pesa', 'MB', 'Modbus RTU', 'Dosaggio', '3 punti, 100 kg cad.');
  add('LC-02', 'Cella di carico 2 tramoggia di pesa', 'MB', 'Modbus RTU', 'Dosaggio', '');
  add('LC-03', 'Cella di carico 3 tramoggia di pesa', 'MB', 'Modbus RTU', 'Dosaggio', '');
  add('WT-250', 'Peso netto tramoggia (somma celle)', 'MB', 'Modbus RTU', 'Dosaggio', 'Risoluzione 0.05 kg');
  add('EV-250-O', 'Valvola scarico tramoggia EV-250 — apri', 'DO', '24 VDC', 'Dosaggio', 'Verso torrefattrice');
  add('EV-250-C', 'EV-250 — chiudi', 'DO', '24 VDC', 'Dosaggio', '');
  add('EV-250-OP', 'EV-250 — feedback aperta', 'DI', '24 VDC', 'Dosaggio', '');
  add('EV-250-CL', 'EV-250 — feedback chiusa', 'DI', '24 VDC', 'Dosaggio', '');
  add('LS-301H', 'Tramoggia torrefattrice — livello alto', 'DI', '24 VDC', 'Dosaggio', 'Blocca scarico EV-250');

  // sicurezza e servizi
  add('ESTOP-01', 'Pulsante emergenza (categoria 1, doppio canale)', 'DI', '24 VDC sicuro', 'Sicurezza', 'Safety relay, cat. 3 PL d');
  add('ESTOP-01-B', 'Emergenza — secondo canale', 'DI', '24 VDC sicuro', 'Sicurezza', 'Ridondanza');
  add('MODE-LOCAL', 'Selettore locale/remoto quadro', 'DI', '24 VDC', 'Sicurezza', '');
  add('PANEL-DOOR', 'Contatto porta quadro elettrico', 'DI', '24 VDC', 'Sicurezza', '');
  add('BEACON-01', 'Segnalatore luminoso/acustico allarmi', 'DO', '24 VDC', 'Sicurezza', '');
  add('AIR-PRESS', 'Pressione aria strumenti (pressostato)', 'DI', '24 VDC', 'Sicurezza', 'Consenso valvole pneumatiche');

  const IO_COUNTS = IO.reduce((acc, t) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc; }, {});

  /* ── catalogo allarmi ── */
  const ALARMS = [
    { code: 'A-101', tag: 'LS-20xH', cls: 'WARNING', text: 'Livello alto silo Gx — caricamento bloccato', action: 'Chiude il deviatore del silo e devia su silo alternativo' },
    { code: 'A-102', tag: 'LS-20xL', cls: 'WARNING', text: 'Livello basso silo Gx', action: 'Inibisce la ricetta che usa quel silo' },
    { code: 'A-201', tag: 'PI-102', cls: 'ALARM', text: 'Vuoto insufficiente in linea', action: 'Arresta il trasporto, attende ripristino' },
    { code: 'A-202', tag: 'BL-01-FLT', cls: 'FAULT', text: 'Guasto soffiante', action: 'Arresto trasporto, chiusura EV-101' },
    { code: 'A-203', tag: 'M-101-FLT', cls: 'FAULT', text: 'Guasto valvola rotativa', action: 'Arresto caricamento (rischio intasamento ciclone)' },
    { code: 'A-204', tag: 'PDT-103', cls: 'WARNING', text: 'Filtro intasato (ΔP alta)', action: 'Ciclo di pulizia forzato; se persiste, manutenzione' },
    { code: 'A-301', tag: 'WT-250', cls: 'ALARM', text: 'Sovraccarico tramoggia di pesa', action: 'Chiude le valvole, inibisce scarico' },
    { code: 'A-302', tag: 'WT-250', cls: 'WARNING', text: 'Dose fuori tolleranza', action: 'Registra lo scostamento, adatta l\'anticipo (in-flight)' },
    { code: 'A-303', tag: 'BATCH', cls: 'ALARM', text: 'Timeout ciclo di dosaggio', action: 'Annulla il lotto, scarica la tramoggia' },
    { code: 'A-401', tag: 'ESTOP-01', cls: 'CRITICAL', text: 'Emergenza premuta', action: 'Arresto immediato di tutti gli attuatori' },
    { code: 'A-402', tag: 'AIR-PRESS', cls: 'ALARM', text: 'Mancanza aria compressa', action: 'Valvole in posizione di sicurezza' },
    { code: 'A-403', tag: 'LS-301H', cls: 'WARNING', text: 'Tramoggia torrefattrice piena', action: 'Blocca scarico EV-250' },
  ];

  return { META, PARAMS, PRODUCTS, SILOS, LAYOUT, PIPING, RECIPES, IO, IO_COUNTS, ALARMS };
});
