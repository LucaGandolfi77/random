/* MAIN — bootstrap, idle "BENTORNATO!", cheat di debug. */
'use strict';

function boot(){
  UI.init();

  const data = save.load();
  if (!data){
    newGame();
    toast('🎮 Nuova partita: siete in 2, con €1.000 e una Stanza Studenti. Il divertimento non aspetta.');
  }else{
    const away = idle.compute();
    if (away){
      idle.apply(away);
      showWelcomeBack(away);
    }else{
      toast('Bentornati, imperatori del divertimento!');
    }
  }

  UI.refreshUI();
}

function showWelcomeBack(away){
  const employed = G.friends.filter(f => getCharacter(f.id) && getCharacter(f.id).job).length;
  const sheet = `
    <button class="close" data-c>✕</button>
    <div class="result-hero">
      <div class="emoji">👋</div>
      <h2>BENTORNATO!</h2>
      <p>${esc(away.hours)} ore lontani. La compagnia ha continuato a esistere (e a mangiare).</p>
    </div>
    <div class="result-nums">
      <div class="rn"><div class="v" style="color:var(--good)">+€${fmt(away.money)}</div><div class="l">💰 GUADAGNATO</div></div>
      <div class="rn"><div class="v" style="color:var(--accent)">+${fmt(away.happy)}</div><div class="l">❤️ FELICITÀ</div></div>
      <div class="rn"><div class="v" style="color:var(--accent2)">+${fmt(away.rep)}</div><div class="l">⭐ REPUTAZIONE</div></div>
    </div>
    <button class="btn" data-c2>E adesso? 🎉</button>`;
  UI.openModal(sheet);
  audio.fanfare();
  const mod = $id('modal');
  mod.querySelectorAll('[data-c], [data-c2]').forEach(b => b.addEventListener('click', () => {
    UI.closeModal();
    UI.refreshUI();
  }));
}

window.addEventListener('DOMContentLoaded', boot);

/* ---- loop 3D (solo browser) ---- */
if (typeof requestAnimationFrame !== 'undefined' && typeof window !== 'undefined' && window.requestAnimationFrame){
  let last = 0;
  const frame = (t) => {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
    last = t;
    if (typeof R3D !== 'undefined' && R3D.tick) R3D.tick(dt);
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame(frame);
}

window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (e.key === 'F1'){
    G.money += 9999;
    for (const f of G.friends) f.energy = 100;
    toast('🛠️ Debug: +€9.999 e tutti riposati.');
    UI.refreshUI();
  }else if (e.key === 'F2'){
    advanceTime();
  }
});