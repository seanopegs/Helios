const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const dialogueBox = document.getElementById("dialogue");
const dialogueLabel = document.getElementById("dialogue-label");
const dialogueLine = document.getElementById("dialogue-line");
const dialoguePrompt = document.getElementById("dialogue-prompt");

const dialogue = [
  { text: "okay Luke", speaker: "LUKE" },
  { text: "this is your final chance", speaker: "LUKE" },
  { text: "Use WASD to reach the door above.", speaker: "" }
];

let stage = 0;
let isHintActive = false;
let isTransientActive = false;
let transientTimeout = null;
const keys = new Set();
const camera = { x: 0, y: 0 };
let tick = 0;

const levels = {
  dorm: {
    width: 680,
    height: 520,
    wallHeight: 96,
    padding: 32,
    doors: [
      { x: 340 - 32, y: 96 - 80, width: 64, height: 80, target: "hallway", targetSpawn: { x: 260, y: 440 } }
    ],
    spawn: { x: 120, y: 240 },
    furniture: [
      // Beds on left wall (vertical)
      { type: "bed", x: 42, y: 200, width: 68, height: 90 },
      { type: "bed", x: 42, y: 340, width: 68, height: 90 },
      // Beds on right wall (vertical)
      { type: "bed", x: 680 - 110, y: 200, width: 68, height: 90 },
      { type: "bed", x: 680 - 110, y: 340, width: 68, height: 90 },

      // Common Table in center
      { type: "table", x: 340 - 60, y: 240, width: 120, height: 60 },

      // Cupboards
      { type: "cupboard", x: 50, y: 96 - 30, width: 60, height: 90, facing: "right" },
      { type: "cupboard", x: 680 - 110, y: 96 - 30, width: 60, height: 90, facing: "left" }
    ]
  },
  hallway: {
    width: 1400,
    height: 520,
    wallHeight: 96,
    padding: 32,
    doors: [
      { x: 1250, y: 520 - 36, width: 72, height: 36, target: "dorm", targetSpawn: { x: 340, y: 130 } },
      { x: 32, y: 96 - 84, width: 72, height: 84, target: "classroom", targetSpawn: { x: 120, y: 440 } }
    ],
    spawn: { x: 1282, y: 520 - 80 },
    furniture: [
      // Lockers row 1
      { type: "locker", x: 100, y: 96 - 60, width: 40, height: 80 },
      { type: "locker", x: 140, y: 96 - 60, width: 40, height: 80 },
      { type: "locker", x: 180, y: 96 - 60, width: 40, height: 80 },

      // Lockers row 2
      { type: "locker", x: 500, y: 96 - 60, width: 40, height: 80 },
      { type: "locker", x: 540, y: 96 - 60, width: 40, height: 80 },
      { type: "locker", x: 580, y: 96 - 60, width: 40, height: 80 },

      // Lockers row 3
      { type: "locker", x: 900, y: 96 - 60, width: 40, height: 80 },
      { type: "locker", x: 940, y: 96 - 60, width: 40, height: 80 },
      { type: "locker", x: 980, y: 96 - 60, width: 40, height: 80 },

      // Windows
      { type: "window", x: 300, y: 20, width: 100, height: 50 },
      { type: "window", x: 700, y: 20, width: 100, height: 50 },
      { type: "window", x: 1100, y: 20, width: 100, height: 50 }
    ]
  },
  classroom: {
    width: 960,
    height: 600,
    wallHeight: 96,
    padding: 32,
    doors: [
      { x: 960 / 2 - 36, y: 600 - 36, width: 72, height: 36, target: "hallway", targetSpawn: { x: 70, y: 200 } }
    ],
    spawn: { x: 120, y: 440 },
    furniture: [
      // Teacher desk
      { type: "table", x: 960 / 2 - 50, y: 140, width: 100, height: 60 },
      // Rows of student desks with seated students
      { type: "classDesk", x: 140, y: 210, width: 64, height: 70, student: { hue: "#4caf50", bobOffset: 0 } },
      { type: "classDesk", x: 260, y: 210, width: 64, height: 70, student: { hue: "#f06292", bobOffset: 0.5 } },
      { type: "classDesk", x: 380, y: 210, width: 64, height: 70, student: { hue: "#29b6f6", bobOffset: 1 } },
      { type: "classDesk", x: 500, y: 210, width: 64, height: 70, student: { hue: "#ffca28", bobOffset: 1.4 } },
      { type: "classDesk", x: 620, y: 210, width: 64, height: 70, student: { hue: "#ab47bc", bobOffset: 0.2 } },

      { type: "classDesk", x: 140, y: 310, width: 64, height: 70, student: { hue: "#ff8a65", bobOffset: 0.8 } },
      { type: "classDesk", x: 260, y: 310, width: 64, height: 70, student: { hue: "#81c784", bobOffset: 1.6 } },
      { type: "classDesk", x: 380, y: 310, width: 64, height: 70, student: { hue: "#9575cd", bobOffset: 1.1 } },
      { type: "classDesk", x: 500, y: 310, width: 64, height: 70, student: { hue: "#ba68c8", bobOffset: 0.3 } },
      { type: "classDesk", x: 620, y: 310, width: 64, height: 70, student: { hue: "#aed581", bobOffset: 1.9 } },

      { type: "classDesk", x: 140, y: 410, width: 64, height: 70, student: { hue: "#7986cb", bobOffset: 0.6 } },
      { type: "classDesk", x: 260, y: 410, width: 64, height: 70, student: { hue: "#ffb74d", bobOffset: 1.2 } },
      { type: "classDesk", x: 380, y: 410, width: 64, height: 70, student: { hue: "#4dd0e1", bobOffset: 0.1 } },
      { type: "classDesk", x: 500, y: 410, width: 64, height: 70, student: { hue: "#f48fb1", bobOffset: 0.9 } },
      { type: "classDesk", x: 620, y: 410, width: 64, height: 70, student: { hue: "#ff7043", bobOffset: 1.5 } }
    ]
  }
};

