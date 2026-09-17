import vfs from './vfs.js'
import registry from './registry.js'
import sound from './sound.js'
import { DEFAULT_CONTACTS, defaultConvs, INCOMING_SMS_POOL, SETTINGS_DEFAULTS, OS_VERSION, OS_NAME } from './defaults.js'

let pidCounter = 1
let bootTime = Date.now()
let imei = null

function generateImei() {
  let s = '35'
  for (let i = 0; i < 13; i++) s += Math.floor(Math.random() * 10)
  return s.replace(/(\d{6})(\d{6})(\d{5})/, '$1 $2 $3')
}

function createSys(pid) {
  return {
    fs: {
      read: (p) => vfs.read(p),
      write: (p, d) => vfs.write(p, d),
      append: (p, d) => vfs.append(p, d),
      ls: (p) => vfs.ls(p),
      mkdir: (p) => vfs.mkdir(p),
      rm: (p) => vfs.rm(p),
      exists: (p) => vfs.exists(p),
      stat: (p) => vfs.stat(p),
      du: () => vfs.du(),
    },
    notify(title, text) {
      kernel._addNotification({ title, text, time: Date.now(), unread: true })
    },
    onKey(fn) {
      const proc = kernel.processes.find(p => p.pid === pid)
      if (proc) proc.keyHandler = fn
    },
    exit() {
      kernel.kill(pid)
    },
    /** Chiama un numero (e mostra la call screen). name opzionale. */
    call(number, name) {
      kernel.startCall(number, name)
    },
    /** Apre un'altra app (es. dal dialer) */
    openApp(appId) {
      return kernel.launch(appId)
    },
    vibrate(ms) {
      sound.vibrate(ms)
    },
    beep(freq, dur, type, vol) {
      sound.playNote(freq, dur, type, vol)
    },
    getInfo() {
      return {
        version: OS_VERSION,
        os: OS_NAME,
        model: 'OP-2000 Crazy Frog',
        uptime: Date.now() - bootTime,
        battery: kernel.battery,
        imei: kernel.getImei(),
        pid,
      }
    },
    getState(key) {
      switch (key) {
        case 'uptime': return Date.now() - bootTime
        case 'bootTime': return bootTime
        case 'battery': return kernel.battery
        case 'pid': return pid
        case 'foreground': return kernel.getForeground()?.pid === pid
        default: return null
      }
    },
  }
}

function loadContacts() {
  try {
    const raw = vfs.read('/data/contacts/list.json')
    const list = raw ? JSON.parse(raw) : DEFAULT_CONTACTS
    return Array.isArray(list) && list.length ? list : DEFAULT_CONTACTS
  } catch { return DEFAULT_CONTACTS }
}

function loadConvs() {
  try {
    const raw = vfs.read('/data/messages/conversations.json')
    const list = raw ? JSON.parse(raw) : defaultConvs()
    return Array.isArray(list) && list.length ? list : defaultConvs()
  } catch { return defaultConvs() }
}

