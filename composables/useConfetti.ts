export function useConfetti() {
  async function fireConfetti(options?: { top3?: boolean }) {
    if (import.meta.server) return
    const confetti = (await import('canvas-confetti')).default

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
    const confetti = (await import('canvas-confetti')).default
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
