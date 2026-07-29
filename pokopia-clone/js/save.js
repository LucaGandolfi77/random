// save.js — localStorage: save/load/reset, export/import base64, autosave.
var SAVE = (function(){
  var KEY='dittopia_save_v1';

  function serialize(state){
    var s={
      v:1,
      time: state.time, frame: state.frame,
      player: { x:state.player.x, y:state.player.y, dir:state.player.dir, skin:state.player.skin, hair:state.player.hair, shirt:state.player.shirt, inv:state.player.inv, moves:state.player.moves },
      world: WORLD.serialize(),
      mons: MONS.serialize(),
      quest: { current: state.quest.current, flags: state.quest.flags, rewardGiven: state.quest.rewardGiven||{} },
      dex: MONS.pokedex(),
      settings: state.settings||{},
      meta: { last:new Date().toISOString() },
    };
    return s;
  }
  function saveState(state){
    try{ localStorage.setItem(KEY, JSON.stringify(serialize(state))); return true; }
    catch(e){ console.warn('save failed',e); return false; }
  }
  function loadRaw(){ try{ return JSON.parse(localStorage.getItem(KEY)); }catch(e){ return null; } }
  function hasSave(){ return !!localStorage.getItem(KEY); }
  function loadInto(state){
    var s=loadRaw(); if(!s) return false;
    state.time=s.time||0; state.frame=s.frame||0;
    var p=s.player||{}; var pp=state.player;
    pp.x=p.x; pp.y=p.y; pp.dir=p.dir||'D'; pp.skin=p.skin||PAL.skin; pp.hair=p.hair||PAL.hair; pp.shirt=p.shirt||PAL.shirt;
    pp.inv=p.inv||{}; pp.moves=p.moves||{base:true};
    WORLD.load(s.world||{});
    MONS.load(s.mons||[], WORLD.getSpecials?WORLD.getSpecials():{});
    state.quest.current=(s.quest&&s.quest.current)||'q1';
    state.quest.flags=(s.quest&&s.quest.flags)||{};
    state.quest.rewardGiven=((s.quest&&s.quest.rewardGiven)||{});
    if(s.dex){ MONS.setDex(s.dex); }
    state.settings=s.settings||{};
    return true;
  }
  function reset(){ localStorage.removeItem(KEY); }

  function exportB64(){
    var s=serialize(GAME.state());
    return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
  }
  function importB64(b64){
    try{ var s=JSON.parse(decodeURIComponent(escape(atob(b64)))); localStorage.setItem(KEY, JSON.stringify(s)); return true; }
    catch(e){ return false; }
  }
  return { saveState:saveState, hasSave:hasSave, loadInto:loadInto, reset:reset, exportB64:exportB64, importB64:importB64, KEYS:function(){return KEY;} };
})();