function loadCallLog() {
  try {
    const raw = vfs.read('/data/calls/log.json')
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

const kernel = {
  processes: [],
  navStack: [],
  notifications: [],
  call: null,          // { number, name, startTime, state, incoming }
  battery: 87,
  charging: false,
  _listeners: [],
  _inited: false,
  _smsTimer: null,
  _callTimer: null,
  _batteryTimer: null,
  _lowBatteryWarned: false,
  _missedTimer: null,
  _vibrateLoop: null,
  lastPopup: null,

  init() {
    if (this._inited) return // guard anti-doppia-init (StrictMode)
    this._inited = true
    vfs.init()
    bootTime = Date.now()
    // profilo audio e volume dai settings
    const snd = vfs.read('/data/settings/sound.txt')
    const vol = vfs.read('/data/settings/volume.txt')
    sound.setProfile(snd !== null ? parseInt(snd, 10) : SETTINGS_DEFAULTS.sound)
    sound.setVolume(vol !== null ? parseInt(vol, 10) : SETTINGS_DEFAULTS.volume)
    // batteria random di partenza
    this.battery = 70 + Math.floor(Math.random() * 30)
    this._startDaemons()
  },

  _startDaemons() {
    clearInterval(this._smsTimer)
    clearInterval(this._callTimer)
    clearInterval(this._batteryTimer)
    clearTimeout(this._missedTimer)

    // --- Daemon batteria: drain + warning ---
    this._batteryTimer = setInterval(() => {
      if (this.charging) {
        this.battery = Math.min(100, this.battery + 2)
        if (this.battery >= 100) this.charging = false
      } else {
        this.battery = Math.max(3, this.battery - 1)
      }
      if (this.battery <= 15 && !this._lowBatteryWarned && !this.charging) {
        this._lowBatteryWarned = true
        this._addNotification({ title: 'Batteria', text: 'Batteria scarica: collega il caricabatterie', time: Date.now(), unread: true })
        sound.notify()
      }
      if (this.battery > 30) this._lowBatteryWarned = false
      this._notify()
    }, 60000)

    // --- Daemon SMS: i contatti ti scrivono ---
    this._smsTimer = setInterval(() => {
      if (Math.random() > 0.55) this._incomingSms()
    }, 45000)

    // --- Daemon chiamate in entrata ---
    this._callTimer = setInterval(() => {
      if (Math.random() > 0.8) this._incomingCall()
    }, 90000)
  },

  _incomingSms() {
    const contacts = loadContacts()
    const c = contacts[Math.floor(Math.random() * contacts.length)]
    if (!c) return
    const text = INCOMING_SMS_POOL[Math.floor(Math.random() * INCOMING_SMS_POOL.length)]
    const convs = loadConvs()
    let conv = convs.find(x => x.number === c.number)
    if (!conv) {
      conv = { id: Date.now(), contact: c.name, number: c.number, messages: [] }
      convs.push(conv)
    }
    conv.messages.push({ from: c.name, text, time: Date.now() })
    vfs.write('/data/messages/conversations.json', JSON.stringify(convs))
    this._addNotification({ title: c.name, text, time: Date.now(), unread: true })
    this._notify()
  },

  _incomingCall() {
    if (this.call) return // già al telefono
    const contacts = loadContacts()
    const c = contacts[Math.floor(Math.random() * contacts.length)]
    if (!c) return
    this.call = { number: c.number, name: c.name, startTime: Date.now(), state: 'incoming', incoming: true }
    const profile = sound.getProfile()
    if (profile === 2) sound.ringStart()
    if (profile === 1) {
      this._vibrateLoop = setInterval(() => sound.vibrate(400), 900)
    }
    // non risponde entro 20s → chiamata persa
    this._missedTimer = setTimeout(() => {
      if (this.call && this.call.state === 'incoming') {
        this._logCall('missed', 0, this.call)
        this._stopRinging()
        this._addNotification({ title: 'Chiamata persa', text: `${this.call.name || this.call.number}`, time: Date.now(), unread: true })
        this.call = null
        sound.notify()
        this._notify()
      }
    }, 20000)
    this._notify()
  },

  _stopRinging() {
    sound.ringStop()
    sound.ringbackStop()
    if (this._vibrateLoop) { clearInterval(this._vibrateLoop); this._vibrateLoop = null }
  },

  startCall(number, name) {
    if (!number) return
    this.call = { number, name: name || null, startTime: Date.now(), state: 'dialing', incoming: false }
    if (sound.getProfile() === 2) sound.ringbackStart()
    if (sound.getProfile() === 1) {
      this._vibrateLoop = setInterval(() => sound.vibrate(300), 1200)
    }
    // collegamento automatico dopo 3 secondi (siamo ottimisti)
    setTimeout(() => {
      if (this.call && this.call.state === 'dialing') {
        this.call.state = 'active'
        this.call.startTime = Date.now()
        this._stopRinging()
        this._notify()
      }
    }, 3000)
    this._notify()
  },

  acceptCall() {
    if (!this.call || this.call.state !== 'incoming') return
    clearTimeout(this._missedTimer)
    this.call.state = 'active'
    this.call.startTime = Date.now()
    this._stopRinging()
    this._notify()
  },

  endCall() {
    if (!this.call) return
    const call = this.call
    const duration = call.state === 'active' ? Date.now() - call.startTime : 0
    this._logCall(call.incoming ? 'in' : 'out', duration, call)
    this._stopRinging()
    clearTimeout(this._missedTimer)
    this.call = null
    this._notify()
  },

  _logCall(direction, duration, call) {
    const log = loadCallLog()
    log.unshift({ number: call.number, name: call.name, direction, duration, time: Date.now() })
    if (log.length > 50) log.pop()
    vfs.write('/data/calls/log.json', JSON.stringify(log))
  },

  getCallLog() { return loadCallLog() },

  launch(appId) {
    const app = registry.find(a => a.id === appId)
    if (!app) return null
    // sospendi il processo corrente (il foreground è unico)
    const current = this.getForeground()
    if (current) current.state = 'suspended'
    const pid = pidCounter++
    const proc = {
      pid,
      appId,
      name: app.name,
      icon: app.icon,
      state: 'running',
      startTime: Date.now(),
      component: app.component,
      sys: null,
      keyHandler: null,
      appState: {},
    }
    proc.sys = createSys(pid)
    this.processes.push(proc)
    this.navStack.push(pid)
    this._notify()
    return pid
  },

  kill(pid) {
    const idx = this.processes.findIndex(p => p.pid === pid)
    if (idx === -1) return
    this.processes.splice(idx, 1)
    this.navStack = this.navStack.filter(p => p !== pid)
    const top = this.navStack[this.navStack.length - 1]
    if (top) {
      const next = this.processes.find(p => p.pid === top)
      if (next) next.state = 'running'
    }
    this._notify()
  },

  killForeground() {
    const fg = this.getForeground()
    if (fg) this.kill(fg.pid)
  },

  home() {
    this.processes = []
    this.navStack = []
    this._notify()
  },

  getForeground() {
    const top = this.navStack[this.navStack.length - 1]
    if (!top) return null
    return this.processes.find(p => p.pid === top) || null
  },

  getApp(id) {
    return registry.find(a => a.id === id)
  },

  getImei() {
    if (!imei) imei = generateImei()
    return imei
  },

  sendKey(key) {
    const fg = this.getForeground()
    if (fg && fg.keyHandler) {
      fg.keyHandler(key)
    }
  },

  /** Uptime per processo (FIX bug #6): ora è davvero per processo */
  ps() {
    return this.processes.map(p => ({
      pid: p.pid,
      name: p.name,
      state: p.state,
      uptime: Date.now() - p.startTime,
    }))
  },

  getUptime() {
    return Date.now() - bootTime
  },

  setBattery(charging) {
    this.charging = charging
    this._notify()
  },

  markAllRead() {
    this.notifications.forEach(n => { n.unread = false })
    this._notify()
  },

  unreadCount() {
    return this.notifications.filter(n => n.unread).length
  },

  _addNotification(n) {
    this.notifications.push(n)
    if (this.notifications.length > 20) this.notifications.shift()
    this.lastPopup = { ...n, id: Math.random().toString(36).slice(2), at: Date.now() }
    this._notify()
  },

  clearNotifications() {
    this.notifications = []
    this._notify()
  },

  /** Reset di fabbrica totale (usato dal terminale e dalle impostazioni) */
  nuke() {
    this._stopRinging()
    clearTimeout(this._missedTimer)
    vfs.nuke()
    this.home()
    this._addNotification({ title: 'Reset', text: 'Reset di fabbrica completato. Per tua fortuna.', time: Date.now(), unread: true })
    this._notify()
  },

  subscribe(fn) {
    this._listeners.push(fn)
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn)
    }
  },

  _notify() {
    this._listeners.forEach(fn => fn())
  },
}

export default kernel
