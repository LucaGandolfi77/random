/* I DUE LUMI — palette calda e cozy (GBA warm) */
const G = {};

const PAL = {
  ink:      '#2a1c14',
  inkSoft:  '#4a3223',
  cream:    '#f7e8c9',
  butter:   '#ffedb0',
  honey:    '#e8a55a',
  amber:    '#d98c45',
  pumpkin:  '#cf6a3a',
  terracotta:'#a94f36',
  rust:     '#8a3f2e',
  rose:     '#dfa8a2',
  blush:    '#f3c9bd',
  sage:     '#a8b88a',
  moss:     '#7a8a5e',
  leaf:     '#5c6b46',
  mist:     '#cfe0d8',
  dusk:     '#9db4a8',
  wheat:    '#e4cf9e',
  cocoa:    '#7a5a44',
  slate:    '#8f9a9d',
  fog:      '#b9b5ae',
  milk:     '#fff8e8',
  gold:     '#f2c14e',
  night:    '#2c2430',
  ember:    '#e85d3f',
  sky:      '#f2d9a8',
};

/* helpers */
function hex(c){ return PAL[c] || c; }

/* desaturate a color toward a target (for the fog). c: hex, f: 0..1 */
function fadeHex(hexIn, f){
  const t = PAL.fog;
  const a = [
    parseInt(hexIn.slice(1,3),16), parseInt(hexIn.slice(3,5),16), parseInt(hexIn.slice(5,7),16)
  ];
  const b = [parseInt(t.slice(1,3),16), parseInt(t.slice(3,5),16), parseInt(t.slice(5,7),16)];
  const r = a.map((v,i)=>Math.round(v + (b[i]-v)*f));
  return 'rgb('+r[0]+','+r[1]+','+r[2]+')';
}