const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const dialogueBox = document.getElementById("dialogue");
const dialogueLabel = document.getElementById("dialogue-label");
const dialogueLine = document.getElementById("dialogue-line");
const dialoguePrompt = document.getElementById("dialogue-prompt");

let introDialogue = JSON.parse(JSON.stringify(window.initialGameData.dialogue));
let dialogue = [];
let levels = JSON.parse(JSON.stringify(window.initialGameData.levels));
let isDeveloperMode = false;
let isGameActive = false;

// Play Data (Runtime State)
let playData = {
    player: { x: 0, y: 0, room: 'classroom', facing: 'down' },
    worldState: {},
    inventory: [],
    introSeen: false
};

let stage = 0;
let isHintActive = false;
const keys = new Set();
const camera = { x: 0, y: 0, zoom: 1 };

let currentLevelName = 'classroom';
let room = levels[currentLevelName];

// Dev Mode State
let selectedObject = null;
let isDragging = false;
let isDraggingSpawn = false;
let isDraggingInteraction = false;
let resizeHandle = null;
let dragOffset = { x: 0, y: 0 };

let cutscene = null;
let globalDarkness = 0;
let particles = [];
let screenShake = 0;

// Player object
const player = {
  x: 0,
  y: 0,
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

  // Horror Mode Hallway Changes
  if (name === 'hallway' && playData.worldState.horrorActive && !room.isHorrorified) {
       room.isHorrorified = true;

       // Mess up furniture
       room.furniture.forEach(item => {
           if (item.type === 'locker' || item.type === 'window') {
               item.x += (Math.random() - 0.5) * 60;
               item.y += (Math.random() - 0.5) * 30;
           }
       });

       // Spawn Panic Students
       for (let i = 0; i < 15; i++) {
           room.furniture.push({
               type: 'student',
               x: 100 + Math.random() * 1200,
               y: 100 + Math.random() * 300,
               width: 24,
               height: 36,
               variant: Math.random() > 0.5 ? 'boy' : 'girl',
               shirt: '#' + Math.floor(Math.random()*16777215).toString(16),
               vx: (Math.random() - 0.5) * 10,
               vy: (Math.random() - 0.5) * 10
           });
       }

       // Add Principal Door
       if (!room.doors.find(d => d.target === 'principal_office')) {
           room.doors.push({
              id: 'door_hall_to_principal',
              x: 1340, y: 220, width: 54, height: 90,
              orientation: 'right',
              target: 'principal_office',
              targetDoorId: 'door_principal_to_hall'
           });
       }
  }

  if (!isDeveloperMode) {
      playData.player.room = name;
  }

  let spawned = false;
  if (targetDoorId) {
      const targetDoor = (room.doors || []).find(d => d.id === targetDoorId);
      if (targetDoor) {
          if (targetDoor.customSpawn) {
              player.x = targetDoor.customSpawn.x;
              player.y = targetDoor.customSpawn.y;
          } else {
              const spawn = doorAttachmentPoint(targetDoor);
              player.x = spawn.x;
              player.y = spawn.y + 10;
              if (targetDoor.orientation === 'bottom') player.y = targetDoor.y - 24;
              else if (targetDoor.orientation === 'left') player.x = targetDoor.x + targetDoor.width + 12;
              else if (targetDoor.orientation === 'right') player.x = targetDoor.x - 12;
          }
          spawned = true;
      }
  }

  if (!spawned) {
      if (room.spawn && typeof room.spawn.x === 'number' && typeof room.spawn.y === 'number') {
          player.x = room.spawn.x;
          player.y = room.spawn.y;
      } else {
          player.x = room.width / 2;
          player.y = room.height / 2;
      }
  }

  if (!isFinite(player.x)) player.x = 100;
  if (!isFinite(player.y)) player.y = 100;

  if (!isDeveloperMode && isGameActive) {
      playData.player.x = player.x;
      playData.player.y = player.y;
      playData.player.facing = player.facing;
      savePlayState();
  }

  camera.x = 0;
  camera.y = 0;
  handleMovement();

  let title = "Helios - Luke's Room";
  if (name === 'lecture') title = "Helios - Classroom";
  else if (name === 'hallway') title = "Helios - Student Hallway";
  document.title = title;

  if (isDeveloperMode) updateDevRoomSelect();
}

function normalizeGameData(data) {
    if (!data.levels) return;
    Object.values(data.levels).forEach(level => {
        if (level.doors) {
            level.doors.forEach(door => {
                if (door.priority === undefined) door.priority = 1;
            });
        }
        if (!level.furniture) return;
        level.furniture.forEach(item => {
            if (!item.interaction) {
                 if (item.type === 'student' && item.text) {
                     item.interaction = {
                         enabled: true,
                         type: 'sequence',
                         conversations: [
                             [{ speaker: item.name || 'STUDENT', text: item.text }]
                         ],
                         area: { x: -10, y: item.height, width: item.width + 20, height: 40 }
                     };
                 } else if (item.type === 'bed') {
                    item.interaction = { enabled: true, type: 'sequence', conversations: [[{ speaker: 'LUKE', text: "it's not the right time to sleep" }]], area: { x: -5, y: -5, width: item.width + 10, height: item.height + 10 } };
                 } else if (item.type === 'cupboard') {
                     item.interaction = { enabled: true, type: 'sequence', conversations: [[{ speaker: 'LUKE', text: "why?" }]], area: { x: -5, y: -5, width: item.width + 10, height: item.height + 10 } };
                 }
            }
            if (item.interaction) {
                if (item.interaction.priority === undefined) item.interaction.priority = 1;
            }
        });
    });
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
    dialogueLine.textContent = entry.text;
    const hasSpeaker = Boolean(entry.speaker);
    dialogueLabel.textContent = entry.speaker || "";
    dialogueLabel.classList.toggle("dialogue__label--hidden", !hasSpeaker);
    dialoguePrompt.textContent = stage < dialogue.length - 1 ? "Click anywhere" : "";
    dialogueBox.classList.add("dialogue--active");
    dialogueBox.classList.remove("dialogue--hidden");
  } else {
    dialogueBox.classList.remove("dialogue--active");
    dialogueBox.classList.add("dialogue--hidden");
    if (!playData.introSeen && dialogue.length > 0) {
        playData.introSeen = true;
        savePlayState();
    }
    if (window.onDialogueEnd) {
        window.onDialogueEnd();
        window.onDialogueEnd = null;
    }
  }
}

function showTemporaryDialogue(text, speaker = "LUKE") {
  if (tempDialogueTimeout) {
    clearTimeout(tempDialogueTimeout);
    tempDialogueTimeout = null;
  }
  dialogueLine.textContent = text;
  dialogueLabel.textContent = speaker;
  dialogueLabel.classList.remove("dialogue__label--hidden");
  dialoguePrompt.textContent = "";
  dialogueBox.classList.add("dialogue--active");
  dialogueBox.classList.remove("dialogue--hidden");

  tempDialogueTimeout = setTimeout(() => {
    tempDialogueTimeout = null;
    updateDialogue();
  }, 2000);
}

function showLukeLine(text) {
  showTemporaryDialogue(text, "LUKE");
}

function checkCollision(x, y) {
  const half = player.size / 2;

  if (x - half < room.padding) return true;
  if (x + half > room.width - room.padding) return true;
  if (y - half < room.wallHeight) return true;
  if (y + half > room.height - room.padding) return true;

  for (const item of room.furniture) {
    const hasCustom = !!item.collisionRect;
    if (!hasCustom && (item.type === 'window' || item.type === 'rug' || item.type === 'shelf' || item.type === 'zone' || item.type === 'student' || item.type === 'teacher')) continue;

    let dLeft, dTop, dWidth, dHeight;

    if (hasCustom) {
        dLeft = item.x + item.collisionRect.x;
        dTop = item.y + item.collisionRect.y;
        dWidth = item.collisionRect.width;
        dHeight = item.collisionRect.height;
    } else {
        dLeft = item.x;
        dTop = item.y;
        dWidth = item.width;
        dHeight = item.height;
    }

    const dRight = dLeft + dWidth;
    const dBottom = dTop + dHeight;

    if (x + half > dLeft && x - half < dRight &&
        y + half > dTop && y - half < dBottom) {
      return true;
    }
  }

  return false;
}

function handleMovement() {
  const inputBlocked = (dialogueBox.classList.contains("dialogue--active") && !isHintActive) ||
                       player.isSitting ||
                       (cutscene && cutscene.active);

  if (!inputBlocked) {
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

        if (!isDeveloperMode) {
            playData.player.x = player.x;
            playData.player.y = player.y;
            playData.player.facing = player.facing;
        }

        checkAutoTriggers();
    } else {
        player.walkFrame = 0;
    }
  }

  let targetX = player.x;
  let targetY = player.y;

  if (cutscene && cutscene.active && cutscene.focus) {
      targetX = cutscene.focus.x + (cutscene.focus.width || 0) / 2;
      targetY = cutscene.focus.y + (cutscene.focus.height || 0) / 2;
  }

  const camTargetX = targetX - canvas.width / 2;
  const camTargetY = targetY - canvas.height / 2;

  if (cutscene && cutscene.active) {
       camera.x = camTargetX;
       camera.y = camTargetY;
  } else {
       const maxCamX = Math.max(0, room.width - canvas.width);
       const maxCamY = Math.max(0, room.height - canvas.height);
       camera.x = Math.max(0, Math.min(camTargetX, maxCamX));
       camera.y = Math.max(0, Math.min(camTargetY, maxCamY));
  }

  if (!isFinite(camera.x)) camera.x = 0;
  if (!isFinite(camera.y)) camera.y = 0;
}

function drawRoom() {
  const themes = {
    hall: { wall: "#3f5765", floor: "#cfd8dc", baseboard: "#1c262f", detail: "#b0bec5", pattern: 64, vertical: true },
    dorm: { wall: "#8d6e63", floor: "#3e2723", baseboard: "#281915", detail: "rgba(0,0,0,0.2)", pattern: 32, vertical: true },
    classroom: { wall: "#2c3e50", floor: "#e9e4d5", baseboard: "#1f2d3a", detail: "rgba(0,0,0,0.12)", pattern: 54, vertical: true }
  };
  const themeName = room.theme || 'dorm';
  const palette = themes[themeName] || themes.dorm;

  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, room.width, room.wallHeight);

  if (themeName === 'dorm') {
     ctx.fillStyle = "rgba(0,0,0,0.1)";
     for(let i=0; i<room.width; i+=24) {
         ctx.fillRect(i, 0, 1, room.wallHeight);
     }
  }

  ctx.fillStyle = palette.floor;
  ctx.fillRect(0, room.wallHeight, room.width, room.height - room.wallHeight);

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

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, room.padding, room.height);
  ctx.fillRect(room.width - room.padding, 0, room.padding, room.height);
  ctx.fillRect(0, room.height - room.padding, room.width, room.padding);

  ctx.fillStyle = palette.baseboard;
  ctx.fillRect(room.padding, room.wallHeight - 12, room.width - room.padding * 2, 12);
}

