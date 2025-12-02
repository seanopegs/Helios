const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const dialogueBox = document.getElementById("dialogue");
const dialogueLabel = document.getElementById("dialogue-label");
const dialogueLine = document.getElementById("dialogue-line");
const dialoguePrompt = document.getElementById("dialogue-prompt");

let dialogue = JSON.parse(JSON.stringify(window.initialGameData.dialogue));
let levels = JSON.parse(JSON.stringify(window.initialGameData.levels));
let isDeveloperMode = false;

let stage = 0;
let isHintActive = false;
const keys = new Set();
const camera = { x: 0, y: 0 };

let currentLevelName = 'classroom';
let room = levels[currentLevelName];

// Dev Mode State
let selectedObject = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

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

function loadLevel(name, targetDoorId) {
  if (!levels[name]) return;
  currentLevelName = name;
  room = levels[name];

  let spawned = false;
  if (targetDoorId) {
      const targetDoor = (room.doors || []).find(d => d.id === targetDoorId);
      if (targetDoor) {
          const spawn = doorAttachmentPoint(targetDoor);
          // Offset slightly so player isn't inside door
          player.x = spawn.x;
          player.y = spawn.y + 10;
          if (targetDoor.orientation === 'bottom') player.y = targetDoor.y - 24;
          else if (targetDoor.orientation === 'left') player.x = targetDoor.x + targetDoor.width + 12;
          else if (targetDoor.orientation === 'right') player.x = targetDoor.x - 12;
          spawned = true;
      }
  }

  if (!spawned) {
      player.x = room.spawn.x;
      player.y = room.spawn.y;
  }

  camera.x = 0;
  camera.y = 0;

  let title = "Helios - Luke's Room";
  if (name === 'lecture') title = "Helios - Classroom";
  else if (name === 'hallway') title = "Helios - Student Hallway";
  document.title = title;

  updateDevRoomSelect();
}

function updateDevRoomSelect() {
  const select = document.getElementById("dev-room-select");
  if (!select) return;
  select.innerHTML = "";
  Object.keys(levels).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    if (key === currentLevelName) option.selected = true;
    select.appendChild(option);
  });
}

document.getElementById("dev-room-select").addEventListener("change", (e) => {
    // Save current player pos if needed or just switch
    loadLevel(e.target.value);
});

document.getElementById("dev-add-room").addEventListener("click", () => {
    const name = prompt("Enter new room name:");
    if (name && !levels[name]) {
        levels[name] = {
            width: 800,
            height: 600,
            wallHeight: 96,
            padding: 32,
            theme: 'dorm',
            doors: [],
            spawn: { x: 400, y: 300 },
            furniture: []
        };
        updateDevRoomSelect();
        loadLevel(name);
    } else if (levels[name]) {
        alert("Room already exists!");
    }
});


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
  const camTargetY = player.y - canvas.height / 2;

  // Clamp
  const maxCamX = Math.max(0, room.width - canvas.width);
  const maxCamY = Math.max(0, room.height - canvas.height);

  camera.x = Math.max(0, Math.min(camTargetX, maxCamX));
  camera.y = Math.max(0, Math.min(camTargetY, maxCamY));
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
    if (item.textureData) {
        // Draw Custom Texture
        const img = new Image();
        img.src = item.textureData;
        // Since loading is async, this might blink on first frame.
        // Ideally we pre-load, but for this simple tool we rely on browser cache or immediate data-uri decode.
        // Actually, drawing an image created every frame is bad.
        // We should cache the image object on the item.
        if (!item._cachedImage) {
            item._cachedImage = new Image();
            item._cachedImage.src = item.textureData;
        }
        if (item._cachedImage.complete) {
             ctx.drawImage(item._cachedImage, item.x, item.y, item.width, item.height);
        } else {
             // Fallback while loading
             ctx.fillStyle = "#ccc";
             ctx.fillRect(item.x, item.y, item.width, item.height);
        }
        return;
    }

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
    else {
        // Fallback for custom/unknown objects
        ctx.fillStyle = "#e91e63"; // Magenta for visibility
        ctx.fillRect(item.x, item.y, item.width, item.height);
        ctx.fillStyle = "white";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(item.type, item.x + item.width/2, item.y + item.height/2);
    }
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
  drawDevOverlay();
}

