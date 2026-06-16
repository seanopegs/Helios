/* =====================================================================
 * HELIOS - Rendering (drawing the room, furniture, player, effects)
 * ===================================================================== */
"use strict";

// `Helios` is declared in js/helios.js and shared across all game scripts.
if (!window.Helios) throw new Error("Helios namespace missing - did js/helios.js load first?");

/* ---------------------------------------------------------------------
 * Room theme palettes
 * ------------------------------------------------------------------- */
const THEMES = {
  hall: { wall: "#3f5765", wallTop: "#576d79", floor: "#cfd8dc", floorAlt: "#bcc8cc", baseboard: "#1c262f", detail: "#b0bec5", pattern: 64, vertical: true, floorMode: "tile" },
  dorm: { wall: "#8d6e63", wallTop: "#a78577", floor: "#4a2e24", floorAlt: "#6b4330", baseboard: "#281915", detail: "rgba(0,0,0,0.18)", pattern: 32, vertical: true, floorMode: "wood" },
  classroom: { wall: "#6f707f", wallTop: "#8f90a0", floor: "#5e3b2d", floorAlt: "#7a4b39", baseboard: "#2a1712", detail: "rgba(255,255,255,0.08)", pattern: 46, vertical: true, floorMode: "wood" },
  office_clean: { wall: "#8c6f64", wallTop: "#ab8c7f", floor: "#5a372b", floorAlt: "#744839", baseboard: "#5c433c", detail: "rgba(255,255,255,0.08)", pattern: 42, vertical: true, floorMode: "wood" },
  office: { wall: "#5d463f", wallTop: "#7c5d53", floor: "#35211a", floorAlt: "#4a2d24", baseboard: "#1a1412", detail: "rgba(255,255,255,0.05)", pattern: 26, vertical: true, floorMode: "wood" }
};

const DOOR_PALETTES = {
  hall: { wall: "#3f5765", floor: "#cfd8dc", baseboard: "#1c262f" },
  dorm: { wall: "#8d6e63", floor: "#3e2723", baseboard: "#281915" },
  classroom: { wall: "#2c3e50", floor: "#e9e4d5", baseboard: "#1f2d3a" },
  office_clean: { wall: "#8c6f64", floor: "#7b5d52", baseboard: "#5c433c" },
  office: { wall: "#5d463f", floor: "#2a1f1c", baseboard: "#1a1412" }
};

function getActiveTheme() {
  if (currentLevelName === "principal_office" && !playData.worldState.horrorActive) return "office_clean";
  return room.theme || "dorm";
}
function getDoorPalette() {
  let name = room.theme || "dorm";
  if (currentLevelName === "principal_office" && !playData.worldState.horrorActive) name = "office_clean";
  return DOOR_PALETTES[name] || DOOR_PALETTES.dorm;
}

/* ---------------------------------------------------------------------
 * Room rendering
 * ------------------------------------------------------------------- */
