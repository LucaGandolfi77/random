// Helper riusabile per input multi-tap (2→a, 22→b, 222→c)
// Usato da Messaggi (tastierino) e Contatti (campo nome)

export function createMultiTap(getLetters, timeout = 900) {
  let key = null
  let count = 0
  let timer = null

  function reset() {
    clearTimeout(timer)
    key = null
    count = 0
  }

  return {
    /** Pressione di un tasto: ritorna il nuovo testo o null se il tasto non ha lettere */
    press(k, current) {
      const letters = getLetters()
      if (!letters || !letters[k]) return null
      let next
      if (key === k) {
        count++
        clearTimeout(timer)
        const ch = letters[k][count % letters[k].length]
        next = current.slice(0, -1) + ch
      } else {
        reset()
        key = k
        count = 0
        next = current + letters[k][0]
      }
      timer = setTimeout(reset, timeout)
      return next
    },
    pending() { return key !== null },
    reset,
  }
}
