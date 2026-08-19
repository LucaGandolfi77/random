/* I DUE LUMI — motore audio WebAudio (chiptune caldo, zero file) */
const AUD = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let unlocked = false;
  let currentSong = null;
  let timer = null, nextTime = 0, step = 0;
  const STEP_DUR = 60 / 120 / 4; /* 16th note at 120bpm default */

  function midi(m){ return 440 * Math.pow(2, (m - 69) / 12); }
  const N = {
    C0:12,C1:24,C2:36,C3:48,C4:60,C5:72,C6:84,
    Db1:25,Db2:37,Db3:49,Db4:61,
    D1:26,D2:38,D3:50,D4:62,D5:74,
    Eb1:27,Eb2:39,Eb3:51,Eb4:63,
    E1:28,E2:40,E3:52,E4:64,E5:76,
    F1:29,F2:41,F3:53,F4:65,F5:77,
    Gb1:30,Gb2:42,Gb3:54,
    G1:31,G2:43,G3:55,G4:67,G5:79,
    Ab1:32,Ab2:44,Ab3:56,Ab4:68,
    A1:33,A2:45,A3:57,A4:69,A5:81,
    Bb1:34,Bb2:46,Bb3:58,Bb4:70,
    B1:35,B2:47,B3:59,B4:71,B5:83,
  };

  function ensure(){
    if(ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.6; sfxGain.connect(master);
    return true;
  }

  function unlock(){
    if(!ensure()) return;
    if(ctx.state === 'suspended') ctx.resume();
    unlocked = true;
    /* se una canzone era stata "messa in coda" prima dello sblocco, riparte davvero */
    if(currentSong && !currentSong.tracks && currentSong.key){
      const k = currentSong.key;
      currentSong = null;
      startSong(k);
    }
  }

  /* ---- SFX ---- */
  function tone(type, freq0, freq1, dur, vol, when, dest){
    const t0 = (when || ctx.currentTime) + 0.001;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq0, t0);
    if(freq1 && freq1 !== freq0) o.frequency.exponentialRampToValueAtTime(Math.max(1,freq1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, when, freq){
    const t0 = (when || ctx.currentTime) + 0.001;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1 - i/d.length);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.value = freq || 900;
    s.connect(f); f.connect(g); g.connect(sfxGain);
    s.start(t0);
  }

  const SFX = {
    blip(){ tone('square', 620, 620, 0.03, 0.12); },
    blip2(){ tone('square', 780, 780, 0.03, 0.12); },
    confirm(){ tone('triangle', 523, 523, 0.05, 0.18); tone('triangle', 784, 784, 0.07, 0.18, null, sfxGain); },
    cancel(){ tone('triangle', 392, 330, 0.09, 0.16); },
    jump(){ tone('square', 320, 560, 0.09, 0.14); },
    hammer(){ noise(0.08, 0.22, null, 500); tone('triangle', 140, 70, 0.09, 0.25); },
    break(){ noise(0.12, 0.26, null, 700); tone('triangle', 200, 90, 0.12, 0.2); },
    hit(){ noise(0.06, 0.2, null, 900); tone('square', 220, 90, 0.08, 0.18); },
    hurt(){ tone('sawtooth', 300, 120, 0.16, 0.14); },
    heal(){ [523,659,784,1047].forEach((f,i)=>tone('triangle', f, f, 0.09, 0.16, null, sfxGain)); },
    curse(){ tone('sawtooth', 400, 150, 0.5, 0.1); tone('sawtooth', 410, 160, 0.5, 0.08, ctx.currentTime+0.05, sfxGain); },
    parry(){ tone('square', 880, 1180, 0.06, 0.2); noise(0.04, 0.08, null, 2000); },
    enemyHit(){ tone('square', 500, 160, 0.1, 0.18); },
    victory(){ [523,659,784,1047,784,1047].forEach((f,i)=>tone('triangle', f, f, i===5?0.4:0.12, 0.18, ctx.currentTime + i*0.09, sfxGain)); },
    levelup(){ [523,659,784,1047,1319].forEach((f,i)=>tone('triangle', f, f, 0.12, 0.16, ctx.currentTime + i*0.07, sfxGain)); },
    item(){ [784,988,1175].forEach((f,i)=>tone('square', f, f, 0.08, 0.14, ctx.currentTime + i*0.06, sfxGain)); },
    door(){ tone('triangle', 260, 200, 0.14, 0.16); noise(0.1, 0.1, null, 400); },
    memory(){ [659,784,988,1319,1568].forEach((f,i)=>tone('sine', f, f, 0.3, 0.16, ctx.currentTime + i*0.12, sfxGain)); },
  };
  function sfx(name){ if(!unlocked || !ensure()) return; if(SFX[name]) SFX[name](); }

  /* ---- musica ---- */
  const SONGS = {};
  function song(key, def){ SONGS[key] = def; }

  function noteEvent(s, name, d, v){
    return { s, m: N[name], d: d, v: v == null ? 1 : v };
  }
  const e = noteEvent;

  /* Tema del titolo — caldo, lento, a giri di arpa */
  song('title', {
    bpm: 88,
    tracks: [
      { wave:'triangle', vol:0.13, notes:[
        e(0,'C5',1.5), e(2,'E5',0.5), e(3,'G5',1.5), e(5,'E5',0.5), e(6,'D5',1.5), e(8,'C5',0.5), e(9,'D5',1), e(10,'E5',1.5),
        e(12,'F5',1), e(13,'E5',1), e(14,'D5',2), e(16,'G4',1), e(18,'A4',1), e(19,'B4',2), e(21,'C5',3),
        e(24,'C5',1.5), e(26,'E5',0.5), e(27,'G5',1.5), e(29,'E5',0.5), e(30,'D5',1.5), e(32,'C5',0.5), e(33,'D5',1), e(34,'E5',1.5),
        e(36,'F5',1), e(37,'E5',1), e(38,'D5',2), e(40,'G4',1), e(41,'A4',1), e(42,'B4',2), e(44,'C5',4),
      ]},
      { wave:'sine', vol:0.12, notes:[
        e(0,'C3',4), e(4,'G2',2), e(6,'C3',2), e(8,'F3',2), e(10,'G2',2), e(12,'F3',2), e(14,'G2',2),
        e(16,'C3',4), e(20,'G2',2), e(22,'C3',2), e(24,'A2',4), e(28,'F3',2), e(30,'G2',2), e(32,'C3',8),
      ]},
      { wave:'square', vol:0.03, notes:[ e(0,'G4',2), e(8,'E4',2), e(16,'F4',2), e(24,'C4',2), e(32,'G4',4) ]},
    ],
  });

  /* Borgo — miele e legna, dolcemente mosso */
  song('hub', {
    bpm: 104,
    tracks: [
      { wave:'triangle', vol:0.12, notes:[
        e(0,'C5',1), e(1,'D5',1), e(2,'E5',2), e(4,'G5',1), e(5,'E5',1), e(6,'D5',2), e(8,'C5',1), e(9,'D5',1), e(10,'E5',1), e(11,'G5',1), e(12,'E5',2), e(14,'D5',2),
        e(16,'F5',1), e(17,'E5',1), e(18,'D5',2), e(20,'C5',1), e(21,'A4',1), e(22,'G4',2), e(24,'A4',1), e(25,'B4',1), e(26,'C5',2), e(28,'D5',1), e(29,'E5',1), e(30,'C5',2),
      ]},
      { wave:'sine', vol:0.11, notes:[
        e(0,'C3',4), e(4,'G2',2), e(6,'C3',2), e(8,'F3',4), e(12,'G2',4), e(16,'F3',4), e(20,'C3',2), e(22,'G2',2), e(24,'A2',4), e(28,'G2',4),
      ]},
      { wave:'square', vol:0.025, notes:[ e(0,'E4',1), e(4,'G4',1), e(8,'C4',1), e(12,'D4',1), e(16,'A3',1), e(20,'C4',1), e(24,'E4',1), e(28,'B3',1) ]},
    ],
  });

  /* Prato — allegria quieta */
  song('meadow', {
    bpm: 118,
    tracks: [
      { wave:'triangle', vol:0.12, notes:[
        e(0,'E5',1), e(1,'G5',1), e(2,'A5',2), e(4,'G5',1), e(5,'E5',1), e(6,'C5',2), e(8,'D5',1), e(9,'E5',1), e(10,'D5',2), e(12,'B4',1), e(13,'D5',1), e(14,'E5',2),
        e(16,'F5',1), e(17,'E5',1), e(18,'D5',2), e(20,'C5',1), e(21,'A4',1), e(22,'C5',2), e(24,'D5',1), e(25,'E5',1), e(26,'F5',1), e(27,'G5',1), e(28,'E5',2), e(30,'C5',2),
      ]},
      { wave:'sine', vol:0.1, notes:[
        e(0,'C3',2), e(2,'G2',2), e(4,'A2',2), e(6,'E2',2), e(8,'F3',2), e(10,'C3',2), e(12,'G2',2), e(14,'B2',2), e(16,'F3',2), e(18,'C3',2), e(20,'A2',2), e(22,'F2',2), e(24,'C3',2), e(26,'G2',2), e(28,'C3',2), e(30,'G2',2),
      ]},
    ],
  });

  /* Bosco — accogliente ma un po' misterioso */
  song('forest', {
    bpm: 96,
    tracks: [
      { wave:'triangle', vol:0.12, notes:[
        e(0,'A4',1.5), e(2,'C5',0.5), e(3,'E5',2), e(5,'D5',1), e(6,'C5',2), e(8,'B4',1.5), e(10,'C5',0.5), e(11,'D5',2), e(13,'B4',1), e(14,'A4',2),
        e(16,'G4',1.5), e(18,'A4',0.5), e(19,'C5',2), e(21,'D5',1), e(22,'E5',2), e(24,'D5',1.5), e(26,'C5',0.5), e(27,'B4',2), e(29,'A4',1), e(30,'G4',2),
      ]},
      { wave:'sine', vol:0.11, notes:[
        e(0,'A2',4), e(4,'E2',2), e(6,'A2',2), e(8,'F3',2), e(10,'C3',2), e(12,'G3',2), e(14,'D3',2), e(16,'C3',4), e(20,'G2',4), e(24,'F3',2), e(26,'C3',2), e(28,'G2',4),
      ]},
      { wave:'square', vol:0.022, notes:[ e(0,'E4',4), e(8,'D4',4), e(16,'E4',4), e(24,'D4',4) ]},
    ],
  });

  /* Costa — malinconia di ceneri e mare */
  song('coast', {
    bpm: 76,
    tracks: [
      { wave:'triangle', vol:0.13, notes:[
        e(0,'F4',2), e(2,'A4',1), e(3,'C5',2), e(5,'A4',1), e(6,'F4',3), e(9,'E4',1), e(10,'F4',2), e(12,'G4',2), e(14,'C4',2),
        e(16,'D5',2), e(18,'C5',1), e(19,'A4',2), e(21,'G4',1), e(22,'A4',3), e(25,'G4',1), e(26,'F4',2), e(28,'E4',2), e(30,'F4',2),
      ]},
      { wave:'sine', vol:0.11, notes:[
        e(0,'F2',4), e(4,'C3',2), e(6,'F2',2), e(8,'Bb2',4), e(12,'C3',2), e(14,'G2',2), e(16,'Bb2',4), e(20,'F2',2), e(22,'C3',2), e(24,'A2',4), e(28,'G2',2), e(30,'F2',2),
      ]},
      { wave:'square', vol:0.02, notes:[ e(0,'C5',8), e(16,'Bb4',8) ]},
    ],
  });

  /* Finale — intenso ma caldo */
  song('finale', {
    bpm: 90,
    tracks: [
      { wave:'triangle', vol:0.13, notes:[
        e(0,'C5',1), e(1,'E5',1), e(2,'G5',2), e(4,'A5',1), e(5,'G5',1), e(6,'E5',2), e(8,'F5',1), e(9,'G5',1), e(10,'A5',2), e(12,'G5',1), e(13,'E5',1), e(14,'C5',2),
        e(16,'D5',1), e(17,'E5',1), e(18,'F5',2), e(20,'E5',1), e(21,'D5',1), e(22,'C5',2), e(24,'A4',1), e(25,'B4',1), e(26,'C5',2), e(28,'D5',1), e(29,'E5',1), e(30,'C5',3),
      ]},
      { wave:'sine', vol:0.12, notes:[
        e(0,'C3',4), e(4,'G2',2), e(6,'C3',2), e(8,'F3',4), e(12,'G2',2), e(14,'G3',2), e(16,'A2',4), e(20,'E2',2), e(22,'A2',2), e(24,'F3',4), e(28,'G2',2), e(30,'G2',2), e(32,'C3',4),
      ]},
    ],
  });

  /* Scontro — teso ma gentile */
  song('battle', {
    bpm: 132,
    tracks: [
      { wave:'square', vol:0.07, notes:[
        e(0,'G4',0.5), e(1,'C5',0.5), e(2,'G4',0.5), e(3,'C5',0.5), e(4,'D5',1), e(6,'C5',0.5), e(7,'B4',0.5), e(8,'G4',0.5), e(9,'C5',0.5), e(10,'G4',0.5), e(11,'C5',0.5), e(12,'E5',1), e(14,'C5',0.5), e(15,'D5',0.5),
        e(16,'F4',0.5), e(17,'Bb4',0.5), e(18,'F4',0.5), e(19,'Bb4',0.5), e(20,'C5',1), e(22,'D5',0.5), e(23,'E5',0.5), e(24,'G4',0.5), e(25,'C5',0.5), e(26,'E5',0.5), e(28,'G5',1), e(30,'E5',0.5), e(31,'C5',0.5),
      ]},
      { wave:'sine', vol:0.1, notes:[
        e(0,'C3',1), e(2,'G2',1), e(4,'C3',1), e(6,'G2',1), e(8,'Bb2',1), e(10,'F2',1), e(12,'C3',1), e(14,'G2',1), e(16,'C3',1), e(18,'G2',1), e(20,'C3',1), e(22,'G2',1), e(24,'G3',1), e(26,'E3',1), e(28,'C3',1), e(30,'G2',1),
      ]},
      { wave:'noise', vol:0.05, notes:[ e(0,'_',1), e(2,'_',1), e(4,'_',1), e(6,'_',1), e(8,'_',1), e(10,'_',1), e(12,'_',1), e(14,'_',1), e(16,'_',1), e(18,'_',1), e(20,'_',1), e(22,'_',1), e(24,'_',1), e(26,'_',1), e(28,'_',1), e(30,'_',1) ]},
    ],
  });

  /* Crisi — il focolare spento */
  song('crisis', {
    bpm: 72,
    tracks: [
      { wave:'triangle', vol:0.12, notes:[
        e(0,'C5',3), e(3,'Bb4',1), e(4,'Ab4',3), e(7,'G4',1), e(8,'F4',3), e(11,'G4',1), e(12,'Ab4',4),
        e(16,'G4',3), e(19,'F4',1), e(20,'E4',3), e(23,'F4',1), e(24,'G4',4), e(28,'C4',4),
      ]},
      { wave:'sine', vol:0.1, notes:[
        e(0,'Ab2',8), e(8,'F2',4), e(12,'G2',4), e(16,'C3',8), e(24,'C2',4), e(28,'G2',4),
      ]},
    ],
  });

  /* Finale epilogo — tenero */
  song('epilogue', {
    bpm: 84,
    tracks: [
      { wave:'triangle', vol:0.12, notes:[
        e(0,'C5',2), e(2,'E5',1), e(3,'G5',2), e(5,'E5',1), e(6,'D5',2), e(8,'C5',1), e(9,'D5',1), e(10,'E5',2), e(12,'G4',2), e(14,'B4',2),
        e(16,'A4',2), e(18,'C5',1), e(19,'E5',2), e(21,'C5',1), e(22,'D5',3), e(25,'B4',1), e(26,'C5',4),
      ]},
      { wave:'sine', vol:0.11, notes:[
        e(0,'C3',4), e(4,'G2',4), e(8,'F3',4), e(12,'G2',4), e(16,'A2',4), e(20,'E2',4), e(24,'F3',4), e(28,'G2',4),
      ]},
    ],
  });

  /* ---- scheduler ---- */
  function startSong(key){
    if(!ensure() || !unlocked){ currentSong = { key }; return; }
    stopSong(true);
    const s = SONGS[key];
    if(!s){ currentSong = null; return; }
    currentSong = s;
    s.key = key;
    s.bpm = s.bpm || 100;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    const spb = 60 / s.bpm / 4; /* seconds per 16th */
    s.spb = spb;
    const maxSteps = Math.max(...s.tracks.map(t => Math.max(0, ...t.notes.map(n => n.s + n.d * 2))));
    s.maxSteps = Math.max(32, Math.ceil(maxSteps));
    timer = setInterval(schedule, 25);
  }

  function schedule(){
    if(!ctx) return;
    const s = currentSong;
    if(!s) return;
    while(nextTime < ctx.currentTime + 0.12){
      const st = step % s.maxSteps;
      s.tracks.forEach(t => {
        t.notes.forEach(n => {
          if(n.s === st){
            const when = nextTime;
            if(n.m === '_' || n.m === undefined){
              noise(0.04, 0.08 * (n.v||1), when, 600);
            } else {
              const f = midi(n.m);
              const dur = n.d * s.spb;
              const gg = ctx.createGain();
              gg.gain.setValueAtTime(t.vol * (n.v || 1), when);
              gg.gain.exponentialRampToValueAtTime(0.0001, when + dur);
              gg.connect(musicGain);
              const o = ctx.createOscillator();
              o.type = t.wave;
              o.frequency.value = f;
              if(t.wave === 'triangle') o.detune.value = -4;
              o.connect(gg);
              o.start(when);
              o.stop(when + dur + 0.05);
            }
          }
        });
      });
      nextTime += s.spb;
      step++;
    }
  }

  function stopSong(fast){
    if(timer){ clearInterval(timer); timer = null; }
    currentSong = null;
  }
  function playSong(key){
    if(typeof key === 'string') startSong(key);
  }
  function setMusicVol(v){ if(musicGain) musicGain.gain.value = v; }
  function setSfxVol(v){ if(sfxGain) sfxGain.gain.value = v; }
  function current(){ return currentSong && currentSong.key ? currentSong.key : (currentSong ? currentSong.key : null); }
  function isPlaying(key){ return !!currentSong && currentSong.key === key; }

  return { unlock, sfx, playSong, stopSong, setMusicVol, setSfxVol, current, isPlaying };
})();