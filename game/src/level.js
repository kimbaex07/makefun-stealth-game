// NIGHTSHIFT // After Hours — the museum floor, hand-designed.
// Rectangles are {x, y, w, h} in world pixels. Walls and crates block
// movement AND line of sight; shadow patches hide a sneaking (or still)
// player from every vision cone.
import { FIELD } from './config.js';

// Outer walls (a 20px shell) plus interior gallery walls. Every interior
// wall leaves at least one doorway gap so the level is fully connected.
export const WALLS = [
  { x: 0, y: 0, w: FIELD.width, h: 20 }, // top
  { x: 0, y: FIELD.height - 20, w: FIELD.width, h: 20 }, // bottom
  { x: 0, y: 0, w: 20, h: FIELD.height }, // left
  { x: FIELD.width - 20, y: 0, w: 20, h: FIELD.height }, // right
  // Gallery divider, top hall: gap is the doorway at x 380..460.
  { x: 20, y: 200, w: 360, h: 20 },
  { x: 460, y: 200, w: 100, h: 20 },
  // Long spine wall down the middle-right: gap at y 400..480.
  { x: 560, y: 220, w: 20, h: 180 },
  { x: 560, y: 480, w: 20, h: 140 },
  // Lower-right divider: gap at x 700..780.
  { x: 580, y: 420, w: 120, h: 20 },
  { x: 780, y: 420, w: 160, h: 20 },
  // Short stub wall guarding the top-right vault approach.
  { x: 760, y: 20, w: 20, h: 110 },
];

// Crates: low cover. They block sight lines, so a crouched route can
// thread between them while a guard patrols past.
export const CRATES = [
  { x: 120, y: 300, w: 56, h: 56 },
  { x: 196, y: 300, w: 56, h: 56 },
  { x: 120, y: 376, w: 56, h: 56 },
  { x: 330, y: 470, w: 56, h: 56 },
  { x: 406, y: 470, w: 56, h: 56 },
  { x: 640, y: 250, w: 56, h: 56 },
  { x: 716, y: 250, w: 56, h: 56 },
  { x: 640, y: 326, w: 56, h: 56 },
  { x: 830, y: 470, w: 56, h: 56 },
];

// Shadow patches: unlit floor. Sneak (or stand still) inside one and no
// guard can spot you, even inside its cone. The patches chain into a
// quiet route from the service door to the vault exit.
export const SHADOWS = [
  { x: 40, y: 480, w: 200, h: 120 },
  { x: 280, y: 520, w: 180, h: 80 },
  { x: 300, y: 260, w: 120, h: 110 },
  { x: 600, y: 500, w: 130, h: 100 },
  { x: 620, y: 60, w: 130, h: 110 },
  { x: 830, y: 180, w: 90, h: 130 },
];

// Data terminals: optional intel. Hack all three for a perfect run,
// or slip straight to the exit — the door opens either way.
export const TERMINALS = [
  { x: 110, y: 110, id: 'A' },
  { x: 480, y: 330, id: 'B' },
  { x: 860, y: 540, id: 'C' },
];

export const EXIT_DOOR = { x: 888, y: 62 };
export const SPAWN = { x: 64, y: 566 };

// Guard patrols: waypoint loops with a pause (seconds) at each stop
// while the guard looks around. Fixed loops, so a patient player can
// learn every route before moving.
export const GUARD_PATROLS = [
  {
    name: 'Mara',
    waypoints: [
      { x: 110, y: 110, pause: 1.6 },
      { x: 500, y: 110, pause: 1.2 },
      { x: 500, y: 170, pause: 1.6 },
      { x: 110, y: 170, pause: 1.2 },
    ],
  },
  {
    name: 'Doss',
    waypoints: [
      { x: 470, y: 260, pause: 1.4 },
      { x: 470, y: 440, pause: 1.0 },
      { x: 610, y: 440, pause: 1.4 },
      { x: 610, y: 260, pause: 1.0 },
    ],
  },
  {
    name: 'Ilya',
    waypoints: [
      { x: 820, y: 110, pause: 1.8 },
      { x: 820, y: 360, pause: 1.0 },
      { x: 900, y: 360, pause: 1.4 },
      { x: 900, y: 110, pause: 1.0 },
    ],
  },
  {
    name: 'Rook',
    waypoints: [
      { x: 240, y: 566, pause: 1.2 },
      { x: 520, y: 566, pause: 1.6 },
      { x: 520, y: 450, pause: 1.0 },
      { x: 240, y: 450, pause: 1.0 },
    ],
  },
];

// Everything that blocks movement and sight, in one list.
export function solidRects() {
  return WALLS.concat(CRATES);
}
