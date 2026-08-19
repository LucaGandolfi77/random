/* WORDS — parole-truppa addestrabili in Tipografia.
   Le stats finali si calcolano dalle LETTERE della parola (vedi js/army.js),
   i tratti (trait) aggiungono personalità: fast/tank/crit/double/splash/ranged. */
const WORDS = [
  { id:'libro', word:'LIBRO', emoji:'📗', type:'melee', tier:1, cost:10, trainTime:8, trait:null,
    blurb:'Il soldato base. Bilanciato come un buon saggio di mezza età.' },
  { id:'caffe', word:'CAFFÈ', emoji:'☕', type:'melee', tier:2, cost:15, trainTime:10, trait:'fast',
    blurb:'Veloce e nervoso. Il caffè non ha tempo per i riassunti.' },
  { id:'zanzara', word:'ZANZARA', emoji:'🦟', type:'melee', tier:2, cost:20, trainTime:12, trait:'crit',
    blurb:'Colpisce di sorpresa. La zeta nelle sue vene è puro veleno.' },
  { id:'neologismo', word:'NEOLOGISMO', emoji:'✨', type:'melee', tier:3, cost:30, trainTime:16, trait:'swarm',
    blurb:'Nuovo di zecca e in massa. Contro ogni regola grammaticale.' },
  { id:'palindromo', word:'PALINDROMO', emoji:'🔁', type:'melee', tier:3, cost:35, trainTime:18, trait:'double',
    blurb:'Attacca, si legge, e attacca di nuovo. Speculare e spietato.' },
  { id:'onomatopea', word:'ONOMATOPEA', emoji:'💥', type:'splash', tier:4, cost:50, trainTime:24, trait:null,
    blurb:'BOOM! Un impatto che danneggia tutto il vicinato cartaceo.' },
  { id:'dizionario', word:'DIZIONARIO', emoji:'🎯', type:'ranged', tier:4, cost:45, trainTime:22, trait:null,
    blurb:'Colpisce a distanza con definizioni precise e dolorose.' },
  { id:'enciclopedia', word:'ENCICLOPEDIA', emoji:'📚', type:'melee', tier:5, cost:80, trainTime:40, trait:'tank',
    blurb:'Lenta come un tomo di 800 pagine, dura come il cartone dei tomi di 800 pagine.' }
];