// NIGHTSHIFT // After Hours — everything drawn on the canvas: the museum
// floor, walls and cover, guard vision cones, the player, the HUD, and
// the title / win / caught screens.
import { FIELD, GUARD, COLOURS, EXIT } from './config.js';
import { WALLS, CRATES, SHADOWS, TERMINALS, EXIT_DOOR } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_CAUGHT = 'caught';

// Fit the 960x640 field into the canvas, letterboxed and centred.
export function computeView(canvasWidth, canvasHeight) {
  const scale = Math.min(canvasWidth / FIELD.width, canvasHeight / FIELD.height);
  return {
    scale,
    ox: (canvasWidth - FIELD.width * scale) / 2,
    oy: (canvasHeight - FIELD.height * scale) / 2,
  };
}

export function toWorldPoint(view, cssX, cssY) {
  return { x: (cssX - view.ox) / view.scale, y: (cssY - view.oy) / view.scale };
}

// How far a ray from (x, y) travels before it hits a wall or crate.
function rayLength(x, y, angle, maxLen, solids) {
  const step = 6;
  for (let d = step; d <= maxLen; d += step) {
    const px = x + Math.cos(angle) * d;
    const py = y + Math.sin(angle) * d;
    for (const r of solids) {
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return d;
    }
  }
  return maxLen;
}

function drawCone(ctx, guard, solids) {
  const alerted = guard.mode === 'chase' || guard.detection > 0.6;
  ctx.fillStyle = alerted ? COLOURS.coneAlert : COLOURS.cone;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const a = guard.angle - GUARD.visionHalfAngle + (2 * GUARD.visionHalfAngle * i) / steps;
    const len = rayLength(guard.x, guard.y, a, GUARD.visionRange, solids);
    ctx.lineTo(guard.x + Math.cos(a) * len, guard.y + Math.sin(a) * len);
  }
  ctx.closePath();
  ctx.fill();
}

function drawRect(ctx, r, fill, top) {
  ctx.fillStyle = fill;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (top) {
    ctx.fillStyle = top;
    ctx.fillRect(r.x, r.y, r.w, 4);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawHud(ctx, world) {
  const s = world.state;
  const p = s.player;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, 34);
  ctx.fillStyle = COLOURS.hud;
  ctx.font = 'bold 15px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(`INTEL ${s.intel}/3`, 14, 18);
  ctx.fillText(`PEBBLES ${'●'.repeat(p.pebbles)}${'○'.repeat(3 - p.pebbles)}`, 130, 18);
  ctx.fillText(formatTime(s.time), 300, 18);
  // The detection eye: the highest meter of any guard.
  const maxDet = Math.max(0, ...s.guards.map((g) => g.detection));
  const eyeX = 430;
  ctx.fillStyle = maxDet > 0.6 ? '#ff5d5d' : maxDet > 0.05 ? '#ffd166' : COLOURS.dim;
  ctx.beginPath();
  ctx.ellipse(eyeX, 18, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d1020';
  ctx.beginPath();
  ctx.arc(eyeX, 18, 3.5 + maxDet * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.hud;
  ctx.fillText(maxDet > 0.6 ? 'SPOTTED' : maxDet > 0.05 ? 'SUSPICIOUS' : 'UNSEEN', 455, 18);
  if (s.alarm) {
    ctx.fillStyle = '#ff2e2e';
    ctx.fillText('⚠ ALARM', 600, 18);
  }
  if (p.hidden) {
    ctx.fillStyle = COLOURS.playerSneak;
    ctx.fillText('HIDDEN IN SHADOW', 700, 18);
  }
  ctx.restore();
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 14, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px monospace';
  ctx.fillText(title, FIELD.width / 2, 190);
  ctx.fillStyle = COLOURS.hud;
  ctx.font = '16px monospace';
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, 250 + i * 28);
  });
  ctx.restore();
}

