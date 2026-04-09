// Web Audio API sound synthesis — no external audio files needed

let _ctx = null

function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function tone(freq, type, t0, dur, vol = 0.25) {
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type
    o.frequency.setValueAtTime(freq, c.currentTime + t0)
    g.gain.setValueAtTime(vol, c.currentTime + t0)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur)
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.01)
  } catch {}
}

function sweep(f0, f1, type, t0, dur, vol = 0.25) {
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = type
    o.frequency.setValueAtTime(f0, c.currentTime + t0)
    o.frequency.exponentialRampToValueAtTime(f1, c.currentTime + t0 + dur)
    g.gain.setValueAtTime(vol, c.currentTime + t0)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur)
    o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.01)
  } catch {}
}

// Soft tap — place digit (no conflict)
export function tick()   { tone(880, 'sine', 0, 0.07, 0.12) }

// Low thud — conflict / wrong digit
export function thud()   { tone(110, 'triangle', 0, 0.22, 0.18) }

// Faint swoosh — erase
export function swoosh() { sweep(650, 200, 'sine', 0, 0.16, 0.18) }

// Ascending 3-note chime — complete a row, column, or box
export function chime() {
  tone(523, 'sine', 0,    0.20, 0.22)  // C5
  tone(659, 'sine', 0.13, 0.20, 0.22)  // E5
  tone(784, 'sine', 0.26, 0.24, 0.25)  // G5
}

// Sparkle shimmer — hint used
export function sparkle() {
  tone(880, 'sine', 0,    0.14, 0.20)  // A5
  tone(698, 'sine', 0.10, 0.14, 0.20)  // F5
  tone(587, 'sine', 0.20, 0.16, 0.20)  // D5
}

// Distant fanfare — opponent finishes
export function fanfare() {
  tone(523,  'sine', 0,    0.22, 0.12)
  tone(659,  'sine', 0.16, 0.22, 0.12)
  tone(784,  'sine', 0.32, 0.22, 0.12)
  tone(1047, 'sine', 0.48, 0.35, 0.12)
}

// Warm 4-note jingle — you finish (any rank)
export function complete() {
  tone(523,  'sine', 0,    0.24, 0.28)
  tone(659,  'sine', 0.20, 0.24, 0.28)
  tone(784,  'sine', 0.40, 0.24, 0.28)
  tone(1047, 'sine', 0.60, 0.40, 0.30)
}

// Fuller celebratory jingle — 1st place win (~2 s)
export function win() {
  tone(523,  'sine', 0,    0.25, 0.30)
  tone(659,  'sine', 0.20, 0.25, 0.30)
  tone(784,  'sine', 0.40, 0.25, 0.30)
  tone(659,  'sine', 0.60, 0.20, 0.25)
  tone(784,  'sine', 0.80, 0.25, 0.30)
  tone(1047, 'sine', 1.00, 0.60, 0.35)
  tone(1047, 'sine', 1.30, 0.50, 0.15)
}

// Friendly bloop — chat / emoji reaction (pitch varies by index)
const BLOOP_FREQS = [440, 494, 523, 587, 659, 698, 784]
export function bloop(idx = 0) {
  tone(BLOOP_FREQS[Math.abs(idx) % BLOOP_FREQS.length], 'sine', 0, 0.15, 0.20)
}

// Gentle welcome-back tone — rejoin game
export function welcome() {
  tone(392, 'sine', 0,    0.22, 0.18)  // G4
  tone(523, 'sine', 0.20, 0.22, 0.18)  // C5
  tone(659, 'sine', 0.40, 0.30, 0.20)  // E5
}
