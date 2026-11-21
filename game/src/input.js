// Keyboard + mouse input for NIGHTSHIFT. The game reads this each frame;
// the module owns no game state, only which keys are down.
export function createInput(canvas) {
  const keys = new Set();
  let click = null; // {x, y} in canvas CSS pixels, consumed once
  let clickWorld = null;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function keyUp(event) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function mouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousedown', mouseDown);

  function held(...names) {
    return names.some((n) => keys.has(n));
  }

  return {
    // Movement vector in [-1, 1] on each axis, from WASD or arrow keys.
    move() {
      const mx = (held('d', 'ArrowRight') ? 1 : 0) - (held('a', 'ArrowLeft') ? 1 : 0);
      const my = (held('s', 'ArrowDown') ? 1 : 0) - (held('w', 'ArrowUp') ? 1 : 0);
      return { mx, my };
    },
    sneak() {
      return keys.has('Shift');
    },
    hack() {
      return keys.has('e');
    },
    restartPressed() {
      return keys.has('r');
    },
    // A mouse click, converted to world pixels by `toWorld` and consumed.
    takeClick(toWorld) {
      if (!click) return null;
      const world = toWorld(click.x, click.y);
      click = null;
      clickWorld = world;
      return world;
    },
    lastClickWorld() {
      return clickWorld;
    },
    // Any key at all: used to leave the title screen.
    anyKey() {
      return keys.size > 0;
    },
    clear() {
      keys.clear();
      click = null;
    },
  };
}