let currentLevelName = "dorm";
let room = levels[currentLevelName];

const player = {
  x: room.spawn.x,
  y: room.spawn.y,
  size: 24,
  speed: 3,
  facing: "down",
  walkFrame: 0
};

function loadLevel(name, spawnPos) {
  if (!levels[name]) return;
  currentLevelName = name;
  room = levels[name];

  isHintActive = false;
  isTransientActive = false;
  if (transientTimeout) {
    clearTimeout(transientTimeout);
    transientTimeout = null;
  }

  if (spawnPos) {
      player.x = spawnPos.x;
      player.y = spawnPos.y;
  } else {
      player.x = room.spawn.x;
      player.y = room.spawn.y;
  }

  camera.x = 0;
  camera.y = 0;
}

function updateDialogue() {
  const entry = dialogue[stage];

  if (entry) {
    dialogueBox.hidden = false;
    dialogueLine.textContent = entry.text;

    const hasSpeaker = Boolean(entry.speaker);
    dialogueLabel.textContent = entry.speaker || "";
    dialogueLabel.classList.toggle("dialogue__label--hidden", !hasSpeaker);

    dialoguePrompt.textContent = stage < dialogue.length - 1 ? "Click anywhere" : "";
    dialogueBox.classList.add("dialogue--active");
    dialogueBox.classList.remove("dialogue--hidden");
  } else {
    dialogueBox.hidden = true;
    dialogueLine.textContent = "";
    dialoguePrompt.textContent = "";
    dialogueLabel.textContent = "";
    dialogueLabel.classList.add("dialogue__label--hidden");
    dialogueBox.classList.add("dialogue--hidden");
  }
}

function showTransientLine(text) {
  if (transientTimeout) {
    clearTimeout(transientTimeout);
  }
  isTransientActive = true;
  dialogueBox.hidden = false;
  dialogueBox.classList.remove("dialogue--hidden");
  dialogueBox.classList.add("dialogue--active");
  dialogueLine.textContent = text;
  dialogueLabel.textContent = "";
  dialogueLabel.classList.add("dialogue__label--hidden");
  dialoguePrompt.textContent = "";

  transientTimeout = setTimeout(() => {
    isTransientActive = false;
    updateDialogue();
  }, 1500);
}

