// NIGHTSHIFT // After Hours — tuning numbers in one place.
// Everything is in world pixels; the playfield is 960 x 640.
export const FIELD = { width: 960, height: 640 };

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 12,
  walkSpeed: 150,
  sneakSpeed: 82,
  // Running (not sneaking) is heard this far away.
  noiseRadius: 115,
  // Standing still in a shadow patch hides you completely.
  pebbles: 3,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  chaseSpeed: 132,
  investigateSpeed: 96,
  // How far a guard can see, and how wide its cone is (full angle).
  visionRange: 195,
  visionHalfAngle: (38 * Math.PI) / 180,
  // Detection fills 0..1; base fill per second at point blank, scaled by distance.
  detectRate: 1.5,
  decayRate: 0.45,
  // Sneaking in the open halves how fast you are noticed.
  sneakSpotFactor: 0.45,
  // Seconds a chasing guard searches the last seen spot before giving up.
  searchSeconds: 2.6,
  // Seconds a guard must see you at close range while chasing before the catch lands.
  catchSeconds: 0.45,
  hearRadius: 150,
};

export const HACK = {
  // Seconds of holding E beside a terminal to pull its intel.
  seconds: 1.6,
  range: 52,
};

export const PEBBLE = {
  // Guards this far from the landing pebble turn to investigate it.
  lureRadius: 280,
  noiseRadius: 130,
};

export const EXIT = {
  // Reaching within this distance of the exit door wins the run.
  radius: 34,
};

export const COLOURS = {
  floor: '#1c1f2a',
  floorAlt: '#20242f',
  wall: '#3a3f52',
  wallTop: '#4d5470',
  crate: '#6b5a33',
  crateTop: '#8a743f',
  shadow: '#0d1020',
  terminal: '#1fd6c1',
  terminalOff: '#3f6f68',
  exit: '#ffd166',
  player: '#e8e6df',
  playerSneak: '#9fb7ff',
  guard: '#ff5d5d',
  guardAlert: '#ff2e2e',
  cone: 'rgba(255, 214, 102, 0.20)',
  coneAlert: 'rgba(255, 60, 60, 0.28)',
  hud: '#e8e6df',
  dim: '#8a8fa3',
};