export function drawWorld(ctx, world, screen) {
  const s = world.state;
  const p = s.player;

  // --- floor: two-tone checker so movement reads at a glance ---
  ctx.fillStyle = COLOURS.floor;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = COLOURS.floorAlt;
  const tile = 40;
  for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
    for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
      if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }

  // --- shadow patches: the safe dark ---
  for (const sh of SHADOWS) {
    ctx.fillStyle = COLOURS.shadow;
    ctx.fillRect(sh.x, sh.y, sh.w, sh.h);
    ctx.strokeStyle = 'rgba(120, 140, 255, 0.25)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(sh.x + 1, sh.y + 1, sh.w - 2, sh.h - 2);
    ctx.setLineDash([]);
  }

  // --- exit door: gold, top-right ---
  ctx.save();
  ctx.translate(EXIT_DOOR.x, EXIT_DOOR.y);
  ctx.fillStyle = COLOURS.exit;
  ctx.fillRect(-16, -22, 32, 44);
  ctx.fillStyle = '#0d1020';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 0, 4);
  ctx.restore();

  // --- terminals ---
  for (const t of s.terminals) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.fillStyle = t.hacked ? COLOURS.terminalOff : COLOURS.terminal;
    ctx.fillRect(-14, -14, 28, 28);
    ctx.fillStyle = '#0d1020';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.hacked ? '✓' : t.id, 0, 5);
    if (!t.hacked && t.progress > 0) {
      ctx.fillStyle = COLOURS.terminal;
      ctx.fillRect(-14, 18, 28 * t.progress, 4);
    }
    ctx.restore();
  }

  // --- vision cones (under the guards, over the floor) ---
  for (const g of s.guards) drawCone(ctx, g, world.solids);

  // --- crates and walls ---
  for (const c of CRATES) drawRect(ctx, c, COLOURS.crate, COLOURS.crateTop);
  for (const w of WALLS) drawRect(ctx, w, COLOURS.wall, COLOURS.wallTop);

  // --- noise / pebble ripples ---
  for (const fx of [s.noiseFx, s.pebbleFx]) {
    if (!fx) continue;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, 18 + (0.9 - fx.ttl) * 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- guards ---
  for (const g of s.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.fillStyle = g.mode === 'chase' ? COLOURS.guardAlert : COLOURS.guard;
    ctx.beginPath();
    ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.strokeStyle = '#0d1020';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(g.angle) * (GUARD.radius + 6), Math.sin(g.angle) * (GUARD.radius + 6));
    ctx.stroke();
    // Detection arc above the guard's head.
    if (g.detection > 0.02) {
      ctx.strokeStyle = g.detection > 0.6 ? '#ff2e2e' : '#ffd166';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + g.detection * Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = COLOURS.hud;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, 0, -GUARD.radius - 12);
    if (g.mode === 'chase') {
      ctx.fillStyle = '#ff2e2e';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('!', 0, -GUARD.radius - 24);
    }
    ctx.restore();
  }

  // --- the player: a night-shift cleaner with a torch that never shines ---
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.hidden) {
    ctx.strokeStyle = 'rgba(159, 183, 255, 0.8)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = p.sneaking ? COLOURS.playerSneak : COLOURS.player;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d1020';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(p.facing) * 17, Math.sin(p.facing) * 17);
  ctx.stroke();
  ctx.restore();

  // --- hint line ---
  if (screen === SCREEN_PLAY && s.nearTerminal) {
    ctx.fillStyle = COLOURS.terminal;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Hold E to hack terminal ' + s.nearTerminal, FIELD.width / 2, FIELD.height - 14);
  }

  drawHud(ctx, world);

  // --- screens ---
  if (screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'NIGHTSHIFT', [
      '// After Hours — a museum heist in the dark //',
      '',
      'WASD / arrows — move      SHIFT — sneak (slow, quiet, hard to spot)',
      'Click — toss a pebble (3) to lure a guard     E — hack a terminal',
      'Hide in the dark patches. Learn the patrols. Reach the EXIT unseen.',
      '',
      'Press any key to clock in',
    ], '#ffd166');
  } else if (screen === SCREEN_WON) {
    drawOverlay(ctx, 'CLEAN GETAWAY', [
      `You reached the exit unseen in ${formatTime(s.time)}.`,
      `Intel recovered: ${s.intel} / 3${s.intel === 3 ? ' — a perfect run' : ''}`,
      `Times spotted: the guards never caught you.`,
      '',
      'Press R to run it again',
    ], '#1fd6c1');
  } else if (screen === SCREEN_CAUGHT) {
    drawOverlay(ctx, 'CAUGHT', [
      s.message || 'A guard caught you in the open.',
      `Intel recovered: ${s.intel} / 3      Time: ${formatTime(s.time)}`,
      '',
      'The patrols never change. Learn them, then try again.',
      '',
      'Press R to run it again',
    ], '#ff5d5d');
  }
}