function checkCollision(x, y) {
  const half = player.size / 2;

  // Room bounds
  if (x - half < room.padding) return true;
  if (x + half > room.width - room.padding) return true;
  if (y - half < room.wallHeight) return true; // Wall collision
  if (y + half > room.height - room.padding) return true;

  // Furniture collision
  for (const item of room.furniture) {
    // Windows don't block movement if they are high up, but let's assume they are wall deco only
    if (item.type === 'window') continue;

    const dLeft = item.x;
    const dRight = item.x + item.width;
    const dTop = item.y;
    // Basic depth for furniture (collision at base)
    const dBottom = item.y + item.height;

    // A bit of padding for movement feel
    if (x + half > dLeft && x - half < dRight &&
        y + half > dTop && y - half < dBottom) {
      return true;
    }
  }

  return false;
}

function findNearbyFurniture(types, radius = 60) {
  const searchTypes = Array.isArray(types) ? types : [types];
  for (const item of room.furniture) {
    if (!searchTypes.includes(item.type)) continue;
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height;
    const dist = Math.hypot(player.x - centerX, player.y - centerY);
    if (dist < radius) {
      return item;
    }
  }
  return null;
}

function handleMovement() {
  if (stage < 2) return;

  let dx = 0;
  let dy = 0;
  if (keys.has("w")) dy -= 1;
  if (keys.has("s")) dy += 1;
  if (keys.has("a")) dx -= 1;
  if (keys.has("d")) dx += 1;

  if (dx !== 0 || dy !== 0) {
    if (dy < 0) player.facing = "up";
    if (dy > 0) player.facing = "down";
    if (dx < 0) player.facing = "left";
    if (dx > 0) player.facing = "right";

    player.walkFrame += 0.1;

    const length = Math.hypot(dx, dy) || 1;
    dx = (dx / length) * player.speed;
    dy = (dy / length) * player.speed;

    if (!checkCollision(player.x + dx, player.y)) {
      player.x += dx;
    }
    if (!checkCollision(player.x, player.y + dy)) {
      player.y += dy;
    }
  } else {
    player.walkFrame = 0;
  }

  // Camera update
  const camTargetX = player.x - canvas.width / 2;
  // Clamp
  const maxCamX = room.width - canvas.width;
  camera.x = Math.max(0, Math.min(camTargetX, maxCamX));

  const camTargetY = player.y - canvas.height / 2;
  const maxCamY = room.height - canvas.height;
  camera.y = Math.max(0, Math.min(camTargetY, Math.max(0, maxCamY)));
}

function drawRoom() {
  // Back Wall
  const isHallway = currentLevelName === 'hallway';
  const isClassroom = currentLevelName === 'classroom';
  ctx.fillStyle = isHallway ? "#455a64" : isClassroom ? "#4a4a4a" : "#333";
  ctx.fillRect(0, 0, room.width, room.wallHeight);

  // Floor
  ctx.fillStyle = isHallway ? "#cfd8dc" : isClassroom ? "#b39c82" : "#5d4037"; // Tile vs Wood
  ctx.fillRect(0, room.wallHeight, room.width, room.height - room.wallHeight);

  // Floor details
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  if (isHallway) {
      // Tile grid
      for (let i = room.wallHeight; i < room.height; i += 64) {
          ctx.fillRect(0, i, room.width, 2);
      }
      for (let i = 0; i < room.width; i += 64) {
          ctx.fillRect(i, room.wallHeight, 2, room.height - room.wallHeight);
      }
  } else {
      // Wood planks
      const spacing = isClassroom ? 28 : 32;
      for (let i = room.wallHeight; i < room.height; i += spacing) {
        ctx.fillRect(0, i, room.width, 2);
      }
  }
  ctx.restore();

  // Side Borders
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, room.padding, room.height);
  ctx.fillRect(room.width - room.padding, 0, room.padding, room.height);
  ctx.fillRect(0, room.height - room.padding, room.width, room.padding);

  // Baseboard
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(room.padding, room.wallHeight - 12, room.width - room.padding * 2, 12);
}

