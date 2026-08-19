/* BALANCE — costanti economiche: risorse iniziali, costruttori, curve, battaglia. */
const BALANCE = {
  startMoney: 500,
  startDobloni: 2,
  buildersStart: 1,
  buildersMax: 4,
  builderCost: [5, 10, 20],            // dobloni per il 2°, 3° e 4° bibliotecario
  baseStorage: 1000,                   // capienza monete base (cassaforte la aumenta)
  baseDobloniStorage: 5,               // capienza dobloni base
  wallStart: 4,                        // muri iniziali
  wallBaseCount: 4,                    // muri a catalogo lv1
  wallPerLevel: 3,                     // muri extra per livello di catalogo
  skipDobloniPerMin: 1,                // dobloni per saltare 1 minuto di costruzione
  battleDuration: 90,                  // secondi di battaglia
  starThresholds: [0.5, 0.75, 1.0],    // % distrutta per 1/2/3 stelle
  trainTimeBase: 8,                    // secondi base di addestramento
  minigameCooldown: 60,                // cooldown minigiochi (s)
  wordStats: {
    hpPerLetter: 15, hpPerDouble: 15, hpBase: 20,
    dpsPerVowel: 3, dpsPerRare: 7, dpsBase: 4,
    speedBase: 110, speedPerLetter: 6, speedMin: 40,
    meleeRange: 36, rangedRange: 150, attackRate: 1, splashRadius: 48
  },
  freeWord: { min: 2, max: 12 },
  defense: { attackChance: 0.3, perMinute: 60, maxSteal: 0.10 },
  maxLog: 12
};