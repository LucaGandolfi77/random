/* DICTIONARY — parole per i minigiochi + set di validazione (catena di parole). */
const DICT = {
  hangman: [
    { w:'pinguino', hint:'animale' },
    { w:'cavolfiore', hint:'verdura' },
    { w:'biblioteca', hint:'luogo' },
    { w:'vulcano', hint:'natura' },
    { w:'zampogna', hint:'strumento' },
    { w:'astronave', hint:'veicolo spaziale' },
    { w:'gomitolo', hint:'filo avvolto' },
    { w:'acquedotto', hint:'opera romana' },
    { w:'scaffale', hint:'mobile per libri' },
    { w:'capriola', hint:'acrobazia' },
    { w:'farfalle', hint:'insetti' },
    { w:'melograno', hint:'frutto rosso' }
  ],
  anagram: [
    'prato','nave','rosa','lume','carta','tavolo','vento','fiore',
    'piano','corte','astro','globo','sedia','penna','stella','trono'
  ],
  typing: [
    'casa','libro','mare','sogno','tempo','verde','pizza','scuola',
    'viaggio','sorriso','montagna','finestra','elefante','cioccolata','tramonto','bicicletta'
  ],
  chainStart: ['gatto','sole','stella','fiore','ponte','tavolo','viaggio','sedia']
};
DICT.set = {};
for (const w of DICT.anagram) DICT.set[w] = true;
for (const w of DICT.typing) DICT.set[w] = true;
for (const h of DICT.hangman) DICT.set[h.w] = true;
for (const w of DICT.chainStart) DICT.set[w] = true;