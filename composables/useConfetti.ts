// Reusable low-z-index canvas so confetti doesn't cover card buttons
let _confettiCanvas: HTMLCanvasElement | null = null
let _confettiInstance: ((opts?: object) => void) | null = null

function getConfettiInstance() {
  if (!_confettiCanvas) {
    _confettiCanvas = document.createElement('canvas')
    Object.assign(_confettiCanvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '50',   // Below UI cards (z-index ~100+) but above page background
    })
    document.body.appendChild(_confettiCanvas)
  }
  return _confettiCanvas
}

export function useConfetti() {
  async function fireConfetti(options?: { top3?: boolean }) {
    if (import.meta.server) return
    const confettiLib = await import('canvas-confetti')
    if (!_confettiInstance) {
      _confettiInstance = confettiLib.create(getConfettiInstance(), { resize: true }) as any
    }
    const confetti = _confettiInstance as any

    if (options?.top3) {
      // Big celebration for top 3 reveal
      const count = 300
      const defaults = { origin: { y: 0.7 } }
      const fire = (particleRatio: number, opts: object) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
          colors: ['#b8a9c9', '#f7a49a', '#a8e6cf', '#87ceeb', '#ffd975'],
        })
      }
      fire(0.25, { spread: 26, startVelocity: 55 })
      fire(0.2, { spread: 60 })
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
      fire(0.1, { spread: 120, startVelocity: 45 })
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#b8a9c9', '#f7a49a', '#a8e6cf', '#87ceeb', '#ffd975'],
      })
    }
  }

  async function fireSideConfetti() {
    if (import.meta.server) return
    const confettiLib = await import('canvas-confetti')
    if (!_confettiInstance) {
      _confettiInstance = confettiLib.create(getConfettiInstance(), { resize: true }) as any
    }
    const confetti = _confettiInstance as any
    const end = Date.now() + 2000
    const colors = ['#b8a9c9', '#f7a49a', '#a8e6cf']

    const frame = () => {
      confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }

  return { fireConfetti, fireSideConfetti }
}