function drawDoor(door, targetCtx = ctx) {
  const { x, y, width, height } = door;
  const orientation = door.orientation || (y > room.height / 2 ? 'bottom' : 'top');

  if (orientation === 'bottom') {
      targetCtx.fillStyle = "#2d1e19";
      targetCtx.fillRect(x - 6, y - 4, width + 12, height + 6);
      const gradient = targetCtx.createLinearGradient(0, y, 0, y + height);
      gradient.addColorStop(0, "#5d4037");
      gradient.addColorStop(1, "#3e2723");
      targetCtx.fillStyle = gradient;
      targetCtx.fillRect(x, y, width, height);
      targetCtx.fillStyle = "#90a4ae";
      targetCtx.fillRect(x + 10, y + 8, width - 20, 10);
      targetCtx.fillStyle = "#f0c419";
      targetCtx.beginPath();
      targetCtx.arc(x + width - 12, y + height / 2, 4, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.fillStyle = "#6d4c41";
      targetCtx.fillRect(x - 4, y + height - 8, width + 8, 10);
  } else if (orientation === 'left') {
      targetCtx.fillStyle = "#3a271f";
      targetCtx.fillRect(x - 4, y - 6, width + 8, height + 12);
      const gradient = targetCtx.createLinearGradient(x, 0, x + width, 0);
      gradient.addColorStop(0, "#f6c453");
      gradient.addColorStop(1, "#d89c27");
      targetCtx.fillStyle = gradient;
      targetCtx.fillRect(x, y, width, height);
      targetCtx.fillStyle = "rgba(0,0,0,0.2)";
      targetCtx.fillRect(x, y, width, 6);
      targetCtx.fillStyle = "#90caf9";
      targetCtx.fillRect(x + 10, y + 8, 14, height - 16);
      targetCtx.fillStyle = "#333";
      targetCtx.beginPath();
      targetCtx.arc(x + width / 2, y + height - 12, 4, 0, Math.PI * 2);
      targetCtx.fill();
  } else if (orientation === 'right') {
      targetCtx.fillStyle = "#3a271f";
      targetCtx.fillRect(x - 4, y - 6, width + 8, height + 12);
      const gradient = targetCtx.createLinearGradient(x, 0, x + width, 0);
      gradient.addColorStop(0, "#d89c27");
      gradient.addColorStop(1, "#f6c453");
      targetCtx.fillStyle = gradient;
      targetCtx.fillRect(x, y, width, height);
      targetCtx.fillStyle = "rgba(0,0,0,0.2)";
      targetCtx.fillRect(x + width - 6, y, 6, height);
      targetCtx.fillStyle = "#90caf9";
      targetCtx.fillRect(x + width - 24, y + 8, 14, height - 16);
      targetCtx.fillStyle = "#333";
      targetCtx.beginPath();
      targetCtx.arc(x + width / 2, y + 12, 4, 0, Math.PI * 2);
      targetCtx.fill();
  } else {
      targetCtx.fillStyle = "#3a271f";
      targetCtx.fillRect(x - 6, y - 6, width + 12, height + 10);
      const gradient = targetCtx.createLinearGradient(0, y, 0, y + height);
      gradient.addColorStop(0, "#f6c453");
      gradient.addColorStop(1, "#d89c27");
      targetCtx.fillStyle = gradient;
      targetCtx.fillRect(x, y, width, height);
      targetCtx.fillStyle = "rgba(0,0,0,0.2)";
      targetCtx.fillRect(x, y, 6, height);
      targetCtx.fillStyle = "#90caf9";
      targetCtx.fillRect(x + 8, y + 10, width - 16, 14);
      targetCtx.fillStyle = "#333";
      targetCtx.beginPath();
      targetCtx.arc(x + width - 12, y + height / 2, 4, 0, Math.PI * 2);
      targetCtx.fill();
  }
}

function drawDoors() {
  getDoors().forEach(d => drawDoor(d, ctx));
}

function drawDesk(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(item.x + 4, item.y + 10, 4, item.height - 10);
    targetCtx.fillRect(item.x + item.width - 8, item.y + 10, 4, item.height - 10);
    targetCtx.fillStyle = "#6d4c41";
    targetCtx.fillRect(item.x, item.y, item.width, item.height - 10);
    if (item.width > 50) {
        targetCtx.fillStyle = "#5d4037";
        targetCtx.fillRect(item.x + item.width - 20, item.y + 10, 18, 20);
        targetCtx.fillStyle = "#3e2723";
        targetCtx.fillRect(item.x + item.width - 12, item.y + 18, 4, 4);
    }
    if (item.hasLaptop) {
        targetCtx.fillStyle = "#cfd8dc";
        targetCtx.fillRect(item.x + item.width/2 - 10, item.y + 5, 20, 12);
        targetCtx.fillStyle = "#b0bec5";
        targetCtx.fillRect(item.x + item.width/2 - 10, item.y + 17, 20, 8);
        targetCtx.fillStyle = "#81d4fa";
        targetCtx.fillRect(item.x + item.width/2 - 8, item.y + 7, 16, 8);
    }
    if (item.hasLamp) {
         targetCtx.fillStyle = "#fff59d";
         targetCtx.beginPath();
         targetCtx.moveTo(item.x + 10, item.y + 15);
         targetCtx.lineTo(item.x + 20, item.y + 15);
         targetCtx.lineTo(item.x + 15, item.y + 5);
         targetCtx.fill();
         targetCtx.fillStyle = "#3e2723";
         targetCtx.fillRect(item.x + 14, item.y + 15, 2, 5);
    }
}

function drawTable(item, targetCtx = ctx) {
  targetCtx.fillStyle = "rgba(0,0,0,0.25)";
  targetCtx.fillRect(item.x + 6, item.y + item.height - 6, item.width - 12, 6);
  targetCtx.fillStyle = "#2f2a28";
  targetCtx.fillRect(item.x + 6, item.y + 12, 8, item.height - 18);
  targetCtx.fillRect(item.x + item.width - 14, item.y + 12, 8, item.height - 18);
  targetCtx.fillRect(item.x + item.width / 2 - 4, item.y + 12, 8, item.height - 18);
  const gradient = targetCtx.createLinearGradient(item.x, item.y, item.x, item.y + item.height);
  gradient.addColorStop(0, "#b0a089");
  gradient.addColorStop(1, "#9e8c74");
  targetCtx.fillStyle = gradient;
  targetCtx.fillRect(item.x, item.y, item.width, item.height - 10);
  targetCtx.fillStyle = "#7b6a56";
  targetCtx.fillRect(item.x, item.y + item.height - 10, item.width, 10);
}

function drawBed(item, targetCtx = ctx) {
  targetCtx.fillStyle = "#5d4037";
  targetCtx.fillRect(item.x, item.y, item.width, 12);
  targetCtx.fillRect(item.x, item.y + item.height - 8, item.width, 8);
  targetCtx.fillStyle = "#eceff1";
  targetCtx.fillRect(item.x + 4, item.y + 8, item.width - 8, item.height - 16);
  targetCtx.fillStyle = "#5c6bc0";
  targetCtx.fillRect(item.x + 4, item.y + 30, item.width - 8, item.height - 38);
  targetCtx.fillStyle = "rgba(255,255,255,0.1)";
  for(let i=0; i<item.width-8; i+=10) {
      for(let j=0; j<item.height-38; j+=10) {
          if ((i+j)%20 === 0) targetCtx.fillRect(item.x + 4 + i, item.y + 30 + j, 5, 5);
      }
  }
  targetCtx.fillStyle = "#fff";
  targetCtx.fillRect(item.x + 8, item.y + 12, item.width - 16, 15);
}

function drawCupboard(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#4e342e";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.strokeStyle = "#3e2723";
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
    targetCtx.beginPath();
    targetCtx.moveTo(item.x + item.width / 2, item.y + 2);
    targetCtx.lineTo(item.x + item.width / 2, item.y + item.height - 2);
    targetCtx.stroke();
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(item.x + 6, item.y + 10, item.width/2 - 10, item.height/2 - 15);
    targetCtx.fillRect(item.x + 6, item.y + item.height/2 + 5, item.width/2 - 10, item.height/2 - 15);
    targetCtx.fillRect(item.x + item.width/2 + 4, item.y + 10, item.width/2 - 10, item.height/2 - 15);
    targetCtx.fillRect(item.x + item.width/2 + 4, item.y + item.height/2 + 5, item.width/2 - 10, item.height/2 - 15);
    targetCtx.fillStyle = "#ffd54f";
    targetCtx.beginPath();
    targetCtx.arc(item.x + item.width/2 - 4, item.y + item.height/2, 2, 0, Math.PI*2);
    targetCtx.arc(item.x + item.width/2 + 4, item.y + item.height/2, 2, 0, Math.PI*2);
    targetCtx.fill();
}

function drawChest(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#5d4037";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.fillStyle = "#4e342e";
    for(let i=0; i<item.height; i+=12) {
        targetCtx.fillRect(item.x, item.y + i, item.width, 1);
    }
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(item.x + 10, item.y, 8, item.height);
    targetCtx.fillRect(item.x + item.width - 18, item.y, 8, item.height);
    targetCtx.fillStyle = "#263238";
    targetCtx.fillRect(item.x + item.width/2 - 6, item.y + 10, 12, 14);
    targetCtx.fillStyle = "#78909c";
    targetCtx.fillRect(item.x + item.width/2 - 2, item.y + 18, 4, 4);
}

function drawRug(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#8d6e63";
    if (item.color) targetCtx.fillStyle = item.color;
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.strokeStyle = "rgba(0,0,0,0.1)";
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    for(let i=4; i<item.width; i+=4) {
        targetCtx.moveTo(item.x + i, item.y);
        targetCtx.lineTo(item.x + i, item.y + item.height);
    }
    targetCtx.stroke();
}

function drawShelf(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#5d4037";
    targetCtx.fillRect(item.x, item.y + item.height - 5, item.width, 5);
    targetCtx.fillStyle = "#ef5350";
    targetCtx.fillRect(item.x + 10, item.y + item.height - 20, 5, 15);
    targetCtx.fillStyle = "#42a5f5";
    targetCtx.fillRect(item.x + 16, item.y + item.height - 22, 6, 17);
    targetCtx.fillStyle = "#66bb6a";
    targetCtx.fillRect(item.x + 24, item.y + item.height - 18, 4, 13);
    targetCtx.fillStyle = "#8d6e63";
    targetCtx.fillRect(item.x + item.width - 20, item.y + item.height - 15, 10, 10);
    targetCtx.fillStyle = "#66bb6a";
    targetCtx.beginPath();
    targetCtx.arc(item.x + item.width - 15, item.y + item.height - 20, 8, 0, Math.PI, true);
    targetCtx.fill();
}

function drawLocker(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#607d8b";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.fillStyle = "#546e7a";
    targetCtx.fillRect(item.x + 4, item.y + 10, item.width - 8, 4);
    targetCtx.fillRect(item.x + 4, item.y + 16, item.width - 8, 4);
    targetCtx.fillRect(item.x + 4, item.y + 22, item.width - 8, 4);
    targetCtx.fillStyle = "#cfd8dc";
    targetCtx.fillRect(item.x + item.width - 8, item.y + item.height/2, 4, 10);
}

function drawWindow(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#81d4fa";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.strokeStyle = "#eceff1";
    targetCtx.lineWidth = 4;
    targetCtx.strokeRect(item.x, item.y, item.width, item.height);
    targetCtx.beginPath();
    targetCtx.moveTo(item.x + item.width/2, item.y);
    targetCtx.lineTo(item.x + item.width/2, item.y + item.height);
    targetCtx.moveTo(item.x, item.y + item.height/2);
    targetCtx.lineTo(item.x + item.width, item.y + item.height/2);
    targetCtx.stroke();
    targetCtx.fillStyle = "rgba(255,255,255,0.4)";
    targetCtx.beginPath();
    targetCtx.moveTo(item.x + 10, item.y + item.height);
    targetCtx.lineTo(item.x + 30, item.y);
    targetCtx.lineTo(item.x + 50, item.y);
    targetCtx.lineTo(item.x + 30, item.y + item.height);
    targetCtx.fill();
}

function drawWhiteboard(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#b0bec5";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.fillStyle = "#ffffff";
    targetCtx.fillRect(item.x + 4, item.y + 4, item.width - 8, item.height - 8);
    targetCtx.fillStyle = "#90a4ae";
    targetCtx.fillRect(item.x + 2, item.y + item.height - 4, item.width - 4, 4);
    targetCtx.fillStyle = "#37474f";
    targetCtx.fillRect(item.x + 40, item.y + item.height - 4, 10, 3);
    targetCtx.fillStyle = "#e53935";
    targetCtx.fillRect(item.x + 60, item.y + item.height - 4, 8, 2);
}

function drawStudent(item, targetCtx = ctx) {
    const baseY = item.y;
    const bob = Math.sin(Date.now() / 500 + (item.phase || 0)) * 2;
    const seatY = baseY - bob;
    const w = item.width || 24;
    const h = item.height || 36;
    const variant = item.variant || 'boy';
    const shirtColor = item.shirt || "#4caf50";
    targetCtx.fillStyle = "rgba(0,0,0,0.2)";
    targetCtx.fillRect(item.x + 2, seatY + h - 4, w - 4, 4);
    targetCtx.fillStyle = shirtColor;
    targetCtx.fillRect(item.x, seatY + 12, w, 14);
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(item.x + 4, seatY + 26, 6, 8);
    targetCtx.fillRect(item.x + w - 10, seatY + 26, 6, 8);

    if (!item.headless) {
        targetCtx.fillStyle = "#f1c27d";
        targetCtx.fillRect(item.x + 2, seatY, w - 4, 12);
        targetCtx.fillStyle = "#4e342e";
        if (variant === 'girl') {
            targetCtx.fillRect(item.x, seatY, w, 6);
            targetCtx.fillRect(item.x, seatY, 4, 14);
            targetCtx.fillRect(item.x + w - 4, seatY, 4, 14);
        } else {
            targetCtx.fillRect(item.x, seatY, w, 4);
            targetCtx.fillRect(item.x, seatY, 4, 8);
            targetCtx.fillRect(item.x + w - 4, seatY, 4, 8);
        }
        targetCtx.fillStyle = "#212121";
        targetCtx.fillRect(item.x + 6, seatY + 4, 2, 2);
        targetCtx.fillRect(item.x + w - 8, seatY + 4, 2, 2);
    } else {
        // Neck/Gore
        targetCtx.fillStyle = "#b71c1c";
        targetCtx.fillRect(item.x + w/2 - 3, seatY + 10, 6, 4);
        if (Math.random() > 0.5) {
             targetCtx.fillStyle = "#e53935";
             targetCtx.fillRect(item.x + w/2 - 2, seatY + 8, 4, 2);
        }
    }
}

function drawTeacher(item, targetCtx = ctx) {
    const baseY = item.y;
    const bob = Math.sin(Date.now() / 500 + (item.phase || 0)) * 2;
    const seatY = baseY - bob;
    const w = item.width || 24;
    const h = item.height || 36;

    // Shadow
    targetCtx.fillStyle = "rgba(0,0,0,0.2)";
    targetCtx.fillRect(item.x + 2, seatY + h - 4, w - 4, 4);

    // Body (Fancy Suit)
    targetCtx.fillStyle = "#3e2723"; // Dark Brown Suit
    targetCtx.fillRect(item.x, seatY + 12, w, 14);
    // Tie
    targetCtx.fillStyle = "#d32f2f";
    targetCtx.fillRect(item.x + w/2 - 2, seatY + 14, 4, 8);

    // Legs
    targetCtx.fillStyle = "#212121";
    targetCtx.fillRect(item.x + 4, seatY + 26, 6, 8);
    targetCtx.fillRect(item.x + w - 10, seatY + 26, 6, 8);

    if (!item.headless) {
        // Head
        targetCtx.fillStyle = "#f1c27d";
        targetCtx.fillRect(item.x + 2, seatY, w - 4, 12);

        // Eyes
        targetCtx.fillStyle = "#212121";
        targetCtx.fillRect(item.x + 6, seatY + 5, 2, 2);
        targetCtx.fillRect(item.x + w - 8, seatY + 5, 2, 2);

        // Mustache
        targetCtx.fillStyle = "#5d4037";
        targetCtx.fillRect(item.x + 6, seatY + 8, w - 12, 2);

        // Cowboy Hat
        targetCtx.fillStyle = "#5d4037";
        // Brim
        targetCtx.fillRect(item.x - 4, seatY - 2, w + 8, 4);
        // Top
        targetCtx.fillRect(item.x + 2, seatY - 8, w - 4, 6);
        // Band
        targetCtx.fillStyle = "#3e2723";
        targetCtx.fillRect(item.x + 2, seatY - 3, w - 4, 2);
    } else {
        // Neck/Gore
        targetCtx.fillStyle = "#b71c1c";
        targetCtx.fillRect(item.x + w/2 - 3, seatY + 10, 6, 4);
        if (Math.random() > 0.5) {
             targetCtx.fillStyle = "#e53935";
             targetCtx.fillRect(item.x + w/2 - 2, seatY + 8, 4, 2);
        }
    }
}

function drawFurnitureItem(item, targetCtx = ctx) {
    if (item.type === 'zone') {
        if (isDeveloperMode) {
            targetCtx.strokeStyle = "rgba(0, 0, 255, 0.5)";
            targetCtx.lineWidth = 1;
            targetCtx.strokeRect(item.x, item.y, item.width, item.height);
            targetCtx.fillStyle = "rgba(0, 0, 255, 0.1)";
            targetCtx.fillRect(item.x, item.y, item.width, item.height);
            targetCtx.fillStyle = "blue";
            targetCtx.font = "10px monospace";
            targetCtx.textAlign = "center";
            targetCtx.fillText("ZONE", item.x + item.width/2, item.y + item.height/2);
        }
        return;
    }

    if (item.textureData) {
        const img = new Image();
        img.src = item.textureData;
        if (!item._cachedImage || !(item._cachedImage instanceof Image)) {
            item._cachedImage = new Image();
            item._cachedImage.src = item.textureData;
        }
        if (item._cachedImage.complete) {
             targetCtx.drawImage(item._cachedImage, item.x, item.y, item.width, item.height);
        } else {
             targetCtx.fillStyle = "#ccc";
             targetCtx.fillRect(item.x, item.y, item.width, item.height);
        }
        return;
    }

    if (item.type === 'desk') drawDesk(item, targetCtx);
    else if (item.type === 'table') drawTable(item, targetCtx);
    else if (item.type === 'bed') drawBed(item, targetCtx);
    else if (item.type === 'cupboard') drawCupboard(item, targetCtx);
    else if (item.type === 'locker') drawLocker(item, targetCtx);
    else if (item.type === 'window') drawWindow(item, targetCtx);
    else if (item.type === 'student') drawStudent(item, targetCtx);
    else if (item.type === 'teacher') drawTeacher(item, targetCtx);
    else if (item.type === 'chest') drawChest(item, targetCtx);
    else if (item.type === 'rug') drawRug(item, targetCtx);
    else if (item.type === 'shelf') drawShelf(item, targetCtx);
    else if (item.type === 'whiteboard') drawWhiteboard(item, targetCtx);
    else {
        targetCtx.fillStyle = "#e91e63";
        targetCtx.fillRect(item.x, item.y, item.width, item.height);
        targetCtx.fillStyle = "white";
        targetCtx.font = "10px monospace";
        targetCtx.textAlign = "center";
        targetCtx.fillText(item.type, item.x + item.width/2, item.y + item.height/2);
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
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(px + 2, py + h - 4, w - 4, 4);
      ctx.fillStyle = shirtColor;
      ctx.fillRect(px, py + 12, w, 14);
      ctx.fillStyle = stripeColor;
      ctx.fillRect(px, py + 18, w, 4);
      ctx.fillStyle = pantsColor;
      ctx.fillRect(px + 4, py + 26, 6, 8);
      ctx.fillRect(px + w - 10, py + 26, 6, 8);
      ctx.fillStyle = skinColor;
      ctx.fillRect(px + 2, py, w - 4, 12);
      ctx.fillStyle = hairColor;
      ctx.fillRect(px, py, w, 8);
      ctx.fillRect(px + 2, py + 8, w - 4, 4);
      ctx.restore();
      return;
  }
  const isMoving = player.walkFrame !== 0;
  const animOffset = Math.sin(player.walkFrame) * 5;
  const walkCycle = Math.sin(player.walkFrame);
  const bob = isMoving ? Math.abs(Math.sin(player.walkFrame * 2)) * 2 : 0;
  const px = x - w / 2;
  const py = y - h + 8 - bob;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, w / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.facing === "down") {
    ctx.fillStyle = pantsColor;
    ctx.fillRect(px + 4, py + 26 + animOffset, 6, 10);
    ctx.fillRect(px + w - 10, py + 26 - animOffset, 6, 10);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px, py + 12, w, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px, py + 18, w, 4);
    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 2, py, w - 4, 12);
    ctx.fillStyle = hairColor;
    ctx.fillRect(px, py, w, 4);
    ctx.fillRect(px, py, 4, 10);
    ctx.fillRect(px + w - 4, py, 4, 10);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(px + 6, py + 6, 2, 2);
    ctx.fillRect(px + w - 8, py + 6, 2, 2);
  } else if (player.facing === "up") {
    ctx.fillStyle = pantsColor;
    ctx.fillRect(px + 4, py + 26 + animOffset, 6, 10);
    ctx.fillRect(px + w - 10, py + 26 - animOffset, 6, 10);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px, py + 12, w, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px, py + 18, w, 4);
    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 2, py, w - 4, 12);
    ctx.fillStyle = hairColor;
    ctx.fillRect(px, py, w, 8);
    ctx.fillRect(px + 2, py + 8, w - 4, 4);
  } else if (player.facing === "left" || player.facing === "right") {
    const isRight = player.facing === "right";
    const legSwing = walkCycle * 6;
    ctx.fillStyle = pantsColor;
    ctx.fillRect(px + w/2 - 3 + legSwing, py + 26, 6, 10);
    ctx.fillRect(px + w/2 - 3 - legSwing, py + 26, 6, 10);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px + 4, py + 12, w - 8, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px + 4, py + 18, w - 8, 4);
    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 4, py, w - 8, 12);
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 2, py, w - 4, 4);
    if (isRight) {
       ctx.fillRect(px + 2, py, 4, 10);
    } else {
       ctx.fillRect(px + w - 6, py, 4, 10);
    }
    ctx.fillStyle = eyeColor;
    if (isRight) {
       ctx.fillRect(px + w - 8, py + 6, 2, 2);
    } else {
       ctx.fillRect(px + 6, py + 6, 2, 2);
    }
  }
  ctx.restore();
}

