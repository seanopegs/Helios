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
let isInteracting = false;
const keys = new Set();
const camera = { x: 0, y: 0 };

const levels = {
  classroom: {
    width: 680,
    height: 520,
    wallHeight: 96,
    padding: 32,
    doors: [
      { x: 340 - 32, y: 96 - 80, width: 64, height: 80, target: 'hallway', targetSpawn: { x: 1282, y: 440 } }
    ],
    spawn: { x: 120, y: 240 },
    furniture: [
      { type: 'bed', x: 50, y: 200, width: 50, height: 90, interaction: { text: "It's not the right time to sleep", speaker: "LUKE" } },
      { type: 'bed', x: 50, y: 340, width: 50, height: 90, interaction: { text: "It's not the right time to sleep", speaker: "LUKE" } },
      { type: 'bed', x: 680 - 100, y: 200, width: 50, height: 90, interaction: { text: "It's not the right time to sleep", speaker: "LUKE" } },
      { type: 'bed', x: 680 - 100, y: 340, width: 50, height: 90, interaction: { text: "It's not the right time to sleep", speaker: "LUKE" } },
      { type: 'desk', x: 340 - 60, y: 240, width: 120, height: 60 },
      { type: 'cupboard', x: 50, y: 96 - 30, width: 60, height: 90, facing: 'right', interaction: { text: "Why?", speaker: "LUKE" } },
      { type: 'cupboard', x: 680 - 110, y: 96 - 30, width: 60, height: 90, facing: 'left', interaction: { text: "Why?", speaker: "LUKE" } }
    ],
    npcs: []
  },
  hallway: {
    width: 1400,
    height: 520,
    wallHeight: 96,
    padding: 32,
    doors: [
      { x: 1250, y: 520 - 32, width: 64, height: 32, target: 'classroom', targetSpawn: { x: 340, y: 130 } },
      { x: 50, y: 96 - 80, width: 64, height: 80, target: 'real_classroom', targetSpawn: { x: 400, y: 500 } }
    ],
    spawn: { x: 1282, y: 520 - 80 },
    furniture: [
      { type: 'locker', x: 100, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 140, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 180, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 500, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 540, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 580, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 900, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 940, y: 96 - 60, width: 40, height: 80 },
      { type: 'locker', x: 980, y: 96 - 60, width: 40, height: 80 },
      { type: 'window', x: 300, y: 20, width: 100, height: 50 },
      { type: 'window', x: 700, y: 20, width: 100, height: 50 },
      { type: 'window', x: 1100, y: 20, width: 100, height: 50 }
    ],
    npcs: []
  },
  real_classroom: {
    width: 800,
    height: 600,
    wallHeight: 96,
    padding: 32,
    doors: [
      { x: 400 - 32, y: 600 - 32, width: 64, height: 32, target: 'hallway', targetSpawn: { x: 80, y: 150 } }
    ],
    spawn: { x: 400, y: 500 },
    furniture: [
        { type: 'desk', x: 350, y: 140, width: 100, height: 60 },
        { type: 'window', x: 100, y: 20, width: 100, height: 50 },
        { type: 'window', x: 600, y: 20, width: 100, height: 50 },
        { type: 'desk', x: 100, y: 250, width: 80, height: 50 },
        { type: 'desk', x: 250, y: 250, width: 80, height: 50 },
        { type: 'desk', x: 400, y: 250, width: 80, height: 50 },
        { type: 'desk', x: 550, y: 250, width: 80, height: 50 },
        { type: 'desk', x: 100, y: 350, width: 80, height: 50 },
        { type: 'desk', x: 250, y: 350, width: 80, height: 50 },
        { type: 'desk', x: 400, y: 350, width: 80, height: 50 },
        { type: 'desk', x: 550, y: 350, width: 80, height: 50 },
        { type: 'desk', x: 100, y: 450, width: 80, height: 50 },
        { type: 'desk', x: 250, y: 450, width: 80, height: 50 },
        { type: 'desk', x: 400, y: 450, width: 80, height: 50 },
        { type: 'desk', x: 550, y: 450, width: 80, height: 50 }
    ],
    npcs: [
        { x: 140, y: 260, sitting: true, color: '#e57373' },
        { x: 440, y: 260, sitting: true, color: '#64b5f6' },
        { x: 290, y: 360, sitting: true, color: '#81c784' },
        { x: 590, y: 360, sitting: true, color: '#ba68c8' },
        { x: 140, y: 460, sitting: true, color: '#ffd54f' },
        { x: 440, y: 460, sitting: true, color: '#a1887f' }
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

  isInteracting = false;
  isHintActive = false;
  updateDialogue();
}

function updateDialogue() {
  if (isInteracting) return;

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

function checkCollision(x, y) {
  const half = player.size / 2;

  if (x - half < room.padding) return true;
  if (x + half > room.width - room.padding) return true;
  if (y - half < room.wallHeight) return true;
  if (y + half > room.height - room.padding) return true;

  for (const item of room.furniture) {
    if (item.type === 'window') continue;

    const dLeft = item.x;
    const dRight = item.x + item.width;
    const dTop = item.y;
    const dBottom = item.y + item.height;

    if (x + half > dLeft && x - half < dRight &&
        y + half > dTop && y - half < dBottom) {
      return true;
    }
  }

  return false;
}

function handleMovement() {
  if (stage < 2 && currentLevelName === 'classroom') return;

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

  const camTargetX = player.x - canvas.width / 2;
  const maxCamX = room.width - canvas.width;
  camera.x = Math.max(0, Math.min(camTargetX, maxCamX));

  const camTargetY = player.y - canvas.height / 2;
  const maxCamY = room.height - canvas.height;
  camera.y = Math.max(0, Math.min(camTargetY, maxCamY));
}

function drawRoom() {
  ctx.fillStyle = currentLevelName === 'hallway' ? "#455a64" : "#333";
  ctx.fillRect(0, 0, room.width, room.wallHeight);

  ctx.fillStyle = currentLevelName === 'hallway' ? "#cfd8dc" : "#5d4037";
  if (currentLevelName === 'real_classroom') ctx.fillStyle = "#a1887f";

  ctx.fillRect(0, room.wallHeight, room.width, room.height - room.wallHeight);

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  if (currentLevelName === 'hallway') {
      for (let i = room.wallHeight; i < room.height; i += 64) {
          ctx.fillRect(0, i, room.width, 2);
      }
      for (let i = 0; i < room.width; i += 64) {
          ctx.fillRect(i, room.wallHeight, 2, room.height - room.wallHeight);
      }
  } else {
      for (let i = room.wallHeight; i < room.height; i += 32) {
        ctx.fillRect(0, i, room.width, 2);
      }
  }
  ctx.restore();

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, room.padding, room.height);
  ctx.fillRect(room.width - room.padding, 0, room.padding, room.height);
  ctx.fillRect(0, room.height - room.padding, room.width, room.padding);

  ctx.fillStyle = "#4e342e";
  ctx.fillRect(room.padding, room.wallHeight - 12, room.width - room.padding * 2, 12);
}

function drawDoors() {
  if (!room.doors) return;

  for (const door of room.doors) {
      const { x, y, width, height } = door;
      const isBottom = y > room.height / 2;

      if (isBottom) {
          ctx.fillStyle = "#3e2723";
          ctx.fillRect(x - 6, y, width + 12, height);

          ctx.fillStyle = "#5d4037";
          ctx.fillRect(x - 6, y, 6, height);
          ctx.fillRect(x + width, y, 6, height);

          ctx.fillStyle = "#263238";
          ctx.fillRect(x, y, width, height);

          ctx.fillStyle = "#78909c";
          ctx.fillRect(x, y + height - 4, width, 4);

          ctx.fillStyle = "#ef5350";
          ctx.fillRect(x + 4, y + height - 12, width - 8, 8);
      } else {
          ctx.fillStyle = "#3e2723";
          ctx.fillRect(x - 6, y - 6, width + 12, height + 6);

          ctx.fillStyle = "#ffca28";
          ctx.fillRect(x, y, width, height);

          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(x, y, 6, height);

          ctx.fillStyle = "#333";
          ctx.beginPath();
          ctx.arc(x + width - 12, y + height / 2, 4, 0, Math.PI * 2);
          ctx.fill();
      }
  }
}

function drawBed(item) {
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    ctx.fillStyle = "#e0f7fa";
    ctx.fillRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(item.x + 4, item.y + 4, item.width - 8, 20);

    ctx.fillStyle = "#0277bd";
    ctx.fillRect(item.x + 2, item.y + 30, item.width - 4, item.height - 32);
}

function drawDesk(item) {
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(item.x + 4, item.y + 10, 6, item.height - 10);
  ctx.fillRect(item.x + item.width - 10, item.y + 10, 6, item.height - 10);

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(item.x + 4, item.y + item.height - 4, item.width - 8, 4);

  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(item.x, item.y, item.width, item.height - 15);

  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(item.x, item.y + item.height - 15, item.width, 5);
}

function drawCupboard(item) {
    const facing = item.facing || 'down';
    ctx.fillStyle = "#4e342e";
    ctx.fillRect(item.x, item.y, item.width, item.height);

    if (facing === 'down') {
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
        ctx.beginPath();
        ctx.moveTo(item.x + item.width / 2, item.y + 2);
        ctx.lineTo(item.x + item.width / 2, item.y + item.height - 2);
        ctx.stroke();
        ctx.fillStyle = "#ffb74d";
        ctx.beginPath();
        ctx.arc(item.x + item.width/2 - 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.arc(item.x + item.width/2 + 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.fill();
    } else if (facing === 'right') {
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
        ctx.beginPath();
        ctx.moveTo(item.x + item.width - 10, item.y + 2);
        ctx.lineTo(item.x + item.width - 10, item.y + item.height - 2);
        ctx.stroke();
        ctx.fillStyle = "#ffb74d";
        ctx.beginPath();
        ctx.arc(item.x + item.width - 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.fill();
    } else if (facing === 'left') {
        ctx.strokeStyle = "#3e2723";
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
        ctx.beginPath();
        ctx.moveTo(item.x + 10, item.y + 2);
        ctx.lineTo(item.x + 10, item.y + item.height - 2);
        ctx.stroke();
        ctx.fillStyle = "#ffb74d";
        ctx.beginPath();
        ctx.arc(item.x + 4, item.y + item.height/2, 2, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawLocker(item) {
    ctx.fillStyle = "#607d8b";
    ctx.fillRect(item.x, item.y, item.width, item.height);
    ctx.fillStyle = "#546e7a";
    ctx.fillRect(item.x + 4, item.y + 10, item.width - 8, 4);
    ctx.fillRect(item.x + 4, item.y + 16, item.width - 8, 4);
    ctx.fillRect(item.x + 4, item.y + 22, item.width - 8, 4);
    ctx.fillStyle = "#cfd8dc";
    ctx.fillRect(item.x + item.width - 8, item.y + item.height/2, 4, 10);
}

function drawWindow(item) {
    ctx.fillStyle = "#81d4fa";
    ctx.fillRect(item.x, item.y, item.width, item.height);
    ctx.strokeStyle = "#eceff1";
    ctx.lineWidth = 4;
    ctx.strokeRect(item.x, item.y, item.width, item.height);
    ctx.beginPath();
    ctx.moveTo(item.x + item.width/2, item.y);
    ctx.lineTo(item.x + item.width/2, item.y + item.height);
    ctx.moveTo(item.x, item.y + item.height/2);
    ctx.lineTo(item.x + item.width, item.y + item.height/2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.moveTo(item.x + 10, item.y + item.height);
    ctx.lineTo(item.x + 30, item.y);
    ctx.lineTo(item.x + 50, item.y);
    ctx.lineTo(item.x + 30, item.y + item.height);
    ctx.fill();
}

function drawFurnitureItem(item) {
    if (item.type === 'desk') drawDesk(item);
    else if (item.type === 'bed') drawBed(item);
    else if (item.type === 'cupboard') drawCupboard(item);
    else if (item.type === 'locker') drawLocker(item);
    else if (item.type === 'window') drawWindow(item);
}

function drawNPC(npc) {
    const w = 24;
    const h = 36;
    const x = npc.x;
    const y = npc.y;

    const time = Date.now() / 400;
    const breathe = Math.sin(time) * 1;

    ctx.save();

    const skinColor = npc.skin || "#ffcc80";
    const shirtColor = npc.color || npc.shirt || "#4caf50";
    const hairColor = "#3e2723";

    const px = x - w / 2;
    const py = y - h + 8;

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + 6, w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (npc.sitting) {
        ctx.fillStyle = "#3e2723";
        ctx.fillRect(px + 4, py + 26, 6, 6);
        ctx.fillRect(px + w - 10, py + 26, 6, 6);
        ctx.fillRect(px + 4, py + 32, 8, 4);
        ctx.fillRect(px + w - 10, py + 32, 8, 4);

        ctx.fillStyle = shirtColor;
        ctx.fillRect(px, py + 12 + breathe, w, 14);

        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 2, py + 2 + breathe, w - 4, 12);

        ctx.fillStyle = hairColor;
        ctx.fillRect(px, py + 2 + breathe, w, 4);
        ctx.fillRect(px, py + 2 + breathe, 4, 10);
        ctx.fillRect(px + w - 4, py + 2 + breathe, 4, 10);
    } else {
        ctx.fillStyle = shirtColor;
        ctx.fillRect(px, py + 12 + breathe, w, 14);
        ctx.fillStyle = skinColor;
        ctx.fillRect(px + 2, py + breathe, w - 4, 12);
        ctx.fillStyle = hairColor;
        ctx.fillRect(px, py + breathe, w, 4);
    }

    ctx.restore();
}

function drawPlayer(x, y) {
  const w = 24;
  const h = 36;

  const isMoving = player.walkFrame !== 0;
  const animOffset = Math.sin(player.walkFrame) * 5;
  const walkCycle = Math.sin(player.walkFrame);
  const bob = isMoving ? Math.abs(Math.sin(player.walkFrame * 2)) * 2 : 0;

  const px = x - w / 2;
  const py = y - h + 8 - bob;

  ctx.save();
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

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawRoom();
  drawDoors();

  const renderList = [];
  renderList.push({
    y: player.y,
    draw: () => drawPlayer(player.x, player.y)
  });

  if (room.furniture) {
    room.furniture.forEach(item => {
        renderList.push({
        y: item.y + item.height,
        draw: () => drawFurnitureItem(item)
        });
    });
  }

  if (room.npcs) {
      room.npcs.forEach(npc => {
          renderList.push({
              y: npc.y + 10,
              draw: () => drawNPC(npc)
          });
      });
  }

  renderList.sort((a, b) => a.y - b.y);
  renderList.forEach(obj => obj.draw());

  ctx.restore();

  drawHints();
}

function checkInteractable() {
    const range = 50;

    if (room.doors) {
        for (const door of room.doors) {
            const cx = door.x + door.width/2;
            const cy = door.y + door.height;
            const dist = Math.hypot(player.x - cx, player.y - cy);
            if (dist < range) return { type: 'door', obj: door };
        }
    }

    if (room.furniture) {
        for (const item of room.furniture) {
            if (item.interaction) {
                const cx = item.x + item.width / 2;
                const cy = item.y + item.height / 2;
                const dist = Math.hypot(player.x - cx, player.y - cy);
                if (dist < range + Math.max(item.width, item.height)/2 - 10) {
                    return { type: 'furniture', obj: item };
                }
            }
        }
    }
    return null;
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

  const interactable = checkInteractable();

  if (isInteracting) {
      if (!interactable) {
          isInteracting = false;
          updateDialogue();
      }
      return;
  }

  let showingHint = false;
  if (interactable) {
      showingHint = true;
      if (!isHintActive) {
         dialogueBox.hidden = false;
         dialogueBox.classList.remove("dialogue--hidden");
         dialogueBox.classList.add("dialogue--active");
         dialogueLine.textContent = "Press [SPACE]";
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
  if (isInteracting) {
      return;
  }

  if (stage < dialogue.length - 1) {
    stage += 1;
    updateDialogue();
  } else if (stage === dialogue.length - 1) {
    stage += 1;
    updateDialogue();
  }
}

function handleInteraction() {
    const interactable = checkInteractable();
    if (!interactable) return;

    if (interactable.type === 'door') {
        if (interactable.obj.target) {
            loadLevel(interactable.obj.target, interactable.obj.targetSpawn);
        }
    } else if (interactable.type === 'furniture') {
        dialogueBox.hidden = false;
        dialogueBox.classList.remove("dialogue--hidden");
        dialogueBox.classList.add("dialogue--active");

        dialogueLine.textContent = interactable.obj.interaction.text;

        const speaker = interactable.obj.interaction.speaker;
        dialogueLabel.textContent = speaker || "";
        dialogueLabel.classList.toggle("dialogue__label--hidden", !Boolean(speaker));

        dialoguePrompt.textContent = "";
        isInteracting = true;
        isHintActive = false;
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