function drawDevOverlay() {
    if (!isDeveloperMode) return;
    if (selectedObject) {
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.strokeRect(selectedObject.x - camera.x, selectedObject.y - camera.y, selectedObject.width, selectedObject.height);
    }
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
        dialogueLabel.textContent = nearStudent.name || "STUDENT";
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
        // Prefer ID-based targeting, fall back to spawn coords if legacy
        if (door.targetDoorId) {
            loadLevel(door.target, door.targetDoorId);
        } else {
            // Legacy/Manual override
            loadLevel(door.target, null);
            if (door.targetSpawn) {
                player.x = door.targetSpawn.x;
                player.y = door.targetSpawn.y;
            }
        }
    }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d"].includes(key)) {
    keys.add(key);
  }
  if (key === " " && !isDeveloperMode) {
      handleInteraction();
  }
  if (isDeveloperMode && (key === 'delete' || key === 'backspace')) {
      if (selectedObject) deleteObject();
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key);
});

// Dev Mode Mouse Handling
canvas.addEventListener("mousedown", (e) => {
  if (!isDeveloperMode) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left + camera.x;
  const my = e.clientY - rect.top + camera.y;

  // Check furniture
  // Search in reverse order (topmost first)
  const items = [...room.furniture].reverse();
  for (const item of items) {
      if (mx >= item.x && mx <= item.x + item.width &&
          my >= item.y && my <= item.y + item.height) {
          selectedObject = item;
          isDragging = true;
          dragOffset.x = mx - item.x;
          dragOffset.y = my - item.y;
          updatePropPanel();
          return;
      }
  }

  // Check doors
  const doors = getDoors();
  for (const door of doors) {
      if (mx >= door.x && mx <= door.x + door.width &&
          my >= door.y && my <= door.y + door.height) {
          selectedObject = door;
          selectedObject.type = 'door'; // Tag it as door for props
          isDragging = true;
          dragOffset.x = mx - door.x;
          dragOffset.y = my - door.y;
          updatePropPanel();
          return;
      }
  }

  // Clicked empty space
  selectedObject = null;
  document.getElementById("dev-props").classList.add("hidden");
});

// Handle Spawn Setting Click
canvas.addEventListener("click", (e) => {
    if (isSettingSpawn && doorToSetSpawn) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left + camera.x;
        const my = e.clientY - rect.top + camera.y;

        doorToSetSpawn.targetSpawn = { x: Math.round(mx), y: Math.round(my) };

        isSettingSpawn = false;
        doorToSetSpawn = null;

        const instr = document.getElementById("spawn-instruction");
        if (instr) instr.remove();

        alert("Spawn point set!");
    }
});

// Texture Editor Logic
const paintCanvas = document.getElementById("paint-canvas");
const paintCtx = paintCanvas.getContext("2d");
let isPainting = false;

// Initialize blank
paintCtx.fillStyle = "white";
paintCtx.fillRect(0, 0, 64, 64);

document.getElementById("dev-edit-texture").addEventListener("click", () => {
    if (!selectedObject) return;
    document.getElementById("texture-editor").classList.remove("hidden");

    // Load existing texture or clear
    if (selectedObject.textureData) {
        const img = new Image();
        img.onload = () => {
             paintCtx.drawImage(img, 0, 0, 64, 64);
        };
        img.src = selectedObject.textureData;
    } else {
        paintCtx.fillStyle = "white";
        paintCtx.fillRect(0, 0, 64, 64);
    }
});

document.getElementById("paint-cancel").addEventListener("click", () => {
    document.getElementById("texture-editor").classList.add("hidden");
});

document.getElementById("paint-clear").addEventListener("click", () => {
    paintCtx.fillStyle = "white";
    paintCtx.fillRect(0, 0, 64, 64);
});

document.getElementById("paint-save").addEventListener("click", () => {
    if (selectedObject) {
        selectedObject.textureData = paintCanvas.toDataURL();
        // Clear cache so it redraws
        selectedObject._cachedImage = null;
    }
    document.getElementById("texture-editor").classList.add("hidden");
});

// Painting interaction
paintCanvas.addEventListener("mousedown", () => isPainting = true);
paintCanvas.addEventListener("mouseup", () => isPainting = false);
paintCanvas.addEventListener("mouseleave", () => isPainting = false);

