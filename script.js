const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const dialogueBox = document.getElementById("dialogue");
const dialogueLabel = document.getElementById("dialogue-label");
const dialogueLine = document.getElementById("dialogue-line");
const dialoguePrompt = document.getElementById("dialogue-prompt");

const dialogue = [
  { text: "okay Luke", speaker: "LUKE" },
  { text: "this is your final chance", speaker: "LUKE" },
  { text: "Use WASD to reach the door at the top.", speaker: "" }
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
      { x: 340 - 32, y: 96 - 78, width: 64, height: 80, orientation: 'top', target: 'hallway', targetSpawn: { x: 1282, y: 440 } }
    ],
    spawn: { x: 340, y: 400 },
    furniture: [
      // Rugs (Floor layer)
      { type: 'rug', x: 150, y: 220, width: 80, height: 120, color: "#a1887f" },
      { type: 'rug', x: 450, y: 220, width: 80, height: 120, color: "#a1887f" },

      // Wardrobes (Corners)
      { type: 'cupboard', x: 40, y: 50, width: 60, height: 90 },
      { type: 'cupboard', x: 580, y: 50, width: 60, height: 90 },

      // Main Desk (Top Right area)
      { type: 'desk', x: 460, y: 140, width: 90, height: 50, hasLaptop: true, hasLamp: true },

      // Shelves (Back wall)
      { type: 'shelf', x: 130, y: 40, width: 60, height: 30 },
      { type: 'shelf', x: 490, y: 40, width: 60, height: 30 },

      // Left Wall (Bed - Desk - Bed)
      { type: 'bed', x: 40, y: 180, width: 60, height: 100 },
      { type: 'desk', x: 40, y: 290, width: 60, height: 60, hasLaptop: true, hasLamp: true },
      { type: 'bed', x: 40, y: 360, width: 60, height: 100 },

      // Right Wall (Bed - Desk - Bed)
      { type: 'bed', x: 580, y: 180, width: 60, height: 100 },
      { type: 'desk', x: 580, y: 290, width: 60, height: 60, hasLaptop: true, hasLamp: true },
      { type: 'bed', x: 580, y: 360, width: 60, height: 100 },

      // Center Chest
      { type: 'chest', x: 270, y: 250, width: 140, height: 70 }
    ]
  },
  hallway: {
    width: 1400,
    height: 520,
    wallHeight: 96,
    padding: 32,
    theme: 'hall',
    doors: [
      { x: 1250, y: 520 - 40, width: 68, height: 40, orientation: 'bottom', target: 'classroom', targetSpawn: { x: 340, y: 130 } },
      { x: 24, y: 220, width: 70, height: 84, orientation: 'left', target: 'lecture', targetSpawn: { x: 842, y: 224 } }
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
      { x: 870, y: 180, width: 64, height: 88, orientation: 'right', target: 'hallway', targetSpawn: { x: 122, y: 262 } }
    ],
    spawn: { x: 460, y: 520 },
    furniture: [
      // Whiteboard
      { type: 'whiteboard', x: 340, y: 30, width: 240, height: 60 },

      // Teacher desk
      { type: 'table', x: 400, y: 150, width: 120, height: 60 },

      // Rows of classroom desks with students
      { type: 'desk', variant: 'study', x: 180, y: 240, width: 70, height: 60 },
      { type: 'student', x: 203, y: 274, width: 24, height: 36, variant: 'boy', shirt: '#e57373', text: "Did you do the homework?" },

      { type: 'desk', variant: 'study', x: 340, y: 240, width: 70, height: 60 },
      { type: 'student', x: 363, y: 274, width: 24, height: 36, variant: 'girl', shirt: '#ba68c8', text: "I love this subject!" },

      { type: 'desk', variant: 'study', x: 500, y: 240, width: 70, height: 60 },
      { type: 'student', x: 523, y: 274, width: 24, height: 36, variant: 'boy', shirt: '#64b5f6', text: "Zzz..." },

      { type: 'desk', variant: 'study', x: 660, y: 240, width: 70, height: 60 },
      { type: 'student', x: 683, y: 274, width: 24, height: 36, variant: 'girl', shirt: '#81c784', text: "Professor is late." },

      { type: 'desk', variant: 'study', x: 180, y: 340, width: 70, height: 60 },
      { type: 'student', x: 203, y: 374, width: 24, height: 36, variant: 'girl', shirt: '#ffb74d', text: "Can I borrow a pen?" },

      { type: 'desk', variant: 'study', x: 340, y: 340, width: 70, height: 60 },
      { type: 'student', x: 363, y: 374, width: 24, height: 36, variant: 'boy', shirt: '#a1887f', text: "Focusing..." },

      { type: 'desk', variant: 'study', x: 500, y: 340, width: 70, height: 60 },
      { type: 'student', x: 523, y: 374, width: 24, height: 36, variant: 'girl', shirt: '#90a4ae', text: "..." },

      { type: 'desk', variant: 'study', x: 660, y: 340, width: 70, height: 60 },
      { type: 'student', x: 683, y: 374, width: 24, height: 36, variant: 'boy', shirt: '#7986cb', text: "When is lunch?" },

      // Back Row
      // Luke's Seat (Back Left) - Empty
      { type: 'desk', variant: 'study', x: 180, y: 440, width: 70, height: 60, id: 'player_seat' },

      { type: 'desk', variant: 'study', x: 340, y: 440, width: 70, height: 60 },
      { type: 'student', x: 363, y: 474, width: 24, height: 36, variant: 'boy', shirt: '#4db6ac', text: "Hey Luke!" },

      { type: 'desk', variant: 'study', x: 500, y: 440, width: 70, height: 60 },
      { type: 'student', x: 523, y: 474, width: 24, height: 36, variant: 'girl', shirt: '#f06292', text: "Nice weather today." },

      { type: 'desk', variant: 'study', x: 660, y: 440, width: 70, height: 60 },
      { type: 'student', x: 683, y: 474, width: 24, height: 36, variant: 'boy', shirt: '#9575cd', text: "I'm hungry." }
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
  walkFrame: 0,
  isSitting: false
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
    return { x: door.x + door.width / 2, y: door.y + door.height };
  }
  if (orientation === 'left') {
    return { x: door.x + door.width, y: door.y + door.height / 2 };
  }
  if (orientation === 'right') {
    return { x: door.x, y: door.y + door.height / 2 };
  }
  return { x: door.x + door.width / 2, y: door.y + door.height };
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
    // Windows and Rugs don't block movement
    if (item.type === 'window' || item.type === 'rug' || item.type === 'shelf') continue;

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
  if (player.isSitting) return;

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
    dorm: { wall: "#8d6e63", floor: "#3e2723", baseboard: "#281915", detail: "rgba(0,0,0,0.2)", pattern: 32, vertical: true },
    classroom: { wall: "#2c3e50", floor: "#e9e4d5", baseboard: "#1f2d3a", detail: "rgba(0,0,0,0.12)", pattern: 54, vertical: true }
  };

  const themeName = room.theme || 'dorm';
  const palette = themes[themeName] || themes.dorm;

  // Back Wall
  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, room.width, room.wallHeight);

  if (themeName === 'dorm') {
     ctx.fillStyle = "rgba(0,0,0,0.1)";
     for(let i=0; i<room.width; i+=24) {
         ctx.fillRect(i, 0, 1, room.wallHeight);
     }
  }

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
  } else if (orientation === 'left') {
      // Left wall door
      ctx.fillStyle = "#3a271f";
      ctx.fillRect(x - 4, y - 6, width + 8, height + 12);

      const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
      gradient.addColorStop(0, "#f6c453");
      gradient.addColorStop(1, "#d89c27");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x, y, width, 6);

      ctx.fillStyle = "#90caf9";
      ctx.fillRect(x + 10, y + 8, 14, height - 16);

      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height - 12, 4, 0, Math.PI * 2);
      ctx.fill();
  } else if (orientation === 'right') {
      // Right wall door
      ctx.fillStyle = "#3a271f";
      ctx.fillRect(x - 4, y - 6, width + 8, height + 12);

      const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
      gradient.addColorStop(0, "#d89c27");
      gradient.addColorStop(1, "#f6c453");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x + width - 6, y, 6, height);

      ctx.fillStyle = "#90caf9";
      ctx.fillRect(x + width - 24, y + 8, 14, height - 16);

      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(x + width / 2, y + 12, 4, 0, Math.PI * 2);
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
    // Legs
    ctx.fillStyle = "#3e2723";
    ctx.fillRect(item.x + 4, item.y + 10, 4, item.height - 10);
    ctx.fillRect(item.x + item.width - 8, item.y + 10, 4, item.height - 10);

    // Top
    ctx.fillStyle = "#6d4c41"; // Medium wood
    ctx.fillRect(item.x, item.y, item.width, item.height - 10);

    // Drawers on right side if wide enough
    if (item.width > 50) {
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(item.x + item.width - 20, item.y + 10, 18, 20);
        ctx.fillStyle = "#3e2723"; // Knob
        ctx.fillRect(item.x + item.width - 12, item.y + 18, 4, 4);
    }

    // Laptop
    if (item.hasLaptop) {
        ctx.fillStyle = "#cfd8dc"; // Silver
        ctx.fillRect(item.x + item.width/2 - 10, item.y + 5, 20, 12); // Screen
        ctx.fillStyle = "#b0bec5";
        ctx.fillRect(item.x + item.width/2 - 10, item.y + 17, 20, 8); // Base
        ctx.fillStyle = "#81d4fa"; // Screen glow
        ctx.fillRect(item.x + item.width/2 - 8, item.y + 7, 16, 8);
    }

    // Lamp
    if (item.hasLamp) {
         ctx.fillStyle = "#fff59d"; // Shade
         ctx.beginPath();
         ctx.moveTo(item.x + 10, item.y + 15);
         ctx.lineTo(item.x + 20, item.y + 15);
         ctx.lineTo(item.x + 15, item.y + 5);
         ctx.fill();
         ctx.fillStyle = "#3e2723"; // Stand
         ctx.fillRect(item.x + 14, item.y + 15, 2, 5);
    }
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
  // Headboard (Wood)
  ctx.fillStyle = "#5d4037"; // Dark wood
  ctx.fillRect(item.x, item.y, item.width, 12);

  // Footboard
  ctx.fillRect(item.x, item.y + item.height - 8, item.width, 8);

  // Mattress
  ctx.fillStyle = "#eceff1";
  ctx.fillRect(item.x + 4, item.y + 8, item.width - 8, item.height - 16);

  // Quilt (Blue Pattern)
  ctx.fillStyle = "#5c6bc0"; // Indigo/Blue
  ctx.fillRect(item.x + 4, item.y + 30, item.width - 8, item.height - 38);

  // Pattern on quilt (Diamonds/Checks)
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  for(let i=0; i<item.width-8; i+=10) {
      for(let j=0; j<item.height-38; j+=10) {
          if ((i+j)%20 === 0) ctx.fillRect(item.x + 4 + i, item.y + 30 + j, 5, 5);
      }
  }

  // Pillow
  ctx.fillStyle = "#fff";
  ctx.fillRect(item.x + 8, item.y + 12, item.width - 16, 15);
}