function drawRoom() {
  if (currentLevelName === "vent_tunnel") {
    const shaftHeight = 72;
    const shaftTop = Math.round((room.height - shaftHeight) / 2);
    const shaftBottom = shaftTop + shaftHeight;
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, room.width, room.height);
    ctx.fillStyle = "#2f3c44";
    ctx.fillRect(0, shaftTop, room.width, shaftHeight);
    ctx.fillStyle = "#1b2328";
    ctx.fillRect(0, shaftTop, room.width, 8);
    ctx.fillRect(0, shaftBottom - 8, room.width, 8);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let x = 0; x < room.width; x += 44) ctx.fillRect(x, shaftTop + 10, 2, shaftHeight - 20);
    for (let y = shaftTop + 14; y < shaftBottom - 10; y += 14) ctx.fillRect(0, y, room.width, 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, shaftTop + 8, room.width, 8);
    ctx.fillRect(0, shaftBottom - 16, room.width, 8);
    return;
  }
  const themeName = getActiveTheme();
  const palette = THEMES[themeName] || THEMES.dorm;
  const wallGradient = ctx.createLinearGradient(0, 0, 0, room.wallHeight);
  wallGradient.addColorStop(0, palette.wallTop || palette.wall);
  wallGradient.addColorStop(0.65, palette.wall);
  wallGradient.addColorStop(1, palette.wall);
  ctx.fillStyle = wallGradient;
  ctx.fillRect(0, 0, room.width, room.wallHeight);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = room.padding; i < room.width - room.padding; i += 30) ctx.fillRect(i, 0, 1, room.wallHeight - 10);
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  for (let i = room.padding + 14; i < room.width - room.padding; i += 30) ctx.fillRect(i, 0, 1, room.wallHeight - 4);
  ctx.restore();

  const floorGradient = ctx.createLinearGradient(0, room.wallHeight, 0, room.height);
  floorGradient.addColorStop(0, palette.floorAlt || palette.floor);
  floorGradient.addColorStop(0.22, palette.floor);
  floorGradient.addColorStop(1, "#1a120f");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, room.wallHeight, room.width, room.height - room.wallHeight);

  ctx.save();
  if (palette.floorMode === "wood") {
    const plankHeight = themeName === "classroom" ? 28 : 24;
    for (let y = room.wallHeight; y < room.height; y += plankHeight) {
      const plankColor = (Math.floor((y - room.wallHeight) / plankHeight) % 2 === 0) ? palette.floorAlt : palette.floor;
      ctx.fillStyle = plankColor;
      ctx.fillRect(room.padding, y, room.width - room.padding * 2, plankHeight - 2);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(room.padding, y + 1, room.width - room.padding * 2, 1);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(room.padding, y + plankHeight - 3, room.width - room.padding * 2, 2);
      for (let x = room.padding + 24; x < room.width - room.padding - 24; x += 68) {
        const jointOffset = ((x + y) % 3) * 14;
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.fillRect(x + jointOffset, y + 3, 2, plankHeight - 8);
      }
      for (let x = room.padding + 16; x < room.width - room.padding - 16; x += 92) {
        const knot = Math.abs(Math.sin((x * 0.12) + (y * 0.07))) * 0.18 + 0.05;
        ctx.fillStyle = `rgba(20,10,8,${knot.toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(x, y + plankHeight / 2, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    ctx.fillStyle = palette.detail;
    for (let i = room.wallHeight; i < room.height; i += palette.pattern) ctx.fillRect(0, i, room.width, 2);
    if (palette.vertical) for (let i = 0; i < room.width; i += palette.pattern) ctx.fillRect(i, room.wallHeight, 2, room.height - room.wallHeight);
  }
  ctx.restore();

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, room.padding, room.height);
  ctx.fillRect(room.width - room.padding, 0, room.padding, room.height);
  ctx.fillRect(0, room.height - room.padding, room.width, room.padding);

  ctx.fillStyle = palette.baseboard;
  ctx.fillRect(room.padding, room.wallHeight - 12, room.width - room.padding * 2, 12);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(room.padding, room.wallHeight - 12, room.width - room.padding * 2, 2);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(room.padding, room.wallHeight, room.width - room.padding * 2, 10);

  const centerGlow = ctx.createRadialGradient(room.width / 2, room.wallHeight + 120, 40, room.width / 2, room.wallHeight + 120, room.width * 0.55);
  centerGlow.addColorStop(0, "rgba(255,220,180,0.16)");
  centerGlow.addColorStop(0.45, "rgba(255,190,120,0.08)");
  centerGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(room.padding, 0, room.width - room.padding * 2, room.height - room.padding);

  if (themeName === "office" && playData.worldState.horrorActive) {
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const sx = (i * 41) % (room.width - 80) + room.padding;
      const sy = room.wallHeight + ((i * 67) % (room.height - room.wallHeight - 40));
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 18, sy + 12);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawFurnitureShadow(item, targetCtx = ctx) {
  if (!item || item.type === "window" || item.type === "wall_switch" || item.type === "vent") return;
  const baseX = item.x + item.width / 2;
  const baseY = item.y + item.height - 4;
  const shadowW = Math.max(10, item.width * 0.48);
  const shadowH = Math.max(4, item.height * 0.12);
  targetCtx.save();
  targetCtx.fillStyle = "rgba(0,0,0,0.16)";
  targetCtx.beginPath();
  targetCtx.ellipse(baseX + 5, baseY + 6, shadowW, shadowH, -0.12, 0, Math.PI * 2);
  targetCtx.fill();
  if (item.height > 50) {
    const falloff = targetCtx.createLinearGradient(item.x, item.y, item.x + item.width, item.y + item.height);
    falloff.addColorStop(0, "rgba(0,0,0,0.14)");
    falloff.addColorStop(1, "rgba(0,0,0,0)");
    targetCtx.fillStyle = falloff;
    targetCtx.beginPath();
    targetCtx.moveTo(item.x + 6, item.y + item.height * 0.25);
    targetCtx.lineTo(item.x + item.width * 0.85, item.y + item.height * 0.12);
    targetCtx.lineTo(item.x + item.width * 0.96, item.y + item.height * 0.65);
    targetCtx.lineTo(item.x + item.width * 0.2, item.y + item.height * 0.82);
    targetCtx.closePath();
    targetCtx.fill();
  }
  targetCtx.restore();
}

function drawSceneLighting() {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  room.furniture.forEach((item) => {
    if (!item || isItemHidden(item)) return;
    if (item.hasLamp) {
      const lightX = item.x + 15;
      const lightY = item.y + 10;
      const glow = ctx.createRadialGradient(lightX, lightY, 2, lightX, lightY, 104);
      glow.addColorStop(0, "rgba(255,241,196,0.52)");
      glow.addColorStop(0.16, "rgba(255,212,120,0.24)");
      glow.addColorStop(0.45, "rgba(255,184,90,0.08)");
      glow.addColorStop(1, "rgba(255,184,90,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(lightX - 104, lightY - 104, 208, 208);
    }
    if (item.hasLaptop) {
      const screenX = item.x + item.width / 2;
      const screenY = item.y + 10;
      const monitorGlow = ctx.createRadialGradient(screenX, screenY, 2, screenX, screenY, 42);
      monitorGlow.addColorStop(0, "rgba(120,210,255,0.18)");
      monitorGlow.addColorStop(1, "rgba(120,210,255,0)");
      ctx.fillStyle = monitorGlow;
      ctx.fillRect(screenX - 42, screenY - 42, 84, 84);
    }
  });
  const playerGlow = ctx.createRadialGradient(player.x, player.y - 18, 8, player.x, player.y - 18, 60);
  playerGlow.addColorStop(0, "rgba(255,214,140,0.04)");
  playerGlow.addColorStop(1, "rgba(255,214,140,0)");
  ctx.fillStyle = playerGlow;
  ctx.fillRect(player.x - 60, player.y - 78, 120, 120);
  ctx.restore();
}

function drawScreenEffects() {
  ctx.save();
  const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.18, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.7, "rgba(4,7,14,0.16)");
  vignette.addColorStop(1, "rgba(2,4,10,0.52)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let i = 0; i < 10; i++) {
    const sparkleX = (i * 89 + Math.floor(Date.now() / 40)) % (canvas.width + 120) - 60;
    const sparkleY = 72 + (i * 31) % Math.max(120, canvas.height - 140);
    ctx.fillRect(sparkleX, sparkleY, 1, 1);
  }
  ctx.restore();
}

/* ---------------------------------------------------------------------
 * Doors
 * ------------------------------------------------------------------- */
function drawSealedDoor(door, targetCtx = ctx) {
  const { x, y, width, height } = door;
  const orientation = door.orientation || "left";
  if (orientation === "left") {
    targetCtx.fillStyle = "#221714";
    targetCtx.fillRect(0, y, room.padding, height);
    targetCtx.fillStyle = "#4e342e";
    targetCtx.fillRect(6, y - 4, room.padding - 6, height + 8);
    targetCtx.fillStyle = "#3a241d";
    targetCtx.fillRect(12, y + 2, room.padding - 18, height - 4);
    targetCtx.fillStyle = "#6d4c41";
    targetCtx.save();
    targetCtx.translate(10, y + 18);
    targetCtx.rotate(-0.22);
    targetCtx.fillRect(0, 0, room.padding + 12, 10);
    targetCtx.restore();
    targetCtx.save();
    targetCtx.translate(8, y + height / 2 - 4);
    targetCtx.rotate(0.16);
    targetCtx.fillRect(0, 0, room.padding + 14, 10);
    targetCtx.restore();
    targetCtx.save();
    targetCtx.translate(10, y + height - 28);
    targetCtx.rotate(-0.18);
    targetCtx.fillRect(0, 0, room.padding + 10, 10);
    targetCtx.restore();
    targetCtx.fillStyle = "rgba(255,255,255,0.08)";
    targetCtx.fillRect(room.padding - 10, y + 8, 2, height - 16);
    return;
  }
  targetCtx.fillStyle = "#3a241d";
  targetCtx.fillRect(x, y, width, height);
}

function drawDoor(door, targetCtx = ctx) {
  const { x, y, width, height } = door;
  const orientation = door.orientation || (y > room.height / 2 ? "bottom" : "top");
  if (door.sealedVisual) { drawSealedDoor(door, targetCtx); return; }
  if (orientation === "bottom") {
    const padding = 32;
    if (currentLevelName === "hallway" || currentLevelName === "principal_hallway") {
      const matTop = y;
      const matHeight = 28;
      targetCtx.fillStyle = "#3e2723";
      targetCtx.fillRect(x - 2, matTop - 2, width + 4, matHeight + 4);
      targetCtx.fillStyle = "#5d4037";
      targetCtx.fillRect(x, matTop, width, matHeight);
      targetCtx.fillStyle = "rgba(0,0,0,0.15)";
      for (let i = 0; i < width; i += 8) targetCtx.fillRect(x + i, matTop, 4, matHeight);
      for (let j = 0; j < matHeight; j += 8) targetCtx.fillRect(x, matTop + j, width, 2);
      targetCtx.fillStyle = "rgba(255,255,255,0.6)";
      targetCtx.beginPath();
      targetCtx.moveTo(x + width / 2 - 10, matTop + 8);
      targetCtx.lineTo(x + width / 2 + 10, matTop + 8);
      targetCtx.lineTo(x + width / 2, matTop + 20);
      targetCtx.fill();
      targetCtx.fillStyle = "#4e342e";
      targetCtx.fillRect(x - 4, y + 40, width + 8, 12);
    } else {
      const pal = getDoorPalette();
      const bottomEdge = room.height - padding;
      targetCtx.fillStyle = "#1e1410";
      targetCtx.fillRect(x, bottomEdge, width, padding + 10);
      targetCtx.fillStyle = pal.wall;
      targetCtx.fillRect(x - 50, bottomEdge, 50, padding);
      targetCtx.fillRect(x + width, bottomEdge, 50, padding);
      targetCtx.fillStyle = pal.baseboard;
      targetCtx.fillRect(x - 50, bottomEdge, 50, 6);
      targetCtx.fillRect(x + width, bottomEdge, 50, 6);
      targetCtx.fillStyle = "#4e342e";
      targetCtx.fillRect(x, bottomEdge, width, 6);
      targetCtx.fillStyle = "#2d1e19";
      targetCtx.fillRect(x, bottomEdge + 6, 6, padding - 6);
      targetCtx.fillRect(x + width - 6, bottomEdge + 6, 6, padding - 6);
      targetCtx.fillStyle = "#6d4c41";
      targetCtx.fillRect(x + 6, bottomEdge + 6, 4, padding - 6);
      targetCtx.fillRect(x + width - 10, bottomEdge + 6, 4, padding - 6);
      targetCtx.fillStyle = "#f0c419";
      targetCtx.fillRect(x + 8, bottomEdge + padding - 10, 3, 6);
      targetCtx.fillRect(x + width - 11, bottomEdge + padding - 10, 3, 6);
      const matH = 28;
      targetCtx.fillStyle = "#3e2723";
      targetCtx.fillRect(x - 4, bottomEdge - matH - 4, width + 8, matH + 4);
      targetCtx.fillStyle = "#5d4037";
      targetCtx.fillRect(x - 2, bottomEdge - matH - 2, width + 4, matH);
      targetCtx.fillStyle = "rgba(255,255,255,0.4)";
      targetCtx.beginPath();
      targetCtx.moveTo(x + width / 2, bottomEdge - 6);
      targetCtx.lineTo(x + width / 2 - 12, bottomEdge - matH + 6);
      targetCtx.lineTo(x + width / 2 + 12, bottomEdge - matH + 6);
      targetCtx.fill();
    }
  } else if (orientation === "left") {
    const padding = 32;
    const pal = getDoorPalette();
    targetCtx.fillStyle = "#1e1410";
    targetCtx.fillRect(x - 10, y, padding + 10 - x, height);
    targetCtx.fillStyle = pal.wall;
    targetCtx.fillRect(0, y - 50, padding, 50);
    targetCtx.fillRect(0, y + height, padding, 50);
    targetCtx.fillStyle = pal.baseboard;
    targetCtx.fillRect(padding - 6, y - 50, 6, 50);
    targetCtx.fillRect(padding - 6, y + height, 6, 50);
    targetCtx.fillStyle = "#4e342e";
    targetCtx.fillRect(padding - 6, y, 6, height);
    targetCtx.fillStyle = "#2d1e19";
    targetCtx.fillRect(x - 10, y, padding + 10 - x, 6);
    targetCtx.fillRect(x - 10, y + height - 6, padding + 10 - x, 6);
    const matW = 20;
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(padding, y + 4, matW + 4, height - 8);
    targetCtx.fillStyle = "#5d4037";
    targetCtx.fillRect(padding + 2, y + 6, matW, height - 12);
    targetCtx.fillStyle = "rgba(255,255,255,0.4)";
    targetCtx.beginPath();
    targetCtx.moveTo(padding + 8, y + height / 2);
    targetCtx.lineTo(padding + 16, y + height / 2 - 6);
    targetCtx.lineTo(padding + 16, y + height / 2 + 6);
    targetCtx.fill();
  } else if (orientation === "right") {
    const padding = 32;
    const pal = getDoorPalette();
    const rightEdge = room.width - padding;
    targetCtx.fillStyle = "#1e1410";
    targetCtx.fillRect(rightEdge, y, width, height);
    targetCtx.fillStyle = pal.wall;
    targetCtx.fillRect(rightEdge, y - 50, padding, 50);
    targetCtx.fillRect(rightEdge, y + height, padding, 50);
    targetCtx.fillStyle = pal.baseboard;
    targetCtx.fillRect(rightEdge, y - 50, 6, 50);
    targetCtx.fillRect(rightEdge, y + height, 6, 50);
    targetCtx.fillStyle = "#4e342e";
    targetCtx.fillRect(rightEdge, y, 6, height);
    targetCtx.fillStyle = "#2d1e19";
    targetCtx.fillRect(rightEdge + 6, y, width - 6, 6);
    targetCtx.fillRect(rightEdge + 6, y + height - 6, width - 6, 6);
    const matW = 20;
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(rightEdge - matW - 4, y + 4, matW + 4, height - 8);
    targetCtx.fillStyle = "#5d4037";
    targetCtx.fillRect(rightEdge - matW - 2, y + 6, matW, height - 12);
    targetCtx.fillStyle = "rgba(255,255,255,0.4)";
    targetCtx.beginPath();
    targetCtx.moveTo(rightEdge - 8, y + height / 2);
    targetCtx.lineTo(rightEdge - 16, y + height / 2 - 6);
    targetCtx.lineTo(rightEdge - 16, y + height / 2 + 6);
    targetCtx.fill();
  } else {
    targetCtx.fillStyle = "#3a271f";
    targetCtx.fillRect(x - 6, y - 6, width + 12, height + 10);
    const gradient = targetCtx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, "#8d6e63");
    gradient.addColorStop(1, "#5d4037");
    targetCtx.fillStyle = gradient;
    targetCtx.fillRect(x, y, width, height);
    if (width > 80) {
      const panelW = width / 2;
      targetCtx.fillStyle = "#3e2723";
      targetCtx.fillRect(x + panelW - 1, y, 2, height);
      targetCtx.fillStyle = "#f0c419";
      targetCtx.beginPath();
      targetCtx.arc(x + panelW - 6, y + height / 2 + 6, 4, 0, Math.PI * 2);
      targetCtx.arc(x + panelW + 6, y + height / 2 + 6, 4, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.strokeStyle = "rgba(0,0,0,0.15)";
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(x + 8, y + 8, panelW - 16, height / 2 - 12);
      targetCtx.strokeRect(x + panelW + 8, y + 8, panelW - 16, height / 2 - 12);
      targetCtx.strokeRect(x + 8, y + height / 2 + 8, panelW - 16, height / 2 - 16);
      targetCtx.strokeRect(x + panelW + 8, y + height / 2 + 8, panelW - 16, height / 2 - 16);
    } else {
      targetCtx.fillStyle = "rgba(0,0,0,0.2)";
      targetCtx.fillRect(x, y, 6, height);
      targetCtx.fillStyle = "#f0c419";
      targetCtx.beginPath();
      targetCtx.arc(x + width - 12, y + height / 2, 4, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.strokeStyle = "rgba(0,0,0,0.15)";
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(x + 10, y + 10, width - 20, height / 2 - 16);
      targetCtx.strokeRect(x + 10, y + height / 2 + 10, width - 20, height / 2 - 20);
    }
  }
}

function drawDoors() { (room.doors || []).forEach((d) => drawDoor(d, ctx)); }

/* ---------------------------------------------------------------------
 * Furniture renderers (one function per furniture type)
 * ------------------------------------------------------------------- */
function drawDesk(item, t = ctx) {
  t.fillStyle = "#3e2723";
  t.fillRect(item.x + 4, item.y + 10, 4, item.height - 10);
  t.fillRect(item.x + item.width - 8, item.y + 10, 4, item.height - 10);
  t.fillStyle = "#6d4c41";
  t.fillRect(item.x, item.y, item.width, item.height - 10);
  if (item.width > 50) {
    t.fillStyle = "#5d4037";
    t.fillRect(item.x + item.width - 20, item.y + 10, 18, 20);
    t.fillStyle = "#3e2723";
    t.fillRect(item.x + item.width - 12, item.y + 18, 4, 4);
  }
  if (item.hasLaptop) {
    t.fillStyle = "#cfd8dc";
    t.fillRect(item.x + item.width / 2 - 10, item.y + 5, 20, 12);
    t.fillStyle = "#b0bec5";
    t.fillRect(item.x + item.width / 2 - 10, item.y + 17, 20, 8);
    t.fillStyle = "#81d4fa";
    t.fillRect(item.x + item.width / 2 - 8, item.y + 7, 16, 8);
  }
  if (item.hasLamp) {
    t.fillStyle = "#fff59d";
    t.beginPath();
    t.moveTo(item.x + 10, item.y + 15);
    t.lineTo(item.x + 20, item.y + 15);
    t.lineTo(item.x + 15, item.y + 5);
    t.fill();
    t.fillStyle = "#3e2723";
    t.fillRect(item.x + 14, item.y + 15, 2, 5);
  }
}

function drawTable(item, t = ctx) {
  t.fillStyle = "rgba(0,0,0,0.25)";
  t.fillRect(item.x + 6, item.y + item.height - 6, item.width - 12, 6);
  t.fillStyle = "#2f2a28";
  t.fillRect(item.x + 6, item.y + 12, 8, item.height - 18);
  t.fillRect(item.x + item.width - 14, item.y + 12, 8, item.height - 18);
  t.fillRect(item.x + item.width / 2 - 4, item.y + 12, 8, item.height - 18);
  const g = t.createLinearGradient(item.x, item.y, item.x, item.y + item.height);
  g.addColorStop(0, "#b0a089");
  g.addColorStop(1, "#9e8c74");
  t.fillStyle = g;
  t.fillRect(item.x, item.y, item.width, item.height - 10);
  t.fillStyle = "#7b6a56";
  t.fillRect(item.x, item.y + item.height - 10, item.width, 10);
}

function drawBed(item, t = ctx) {
  t.fillStyle = "#5d4037";
  t.fillRect(item.x, item.y, item.width, 12);
  t.fillRect(item.x, item.y + item.height - 8, item.width, 8);
  t.fillStyle = "#eceff1";
  t.fillRect(item.x + 4, item.y + 8, item.width - 8, item.height - 16);
  t.fillStyle = "#5c6bc0";
  t.fillRect(item.x + 4, item.y + 30, item.width - 8, item.height - 38);
  t.fillStyle = "rgba(255,255,255,0.1)";
  for (let i = 0; i < item.width - 8; i += 10) {
    for (let j = 0; j < item.height - 38; j += 10) {
      if ((i + j) % 20 === 0) t.fillRect(item.x + 4 + i, item.y + 30 + j, 5, 5);
    }
  }
  t.fillStyle = "#fff";
  t.fillRect(item.x + 8, item.y + 12, item.width - 16, 15);
}

function drawCupboard(item, t = ctx) {
  t.fillStyle = "#4e342e";
  t.fillRect(item.x, item.y, item.width, item.height);
  t.strokeStyle = "#3e2723";
  t.lineWidth = 2;
  t.strokeRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4);
  t.beginPath();
  t.moveTo(item.x + item.width / 2, item.y + 2);
  t.lineTo(item.x + item.width / 2, item.y + item.height - 2);
  t.stroke();
  t.fillStyle = "#3e2723";
  t.fillRect(item.x + 6, item.y + 10, item.width / 2 - 10, item.height / 2 - 15);
  t.fillRect(item.x + 6, item.y + item.height / 2 + 5, item.width / 2 - 10, item.height / 2 - 15);
  t.fillRect(item.x + item.width / 2 + 4, item.y + 10, item.width / 2 - 10, item.height / 2 - 15);
  t.fillRect(item.x + item.width / 2 + 4, item.y + item.height / 2 + 5, item.width / 2 - 10, item.height / 2 - 15);
  t.fillStyle = "#ffd54f";
  t.beginPath();
  t.arc(item.x + item.width / 2 - 4, item.y + item.height / 2, 2, 0, Math.PI * 2);
  t.arc(item.x + item.width / 2 + 4, item.y + item.height / 2, 2, 0, Math.PI * 2);
  t.fill();
}

function drawChest(item, t = ctx) {
  if (item.id === "secret_room_supply_chest" && playData.worldState.secretRoomChestOpened) {
    t.fillStyle = "rgba(0,0,0,0.22)";
    t.fillRect(item.x + 6, item.y + item.height - 10, item.width - 12, 10);
    t.fillStyle = "#4a2f26";
    t.fillRect(item.x, item.y + 18, item.width, item.height - 18);
    t.fillStyle = "#3a241d";
    t.fillRect(item.x + 8, item.y + 4, item.width - 16, 16);
    t.fillStyle = "#6d4c41";
    t.beginPath();
    t.moveTo(item.x + 6, item.y + 16);
    t.lineTo(item.x + 16, item.y - 6);
    t.lineTo(item.x + item.width - 16, item.y - 6);
    t.lineTo(item.x + item.width - 6, item.y + 16);
    t.closePath();
    t.fill();
    t.fillStyle = "#263238";
    t.fillRect(item.x + item.width / 2 - 6, item.y + 22, 12, 12);
    return;
  }
  t.fillStyle = "#5d4037";
  t.fillRect(item.x, item.y, item.width, item.height);
  t.fillStyle = "#4e342e";
  for (let i = 0; i < item.height; i += 12) t.fillRect(item.x, item.y + i, item.width, 1);
  t.fillStyle = "#3e2723";
  t.fillRect(item.x + 10, item.y, 8, item.height);
  t.fillRect(item.x + item.width - 18, item.y, 8, item.height);
  t.fillStyle = "#263238";
  t.fillRect(item.x + item.width / 2 - 6, item.y + 10, 12, 14);
  t.fillStyle = "#78909c";
  t.fillRect(item.x + item.width / 2 - 2, item.y + 18, 4, 4);
}

function drawFloorPatch(item, t = ctx) {
  const revealed = Boolean(playData.worldState.secretRoomHatchRevealed);
  if (!revealed) {
    t.fillStyle = "rgba(28,17,13,0.18)";
    t.fillRect(item.x, item.y, item.width, item.height);
    t.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = item.y + 6; y < item.y + item.height; y += 18) t.fillRect(item.x + 4, y, item.width - 8, 2);
    t.fillStyle = "rgba(255,255,255,0.04)";
    t.fillRect(item.x + 6, item.y + 8, item.width - 12, 2);
    return;
  }
  t.fillStyle = "#1a100d";
  t.fillRect(item.x + 8, item.y + 10, item.width - 16, item.height - 18);
  t.fillStyle = "#4e342e";
  t.fillRect(item.x - 2, item.y + 2, item.width + 4, 8);
  t.fillRect(item.x + 4, item.y + item.height - 10, item.width - 8, 8);
  t.save();
  t.translate(item.x + 12, item.y + 10);
  t.rotate(-0.14);
  t.fillStyle = "#6d4c41";
  t.fillRect(0, 0, 34, 8);
  t.restore();
  t.save();
  t.translate(item.x + item.width - 18, item.y + 18);
  t.rotate(0.22);
  t.fillStyle = "#5d4037";
  t.fillRect(-24, 0, 24, 8);
  t.restore();
}

function drawPadlockedHatch(item, t = ctx) {
  if (isItemHidden(item)) return;
  const unlocked = Boolean(playData.worldState.secretRoomPadlockUnlocked);
  const hx = item.x + 6, hy = item.y + 10, hw = item.width - 12, hh = item.height - 18;
  t.fillStyle = "rgba(0,0,0,0.24)";
  t.fillRect(hx, hy + hh - 2, hw, 8);
  t.fillStyle = "#3e2723";
  t.fillRect(hx, hy, hw, hh);
  t.fillStyle = "#65433a";
  t.strokeRect(hx + 2, hy + 2, hw - 4, hh - 4);
  t.fillStyle = "#2f1d18";
  t.fillRect(hx + hw / 2 - 2, hy + 4, 4, hh - 8);
  t.fillRect(hx + 10, hy + hh / 2 - 2, hw - 20, 4);
  if (unlocked) {
    t.fillStyle = "#ad8f62";
    t.fillRect(hx + hw / 2 - 10, hy + hh / 2 - 2, 20, 4);
    t.fillStyle = "#111";
    t.fillRect(hx + hw - 18, hy + 10, 6, hh - 20);
    t.fillStyle = "rgba(0,0,0,0.35)";
    t.fillRect(hx + hw - 12, hy + 8, 10, hh - 16);
    return;
  }
  t.fillStyle = "#c7b18a";
  t.fillRect(hx + hw / 2 - 3, hy + 18, 6, 20);
  t.fillStyle = "#90a4ae";
  t.fillRect(hx + hw / 2 - 10, hy + 28, 20, 18);
  t.fillStyle = "#263238";
  t.fillRect(hx + hw / 2 - 4, hy + 36, 8, 6);
}

function drawRug(item, t = ctx) {
  t.fillStyle = item.color || "#8d6e63";
  t.fillRect(item.x, item.y, item.width, item.height);
  if (item.border) {
    t.strokeStyle = item.border;
    t.lineWidth = 4;
    t.strokeRect(item.x + 4, item.y + 4, item.width - 8, item.height - 8);
    t.lineWidth = 1;
  }
  t.strokeStyle = "rgba(0,0,0,0.1)";
  t.lineWidth = 1;
  t.beginPath();
  for (let i = 4; i < item.width; i += 4) { t.moveTo(item.x + i, item.y); t.lineTo(item.x + i, item.y + item.height); }
  t.stroke();
}

function drawSofa(item, t = ctx) {
  const color = item.color || "#4e342e";
  const highlight = "#5d4037";
  const shadow = "#2d1e19";
  t.fillStyle = "rgba(0,0,0,0.3)";
  t.fillRect(item.x - 2, item.y + item.height - 4, item.width + 4, 8);
  t.fillStyle = shadow;
  t.fillRect(item.x, item.y, item.width, item.height / 2);
  t.fillStyle = highlight;
  t.beginPath();
  t.moveTo(item.x, item.y);
  t.lineTo(item.x + 6, item.y - 6);
  t.lineTo(item.x + item.width - 6, item.y - 6);
  t.lineTo(item.x + item.width, item.y);
  t.fill();
  t.fillStyle = highlight;
  t.fillRect(item.x + 8, item.y + item.height / 2, item.width - 16, item.height / 2 - 4);
  t.fillStyle = color;
  t.fillRect(item.x + 8, item.y + item.height - 4, item.width - 16, 4);
  t.fillStyle = color;
  t.fillRect(item.x, item.y + 10, 8, item.height - 10);
  t.fillStyle = highlight;
  t.fillRect(item.x, item.y + 10, 8, -6);
  t.fillStyle = color;
  t.fillRect(item.x + item.width - 8, item.y + 10, 8, item.height - 10);
  t.fillStyle = highlight;
  t.fillRect(item.x + item.width - 8, item.y + 10, 8, -6);
  t.fillStyle = "rgba(0,0,0,0.15)";
  if (item.width > 60) t.fillRect(item.x + item.width / 2 - 1, item.y + item.height / 2, 2, item.height / 2);
}

function drawBookshelf(item, t = ctx) {
  const woodColor = "#3e2723";
  const woodHighlight = "#4e342e";
  const shelves = 4;
  const shelfHeight = item.height / shelves;
  t.fillStyle = "#2d1e19";
  t.beginPath();
  t.moveTo(item.x, item.y);
  t.lineTo(item.x + 10, item.y - 8);
  t.lineTo(item.x + 10, item.y + item.height - 8);
  t.lineTo(item.x, item.y + item.height);
  t.fill();
  t.fillStyle = woodHighlight;
  t.beginPath();
  t.moveTo(item.x, item.y);
  t.lineTo(item.x + 10, item.y - 8);
  t.lineTo(item.x + item.width + 10, item.y - 8);
  t.lineTo(item.x + item.width, item.y);
  t.fill();
  t.fillStyle = woodColor;
  t.fillRect(item.x, item.y, item.width, item.height);
  t.fillStyle = "#1a100c";
  t.fillRect(item.x + 6, item.y + 6, item.width - 12, item.height - 12);
  for (let i = 1; i < shelves; i++) {
    const y = item.y + i * shelfHeight;
    t.fillStyle = woodColor;
    t.fillRect(item.x + 6, y, item.width - 12, 4);
    t.fillStyle = "rgba(0,0,0,0.5)";
    t.fillRect(item.x + 6, y - 4, item.width - 12, 4);
    let bkX = item.x + 8;
    let idx = 0;
    while (bkX < item.x + item.width - 10) {
      const seed = Math.sin(item.x * 12.9898 + y * 78.233 + idx * 37.719) * 43758.5453;
      const r1 = seed - Math.floor(seed);
      const bkW = 4 + r1 * 8;
      const seed2 = Math.sin(item.x * 15.123 + y * 42.111 + idx * 19.333) * 43758.5453;
      const r2 = seed2 - Math.floor(seed2);
      const bkH = 10 + r2 * 10;
      if (bkX + bkW > item.x + item.width - 8) break;
      const colors = ["#b71c1c", "#1565c0", "#2e7d32", "#f57f17", "#efefef", "#4e342e"];
      t.fillStyle = colors[Math.floor(r1 * colors.length)];
      const lean = (r2 - 0.5) * 4;
      t.save();
      t.translate(bkX + bkW / 2, y);
      t.rotate(lean * Math.PI / 180);
      t.fillRect(-bkW / 2, -bkH, bkW, bkH);
      t.fillStyle = "rgba(255,255,255,0.2)";
      t.fillRect(-bkW / 2 + 1, -bkH + 2, bkW - 2, 2);
      t.restore();
      bkX += bkW + 1;
      if (r1 > 0.7) bkX += 4;
      idx++;
    }
  }
}

function drawBossDesk(item, t = ctx) {
  const woodWood = "#3e2723";
  const woodHighlight = "#4e342e";
  const woodTrim = "#d4af37";
  t.fillStyle = "rgba(0,0,0,0.4)";
  t.fillRect(item.x - 4, item.y + item.height - 4, item.width + 8, 12);
  t.fillStyle = "#2d1e19";
  t.fillRect(item.x, item.y + 12, item.width, item.height - 12);
  t.fillStyle = woodWood;
  t.fillRect(item.x, item.y + 12, item.width / 3.5, item.height - 12);
  t.fillRect(item.x + item.width - item.width / 3.5, item.y + 12, item.width / 3.5, item.height - 12);
  t.strokeStyle = "#1a100c";
  t.lineWidth = 2;
  t.strokeRect(item.x + 6, item.y + 18, item.width / 3.5 - 12, item.height / 2 - 14);
  t.strokeRect(item.x + 6, item.y + item.height / 2 + 8, item.width / 3.5 - 12, item.height / 2 - 14);
  t.strokeRect(item.x + item.width - item.width / 3.5 + 6, item.y + 18, item.width / 3.5 - 12, item.height / 2 - 14);
  t.strokeRect(item.x + item.width - item.width / 3.5 + 6, item.y + item.height / 2 + 8, item.width / 3.5 - 12, item.height / 2 - 14);
  t.fillStyle = woodTrim;
  t.fillRect(item.x + item.width / 7 - 6, item.y + 24, 12, 3);
  t.fillRect(item.x + item.width / 7 - 6, item.y + item.height / 2 + 14, 12, 3);
  t.fillRect(item.x + item.width - item.width / 7 - 6, item.y + 24, 12, 3);
  t.fillRect(item.x + item.width - item.width / 7 - 6, item.y + item.height / 2 + 14, 12, 3);
  t.fillStyle = woodHighlight;
  t.fillRect(item.x - 4, item.y, item.width + 8, 14);
  t.fillStyle = woodWood;
  t.fillRect(item.x - 4, item.y + 14, item.width + 8, 6);
  t.strokeStyle = "#1a100c";
  t.lineWidth = 1;
  t.strokeRect(item.x + 4, item.y + 2, item.width - 8, 10);
  if (item.hasLaptop) {
    t.fillStyle = "#90a4ae";
    t.fillRect(item.x + item.width / 2 - 12, item.y + 2, 24, 10);
    t.fillStyle = "#37474f";
    t.fillRect(item.x + item.width / 2 - 10, item.y + 4, 20, 6);
    t.fillStyle = "#81d4fa";
    t.beginPath();
    t.moveTo(item.x + item.width / 2 - 8, item.y + 10);
    t.lineTo(item.x + item.width / 2 + 8, item.y + 10);
    t.lineTo(item.x + item.width / 2 + 12, item.y + 16);
    t.lineTo(item.x + item.width / 2 - 12, item.y + 16);
    t.fill();
  }
  if (item.hasLamp) {
    t.fillStyle = "#d4af37";
    t.fillRect(item.x + 20, item.y + 10, 8, 4);
    t.fillRect(item.x + 23, item.y - 4, 2, 14);
    t.fillStyle = "#2e7d32";
    t.beginPath();
    t.arc(item.x + 24, item.y - 4, 12, Math.PI, 0);
    t.fill();
    t.fillStyle = "#fbc02d";
    t.globalAlpha = 0.5;
    t.beginPath();
    t.moveTo(item.x + 12, item.y - 4);
    t.lineTo(item.x + 36, item.y - 4);
    t.lineTo(item.x + 46, item.y + 14);
    t.lineTo(item.x + 2, item.y + 14);
    t.fill();
    t.globalAlpha = 1.0;
  }
}

function drawPlant(item, t = ctx) {
  const potColor = item.potColor || "#eceff1";
  const potHeight = item.height * 0.4;
  const potWidth = item.width * 0.8;
  const potX = item.x + (item.width - potWidth) / 2;
  const potY = item.y + item.height - potHeight;
  t.fillStyle = "rgba(0,0,0,0.3)";
  t.beginPath();
  t.ellipse(item.x + item.width / 2, item.y + item.height, potWidth / 2 + 4, 6, 0, 0, Math.PI * 2);
  t.fill();
  t.fillStyle = "#1b5e20";
  t.beginPath();
  t.ellipse(item.x + item.width / 2 - 6, potY - 10, 8, item.height * 0.5, -0.2, 0, Math.PI * 2);
  t.ellipse(item.x + item.width / 2 + 6, potY - 12, 10, item.height * 0.6, 0.3, 0, Math.PI * 2);
  t.fill();
  t.fillStyle = potColor;
  t.beginPath();
  t.moveTo(potX + 4, item.y + item.height);
  t.lineTo(potX + potWidth - 4, item.y + item.height);
  t.lineTo(potX + potWidth, potY);
  t.lineTo(potX, potY);
  t.fill();
  t.fillStyle = "rgba(0,0,0,0.2)";
  t.beginPath();
  t.moveTo(potX + potWidth / 2, item.y + item.height);
  t.lineTo(potX + potWidth - 4, item.y + item.height);
  t.lineTo(potX + potWidth, potY);
  t.lineTo(potX + potWidth / 2, potY);
  t.fill();
  t.fillStyle = potColor;
  t.fillRect(potX - 2, potY - 4, potWidth + 4, 4);
  t.fillStyle = "rgba(255,255,255,0.4)";
  t.fillRect(potX - 2, potY - 4, potWidth + 4, 1);
  t.fillStyle = "rgba(0,0,0,0.1)";
  t.fillRect(potX - 2, potY, potWidth + 4, 1);
  t.fillStyle = "#3e2723";
  t.beginPath();
  t.ellipse(item.x + item.width / 2, potY - 4, potWidth / 2, 3, 0, 0, Math.PI * 2);
  t.fill();
  t.fillStyle = "#2e7d32";
  t.beginPath();
  t.ellipse(item.x + item.width / 2 - 8, potY + 2, 8, item.height * 0.4, -0.5, 0, Math.PI * 2);
  t.ellipse(item.x + item.width / 2 + 8, potY + 4, 7, item.height * 0.35, 0.6, 0, Math.PI * 2);
  t.fill();
  t.fillStyle = "#43a047";
  t.beginPath();
  t.ellipse(item.x + item.width / 2, potY, 9, item.height * 0.45, 0.1, 0, Math.PI * 2);
  t.fill();
}

function drawShelf(item, t = ctx) {
  t.fillStyle = "#5d4037";
  t.fillRect(item.x, item.y + item.height - 5, item.width, 5);
  t.fillStyle = "#ef5350";
  t.fillRect(item.x + 10, item.y + item.height - 20, 5, 15);
  t.fillStyle = "#42a5f5";
  t.fillRect(item.x + 16, item.y + item.height - 22, 6, 17);
  t.fillStyle = "#66bb6a";
  t.fillRect(item.x + 24, item.y + item.height - 18, 4, 13);
  t.fillStyle = "#8d6e63";
  t.fillRect(item.x + item.width - 20, item.y + item.height - 15, 10, 10);
  t.fillStyle = "#66bb6a";
  t.beginPath();
  t.arc(item.x + item.width - 15, item.y + item.height - 20, 8, 0, Math.PI, true);
  t.fill();
}

function drawLocker(item, t = ctx) {
  if (item.orientation === "right") {
    const ext = 12, topH = 10;
    t.fillStyle = "#37474f";
    t.beginPath();
    t.moveTo(item.x, item.y);
    t.lineTo(item.x + item.width - ext, item.y);
    t.lineTo(item.x + item.width - ext, item.y + topH);
    t.lineTo(item.x + item.width, item.y + topH + 6);
    t.lineTo(item.x, item.y + topH + 6);
    t.fill();
    t.fillStyle = "#455a64";
    t.fillRect(item.x, item.y + topH + 6, item.width - ext, item.height - topH - 6);
    t.fillStyle = "#607d8b";
    t.fillRect(item.x + item.width - ext, item.y + topH + 6, ext, item.height - topH - 6);
    t.fillStyle = "#90a4ae";
    t.fillRect(item.x + item.width - ext, item.y + topH + 6, 2, item.height - topH - 6);
    t.fillStyle = "#37474f";
    t.fillRect(item.x + item.width - 1, item.y + topH + 6, 1, item.height - topH - 6);
    t.fillStyle = "#263238";
    t.fillRect(item.x, item.y + item.height - 4, item.width, 4);
    t.fillStyle = "rgba(0,0,0,0.4)";
    for (let y = item.y + 40; y < item.y + item.height - 10; y += 40) {
      t.fillRect(item.x, y + topH, item.width - ext, 2);
      t.fillRect(item.x + item.width - ext, y + topH + 2, ext, 2);
      t.fillStyle = "rgba(255,255,255,0.15)";
      t.fillRect(item.x + item.width - ext, y + topH + 1, ext, 1);
      t.fillStyle = "rgba(0,0,0,0.4)";
    }
    for (let y = item.y + topH + 8; y < item.y + item.height; y += 40) {
      t.fillStyle = "#cfd8dc";
      t.fillRect(item.x + item.width - ext + 4, y + 4, ext - 6, 1);
      t.fillRect(item.x + item.width - ext + 4, y + 8, ext - 6, 1);
      t.fillRect(item.x + item.width - ext + 4, y + 12, ext - 6, 1);
      t.fillStyle = "#ffd54f";
      t.fillRect(item.x + item.width - 4, y + 18, 2, 8);
      t.fillStyle = "#e65100";
      t.fillRect(item.x + item.width - 3, y + 18, 1, 8);
    }
  } else if (item.orientation === "left") {
    const ext = 12, topH = 10;
    t.fillStyle = "#37474f";
    t.beginPath();
    t.moveTo(item.x + ext, item.y);
    t.lineTo(item.x + item.width, item.y);
    t.lineTo(item.x + item.width, item.y + topH + 6);
    t.lineTo(item.x, item.y + topH + 6);
    t.lineTo(item.x + ext, item.y + topH);
    t.fill();
    t.fillStyle = "#455a64";
    t.fillRect(item.x + ext, item.y + topH + 6, item.width - ext, item.height - topH - 6);
    t.fillStyle = "#607d8b";
    t.fillRect(item.x, item.y + topH + 6, ext, item.height - topH - 6);
    t.fillStyle = "#90a4ae";
    t.fillRect(item.x + ext - 2, item.y + topH + 6, 2, item.height - topH - 6);
    t.fillStyle = "#37474f";
    t.fillRect(item.x, item.y + topH + 6, 1, item.height - topH - 6);
    t.fillStyle = "#263238";
    t.fillRect(item.x, item.y + item.height - 4, item.width, 4);
    t.fillStyle = "rgba(0,0,0,0.4)";
    for (let y = item.y + 40; y < item.y + item.height - 10; y += 40) {
      t.fillRect(item.x + ext, y + topH, item.width - ext, 2);
      t.fillRect(item.x, y + topH + 2, ext, 2);
      t.fillStyle = "rgba(255,255,255,0.15)";
      t.fillRect(item.x, y + topH + 1, ext, 1);
      t.fillStyle = "rgba(0,0,0,0.4)";
    }
    for (let y = item.y + topH + 8; y < item.y + item.height; y += 40) {
      t.fillStyle = "#cfd8dc";
      t.fillRect(item.x + 2, y + 4, ext - 6, 1);
      t.fillRect(item.x + 2, y + 8, ext - 6, 1);
      t.fillRect(item.x + 2, y + 12, ext - 6, 1);
      t.fillStyle = "#ffd54f";
      t.fillRect(item.x + 2, y + 18, 2, 8);
      t.fillStyle = "#e65100";
      t.fillRect(item.x + 2, y + 18, 1, 8);
    }
  } else {
    t.fillStyle = "#607d8b";
    t.fillRect(item.x, item.y, item.width, item.height);
    t.fillStyle = "#546e7a";
    t.fillRect(item.x + 4, item.y + 10, item.width - 8, 4);
    t.fillRect(item.x + 4, item.y + 16, item.width - 8, 4);
    t.fillRect(item.x + 4, item.y + 22, item.width - 8, 4);
    t.fillStyle = "#cfd8dc";
    t.fillRect(item.x + item.width - 8, item.y + item.height / 2, 4, 10);
  }
}

function drawWindow(item, t = ctx) {
  t.fillStyle = "#81d4fa";
  t.fillRect(item.x, item.y, item.width, item.height);
  t.strokeStyle = "#eceff1";
  t.lineWidth = 4;
  t.strokeRect(item.x, item.y, item.width, item.height);
  t.beginPath();
  t.moveTo(item.x + item.width / 2, item.y);
  t.lineTo(item.x + item.width / 2, item.y + item.height);
  t.moveTo(item.x, item.y + item.height / 2);
  t.lineTo(item.x + item.width, item.y + item.height / 2);
  t.stroke();
  t.fillStyle = "rgba(255,255,255,0.4)";
  t.beginPath();
  t.moveTo(item.x + 10, item.y + item.height);
  t.lineTo(item.x + 30, item.y);
  t.lineTo(item.x + 50, item.y);
  t.lineTo(item.x + 30, item.y + item.height);
  t.fill();
}

function drawWhiteboard(item, t = ctx) {
  t.fillStyle = "#b0bec5";
  t.fillRect(item.x, item.y, item.width, item.height);
  t.fillStyle = "#ffffff";
  t.fillRect(item.x + 4, item.y + 4, item.width - 8, item.height - 8);
  t.fillStyle = "#90a4ae";
  t.fillRect(item.x + 2, item.y + item.height - 4, item.width - 4, 4);
  t.fillStyle = "#37474f";
  t.fillRect(item.x + 40, item.y + item.height - 4, 10, 3);
  t.fillStyle = "#e53935";
  t.fillRect(item.x + 60, item.y + item.height - 4, 8, 2);
  if (item.scribbleText) {
    const lines = Array.isArray(item.scribbleText) ? item.scribbleText : [String(item.scribbleText)];
    t.fillStyle = item.scribbleColor || "#263238";
    t.font = "16px VT323, monospace";
    t.textAlign = "left";
    lines.slice(0, 3).forEach((line, index) => t.fillText(line, item.x + 18, item.y + 24 + index * 16));
  }
}

function drawDocumentPage(item, t = ctx) {
  const w = item.width || 40;
  const h = item.height || 50;
  const rotation = (item.rotation || 0) * Math.PI / 180;
  const read = item.documentId ? isRuinedDocumentRead(item.documentId) : false;
  const variant = item.documentVariant || "report";
  t.save();
  t.translate(item.x + w / 2, item.y + h / 2);
  t.rotate(rotation);
  t.fillStyle = "rgba(0,0,0,0.25)";
  t.fillRect(-w / 2 + 2, -h / 2 + 4, w, h);
  t.fillStyle = read ? "#d8c9ac" : "#efe3c6";
  if (variant === "warning") t.fillStyle = read ? "#d4c19b" : "#ead6ad";
  if (variant === "scrawl") t.fillStyle = read ? "#dbcba7" : "#f1e2be";
  t.fillRect(-w / 2, -h / 2, w, h);
  t.strokeStyle = "rgba(77,53,38,0.35)";
  t.strokeRect(-w / 2, -h / 2, w, h);
  t.fillStyle = variant === "photo" ? "#52413c" : "rgba(92,64,48,0.16)";
  if (variant === "photo") {
    t.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 14);
    t.fillStyle = "rgba(255,255,255,0.72)";
    t.fillRect(-w / 2 + 7, h / 2 - 11, w - 14, 5);
  } else {
    for (let y = -h / 2 + 8; y < h / 2 - 6; y += 7) t.fillRect(-w / 2 + 5, y, w - 10, 2);
    t.fillStyle = variant === "warning" ? "#8d1a1a" : "#5d4037";
    t.fillRect(-w / 2 + 6, -h / 2 + 7, Math.max(12, w - 18), 3);
  }
  if (!item.decorative) {
    t.fillStyle = read ? "#4b5d2f" : "#7f1010";
    t.fillRect(w / 2 - 7, -h / 2 + 4, 4, 4);
  }
  t.restore();
}

function drawStudent(item, t = ctx) {
  const baseY = item.y;
  const bob = Math.sin(Date.now() / 500 + (item.phase || 0)) * 2;
  const seatY = baseY - bob;
  const w = item.width || 24;
  const h = item.height || 36;
  const variant = item.variant || "boy";
  const shirtColor = item.shirt || "#4caf50";
  t.fillStyle = "rgba(0,0,0,0.2)";
  t.fillRect(item.x + 2, seatY + h - 4, w - 4, 4);
  t.fillStyle = shirtColor;
  t.fillRect(item.x, seatY + 12, w, 14);
  t.fillStyle = "#3e2723";
  t.fillRect(item.x + 4, seatY + 26, 6, 8);
  t.fillRect(item.x + w - 10, seatY + 26, 6, 8);
  if (!item.headless) {
    t.fillStyle = "#f1c27d";
    t.fillRect(item.x + 2, seatY, w - 4, 12);
    t.fillStyle = "#4e342e";
    if (variant === "girl") {
      t.fillRect(item.x, seatY, w, 6);
      t.fillRect(item.x, seatY, 4, 14);
      t.fillRect(item.x + w - 4, seatY, 4, 14);
    } else {
      t.fillRect(item.x, seatY, w, 4);
      t.fillRect(item.x, seatY, 4, 8);
      t.fillRect(item.x + w - 4, seatY, 4, 8);
    }
    t.fillStyle = "#212121";
    t.fillRect(item.x + 6, seatY + 4, 2, 2);
    t.fillRect(item.x + w - 8, seatY + 4, 2, 2);
  } else {
    t.fillStyle = "#b71c1c";
    t.fillRect(item.x + w / 2 - 3, seatY + 10, 6, 4);
    if (Math.random() > 0.5) {
      t.fillStyle = "#e53935";
      t.fillRect(item.x + w / 2 - 2, seatY + 8, 4, 2);
    }
  }
}

function drawTeacher(item, t = ctx) {
  const w = item.width || 24;
  const h = item.height || 36;
  const facing = item.facing || "down";
  const walkFrame = item.walkFrame || 0;
  const isMoving = Boolean(item.isWalking);
  const walkCycle = Math.sin(walkFrame);
  const stride = isMoving ? walkCycle * 5 : 0;
  const bob = isMoving ? Math.abs(Math.sin(walkFrame * 2)) * 2 : Math.sin(Date.now() / 500 + (item.phase || 0)) * 2;
  const baseY = item.y - bob;
  const px = item.x;
  const py = baseY;
  t.fillStyle = "rgba(0,0,0,0.2)";
  if (facing === "left" || facing === "right") {
    t.beginPath();
    t.ellipse(px + w / 2, py + h - 2, w / 2, 4, 0, 0, Math.PI * 2);
    t.fill();
  } else {
    t.fillRect(px + 2, py + h - 4, w - 4, 4);
  }
  if (facing === "left" || facing === "right") {
    const isRight = facing === "right";
    const legSwing = isMoving ? stride : 0;
    t.fillStyle = "#212121";
    t.fillRect(px + w / 2 - 3 + legSwing, py + 26, 6, 10);
    t.fillRect(px + w / 2 - 3 - legSwing, py + 26, 6, 10);
    t.fillStyle = "#3e2723";
    t.fillRect(px + 4, py + 12, w - 8, 14);
    t.fillStyle = "#d32f2f";
    t.fillRect(px + w / 2 - 1, py + 14, 2, 8);
    t.fillStyle = "#f1c27d";
    t.fillRect(px + 4, py, w - 8, 12);
    t.fillStyle = "#5d4037";
    t.fillRect(px + 2, py, w - 4, 4);
    if (isRight) {
      t.fillRect(px + 2, py, 4, 10);
      t.fillStyle = "#212121";
      t.fillRect(px + w - 8, py + 6, 2, 2);
      t.fillStyle = "#5d4037";
      t.fillRect(px + w - 2, py - 2, 4, 14);
      t.fillRect(px + 8, py - 8, w - 8, 6);
    } else {
      t.fillRect(px + w - 6, py, 4, 10);
      t.fillStyle = "#212121";
      t.fillRect(px + 6, py + 6, 2, 2);
      t.fillStyle = "#5d4037";
      t.fillRect(px - 2, py - 2, 4, 14);
      t.fillRect(px, py - 8, w - 8, 6);
    }
    t.fillStyle = "#3e2723";
    t.fillRect(px + 6, py - 3, w - 12, 2);
    return;
  }
  t.fillStyle = "#3e2723";
  t.fillRect(px, py + 12, w, 14);
  t.fillStyle = "#d32f2f";
  t.fillRect(px + w / 2 - 2, py + 14, 4, 8);
  t.fillStyle = "#212121";
  t.fillRect(px + 4, py + 26 + stride, 6, 8);
  t.fillRect(px + w - 10, py + 26 - stride, 6, 8);
  if (!item.headless) {
    t.fillStyle = "#f1c27d";
    t.fillRect(px + 2, py, w - 4, 12);
    t.fillStyle = "#212121";
    t.fillRect(px + 6, py + 5, 2, 2);
    t.fillRect(px + w - 8, py + 5, 2, 2);
    t.fillStyle = "#5d4037";
    t.fillRect(px + 6, py + 8, w - 12, 2);
    t.fillStyle = "#5d4037";
    t.fillRect(px - 4, py - 2, w + 8, 4);
    t.fillRect(px + 2, py - 8, w - 4, 6);
    t.fillStyle = "#3e2723";
    t.fillRect(px + 2, py - 3, w - 4, 2);
  } else {
    t.fillStyle = "#b71c1c";
    t.fillRect(px + w / 2 - 3, py + 10, 6, 4);
  }
}

function drawDebris(item, t = ctx) {
  t.fillStyle = "#4e342e";
  t.fillRect(item.x, item.y, item.width, item.height);
  t.fillStyle = "#3e2723";
  t.fillRect(item.x + 4, item.y + 3, item.width - 8, Math.max(3, item.height - 6));
  t.fillStyle = "rgba(255,255,255,0.12)";
  t.fillRect(item.x + 2, item.y + 2, Math.max(6, item.width * 0.4), 2);
}

function drawVent(item, t = ctx) {
  t.fillStyle = "#7b8b94";
  t.fillRect(item.x, item.y, item.width, item.height);
  t.fillStyle = "#455a64";
  for (let i = 6; i < item.height - 4; i += 6) t.fillRect(item.x + 5, item.y + i, item.width - 10, 2);
  t.strokeStyle = "#263238";
  t.lineWidth = 2;
  t.strokeRect(item.x, item.y, item.width, item.height);
}

function drawWallSwitch(item, t = ctx) {
  const isOn = playData.worldState.secretRoomLightOn;
  t.fillStyle = "#eceff1";
  t.fillRect(item.x, item.y, item.width, item.height);
  t.strokeStyle = "#b0bec5";
  t.lineWidth = 1;
  t.strokeRect(item.x, item.y, item.width, item.height);
  const switchW = 6, switchH = 10;
  const switchX = item.x + (item.width - switchW) / 2;
  const switchY = isOn ? item.y + 3 : item.y + item.height - switchH - 3;
  t.fillStyle = isOn ? "#66bb6a" : "#78909c";
  t.fillRect(switchX, switchY, switchW, switchH);
  t.fillStyle = isOn ? "#ffeb3b" : "#37474f";
  t.beginPath();
  t.arc(item.x + item.width / 2, item.y + item.height / 2 + (isOn ? 6 : -6), 2, 0, Math.PI * 2);
  t.fill();
}

function drawFurnitureItem(item, t = ctx) {
  if (isItemHidden(item)) return;
  if (item.type === "zone") {
    if (isDeveloperMode) {
      t.strokeStyle = "rgba(0, 0, 255, 0.5)";
      t.lineWidth = 1;
      t.strokeRect(item.x, item.y, item.width, item.height);
      t.fillStyle = "rgba(0, 0, 255, 0.1)";
      t.fillRect(item.x, item.y, item.width, item.height);
      t.fillStyle = "blue";
      t.font = "10px monospace";
      t.textAlign = "center";
      t.fillText("ZONE", item.x + item.width / 2, item.y + item.height / 2);
    }
    return;
  }
  if (item.textureData) {
    if (!item._cachedImage || !(item._cachedImage instanceof Image)) {
      item._cachedImage = new Image();
      item._cachedImage.src = item.textureData;
    }
    if (item._cachedImage.complete) t.drawImage(item._cachedImage, item.x, item.y, item.width, item.height);
    else { t.fillStyle = "#ccc"; t.fillRect(item.x, item.y, item.width, item.height); }
    return;
  }
  const dispatch = {
    desk: drawDesk, table: drawTable, bed: drawBed, cupboard: drawCupboard,
    locker: drawLocker, window: drawWindow, student: drawStudent, teacher: drawTeacher,
    debris: drawDebris, vent: drawVent, chest: drawChest, floor_patch: drawFloorPatch,
    padlocked_hatch: drawPadlockedHatch, document_page: drawDocumentPage, rug: drawRug,
    shelf: drawShelf, whiteboard: drawWhiteboard, boss_desk: drawBossDesk, sofa: drawSofa,
    bookshelf: drawBookshelf, plant: drawPlant, wall_switch: drawWallSwitch
  };
  const fn = dispatch[item.type];
  if (fn) fn(item, t);
  else {
    t.fillStyle = "#e91e63";
    t.fillRect(item.x, item.y, item.width, item.height);
    t.fillStyle = "white";
    t.font = "10px monospace";
    t.textAlign = "center";
    t.fillText(item.type, item.x + item.width / 2, item.y + item.height / 2);
  }
}

/* ---------------------------------------------------------------------
 * Player rendering
 * ------------------------------------------------------------------- */
function drawPlayer(x, y) {
  const w = 24, h = 36;
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
  if (player.isCrawling) {
    const isMoving = player.walkFrame !== 0;
    const walkCycle = Math.sin(player.walkFrame);
    const px = x, py = y - h / 2;
    ctx.translate(px, py);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-px, -py);
    const pxC = x - w / 2;
    const pyC = y - h + 8;
    const elbowSwing = walkCycle * 4;
    const kneeSwing = -walkCycle * 6;
    ctx.fillStyle = skinColor;
    ctx.fillRect(pxC - 2 + elbowSwing, pyC + 10, 4, 6);
    ctx.fillRect(pxC + w - 2 - elbowSwing, pyC + 10, 4, 6);
    ctx.fillStyle = pantsColor;
    ctx.fillRect(pxC + 4, pyC + 26 + kneeSwing, 6, 12);
    ctx.fillRect(pxC + w - 10, pyC + 26 - kneeSwing, 6, 12);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(pxC, pyC + 12, w, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(pxC, pyC + 18, w, 4);
    ctx.fillStyle = hairColor;
    ctx.fillRect(pxC, pyC, w, 12);
    ctx.fillRect(pxC + 2, pyC - 2, w - 4, 4);
    ctx.restore();
    return;
  }
  const isMoving = player.walkFrame !== 0;
  const animOffset = Math.sin(player.walkFrame) * 5;
  const walkCycle = Math.sin(player.walkFrame);
  const bob = isMoving ? Math.abs(Math.sin(player.walkFrame * 2)) * 2 : 0;
  const headBurstActive = deathSequence && deathSequence.active && deathSequence.type === "head_burst";
  const playerHeadGone = headBurstActive && deathSequence.exploded;
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
    if (playerHeadGone) {
      ctx.fillStyle = "#7f0000";
      ctx.fillRect(px + 6, py + 10, w - 12, 4);
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(px + 4, py + 8, w - 8, 6);
    } else {
      ctx.fillStyle = skinColor;
      ctx.fillRect(px + 2, py, w - 4, 12);
      ctx.fillStyle = hairColor;
      ctx.fillRect(px, py, w, 4);
      ctx.fillRect(px, py, 4, 10);
      ctx.fillRect(px + w - 4, py, 4, 10);
      ctx.fillStyle = eyeColor;
      ctx.fillRect(px + 6, py + 6, 2, 2);
      ctx.fillRect(px + w - 8, py + 6, 2, 2);
    }
  } else if (player.facing === "up") {
    ctx.fillStyle = pantsColor;
    ctx.fillRect(px + 4, py + 26 + animOffset, 6, 10);
    ctx.fillRect(px + w - 10, py + 26 - animOffset, 6, 10);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px, py + 12, w, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px, py + 18, w, 4);
    if (playerHeadGone) {
      ctx.fillStyle = "#7f0000";
      ctx.fillRect(px + 6, py + 10, w - 12, 4);
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(px + 4, py + 8, w - 8, 6);
    } else {
      ctx.fillStyle = skinColor;
      ctx.fillRect(px + 2, py, w - 4, 12);
      ctx.fillStyle = hairColor;
      ctx.fillRect(px, py, w, 8);
      ctx.fillRect(px + 2, py + 8, w - 4, 4);
    }
  } else if (player.facing === "left" || player.facing === "right") {
    const isRight = player.facing === "right";
    const legSwing = walkCycle * 6;
    ctx.fillStyle = pantsColor;
    ctx.fillRect(px + w / 2 - 3 + legSwing, py + 26, 6, 10);
    ctx.fillRect(px + w / 2 - 3 - legSwing, py + 26, 6, 10);
    ctx.fillStyle = shirtColor;
    ctx.fillRect(px + 4, py + 12, w - 8, 14);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(px + 4, py + 18, w - 8, 4);
    if (playerHeadGone) {
      ctx.fillStyle = "#7f0000";
      ctx.fillRect(px + 8, py + 10, w - 14, 4);
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(px + 6, py + 8, w - 12, 6);
    } else {
      ctx.fillStyle = skinColor;
      ctx.fillRect(px + 4, py, w - 8, 12);
      ctx.fillStyle = hairColor;
      ctx.fillRect(px + 2, py, w - 4, 4);
      if (isRight) ctx.fillRect(px + 2, py, 4, 10);
      else ctx.fillRect(px + w - 6, py, 4, 10);
      ctx.fillStyle = eyeColor;
      if (isRight) ctx.fillRect(px + w - 8, py + 6, 2, 2);
      else ctx.fillRect(px + 6, py + 6, 2, 2);
    }
  }
  ctx.restore();
}

function createExplosion(x, y, color = "#e53935") {
  for (let i = 0; i < 30; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 1.0, color, size: Math.random() * 5 + 2
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3;
    p.life -= 0.02;
    if (p.life <= 0) particles.splice(i, 1);
  }
  if (screenShake > 0) {
    screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
  }
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;
}

/* ---------------------------------------------------------------------
 * HUD rendering (office timer, death sequence, dev overlay, hints)
 * ------------------------------------------------------------------- */
function drawOfficeTimer() {
  if (!officeTimer.active || officeTimer.hidden) return;
  const seconds = Math.max(0, Math.ceil(officeTimer.framesLeft / 60));
  const isDanger = seconds <= 10;
  ctx.save();
  ctx.fillStyle = isDanger ? "rgba(183, 28, 28, 0.82)" : "rgba(33, 33, 33, 0.75)";
  ctx.fillRect(canvas.width - 165, 14, 150, 52);
  ctx.strokeStyle = isDanger ? "#ff5252" : "#eeeeee";
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width - 165, 14, 150, 52);
  ctx.fillStyle = "#fff";
  ctx.font = "18px 'VT323', monospace";
  ctx.textAlign = "left";
  ctx.fillText("ESCAPE TIMER", canvas.width - 155, 33);
  ctx.font = "30px 'VT323', monospace";
  ctx.fillStyle = isDanger ? "#ffeb3b" : "#ffffff";
  ctx.fillText(`${seconds}s`, canvas.width - 152, 60);
  if (isDanger) {
    const pulse = Math.abs(Math.sin(Date.now() / 140));
    ctx.fillStyle = `rgba(183, 28, 28, ${0.12 + pulse * 0.18})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.restore();
}

function drawDeathSequence() {
  if (!deathSequence || !deathSequence.active) return;
  const renderOffset = Helios.Viewport.getSceneRenderOffset({ canvas, room });
  const px = player.x - camera.x + renderOffset.x;
  const py = player.y - camera.y + renderOffset.y;
  const showContinue = deathSequence.awaitingContinue;
  const continueAlpha = showContinue ? (0.55 + Math.abs(Math.sin(Date.now() / 220)) * 0.45) : 0;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (deathSequence.type === "head_burst") {
    const burst = deathSequence.burstProgress || 0;
    const headX = px;
    const headY = py - 14;
    if (!deathSequence.exploded) {
      const pulse = 0.65 + Math.sin(deathSequence.frame * 0.35) * 0.2;
      ctx.strokeStyle = `rgba(255, 82, 82, ${pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(headX, headY, 12 + deathSequence.frame * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 235, 59, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headX - 8, headY - 8);
      ctx.lineTo(headX + 8, headY + 8);
      ctx.moveTo(headX + 8, headY - 8);
      ctx.lineTo(headX - 8, headY + 8);
      ctx.stroke();
    } else {
      ctx.fillStyle = `rgba(183, 28, 28, ${0.35 + burst * 0.35})`;
      ctx.beginPath();
      ctx.arc(headX, headY, 18 + burst * 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 82, 82, ${0.45 + burst * 0.3})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const angle = (Math.PI * 2 * i) / 7 + burst;
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(headX + Math.cos(angle) * (22 + burst * 26), headY + Math.sin(angle) * (22 + burst * 26));
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255, 235, 59, 0.9)";
      for (let i = 0; i < 5; i++) {
        const angle = burst * 2 + i * 1.2;
        ctx.beginPath();
        ctx.arc(headX + Math.cos(angle) * (10 + burst * 18), headY + Math.sin(angle) * (8 + burst * 18), 2 + burst * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#ffeb3b";
    ctx.font = "24px 'VT323', monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, 50);
    if (showContinue) {
      ctx.font = "18px 'VT323', monospace";
      ctx.fillStyle = `rgba(255,255,255,${continueAlpha})`;
      ctx.fillText("CLICK TO CONTINUE", canvas.width / 2, canvas.height - 36);
    }
    ctx.restore();
    return;
  }
  const zx = deathSequence.zombieX - camera.x + renderOffset.x;
  const zy = deathSequence.zombieY - camera.y + renderOffset.y;
  const bite = deathSequence.consumeProgress;
  ctx.fillStyle = "#1b5e20";
  ctx.fillRect(zx - 12, zy - 34, 24, 36);
  ctx.fillStyle = "#66bb6a";
  ctx.fillRect(zx - 10, zy - 48, 20, 14);
  ctx.fillStyle = "#b71c1c";
  ctx.fillRect(zx - 9, zy - 30, 6, 3);
  if (bite > 0) {
    ctx.fillStyle = `rgba(183, 28, 28, ${0.2 + bite * 0.6})`;
    ctx.beginPath();
    ctx.arc(px, py - 14, 26 * bite + 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffeb3b";
  ctx.font = "24px 'VT323', monospace";
  ctx.textAlign = "center";
  ctx.fillText("YOU WERE DEVOURED...", canvas.width / 2, 50);
  if (showContinue) {
    ctx.font = "18px 'VT323', monospace";
    ctx.fillStyle = `rgba(255,255,255,${continueAlpha})`;
    ctx.fillText("CLICK TO CONTINUE", canvas.width / 2, canvas.height - 36);
  }
  ctx.restore();
}

function drawDevOverlay() {
  if (!isDeveloperMode) return;
  const renderOffset = Helios.Viewport.getSceneRenderOffset({ canvas, room });
  ctx.save();
  ctx.translate(renderOffset.x, renderOffset.y);
  const drawWorldRect = (rect, stroke, fill) => {
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = 1.5;
    ctx.fillRect(rect.x - camera.x, rect.y - camera.y, rect.width, rect.height);
    ctx.strokeRect(rect.x - camera.x, rect.y - camera.y, rect.width, rect.height);
  };
  if (devDebug.hitboxes) {
    (room.furniture || []).forEach((item) => {
      if (!Helios.Collision.isBlocking(item)) return;
      drawWorldRect(Helios.Collision.getRect(item), "rgba(255, 82, 82, 0.95)", "rgba(255, 82, 82, 0.16)");
    });
  }
  if (devDebug.interactions) {
    (room.furniture || []).forEach((item) => {
      if (!item.interaction || !item.interaction.enabled) return;
      const area = item.interaction.area || { x: 0, y: 0, width: item.width, height: item.height };
      drawWorldRect(
        { x: item.x + area.x, y: item.y + area.y, width: area.width, height: area.height },
        "rgba(80, 255, 140, 0.95)",
        "rgba(80, 255, 140, 0.12)"
      );
    });
  }
  if (devDebug.spawns) {
    (room.doors || []).forEach((door) => {
      const pt = door.customSpawn || Helios.Proximity.getDoorAnchor(door);
      let spawnX = pt.x;
      let spawnY = pt.y + (door.customSpawn ? 0 : 10);
      if (!door.customSpawn) {
        if (door.orientation === "bottom") spawnY = door.y - 24;
        else if (door.orientation === "left") spawnX = door.x + door.width + 12;
        else if (door.orientation === "right") spawnX = door.x - 12;
      }
      drawWorldRect({ x: spawnX - 10, y: spawnY - 10, width: 20, height: 20 }, "rgba(255, 30, 30, 0.95)", "rgba(255, 30, 30, 0.22)");
    });
  }
  if (selectedObject) {
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(selectedObject.x - camera.x, selectedObject.y - camera.y, selectedObject.width, selectedObject.height);
    if (selectedObject.type === "door") {
      let spawnX, spawnY;
      if (selectedObject.customSpawn) { spawnX = selectedObject.customSpawn.x; spawnY = selectedObject.customSpawn.y; }
      else {
        const pt = Helios.Proximity.getDoorAnchor(selectedObject);
        spawnX = pt.x; spawnY = pt.y + 10;
        if (selectedObject.orientation === "bottom") spawnY = selectedObject.y - 24;
        else if (selectedObject.orientation === "left") spawnX = selectedObject.x + selectedObject.width + 12;
        else if (selectedObject.orientation === "right") spawnX = selectedObject.x - 12;
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
      const area = selectedObject.interaction.area || { x: 0, y: 0, width: selectedObject.width, height: selectedObject.height };
      const ix = selectedObject.x + area.x;
      const iy = selectedObject.y + area.y;
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(ix - camera.x, iy - camera.y, area.width, area.height);
      ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
      ctx.fillRect(ix - camera.x, iy - camera.y, area.width, area.height);
    }
  }
  ctx.restore();
}

function getNearestPromptFurniture(threshold = 82) {
  return Helios.Proximity.findNearestPromptFurniture({ furniture: room.furniture, actor: player, threshold, isHidden: isItemHidden });
}

function getNearestDoor(threshold = Infinity) {
  return Helios.Proximity.findNearestDoor({ doors: room.doors || [], actor: player, threshold });
}

function drawHints() {
  if (deathSequence && deathSequence.active) return;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "16px 'VT323', 'Courier New', monospace";
  ctx.textAlign = "center";
  if (stage >= 2 && currentLevelName === "classroom") {
    ctx.fillStyle = "#9e9e9e";
    ctx.fillText("W A S D", canvas.width - 60, canvas.height - 40);
  }
  ctx.textAlign = "right";
  ctx.font = "14px 'VT323', 'Courier New', monospace";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("Press I for Help", canvas.width - 12, 18);
  ctx.restore();
  let showingHint = false;
  const showHint = (target) => {
    Helios.Dialogue.apply(getDialogueElements(), Helios.Dialogue.createHint(target));
    isHintActive = true;
  };
  const cabinets = room.furniture.filter((f) => f.id === "left_cabinet" || f.id === "right_cabinet");
  for (const cabinet of cabinets) {
    const cx = cabinet.x + cabinet.width / 2;
    const cy = cabinet.y + cabinet.height / 2;
    const d = Math.hypot(player.x - cx, player.y - cy);
    if (d < 100) {
      showingHint = true;
      if (!isHintActive) showHint({ type: "cabinet" });
      break;
    }
  }
  if (!showingHint) {
    const nearby = getNearestPromptFurniture(84);
    if (nearby) {
      showingHint = true;
      if (!isHintActive) showHint({ type: "interaction", prompt: nearby.interaction.prompt });
    }
  }
  if (!showingHint) {
    const door = getNearestDoor(56);
    if (door) {
      showingHint = true;
      if (!isHintActive) showHint({ type: "door", prompt: door.prompt || "to open" });
    }
  }
  if (!showingHint && isHintActive) {
    isHintActive = false;
    updateDialogue();
  }
}