function drawDoor(door) {
  const { x, y, width, height } = door;

  // Check if door is on bottom wall (simple check: y > room.height / 2)
  const isBottom = y > room.height / 2;

  ctx.save();

  if (isBottom) {
      // Bottom Door (Exit mat style)
      ctx.fillStyle = "#2f1f1a"; // Frame color
      ctx.fillRect(x - 6, y - 2, width + 12, height + 4);

      // Inner recess
      const grad = ctx.createLinearGradient(x, y, x, y + height);
      grad.addColorStop(0, "#1c1b1b");
      grad.addColorStop(1, "#090909");
      ctx.fillStyle = grad;
      ctx.fillRect(x - 2, y + 2, width + 4, height - 4);

      // Mat
      ctx.fillStyle = "#4e342e";
      ctx.fillRect(x - 6, y + height - 10, width + 12, 10);
      ctx.fillStyle = "#6d4c41";
      ctx.fillRect(x - 4, y + height - 8, width + 8, 6);
  } else {
      // Top Door (Standard)
      // Frame
      const frameGrad = ctx.createLinearGradient(x, y - 6, x, y + height);
      frameGrad.addColorStop(0, "#5d4037");
      frameGrad.addColorStop(1, "#3e2723");
      ctx.fillStyle = frameGrad;
      ctx.fillRect(x - 6, y - 6, width + 12, height + 8);

      // Door itself
      const doorGrad = ctx.createLinearGradient(x, y, x, y + height);
      doorGrad.addColorStop(0, "#ffe082");
      doorGrad.addColorStop(1, "#ffca28");
      ctx.fillStyle = doorGrad;
      ctx.fillRect(x, y, width, height);

      // Panels
      ctx.strokeStyle = "#6d4c41";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 6, y + 6, width - 12, (height / 2) - 8);
      ctx.strokeRect(x + 6, y + height / 2, width - 12, (height / 2) - 10);

      // Shadow/Depth
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(x, y, 6, height);

      // Knob
      ctx.fillStyle = "#2f2f2f";
      ctx.beginPath();
      ctx.arc(x + width - 14, y + height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
  }

  ctx.restore();
}

function drawDoors() {
  if (!room.doors) return;
  room.doors.forEach(drawDoor);
}

function drawDesk(item) {
  // Legs
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(item.x + 4, item.y + 10, 6, item.height - 10);
  ctx.fillRect(item.x + item.width - 10, item.y + 10, 6, item.height - 10);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(item.x + 4, item.y + item.height - 4, item.width - 8, 4);

  // Top
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(item.x, item.y, item.width, item.height - 15);

  // Edge
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(item.x, item.y + item.height - 15, item.width, 5);
}

