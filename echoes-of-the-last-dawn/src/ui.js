export const $ = (id) => document.getElementById(id);

export function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
}

export function typewrite(el, text, speed = 16) {
  return new Promise((res) => {
    el.textContent = "";
    let i = 0;
    const iv = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(iv); res(); }
    }, speed);
  });
}

export async function narrate(beats) {
  const sp = $("narr-speaker"), tx = $("narr-text"), btn = $("narr-next");
  showScreen("narrative-screen");
  for (const b of beats) {
    sp.textContent = b.speaker || "";
    btn.style.visibility = "hidden";
    const typing = typewrite(tx, b.text);
    btn.style.visibility = "visible";
    await new Promise((res) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("keydown", onKey);
        btn.removeEventListener("click", onClick);
        res();
      };
      const onClick = () => finish();
      const onKey = (e) => { if (e.key === " " || e.key === "Enter") finish(); };
      btn.addEventListener("click", onClick);
      window.addEventListener("keydown", onKey);
    });
  }
  showScreen("game-screen");
}

export function showChoice(text, options) {
  return new Promise((res) => {
    showScreen("choice-screen");
    $("choice-text").textContent = text;
    const a = $("choice-a"), b = $("choice-b");
    a.textContent = options[0].label;
    b.textContent = options[1].label;
    const pick = (opt) => () => { res(opt.key); };
    a.onclick = pick(options[0]);
    b.onclick = pick(options[1]);
  });
}

export function showEnding(ending) {
  $("ending-kicker").textContent = ending.kicker;
  $("ending-title").textContent = ending.title;
  $("ending-text").textContent = ending.text;
  showScreen("ending-screen");
}
