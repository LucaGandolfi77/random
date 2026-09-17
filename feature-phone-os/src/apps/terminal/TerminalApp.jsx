import { useState, useEffect, useRef } from 'react'
import { OS_VERSION, OS_NAME } from '../../os/defaults.js'

const HELP = [
  'Comandi disponibili:',
  '  ls [path]      lista file',
  '  cat <file>     leggi file',
  '  write <f> <t>  scrivi file',
  '  rm <path>      elimina',
  '  mkdir <path>   crea cartella',
  '  ps             processi attivi',
  '  kill <pid>     uccidi processo',
  '  open <app>     apri app',
  '  notify <testo> notifica',
  '  echo <testo>   stampa',
  '  df             spazio disco',
  '  uptime / date / uname / whoami',
  '  history / clear / help',
  '',
  'PS: sudo rm -rf / è una pessima idea.',
]

export default function TerminalApp({ sys, kernel }) {
  const [lines, setLines] = useState([
    `${OS_NAME} v${OS_VERSION} js-kernel`,
    'Digita "help" per i comandi.',
    '',
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const outRef = useRef(null)
  const bootingRef = useRef(false)

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight
  }, [lines])

  function push(...ls) {
    setLines(l => [...l, ...ls])
  }

  function run(cmdline) {
    const trimmed = cmdline.trim()
    push(`openphone:/$ ${trimmed}`)
    if (!trimmed) return
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)

    switch (cmd) {
      case 'help':
        push(...HELP)
        break

      case 'ls': {
        const path = args[0] || '/'
        const items = sys.fs.ls(path)
        if (!items.length && !sys.fs.exists(path)) push(`ls: ${path}: nessun file o directory`)
        else if (items.length === 0) push('(vuoto)')
        else push(...items.map(f => `${f.type === 'dir' ? 'd' : '-'}  ${String(f.size).padStart(6)}  ${f.name}${f.type === 'dir' ? '/' : ''}`))
        break
      }

      case 'cat': {
        if (!args[0]) { push('uso: cat <file>'); break }
        const content = sys.fs.read(args[0])
        if (content === null) push(`cat: ${args[0]}: file non trovato (o è una directory)`)
        else push(...content.split('\n').slice(0, 20))
        break
      }

      case 'write': {
        if (args.length < 2) { push('uso: write <file> <testo...>'); break }
        const ok = sys.fs.write(args[0], args.slice(1).join(' '))
        push(ok ? `scritto ${args[0]} (${args.slice(1).join(' ').length} bytes)` : `write: ${args[0]}: impossibile scrivere (è una directory?)`)
        break
      }

      case 'rm': {
        if (!args[0]) { push('uso: rm <path>'); break }
        const ok = sys.fs.rm(args[0])
        push(ok ? `rimosso ${args[0]}` : `rm: ${args[0]}: non trovato`)
        break
      }

      case 'mkdir': {
        if (!args[0]) { push('uso: mkdir <path>'); break }
        const ok = sys.fs.mkdir(args[0])
        push(ok ? `creata ${args[0]}` : `mkdir: ${args[0]}: esiste già (o path invalido)`)
        break
      }

      case 'ps': {
        const procs = kernel.ps()
        push('  PID  NOME          STATO     UPTIME')
        push(...procs.map(p =>
          `  ${String(p.pid).padEnd(4)} ${p.name.padEnd(13)} ${p.state.padEnd(9)} ${(p.uptime / 1000).toFixed(1)}s`
        ))
        break
      }

      case 'kill': {
        const pid = parseInt(args[0], 10)
        if (isNaN(pid)) { push('uso: kill <pid>'); break }
        const proc = kernel.processes.find(p => p.pid === pid)
        if (!proc) { push(`kill: ${pid}: processo non trovato`); break }
        if (proc.pid === sys.getState('pid') || kernel.fgPid === proc.pid) {
          push(`kill: non posso uccidere il foreground... OSO comunque.`)
        }
        kernel.kill(pid)
        push(`killato PID ${pid} (${proc.name})`)
        break
      }

      case 'open': {
        if (!args[0]) { push('uso: open <app> (es: snake, notes, terminal)'); break }
        const app = kernel.getApp(args[0])
        if (!app) { push(`open: ${args[0]}: app sconosciuta`); break }
        push(`apro ${app.name}...`)
        setTimeout(() => kernel.launch(args[0]), 300)
        break
      }

      case 'notify': {
        if (!args.length) { push('uso: notify <testo...>'); break }
        sys.notify('Terminale', args.join(' '))
        push('notifica inviata')
        break
      }

      case 'echo':
        push(args.join(' ') || '')
        break

      case 'df':
        push(`VFS: ${sys.fs.du()} bytes usati / quota locale`)
        break

      case 'uptime':
        push(`up ${(kernel.getUptime() / 1000).toFixed(0)} secondi, 1 utente, load: folle`)
        break

      case 'date':
        push(new Date().toString())
        break

      case 'uname':
        push(`${OS_NAME} ${OS_VERSION} js-kernel Crazy Frog Edition`)
        break

      case 'whoami':
        push('user (con privilegi di folle)')
        break

      case 'clear':
        setLines([])
        break

      case 'history':
        push(...history.map((h, i) => `  ${i + 1}  ${h}`))
        break

      case 'sudo':
        if (args.join(' ').includes('rm -rf /')) {
          // EASTER EGG FOLLE: distruzione drammatica + factory reset
          bootingRef.current = true
          push('[sudo] password for user: ********')
          push('rm: entrando in modalità FOLLE...')
          setTimeout(() => push('rm: rimozione di /bin... ok'), 400)
          setTimeout(() => push('rm: rimozione di /etc... ok'), 800)
          setTimeout(() => push('rm: rimozione di /data... ok'), 1200)
          setTimeout(() => push('rm: rimozione di /kernel...'), 1600)
          setTimeout(() => push('rm: RIFIUTATO. IL KERNEL NON SI TOCCA.'), 2000)
          setTimeout(() => push('☠️  Sistema distrutto (per gioco).'), 2400)
          setTimeout(() => push('Resurrezione in corso...'), 2800)
          setTimeout(() => { kernel.nuke() }, 3400)
          break
        }
        push('sudo: solo rm -rf / è supportato. E NO.')
        break

      case 'snake':
      case 'matrix':
        push('apertura app...')
        setTimeout(() => kernel.launch('snake'), 300)
        break

      default:
        push(`${cmd}: comando non trovato. Prova "help".`)
    }
  }

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'softRight') { sys.exit(); return true }
      if (bootingRef.current) return true

      if (key === 'back') {
        if (input.length > 0) { setInput(i => i.slice(0, -1)); return true }
        return false // input vuoto → chiudi l'app (fallback)
      }
      if (key === 'space') { setInput(i => i + ' '); return true }
      if (key === 'up') {
        if (history.length === 0) return true
        const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
        setHistIdx(idx)
        setInput(history[idx])
        return true
      }
      if (key === 'down') {
        if (histIdx === -1) return true
        const idx = histIdx + 1
        if (idx >= history.length) { setHistIdx(-1); setInput(''); return true }
        setHistIdx(idx)
        setInput(history[idx])
        return true
      }
      // lettere e simboli dalla tastiera fisica
      if (/^[a-zA-Z0-9.,!?;:@'()/_+#*=-]$/.test(key)) { setInput(i => (i + key).slice(0, 80)); return true }
      if (key === 'ok') {
        const cmd = input
        if (cmd.trim()) {
          setHistory(h => [...h, cmd.trim()].slice(-30))
          setHistIdx(-1)
        }
        setInput('')
        run(cmd)
        return true
      }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, input, history, histIdx, kernel])

  return (
    <div className="app-terminal">
      <div className="terminal-out" ref={outRef}>
        {lines.map((l, i) => (
          <div key={i} className={`terminal-line ${l.startsWith('openphone:') ? 'terminal-prompt' : ''}`}>
            {l || '\u00A0'}
          </div>
        ))}
      </div>
      <div className="terminal-input-row">
        <span className="terminal-prompt-inline">openphone:/$</span>
        <span className="terminal-input">{input}</span>
        <span className="terminal-cursor">▊</span>
      </div>
      <div className="contacts-add-hint">↑/↓: history · Invio: esegui · back: cancella</div>
    </div>
  )
}
