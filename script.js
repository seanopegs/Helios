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
  padding: 36,
  door: {
    width: 96,
    height: 24,
    thickness: 8
  }
};

const player = {
  x: room.width / 2,
  y: room.height - 90,
  size: 18,
  speed: 2.4
};

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
    const length = Math.hypot(dx, dy) || 1;
    dx = (dx / length) * player.speed;
    dy = (dy / length) * player.speed;
    player.x = clamp(player.x + dx, room.padding + player.size / 2, room.width - room.padding - player.size / 2);
    player.y = clamp(player.y + dy, room.padding + player.size / 2, room.height - room.padding - player.size / 2);
  }
}

function drawGrid() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  const step = 32;
  for (let x = room.padding; x < room.width - room.padding; x += step) {
    ctx.fillRect(x, room.padding, 1, room.height - room.padding * 2);
  }
  for (let y = room.padding; y < room.height - room.padding; y += step) {
    ctx.fillRect(room.padding, y, room.width - room.padding * 2, 1);
  }
  ctx.restore();
}

function drawRoom() {
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, room.width, room.height);

  ctx.save();
  ctx.strokeStyle = "#f2f2f2";
  ctx.lineWidth = 3;
  ctx.strokeRect(room.padding, room.padding, room.width - room.padding * 2, room.height - room.padding * 2);
  ctx.restore();

  drawGrid();
}

function drawDoor() {
  const doorX = room.width / 2 - room.door.width / 2;
  const doorY = room.padding - room.door.height + 2;

  ctx.save();
  ctx.fillStyle = "#d2a62f";
  ctx.fillRect(doorX, doorY + room.door.thickness, room.door.width, room.door.height - room.door.thickness);

  ctx.fillStyle = "#f4c542";
  ctx.fillRect(doorX, doorY, room.door.width, room.door.thickness);

  ctx.fillStyle = "#000";
  ctx.fillRect(doorX + room.door.width - 18, doorY + room.door.height / 2 - 2, 6, 6);
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.35)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
  ctx.restore();
}

function drawHints() {
  ctx.save();
  ctx.fillStyle = "#cfcfcf";
  ctx.font = "14px 'VT323', 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("Door", room.width / 2, room.padding - 14);
  if (stage >= 2) {
    ctx.fillStyle = "#9e9e9e";
    ctx.fillText("W A S D", room.width - room.padding - 14, room.height - room.padding + 20);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, room.width, room.height);
  drawRoom();
  drawDoor();
  drawPlayer();
  drawHints();
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

