const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const dialogueBox = document.getElementById("dialogue");
const dialogueLabel = document.getElementById("dialogue-label");
const dialogueLine = document.getElementById("dialogue-line");
const dialoguePrompt = document.getElementById("dialogue-prompt");

const dialogue = [
  { text: "okay Luke", speaker: "LUKE" },
  { text: "this is your final chance", speaker: "LUKE" },
  { text: "Use WASD to reach the door on the left.", speaker: "" }
];

let stage = 0;
let isHintActive = false;
const keys = new Set();
const camera = { x: 0, y: 0 };

const levels = {
  classroom: {
    width: 680,
    height: 520,
    wallHeight: 96,
    padding: 32,
    theme: 'dorm',
    doors: [
      { x: 32, y: 144, width: 72, height: 120, orientation: 'left', target: 'hallway', targetSpawn: { x: 1284, y: 468 } }
    ],
    spawn: { x: 120, y: 240 },
    furniture: [
      // Beds on left wall (vertical)
      { type: 'bed', x: 50, y: 200, width: 50, height: 90 },
      { type: 'bed', x: 50, y: 340, width: 50, height: 90 },
      // Beds on right wall (vertical)
      { type: 'bed', x: 680 - 100, y: 200, width: 50, height: 90 },
      { type: 'bed', x: 680 - 100, y: 340, width: 50, height: 90 },

      // Common Table in center
      { type: 'table', x: 340 - 70, y: 240, width: 140, height: 68 },

      // Cupboards
      { type: 'cupboard', x: 50, y: 96 - 30, width: 60, height: 90, facing: 'right' },
      { type: 'cupboard', x: 680 - 110, y: 96 - 30, width: 60, height: 90, facing: 'left' }
    ]
  },
  hallway: {
    width: 1400,
    height: 520,
    wallHeight: 96,
    padding: 32,
    theme: 'hall',
    doors: [
      { x: 1250, y: 520 - 40, width: 68, height: 40, orientation: 'bottom', target: 'classroom', targetSpawn: { x: 116, y: 204 } },
      { x: 24, y: 200, width: 70, height: 110, orientation: 'left', target: 'lecture', targetSpawn: { x: 852, y: 315 } }
    ],
    spawn: { x: 1282, y: 520 - 80 },
    furniture: [
      // Lockers row 1
      { type: 'locker', x: 100, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 140, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 180, y: 96 - 60, width: 40, height: 80 },

      // Lockers row 2
      { type: 'locker', x: 500, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 540, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 580, y: 96 - 60, width: 40, height: 80 },

      // Lockers row 3
      { type: 'locker', x: 900, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 940, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 980, y: 96 - 60, width: 40, height: 80 },

      // Windows
      { type: 'window', x: 300, y: 20, width: 100, height: 50 },
      { type: 'window', x: 700, y: 20, width: 100, height: 50 },
      { type: 'window', x: 1100, y: 20, width: 100, height: 50 }
    ]
  },
  lecture: {
    width: 960,
    height: 620,
    wallHeight: 110,
    padding: 32,
    theme: 'classroom',
    doors: [
      { x: 864, y: 260, width: 68, height: 110, orientation: 'right', target: 'hallway', targetSpawn: { x: 106, y: 255 } }
    ],
    spawn: { x: 460, y: 520 },
    furniture: [
      // Teacher desk
      { type: 'table', x: 400, y: 150, width: 120, height: 60 },
      { type: 'cupboard', x: 120, y: 150, width: 60, height: 90, facing: 'left' },

      // Rows of classroom desks with students
      { type: 'desk', variant: 'study', x: 180, y: 240, width: 70, height: 60 },
      { type: 'student', x: 205, y: 270, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 340, y: 240, width: 70, height: 60 },
      { type: 'student', x: 365, y: 270, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 500, y: 240, width: 70, height: 60 },
      { type: 'student', x: 525, y: 270, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 660, y: 240, width: 70, height: 60 },
      { type: 'student', x: 685, y: 270, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 180, y: 340, width: 70, height: 60 },
      { type: 'student', x: 205, y: 370, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 340, y: 340, width: 70, height: 60 },
      { type: 'student', x: 365, y: 370, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 500, y: 340, width: 70, height: 60 },
      { type: 'student', x: 525, y: 370, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 660, y: 340, width: 70, height: 60 },
      { type: 'student', x: 685, y: 370, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 180, y: 440, width: 70, height: 60 },
      { type: 'student', x: 205, y: 470, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 340, y: 440, width: 70, height: 60 },
      { type: 'student', x: 365, y: 470, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 500, y: 440, width: 70, height: 60 },
      { type: 'student', x: 525, y: 470, width: 36, height: 40, facing: 'up' },

      { type: 'desk', variant: 'study', x: 660, y: 440, width: 70, height: 60 },
      { type: 'student', x: 685, y: 470, width: 36, height: 40, facing: 'up' }
    ]
  }
};

