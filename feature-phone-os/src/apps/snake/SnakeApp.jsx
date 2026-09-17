import { useState, useEffect, useRef, useCallback } from 'react'

const W = 15, H = 20, CELL = 12
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

function initGame() {
  const snake = [{ x: 7, y: 10 }]
  return { snake, dir: [1, 0], food: spawnFood(snake), score: 0, alive: true, bonus: null, bonusTimer: 0 }
}

function spawnFood(snake) {
  for (let i = 0; i < 200; i++) {
    const x = Math.floor(Math.random() * W)
    const y = Math.floor(Math.random() * H)
    if (!snake.some(s => s.x === x && s.y === y)) return { x, y }
  }
  return { x: 0, y: 0 }
}

export default function SnakeApp({ sys, kernel }) {
  const [game, setGame] = useState(initGame)
  const [started, setStarted] = useState(false)
  const [highScore, setHighScore] = useState(0)
  const [paused, setPaused] = useState(false)
  const dirRef = useRef([1, 0])
  const intervalRef = useRef(null)
  const canvasRef = useRef(null)

  // carica il record
  useEffect(() => {
    const h = sys.fs.read('/data/snake/highscore.txt')
    if (h) { const n = parseInt(h, 10); if (!isNaN(n)) setHighScore(n) }
  }, [sys.fs])

  // tick: velocità progressiva (più punti = più veloce)
  const speed = Math.max(80, 180 - Math.floor(game.score / 5) * 10)

  const tick = useCallback(() => {
    // FIX bug #9: in background il processo è sospeso, il tick skip
    if (!sys.getState('foreground')) return
    setGame(prev => {
      if (!prev.alive || paused) return prev
      const head = { x: prev.snake[prev.snake.length - 1].x + dirRef.current[0], y: prev.snake[prev.snake.length - 1].y + dirRef.current[1] }
      if (head.x < 0 || head.x >= W || head.y < 0 || head.y >= H || prev.snake.some(s => s.x === head.x && s.y === head.y)) {
        const finalScore = prev.score
        if (finalScore > highScore) {
          setHighScore(finalScore)
          sys.fs.write('/data/snake/highscore.txt', String(finalScore))
          sys.notify('Snake', `Nuovo record: ${finalScore} punti!`)
        }
        return { ...prev, alive: false }
      }
      const newSnake = [...prev.snake, head]
      let newScore = prev.score
      let newFood = prev.food
      let newBonus = prev.bonus
      let newBonusTimer = prev.bonusTimer
      if (newBonus && head.x === newBonus.x && head.y === newBonus.y) {
        newScore += 5
        newBonus = null
      } else if (newBonus && newBonusTimer > 0) {
        newBonusTimer--
        if (newBonusTimer === 0) newBonus = null
      }
      if (head.x === prev.food.x && head.y === prev.food.y) {
        newScore++
        newFood = spawnFood(newSnake)
        // cibo bonus ogni 4 punti: lampeggia e vale 5
        if (newScore % 4 === 0 && !newBonus) {
          newBonus = spawnFood(newSnake)
          newBonusTimer = 50
        }
      } else {
        newSnake.shift()
      }
      return { ...prev, snake: newSnake, food: newFood, score: newScore, bonus: newBonus, bonusTimer: newBonusTimer }
    })
  }, [highScore, sys.fs, paused])

  useEffect(() => {
    if (!started) return
    intervalRef.current = setInterval(tick, speed)
    return () => clearInterval(intervalRef.current)
  }, [started, tick, speed])

  useEffect(() => {
    sys.onKey((key) => {
      if (key === 'up' || key === 'down' || key === 'left' || key === 'right') {
        if (!started) setStarted(true)
        if (game.alive && paused) setPaused(false)
        const d = DIRS[key]
        if (dirRef.current[0] + d[0] !== 0 || dirRef.current[1] + d[1] !== 0) {
          dirRef.current = d
        }
        return true
      }
      if (key === 'softLeft') {
        setGame(initGame())
        dirRef.current = [1, 0]
        setStarted(false)
        setPaused(false)
        return true
      }
      if (key === 'ok' && started) {
        if (!game.alive) {
          // su game over, OK = nuova partita
          setGame(initGame())
          dirRef.current = [1, 0]
          setStarted(false)
          setPaused(false)
        } else {
          setPaused(p => !p)
        }
        return true
      }
      if (key === 'softRight') { sys.exit(); return true }
      return false
    })
    return () => sys.onKey(null)
  }, [sys, started, game.alive, game.score])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1a3a1a'
    ctx.fillRect(0, 0, W * CELL, H * CELL)
    ctx.fillStyle = '#2a5a2a'
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    }
    // cibo bonus: quadrato dorato lampeggiante
    if (game.bonus && (game.bonusTimer > 25 || Math.floor(Date.now() / 200) % 2 === 0)) {
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(game.bonus.x * CELL + 1, game.bonus.y * CELL + 1, CELL - 2, CELL - 2)
    }
    game.snake.forEach((s, i) => {
      ctx.fillStyle = i === game.snake.length - 1 ? '#5fff5f' : '#3fbf3f'
      ctx.fillRect(s.x * CELL, s.y * CELL, CELL - 1, CELL - 1)
    })
    ctx.fillStyle = '#ff3f3f'
    ctx.beginPath()
    ctx.arc(game.food.x * CELL + CELL / 2, game.food.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2)
    ctx.fill()
  }, [game])

  return (
    <div className="app-snake">
      {game.score === 0 && !started && game.alive && (
        <div className="snake-overlay">
          <div style={{ fontSize: 14, marginBottom: 8 }}>Snake 2.0</div>
          <div style={{ fontSize: 10 }}>Frecce: muovi · OK: pausa</div>
          <div style={{ fontSize: 10 }}>Il quadrato oro vale 5!</div>
        </div>
      )}
      {paused && game.alive && started && (
        <div className="snake-overlay">
          <div style={{ fontSize: 14 }}>Pausa</div>
          <div style={{ fontSize: 10 }}>Premi OK o una freccia</div>
        </div>
      )}
      {!game.alive && (
        <div className="snake-overlay">
          <div>Game Over</div>
          <div>Punteggio: {game.score}</div>
          <div>Record: {highScore}</div>
          <div style={{ fontSize: 10, marginTop: 8 }}>OK o Sel: nuova partita</div>
        </div>
      )}
      <canvas ref={canvasRef} width={W * CELL} height={H * CELL} className="snake-canvas" />
      <div className="snake-score">{game.score}</div>
    </div>
  )
}
