const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadHelios() {
  const context = {
    console,
    window: {},
    document: {
      querySelector: () => null,
      getElementById: () => null
    }
  };
  context.window.window = context.window;
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "helios.js"), "utf8");
  vm.runInContext(source, context, { filename: "helios.js" });
  return context.window.Helios;
}

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

const Helios = loadHelios();

run("creates normalized versioned play data", () => {
  const play = Helios.Play.create({ startingRoom: "lecture", volume: 1.4 });
  assert.equal(play.schemaVersion, 2);
  assert.equal(play.player.room, "lecture");
  assert.equal(play.settings.volume, 1);
  assert.equal(play.inventory.length, Helios.Inventory.SIZE);
  assert.equal(play.activeSlot, 0);
});

run("serializes clean design data and handles save slots", () => {
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  };
  const play = Helios.Play.create({ startingRoom: "classroom" });
  Helios.Save.writeSlot(localStorage, 3, play);
  assert.equal(Helios.Save.hasSlot(localStorage, 3), true);
  assert.equal(Helios.Save.readSlot(localStorage, 3).player.room, "classroom");
  assert.equal(Helios.Save.readSlot(localStorage, 8), null);

  const json = Helios.Save.serialize({ levels: { a: { _temp: true, keep: true } }, dialogue: [] });
  assert.equal(json.includes("_temp"), false);
  assert.equal(JSON.parse(json).levels.a.keep, true);
});

run("maps input actions and inventory items", () => {
  assert.equal(Helios.Input.mapKeyToAction("ArrowUp"), Helios.Input.ACTIONS.MOVE_UP);
  assert.equal(Helios.Input.mapKeyToAction(" "), Helios.Input.ACTIONS.INTERACT);
  assert.equal(Helios.Input.isMoveAction(Helios.Input.ACTIONS.MOVE_LEFT), true);
  assert.equal(Helios.Inventory.clone("door_key").label, "Door Key");
});

run("computes proximity anchors and collision rectangles", () => {
  const door = { x: 100, y: 0, width: 60, height: 80, orientation: "top" };
  const anchor = Helios.Proximity.getDoorAnchor(door);
  assert.equal(anchor.x, 130);
  assert.equal(anchor.y, 80);

  const room = {
    width: 300,
    height: 240,
    padding: 20,
    wallHeight: 40,
    furniture: [
      { type: "rug", x: 70, y: 70, width: 80, height: 40 },
      { type: "desk", x: 120, y: 90, width: 60, height: 50, collisionRect: { x: 8, y: 28, width: 44, height: 18 } }
    ]
  };
  const player = { size: 24 };
  assert.equal(Helios.Collision.hasCollisionAt({ x: 80, y: 80, room, player, isItemHidden: () => false }), false);
  assert.equal(Helios.Collision.hasCollisionAt({ x: 145, y: 126, room, player, isItemHidden: () => false }), true);
});
