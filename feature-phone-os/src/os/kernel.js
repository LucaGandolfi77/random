import vfs from './vfs.js'
import registry from './registry.js'

let pidCounter = 1
let bootTime = Date.now()

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
    },
    notify(title, text) {
      kernel._addNotification({ title, text, time: Date.now() })
    },
    onKey(fn) {
      const proc = kernel.processes.find(p => p.pid === pid)
      if (proc) proc.keyHandler = fn
    },
    exit() {
      kernel.kill(pid)
    },
    getState(key) {
      switch (key) {
        case 'uptime': return Date.now() - bootTime
        case 'bootTime': return bootTime
        default: return null
      }
    },
  }
}

const kernel = {
  processes: [],
  fgPid: null,
  notifications: [],
  _listeners: [],

  init() {
    vfs.init()
    bootTime = Date.now()
  },

  launch(appId) {
    const app = registry.find(a => a.id === appId)
    if (!app) return null
    const pid = pidCounter++
    const proc = {
      pid,
      appId,
      name: app.name,
      icon: app.icon,
      state: 'running',
      component: app.component,
      sys: null,
      keyHandler: null,
      appState: {},
    }
    proc.sys = createSys(pid)
    this.processes.push(proc)
    this.fgPid = pid
    this._notify()
    return pid
  },

  kill(pid) {
    const idx = this.processes.findIndex(p => p.pid === pid)
    if (idx === -1) return
    this.processes.splice(idx, 1)
    if (this.fgPid === pid) {
      this.fgPid = this.processes.length > 0 ? this.processes[this.processes.length - 1].pid : null
    }
    this._notify()
  },

  home() {
    this.processes = []
    this.fgPid = null
    this._notify()
  },

  getForeground() {
    return this.processes.find(p => p.pid === this.fgPid) || null
  },

  getApp(id) {
    return registry.find(a => a.id === id)
  },

  sendKey(key) {
    const fg = this.getForeground()
    if (fg && fg.keyHandler) {
      fg.keyHandler(key)
    }
  },

  ps() {
    return this.processes.map(p => ({
      pid: p.pid,
      name: p.name,
      state: p.state,
      uptime: Date.now() - bootTime,
    }))
  },

  getUptime() {
    return Date.now() - bootTime
  },

  _addNotification(n) {
    this.notifications.push(n)
    if (this.notifications.length > 10) this.notifications.shift()
    this._notify()
  },

  clearNotifications() {
    this.notifications = []
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
