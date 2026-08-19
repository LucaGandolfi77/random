/* BALANCE — unico punto per le costanti economiche. Modifica qui per ribilanciare. */
const BALANCE = {
  startMoney: 1000,
  startHouse: 'stanza_studenti',
  startCars: ['macchina_scassata'],
  daysToWork: ['lun','mar','mer','gio','ven'],
  workStartHour: 9,
  workEndHour: 17,
  freeFromHour: 18,
  weekendStartHour: 9,
  nightEndHour: 23,
  salaryBase: { impiegato: 90, barista: 70, rider: 65, freelance: 110, musicista: 60, developer: 120, contabile: 95, chef_pro: 100, criceto: 30, stilista: 95, cameriere: 75 },
  happinessToRep: 0.6,      // 1 felicità accumulata → punti reputazione
  repPerActivity: 2,
  repToSponsor: 1500,       // soglia sponsor
  eventCostFactor: 1.0,
  timePerSlot: 1,           // 1 slot = un "turno" di gioco (mattina/pomeriggio/sera/notte)
  moodEffects: {
    felicissimo:  { mul: 1.25, energy: 0 },
    felice:       { mul: 1.10, energy: 0 },
    normale:      { mul: 1.00, energy: 0 },
    stanco:       { mul: 0.85, energy: -5 },
    nervoso:      { mul: 0.70, energy: -8 },
    fuori_controllo:{ mul: 0.55, energy: -12, chaos: 0.15 }
  },
  levels: [0, 2, 5, 9, 14, 20, 27, 35, 44, 54, 65, 77, 90, 104],  // XP cumulati per livello personaggio
  idleCappedHours: 8,
  passivePerHouse: 0.02,     // % del valore casa al giorno come "affitto"
  inviteBaseCost: 250,       // costo per aggiungere un amico (x inviti già fatti)
  friendshipPerEvent: 3,
  travelSpeedCost: 5,        // € di carburante per punto velocità nei viaggi
  taxiCostPerSeat: 12,
  /* Gruppo di partenza: chi c'è dall'inizio */
  startFriends: ['dario','armandino','doris','tommy'],
  /* Sblocco progressivo: i restanti si uniscono al raggiungimento di una condizione */
  recruitTiers: [
    { cond:'rep>=80',   label:'Raggiungi 80 punti reputazione', ids:['ricca','fede','ruben'] },
    { cond:'rep>=180',  label:'Raggiungi 180 punti reputazione', ids:['coppe','franci'] },
    { cond:'houses>=2', label:'Compra una seconda casa', ids:['luca','gando','pietro'] },
    { cond:'rep>=400',  label:'Raggiungi 400 punti reputazione', ids:['tubo','marci'] }
  ]
};