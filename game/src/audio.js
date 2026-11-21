// Tiny WebAudio bleeps for NIGHTSHIFT: no audio files, every sound is
// an oscillator. All calls are guarded so a browser without audio (or a
// headless screenshot run) simply stays silent.
let ctx = null;

function audioContext() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  } catch {
    return null;
  }
  return ctx;
}

function blip(freq, duration, type, gainValue, slideTo) {
  const ac = audioContext();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Silent when audio is unavailable.
  }
}

export const sounds = {
  // Soft tick while sneaking or walking: two alternating pitches.
  step(alternate) {
    blip(alternate ? 190 : 150, 0.05, 'triangle', 0.03);
  },
  // A pebble skitters away.
  pebble() {
    blip(900, 0.12, 'sine', 0.06, 320);
  },
  // Terminal hack completes: a rising chirp.
  intel() {
    blip(520, 0.16, 'square', 0.05, 980);
  },
  // The alarm: a short dissonant sting.
  alarm() {
    blip(220, 0.5, 'sawtooth', 0.07, 440);
    blip(233, 0.5, 'sawtooth', 0.05, 466);
  },
  // Reaching the exit unseen.
  win() {
    blip(392, 0.18, 'triangle', 0.07);
    setTimeout(() => blip(523, 0.18, 'triangle', 0.07), 160);
    setTimeout(() => blip(659, 0.34, 'triangle', 0.07), 320);
  },
  // Caught: a low thud.
  caught() {
    blip(140, 0.4, 'sawtooth', 0.08, 60);
  },
};