function createExplosion(x, y, color = "#e53935") {
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1.0,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // Gravity
        p.life -= 0.02;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
    if (screenShake > 0) {
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // Screen Shake
  if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
  }

  // Zoom
  if (camera.zoom && camera.zoom !== 1) {
      ctx.translate(canvas.width/2, canvas.height/2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-canvas.width/2, -canvas.height/2);
  }

  ctx.translate(-camera.x, -camera.y);
  drawRoom();
  room.furniture.filter(i => i.type === 'rug').forEach(item => drawFurnitureItem(item));
  drawDoors();
  const renderList = [];
  renderList.push({
    y: player.y,
    draw: () => drawPlayer(player.x, player.y)
  });
  room.furniture.forEach(item => {
    if (item.type === 'rug') return;
    renderList.push({
      y: item.y + item.height,
      draw: () => drawFurnitureItem(item)
    });
  });
  renderList.sort((a, b) => a.y - b.y);
  renderList.forEach(obj => obj.draw());

  drawParticles();

  ctx.restore();

  if (globalDarkness > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${globalDarkness})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
  }

  drawHints();
  drawDevOverlay();
}

function drawDevOverlay() {
    if (!isDeveloperMode) return;
    if (selectedObject) {
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.strokeRect(selectedObject.x - camera.x, selectedObject.y - camera.y, selectedObject.width, selectedObject.height);

        if (selectedObject.type === 'door') {
            let spawnX, spawnY;
            if (selectedObject.customSpawn) {
                spawnX = selectedObject.customSpawn.x;
                spawnY = selectedObject.customSpawn.y;
            } else {
                const pt = doorAttachmentPoint(selectedObject);
                spawnX = pt.x;
                spawnY = pt.y + 10;
                if (selectedObject.orientation === 'bottom') spawnY = selectedObject.y - 24;
                else if (selectedObject.orientation === 'left') spawnX = selectedObject.x + selectedObject.width + 12;
                else if (selectedObject.orientation === 'right') spawnX = selectedObject.x - 12;
            }
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.fillRect(spawnX - 10 - camera.x, spawnY - 10 - camera.y, 20, 20);
            ctx.strokeStyle = "red";
            ctx.strokeRect(spawnX - 10 - camera.x, spawnY - 10 - camera.y, 20, 20);
            ctx.fillStyle = "white";
            ctx.font = "10px monospace";
            ctx.fillText("SPAWN", spawnX - camera.x, spawnY - 12 - camera.y);
        }

        if (selectedObject.interaction && selectedObject.interaction.enabled) {
            const area = selectedObject.interaction.area || {x:0,y:0,width:selectedObject.width,height:selectedObject.height};
            const ix = selectedObject.x + area.x;
            const iy = selectedObject.y + area.y;
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.strokeRect(ix - camera.x, iy - camera.y, area.width, area.height);
            ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
            ctx.fillRect(ix - camera.x, iy - camera.y, area.width, area.height);
            const handleSize = 6;
            ctx.fillStyle = "white";
            ctx.strokeStyle = "green";
            const handles = [
                { x: ix, y: iy },
                { x: ix + area.width, y: iy },
                { x: ix, y: iy + area.height },
                { x: ix + area.width, y: iy + area.height }
            ];
            handles.forEach(h => {
                ctx.fillRect(h.x - handleSize/2 - camera.x, h.y - handleSize/2 - camera.y, handleSize, handleSize);
                ctx.strokeRect(h.x - handleSize/2 - camera.x, h.y - handleSize/2 - camera.y, handleSize, handleSize);
            });
        }

        if (selectedObject.collisionRect) {
            const cr = selectedObject.collisionRect;
            const cx = selectedObject.x + cr.x;
            const cy = selectedObject.y + cr.y;
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - camera.x, cy - camera.y, cr.width, cr.height);
            ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
            ctx.fillRect(cx - camera.x, cy - camera.y, cr.width, cr.height);
            ctx.fillStyle = "cyan";
            ctx.fillText("HITBOX", cx - camera.x, cy - 5 - camera.y);

            // Resizing Handles for Hitbox
            const handleSize = 6;
            ctx.fillStyle = "white";
            ctx.strokeStyle = "cyan";
            const handles = [
                { x: cx, y: cy },
                { x: cx + cr.width, y: cy },
                { x: cx, y: cy + cr.height },
                { x: cx + cr.width, y: cy + cr.height }
            ];
            handles.forEach(h => {
                ctx.fillRect(h.x - handleSize/2 - camera.x, h.y - handleSize/2 - camera.y, handleSize, handleSize);
                ctx.strokeRect(h.x - handleSize/2 - camera.x, h.y - handleSize/2 - camera.y, handleSize, handleSize);
            });
        }
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
  let showingHint = false;
  const nearbyDoor = getNearestDoor(56);
  if (nearbyDoor) {
      showingHint = true;
      if (!isHintActive) {
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
  if (cutscene && cutscene.active && cutscene.update) {
      cutscene.update();
  }
  updateHorrorState();
  updateParticles();
  handleMovement();
  draw();
  requestAnimationFrame(loop);
}

function startLectureCutscene(seat) {
    cutscene = { active: true, focus: null };
    playData.worldState['lecture_seen'] = true;
    savePlayState();

    const door = room.doors.find(d => d.id === 'door_lecture_to_hall');
    const startX = door ? door.x : 800;
    const startY = door ? door.y + 40 : 200;

    const teacher = {
        type: 'teacher',
        x: startX,
        y: startY,
        width: 24,
        height: 36,
        phase: 0
    };
    room.furniture.push(teacher);
    cutscene.focus = teacher;

    const waypoints = [
        { x: 800, y: 220 }, // Move left to aisle
        { x: 800, y: 130 }, // Move up aisle
        { x: 448, y: 130 }  // Move left to seat
    ];
    let currentWaypointIndex = 0;

    let phase = 'walk';
    let timer = 0;

    cutscene.update = () => {
        if (phase === 'walk') {
            if (currentWaypointIndex >= waypoints.length) {
                phase = 'sit';
                return;
            }

            const target = waypoints[currentWaypointIndex];
            const dx = target.x - teacher.x;
            const dy = target.y - teacher.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 4) {
                teacher.x = target.x;
                teacher.y = target.y;
                currentWaypointIndex++;
            } else {
                const speed = 2;
                teacher.x += (dx / dist) * speed;
                teacher.y += (dy / dist) * speed;
            }
        } else if (phase === 'sit') {
            phase = 'talk';

            const conversation = [
                { speaker: "TEACHER", text: "Okay guys, take your seats." },
                { speaker: "TEACHER", text: "Today we are gonna learn some Algebra." },
                { speaker: "TEACHER", text: "It is very important for your future." },
                { speaker: "TEACHER", text: "So pay close attention..." }
            ];

            dialogue = conversation;
            stage = 0;
            updateDialogue();

            window.onDialogueEnd = () => {
                phase = 'focus';
                timer = 0;
            };
        } else if (phase === 'focus') {
             // Zoom in
             if (camera.zoom < 2.5) {
                 camera.zoom += 0.02;
             }
             // Keep focus on teacher
             cutscene.focus = teacher;

             timer++;
             if (timer > 120) { // 2 seconds
                 phase = 'explode';
             }
        } else if (phase === 'explode') {
             createExplosion(teacher.x + teacher.width/2, teacher.y + 10, "#b71c1c");
             createExplosion(teacher.x + teacher.width/2, teacher.y + 10, "#ff0000");
             createExplosion(teacher.x + teacher.width/2, teacher.y + 10, "#880e4f");

             // Trigger immediate panic for students in the room
             room.furniture.forEach(item => {
                 if (item.type === 'student') {
                     item.vx = (Math.random() - 0.5) * 10;
                     item.vy = (Math.random() - 0.5) * 10;
                 }
             });

             teacher.headless = true;
             screenShake = 30;
             globalDarkness = 0.7;
             playData.worldState.horrorActive = true;

             phase = 'shock';
             timer = 0;
        } else if (phase === 'shock') {
             timer++;
             if (timer > 60) {
                 phase = 'restore_cam';
             }
        } else if (phase === 'restore_cam') {
             if (camera.zoom > 1) {
                 camera.zoom -= 0.05;
             } else {
                 camera.zoom = 1;
                 phase = 'end';
                 cutscene.active = false;
                 cutscene = null;
             }
        }
    };
}

function updateHorrorState() {
    if (!playData.worldState.horrorActive) return;

    // Ensure darkness
    globalDarkness = 0.7;

    // Students Logic
    room.furniture.forEach(item => {
        if ((item.type === 'student' || item.type === 'teacher') && !item.headless) {
            if (item.type === 'teacher') return;

            if (!item.vx) {
                item.vx = (Math.random() - 0.5) * 10;
                item.vy = (Math.random() - 0.5) * 10;
            }

            // Change direction randomly - Chaotic
            if (Math.random() < 0.1) {
                item.vx = (Math.random() - 0.5) * 10;
                item.vy = (Math.random() - 0.5) * 10;
            }

            let nextX = item.x + item.vx;
            let nextY = item.y + item.vy;

            // Simple Bounds Check
            if (nextX < room.padding || nextX > room.width - room.padding - item.width) {
                item.vx *= -1;
                nextX = item.x + item.vx;
            }
            if (nextY < room.wallHeight || nextY > room.height - room.padding - item.height) {
                item.vy *= -1;
                nextY = item.y + item.vy;
            }

            item.x = nextX;
            item.y = nextY;
            item.phase = (item.phase || 0) + 0.8; // Faster bobbing

            // Random Explosion (Occasional)
            if (Math.random() < 0.001) {
                createExplosion(item.x + item.width/2, item.y + 10, "#b71c1c");
                createExplosion(item.x + item.width/2, item.y + 10, "#880e4f");
                item.headless = true;
                screenShake = 10;
            }
        }
    });
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

function checkAutoTriggers() {
    if (dialogueBox.classList.contains("dialogue--active")) return;
    for (let i = 0; i < room.furniture.length; i++) {
        const item = room.furniture[i];
        if (item.interaction && item.interaction.enabled && item.interaction.autoTrigger) {
             const area = item.interaction.area || { x: 0, y: 0, width: item.width, height: item.height };
             const ix = item.x + area.x;
             const iy = item.y + area.y;
             if (player.x >= ix && player.x <= ix + area.width &&
                 player.y >= iy && player.y <= iy + area.height) {
                 executeInteraction({
                     type: 'furniture',
                     obj: item,
                     index: i,
                     priority: 999
                 });
                 return;
             }
        }
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
        player.y += 10;
        return;
    }

    const candidates = [];

    for (let i = 0; i < room.furniture.length; i++) {
         const item = room.furniture[i];
         if (item.interaction && item.interaction.enabled && item.interaction.conversations && item.interaction.conversations.length > 0) {
             const area = item.interaction.area || { x: 0, y: 0, width: item.width, height: item.height };
             const ix = item.x + area.x;
             const iy = item.y + area.y;
             if (player.x >= ix && player.x <= ix + area.width &&
                 player.y >= iy && player.y <= iy + area.height) {
                 candidates.push({
                     type: 'furniture',
                     obj: item,
                     index: i,
                     priority: item.interaction.priority || 1
                 });
             }
         }
         if (item.text && !item.interaction) {
             const anchorX = item.x + item.width / 2;
             const anchorY = item.y + item.height;
             const dist = Math.hypot(player.x - anchorX, player.y - anchorY);
             if (dist < 40) {
                 candidates.push({
                     type: 'legacy_text',
                     obj: item,
                     priority: 1
                 });
             }
         }
    }

    const desks = room.furniture.filter(f => f.type === 'desk');
    for (const desk of desks) {
        if (desk.id === 'player_seat') {
            const dist = Math.hypot(player.x - (desk.x + desk.width/2), player.y - (desk.y + desk.height));
            if (dist < 50) {
                 candidates.push({
                     type: 'sit',
                     obj: desk,
                     priority: desk.interaction ? (desk.interaction.priority || 1) : 1
                 });
            }
        }
    }

    const door = getNearestDoor(60);
    if (door && (door.target || door.targetDoorId)) {
        candidates.push({
            type: 'door',
            obj: door,
            priority: door.priority || 1
        });
    }

    if (candidates.length === 0) return;
    candidates.sort((a, b) => b.priority - a.priority);
    const maxP = candidates[0].priority;
    const topCandidates = candidates.filter(c => c.priority === maxP);
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    executeInteraction(selected);
}

function executeInteraction(target) {
    if (target.type === 'sit') {
        const desk = target.obj;
        player.isSitting = true;
        player.x = desk.x + 23 + 12;
        player.y = desk.y + 34 + 36;
        player.facing = 'up';

        if (desk.id === 'player_seat' && currentLevelName === 'lecture' && !playData.worldState['lecture_seen']) {
             startLectureCutscene(desk);
        }
        return;
    }

    if (target.type === 'legacy_text') {
        showTemporaryDialogue(target.obj.text, target.obj.name || "STUDENT");
        return;
    }

    if (target.type === 'door') {
        const door = target.obj;
        const parts = (door.target || '').split(':');
        let targetRoom = parts[0].trim();
        let targetId = parts[1] ? parts[1].trim() : null;
        if (!targetId && door.targetDoorId) targetId = door.targetDoorId;
        if (targetRoom) {
             loadLevel(targetRoom, targetId);
             if (!targetId && door.targetSpawn) {
                  player.x = door.targetSpawn.x;
                  player.y = door.targetSpawn.y;
             }
        }
        return;
    }

    if (target.type === 'furniture') {
        const item = target.obj;
        const interaction = item.interaction;

        // Generate State Key: RoomName:Index OR RoomName:ID
        let stateKey = currentLevelName + ":";
        if (item.id) stateKey += item.id;
        else stateKey += target.index;

        // Read count from playData
        const count = playData.worldState[stateKey] || 0;

        const validConvos = interaction.conversations.filter(c => {
            if (Array.isArray(c)) return true;
            if (c.reqCount !== undefined && count !== parseInt(c.reqCount)) return false;
            if (c.minCount !== undefined && count < parseInt(c.minCount)) return false;
            if (c.maxCount !== undefined && count > parseInt(c.maxCount)) return false;
            // 'once' needs 'seen' state tracking.
            // We'll store seen states in worldState as "Key_seen_Index"?
            // Simplifying: Store complex state in worldState[stateKey] = { count: 0, seen: [] }?
            // For now, let's just assume simple count logic.
            // If strict 'once' is needed, we need to store it.
            if (c.once && c.seen) return false; // This 'seen' is on the design object... problematic for reset.
            return true;
        });

        if (validConvos.length === 0) return;

        let selectedConvo = null;
        if (interaction.type === 'random') {
            const idx = Math.floor(Math.random() * validConvos.length);
            selectedConvo = validConvos[idx];
        } else {
            selectedConvo = validConvos[0];
        }

        if (selectedConvo) {
            let lines = [];
            if (Array.isArray(selectedConvo)) {
                lines = selectedConvo;
            } else {
                lines = selectedConvo.lines;
                // Avoid mutating design data 'seen'
                // selectedConvo.seen = true;
            }

            if (lines && lines.length > 0) {
                dialogue = JSON.parse(JSON.stringify(lines));
                stage = 0;
                updateDialogue();

                // Update Play Data
                playData.worldState[stateKey] = count + 1;
                savePlayState();
            }
        }
    }
}

let clipboard = null;

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (isDeveloperMode && (event.ctrlKey || event.metaKey)) {
      if (key === 'c' && selectedObject) {
          clipboard = JSON.parse(JSON.stringify(selectedObject));
          return;
      }
      if (key === 'v' && clipboard) {
          const newObj = JSON.parse(JSON.stringify(clipboard));
          newObj.x += 20;
          newObj.y += 20;
          if (newObj.type === 'door') {
              room.doors.push(newObj);
          } else {
              room.furniture.push(newObj);
          }
          selectedObject = newObj;
          updatePropPanel();
          saveLocal();
          return;
      }
  }

  if (["w", "a", "s", "d"].includes(key)) {
    keys.add(key);
  }
  if (key === " ") {
      if (dialogueBox.classList.contains("dialogue--active") && !isHintActive) {
          advanceDialogue();
      } else {
          handleInteraction();
      }
  }
  if (isDeveloperMode && (key === 'delete' || key === 'backspace')) {
      if (document.activeElement.tagName === 'INPUT') return;
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

  if (selectedObject && selectedObject.type === 'door') {
      let spawnX, spawnY;
      if (selectedObject.customSpawn) {
          spawnX = selectedObject.customSpawn.x;
          spawnY = selectedObject.customSpawn.y;
      } else {
          const pt = doorAttachmentPoint(selectedObject);
          spawnX = pt.x;
          spawnY = pt.y + 10;
          if (selectedObject.orientation === 'bottom') spawnY = selectedObject.y - 24;
          else if (selectedObject.orientation === 'left') spawnX = selectedObject.x + selectedObject.width + 12;
          else if (selectedObject.orientation === 'right') spawnX = selectedObject.x - 12;
      }
      if (mx >= spawnX - 10 && mx <= spawnX + 10 &&
          my >= spawnY - 10 && my <= spawnY + 10) {
          isDraggingSpawn = true;
          return;
      }
  }

  // Check Hitbox Dragging (New Feature)
  if (selectedObject && selectedObject.collisionRect) {
      const cr = selectedObject.collisionRect;
      const cx = selectedObject.x + cr.x;
      const cy = selectedObject.y + cr.y;
      const handleSize = 10;

      // Handles for Hitbox
      // TL
      if (Math.abs(mx - cx) <= handleSize && Math.abs(my - cy) <= handleSize) {
          resizeHandle = 'hb-tl';
          dragOffset = { x: mx - cx, y: my - cy };
          return;
      }
      // TR
      if (Math.abs(mx - (cx + cr.width)) <= handleSize && Math.abs(my - cy) <= handleSize) {
          resizeHandle = 'hb-tr';
          dragOffset = { x: mx - (cx + cr.width), y: my - cy };
          return;
      }
      // BL
      if (Math.abs(mx - cx) <= handleSize && Math.abs(my - (cy + cr.height)) <= handleSize) {
          resizeHandle = 'hb-bl';
          dragOffset = { x: mx - cx, y: my - (cy + cr.height) };
          return;
      }
      // BR
      if (Math.abs(mx - (cx + cr.width)) <= handleSize && Math.abs(my - (cy + cr.height)) <= handleSize) {
          resizeHandle = 'hb-br';
          dragOffset = { x: mx - (cx + cr.width), y: my - (cy + cr.height) };
          return;
      }
      // Body (Move Hitbox relative to object)
      if (mx >= cx && mx <= cx + cr.width &&
          my >= cy && my <= cy + cr.height) {
            // Check if we are interacting with this object first?
            // If multiple objects overlap, we should check z-order.
            // But we already selected the object.
            // Only allow dragging internal hitbox if we are inside it.
            resizeHandle = 'hb-move';
            dragOffset = { x: mx - cx, y: my - cy };
            return;
      }
  }

  if (selectedObject && selectedObject.interaction && selectedObject.interaction.enabled) {
      const area = selectedObject.interaction.area;
      const ix = selectedObject.x + area.x;
      const iy = selectedObject.y + area.y;
      const handleSize = 10;
      if (Math.abs(mx - ix) <= handleSize && Math.abs(my - iy) <= handleSize) {
          resizeHandle = 'tl';
          dragOffset = { x: mx - ix, y: my - iy };
          return;
      }
      if (Math.abs(mx - (ix + area.width)) <= handleSize && Math.abs(my - iy) <= handleSize) {
          resizeHandle = 'tr';
          dragOffset = { x: mx - (ix + area.width), y: my - iy };
          return;
      }
      if (Math.abs(mx - ix) <= handleSize && Math.abs(my - (iy + area.height)) <= handleSize) {
          resizeHandle = 'bl';
          dragOffset = { x: mx - ix, y: my - (iy + area.height) };
          return;
      }
      if (Math.abs(mx - (ix + area.width)) <= handleSize && Math.abs(my - (iy + area.height)) <= handleSize) {
          resizeHandle = 'br';
          dragOffset = { x: mx - (ix + area.width), y: my - (iy + area.height) };
          return;
      }
      if (mx >= ix && mx <= ix + area.width &&
          my >= iy && my <= iy + area.height) {
          isDraggingInteraction = true;
          dragOffset.x = mx - ix;
          dragOffset.y = my - iy;
          return;
      }
  }

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

  const doors = getDoors();
  for (const door of doors) {
      if (mx >= door.x && mx <= door.x + door.width &&
          my >= door.y && my <= door.y + door.height) {
          selectedObject = door;
          selectedObject.type = 'door';
          isDragging = true;
          dragOffset.x = mx - door.x;
          dragOffset.y = my - door.y;
          updatePropPanel();
          return;
      }
  }

  selectedObject = null;
  document.getElementById("dev-props").classList.add("hidden");
});

// Texture Editor Logic (unchanged) ...
const paintCanvas = document.getElementById("paint-canvas");
const paintCtx = paintCanvas.getContext("2d");
let isPainting = false;
let paintMode = 'brush';
let lastPaintX = 0;
let lastPaintY = 0;
let zoomLevel = 1;

function updateZoom() {
    paintCanvas.style.width = (paintCanvas.width * zoomLevel) + "px";
    paintCanvas.style.height = (paintCanvas.height * zoomLevel) + "px";
    document.getElementById("paint-zoom-val").textContent = Math.round(zoomLevel * 100) + "%";
}

function captureObjectTexture(item) {
    const cvs = document.createElement("canvas");
    cvs.width = item.width;
    cvs.height = item.height;
    const c = cvs.getContext("2d");
    const tempItem = JSON.parse(JSON.stringify(item));
    tempItem.textureData = null;
    tempItem.x = 0;
    tempItem.y = 0;
    drawFurnitureItem(tempItem, c);
    return cvs.toDataURL();
}

function resizePaintCanvas(w, h, preserveContent = true) {
    let saved = null;
    if (preserveContent) {
        saved = document.createElement("canvas");
        saved.width = paintCanvas.width;
        saved.height = paintCanvas.height;
        saved.getContext("2d").drawImage(paintCanvas, 0, 0);
    }
    paintCanvas.width = w;
    paintCanvas.height = h;
    if (saved) {
        paintCtx.drawImage(saved, 0, 0, saved.width, saved.height);
    }
    updateZoom();
}

document.getElementById("dev-edit-texture").addEventListener("click", () => {
    if (!selectedObject) return;
    document.getElementById("texture-editor").classList.remove("hidden");
    document.getElementById("paint-width").value = selectedObject.width;
    document.getElementById("paint-height").value = selectedObject.height;
    paintCanvas.width = selectedObject.width;
    paintCanvas.height = selectedObject.height;
    zoomLevel = 1;
    updateZoom();
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    if (selectedObject.textureData) {
        const img = new Image();
        img.onload = () => {
             paintCtx.drawImage(img, 0, 0, paintCanvas.width, paintCanvas.height);
        };
        img.src = selectedObject.textureData;
    } else {
        const dataUrl = captureObjectTexture(selectedObject);
        const img = new Image();
        img.onload = () => {
            paintCtx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }
});

document.getElementById("paint-width").addEventListener("change", (e) => {
    const w = parseInt(e.target.value) || 32;
    resizePaintCanvas(w, paintCanvas.height);
});
document.getElementById("paint-height").addEventListener("change", (e) => {
    const h = parseInt(e.target.value) || 32;
    resizePaintCanvas(paintCanvas.width, h);
});
document.getElementById("paint-size").addEventListener("input", (e) => {
    document.getElementById("paint-size-val").textContent = e.target.value;
});
document.getElementById("paint-zoom-in").addEventListener("click", () => {
    zoomLevel = Math.min(8, zoomLevel * 2);
    updateZoom();
});
document.getElementById("paint-zoom-out").addEventListener("click", () => {
    zoomLevel = Math.max(0.25, zoomLevel / 2);
    updateZoom();
});
document.getElementById("paint-tool-brush").addEventListener("click", (e) => {
    paintMode = 'brush';
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
});
document.getElementById("paint-tool-eraser").addEventListener("click", (e) => {
    paintMode = 'eraser';
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
});
document.getElementById("paint-cancel").addEventListener("click", () => {
    document.getElementById("texture-editor").classList.add("hidden");
});
document.getElementById("paint-clear").addEventListener("click", () => {
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
});
document.getElementById("paint-save").addEventListener("click", () => {
    if (selectedObject) {
        selectedObject.textureData = paintCanvas.toDataURL();
        selectedObject.width = paintCanvas.width;
        selectedObject.height = paintCanvas.height;
        selectedObject._cachedImage = null;
        updatePropPanel();
        saveLocal();
    }
    document.getElementById("texture-editor").classList.add("hidden");
});

function getPaintPos(e) {
    const rect = paintCanvas.getBoundingClientRect();
    const scaleX = paintCanvas.width / rect.width;
    const scaleY = paintCanvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}
paintCanvas.addEventListener("mousedown", (e) => {
    isPainting = true;
    const pos = getPaintPos(e);
    lastPaintX = pos.x;
    lastPaintY = pos.y;
    paint(pos.x, pos.y, true);
});
window.addEventListener("mouseup", () => isPainting = false);
paintCanvas.addEventListener("mousemove", (e) => {
    if (!isPainting) return;
    const pos = getPaintPos(e);
    paint(pos.x, pos.y);
    lastPaintX = pos.x;
    lastPaintY = pos.y;
});

function paint(x, y, isDot = false) {
    paintCtx.lineWidth = parseInt(document.getElementById("paint-size").value);
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";
    if (paintMode === 'eraser') {
        paintCtx.globalCompositeOperation = 'destination-out';
    } else {
        paintCtx.globalCompositeOperation = 'source-over';
        paintCtx.strokeStyle = document.getElementById("paint-color").value;
        paintCtx.fillStyle = document.getElementById("paint-color").value;
    }
    if (isDot) {
        paintCtx.beginPath();
        paintCtx.arc(x, y, paintCtx.lineWidth / 2, 0, Math.PI * 2);
        paintCtx.fill();
    } else {
        paintCtx.beginPath();
        paintCtx.moveTo(lastPaintX, lastPaintY);
        paintCtx.lineTo(x, y);
        paintCtx.stroke();
    }
    paintCtx.globalCompositeOperation = 'source-over';
}

canvas.addEventListener("mousemove", (e) => {
    if (!isDeveloperMode) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + camera.x;
    const my = e.clientY - rect.top + camera.y;

    if (isDraggingSpawn && selectedObject && selectedObject.type === 'door') {
        selectedObject.customSpawn = { x: Math.round(mx), y: Math.round(my) };
        return;
    }

    if (resizeHandle && selectedObject) {
        const isHitbox = resizeHandle.startsWith('hb-');

        // Target Rect (Collision or Interaction)
        let rectObj = isHitbox ? selectedObject.collisionRect : selectedObject.interaction.area;
        // The rect coordinates are relative to the object
        // So we need to compute the mouse position relative to the object
        const objX = selectedObject.x;
        const objY = selectedObject.y;

        // Current absolute handle position (approx)
        // We calculate delta based on dragOffset

        if (resizeHandle === 'hb-move') {
            rectObj.x = Math.round(mx - dragOffset.x - objX);
            rectObj.y = Math.round(my - dragOffset.y - objY);
            updatePropPanel();
            return;
        }

        const ix = objX + rectObj.x;
        const iy = objY + rectObj.y;

        const mouseX = mx - dragOffset.x; // Adjusted mouse position relative to handle grab point?
        // Actually dragOffset for resizing is tricky.
        // Let's simplify: Use raw mouse pos delta?
        // No, the previous logic was:
        // area.width = mouseX - ix; where mouseX is adjusted by offset.
        // Let's stick to the previous logic but apply to either rect.

        const suffix = isHitbox ? resizeHandle.substring(3) : resizeHandle;

        if (suffix === 'br') {
            rectObj.width = Math.max(10, Math.round(mouseX - ix));
            rectObj.height = Math.max(10, Math.round(mouseY - iy));
        } else if (suffix === 'bl') {
            const newRight = ix + rectObj.width;
            const newW = newRight - mouseX;
            if (newW >= 10) {
                 rectObj.x = Math.round(mouseX - objX);
                 rectObj.width = newW;
            }
            rectObj.height = Math.max(10, Math.round(mouseY - iy));
        } else if (suffix === 'tr') {
            const newBottom = iy + rectObj.height;
            const newH = newBottom - mouseY;
            if (newH >= 10) {
                rectObj.y = Math.round(mouseY - objY);
                rectObj.height = newH;
            }
            rectObj.width = Math.max(10, Math.round(mouseX - ix));
        } else if (suffix === 'tl') {
             const newRight = ix + rectObj.width;
             const newBottom = iy + rectObj.height;
             const newW = newRight - mouseX;
             const newH = newBottom - mouseY;
             if (newW >= 10) {
                 rectObj.x = Math.round(mouseX - objX);
                 rectObj.width = newW;
             }
             if (newH >= 10) {
                 rectObj.y = Math.round(mouseY - objY);
                 rectObj.height = newH;
             }
        }

        updatePropPanel();
        return;
    }

    if (isDraggingInteraction && selectedObject) {
        const area = selectedObject.interaction.area;
        area.x = Math.round((mx - dragOffset.x) - selectedObject.x);
        area.y = Math.round((my - dragOffset.y) - selectedObject.y);
        updatePropPanel();
        return;
    }

    if (isDragging && selectedObject) {
        selectedObject.x = Math.round(mx - dragOffset.x);
        selectedObject.y = Math.round(my - dragOffset.y);
        updatePropPanel();
    }
});

canvas.addEventListener("mouseup", () => {
    if (isDragging || isDraggingSpawn || isDraggingInteraction || resizeHandle) {
        saveLocal();
    }
    isDragging = false;
    isDraggingSpawn = false;
    isDraggingInteraction = false;
    resizeHandle = null;
});

function updatePropPanel() {
    if (!selectedObject) return;
    const p = document.getElementById("dev-props");
    p.classList.remove("hidden");

    const propFields = ['prop-x', 'prop-y', 'prop-w', 'prop-h'];
    propFields.forEach(id => {
         const el = document.getElementById(id);
         if (el && el.parentElement) {
             el.parentElement.style.display = selectedObject.type === 'intro_manager' ? 'none' : 'block';
         }
    });

    document.getElementById("prop-x").value = selectedObject.x;
    document.getElementById("prop-y").value = selectedObject.y;
    document.getElementById("prop-w").value = selectedObject.width;
    document.getElementById("prop-h").value = selectedObject.height;

    const extra = document.getElementById("prop-extra");
    extra.innerHTML = "";
    extra.appendChild(cpContainer);

    addPropInput(extra, "Type", selectedObject.type, v => selectedObject.type = v);

    if (selectedObject.type === 'student') {
        addPropInput(extra, "Name", selectedObject.name || 'STUDENT', v => selectedObject.name = v);
        addPropInput(extra, "Variant", selectedObject.variant || 'boy', v => selectedObject.variant = v);
        addPropInput(extra, "Shirt", selectedObject.shirt || '#000', v => selectedObject.shirt = v);
        addPropInput(extra, "Text", selectedObject.text || '', v => selectedObject.text = v);
    } else if (selectedObject.type === 'door') {
        addPropInput(extra, "ID", selectedObject.id || '', v => selectedObject.id = v);
        let displayTarget = selectedObject.target || '';
        if (selectedObject.targetDoorId && !displayTarget.includes(':')) {
            displayTarget += ':' + selectedObject.targetDoorId;
        }
        addPropInput(extra, "Target (Room:ID)", displayTarget, v => {
            selectedObject.target = v;
            delete selectedObject.targetDoorId;
        });
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
        sel.onchange = (e) => {
             selectedObject.orientation = e.target.value;
             saveLocal();
        };
    } else if (selectedObject.type === 'rug') {
        addPropInput(extra, "Color", selectedObject.color || '#fff', v => selectedObject.color = v);
    }

    if (selectedObject.id !== undefined || selectedObject.type === 'desk') {
        addPropInput(extra, "ID", selectedObject.id || '', v => selectedObject.id = v);
    }

    const colHeader = document.createElement("div");
    colHeader.className = "dev-prop-row";
    colHeader.style.marginTop = "5px";
    colHeader.style.borderTop = "1px solid #444";
    colHeader.style.paddingTop = "5px";
    const colCheck = document.createElement("input");
    colCheck.type = "checkbox";
    colCheck.checked = !!selectedObject.collisionRect;
    colCheck.onchange = (e) => {
        if (e.target.checked) {
            selectedObject.collisionRect = { x: 0, y: 0, width: selectedObject.width, height: selectedObject.height };
        } else {
            delete selectedObject.collisionRect;
        }
        saveLocal();
        updatePropPanel();
    };
    const colLbl = document.createElement("label");
    colLbl.textContent = " Custom Hitbox";
    colLbl.prepend(colCheck);
    colHeader.appendChild(colLbl);
    extra.appendChild(colHeader);

    if (selectedObject.collisionRect) {
        const cr = selectedObject.collisionRect;
        addPropInput(extra, "Hit X", cr.x, v => cr.x = parseInt(v));
        addPropInput(extra, "Hit Y", cr.y, v => cr.y = parseInt(v));
        addPropInput(extra, "Hit W", cr.width, v => cr.width = parseInt(v));
        addPropInput(extra, "Hit H", cr.height, v => cr.height = parseInt(v));
    }

    const interactHeader = document.createElement("div");
    interactHeader.className = "dev-prop-row";
    interactHeader.style.marginTop = "10px";
    interactHeader.style.borderTop = "1px solid #444";
    interactHeader.style.paddingTop = "5px";
    const interactCheck = document.createElement("input");
    interactCheck.type = "checkbox";
    interactCheck.checked = !!(selectedObject.interaction && selectedObject.interaction.enabled);
    interactCheck.onchange = (e) => {
        if (e.target.checked) {
             if (!selectedObject.interaction) selectedObject.interaction = {};
             selectedObject.interaction.enabled = true;
             if (!selectedObject.interaction.priority) selectedObject.interaction.priority = 1;
             if (!selectedObject.interaction.type) selectedObject.interaction.type = 'sequence';
             if (!selectedObject.interaction.conversations) selectedObject.interaction.conversations = [ [] ];
             if (!selectedObject.interaction.area) selectedObject.interaction.area = { x: 0, y: selectedObject.height, width: selectedObject.width, height: 40 };
        } else {
             if (selectedObject.interaction) selectedObject.interaction.enabled = false;
        }
        saveLocal();
        updatePropPanel();
    };
    const lbl = document.createElement("label");
    lbl.textContent = " Interact";
    lbl.prepend(interactCheck);
    interactHeader.appendChild(lbl);

    if (selectedObject.interaction && selectedObject.interaction.enabled) {
         const autoLbl = document.createElement("label");
         autoLbl.textContent = " Auto Trigger";
         autoLbl.style.marginLeft = "10px";
         const autoCheck = document.createElement("input");
         autoCheck.type = "checkbox";
         autoCheck.checked = !!selectedObject.interaction.autoTrigger;
         autoCheck.onchange = (e) => {
             selectedObject.interaction.autoTrigger = e.target.checked;
             saveLocal();
         };
         autoLbl.prepend(autoCheck);
         interactHeader.appendChild(autoLbl);
    }

    extra.appendChild(interactHeader);

    if ((selectedObject.interaction && selectedObject.interaction.enabled) || selectedObject.type === 'door') {
         const priVal = selectedObject.type === 'door' ? (selectedObject.priority || 1) : (selectedObject.interaction.priority || 1);
         const priDiv = document.createElement("div");
         priDiv.className = "dev-prop-row";
         priDiv.innerHTML = `<label>Priority</label> <input type="number" value="${priVal}" style="width:50px">`;
         priDiv.querySelector("input").onchange = (e) => {
             const v = parseInt(e.target.value);
             if (selectedObject.type === 'door') selectedObject.priority = v;
             else selectedObject.interaction.priority = v;
             saveLocal();
         };
         extra.appendChild(priDiv);
    }

    if (selectedObject.interaction && selectedObject.interaction.enabled) {
        const iObj = selectedObject.interaction;
        addPropInput(extra, "Area X", iObj.area.x, v => iObj.area.x = parseInt(v));
        addPropInput(extra, "Area Y", iObj.area.y, v => iObj.area.y = parseInt(v));
        addPropInput(extra, "Area W", iObj.area.width, v => iObj.area.width = parseInt(v));
        addPropInput(extra, "Area H", iObj.area.height, v => iObj.area.height = parseInt(v));

        const typeRow = document.createElement("div");
        typeRow.className = "dev-prop-row";
        typeRow.innerHTML = `<label>Mode</label> <select>
           <option value="sequence">Sequence</option>
           <option value="random">Random</option>
        </select>`;
        typeRow.querySelector("select").value = iObj.type || 'sequence';
        typeRow.querySelector("select").onchange = (e) => { iObj.type = e.target.value; saveLocal(); };
        extra.appendChild(typeRow);

        const convList = document.createElement("div");
        convList.style.marginTop = "5px";

        iObj.conversations.forEach((convoItem, idx) => {
            let lines = [];
            let isAdvanced = !Array.isArray(convoItem);
            if (isAdvanced) {
                lines = convoItem.lines;
            } else {
                lines = convoItem;
            }

            const cDiv = document.createElement("div");
            cDiv.style.background = "rgba(0,0,0,0.2)";
            cDiv.style.padding = "4px";
            cDiv.style.marginBottom = "4px";

            cDiv.innerHTML = `<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span>Convo #${idx+1}</span>
                <div>
                   <button class="btn-sm btn-del-convo">x</button>
                </div>
            </div>`;

            cDiv.querySelector(".btn-del-convo").onclick = () => {
                iObj.conversations.splice(idx, 1);
                saveLocal();
                updatePropPanel();
            };

            const condDiv = document.createElement("div");
            condDiv.style.display = selectedObject.type === 'intro_manager' ? "none" : "flex";
            condDiv.style.gap = "4px";
            condDiv.style.fontSize = "10px";
            condDiv.style.marginBottom = "4px";
            condDiv.style.flexWrap = "wrap";

            const ensureObject = () => {
                if (!isAdvanced) {
                    const newObj = { lines: [...convoItem] };
                    iObj.conversations[idx] = newObj;
                    isAdvanced = true;
                    convoItem = newObj;
                    return newObj;
                }
                return iObj.conversations[idx];
            };

            const makeIn = (lbl, prop, ph) => {
                const w = document.createElement("span");
                w.textContent = lbl;
                const inp = document.createElement("input");
                inp.style.width = "20px";
                inp.placeholder = ph || "";
                if (isAdvanced && convoItem[prop] !== undefined) inp.value = convoItem[prop];
                inp.onchange = (e) => {
                    const o = ensureObject();
                    if (e.target.value === "") delete o[prop];
                    else o[prop] = e.target.value;
                    saveLocal();
                };
                w.appendChild(inp);
                return w;
            };

            condDiv.appendChild(makeIn("Req:", "reqCount"));
            condDiv.appendChild(makeIn("Min:", "minCount"));
            condDiv.appendChild(makeIn("Max:", "maxCount"));

            const onceLbl = document.createElement("label");
            onceLbl.textContent = "Once";
            const onceChk = document.createElement("input");
            onceChk.type = "checkbox";
            if (isAdvanced && convoItem.once) onceChk.checked = true;
            onceChk.onchange = (e) => {
                const o = ensureObject();
                o.once = e.target.checked;
                saveLocal();
            };
            onceLbl.prepend(onceChk);
            condDiv.appendChild(onceLbl);
            cDiv.appendChild(condDiv);

            const linesDiv = document.createElement("div");
            lines.forEach((line, lIdx) => {
                 const lDiv = document.createElement("div");
                 lDiv.style.marginBottom = "2px";
                 lDiv.style.display = "flex";
                 lDiv.style.gap = "2px";

                 const spIn = document.createElement("input");
                 spIn.placeholder = "Speaker";
                 spIn.style.width = "40px";
                 spIn.value = line.speaker || selectedObject.name || "PLAYER";
                 spIn.onchange = (e) => { line.speaker = e.target.value; saveLocal(); };

                 const txIn = document.createElement("input");
                 txIn.placeholder = "Text";
                 txIn.style.flex = "1";
                 txIn.value = line.text || "";
                 txIn.onchange = (e) => { line.text = e.target.value; saveLocal(); };

                 const delBtn = document.createElement("button");
                 delBtn.textContent = "-";
                 delBtn.onclick = () => {
                     lines.splice(lIdx, 1);
                     saveLocal();
                     updatePropPanel();
                 };

                 lDiv.appendChild(spIn);
                 lDiv.appendChild(txIn);
                 lDiv.appendChild(delBtn);
                 linesDiv.appendChild(lDiv);
            });
            cDiv.appendChild(linesDiv);

            const addLineBtn = document.createElement("button");
            addLineBtn.textContent = "+ Line";
            addLineBtn.className = "btn-xs";
            addLineBtn.onclick = () => {
                 const target = isAdvanced ? iObj.conversations[idx].lines : iObj.conversations[idx];
                 target.push({ speaker: selectedObject.name || "NPC", text: "..." });
                 saveLocal();
                 updatePropPanel();
            };
            cDiv.appendChild(addLineBtn);
            convList.appendChild(cDiv);
        });

        const addConvoBtn = document.createElement("button");
        addConvoBtn.textContent = "+ New Conversation";
        addConvoBtn.style.width = "100%";
        addConvoBtn.onclick = () => {
             iObj.conversations.push( [] );
             saveLocal();
             updatePropPanel();
        };
        extra.appendChild(convList);
        extra.appendChild(addConvoBtn);
    }
}

function addPropInput(container, label, value, onChange) {
    const div = document.createElement("div");
    div.className = "dev-prop-row";
    div.innerHTML = `<label style="width:50px">${label}</label> <input type="text" value="${value}">`;
    container.appendChild(div);
    div.querySelector("input").onchange = (e) => {
        onChange(e.target.value);
        saveLocal();
    };
}

let isSettingSpawn = false;
let doorToSetSpawn = null;

['x', 'y', 'w', 'h'].forEach(key => {
    document.getElementById(`prop-${key}`).addEventListener("change", (e) => {
        if (selectedObject) {
            const val = parseInt(e.target.value);
            if (key === 'x') selectedObject.x = val;
            if (key === 'y') selectedObject.y = val;
            if (key === 'w') selectedObject.width = val;
            if (key === 'h') selectedObject.height = val;
            saveLocal();
        }
    });
});

document.getElementById("dev-delete-obj").addEventListener("click", deleteObject);

const copyBtn = document.createElement("button");
copyBtn.textContent = "Copy";
copyBtn.className = "btn-sm";
copyBtn.style.marginRight = "5px";
copyBtn.onclick = () => {
    if (selectedObject) clipboard = JSON.parse(JSON.stringify(selectedObject));
};

const pasteBtn = document.createElement("button");
pasteBtn.textContent = "Paste";
pasteBtn.className = "btn-sm";
pasteBtn.onclick = () => {
    if (clipboard) {
          const newObj = JSON.parse(JSON.stringify(clipboard));
          newObj.x += 20;
          newObj.y += 20;
          if (newObj.type === 'door') room.doors.push(newObj);
          else room.furniture.push(newObj);
          selectedObject = newObj;
          updatePropPanel();
          saveLocal();
    }
};

const cpContainer = document.createElement("div");
cpContainer.className = "dev-prop-row";
cpContainer.style.marginTop = "10px";
cpContainer.appendChild(copyBtn);
cpContainer.appendChild(pasteBtn);

function deleteObject() {
    if (!selectedObject) return;
    if (selectedObject.type === 'door') {
        room.doors = room.doors.filter(d => d !== selectedObject);
    } else {
        room.furniture = room.furniture.filter(f => f !== selectedObject);
    }
    selectedObject = null;
    document.getElementById("dev-props").classList.add("hidden");
    saveLocal();
}

// Object Picker Logic
const availableObjects = [
    { type: 'desk', label: 'Desk', color: '#6d4c41' },
    { type: 'bed', label: 'Bed', color: '#5c6bc0' },
    { type: 'student', label: 'Student', color: '#4caf50' },
    { type: 'cupboard', label: 'Cupboard', color: '#4e342e' },
    { type: 'door', label: 'Door', color: '#d89c27' },
    { type: 'rug', label: 'Rug', color: '#8d6e63' },
    { type: 'shelf', label: 'Shelf', color: '#5d4037' },
    { type: 'window', label: 'Window', color: '#81d4fa' },
    { type: 'chest', label: 'Chest', color: '#5d4037' },
    { type: 'locker', label: 'Locker', color: '#607d8b' },
    { type: 'whiteboard', label: 'Whiteboard', color: '#b0bec5' },
    { type: 'table', label: 'Table', color: '#9e8c74' },
    { type: 'zone', label: 'Zone', color: '#0000ff' }
];

const pickerModal = document.getElementById("object-picker");
const pickerGrid = document.getElementById("obj-grid");

document.getElementById("dev-open-picker").addEventListener("click", () => {
    pickerGrid.innerHTML = "";
    availableObjects.forEach(obj => {
        const card = document.createElement("div");
        card.className = "obj-card";
        card.innerHTML = `
            <div class="obj-icon" style="background:${obj.color}"></div>
            <span>${obj.label}</span>
        `;
        card.onclick = () => {
            addObject(obj.type);
            pickerModal.classList.add("hidden");
        };
        pickerGrid.appendChild(card);
    });
    pickerModal.classList.remove("hidden");
});

document.getElementById("picker-cancel").addEventListener("click", () => {
    pickerModal.classList.add("hidden");
});

function addObject(type) {
    let obj = { x: camera.x + 340, y: camera.y + 260, width: 40, height: 40, type: type };
    if (type === 'door') {
        obj.width = 64; obj.height = 80; obj.orientation = 'top';
        if (!room.doors) room.doors = [];
        room.doors.push(obj);
    } else {
        if (type === 'student') { obj.width = 24; obj.height = 36; obj.variant = 'boy'; obj.text = 'Hello'; }
        if (type === 'desk') { obj.width = 70; obj.height = 60; }
        if (type === 'rug') { obj.width = 80; obj.height = 120; }
        if (type === 'bed') { obj.width = 60; obj.height = 100; }
        if (type === 'zone') { obj.width = 100; obj.height = 100; }
        room.furniture.push(obj);
    }
    selectedObject = obj;
    updatePropPanel();
    saveLocal();
}

const devSection1 = document.querySelector("#dev-sidebar .dev-section");
if (devSection1) {
    const editIntroBtn = document.createElement("button");
    editIntroBtn.textContent = "Edit Intro Dialogue";
    editIntroBtn.className = "dev-btn";
    editIntroBtn.style.marginTop = "10px";
    editIntroBtn.onclick = () => {
        selectedObject = {
            type: 'intro_manager',
            x: 0, y: 0, width: 0, height: 0,
            interaction: {
                enabled: true,
                type: 'sequence',
                conversations: [ introDialogue ]
            }
        };
        updatePropPanel();
    };
    devSection1.appendChild(editIntroBtn);
}

const menuBtn = document.createElement("button");
menuBtn.textContent = "🏠 Menu";
menuBtn.className = "btn-sm";
menuBtn.style.position = "absolute";
menuBtn.style.top = "10px";
menuBtn.style.left = "10px";
menuBtn.style.zIndex = "1000";
menuBtn.onclick = () => {
    if (confirm("Return to Main Menu? Unsaved progress in Play Mode will be lost.")) {
        location.reload();
    }
};
document.body.appendChild(menuBtn);

canvas.addEventListener("click", advanceDialogue);

function startGame() {
  isGameActive = true;
  document.getElementById("start-screen").style.display = "none";
  if (!playData.introSeen) {
      dialogue = JSON.parse(JSON.stringify(introDialogue));
      stage = 0;
      updateDialogue();
  }
  loop();
}

async function loadExternalData() {
    try {
        const savedData = localStorage.getItem('helios_design_data');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.levels && data.dialogue) {
                normalizeGameData(data);
                levels = data.levels;
                introDialogue = data.dialogue;
                currentLevelName = Object.keys(levels)[0] || 'classroom';
                loadLevel(currentLevelName);
                console.log("Auto-loaded Design Data from LocalStorage");
                return;
            }
        }
    } catch (e) {
        console.warn("LocalStorage access failed", e);
    }
    try {
        const response = await fetch('game-data.json?t=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            if (data.levels && data.dialogue) {
                normalizeGameData(data);
                levels = data.levels;
                introDialogue = data.dialogue;
                currentLevelName = Object.keys(levels)[0] || 'classroom';
                loadLevel(currentLevelName);
                console.log("Auto-loaded game-data.json");
            }
        }
    } catch (e) {
        console.log("No external game-data.json found, using defaults.");
    }
}