function drawCupboard(item) {
    const facing = item.facing || 'down';

    // Body
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    if (facing === 'down') {
        // Front view
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);

        // Split
        ctx.beginPath();
        ctx.moveTo(item.x + item.width / 2, item.y + 2);
        ctx.lineTo(item.x + item.width / 2, item.y + item.height - 2);
        ctx.stroke();

        // Knobs
        ctx.fillStyle = "#ffb74d";
        ctx.beginPath();
        ctx.arc(item.x + item.width/2 - 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.arc(item.x + item.width/2 + 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.fill();
    } else if (facing === 'right') {
        // Side view facing right (doors on right edge)
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);

        // Detail lines (side panels)
        ctx.beginPath();
        ctx.moveTo(item.x + item.width - 10, item.y + 2);
        ctx.lineTo(item.x + item.width - 10, item.y + item.height - 2);
        ctx.stroke();

        // Knob (on the side)
        ctx.fillStyle = "#ffb74d";
        ctx.beginPath();
        ctx.arc(item.x + item.width - 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.fill();
    } else if (facing === 'left') {
        // Side view facing left (doors on left edge)
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);

        // Detail lines
        ctx.beginPath();
        ctx.moveTo(item.x + 10, item.y + 2);
        ctx.lineTo(item.x + 10, item.y + item.height - 2);
        ctx.stroke();

        // Knob
        ctx.fillStyle = "#ffb74d";
        ctx.beginPath();
        ctx.arc(item.x + 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawLocker(item) {
    ctx.fillStyle = "#607d8b";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Detail
    ctx.fillStyle = "#546e7a";
    ctx.fillRect(item.x + 4, item.y + 10, item.width - 8, 4); // Vents
    ctx.fillRect(item.x + 4, item.y + 16, item.width - 8, 4);
    ctx.fillRect(item.x + 4, item.y + 22, item.width - 8, 4);

    // Handle
    ctx.fillStyle = "#cfd8dc";
    ctx.fillRect(item.x + item.width - 8, item.y + item.height/2, 4, 10);
}

function drawWindow(item) {
    ctx.fillStyle = "#81d4fa";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Frame
    ctx.strokeStyle = "#eceff1";
    ctx.lineWidth = 4;
    ctx.strokeRect(item.x, item.y, item.width, item.height);

    // Cross
    ctx.beginPath();
    ctx.moveTo(item.x + item.width/2, item.y);
    ctx.lineTo(item.x + item.width/2, item.y + item.height);
    ctx.moveTo(item.x, item.y + item.height/2);
    ctx.lineTo(item.x + item.width, item.y + item.height/2);
    ctx.stroke();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(item.x + 10, item.y + item.height);
    ctx.lineTo(item.x + 30, item.y);
    ctx.lineTo(item.x + 50, item.y);
    ctx.lineTo(item.x + 30, item.y + item.height);
    ctx.fill();
}

function drawTable(item) {
    // Legs
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(item.x + 6, item.y + item.height - 12, 8, 12);
    ctx.fillRect(item.x + item.width - 14, item.y + item.height - 12, 8, 12);

    // Top
    ctx.fillStyle = "#a1887f";
    ctx.fillRect(item.x, item.y, item.width, item.height - 8);

    // Outline
    ctx.strokeStyle = "#6d4c41";
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x + 1, item.y + 1, item.width - 2, item.height - 10);

    // Shadow accent
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(item.x, item.y + item.height - 12, item.width, 6);
}

function drawBed(item) {
    ctx.save();
    // Base
    ctx.fillStyle = "#795548";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Mattress
    ctx.fillStyle = "#d7ccc8";
    ctx.fillRect(item.x + 4, item.y + 6, item.width - 8, item.height - 16);

    // Blanket fold
    ctx.fillStyle = "#b39ddb";
    ctx.fillRect(item.x + 4, item.y + item.height / 2, item.width - 8, item.height / 2 - 10);
    ctx.fillStyle = "#9575cd";
    ctx.fillRect(item.x + 4, item.y + item.height / 2 + 6, item.width - 8, item.height / 2 - 16);

    // Pillow
    ctx.fillStyle = "#fff8e1";
    ctx.fillRect(item.x + item.width / 2 - 18, item.y + 10, 36, 18);
    ctx.strokeStyle = "#d7ccc8";
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x + item.width / 2 - 18, item.y + 10, 36, 18);

    ctx.restore();
}

function drawSittingStudent(item, bobOffset) {
    const hue = item.student?.hue || "#4caf50";
    const phase = tick * 0.08 + (item.student?.bobOffset || bobOffset || 0);
    const bob = Math.sin(phase) * 2;

    const seatX = item.x + item.width / 2;
    const seatY = item.y + item.height - 20;

    // Body
    ctx.fillStyle = hue;
    ctx.fillRect(seatX - 8, seatY - 18 - bob, 16, 18);

    // Head
    ctx.fillStyle = "#ffcc80";
    ctx.fillRect(seatX - 9, seatY - 34 - bob, 18, 16);

    // Hair band
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(seatX - 9, seatY - 34 - bob, 18, 6);

    // Legs
    ctx.fillStyle = "#3e2723";
    ctx.fillRect(seatX - 10, seatY - 4, 8, 10);
    ctx.fillRect(seatX + 2, seatY - 4, 8, 10);
}

function drawClassDesk(item) {
    // Chair
    ctx.fillStyle = "#37474f";
    ctx.fillRect(item.x + item.width / 2 - 10, item.y + item.height - 28, 20, 6);
    ctx.fillRect(item.x + item.width / 2 - 8, item.y + item.height - 22, 16, 12);

    // Desk surface
    ctx.fillStyle = "#a1887f";
    ctx.fillRect(item.x, item.y, item.width, item.height - 26);
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(item.x, item.y + item.height - 34, item.width, 6);

    // Desk legs
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(item.x + 6, item.y + item.height - 26, 6, 26);
    ctx.fillRect(item.x + item.width - 12, item.y + item.height - 26, 6, 26);

    // Books
    ctx.fillStyle = "#4fc3f7";
    ctx.fillRect(item.x + 10, item.y + 10, 20, 8);
    ctx.fillStyle = "#ffb74d";
    ctx.fillRect(item.x + 34, item.y + 12, 18, 6);

    if (item.student) {
        drawSittingStudent(item);
    }
}

function drawFurnitureItem(item) {
    if (item.type === 'desk') drawDesk(item);
    else if (item.type === 'table') drawTable(item);
    else if (item.type === 'bed') drawBed(item);
    else if (item.type === 'cupboard') drawCupboard(item);
    else if (item.type === 'locker') drawLocker(item);
    else if (item.type === 'window') drawWindow(item);
    else if (item.type === 'classDesk') drawClassDesk(item);
}

function drawPlayer(x, y) {
  const w = 24;
  const h = 36;

  // Animation calculation
  const isMoving = player.walkFrame !== 0;

  // Stronger leg movement (amplitude 5)
  const animOffset = Math.sin(player.walkFrame) * 5;
  // Side leg swing
  const walkCycle = Math.sin(player.walkFrame);
  // Body bobbing (up and down)
  const bob = isMoving ? Math.abs(Math.sin(player.walkFrame * 2)) * 2 : 0;

  const px = x - w / 2;
  const py = y - h + 8 - bob; // Apply bob to entire body y

  ctx.save();

  // Shadow (stays on ground, doesn't bob)
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, w / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const skinColor = "#ffcc80";
  const shirtColor = "#4caf50";
  const stripeColor = "#ffeb3b";
  const pantsColor = "#3e2723";
  const hairColor = "#5d4037";
  const eyeColor = "#333";

  if (player.facing === "down") {
    // Legs (independent of bob, connected to ground/body)
    // To make them look like walking, one goes up, one down relative to hip
    ctx.fillStyle = pantsColor;
    ctx.fillRect(px + 4, py + 26 + animOffset, 6, 10);
    ctx.fillRect(px + w - 10, py + 26 - animOffset, 6, 10);

    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px, py + 12, w, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px, py + 18, w, 4);

    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 2, py, w - 4, 12);

    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(px, py, w, 4);
    ctx.fillRect(px, py, 4, 10);
    ctx.fillRect(px + w - 4, py, 4, 10);

    // Face
    ctx.fillStyle = eyeColor;
    ctx.fillRect(px + 6, py + 6, 2, 2);
    ctx.fillRect(px + w - 8, py + 6, 2, 2);

  } else if (player.facing === "up") {
    // Legs
    ctx.fillStyle = pantsColor;
    ctx.fillRect(px + 4, py + 26 + animOffset, 6, 10);
    ctx.fillRect(px + w - 10, py + 26 - animOffset, 6, 10);

    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px, py + 12, w, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px, py + 18, w, 4);

    // Head (Back)
    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 2, py, w - 4, 12);

    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(px, py, w, 8);
    ctx.fillRect(px + 2, py + 8, w - 4, 4);

  } else if (player.facing === "left" || player.facing === "right") {
    const isRight = player.facing === "right";
    const legSwing = walkCycle * 6; // Increased swing

    ctx.fillStyle = pantsColor;
    // Leg 1
    ctx.fillRect(px + w/2 - 3 + legSwing, py + 26, 6, 10);
    // Leg 2
    ctx.fillRect(px + w/2 - 3 - legSwing, py + 26, 6, 10);

    // Body (Side view)
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px + 4, py + 12, w - 8, 14);

    // Arm (simple box for side view, maybe swing it?)
    const armSwing = -walkCycle * 4;

    ctx.fillStyle = stripeColor;
    ctx.fillRect(px + 4, py + 18, w - 8, 4);

    // Head (Side)
    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 4, py, w - 8, 12);

    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 2, py, w - 4, 4);
    if (isRight) {
       ctx.fillRect(px + 2, py, 4, 10);
    } else {
       ctx.fillRect(px + w - 6, py, 4, 10);
    }

    // Eye
    ctx.fillStyle = eyeColor;
    if (isRight) {
       ctx.fillRect(px + w - 8, py + 6, 2, 2);
    } else {
       ctx.fillRect(px + 6, py + 6, 2, 2);
    }
  }

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear screen

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawRoom();
  drawDoors();

  const renderList = [];
  renderList.push({
    y: player.y,
    draw: () => drawPlayer(player.x, player.y)
  });

  room.furniture.forEach(item => {
    // Windows are on wall, draw first? Or just z-sort by bottom?
    // Windows usually have high Y (bottom), but they are on wall.
    // If y is small (near ceiling), they will be drawn first anyway.
    // Let's use bottom of object.
    renderList.push({
      y: item.y + item.height,
      draw: () => drawFurnitureItem(item)
    });
  });

  renderList.sort((a, b) => a.y - b.y);
  renderList.forEach(obj => obj.draw());

  ctx.restore();

  // HUD
  drawHints();
}

