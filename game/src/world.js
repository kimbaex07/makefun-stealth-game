// NIGHTSHIFT // After Hours — game state and the rules that move it.
// One fixed-step simulation: the player sneaks, guards patrol and watch,
// a full detection meter raises the alarm, and the exit ends the run.
import { FIELD, STEP, PLAYER, GUARD, HACK, PEBBLE, EXIT } from './config.js';
import { makeRng, jitter } from './random.js';
import { WALLS, CRATES, SHADOWS, TERMINALS, EXIT_DOOR, SPAWN, GUARD_PATROLS, solidRects } from './level.js';

export const STATUS_TITLE = 'title';
export const STATUS_PLAYING = 'playing';
export const STATUS_WON = 'won';
export const STATUS_CAUGHT = 'caught';

export const EVENT_NONE = 0;
export const EVENT_INTEL = 1;
export const EVENT_ALARM = 2;
export const EVENT_WON = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_PEBBLE = 16;
export const EVENT_NOISE = 32;

// --- geometry helpers -------------------------------------------------------

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function circleHitsRect(x, y, radius, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < radius * radius;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick rejects: both ends inside, or the segment's box misses the rect.
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  if (Math.max(x1, x2) < r.x || Math.min(x1, x2) > r.x + r.w) return false;
  if (Math.max(y1, y2) < r.y || Math.min(y1, y2) > r.y + r.h) return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Slab test: the segment crosses the rect when the entry and exit
  // parameters overlap inside [0, 1].
  let t0 = 0;
  let t1 = 1;
  const axes = [
    [-dx, x1 - r.x],
    [dx, r.x + r.w - x1],
    [-dy, y1 - r.y],
    [dy, r.y + r.h - y1],
  ];
  for (const [p, q] of axes) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (const r of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

function inShadow(x, y) {
  for (const s of SHADOWS) {
    if (pointInRect(x, y, s)) return true;
  }
  return false;
}

// Move a circle axis by axis so it slides along walls instead of sticking.
function moveCircle(pos, dx, dy, radius, solids) {
  let nx = pos.x + dx;
  let blocked = false;
  for (const r of solids) {
    if (circleHitsRect(nx, pos.y, radius, r)) { blocked = true; break; }
  }
  if (!blocked) pos.x = nx;
  let ny = pos.y + dy;
  blocked = false;
  for (const r of solids) {
    if (circleHitsRect(pos.x, ny, radius, r)) { blocked = true; break; }
  }
  if (!blocked) pos.y = ny;
  pos.x = Math.max(radius + 2, Math.min(FIELD.width - radius - 2, pos.x));
  pos.y = Math.max(radius + 2, Math.min(FIELD.height - radius - 2, pos.y));
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

// --- the world ---------------------------------------------------------------

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset();
  }

  reset() {
    const rng = makeRng(this.seed);
    this.rng = rng;
    this.solids = solidRects();
    this.state = {
      status: STATUS_TITLE,
      time: 0,
      intel: 0,
      maxDetection: 0,
      alarm: false,
      message: '',
      noiseFx: null,
      pebbleFx: null,
      player: {
        x: SPAWN.x,
        y: SPAWN.y,
        facing: -Math.PI / 2,
        sneaking: false,
        moving: false,
        hidden: true,
        pebbles: PLAYER.pebbles,
      },
      guards: GUARD_PATROLS.map((patrol) => {
        const first = patrol.waypoints[0];
        return {
          name: patrol.name,
          x: first.x + jitter(rng, 4),
          y: first.y + jitter(rng, 4),
          angle: 0,
          wpIndex: 1,
          pauseTimer: patrol.waypoints[0].pause,
          mode: 'patrol',
          detection: 0,
          target: null,
          lastSeen: null,
          catchTimer: 0,
          searchTimer: 0,
          loseTimer: 0,
          lookAngle: 0,
        };
      }),
      terminals: TERMINALS.map((t) => ({ ...t, hacked: false, progress: 0 })),
    };
  }

  start() {
    if (this.state.status === STATUS_TITLE) {
      this.state.status = STATUS_PLAYING;
    }
  }

  // One fixed step. `input` is {mx, my, sneak, hack, pebble:{x,y}|null}.
  // Returns an EVENT_* bitmask for sounds and screen changes.
  step(dt, input = {}) {
    const s = this.state;
    if (s.status === STATUS_TITLE) {
      // Let the title scene breathe: guards patrol behind the title card.
      this.updateGuards(dt, true);
      return EVENT_NONE;
    }
    if (s.status !== STATUS_PLAYING) return EVENT_NONE;

    let events = EVENT_NONE;
    s.time += dt;
    const p = s.player;

    // --- player movement ----------------------------------------------------
    const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(input.mx || 0, input.my || 0);
    const nx = len > 0 ? (input.mx || 0) / len : 0;
    const ny = len > 0 ? (input.my || 0) / len : 0;
    p.moving = len > 0;
    p.sneaking = !!input.sneak;
    if (p.moving) {
      moveCircle(p, nx * speed * dt, ny * speed * dt, PLAYER.radius, this.solids);
      p.facing = Math.atan2(ny, nx);
    }
    p.hidden = inShadow(p.x, p.y) && (p.sneaking || !p.moving);

    // Running is loud: guards nearby turn to investigate the noise.
    if (p.moving && !p.sneaking) {
      s.noiseFx = { x: p.x, y: p.y, ttl: 0.25 };
      for (const g of s.guards) {
        if (g.mode === 'patrol' && Math.hypot(g.x - p.x, g.y - p.y) < GUARD.hearRadius) {
          g.mode = 'investigate';
          g.target = { x: p.x, y: p.y };
          events |= EVENT_NOISE;
        }
      }
    } else if (s.noiseFx) {
      s.noiseFx.ttl -= dt;
      if (s.noiseFx.ttl <= 0) s.noiseFx = null;
    }

    // --- pebble toss ---------------------------------------------------------
    if (input.pebble && p.pebbles > 0) {
      p.pebbles -= 1;
      const tx = Math.max(24, Math.min(FIELD.width - 24, input.pebble.x));
      const ty = Math.max(24, Math.min(FIELD.height - 24, input.pebble.y));
      s.pebbleFx = { x: tx, y: ty, ttl: 0.9 };
      let best = null;
      let bestDist = Infinity;
      for (const g of s.guards) {
        const d = Math.hypot(g.x - tx, g.y - ty);
        if (d < PEBBLE.lureRadius && d < bestDist) { best = g; bestDist = d; }
      }
      if (best) {
        best.mode = 'investigate';
        best.target = { x: tx, y: ty };
        best.detection = Math.max(0, best.detection - 0.35);
      }
      events |= EVENT_PEBBLE;
    } else if (s.pebbleFx) {
      s.pebbleFx.ttl -= dt;
      if (s.pebbleFx.ttl <= 0) s.pebbleFx = null;
    }

    // --- terminal hack -------------------------------------------------------
    let nearTerminal = null;
    for (const t of s.terminals) {
      if (!t.hacked && Math.hypot(t.x - p.x, t.y - p.y) < HACK.range) nearTerminal = t;
    }
    if (nearTerminal && input.hack) {
      nearTerminal.progress += dt / HACK.seconds;
      if (nearTerminal.progress >= 1) {
        nearTerminal.hacked = true;
        nearTerminal.progress = 1;
        s.intel += 1;
        events |= EVENT_INTEL;
      }
    } else {
      for (const t of s.terminals) {
        if (!t.hacked) t.progress = Math.max(0, t.progress - dt * 0.5);
      }
    }
    s.nearTerminal = nearTerminal ? nearTerminal.id : null;

    // --- guards: sight, detection, alarm ------------------------------------
    events |= this.updateGuards(dt, false);

    // --- win / lose ----------------------------------------------------------
    if (s.status === STATUS_PLAYING && Math.hypot(EXIT_DOOR.x - p.x, EXIT_DOOR.y - p.y) < EXIT.radius) {
      s.status = STATUS_WON;
      events |= EVENT_WON;
    }
    return events;
  }

  // Guard brains. When `idle` is true (title screen) they patrol and look
  // but never fill a detection meter.
  updateGuards(dt, idle) {
    const s = this.state;
    const p = s.player;
    let events = EVENT_NONE;

    for (const g of s.guards) {
      // --- can this guard see the player right now? ---
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const dist = Math.hypot(dx, dy);
      let sees = false;
      if (!idle && s.status === STATUS_PLAYING && !p.hidden && dist < GUARD.visionRange) {
        const facing = angleDiff(angleTo(g.x, g.y, p.x, p.y), g.angle);
        if (Math.abs(facing) < GUARD.visionHalfAngle) {
          sees = hasLineOfSight(g.x, g.y, p.x, p.y, this.solids);
        }
      }

      // --- detection meter: fills in the cone, drains out of it ---
      if (sees) {
        const closeness = 1 - (dist / GUARD.visionRange) * 0.6;
        const rate = GUARD.detectRate * closeness * (p.sneaking ? GUARD.sneakSpotFactor : 1);
        g.detection = Math.min(1, g.detection + rate * dt);
        g.lastSeen = { x: p.x, y: p.y };
        g.loseTimer = 0;
      } else {
        g.detection = Math.max(0, g.detection - GUARD.decayRate * dt);
      }
      s.maxDetection = Math.max(s.maxDetection, g.detection);

      // Full meter: the alarm goes up and the guard chases.
      if (g.detection >= 1 && g.mode !== 'chase') {
        g.mode = 'chase';
        g.catchTimer = 0;
        if (!s.alarm) {
          s.alarm = true;
          s.message = `${g.name} raised the alarm!`;
          events |= EVENT_ALARM;
        }
      }

      // --- movement by mode ---
      if (g.mode === 'patrol') {
        const patrol = GUARD_PATROLS.find((pt) => pt.name === g.name);
        const wp = patrol.waypoints[g.wpIndex];
        if (g.pauseTimer > 0) {
          g.pauseTimer -= dt;
          // Look around while paused: sweep the cone side to side.
          g.lookAngle += dt * 1.4;
          g.angle = angleTo(g.x, g.y, wp.x, wp.y) + Math.sin(g.lookAngle) * 0.9;
        } else {
          const d = Math.hypot(wp.x - g.x, wp.y - g.y);
          if (d < 8) {
            g.wpIndex = (g.wpIndex + 1) % patrol.waypoints.length;
            g.pauseTimer = wp.pause;
          } else {
            const stepDist = GUARD.patrolSpeed * dt;
            const mx = ((wp.x - g.x) / d) * stepDist;
            const my = ((wp.y - g.y) / d) * stepDist;
            moveCircle(g, mx, my, GUARD.radius, this.solids);
            g.angle = turnToward(g.angle, angleTo(g.x, g.y, wp.x, wp.y), 6 * dt);
          }
        }
      } else if (g.mode === 'investigate' || g.mode === 'search') {
        const target = g.mode === 'search' ? g.lastSeen : g.target;
        if (!target) {
          g.mode = 'patrol';
        } else {
          const d = Math.hypot(target.x - g.x, target.y - g.y);
          if (d < 10) {
            g.searchTimer += dt;
            g.angle += dt * 2.2; // scan the spot, then give up
            if (g.searchTimer > GUARD.searchSeconds) {
              g.mode = 'patrol';
              g.searchTimer = 0;
              g.target = null;
              g.pauseTimer = 0.8;
            }
          } else {
            g.searchTimer = 0;
            const stepDist = GUARD.investigateSpeed * dt;
            const mx = ((target.x - g.x) / d) * stepDist;
            const my = ((target.y - g.y) / d) * stepDist;
            moveCircle(g, mx, my, GUARD.radius, this.solids);
            g.angle = turnToward(g.angle, angleTo(g.x, g.y, target.x, target.y), 6 * dt);
          }
        }
      } else if (g.mode === 'chase') {
        const target = g.lastSeen || { x: p.x, y: p.y };
        const d = Math.hypot(target.x - g.x, target.y - g.y);
        if (sees && dist < 34) {
          // Caught in the open at arm's length: the run ends.
          g.catchTimer += dt;
          if (g.catchTimer > GUARD.catchSeconds) {
            s.status = STATUS_CAUGHT;
            s.message = `Caught by ${g.name} in the open.`;
            events |= EVENT_CAUGHT;
          }
        } else {
          g.catchTimer = 0;
        }
        if (d > 10) {
          const stepDist = GUARD.chaseSpeed * dt;
          const mx = ((target.x - g.x) / d) * stepDist;
          const my = ((target.y - g.y) / d) * stepDist;
          moveCircle(g, mx, my, GUARD.radius, this.solids);
          g.angle = turnToward(g.angle, angleTo(g.x, g.y, target.x, target.y), 8 * dt);
        }
        if (!sees) {
          g.loseTimer += dt;
          if (g.loseTimer > 3) {
            // Lost you: search the last seen spot, then return to patrol.
            g.mode = 'search';
            g.searchTimer = 0;
            g.loseTimer = 0;
          }
        }
      }

      // A guard that calmed down lets the alarm lamp go out.
      if (g.mode === 'patrol' && g.detection < 0.05 && s.alarm) {
        s.alarm = s.guards.some((other) => other.mode !== 'patrol' || other.detection >= 0.05);
      }
    }
    return events;
  }
}

export { STEP };
