// NIGHTSHIFT // After Hours — game loop and entry point.
// Interactive play by default; with ?shot=start|play|end the page stages
// one deterministic screenshot frame instead and needs no input.
import { FIELD, STEP } from './config.js';
import { World, EVENT_INTEL, EVENT_ALARM, EVENT_WON, EVENT_CAUGHT, EVENT_PEBBLE, STATUS_TITLE, STATUS_PLAYING, STATUS_WON, STATUS_CAUGHT } from './world.js';
import { createInput } from './input.js';
import { drawWorld, computeView, toWorldPoint, SCREEN_TITLE, SCREEN_PLAY, SCREEN_WON, SCREEN_CAUGHT } from './render.js';
import { stageShot } from './shots.js';
import { sounds } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const world = new World(seed);
const input = createInput(canvas);

let view = computeView(canvas.clientWidth || FIELD.width, canvas.clientHeight || FIELD.height);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || FIELD.width;
  const h = canvas.clientHeight || FIELD.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  view = computeView(canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

function screenFor(status) {
  if (status === STATUS_TITLE) return SCREEN_TITLE;
  if (status === STATUS_WON) return SCREEN_WON;
  if (status === STATUS_CAUGHT) return SCREEN_CAUGHT;
  return SCREEN_PLAY;
}

function playSounds(events) {
  if (events & EVENT_INTEL) sounds.intel();
  if (events & EVENT_ALARM) sounds.alarm();
  if (events & EVENT_WON) sounds.win();
  if (events & EVENT_CAUGHT) sounds.caught();
  if (events & EVENT_PEBBLE) sounds.pebble();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#070912';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  drawWorld(ctx, world, screenFor(world.state.status));
}

// --- deterministic screenshot mode ------------------------------------------
if (shotName) {
  const staged = stageShot(shotName, world);
  // Draw the staged screen (not the live status) so the title shot shows
  // the title card even though the world underneath kept patrolling.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#070912';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  drawWorld(ctx, world, staged.screen);
  document.title = `NIGHTSHIFT — shot ${shotName}`;
} else {
  // --- interactive mode ------------------------------------------------------
  let last = performance.now();
  let accumulator = 0;
  let stepTick = 0;

  function frame(now) {
    const elapsed = Math.min((now - last) / 1000, 0.25);
    last = now;
    accumulator += elapsed;

    if (world.state.status === STATUS_TITLE && input.anyKey()) {
      world.start();
      input.clear();
    }
    if (input.restartPressed() && (world.state.status === STATUS_WON || world.state.status === STATUS_CAUGHT)) {
      world.reset();
      input.clear();
    }

    const move = input.move();
    const click = input.takeClick((cx, cy) => toWorldPoint(view, cx, cy));
    let firstStep = true;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const events = world.step(STEP, {
        mx: move.mx,
        my: move.my,
        sneak: input.sneak(),
        hack: input.hack(),
        // A click is one pebble: only the first fixed step of the frame sees it.
        pebble: firstStep ? click : null,
      });
      firstStep = false;
      playSounds(events);
      stepTick += 1;
      if (stepTick % 18 === 0 && world.state.player.moving) {
        sounds.step(stepTick % 36 === 0);
      }
      if (world.state.status !== STATUS_PLAYING) accumulator = 0;
    }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
