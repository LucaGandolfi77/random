/* MINIGAMES — i 4 giochi di parole. cooldown in secondi. reward in monete / dobloni. */
const MINIGAMES = [
  { id:'anagramma', name:'Anagramma Lampo', emoji:'🔀', cooldown:60, time:20,
    rewardBase:40, rewardSpeed:3,
    desc:'Riordina le lettere e indovina la parola prima che scada il tempo.' },
  { id:'catena', name:'Catena di Parole', emoji:'🔗', cooldown:60, chains:5,
    rewardBase:15, rewardPerChain:6,
    desc:'Scrivi una parola che inizi con l\'ultima lettera della precedente. 5 anelli.' },
  { id:'dattilo', name:'Dattilo-Fulmine', emoji:'⚡', cooldown:60, parTime:5,
    rewardBase:30, rewardFast:8,
    desc:'Scrivi la parola mostrata il più in fretta possibile. Le mani volano.' },
  { id:'impiccato', name:'L\'Impiccato del Bibliotecario', emoji:'😵', cooldown:120,
    guesses:6, rewardDobloni:1, rewardCoins:50,
    desc:'Indovina la parola segreta prima che il bibliotecario venga impiccato (per il nervoso).' }
];