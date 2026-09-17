const STORAGE_KEY = 'openphone_v2'

function createNode(type, data = '') {
  return { type, data: type === 'file' ? data : '', children: type === 'dir' ? {} : undefined }
}

/** Normalizza un path: risolve '.' e '..', garantisce leading '/' */
function normalizePath(path) {
  if (typeof path !== 'string') return '/'
  const parts = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return '/' + parts.join('/')
}

function nodeAtPath(root, path) {
  const parts = normalizePath(path).split('/').filter(Boolean)
  let node = root
  for (const part of parts) {
    if (!node.children || !node.children[part]) return null
    node = node.children[part]
  }
  return node
}

function ensureParent(root, path) {
  const parts = normalizePath(path).split('/').filter(Boolean)
  const name = parts.pop()
  let node = root
  for (const part of parts) {
    if (!node.children[part]) node.children[part] = createNode('dir')
    node = node.children[part]
    if (node.type !== 'dir') return null // FIX bug #4: un file in mezzo al path blocca
  }
  return { parent: node, name }
}

const vfs = {
  _root: null,

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this._root = JSON.parse(saved)
        return
      }
    } catch (e) { /* archivio corrotto: ripartiamo puliti */ }
    this._root = createNode('dir')
    this._root.children.data = createNode('dir')
    this._root.children.data.children.contacts = createNode('dir')
    this._root.children.data.children.messages = createNode('dir')
    this._root.children.data.children.calls = createNode('dir')
    this._root.children.data.children.notes = createNode('dir')
    this._root.children.data.children.snake = createNode('dir')
    this._root.children.data.children.settings = createNode('dir')
    this.persist()
  },

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._root))
    } catch (e) { /* quota esaurita: pazienza */ }
  },

  read(path) {
    const node = nodeAtPath(this._root, path)
    return node && node.type === 'file' ? node.data : null
  },

  write(path, data) {
    const node = nodeAtPath(this._root, path)
    // FIX bug #4: scrivere su una directory NON deve distruggerla
    if (node && node.type === 'dir') return false
    const result = ensureParent(this._root, path)
    if (!result) return false
    const { parent, name } = result
    parent.children[name] = createNode('file', String(data))
    this.persist()
    return true
  },

  append(path, data) {
    const existing = this.read(path) || ''
    return this.write(path, existing + data)
  },

  ls(path) {
    const node = nodeAtPath(this._root, path)
    if (!node || node.type !== 'dir') return []
    return Object.entries(node.children).map(([name, child]) => ({
      name,
      type: child.type,
      size: child.type === 'file' ? child.data.length : 0,
    }))
  },

  mkdir(path) {
    const result = ensureParent(this._root, path)
    if (!result) return false
    const { parent, name } = result
    if (parent.children[name]) return false
    parent.children[name] = createNode('dir')
    this.persist()
    return true
  },

  rm(path) {
    const result = ensureParent(this._root, path)
    if (!result) return false
    const { parent, name } = result
    if (!parent.children[name]) return false
    delete parent.children[name]
    this.persist()
    return true
  },

  exists(path) {
    return nodeAtPath(this._root, path) !== null
  },

  /** Stat di un nodo: tipo, dimensione, figli */
  stat(path) {
    const node = nodeAtPath(this._root, path)
    if (!node) return null
    return {
      type: node.type,
      size: node.type === 'file' ? node.data.length : 0,
      children: node.type === 'dir' ? Object.keys(node.children).length : 0,
    }
  },

  /** Uso totale del disco in bytes (folle ma utile per df) */
  du() {
    let total = 0
    function walk(node) {
      if (!node) return
      if (node.type === 'file') { total += node.data.length; return }
      Object.values(node.children || {}).forEach(walk)
    }
    walk(this._root)
    return total
  },

  /** Reset di fabbrica: polverizza l'archivio e ricrea le cartelle base */
  nuke() {
    try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
    this._root = null
    this.init()
  },
}

export default vfs
