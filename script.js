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
const keys = new Set();

const room = {
  width: canvas.width,
  height: canvas.height,
  padding: 32,
  wallHeight: 96,
  door: {
    width: 64,
    height: 80
  }
};

const player = {
  x: room.width / 2,
  y: room.height - 100,
  size: 24,
  speed: 3,
  facing: "down",
  walkFrame: 0
};

const desks = [
  { x: 100, y: 200, width: 90, height: 50 },
  { x: 490, y: 200, width: 90, height: 50 },
  { x: 100, y: 340, width: 90, height: 50 },
  { x: 490, y: 340, width: 90, height: 50 }
];

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

function checkCollision(x, y) {
  const half = player.size / 2;

  // Room bounds
  if (x - half < room.padding) return true;
  if (x + half > room.width - room.padding) return true;
  if (y - half < room.wallHeight) return true; // Wall collision
  if (y + half > room.height - room.padding) return true;

  // Furniture collision
  for (const desk of desks) {
    // Shrink desk hitbox slightly for "2.5D" feel (legs area)
    const dLeft = desk.x;
    const dRight = desk.x + desk.width;
    const dTop = desk.y;
    const dBottom = desk.y + desk.height;

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
    // Determine facing
    if (dy < 0) player.facing = "up";
    if (dy > 0) player.facing = "down";
    if (dx < 0) player.facing = "left";
    if (dx > 0) player.facing = "right";

    // Animation
    player.walkFrame += 0.2;

    const length = Math.hypot(dx, dy) || 1;
    dx = (dx / length) * player.speed;
    dy = (dy / length) * player.speed;

    // Try X movement
    if (!checkCollision(player.x + dx, player.y)) {
      player.x += dx;
    }
    // Try Y movement
    if (!checkCollision(player.x, player.y + dy)) {
      player.y += dy;
    }
  } else {
    // Reset to standing frame or idle loop
    player.walkFrame = 0;
  }
}

function drawRoom() {
  // Back Wall
  ctx.fillStyle = "#333";
  ctx.fillRect(0, 0, room.width, room.wallHeight);

  // Floor
  ctx.fillStyle = "#5d4037"; // Wood
  ctx.fillRect(0, room.wallHeight, room.width, room.height - room.wallHeight);

  // Floor details (planks)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  for (let i = room.wallHeight; i < room.height; i += 32) {
    ctx.fillRect(0, i, room.width, 2);
  }
  ctx.restore();

  // Side Borders (blacked out or walls)
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, room.padding, room.height);
  ctx.fillRect(room.width - room.padding, 0, room.padding, room.height);
  ctx.fillRect(0, room.height - room.padding, room.width, room.padding);

  // Baseboard
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(room.padding, room.wallHeight - 12, room.width - room.padding * 2, 12);
}

function drawDoor() {
  const dx = room.width / 2 - room.door.width / 2;
  const dy = room.wallHeight - room.door.height;

  // Frame
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(dx - 6, dy - 6, room.door.width + 12, room.door.height + 6);

  // Door itself
  ctx.fillStyle = "#ffca28";
  ctx.fillRect(dx, dy, room.door.width, room.door.height);

  // Shadow/Depth
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(dx, dy, 6, room.door.height);

  // Knob
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(dx + room.door.width - 12, dy + room.door.height / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawDesk(desk) {
  // Desk is drawn as a box with depth
  // Top surface
  const topHeight = 10;

  // Legs
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(desk.x + 4, desk.y + 10, 6, desk.height - 10);
  ctx.fillRect(desk.x + desk.width - 10, desk.y + 10, 6, desk.height - 10);

  // Shadow underneath
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(desk.x + 4, desk.y + desk.height - 4, desk.width - 8, 4);

  // Table Top
  ctx.fillStyle = "#8d6e63"; // Lighter wood
  ctx.fillRect(desk.x, desk.y, desk.width, desk.height - 15);

  // Front edge
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(desk.x, desk.y + desk.height - 15, desk.width, 5);

  // Papers on desk
  ctx.fillStyle = "#eee";
  ctx.fillRect(desk.x + 15, desk.y + 10, 20, 14);
}

function drawPlayer(x, y) {
  const w = 24;
  const h = 36;
  const px = x - w / 2;
  const py = y - h + 8;

  const animOffset = Math.sin(player.walkFrame) * 3; // For legs up/down
  const walkCycle = Math.sin(player.walkFrame); // -1 to 1

  ctx.save();

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, w / 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Color Palette
  const skinColor = "#ffcc80";
  const shirtColor = "#4caf50";
  const stripeColor = "#ffeb3b";
  const pantsColor = "#3e2723";
  const hairColor = "#5d4037";
  const eyeColor = "#333";

  if (player.facing === "down") {
    // Legs
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
    ctx.fillRect(px, py, 4, 10); // Sideburns
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

    // Hair (Full coverage on back)
    ctx.fillStyle = hairColor;
    ctx.fillRect(px, py, w, 8); // Top part
    ctx.fillRect(px + 2, py + 8, w - 4, 4); // Lower part

  } else if (player.facing === "left" || player.facing === "right") {
    const isRight = player.facing === "right";

    // Legs (swinging)
    const legSwing = walkCycle * 4;

    ctx.fillStyle = pantsColor;
    // Leg 1
    ctx.fillRect(px + w/2 - 3 + legSwing, py + 26, 6, 10);
    // Leg 2
    ctx.fillRect(px + w/2 - 3 - legSwing, py + 26, 6, 10);

    // Body (Side view)
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px + 4, py + 12, w - 8, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px + 4, py + 18, w - 8, 4);

    // Head (Side)
    ctx.fillStyle = skinColor;
    ctx.fillRect(px + 4, py, w - 8, 12);

    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 2, py, w - 4, 4); // Top
    if (isRight) {
       ctx.fillRect(px + 2, py, 4, 10); // Back of head hair
    } else {
       ctx.fillRect(px + w - 6, py, 4, 10); // Back of head hair
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
  ctx.clearRect(0, 0, room.width, room.height);
  drawRoom();
  drawDoor();

  // Depth sorting
  // Create a list of objects to render
  const renderList = [];

  // Player
  renderList.push({
    y: player.y, // Sort by feet Y
    draw: () => drawPlayer(player.x, player.y)
  });

  // Furniture
  desks.forEach(desk => {
    renderList.push({
      y: desk.y + desk.height, // Bottom of desk
      draw: () => drawDesk(desk)
    });
  });

  // Sort by Y
  renderList.sort((a, b) => a.y - b.y);

  // Draw
  renderList.forEach(obj => obj.draw());

  // Hints (on top)
  drawHints();
}

function drawHints() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "14px 'VT323', 'Courier New', monospace";
  ctx.textAlign = "center";

  // Hint near door
  if (player.y < room.wallHeight + 60) {
      // Only show if close?
  }
  ctx.fillText("Door", room.width / 2, room.wallHeight - 10);

  if (stage >= 2) {
    ctx.fillStyle = "#9e9e9e";
    ctx.fillText("W A S D", room.width - room.padding - 20, room.height - room.padding + 20);
  }
  ctx.restore();
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

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d"].includes(key)) {
    keys.add(key);
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key);
});

canvas.addEventListener("click", advanceDialogue);
updateDialogue();
loop();
