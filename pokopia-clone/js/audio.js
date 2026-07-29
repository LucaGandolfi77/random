// audio.js — sintetizzatore chiptune via WebAudio. Musica giorno/notte, SFX, versi Pokémon, fanfare, note flauto.
var AUDIO = (function(){
  var ctx=null, master=null, musicGain=null, sfxGain=null;
  var started=false, musicTimer=null, musicPattern=null;
  var enabled=false, muted=false, vol=0.5;

  function init(){
    if(ctx) return;
    try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }
    catch(e){ return; }
    master=ctx.createGain(); master.gain.value=vol; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=0.5; musicGain.connect(master);
    sfxGain=ctx.createGain(); sfxGain.gain.value=0.7; sfxGain.connect(master);
    enabled=true;
  }
  function resume(){ init(); if(ctx && ctx.state==='suspended') ctx.resume(); }
  function setMute(m){ muted=m; if(master) master.gain.value=m?0:vol; }
  function setVolume(v){ vol=v; if(master && !muted) master.gain.value=v; }

  // tono base: square wave con envelope
  function tone(freq, t, dur, type, gainNode, peak){
    type=type||'square'; peak=peak===undefined?0.3:peak;
    if(!ctx) return;
    var o=ctx.createOscillator(); o.type=type; o.frequency.value=freq;
    var g=ctx.createGain(); g.gain.value=0;
    g.connect(gainNode||master);
    var at=Math.min(0.02,dur*0.3), rl=Math.min(0.08,dur*0.4);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(peak,t+at);
    g.gain.setValueAtTime(peak,t+dur-rl);
    g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(g); o.start(t); o.stop(t+dur+0.02);
  }

  // ─── SFX ───
  function sfxPickup(){ resume(); if(!ctx)return; var t=ctx.currentTime;
    tone(660,t,0.06,'square',sfxGain,0.25); tone(880,t+0.05,0.07,'square',sfxGain,0.25); }
  function sfxStep(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(120,t,0.04,'triangle',sfxGain,0.08); }
  function sfxChop(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(200,t,0.05,'sawtooth',sfxGain,0.3); tone(140,t+0.04,0.1,'sawtooth',sfxGain,0.25); }
  function sfxSmash(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(120,t,0.08,'square',sfxGain,0.3); tone(90,t+0.05,0.15,'sawtooth',sfxGain,0.3); }
  function sfxWater(){ resume(); if(!ctx)return; var t=ctx.currentTime; for(var i=0;i<4;i++) tone(400+i*120,t+i*0.04,0.06,'sine',sfxGain,0.2); }
  function sfxCraft(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(523,t,0.08,'triangle',sfxGain,0.25); tone(659,t+0.07,0.08,'triangle',sfxGain,0.25); tone(784,t+0.14,0.1,'triangle',sfxGain,0.25); }
  function sfxSparkle(){ resume(); if(!ctx)return; var t=ctx.currentTime; for(var i=0;i<6;i++) tone(1046+i*120,t+i*0.03,0.08,'sine',sfxGain,0.18); }
  function sfxError(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(200,t,0.08,'square',sfxGain,0.2); tone(160,t+0.07,0.12,'square',sfxGain,0.2); }
  function sfxSelect(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(880,t,0.04,'square',sfxGain,0.15); }
  function sfxText(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(660,t,0.015,'square',sfxGain,0.06); }
  // fanfare amicizia
  var FANFARE=[523,659,784,1046,784,1046,1318];
  function sfxFanfare(){ resume(); if(!ctx)return; var t=ctx.currentTime;
    FANFARE.forEach(function(f,i){ tone(f,t+i*0.12,0.14,'square',sfxGain,0.28); }); }
  // verso Pokémon da pattern [ms,Hz,...]
  function cry(pattern){ resume(); if(!ctx||!pattern)return; var t=ctx.currentTime;
    var acc=0; for(var i=0;i<pattern.length;i+=2){ var ms=pattern[i], hz=pattern[i+1];
      tone(hz,t+acc/1000,(ms)/1000,'square',sfxGain,0.3); acc+=ms; } }
  // nota del flauto (per minigioco Simon)
  var FLUTE_NOTES=[523,587,659,784,880,988];
  function fluteNote(idx){ resume(); if(!ctx)return; var t=ctx.currentTime;
    var f=FLUTE_NOTES[idx]||523; tone(f,t,0.4,'sine',sfxGain,0.4); tone(f*2,t,0.4,'sine',sfxGain,0.15); }
  function fluteFail(){ resume(); if(!ctx)return; var t=ctx.currentTime; tone(196,t,0.3,'sawtooth',sfxGain,0.3); }
  function fluteSuccess(){ sfxFanfare(); }

  // ─── MUSICA (loop arpeggiato) ───
  // due pattern: giorno (allegro maggiore) e notte (calmo minore, lento)
  var DAY=[ [523,0.25],[659,0.25],[784,0.25],[1046,0.25],[784,0.25],[659,0.25],[587,0.25],[523,0.25],
            [440,0.5],[523,0.5], [392,0.5],[523,0.5], [659,0.25],[784,0.25],[880,0.25],[988,0.25] ];
  var NIGHT=[ [392,0.5],[523,0.5],[659,0.5],[523,0.5],[349,0.5],[440,0.5],[523,0.5],[440,0.5],
              [330,1],[392,0.5],[294,0.5],[392,1] ];
  var bassDay=[ [131,1],[196,1],[165,1],[196,1] ];
  var bassNight=[ [98,2],[110,2] ];
  function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } musicPattern=null; }
  function playMusic(mode){ resume(); if(!ctx) return; stopMusic();
    var pat= mode==='night'?NIGHT:DAY; var bass= mode==='night'?bassNight:bassDay;
    var tempo= mode==='night'?0.6:0.35;
    musicPattern={pat:pat,bass:bass,tempo:tempo,step:0};
    var stepMs=tempo*1000;
    musicTimer=setInterval(function(){
      if(!ctx||muted) return;
      var st=musicPattern.step; var t=ctx.currentTime;
      var note=musicPattern.pat[st % musicPattern.pat.length];
      tone(note[0],t,note[1]*musicPattern.tempo*0.9,'square',musicGain,0.12);
      if(st%4===0){ var b=musicPattern.bass[(st/4)%musicPattern.bass.length]; tone(b[0],t,b[1]*musicPattern.tempo*0.95,'triangle',musicGain,0.18); }
      musicPattern.step++;
    }, stepMs);
  }

  return { init:init, resume:resume, setMute:setMute, setVolume:setVolume,
    sfxPickup:sfxPickup, sfxStep:sfxStep, sfxChop:sfxChop, sfxSmash:sfxSmash, sfxWater:sfxWater,
    sfxCraft:sfxCraft, sfxSparkle:sfxSparkle, sfxError:sfxError, sfxSelect:sfxSelect, sfxText:sfxText,
    sfxFanfare:sfxFanfare, cry:cry, fluteNote:fluteNote, fluteFail:fluteFail, fluteSuccess:fluteSuccess,
    playMusic:playMusic, stopMusic:stopMusic,
    isMuted:function(){return muted;} };
})();