let currentLevelName = 'classroom';
let room = levels[currentLevelName];

const player = {
  x: room.spawn.x,
  y: room.spawn.y,
  size: 24,
  speed: 3,
  facing: "down",
  walkFrame: 0
};

let tempDialogueTimeout = null;

function loadLevel(name, spawnPos) {
  if (!levels[name]) return;
  currentLevelName = name;
  room = levels[name];

  if (spawnPos) {
      player.x = spawnPos.x;
      player.y = spawnPos.y;
  } else {
      player.x = room.spawn.x;
      player.y = room.spawn.y;
  }

  camera.x = 0;
}

function getDoors() {
  return room.doors || [];
}

function doorAttachmentPoint(door) {
  const orientation = door.orientation || 'top';

  if (orientation === 'bottom') {
    return { x: door.x + door.width / 2, y: door.y - 12 };
  }

  if (orientation === 'left') {
    return { x: door.x + door.width + 12, y: door.y + door.height / 2 };
  }

  if (orientation === 'right') {
    return { x: door.x - 12, y: door.y + door.height / 2 };
  }

  // Top
  return { x: door.x + door.width / 2, y: door.y + door.height + 12 };
}

function getNearestDoor(threshold = Infinity) {
  let nearest = null;
  let nearestDist = threshold;
  for (const door of getDoors()) {
    const anchor = doorAttachmentPoint(door);
    const dist = Math.hypot(player.x - anchor.x, player.y - anchor.y);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = door;
    }
  }
  return nearest;
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

function showLukeLine(text) {
  if (tempDialogueTimeout) {
    clearTimeout(tempDialogueTimeout);
    tempDialogueTimeout = null;
  }

  dialogueBox.hidden = false;
  dialogueLine.textContent = text;
  dialogueLabel.textContent = "LUKE";
  dialogueLabel.classList.remove("dialogue__label--hidden");
  dialoguePrompt.textContent = "";
  dialogueBox.classList.add("dialogue--active");
  dialogueBox.classList.remove("dialogue--hidden");

  tempDialogueTimeout = setTimeout(() => {
    tempDialogueTimeout = null;
    updateDialogue();
  }, 1600);
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
}

function drawRoom() {
  const themes = {
    hall: { wall: "#3f5765", floor: "#cfd8dc", baseboard: "#1c262f", detail: "#b0bec5", pattern: 64, vertical: true },
    dorm: { wall: "#2f2a2a", floor: "#5d4037", baseboard: "#4e342e", detail: "rgba(0,0,0,0.15)", pattern: 32, vertical: false },
    classroom: { wall: "#2c3e50", floor: "#e9e4d5", baseboard: "#1f2d3a", detail: "rgba(0,0,0,0.12)", pattern: 54, vertical: true }
  };

  const themeName = room.theme || 'dorm';
  const palette = themes[themeName] || themes.dorm;

  // Back Wall
  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, room.width, room.wallHeight);

  // Floor
  ctx.fillStyle = palette.floor;
  ctx.fillRect(0, room.wallHeight, room.width, room.height - room.wallHeight);

  // Floor details
  ctx.save();
  ctx.fillStyle = palette.detail;
  for (let i = room.wallHeight; i < room.height; i += palette.pattern) {
    ctx.fillRect(0, i, room.width, 2);
  }
  if (palette.vertical) {
    for (let i = 0; i < room.width; i += palette.pattern) {
      ctx.fillRect(i, room.wallHeight, 2, room.height - room.wallHeight);
    }
  }
  ctx.restore();

  // Side Borders
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, room.padding, room.height);
  ctx.fillRect(room.width - room.padding, 0, room.padding, room.height);
  ctx.fillRect(0, room.height - room.padding, room.width, room.padding);

  // Baseboard
  ctx.fillStyle = palette.baseboard;
  ctx.fillRect(room.padding, room.wallHeight - 12, room.width - room.padding * 2, 12);
}