loadExternalData();

// Init Start Screen
const startMenu = document.querySelector(".start-menu");
// Check for Save Data
const hasSaveData = !!localStorage.getItem('helios_play_data');
if (hasSaveData) {
    const btnContinue = document.createElement("button");
    btnContinue.id = "btn-continue";
    btnContinue.className = "btn";
    btnContinue.textContent = "Continue";
    btnContinue.onclick = () => {
         isDeveloperMode = false;
         loadPlayState();
         if (playData.player.room) loadLevel(playData.player.room);
         startGame();
    };
    startMenu.insertBefore(btnContinue, startMenu.firstChild);
}

document.getElementById("btn-play").addEventListener("click", () => {
  isDeveloperMode = false;
  // New Game: Reset Play Data
  playData = {
      player: { x: 0, y: 0, room: Object.keys(levels)[0] || 'classroom', facing: 'down' },
      worldState: {},
      inventory: [],
      introSeen: false
  };
  savePlayState();
  loadLevel(playData.player.room); // Ensure we start at default spawn
  globalDarkness = 0; // Reset horror state visuals
  startGame();
});

document.getElementById("btn-dev").addEventListener("click", () => {
  isDeveloperMode = true;
  document.getElementById("dev-sidebar").classList.remove("hidden");
  updateDevRoomSelect();
  startGame();
});