function drawCupboard(item) {
    // Body - Dark Wood
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Doors outline
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);

    // Middle split
    ctx.beginPath();
    ctx.moveTo(item.x + item.width / 2, item.y + 2);
    ctx.lineTo(item.x + item.width / 2, item.y + item.height - 2);
    ctx.stroke();

    // Panels on doors (inset)
    ctx.fillStyle = "#3e2723";
    // Left door panels
    ctx.fillRect(item.x + 6, item.y + 10, item.width/2 - 10, item.height/2 - 15);
    ctx.fillRect(item.x + 6, item.y + item.height/2 + 5, item.width/2 - 10, item.height/2 - 15);
    // Right door panels
    ctx.fillRect(item.x + item.width/2 + 4, item.y + 10, item.width/2 - 10, item.height/2 - 15);
    ctx.fillRect(item.x + item.width/2 + 4, item.y + item.height/2 + 5, item.width/2 - 10, item.height/2 - 15);

    // Knobs
    ctx.fillStyle = "#ffd54f"; // Gold
    ctx.beginPath();
    ctx.arc(item.x + item.width/2 - 4, item.y + item.height/2, 2, 0, Math.PI*2);
    ctx.arc(item.x + item.width/2 + 4, item.y + item.height/2, 2, 0, Math.PI*2);
    ctx.fill();
}

