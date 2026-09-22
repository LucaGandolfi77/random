import store from '../../core/store.js';
import analytics from './analytics.js';

function getOwlState(roomCount) {
  if (roomCount === 0) return { mood: 'sleepy', animation: 'sleeping', dialogue: 'Il gufo dorme...' };
  if (roomCount < 3) return { mood: 'drowsy', animation: 'perched', dialogue: 'Il gufo si sveglia appena...' };
  if (roomCount < 7) return { mood: 'happy', animation: 'perched-wings', dialogue: 'Il gufo è felice!' };
  if (roomCount < 12) return { mood: 'proud', animation: 'flying', dialogue: 'La biblioteca cresce!' };
  return { mood: 'ecstatic', animation: 'flying-circles', dialogue: 'Il gufo è esaltato!' };
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function getWeatherMood() {
  if (!window.navigator || !window.navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const hour = new Date().getHours();
        const isNight = hour < 6 || hour > 18;
        resolve({
          hasLocation: true,
          isNight,
          mood: isNight ? 'mysterious' : 'serene'
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 5000 }
    );
  });
}

function getAdaptiveMood(roomCount) {
  const baseState = getOwlState(roomCount);
  const pattern = analytics.getReadingPattern();
  const timeOfDay = getTimeOfDay();

  let moodModifier = '';

  if (pattern.streak >= 3) {
    moodModifier = ' focused';
    baseState.dialogue = `Lettore diligente! ${pattern.streak} giorni di fila!`;
  }

  if (timeOfDay === 'night') {
    baseState.dialogue += ' È di notte... il gufo è più saggio.';
    moodModifier += ' nocturnal';
  }

  if (pattern.chapterRate > 0.3) {
    moodModifier += ' scholarly';
    baseState.dialogue += ' Apprezzo le tue letture rare!';
  }

  const rarityBonus = store.get('chaptersCollected').length > 5 ? ' +' : '';

  return {
    ...baseState,
    mood: baseState.mood + moodModifier,
    timeOfDay,
    readingPattern: pattern,
    adaptiveDialogue: baseState.dialogue,
    isNocturnal: timeOfDay === 'night',
    isFocused: pattern.streak >= 3
  };
}

function getGufoDialogue(roomCount) {
  const mood = getAdaptiveMood(roomCount);
  const timeOfDay = getTimeOfDay();

  const pool = {
    morning: [
      'Buongiorno! Il sole è sorto e le pagine brillano.',
      'Oggi è un bel giorno per leggere!',
      'La mattina è il momento perfetto per una storia.'
    ],
    afternoon: [
      'Il pomeriggio è caldo come una coperta di pagine.',
      'Continua a leggere, il gufo non si stanca!',
      'Le ore pomeridiane sono per le storie lunghe.'
    ],
    evening: [
      'La sera è il regno dei sogni e delle storie.',
      'Il crepuscolo porta nuove parole.',
      'Sai qual è il momento migliore per leggere? Adesso.'
    ],
    night: [
      'Il gufo vegli. Le stelle illuminano le pagine.',
      'Di notte si sogna di più. E di più si legge.',
      'L\'oscurità è solo l\'inizio di una nuova storia.'
    ]
  };

  const pool2 = [
    'Leggere è come respirare, ma con le parole.',
    'Il gufo non sempre parla. A volte basta pigolare.',
    'Ogni libro è una stanza. Ogni stanza è un mondo.',
    'Le radici scrivono mentre tu leggi.',
    'Sai qual è la differenza tra leggere e vivere? Nessuna, se il libro è abbastanza bello.'
  ];

  const timePool = pool[timeOfDay] || pool.evening;
  const timeDialogue = timePool[Math.floor(Math.random() * timePool.length)];
  const generalDialogue = pool2[Math.floor(Math.random() * pool2.length)];

  return {
    timeDialogue,
    generalDialogue,
    mood: mood.mood,
    isNocturnal: mood.isNocturnal,
    isFocused: mood.isFocused
  };
}

export { getAdaptiveMood, getGufoDialogue, getTimeOfDay, getOwlState, getWeatherMood };