paintCanvas.addEventListener("mousemove", (e) => {
    if (!isPainting) return;
    const rect = paintCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / 64));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / 64));

    paintCtx.fillStyle = document.getElementById("paint-color").value;
    paintCtx.fillRect(x, y, 1, 1);
});

canvas.addEventListener("mousemove", (e) => {
    if (!isDeveloperMode || !isDragging || !selectedObject) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + camera.x;
    const my = e.clientY - rect.top + camera.y;

    selectedObject.x = Math.round(mx - dragOffset.x);
    selectedObject.y = Math.round(my - dragOffset.y);
    updatePropPanel(); // Update input values while dragging
});

canvas.addEventListener("mouseup", () => {
    isDragging = false;
});

function updatePropPanel() {
    if (!selectedObject) return;
    const p = document.getElementById("dev-props");
    p.classList.remove("hidden");

    document.getElementById("prop-x").value = selectedObject.x;
    document.getElementById("prop-y").value = selectedObject.y;
    document.getElementById("prop-w").value = selectedObject.width;
    document.getElementById("prop-h").value = selectedObject.height;

    const extra = document.getElementById("prop-extra");
    extra.innerHTML = "";

    // Type is always editable now
    addPropInput(extra, "Type", selectedObject.type, v => selectedObject.type = v);

    // Add specific fields
    if (selectedObject.type === 'student') {
        addPropInput(extra, "Name", selectedObject.name || 'STUDENT', v => selectedObject.name = v);
        addPropInput(extra, "Variant", selectedObject.variant || 'boy', v => selectedObject.variant = v);
        addPropInput(extra, "Shirt", selectedObject.shirt || '#000', v => selectedObject.shirt = v);
        addPropInput(extra, "Text", selectedObject.text || '', v => selectedObject.text = v);
    } else if (selectedObject.type === 'door') {
        addPropInput(extra, "ID", selectedObject.id || '', v => selectedObject.id = v);
        addPropInput(extra, "Target Room", selectedObject.target || '', v => selectedObject.target = v);
        addPropInput(extra, "Target Door ID", selectedObject.targetDoorId || '', v => selectedObject.targetDoorId = v);

        // Orientation dropdown
        const div = document.createElement("div");
        div.className = "dev-prop-row";
        div.innerHTML = `<label>Dir:</label> <select id="prop-door-dir">
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
        </select>`;
        extra.appendChild(div);
        const sel = div.querySelector("select");
        sel.value = selectedObject.orientation || 'top';
        sel.onchange = (e) => selectedObject.orientation = e.target.value;

        // Spawn setter (Manual Override)
        const btn = document.createElement("button");
        btn.className = "dev-btn-small";
        btn.textContent = "Set Manual Spawn";
        btn.onclick = () => startSetSpawn(selectedObject);
        extra.appendChild(btn);
    } else if (selectedObject.type === 'rug') {
        addPropInput(extra, "Color", selectedObject.color || '#fff', v => selectedObject.color = v);
    }

    if (selectedObject.id !== undefined || selectedObject.type === 'desk') {
        addPropInput(extra, "ID", selectedObject.id || '', v => selectedObject.id = v);
    }
}

function addPropInput(container, label, value, onChange) {
    const div = document.createElement("div");
    div.className = "dev-prop-row";
    div.innerHTML = `<label style="width:50px">${label}</label> <input type="text" value="${value}">`;
    container.appendChild(div);
    div.querySelector("input").onchange = (e) => onChange(e.target.value);
}

let isSettingSpawn = false;
let doorToSetSpawn = null;

function startSetSpawn(door) {
    if (!door.target) {
        alert("Please set a Target Room first");
        return;
    }
    if (!levels[door.target]) {
        alert("Target Room does not exist");
        return;
    }

    // Switch to target room
    loadLevel(door.target);
    isSettingSpawn = true;
    doorToSetSpawn = door;

    // Show instruction
    const h1 = document.createElement("div");
    h1.id = "spawn-instruction";
    h1.style.position = "absolute";
    h1.style.top = "50%";
    h1.style.left = "50%";
    h1.style.transform = "translate(-50%, -50%)";
    h1.style.background = "rgba(0,0,0,0.8)";
    h1.style.padding = "20px";
    h1.style.color = "white";
    h1.style.pointerEvents = "none";
    h1.textContent = "Click anywhere to set spawn point";
    document.querySelector(".frame").appendChild(h1);
}

