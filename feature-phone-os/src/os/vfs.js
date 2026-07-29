const STORAGE_KEY = 'openphone_vfs'

function createNode(type, data = '') {
  return { type, data: type === 'file' ? data : '', children: type === 'dir' ? {} : undefined }
}

function nodeAtPath(root, path) {
  const parts = path.split('/').filter(Boolean)
  let node = root
  for (const part of parts) {
    if (!node.children || !node.children[part]) return null
    node = node.children[part]
  }
  return node
}

function ensureParent(root, path) {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  let node = root
  for (const part of parts) {
    if (!node.children[part]) node.children[part] = createNode('dir')
    node = node.children[part]
    if (node.type !== 'dir') return null
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
    } catch (e) {}
    this._root = createNode('dir')
    this._root.children.data = createNode('dir')
    this._root.children.data.children.contacts = createNode('dir')
    this._root.children.data.children.messages = createNode('dir')
    this.persist()
  },

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._root))
    } catch (e) {}
  },

  read(path) {
    const node = nodeAtPath(this._root, path)
    return node && node.type === 'file' ? node.data : null
  },

  write(path, data) {
    const result = ensureParent(this._root, path)
    if (!result) return false
    const { parent, name } = result
    parent.children[name] = createNode('file', data)
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
}

export default vfs