function drawDoor(door) {
  const { x, y, width, height } = door;
  const orientation = door.orientation || (y > room.height / 2 ? 'bottom' : 'top');

  if (orientation === 'bottom') {
      // Bottom Door (Exit mat style)
      ctx.fillStyle = "#2d1e19"; // Frame color
      ctx.fillRect(x - 6, y - 4, width + 12, height + 6);

      const gradient = ctx.createLinearGradient(0, y, 0, y + height);
      gradient.addColorStop(0, "#5d4037");
      gradient.addColorStop(1, "#3e2723");
      ctx.fillStyle = gradient; // Door body
      ctx.fillRect(x, y, width, height);

      // Window slit
      ctx.fillStyle = "#90a4ae";
      ctx.fillRect(x + 10, y + 8, width - 20, 10);

      // Knob
      ctx.fillStyle = "#f0c419";
      ctx.beginPath();
      ctx.arc(x + width - 12, y + height / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Mat
      ctx.fillStyle = "#6d4c41";
      ctx.fillRect(x - 4, y + height - 8, width + 8, 10);
  } else if (orientation === 'left' || orientation === 'right') {
      // Side doors
      const isRight = orientation === 'right';
      const frameX = isRight ? x - 6 : x - 6;
      ctx.fillStyle = "#3a271f";
      ctx.fillRect(frameX, y - 6, width + 12, height + 12);

      const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
      if (isRight) {
        gradient.addColorStop(0, "#d89c27");
        gradient.addColorStop(1, "#f6c453");
      } else {
        gradient.addColorStop(0, "#f6c453");
        gradient.addColorStop(1, "#d89c27");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y, width, 6);

      // Window panel
      ctx.fillStyle = "#90caf9";
      ctx.fillRect(x + 10, y + 12, width - 20, 26);

      // Knob
      ctx.fillStyle = "#333";
      ctx.beginPath();
      const knobX = isRight ? x + 12 : x + width - 12;
      ctx.arc(knobX, y + height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
  } else {
      // Top Door (Standard)
      // Frame
      ctx.fillStyle = "#3a271f";
      ctx.fillRect(x - 6, y - 6, width + 12, height + 10);

      const gradient = ctx.createLinearGradient(0, y, 0, y + height);
      gradient.addColorStop(0, "#f6c453");
      gradient.addColorStop(1, "#d89c27");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      // Shadow/Depth
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y, 6, height);

      // Upper window panel
      ctx.fillStyle = "#90caf9";
      ctx.fillRect(x + 8, y + 10, width - 16, 14);

      // Knob
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(x + width - 12, y + height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
  }
}

function drawDoors() {
  getDoors().forEach(drawDoor);
}

function drawDesk(item) {
  const topColor = item.variant === 'study' ? "#c7a17a" : "#8d6e63";
  const legColor = item.variant === 'study' ? "#6d4c41" : "#3e2723";

  // Legs
  ctx.fillStyle = legColor;
  ctx.fillRect(item.x + 4, item.y + 10, 6, item.height - 10);
  ctx.fillRect(item.x + item.width - 10, item.y + 10, 6, item.height - 10);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(item.x + 4, item.y + item.height - 4, item.width - 8, 4);

  // Top
  ctx.fillStyle = topColor;
  ctx.fillRect(item.x, item.y, item.width, item.height - 15);

  // Edge
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(item.x, item.y + item.height - 15, item.width, 5);
}

function drawTable(item) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(item.x + 6, item.y + item.height - 6, item.width - 12, 6);

  // Legs
  ctx.fillStyle = "#2f2a28";
  ctx.fillRect(item.x + 6, item.y + 12, 8, item.height - 18);
  ctx.fillRect(item.x + item.width - 14, item.y + 12, 8, item.height - 18);
  ctx.fillRect(item.x + item.width / 2 - 4, item.y + 12, 8, item.height - 18);

  // Top
  const gradient = ctx.createLinearGradient(item.x, item.y, item.x, item.y + item.height);
  gradient.addColorStop(0, "#b0a089");
  gradient.addColorStop(1, "#9e8c74");
  ctx.fillStyle = gradient;
  ctx.fillRect(item.x, item.y, item.width, item.height - 10);

  // Edge
  ctx.fillStyle = "#7b6a56";
  ctx.fillRect(item.x, item.y + item.height - 10, item.width, 10);
}

function drawBed(item) {
  // Bed frame
  ctx.fillStyle = "#d7ccc8";
  ctx.fillRect(item.x, item.y, item.width, item.height);

  // Mattress
  ctx.fillStyle = "#f5f0e9";
  ctx.fillRect(item.x + 4, item.y + 8, item.width - 8, item.height - 16);

  // Blanket
  const blanketHeight = item.height - 36;
  ctx.fillStyle = "#90caf9";
  ctx.fillRect(item.x + 6, item.y + item.height - blanketHeight - 10, item.width - 12, blanketHeight);

  ctx.fillStyle = "#64b5f6";
  ctx.fillRect(item.x + 6, item.y + item.height - blanketHeight - 4, item.width - 12, 6);

  // Pillow
  ctx.fillStyle = "#fffde7";
  ctx.fillRect(item.x + 10, item.y + 12, item.width - 20, 18);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(item.x + 12, item.y + 14, item.width - 24, 4);
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

function drawStudent(item) {
    const baseY = item.y;
    const bob = Math.sin(Date.now() / 500 + (item.phase || 0)) * 2;
    const seatY = baseY - bob;

    // Seat shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(item.x + 4, seatY + item.height - 8, item.width - 8, 6);

    // Body
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(item.x + 4, seatY + 10, item.width - 8, 16);
    ctx.fillStyle = "#ffeb3b";
    ctx.fillRect(item.x + 4, seatY + 16, item.width - 8, 4);

    // Head
    ctx.fillStyle = "#f1c27d";
    ctx.fillRect(item.x + 6, seatY - 2, item.width - 12, 12);

    // Hair
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(item.x + 4, seatY - 4, item.width - 8, 6);

    // Arms resting
    ctx.fillStyle = "#d84315";
    ctx.fillRect(item.x + 6, seatY + 20, item.width - 12, 6);

    // Eyes (facing front)
    ctx.fillStyle = "#212121";
    ctx.fillRect(item.x + 10, seatY + 2, 3, 2);
    ctx.fillRect(item.x + item.width - 13, seatY + 2, 3, 2);
}

function drawFurnitureItem(item) {
    if (item.type === 'desk') drawDesk(item);
    else if (item.type === 'table') drawTable(item);
    else if (item.type === 'bed') drawBed(item);
    else if (item.type === 'cupboard') drawCupboard(item);
    else if (item.type === 'locker') drawLocker(item);
    else if (item.type === 'window') drawWindow(item);
    else if (item.type === 'student') drawStudent(item);
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
  const nearbyDoor = getNearestDoor(56);
  if (nearbyDoor) {
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
  }

  if (!showingHint && isHintActive) {
      isHintActive = false;
      updateDialogue();
  }
}

function loop() {
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
function findNearbyFurniture(types, threshold = 60) {
    for (const item of room.furniture) {
        if (!types.includes(item.type)) continue;
        const anchorX = item.x + item.width / 2;
        const anchorY = item.y + item.height;
        const dist = Math.hypot(player.x - anchorX, player.y - anchorY);
        if (dist < threshold) return item;
    }
    return null;
}

function handleInteraction() {
    const nearBed = findNearbyFurniture(['bed']);
    if (nearBed) {
        showLukeLine("it's not the right time to sleep");
        return;
    }

    const nearCupboard = findNearbyFurniture(['cupboard'], 50);
    if (nearCupboard) {
        showLukeLine("why?");
        return;
    }

    const door = getNearestDoor(60);
    if (door && door.target) {
        loadLevel(door.target, door.targetSpawn);
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