function saveLocal() {
    if (isDeveloperMode) {
        saveDesignData();
    }
}

function saveDesignData() {
    const data = {
        levels: levels,
        dialogue: introDialogue
    };
    const jsonString = JSON.stringify(data, (key, value) => {
        if (key.startsWith('_')) return undefined;
        return value;
    }, 2);
    try {
        localStorage.setItem('helios_design_data', jsonString);
        console.log("Auto-saved Design Data");
    } catch (e) {
        console.warn("LocalStorage save failed", e);
    }
}

function savePlayState() {
    try {
        localStorage.setItem('helios_play_data', JSON.stringify(playData));
    } catch (e) { console.error(e); }
}

function loadPlayState() {
    try {
        const json = localStorage.getItem('helios_play_data');
        if (json) {
            playData = JSON.parse(json);
            // Load Level
            if (playData.player.room) {
                loadLevel(playData.player.room);
                player.x = playData.player.x;
                player.y = playData.player.y;
                player.facing = playData.player.facing;
            }
        }
    } catch (e) { console.error(e); }
}

document.getElementById("dev-save").addEventListener("click", async () => {
  const data = {
    levels: levels,
    dialogue: introDialogue
  };
  const jsonString = JSON.stringify(data, (key, value) => {
      if (key.startsWith('_')) return undefined;
      return value;
  }, 2);
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
          alert("File saved successfully!");
          return;
      } catch (err) {
          if (err.name !== 'AbortError') {
              console.error(err);
              alert("Error saving file via API. Falling back to download.");
          } else {
              return;
          }
      }
  }
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "game-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

const resetBtn = document.createElement("button");
resetBtn.className = "dev-btn-danger";
resetBtn.textContent = "Reset Design Data";
resetBtn.onclick = () => {
    if (confirm("Clear local design changes and revert to file data? Page will reload.")) {
        localStorage.removeItem('helios_design_data');
        location.reload();
    }
};
document.querySelector("#dev-sidebar .dev-section").appendChild(resetBtn);

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
        introDialogue = data.dialogue;
        loadLevel(currentLevelName);
        alert("Game data loaded successfully!");
        saveDesignData(); // Save loaded data
      } else {
        alert("Invalid game data file.");
      }
    } catch (err) {
      alert("Error parsing JSON");
    }
  };
  reader.readAsText(file);
});
document.getElementById("btn-reset").addEventListener("click", () => {
  if (confirm("Reset ALL data (Design + Play)?")) {
    localStorage.removeItem("helios_design_data");
    localStorage.removeItem("helios_play_data");
    location.reload();
  }
});