function drawChest(item) {
    // Large wooden chest
    ctx.fillStyle = "#5d4037"; // Wood
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Planks
    ctx.fillStyle = "#4e342e";
    for(let i=0; i<item.height; i+=12) {
        ctx.fillRect(item.x, item.y + i, item.width, 1);
    }

    // Metal banding
    ctx.fillStyle = "#3e2723"; // Darker bands
    ctx.fillRect(item.x + 10, item.y, 8, item.height);
    ctx.fillRect(item.x + item.width - 18, item.y, 8, item.height);

    // Lock
    ctx.fillStyle = "#263238"; // Dark metal
    ctx.fillRect(item.x + item.width/2 - 6, item.y + 10, 12, 14);
    ctx.fillStyle = "#78909c"; // Silver bit
    ctx.fillRect(item.x + item.width/2 - 2, item.y + 18, 4, 4);
}

function drawRug(item) {
    ctx.fillStyle = "#8d6e63"; // Beige/brownish
    if (item.color) ctx.fillStyle = item.color;
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Texture/Pattern
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=4; i<item.width; i+=4) {
        ctx.moveTo(item.x + i, item.y);
        ctx.lineTo(item.x + i, item.y + item.height);
    }
    ctx.stroke();
}

function drawShelf(item) {
    // Shelf board
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(item.x, item.y + item.height - 5, item.width, 5);

    // Books/Plants
    ctx.fillStyle = "#ef5350"; // Red book
    ctx.fillRect(item.x + 10, item.y + item.height - 20, 5, 15);
    ctx.fillStyle = "#42a5f5"; // Blue book
    ctx.fillRect(item.x + 16, item.y + item.height - 22, 6, 17);
    ctx.fillStyle = "#66bb6a"; // Green book
    ctx.fillRect(item.x + 24, item.y + item.height - 18, 4, 13);

    // Pot
    ctx.fillStyle = "#8d6e63";
    ctx.fillRect(item.x + item.width - 20, item.y + item.height - 15, 10, 10);
    // Plant
    ctx.fillStyle = "#66bb6a";
    ctx.beginPath();
    ctx.arc(item.x + item.width - 15, item.y + item.height - 20, 8, 0, Math.PI, true);
    ctx.fill();
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

function drawWhiteboard(item) {
    // Frame
    ctx.fillStyle = "#b0bec5";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    // Surface
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(item.x + 4, item.y + 4, item.width - 8, item.height - 8);

    // Tray
    ctx.fillStyle = "#90a4ae";
    ctx.fillRect(item.x + 2, item.y + item.height - 4, item.width - 4, 4);

    // Eraser/Marker
    ctx.fillStyle = "#37474f";
    ctx.fillRect(item.x + 40, item.y + item.height - 4, 10, 3);
    ctx.fillStyle = "#e53935";
    ctx.fillRect(item.x + 60, item.y + item.height - 4, 8, 2);
}

function drawStudent(item) {
    const baseY = item.y;
    const bob = Math.sin(Date.now() / 500 + (item.phase || 0)) * 2;
    const seatY = baseY - bob;

    const w = item.width || 24;
    const h = item.height || 36;
    const variant = item.variant || 'boy';
    const shirtColor = item.shirt || "#4caf50";

    // Seat shadow
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(item.x + 2, seatY + h - 4, w - 4, 4);

    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(item.x, seatY + 12, w, 14);

    // Legs (Sitting)
    ctx.fillStyle = "#3e2723";
    ctx.fillRect(item.x + 4, seatY + 26, 6, 8);
    ctx.fillRect(item.x + w - 10, seatY + 26, 6, 8);

    // Head
    ctx.fillStyle = "#f1c27d";
    ctx.fillRect(item.x + 2, seatY, w - 4, 12);

    // Hair
    ctx.fillStyle = "#4e342e";
    if (variant === 'girl') {
        ctx.fillRect(item.x, seatY, w, 6);
        ctx.fillRect(item.x, seatY, 4, 14);
        ctx.fillRect(item.x + w - 4, seatY, 4, 14);
    } else {
        ctx.fillRect(item.x, seatY, w, 4);
        ctx.fillRect(item.x, seatY, 4, 8);
        ctx.fillRect(item.x + w - 4, seatY, 4, 8);
    }

    // Eyes
    ctx.fillStyle = "#212121";
    ctx.fillRect(item.x + 6, seatY + 4, 2, 2);
    ctx.fillRect(item.x + w - 8, seatY + 4, 2, 2);
}

function drawFurnitureItem(item) {
    if (item.type === 'desk') drawDesk(item);
    else if (item.type === 'table') drawTable(item);
    else if (item.type === 'bed') drawBed(item);
    else if (item.type === 'cupboard') drawCupboard(item);
    else if (item.type === 'locker') drawLocker(item);
    else if (item.type === 'window') drawWindow(item);
    else if (item.type === 'student') drawStudent(item);
    else if (item.type === 'chest') drawChest(item);
    else if (item.type === 'rug') drawRug(item);
    else if (item.type === 'shelf') drawShelf(item);
    else if (item.type === 'whiteboard') drawWhiteboard(item);
}

function drawPlayer(x, y) {
  const w = 24;
  const h = 36;

  const skinColor = "#ffcc80";
  const shirtColor = "#4caf50";
  const stripeColor = "#ffeb3b";
  const pantsColor = "#3e2723";
  const hairColor = "#5d4037";
  const eyeColor = "#333";

  ctx.save();

  if (player.isSitting) {
      const px = x - w / 2;
      const py = y - h;

      // Seat shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(px + 2, py + h - 4, w - 4, 4);

      // Body
      ctx.fillStyle = shirtColor;
      ctx.fillRect(px, py + 12, w, 14);
      ctx.fillStyle = stripeColor;
      ctx.fillRect(px, py + 18, w, 4);

      // Legs (Sitting)
      ctx.fillStyle = pantsColor;
      ctx.fillRect(px + 4, py + 26, 6, 8);
      ctx.fillRect(px + w - 10, py + 26, 6, 8);

      // Head (Back view)
      ctx.fillStyle = skinColor;
      ctx.fillRect(px + 2, py, w - 4, 12);

      // Hair
      ctx.fillStyle = hairColor;
      ctx.fillRect(px, py, w, 8);
      ctx.fillRect(px + 2, py + 8, w - 4, 4);

      ctx.restore();
      return;
  }

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

  // Shadow (stays on ground, doesn't bob)
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, w / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

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

  // Draw rugs first (always on floor)
  room.furniture.filter(i => i.type === 'rug').forEach(drawFurnitureItem);

  drawDoors();

  const renderList = [];
  renderList.push({
    y: player.y,
    draw: () => drawPlayer(player.x, player.y)
  });

  room.furniture.forEach(item => {
    if (item.type === 'rug') return; // Handled separately

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
    if (player.isSitting) {
        player.isSitting = false;
        player.y += 10; // Step out
        return;
    }

    const nearStudent = findNearbyFurniture(['student'], 40);
    if (nearStudent && nearStudent.text) {
        showLukeLine(nearStudent.text); // Actually should show student name or just text
        // For now using showLukeLine but changing label to 'Student' would be better
        // But showLukeLine hardcodes LUKE.
        // I will just use updateDialogue for custom speaker if needed, but existing showLukeLine is convenient for temporary text.
        // Let's modify showLukeLine slightly or just use it as is (Luke thinking about what they said? No.)

        // Let's implement a proper speech bubble or reuse dialogue box with 'Student'
        dialogueBox.hidden = false;
        dialogueLine.textContent = nearStudent.text;
        dialogueLabel.textContent = "STUDENT";
        dialogueLabel.classList.remove("dialogue__label--hidden");
        dialoguePrompt.textContent = "";
        dialogueBox.classList.add("dialogue--active");
        dialogueBox.classList.remove("dialogue--hidden");

        if (tempDialogueTimeout) clearTimeout(tempDialogueTimeout);
        tempDialogueTimeout = setTimeout(() => {
            tempDialogueTimeout = null;
            updateDialogue();
        }, 2000);
        return;
    }

    // Check for Luke's seat
    const desks = room.furniture.filter(f => f.type === 'desk');
    for (const desk of desks) {
        if (desk.id === 'player_seat') {
            const dist = Math.hypot(player.x - (desk.x + desk.width/2), player.y - (desk.y + desk.height));
            if (dist < 50) {
                player.isSitting = true;
                player.x = desk.x + 23 + 12; // desk.x + 23 (student left) + 12 (center)
                player.y = desk.y + 34 + 36; // desk.y + studentYOffset + height
                player.facing = 'up';
                return;
            }
        }
    }

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
