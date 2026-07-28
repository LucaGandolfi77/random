const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const ALBUM_FILE = path.join(DATA_DIR, "album.json");
const STATO_FILE = path.join(DATA_DIR, "stato.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(ALBUM_FILE)) fs.writeFileSync(ALBUM_FILE, "[]");
  if (!fs.existsSync(STATO_FILE))
    fs.writeFileSync(
      STATO_FILE,
      JSON.stringify({ notte_in_corso: null, messaggio_corrente: null })
    );
}
ensureDataDir();

function readAlbum() {
  try {
    return JSON.parse(fs.readFileSync(ALBUM_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveAlbum(album) {
  fs.writeFileSync(ALBUM_FILE, JSON.stringify(album, null, 2));
}

function readStato() {
  try {
    return JSON.parse(fs.readFileSync(STATO_FILE, "utf-8"));
  } catch {
    return { notte_in_corso: null, messaggio_corrente: null };
  }
}

function saveStato(stato) {
  fs.writeFileSync(STATO_FILE, JSON.stringify(stato, null, 2));
}

const NICKNAMES = [
  "Lupo Solitario", "Gufo Reale", "Civetta", "Volpe d'Argento",
  "Stella Cadente", "Luna Piena", "Notturno", "Ombra",
  "Vento dell'Est", "Nebbia", "Fantasma", "Pipistrello",
  "Grillo Cantore", "Rospo", "Falena", "Riccio",
  "Tasso", "Daino", "Lince", "Gatto Nero",
  "Barbagianni", "Assiolo", "Rondine Notturna", "Scorpione",
  "Salamandra", "Biscia d'Acqua", "Aragosta", "Gambero"
];

function getRandomNickname() {
  const used = new Set(users.map((u) => u.nickname));
  const available = NICKNAMES.filter((n) => !used.has(n));
  if (available.length === 0) return `Vegliante #${Math.floor(Math.random() * 1000)}`;
  return available[Math.floor(Math.random() * available.length)];
}

function isNotte() {
  const now = new Date();
  return now.getHours() >= 0 && now.getHours() < 6;
}

function getDataNotte() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getDurata(from) {
  const ms = Date.now() - from;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function calcolaMezzanotte() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

let users = [];
let notte = {
  attiva: false,
  data: null,
  iniziata: null,
  chat: [],
  ultimo_sveglio: null,
  messaggio_finale: null,
};

function avviaNotte() {
  if (notte.attiva) return;
  notte = {
    attiva: true,
    data: getDataNotte(),
    iniziata: Date.now(),
    chat: [],
    ultimo_sveglio: null,
    messaggio_finale: null,
  };
  const stato = readStato();
  stato.notte_in_corso = notte.data;
  stato.messaggio_corrente = null;
  saveStato(stato);
  console.log(`[${notte.data}] Notte iniziata!`);
  io.emit("notte-iniziata", { data: notte.data });
}

function terminaNotte() {
  if (!notte.attiva) return;
  console.log(`[${notte.data}] Notte terminata.`);
  notte.attiva = false;
  io.emit("notte-terminata");

  if (notte.ultimo_sveglio && notte.messaggio_finale) {
    const album = readAlbum();
    album.push({
      data: notte.data,
      ultimo_sveglio: notte.ultimo_sveglio,
      messaggio: notte.messaggio_finale,
      durata: getDurata(notte.iniziata),
      partecipanti: users.map((u) => u.nickname),
    });
    saveAlbum(album);
    const stato = readStato();
    stato.messaggio_corrente = { ultimo_sveglio: notte.ultimo_sveglio, messaggio: notte.messaggio_finale, data: notte.data };
    saveStato(stato);
  }

  notte = { attiva: false, data: null, iniziata: null, chat: [], ultimo_sveglio: null, messaggio_finale: null };
}

function checkCoronation() {
  const svegli = users.filter((u) => u.sveglio);
  if (notte.attiva && svegli.length === 1 && !notte.ultimo_sveglio) {
    notte.ultimo_sveglio = svegli[0].nickname;
    const socketId = svegli[0].id;
    io.emit("incoronazione", { nickname: svegli[0].nickname });
    io.to(socketId).emit("sei-lultimo");
    console.log(`[${notte.data}] ${svegli[0].nickname} è l'Ultimo Sveglio!`);
  }
  if (notte.attiva && svegli.length === 0 && !notte.ultimo_sveglio) {
    terminaNotte();
  }
  if (notte.ultimo_sveglio && users.filter((u) => u.sveglio).length === 0) {
    terminaNotte();
  }
}

function broadcastPresenze() {
  const svegli = users.filter((u) => u.sveglio).map((u) => ({
    nickname: u.nickname,
    èUltimo: notte.ultimo_sveglio === u.nickname,
  }));
  io.emit("presenze", svegli);
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/stato", (req, res) => {
  res.json({
    notte: notte.attiva,
    data: notte.data,
    ultimo_sveglio: notte.ultimo_sveglio,
    messaggio_finale: notte.messaggio_finale,
    utenti_online: users.filter((u) => u.sveglio).length,
  });
});

app.get("/api/countdown", (req, res) => {
  res.json({ ms: calcolaMezzanotte() });
});

app.get("/api/album", (req, res) => {
  res.json(readAlbum());
});

io.on("connection", (socket) => {
  const nickname = getRandomNickname();
  const utente = { id: socket.id, nickname, sveglio: true, lastPing: Date.now() };
  users.push(utente);

  console.log(`${nickname} si è connesso (${socket.id})`);

  if (isNotte() || notte.attiva) {
    if (!notte.attiva) avviaNotte();
    socket.emit("notte-iniziata", { data: notte.data, chat: notte.chat });
  }

  socket.emit("benvenuto", { nickname, utenti: users.filter((u) => u.sveglio).map((u) => u.nickname) });

  if (notte.attiva) {
    const sist = `${nickname} si è unito alla veglia`;
    notte.chat.push({ tipo: "sistema", testo: sist, timestamp: Date.now() });
    io.emit("messaggio-chat", { tipo: "sistema", testo: sist });
  }

  if (notte.attiva && notte.ultimo_sveglio) {
    socket.emit("incoronazione", { nickname: notte.ultimo_sveglio, giàFatto: notte.messaggio_finale !== null });
    if (notte.messaggio_finale) {
      socket.emit("messaggio-finale", { nickname: notte.ultimo_sveglio, messaggio: notte.messaggio_finale });
    }
  }

  broadcastPresenze();
  checkCoronation();

  socket.on("ping", () => {
    const u = users.find((u) => u.id === socket.id);
    if (u) u.lastPing = Date.now();
  });

  socket.on("messaggio", (testo) => {
    if (!notte.attiva || notte.ultimo_sveglio) return;
    const u = users.find((u) => u.id === socket.id);
    if (!u || !u.sveglio) return;
    const msg = { tipo: "utente", nickname: u.nickname, testo, timestamp: Date.now() };
    notte.chat.push(msg);
    io.emit("messaggio-chat", msg);
  });

  socket.on("messaggio-finale", (testo) => {
    if (!notte.attiva) return;
    const u = users.find((u) => u.id === socket.id);
    if (!u || notte.ultimo_sveglio !== u.nickname) return;
    if (!testo || testo.trim().length === 0) return;
    notte.messaggio_finale = testo.trim();
    io.emit("messaggio-finale", { nickname: u.nickname, messaggio: notte.messaggio_finale });
    console.log(`${u.nickname} ha lasciato un messaggio: ${testo}`);
  });

  socket.on("disconnect", () => {
    const u = users.find((u) => u.id === socket.id);
    if (u) {
      u.sveglio = false;
      if (notte.attiva) {
        const sist = `${u.nickname} si è addormentato`;
        notte.chat.push({ tipo: "sistema", testo: sist, timestamp: Date.now() });
        io.emit("messaggio-chat", { tipo: "sistema", testo: sist });
        console.log(sist);
      }
    }
    users = users.filter((u) => u.id !== socket.id);
    broadcastPresenze();
    checkCoronation();
  });
});

setInterval(() => {
  const now = Date.now();
  let cambiato = false;
  for (const u of users) {
    if (u.sveglio && now - u.lastPing > 30000) {
      u.sveglio = false;
      if (notte.attiva) {
        const sist = `${u.nickname} si è addormentato (timeout)`;
        notte.chat.push({ tipo: "sistema", testo: sist, timestamp: Date.now() });
        io.emit("messaggio-chat", { tipo: "sistema", testo: sist });
      }
      cambiato = true;
    }
  }
  if (cambiato) {
    broadcastPresenze();
    checkCoronation();
  }
}, 15000);

setInterval(() => {
  if (!notte.attiva && isNotte() && users.length > 0) {
    avviaNotte();
    broadcastPresenze();
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`🌙 L'Ultimo Sveglio — http://localhost:${PORT}`);
});