// Property Inputs Event Listeners (Global x/y/w/h)
['x', 'y', 'w', 'h'].forEach(key => {
    document.getElementById(`prop-${key}`).addEventListener("change", (e) => {
        if (selectedObject) {
            const val = parseInt(e.target.value);
            if (key === 'x') selectedObject.x = val;
            if (key === 'y') selectedObject.y = val;
            if (key === 'w') selectedObject.width = val;
            if (key === 'h') selectedObject.height = val;
        }
    });
});

document.getElementById("dev-delete-obj").addEventListener("click", deleteObject);

function deleteObject() {
    if (!selectedObject) return;
    if (selectedObject.type === 'door') {
        room.doors = room.doors.filter(d => d !== selectedObject);
    } else {
        room.furniture = room.furniture.filter(f => f !== selectedObject);
    }
    selectedObject = null;
    document.getElementById("dev-props").classList.add("hidden");
}

document.getElementById("dev-add-obj").addEventListener("click", () => {
    const type = document.getElementById("dev-obj-type").value;
    let obj = { x: camera.x + 340, y: camera.y + 260, width: 40, height: 40, type: type };

    // Defaults
    if (type === 'door') {
        obj.width = 64; obj.height = 80; obj.orientation = 'top';
        if (!room.doors) room.doors = [];
        room.doors.push(obj);
    } else {
        if (type === 'student') { obj.width = 24; obj.height = 36; obj.variant = 'boy'; obj.text = 'Hello'; }
        if (type === 'desk') { obj.width = 70; obj.height = 60; }
        if (type === 'rug') { obj.width = 80; obj.height = 120; }
        if (type === 'bed') { obj.width = 60; obj.height = 100; }
        room.furniture.push(obj);
    }
    selectedObject = obj;
    updatePropPanel();
});

canvas.addEventListener("click", advanceDialogue);

function startGame() {
  document.getElementById("start-screen").style.display = "none";
  updateDialogue();
  loop();
}

// Auto-load external JSON if present
async function loadExternalData() {
    try {
        const response = await fetch('game-data.json');
        if (response.ok) {
            const data = await response.json();
            if (data.levels && data.dialogue) {
                levels = data.levels;
                dialogue = data.dialogue;

                // Refresh state
                currentLevelName = Object.keys(levels)[0] || 'classroom';
                room = levels[currentLevelName];
                updateDevRoomSelect();
                console.log("Auto-loaded game-data.json");
            }
        }
    } catch (e) {
        console.log("No external game-data.json found, using defaults.");
    }
}

// Run auto-load immediately
loadExternalData();

document.getElementById("btn-play").addEventListener("click", () => {
  isDeveloperMode = false;
  startGame();
});

document.getElementById("btn-dev").addEventListener("click", () => {
  isDeveloperMode = true;
  document.getElementById("dev-sidebar").classList.remove("hidden");
  updateDevRoomSelect(); // Ensure list is populated
  startGame();
});

// Save JSON
document.getElementById("dev-save").addEventListener("click", async () => {
  const data = {
    levels: levels,
    dialogue: dialogue
  };
  const jsonString = JSON.stringify(data, null, 2);

  // Try File System Access API
  if (window.showSaveFilePicker) {
      try {
          const handle = await window.showSaveFilePicker({
              suggestedName: 'game-data.json',
              types: [{
                  description: 'JSON File',
                  accept: {'application/json': ['.json']},
              }],
          });
          const writable = await handle.createWritable();
          await writable.write(jsonString);
          await writable.close();
          alert("Saved successfully!");
          return;
      } catch (err) {
          if (err.name !== 'AbortError') {
              console.error(err);
              alert("Error saving file via API. Falling back to download.");
          } else {
              return; // User cancelled
          }
      }
  }

  // Fallback
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "game-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

// Load JSON
document.getElementById("dev-load").addEventListener("click", () => {
  document.getElementById("dev-load-input").click();
});

document.getElementById("dev-load-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.levels && data.dialogue) {
        levels = data.levels;
        dialogue = data.dialogue;
        loadLevel(currentLevelName); // Reload current level
        alert("Game data loaded successfully!");
      } else {
        alert("Invalid game data file.");
      }
    } catch (err) {
      alert("Error parsing JSON");
    }
  };
  reader.readAsText(file);
});
