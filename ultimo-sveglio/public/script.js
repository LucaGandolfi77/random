const socket = io();
let mioNickname = null;
let sonoUltimo = false;
let messaggioConsegnato = false;

const PREFISSI_ITALIANI = [
  "Sognatore", "Viandante", "Custode", "Errante", "Nottambulo",
  "Sentinella", "Vagabondo", "Nomade", "Pellegrino", "Osservatore",
  "Viaggiatore", "Esploratore", "Cercatore", "Luminoso", "Silenzioso"
];
function idUnico() {
  const p = PREFISSI_ITALIANI[Math.floor(Math.random() * PREFISSI_ITALIANI.length)];
  return `${p}#${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}
const mioId = localStorage.getItem("ultimo_sveglio_id") || idUnico();
localStorage.setItem("ultimo_sveglio_id", mioId);

const dom = {
  dayView: document.getElementById("day-view"),
  nightView: document.getElementById("night-view"),
  coronationView: document.getElementById("coronation-view"),
  finalMessageView: document.getElementById("final-message-view"),
  countdown: document.getElementById("countdown"),
  chatMessages: document.getElementById("chat-messages"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send"),
  userList: document.getElementById("user-list"),
  contatoreSvegli: document.getElementById("contatore-svegli"),
  notteData: document.getElementById("notte-data"),
  coronaTitle: document.getElementById("coronation-title"),
  finalMessageInput: document.getElementById("final-message-input"),
  finalMessageSend: document.getElementById("final-message-send"),
  finalNickname: document.getElementById("final-nickname"),
  finalDate: document.getElementById("final-date"),
  finalMessageText: document.getElementById("final-message-text"),
  albumContent: document.getElementById("album-content"),
  albumToggle: document.getElementById("album-toggle"),
  albumList: document.getElementById("album-list"),
  albumEmpty: document.getElementById("album-empty"),
};

function mostra(view) {
  [dom.dayView, dom.nightView, dom.coronationView, dom.finalMessageView].forEach((v) => v.classList.remove("active"));
  view.classList.add("active");
}

const starfield = document.getElementById("starfield");
const ctx = starfield.getContext("2d");
let stars = [];

function initStarfield() {
  starfield.width = window.innerWidth;
  starfield.height = window.innerHeight;
  stars = Array.from({ length: 200 }, () => ({
    x: Math.random() * starfield.width,
    y: Math.random() * starfield.height,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random(),
    speed: Math.random() * 0.005 + 0.002,
  }));
}

function drawStarfield() {
  ctx.clearRect(0, 0, starfield.width, starfield.height);
  for (const s of stars) {
    s.a += s.speed;
    const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.a));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
    ctx.fill();
  }
  requestAnimationFrame(drawStarfield);
}

initStarfield();
drawStarfield();
window.addEventListener("resize", initStarfield);

// Countdown
function aggiornaCountdown() {
  const now = new Date();
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  const diff = mid.getTime() - now.getTime();
  if (diff <= 0) {
    dom.countdown.textContent = "00:00:00";
    return;
  }
  const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  dom.countdown.textContent = `${h}:${m}:${s}`;
}
setInterval(aggiornaCountdown, 1000);
aggiornaCountdown();

// Socket events
socket.on("benvenuto", (data) => {
  mioNickname = data.nickname;
  document.title = `🌙 ${mioNickname} — Ultimo Sveglio`;
});

socket.on("notte-iniziata", (data) => {
  mostra(dom.nightView);
  dom.notteData.textContent = data.data;
  if (data.chat) {
    dom.chatMessages.innerHTML = "";
    for (const msg of data.chat) {
      aggiungiMessaggioChat(msg);
    }
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }
});

socket.on("notte-terminata", () => {
  if (sonoUltimo && !messaggioConsegnato) {
    mostra(dom.finalMessageView);
  }
  setTimeout(() => {
    mostra(dom.dayView);
    sonoUltimo = false;
    messaggioConsegnato = false;
  }, 5000);
});

socket.on("presenze", (svegli) => {
  dom.contatoreSvegli.textContent = svegli.length;
  dom.userList.innerHTML = "";
  for (const u of svegli) {
    const li = document.createElement("li");
    li.textContent = u.nickname;
    if (u.èUltimo) {
      li.classList.add("corona");
      li.textContent = `👑 ${u.nickname}`;
    }
    dom.userList.appendChild(li);
  }
  // Se sono l'unico nella view notte e non sono ancora l'ultimo, mostra attesa
});

socket.on("messaggio-chat", (msg) => {
  aggiungiMessaggioChat(msg);
  dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
});

socket.on("incoronazione", (data) => {
  if (data.nickname === mioNickname) {
    sonoUltimo = true;
    mostra(dom.coronationView);
    dom.coronaTitle.textContent = "Sei l'Ultimo Sveglio!";
  } else {
    // qualcun altro è stato incoronato
    if (!data.giàFatto) {
      // Mostra notifica silenziosa
    }
  }
});

socket.on("sei-lultimo", () => {
  // già gestito in incoronazione
});

socket.on("messaggio-finale", (data) => {
  dom.finalNickname.textContent = data.nickname;
  dom.finalDate.textContent = new Date().toLocaleDateString("it-IT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  dom.finalMessageText.textContent = data.messaggio;
  mostra(dom.finalMessageView);
  caricaAlbum();
});

// Chat
dom.chatSend.addEventListener("click", inviaMessaggioChat);
dom.chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") inviaMessaggioChat();
});

function inviaMessaggioChat() {
  const testo = dom.chatInput.value.trim();
  if (!testo) return;
  socket.emit("messaggio", testo);
  dom.chatInput.value = "";
}

function aggiungiMessaggioChat(msg) {
  const div = document.createElement("div");
  div.classList.add("chat-msg", msg.tipo);
  if (msg.nickname === mioNickname) div.classList.add("tuo");
  if (msg.tipo === "utente") {
    div.innerHTML = `<span class="msg-author">${msg.nickname}</span><span class="msg-text">${escapeHtml(msg.testo)}</span>`;
  } else {
    div.textContent = msg.testo;
  }
  dom.chatMessages.appendChild(div);
}

// Final message
dom.finalMessageSend.addEventListener("click", inviaMessaggioFinale);
dom.finalMessageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) inviaMessaggioFinale();
});

function inviaMessaggioFinale() {
  const testo = dom.finalMessageInput.value.trim();
  if (!testo || messaggioConsegnato) return;
  messaggioConsegnato = true;
  dom.finalMessageSend.disabled = true;
  dom.finalMessageSend.textContent = "✨ Consegnato!";
  socket.emit("messaggio-finale", testo);
}

// Album
dom.albumToggle.addEventListener("click", () => {
  const isHidden = dom.albumContent.classList.contains("hidden");
  dom.albumContent.classList.toggle("hidden");
  dom.albumToggle.textContent = isHidden ? "Nascondi" : "Mostra";
  if (isHidden) caricaAlbum();
});

async function caricaAlbum() {
  try {
    const res = await fetch("/api/album");
    const album = await res.json();
    if (album.length === 0) {
      dom.albumEmpty.classList.remove("hidden");
      dom.albumList.classList.add("hidden");
      return;
    }
    dom.albumEmpty.classList.add("hidden");
    dom.albumList.classList.remove("hidden");
    dom.albumList.innerHTML = "";
    for (const entry of [...album].reverse()) {
      const el = document.createElement("div");
      el.className = "album-entry";
      el.innerHTML = `
        <div class="album-data">${entry.data}</div>
        <div class="album-autore">👑 ${entry.ultimo_sveglio}</div>
        <div class="album-messaggio">"${escapeHtml(entry.messaggio)}"</div>
        <div class="album-durata">Durata: ${entry.durata}</div>
        <div class="album-partecipanti">Partecipanti: ${(entry.partecipanti || []).join(", ")}</div>
      `;
      dom.albumList.appendChild(el);
    }
  } catch {}
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// Check stato iniziale
async function init() {
  try {
    const res = await fetch("/api/stato");
    const stato = await res.json();
    if (stato.notte) {
      mostra(dom.nightView);
    } else if (stato.messaggio_finale) {
      dom.finalNickname.textContent = stato.messaggio_finale.ultimo_sveglio;
      dom.finalDate.textContent = new Date(stato.messaggio_finale.data).toLocaleDateString("it-IT", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      }) || stato.messaggio_finale.data;
      dom.finalMessageText.textContent = stato.messaggio_finale.messaggio;
      mostra(dom.finalMessageView);
      setTimeout(() => mostra(dom.dayView), 8000);
    }
  } catch {}
}

init();

// Ping heartbeat
setInterval(() => {
  if (socket.connected) socket.emit("ping");
}, 10000);