function drawHints() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "16px 'VT323', 'Courier New', monospace";
  ctx.textAlign = "center";

  if (stage >= 2 && currentLevelName === 'classroom') {
    ctx.fillStyle = "#9e9e9e";
    ctx.fillText("W A S D", canvas.width - 60, canvas.height - 40);
  }
  ctx.restore();

  // DOM Hints logic
  let showingHint = false;
  if (!isTransientActive && room.doors) {
      for (const door of room.doors) {
        const dist = Math.hypot(player.x - (door.x + door.width / 2), player.y - (door.y + door.height));
        if (dist < 60) {
            showingHint = true;
            if (!isHintActive) {
               dialogueBox.hidden = false;
               dialogueBox.classList.remove("dialogue--hidden");
               dialogueBox.classList.add("dialogue--active");
               dialogueLine.textContent = "Press [SPACE] to open";
               dialogueLabel.classList.add("dialogue__label--hidden");
               dialoguePrompt.textContent = "";
               isHintActive = true;
            }
            break;
        }
      }
  }

  if (!showingHint && isHintActive && !isTransientActive) {
      isHintActive = false;
      updateDialogue();
  }
}

function loop() {
  tick += 1;
  handleMovement();
  draw();
  requestAnimationFrame(loop);
}

function advanceDialogue() {
  if (stage < dialogue.length - 1) {
    stage += 1;
    updateDialogue();
  } else if (stage === dialogue.length - 1) {
    stage += 1;
    updateDialogue();
  }
}

// Interaction Handler
function handleInteraction() {
    const nearBed = findNearbyFurniture("bed", 70);
    if (nearBed) {
        showTransientLine("it's not the right time to sleep.");
        return;
    }

    const nearCupboard = findNearbyFurniture("cupboard", 70);
    if (nearCupboard) {
        showTransientLine("why?");
        return;
    }

    if (!room.doors) return;
    for (const door of room.doors) {
        const dist = Math.hypot(player.x - (door.x + door.width / 2), player.y - (door.y + door.height));
        if (dist < 60) {
            if (door.target) {
                loadLevel(door.target, door.targetSpawn);
            }
            return;
        }
    }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d"].includes(key)) {
    keys.add(key);
  }
  if (key === " ") {
      handleInteraction();
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key);
});

canvas.addEventListener("click", advanceDialogue);
updateDialogue();
loop();
