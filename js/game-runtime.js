/* =====================================================================
 * HELIOS - Runtime: input, interactions, UI updates, dev mode, boot
 * ===================================================================== */
"use strict";

// `Helios` is declared in js/helios.js and shared across all game scripts.
if (!window.Helios) throw new Error("Helios namespace missing - did js/helios.js load first?");

/* ---------------------------------------------------------------------
 * Movement & scene helpers
 * ------------------------------------------------------------------- */
function getActiveSceneZoom() {
  if (cutscene && cutscene.active) return camera.zoom;
  if (deathSequence && deathSequence.active && deathSequence.cameraZoom) return deathSequence.cameraZoom;
  return userZoom;
}

function getSceneRenderOffset(zoom = getActiveSceneZoom()) {
  return Helios.Viewport.getSceneRenderOffset({ canvas, room, zoom });
}

function screenToWorld(canvasX, canvasY) {
  const zoom = getActiveSceneZoom();
  return Helios.Viewport.screenToWorld({ canvasX, canvasY, camera, canvas, room, zoom });
}

function checkCollision(x, y) {
  return Helios.Collision.hasCollisionAt({ x, y, room, player, isItemHidden });
}

function handleMovement() {
  const inputBlocked = (dialogueBox.classList.contains("dialogue--active") && !isHintActive) ||
                       player.isSitting ||
                       (cutscene && cutscene.active) ||
                       (deathSequence && deathSequence.active) ||
                       isModalBlockingInput();
  if (!inputBlocked) {
    let dx = 0, dy = 0;
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
      if (!checkCollision(player.x + dx, player.y)) player.x += dx;
      if (!checkCollision(player.x, player.y + dy)) player.y += dy;
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
  let targetX = player.x, targetY = player.y;
  if (cutscene && cutscene.active && cutscene.focus) {
    targetX = cutscene.focus.x + (cutscene.focus.width || 0) / 2;
    targetY = cutscene.focus.y + (cutscene.focus.height || 0) / 2;
  }
  const nextCamera = Helios.Viewport.getCameraPosition({
    target: { x: targetX, y: targetY }, canvas, room,
    zoom: getActiveSceneZoom(), cutsceneActive: Boolean(cutscene && cutscene.active)
  });
  camera.x = nextCamera.x;
  camera.y = nextCamera.y;
  if (!isFinite(camera.x)) camera.x = 0;
  if (!isFinite(camera.y)) camera.y = 0;
}

/* ---------------------------------------------------------------------
 * Dialogue
 * ------------------------------------------------------------------- */
function getDialogueElements() {
  return { box: dialogueBox, label: dialogueLabel, line: dialogueLine, prompt: dialoguePrompt };
}

function updateDialogue() {
  const entry = dialogue[stage];
  const view = Helios.Dialogue.getView({ dialogue, stage });
  if (view.active) {
    Helios.Dialogue.apply(getDialogueElements(), view);
    queueDialogueVoice(entry);
  } else {
    stopDialogueVoice();
    Helios.Dialogue.apply(getDialogueElements(), view);
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
  if (tempDialogueTimeout) { clearTimeout(tempDialogueTimeout); tempDialogueTimeout = null; }
  Helios.Dialogue.apply(getDialogueElements(), { active: true, speaker, text, prompt: "", hideSpeaker: !speaker });
  queueDialogueVoice({ text, speaker });
  tempDialogueTimeout = setTimeout(() => {
    tempDialogueTimeout = null;
    stopDialogueVoice();
    updateDialogue();
  }, 2000);
}

function updateHorrorChrome() {
  const spikeRooms = new Set(["principal_office", "vent_tunnel", "secret_room", "ruined_classroom", "endless_hallway", "library_archive"]);
  const active = Boolean((playData.worldState.horrorActive && spikeRooms.has(currentLevelName)) ||
    (deathSequence && deathSequence.active) ||
    officeTimer.active);
  document.body.classList.toggle("horror-spike", active);
}

/* ---------------------------------------------------------------------
 * Cutscenes
 * ------------------------------------------------------------------- */
function startLectureCutscene(seat) {
  cutscene = { active: true, focus: null };
  playData.worldState.lecture_seen = true;
  savePlayState();
  const door = room.doors.find((d) => d.id === "door_lecture_to_hall");
  const startX = door ? door.x : 800;
  const startY = door ? door.y + 40 : 200;
  const teacher = {
    type: "teacher", x: startX, y: startY, width: 24, height: 36, phase: 0,
    facing: "left", walkFrame: 0, isWalking: false
  };
  room.furniture.push(teacher);
  cutscene.focus = teacher;
  const waypoints = [
    { x: 800, y: 220 }, { x: 800, y: 130 }, { x: 448, y: 130 }
  ];
  let currentWaypointIndex = 0;
  let phase = "walk";
  let timer = 0;
  cutscene.update = () => {
    if (phase === "walk") {
      if (currentWaypointIndex >= waypoints.length) { phase = "sit"; return; }
      const target = waypoints[currentWaypointIndex];
      const dx = target.x - teacher.x;
      const dy = target.y - teacher.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        teacher.x = target.x; teacher.y = target.y;
        teacher.walkFrame = 0; currentWaypointIndex++;
      } else {
        const speed = 2;
        teacher.isWalking = true;
        if (Math.abs(dx) > Math.abs(dy)) teacher.facing = dx > 0 ? "right" : "left";
        else teacher.facing = dy > 0 ? "down" : "up";
        teacher.walkFrame += 0.18;
        teacher.x += (dx / dist) * speed;
        teacher.y += (dy / dist) * speed;
      }
    } else if (phase === "sit") {
      teacher.isWalking = false;
      teacher.walkFrame = 0;
      teacher.facing = "down";
      phase = "talk";
      dialogue = [
        { speaker: "TEACHER", text: "Okay guys, take your seats." },
        { speaker: "TEACHER", text: "Today we are gonna learn some Algebra." },
        { speaker: "TEACHER", text: "It is very important for your future." },
        { speaker: "TEACHER", text: "So pay close attention..." }
      ];
      stage = 0;
      updateDialogue();
      window.onDialogueEnd = () => { phase = "focus"; timer = 0; };
    } else if (phase === "focus") {
      if (camera.zoom < 2.5) camera.zoom += 0.02;
      cutscene.focus = teacher;
      timer++;
      if (timer > 120) phase = "explode";
    } else if (phase === "explode") {
      createExplosion(teacher.x + teacher.width / 2, teacher.y + 10, "#b71c1c");
      createExplosion(teacher.x + teacher.width / 2, teacher.y + 10, "#ff0000");
      createExplosion(teacher.x + teacher.width / 2, teacher.y + 10, "#880e4f");
      room.furniture.forEach((item) => {
        if (item.type === "student") { item.vx = (Math.random() - 0.5) * 10; item.vy = (Math.random() - 0.5) * 10; }
      });
      teacher.headless = true;
      screenShake = 30;
      globalDarkness = 0.7;
      playData.worldState.horrorActive = true;
      updateSoundtrack();
      phase = "shock"; timer = 0;
    } else if (phase === "shock") {
      timer++;
      if (timer > 60) phase = "restore_cam";
    } else if (phase === "restore_cam") {
      if (camera.zoom > 1) camera.zoom -= 0.05;
      else { camera.zoom = 1; markOfficeRushActive(); phase = "end"; cutscene.active = false; cutscene = null; }
    }
  };
}

function startVentCrawlCutscene() {
  cutscene = { active: true, focus: null };
  loadLevel("vent_tunnel");
  player.x = room.spawn.x; player.y = room.spawn.y;
  player.isCrawling = true; player.facing = "left";
  cutscene.focus = player;
  let phase = "crawl";
  let timer = 0;
  cutscene.update = () => {
    if (phase === "crawl") {
      player.walkFrame += 0.2;
      player.x -= 3;
      if (player.x <= 100) { phase = "fade_out"; timer = 0; }
      const camTargetX = player.x - canvas.width / 2;
      const camTargetY = player.y - canvas.height / 2;
      camera.x = Math.max(0, Math.min(camTargetX, room.width - canvas.width));
      camera.y = Math.max(0, Math.min(camTargetY, room.height - canvas.height));
    } else if (phase === "fade_out") {
      timer++;
      globalDarkness = Math.min(1.0, timer / 60);
      if (timer > 60) phase = "teleport";
    } else if (phase === "teleport") {
      loadLevel("secret_room");
      room.furniture = JSON.parse(JSON.stringify(Helios.Rooms.secret_room.furniture));
      const brokenVent = room.furniture.find((f) => f.id === "broken_vent_in");
      const ventCenterX = brokenVent ? brokenVent.x + brokenVent.width / 2 : room.spawn.x;
      const standY = brokenVent ? Math.max(room.wallHeight + 26, brokenVent.y + brokenVent.height + 54) : 150;
      player.x = ventCenterX; player.y = standY;
      player.isCrawling = false; player.facing = "down";
      playData.player.room = "secret_room";
      playData.player.x = player.x; playData.player.y = player.y; playData.player.facing = player.facing;
      savePlayState();
      phase = "fade_in"; timer = 0;
    } else if (phase === "fade_in") {
      timer++;
      globalDarkness = Math.max(0, 1.0 - (timer / 60));
      if (timer > 60) { globalDarkness = 0; phase = "explode"; }
    } else if (phase === "explode") {
      const brokenVent = room.furniture.find((f) => f.id === "broken_vent_in");
      const blastX = brokenVent ? brokenVent.x + brokenVent.width / 2 : 250;
      const blastY = brokenVent ? brokenVent.y + brokenVent.height / 2 : 64;
      createExplosion(blastX, blastY, "#7b8b94");
      createExplosion(blastX, blastY, "#455a64");
      screenShake = 15;
      playSoundtrack("normal");
      if (brokenVent) {
        brokenVent.interaction = {
          enabled: true, type: "sequence",
          conversations: [[{ speaker: "LUKE", text: "It's jammed... can't get through anymore." }]],
          area: { x: -10, y: -10, width: brokenVent.width + 20, height: brokenVent.height + 20 }
        };
      }
      phase = "dialogue"; timer = 0;
      if (tempDialogueTimeout) {
        clearTimeout(tempDialogueTimeout); tempDialogueTimeout = null;
        dialogueBox.classList.remove("dialogue--active");
      }
    } else if (phase === "dialogue") {
      showTemporaryDialogue("Damn... the vent is broken, I can't go back.", "LUKE");
      phase = "end";
    } else if (phase === "end") {
      cutscene.active = false; cutscene = null;
    }
  };
}

function updateHorrorState() {
  updateHorrorChrome();
  if (!playData.worldState.horrorActive) return;
  if (cutscene && cutscene.active) return;
  if (currentLevelName === "secret_room" && playData.worldState.secretRoomLightOn) globalDarkness = 0.1;
  else globalDarkness = 0.7;
  room.furniture.forEach((item) => {
    if ((item.type === "student" || item.type === "teacher") && !item.headless) {
      if (item.type === "teacher") return;
      if (!item.vx) { item.vx = (Math.random() - 0.5) * 10; item.vy = (Math.random() - 0.5) * 10; }
      if (Math.random() < 0.1) { item.vx = (Math.random() - 0.5) * 10; item.vy = (Math.random() - 0.5) * 10; }
      let nextX = item.x + item.vx;
      let nextY = item.y + item.vy;
      if (nextX < room.padding || nextX > room.width - room.padding - item.width) { item.vx *= -1; nextX = item.x + item.vx; }
      if (nextY < room.wallHeight || nextY > room.height - room.padding - item.height) { item.vy *= -1; nextY = item.y + item.vy; }
      item.x = nextX; item.y = nextY;
      item.phase = (item.phase || 0) + 0.8;
      if (Math.random() < 0.001) {
        createExplosion(item.x + item.width / 2, item.y + 10, "#b71c1c");
        createExplosion(item.x + item.width / 2, item.y + 10, "#880e4f");
        item.headless = true;
        screenShake = 10;
      }
    }
  });
}

function updateNPCs() {
  if (playData.worldState.horrorActive) return;
  if (cutscene && cutscene.active) return;
  room.furniture.forEach((item) => {
    if (item.type !== "student" && item.type !== "teacher") return;
    item.walkFrame = 0;
    item.vx = 0; item.vy = 0;
    if (item.phase === undefined) item.phase = Math.random() * Math.PI * 2;
    item.phase += 0.03;
  });
}

function advanceDialogue() {
  if (deathSequence && deathSequence.active && deathSequence.awaitingContinue) {
    continueDeathSequence();
    return;
  }
  const next = Helios.Dialogue.advance({ dialogueLength: dialogue.length, stage });
  if (next.stage !== stage || next.completed) {
    stage = next.stage;
    updateDialogue();
  }
}

function checkAutoTriggers() {
  if (dialogueBox.classList.contains("dialogue--active")) return;
  for (let i = 0; i < room.furniture.length; i++) {
    const item = room.furniture[i];
    if (item.interaction && item.interaction.enabled && item.interaction.autoTrigger) {
      if (Helios.Proximity.isActorInsideInteractionArea({ item, actor: player })) {
        executeInteraction({ type: "furniture", obj: item, index: i, priority: 999 });
        return;
      }
    }
  }
}

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

function isFurnitureActionable(item, threshold = 84) {
  if (!item || isItemHidden(item)) return false;
  if (Helios.Proximity.isActorInsideInteractionArea({ item, actor: player })) return true;
  return isPlayerNearItem(item, threshold);
}

/* ---------------------------------------------------------------------
 * Interactions
 * ------------------------------------------------------------------- */
function handleInteraction() {
  if (player.isSitting) { player.isSitting = false; player.y += 10; return; }
  const candidates = [];
  for (let i = 0; i < room.furniture.length; i++) {
    const item = room.furniture[i];
    if (isItemHidden(item)) continue;
    if (item.interaction && item.interaction.enabled && item.interaction.conversations && item.interaction.conversations.length > 0) {
      if (isFurnitureActionable(item, 88)) {
        if (playData.worldState.horrorActive && (item.type === "student" || item.type === "teacher")) continue;
        candidates.push({ type: "furniture", obj: item, index: i, priority: item.interaction.priority || 1 });
      }
    }
    if (item.text && !item.interaction) {
      const anchorX = item.x + item.width / 2;
      const anchorY = item.y + item.height;
      const dist = Math.hypot(player.x - anchorX, player.y - anchorY);
      if (dist < 40) {
        if (playData.worldState.horrorActive && (item.type === "student" || item.type === "teacher")) continue;
        candidates.push({ type: "legacy_text", obj: item, priority: 1 });
      }
    }
  }
  const nearbyCabinets = room.furniture.filter((f) => f.id === "left_cabinet" || f.id === "right_cabinet");
  for (const cab of nearbyCabinets) {
    const cx = cab.x + cab.width / 2;
    const cy = cab.y + cab.height / 2;
    const d = Math.hypot(player.x - cx, player.y - cy);
    if (d < 100) candidates.push({ type: "furniture", obj: cab, index: room.furniture.indexOf(cab), priority: 10 });
  }
  const desks = room.furniture.filter((f) => f.type === "desk");
  for (const desk of desks) {
    if (desk.id === "player_seat") {
      const dist = Math.hypot(player.x - (desk.x + desk.width / 2), player.y - (desk.y + desk.height));
      if (dist < 50) candidates.push({ type: "sit", obj: desk, priority: desk.interaction ? (desk.interaction.priority || 1) : 1 });
    }
  }
  const door = getNearestDoor(60);
  if (door && (door.target || door.targetDoorId)) {
    candidates.push({ type: "door", obj: door, priority: door.priority || 1 });
  }
  if (candidates.length === 0) return;
  candidates.sort((a, b) => b.priority - a.priority);
  const maxP = candidates[0].priority;
  const topCandidates = candidates.filter((c) => c.priority === maxP);
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
  executeInteraction(selected);
}

function executeInteraction(target) {
  if (target.type === "sit") {
    const desk = target.obj;
    player.isSitting = true;
    player.x = desk.x + 23 + 12;
    player.y = desk.y + 34 + 36;
    player.facing = "up";
    if (desk.id === "player_seat" && currentLevelName === "lecture" && !playData.worldState.lecture_seen) startLectureCutscene(desk);
    return;
  }
  if (target.type === "legacy_text") {
    showTemporaryDialogue(target.obj.text, target.obj.name || "STUDENT");
    return;
  }
  if (target.type === "door") {
    const door = target.obj;
    if (currentLevelName === "classroom" && door.id === "door_class_to_hall" && !playData.worldState.classroomDoorUnlocked) {
      if (isItemInInventory("door_key")) {
        playData.worldState.classroomDoorUnlocked = true;
        removeInventoryItem("door_key");
        playData.worldState.leftCabinetDoorKeyTaken = true;
        showTemporaryDialogue("The door is now unlocked!", "LUKE");
        savePlayState();
        return;
      }
      showTemporaryDialogue("The door is locked. I need a key to open it.", "LUKE");
      return;
    }
    if (currentLevelName === "ruined_classroom" && door.id === "door_ruined_to_secret") {
      if (!playData.worldState.ruinedDoorOpened) {
        showTemporaryDialogue("The left door will not move. Something wants me to keep reading.", "LUKE");
        return;
      }
      loadLevel("endless_hallway", "door_hallway_from_ruined");
      playData.player.x = player.x; playData.player.y = player.y; playData.player.facing = player.facing;
      savePlayState();
      return;
    }
    if (currentLevelName === "principal_office" && playData.worldState.horrorActive && door.id === "door_principal_to_hallway") {
      triggerDeath("door_exit");
      return;
    }
    const parts = (door.target || "").split(":");
    let targetRoom = parts[0].trim();
    let targetId = parts[1] ? parts[1].trim() : null;
    if (!targetId && door.targetDoorId) targetId = door.targetDoorId;
    if (targetRoom) {
      if (targetRoom === "principal_office" && playData.worldState.officeRushPending) clearOfficeRushState();
      loadLevel(targetRoom, targetId);
      if (!targetId && door.targetSpawn) { player.x = door.targetSpawn.x; player.y = door.targetSpawn.y; }
      playData.player.x = player.x; playData.player.y = player.y; playData.player.facing = player.facing;
      savePlayState();
    }
    return;
  }
  if (target.type === "furniture") {
    const item = target.obj;
    if (item.type === "document_page" && item.documentId) {
      const result = markRuinedDocumentRead(item.documentId);
      openDocumentOverlay(item.documentId, { pendingDoorReveal: result.justOpenedDoor });
      return;
    }
    if (item.type === "vent" && currentLevelName === "principal_office") {
      officeTimer.active = false;
      startVentCrawlCutscene();
      return;
    }
    if (item.type === "wall_switch" && item.id === "secret_room_light_switch") {
      playData.worldState.secretRoomLightOn = !playData.worldState.secretRoomLightOn;
      const msg = playData.worldState.secretRoomLightOn ? "Light turned on." : "Light turned off.";
      showTemporaryDialogue(msg, "LUKE");
      savePlayState();
      return;
    }
    if (item.id === "secret_room_supply_chest") {
      if (playData.worldState.secretRoomChestOpened) {
        showTemporaryDialogue("The chest is empty now.", "LUKE");
        return;
      }
      const emptySlot = findInventoryEmptySlot();
      if (emptySlot === -1) { showTemporaryDialogue("I need one empty inventory slot first.", "LUKE"); return; }
      playData.worldState.secretRoomChestOpened = true;
      playData.inventory[emptySlot] = Helios.Inventory.clone("axe");
      addMoney(5);
      updateInventoryUI();
      showTemporaryDialogue("Found a Rusty Axe and 5 money.", "SYSTEM");
      savePlayState();
      return;
    }
    if (item.id === "secret_room_loose_floorboards") {
      if (playData.worldState.secretRoomHatchRevealed) {
        showTemporaryDialogue("The hatch is exposed now.", "LUKE");
        return;
      }
      if (isItemInInventory("axe")) {
        playData.worldState.secretRoomHatchRevealed = true;
        showTemporaryDialogue("The axe tears through the loose boards. There is a hatch underneath.", "LUKE");
        savePlayState();
        return;
      }
      showTemporaryDialogue("These planks are loose, but I need something heavy to break them open.", "LUKE");
      return;
    }
    if (item.id === "secret_room_padlocked_hatch") {
      if (!playData.worldState.secretRoomPadlockUnlocked) { openPadlockOverlay(item.id); return; }
      showTemporaryDialogue("The hatch creaks open...", "LUKE");
      loadLevel("ruined_classroom", "door_ruined_to_secret");
      playData.player.x = player.x; playData.player.y = player.y; playData.player.facing = player.facing;
      savePlayState();
      return;
    }
    const isKeySelected = isInventoryOpen && playData.inventory[playData.activeSlot] && playData.inventory[playData.activeSlot].id === "cabinet_key";
    const isLeftCabinetUnlocked = Boolean(playData.worldState.leftCabinetUnlocked);
    if (item.id === "left_cabinet") {
      if (isLeftCabinetUnlocked || isKeySelected || isItemInInventory("cabinet_key")) {
        if (!isLeftCabinetUnlocked) {
          playData.worldState.leftCabinetUnlocked = true;
          removeInventoryItem("cabinet_key");
          updateInventoryUI();
        }
        openLeftCabinetPOV();
        savePlayState();
        return;
      }
      showTemporaryDialogue("It's locked.", "LUKE");
      return;
    }
    if (isKeySelected && (item.type === "cupboard" || item.type === "locker" || item.type === "chest" || item.type === "door")) {
      showTemporaryDialogue("This key doesn't fit.", "LUKE");
      return;
    }
    const interaction = item.interaction;
    let stateKey = currentLevelName + ":";
    if (item.id) stateKey += item.id;
    else stateKey += target.index;
    const count = playData.worldState[stateKey] || 0;
    const validConvos = interaction.conversations.filter((c) => {
      if (Array.isArray(c)) return true;
      if (c.reqCount !== undefined && count !== parseInt(c.reqCount)) return false;
      if (c.minCount !== undefined && count < parseInt(c.minCount)) return false;
      if (c.maxCount !== undefined && count > parseInt(c.maxCount)) return false;
      if (c.once && c.seen) return false;
      return true;
    });
    if (validConvos.length === 0) return;
    let selectedConvo = null;
    if (interaction.type === "random") selectedConvo = validConvos[Math.floor(Math.random() * validConvos.length)];
    else selectedConvo = validConvos[0];
    if (selectedConvo) {
      let lines = Array.isArray(selectedConvo) ? selectedConvo : selectedConvo.lines;
      if (lines && lines.length > 0) {
        dialogue = JSON.parse(JSON.stringify(lines));
        stage = 0;
        updateDialogue();
        playData.worldState[stateKey] = count + 1;
        savePlayState();
      }
    }
  }
}

/* ---------------------------------------------------------------------
 * POV cabinet, note overlay, padlock overlay
 * ------------------------------------------------------------------- */
function syncLeftCabinetPOV() {
  const povNote = document.getElementById("pov-note");
  const povKey = document.getElementById("pov-key");
  if (povNote) {
    const noteTaken = Boolean(playData.worldState.leftCabinetNoteTaken) ||
      playData.inventory.some((item) => item && item.id === "secret_note");
    povNote.classList.toggle("picked-up", noteTaken);
  }
  if (povKey) {
    const keyTaken = Boolean(playData.worldState.leftCabinetDoorKeyTaken) ||
      playData.inventory.some((item) => item && item.id === "door_key");
    povKey.classList.toggle("picked-up", keyTaken);
  }
}

function openLeftCabinetPOV() {
  playData.povActive = true;
  syncLeftCabinetPOV();
  Helios.Overlay.setHidden(document, "pov-container", false);
}

function setNoteFlipped(flipped) {
  const paper = document.querySelector(".note-paper");
  if (paper) paper.classList.toggle("note-paper--flipped", Boolean(flipped));
}

function getLetterOverlayContent() { return Helios.Story.defaultLetter; }
function getDocumentOverlayContent(id) { return Helios.Story.ruinedClassroomDocumentMap[id] || null; }

function renderNoteOverlay() {
  const paper = document.querySelector(".note-paper");
  const front = document.getElementById("note-front-content");
  const back = document.getElementById("note-back-content");
  const flipButton = document.getElementById("btn-flip-note");
  const closeButton = document.getElementById("btn-close-note");
  if (!paper || !front || !back || !flipButton || !closeButton) return;
  const content = noteOverlayState.mode === "document" ? getDocumentOverlayContent(noteOverlayState.documentId) : getLetterOverlayContent();
  if (!content) return;
  paper.className = `note-paper ${content.paperClass || ""}`.trim();
  front.className = `note-content ${content.contentClass || ""}`.trim();
  back.className = "note-content note-content--back";
  front.innerHTML = noteOverlayState.mode === "document" ? Helios.NoteRenderer.renderDocument(content) : Helios.NoteRenderer.renderLetter(content);
  back.innerHTML = Helios.NoteRenderer.renderBack(content);
  flipButton.textContent = content.flipLabel || "Flip Paper";
  flipButton.classList.toggle("btn-note-close--hidden", !content.canFlip);
  closeButton.textContent = content.closeLabel || "Close";
  setNoteFlipped(false);
}

function openDocumentOverlay(documentId, options = {}) {
  noteOverlayState = { mode: "document", documentId, pendingDoorReveal: Boolean(options.pendingDoorReveal) };
  renderNoteOverlay();
  Helios.Overlay.setHidden(document, "note-overlay", false);
}

function openNoteOverlay() {
  noteOverlayState = { mode: "letter", documentId: null, pendingDoorReveal: false };
  renderNoteOverlay();
  Helios.Overlay.setHidden(document, "note-overlay", false);
}

function closeNoteOverlay() {
  const revealDoor = Boolean(noteOverlayState.pendingDoorReveal);
  Helios.Overlay.setHidden(document, "note-overlay", true);
  setNoteFlipped(false);
  noteOverlayState = { mode: "letter", documentId: null, pendingDoorReveal: false };
  if (revealDoor) {
    screenShake = Math.max(screenShake, 10);
    if (currentLevelName === "ruined_classroom") ensureRuinedClassroomState(room);
    showTemporaryDialogue("A slow metallic groan rolls through the room. The left door is open now.", "SYSTEM");
  }
}

function setPadlockFeedback(message, type = "") {
  const feedback = document.getElementById("padlock-feedback");
  if (!feedback) return;
  feedback.textContent = message || "";
  feedback.classList.remove("padlock-feedback--error", "padlock-feedback--success");
  if (type) feedback.classList.add(`padlock-feedback--${type}`);
}

function openPadlockOverlay(itemId) {
  activePadlockId = itemId;
  const input = document.getElementById("padlock-input");
  if (!input || !Helios.Overlay.setHidden(document, "padlock-overlay", false)) return;
  input.value = "";
  setPadlockFeedback("");
  setTimeout(() => input.focus(), 10);
}

function closePadlockOverlay() {
  activePadlockId = null;
  const input = document.getElementById("padlock-input");
  Helios.Overlay.setHidden(document, "padlock-overlay", true);
  if (input) input.blur();
  setPadlockFeedback("");
}

function attemptPadlockUnlock() {
  const input = document.getElementById("padlock-input");
  if (!input) return;
  const code = String(input.value || "").replace(/\D/g, "").slice(0, 4);
  input.value = code;
  if (code.length < 4) { setPadlockFeedback("Enter all 4 digits first.", "error"); return; }
  if (code !== Helios.Story.SECRET_NOTE_CODE) { setPadlockFeedback("Wrong combination.", "error"); return; }
  playData.worldState.secretRoomPadlockUnlocked = true;
  savePlayState();
  setPadlockFeedback("The lock clicks open.", "success");
  setTimeout(() => { closePadlockOverlay(); showTemporaryDialogue("The padlock opened.", "LUKE"); }, 220);
}

/* ---------------------------------------------------------------------
 * UI updates
 * ------------------------------------------------------------------- */
function positionInventoryHUD() {
  const hud = document.getElementById("inventory-hud");
  const frame = document.querySelector(".frame");
  if (!hud || !frame) return;
  const rect = frame.getBoundingClientRect();
  const desiredLeft = rect.left - 76;
  const clampedLeft = Math.max(8, desiredLeft);
  hud.style.left = clampedLeft + "px";
  hud.classList.toggle("inventory-hud--clamped", desiredLeft < 8);
}
window.addEventListener("resize", positionInventoryHUD);

function toggleHelpScreen() {
  const help = document.getElementById("help-screen");
  if (help) help.classList.toggle("hidden");
}

function updateInventoryUI() {
  const hud = document.getElementById("inventory-hud");
  if (!hud) return;
  ensurePlayDataDefaults();
  if (isInventoryOpen) hud.classList.remove("hidden");
  else { hud.classList.add("hidden"); return; }
  const moneyValue = document.getElementById("inv-money-value");
  if (moneyValue) moneyValue.textContent = playData.money;
  for (let i = 0; i < Helios.Inventory.SIZE; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    if (!slotEl) continue;
    if (i === playData.activeSlot) slotEl.classList.add("active");
    else slotEl.classList.remove("active");
    const item = playData.inventory[i];
    slotEl.innerHTML = "";
    slotEl.setAttribute("data-slot", i + 1);
    if (item) {
      const iconEl = document.createElement("div");
      iconEl.className = "inv-item";
      if (item.icon) {
        iconEl.textContent = item.icon;
        iconEl.style.fontSize = "24px";
        iconEl.style.textAlign = "center";
        iconEl.style.lineHeight = "32px";
      }
      iconEl.title = item.name;
      slotEl.appendChild(iconEl);
    }
  }
}

function useActiveItem() {
  if (!isInventoryOpen) { showTemporaryDialogue("Open inventory first! (press E)", "SYSTEM"); return; }
  const item = playData.inventory[playData.activeSlot];
  if (!item) { showTemporaryDialogue("Empty slot.", "SYSTEM"); return; }
  const handler = Helios.Inventory.getHandler(item.id);
  if (handler) {
    handler({ currentLevelName, getRoomItem, isPlayerNearItem, openNoteOverlay, playData, savePlayState, showTemporaryDialogue });
    return;
  }
  showTemporaryDialogue("I can't use this directly.", "LUKE");
}

function updateVolumeUI() {
  const lbl = document.getElementById("volume-label");
  if (lbl) lbl.textContent = `${Math.round(getVolumeLevel() * 100)}%`;
}

function changeVolume(delta) {
  ensurePlayDataDefaults();
  playData.settings.volume = Helios.Play.clamp(getVolumeLevel() + delta);
  applyMasterVolume();
  savePlayState();
}

function formatSaveMeta(data) {
  if (!data) return "Empty";
  const roomName = (data.player?.room || "unknown").replace(/_/g, " ");
  const time = data.savedAt ? new Date(data.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "unknown";
  const items = (data.inventory || []).filter(Boolean).length;
  return `${roomName}\n${items} item(s)\n${time}`;
}

function renderSaveSlots() {
  const grid = document.getElementById("save-slot-grid");
  if (!grid) return;
  grid.innerHTML = "";
  Helios.Save.listSlots(localStorage).forEach(({ slot, data }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `save-slot${slot === selectedSaveSlot ? " save-slot--selected" : ""}`;
    btn.dataset.slot = String(slot);
    btn.innerHTML = `<div class="save-slot__label">Slot ${slot}</div><div class="save-slot__meta ${data ? "" : "save-slot__empty"}"></div>`;
    btn.querySelector(".save-slot__meta").textContent = formatSaveMeta(data);
    btn.addEventListener("click", () => {
      selectedSaveSlot = slot;
      renderSaveSlots();
    });
    grid.appendChild(btn);
  });
  const loadButton = document.getElementById("btn-load-current");
  if (loadButton) loadButton.toggleAttribute("disabled", !Helios.Save.hasSlot(localStorage, selectedSaveSlot));
  const saveButton = document.getElementById("btn-save-current");
  if (saveButton) saveButton.toggleAttribute("disabled", !isGameActive);
}

function updateStartSaveButtons() {
  const loadSlotsButton = document.getElementById("btn-load-slots");
  if (!loadSlotsButton) return;
  const hasAnySlot = Helios.Save.listSlots(localStorage).some((slot) => slot.occupied);
  loadSlotsButton.style.display = hasAnySlot ? "" : "none";
}

function openPauseOverlay() {
  renderSaveSlots();
  Helios.Overlay.setHidden(document, "pause-overlay", false);
}

function closePauseOverlay() {
  Helios.Overlay.setHidden(document, "pause-overlay", true);
}

function saveSelectedSlot() {
  ensurePlayDataDefaults();
  playData.player.room = currentLevelName;
  playData.player.x = player.x;
  playData.player.y = player.y;
  playData.player.facing = player.facing;
  Helios.Save.writeSlot(localStorage, selectedSaveSlot, playData);
  renderSaveSlots();
  updateStartSaveButtons();
  showTemporaryDialogue(`Saved to slot ${selectedSaveSlot}.`, "SYSTEM");
}

function loadSelectedSlot() {
  const saved = Helios.Save.readSlot(localStorage, selectedSaveSlot);
  if (!saved) {
    showTemporaryDialogue(`Slot ${selectedSaveSlot} is empty.`, "SYSTEM");
    return;
  }
  isDeveloperMode = false;
  playData = saved;
  ensurePlayDataDefaults();
  hydratePersistentUnlockState();
  closePauseOverlay();
  loadLevel(playData.player.room);
  player.x = playData.player.x;
  player.y = playData.player.y;
  player.facing = playData.player.facing;
  player.isSitting = false;
  isGameActive = true;
  const startScreen = document.getElementById("start-screen");
  if (startScreen) startScreen.style.display = "none";
  menuBtn.style.display = "";
  updateInventoryUI();
  applyMasterVolume();
  updateSoundtrack();
  updateHorrorChrome();
  if (animationFrameId === null) loop();
  showTemporaryDialogue(`Loaded slot ${selectedSaveSlot}.`, "SYSTEM");
}

function checkpointInventory(items) {
  const inventory = Array.from({ length: Helios.Inventory.SIZE }, () => null);
  (items || []).slice(0, Helios.Inventory.SIZE).forEach((id, index) => {
    inventory[index] = id ? Helios.Inventory.clone(id) : null;
  });
  return inventory;
}

function populateDevCheckpoints() {
  const select = document.getElementById("dev-checkpoint-select");
  if (!select || select.options.length > 0) return;
  Helios.DevCheckpoints.forEach((checkpoint) => {
    const option = document.createElement("option");
    option.value = checkpoint.id;
    option.textContent = checkpoint.label;
    select.appendChild(option);
  });
}

function loadDevCheckpoint(id) {
  const checkpoint = Helios.DevCheckpoints.find((entry) => entry.id === id) || Helios.DevCheckpoints[0];
  if (!checkpoint) return;
  const preservedVolume = getVolumeLevel();
  deathSequence = null;
  cutscene = null;
  particles = [];
  screenShake = 0;
  officeTimer.active = Boolean(checkpoint.worldState?.officeRushPending);
  if (officeTimer.active) {
    officeTimer.framesLeft = officeTimer.durationFrames;
    officeTimer.flashed = false;
  }
  playData = Helios.Play.create({
    startingRoom: checkpoint.room,
    x: checkpoint.x,
    y: checkpoint.y,
    facing: checkpoint.facing,
    inventory: checkpointInventory(checkpoint.inventory),
    worldState: checkpoint.worldState || {},
    introSeen: checkpoint.introSeen !== false,
    volume: preservedVolume
  });
  globalDarkness = Number.isFinite(checkpoint.darkness) ? checkpoint.darkness : 0;
  dialogue = [];
  stage = 0;
  isHintActive = false;
  stopDialogueVoice();
  updateDialogue();
  isGameActive = true;
  isDeveloperMode = true;
  const startScreen = document.getElementById("start-screen");
  if (startScreen) startScreen.style.display = "none";
  document.getElementById("dev-sidebar")?.classList.remove("hidden");
  menuBtn.style.display = "";
  loadLevel(checkpoint.room);
  applyRoomState(checkpoint.room);
  player.x = checkpoint.x;
  player.y = checkpoint.y;
  player.facing = checkpoint.facing || "down";
  player.isSitting = false;
  playData.player.room = checkpoint.room;
  playData.player.x = player.x;
  playData.player.y = player.y;
  playData.player.facing = player.facing;
  updateInventoryUI();
  updateSoundtrack();
  updateHorrorChrome();
  updateDevStateSummary();
  if (animationFrameId === null) loop();
}

function updateDevStateSummary() {
  const box = document.getElementById("dev-state-summary");
  if (!box || !isDeveloperMode || !devDebug.state) return;
  const flags = Object.entries(playData.worldState || {})
    .filter(([, value]) => value === true || typeof value === "number" || typeof value === "string")
    .slice(0, 12)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const items = playData.inventory.map((item, index) => `${index + 1}:${item ? item.id : "-"}`).join(" ");
  box.textContent = `room: ${currentLevelName}\npos: ${Math.round(player.x)}, ${Math.round(player.y)}\nitems: ${items}\n${flags}`;
}

/* ---------------------------------------------------------------------
 * Main loop
 * ------------------------------------------------------------------- */
function loop() {
  if (cutscene && cutscene.active && cutscene.update) cutscene.update();
  updateOfficeTimer();
  updateDeathSequence();
  updateHorrorState();
  updateNPCs();
  updateParticles();
  handleMovement();
  updateDevStateSummary();
  draw();
  animationFrameId = requestAnimationFrame(loop);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (screenShake > 0) {
    const sx = (Math.random() - 0.5) * screenShake;
    const sy = (Math.random() - 0.5) * screenShake;
    ctx.translate(sx, sy);
  }
  const activeZoom = getActiveSceneZoom();
  const renderOffset = getSceneRenderOffset(activeZoom);
  if (activeZoom && activeZoom !== 1) ctx.scale(activeZoom, activeZoom);
  ctx.translate(renderOffset.x - camera.x, renderOffset.y - camera.y);
  drawRoom();
  room.furniture.filter((i) => i.type === "rug").forEach((item) => drawFurnitureItem(item));
  drawDoors();
  const renderList = [];
  renderList.push({ y: player.y, draw: () => drawPlayer(player.x, player.y) });
  room.furniture.forEach((item) => {
    if (item.type === "rug") return;
    renderList.push({
      y: item.y + item.height,
      draw: () => { drawFurnitureShadow(item); drawFurnitureItem(item); }
    });
  });
  renderList.sort((a, b) => a.y - b.y);
  renderList.forEach((obj) => obj.draw());
  drawSceneLighting();
  drawParticles();
  ctx.restore();
  if (globalDarkness > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${globalDarkness})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  drawOfficeTimer();
  drawDeathSequence();
  drawScreenEffects();
  drawHints();
  drawDevOverlay();
}

/* ---------------------------------------------------------------------
 * Input listeners
 * ------------------------------------------------------------------- */
function actionToLegacyKey(action) {
  if (action === Helios.Input.ACTIONS.MOVE_UP) return "w";
  if (action === Helios.Input.ACTIONS.MOVE_DOWN) return "s";
  if (action === Helios.Input.ACTIONS.MOVE_LEFT) return "a";
  if (action === Helios.Input.ACTIONS.MOVE_RIGHT) return "d";
  return null;
}

document.addEventListener("keydown", (event) => {
  const action = Helios.Input.mapKeyToAction(event.key);
  const activeTag = document.activeElement?.tagName;
  const isTyping = activeTag === "INPUT" || activeTag === "TEXTAREA";
  if (playData.povActive && action === Helios.Input.ACTIONS.CANCEL) {
    playData.povActive = false;
    Helios.Overlay.setHidden(document, "pov-container", true);
    return;
  }
  if (isOverlayVisible("note-overlay") && action === Helios.Input.ACTIONS.CANCEL) { closeNoteOverlay(); return; }
  if (isOverlayVisible("padlock-overlay") && action === Helios.Input.ACTIONS.CANCEL) { closePadlockOverlay(); return; }
  if (isOverlayVisible("pause-overlay") && (action === Helios.Input.ACTIONS.CANCEL || action === Helios.Input.ACTIONS.PAUSE)) { closePauseOverlay(); return; }
  if (isModalBlockingInput()) return;
  const key = event.key.toLowerCase();
  if (action === Helios.Input.ACTIONS.PAUSE && !isTyping && isGameActive) { openPauseOverlay(); return; }
  if (action === Helios.Input.ACTIONS.TOGGLE_HELP && !isTyping) { toggleHelpScreen(); return; }
  if (action === Helios.Input.ACTIONS.TOGGLE_INVENTORY && !isTyping) {
    isInventoryOpen = !isInventoryOpen;
    updateInventoryUI();
    positionInventoryHUD();
    return;
  }
  if (["1", "2", "3", "4"].includes(key) && isInventoryOpen && !isTyping) {
    playData.activeSlot = parseInt(key) - 1;
    updateInventoryUI();
    return;
  }
  if (action === Helios.Input.ACTIONS.USE_ITEM && !isTyping) { useActiveItem(); return; }
  if (isDeveloperMode && (event.ctrlKey || event.metaKey)) {
    if (key === "c" && selectedObject) { clipboard = JSON.parse(JSON.stringify(selectedObject)); return; }
    if (key === "v" && clipboard) {
      const newObj = JSON.parse(JSON.stringify(clipboard));
      newObj.x += 20; newObj.y += 20;
      if (newObj.type === "door") room.doors.push(newObj);
      else room.furniture.push(newObj);
      selectedObject = newObj;
      updatePropPanel();
      saveLocal();
      return;
    }
  }
  if (Helios.Input.isMoveAction(action)) keys.add(actionToLegacyKey(action));
  if (action === Helios.Input.ACTIONS.INTERACT) {
    if (deathSequence && deathSequence.active) {
      if (deathSequence.awaitingContinue) continueDeathSequence();
      return;
    }
    if (dialogueBox.classList.contains("dialogue--active") && !isHintActive) advanceDialogue();
    else handleInteraction();
  }
  if (isDeveloperMode && (key === "delete" || key === "backspace")) {
    if (document.activeElement.tagName === "INPUT") return;
    if (selectedObject) deleteObject();
  }
});

document.addEventListener("keyup", (event) => {
  const action = Helios.Input.mapKeyToAction(event.key);
  if (Helios.Input.isMoveAction(action)) { keys.delete(actionToLegacyKey(action)); return; }
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("wheel", (e) => {
  if (isInventoryOpen) {
    e.preventDefault();
    if (e.deltaY < 0) playData.activeSlot = (playData.activeSlot - 1 + Helios.Inventory.SIZE) % Helios.Inventory.SIZE;
    else playData.activeSlot = (playData.activeSlot + 1) % Helios.Inventory.SIZE;
    updateInventoryUI();
    return;
  }
  if (cutscene && cutscene.active) return;
  if (isDeveloperMode) return;
  if (deathSequence && deathSequence.active) return;
  if (!isGameActive) return;
  if (playData.povActive) return;
  e.preventDefault();
  if (e.deltaY < 0) userZoom = Math.min(USER_ZOOM_MAX, userZoom + USER_ZOOM_STEP);
  else userZoom = Math.max(USER_ZOOM_MIN, userZoom - USER_ZOOM_STEP);
}, { passive: false });

document.addEventListener("keydown", (e) => {
  if (cutscene && cutscene.active) return;
  if (isDeveloperMode) return;
  if (!isGameActive) return;
  if (isModalBlockingInput()) return;
  if (document.activeElement.tagName === "INPUT") return;
  const action = Helios.Input.mapKeyToAction(e.key);
  if (action === Helios.Input.ACTIONS.ZOOM_IN) userZoom = Math.min(USER_ZOOM_MAX, userZoom + USER_ZOOM_STEP);
  else if (action === Helios.Input.ACTIONS.ZOOM_OUT) userZoom = Math.max(USER_ZOOM_MIN, userZoom - USER_ZOOM_STEP);
});

/* ---------------------------------------------------------------------
 * Developer mode
 * ------------------------------------------------------------------- */
function updateDevRoomSelect() {
  const select = document.getElementById("dev-room-select");
  if (!select) return;
  select.innerHTML = "";
  Object.keys(levels).forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    if (key === currentLevelName) option.selected = true;
    select.appendChild(option);
  });
}

document.getElementById("dev-room-select")?.addEventListener("change", (e) => loadLevel(e.target.value));
document.getElementById("dev-add-room")?.addEventListener("click", () => {
  const name = prompt("Enter new room name:");
  if (name && !levels[name]) {
    levels[name] = { width: 800, height: 600, wallHeight: 96, padding: 32, theme: "dorm", doors: [], spawn: { x: 400, y: 300 }, furniture: [] };
    updateDevRoomSelect();
    loadLevel(name);
  } else if (levels[name]) alert("Room already exists!");
});

function addPropInput(container, label, value, onChange) {
  const div = document.createElement("div");
  div.className = "dev-prop-row";
  div.innerHTML = `<label style="width:50px">${label}</label> <input type="text" value="${value}">`;
  container.appendChild(div);
  div.querySelector("input").onchange = (e) => { onChange(e.target.value); saveLocal(); };
}

const copyBtn = document.createElement("button");
copyBtn.textContent = "Copy"; copyBtn.className = "btn-sm"; copyBtn.style.marginRight = "5px";
copyBtn.onclick = () => { if (selectedObject) clipboard = JSON.parse(JSON.stringify(selectedObject)); };
const pasteBtn = document.createElement("button");
pasteBtn.textContent = "Paste"; pasteBtn.className = "btn-sm";
pasteBtn.onclick = () => {
  if (clipboard) {
    const newObj = JSON.parse(JSON.stringify(clipboard));
    newObj.x += 20; newObj.y += 20;
    if (newObj.type === "door") room.doors.push(newObj);
    else room.furniture.push(newObj);
    selectedObject = newObj;
    updatePropPanel();
    saveLocal();
  }
};
const cpContainer = document.createElement("div");
cpContainer.className = "dev-prop-row";
cpContainer.style.marginTop = "10px";
cpContainer.appendChild(copyBtn); cpContainer.appendChild(pasteBtn);

function updatePropPanel() {
  if (!selectedObject) return;
  const p = document.getElementById("dev-props");
  p.classList.remove("hidden");
  const propFields = ["prop-x", "prop-y", "prop-w", "prop-h"];
  propFields.forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.parentElement) el.parentElement.style.display = selectedObject.type === "intro_manager" ? "none" : "block";
  });
  document.getElementById("prop-x").value = selectedObject.x;
  document.getElementById("prop-y").value = selectedObject.y;
  document.getElementById("prop-w").value = selectedObject.width;
  document.getElementById("prop-h").value = selectedObject.height;
  const extra = document.getElementById("prop-extra");
  extra.innerHTML = "";
  extra.appendChild(cpContainer);
  addPropInput(extra, "Type", selectedObject.type, (v) => { selectedObject.type = v; });
  if (selectedObject.type === "student") {
    addPropInput(extra, "Name", selectedObject.name || "STUDENT", (v) => { selectedObject.name = v; });
    addPropInput(extra, "Variant", selectedObject.variant || "boy", (v) => { selectedObject.variant = v; });
    addPropInput(extra, "Shirt", selectedObject.shirt || "#000", (v) => { selectedObject.shirt = v; });
    addPropInput(extra, "Text", selectedObject.text || "", (v) => { selectedObject.text = v; });
  } else if (selectedObject.type === "door") {
    addPropInput(extra, "ID", selectedObject.id || "", (v) => { selectedObject.id = v; });
    let displayTarget = selectedObject.target || "";
    if (selectedObject.targetDoorId && !displayTarget.includes(":")) displayTarget += ":" + selectedObject.targetDoorId;
    addPropInput(extra, "Target (Room:ID)", displayTarget, (v) => { selectedObject.target = v; delete selectedObject.targetDoorId; });
    const div = document.createElement("div");
    div.className = "dev-prop-row";
    div.innerHTML = `<label>Dir:</label> <select id="prop-door-dir">
      <option value="top">Top</option><option value="bottom">Bottom</option>
      <option value="left">Left</option><option value="right">Right</option></select>`;
    extra.appendChild(div);
    const sel = div.querySelector("select");
    sel.value = selectedObject.orientation || "top";
    sel.onchange = (e) => { selectedObject.orientation = e.target.value; saveLocal(); };
  } else if (selectedObject.type === "rug") {
    addPropInput(extra, "Color", selectedObject.color || "#fff", (v) => { selectedObject.color = v; });
  }
}

function deleteObject() {
  if (!selectedObject) return;
  if (selectedObject.type === "door") room.doors = room.doors.filter((d) => d !== selectedObject);
  else room.furniture = room.furniture.filter((f) => f !== selectedObject);
  selectedObject = null;
  document.getElementById("dev-props").classList.add("hidden");
  saveLocal();
}

canvas.addEventListener("mousedown", (e) => {
  if (!isDeveloperMode) return;
  const rect = canvas.getBoundingClientRect();
  const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  const mx = wp.x, my = wp.y;
  const items = [...room.furniture].reverse();
  for (const item of items) {
    if (mx >= item.x && mx <= item.x + item.width && my >= item.y && my <= item.y + item.height) {
      selectedObject = item;
      isDragging = true;
      dragOffset.x = mx - item.x; dragOffset.y = my - item.y;
      updatePropPanel();
      return;
    }
  }
  const doors = room.doors || [];
  for (const door of doors) {
    if (mx >= door.x && mx <= door.x + door.width && my >= door.y && my <= door.y + door.height) {
      selectedObject = door;
      selectedObject.type = "door";
      isDragging = true;
      dragOffset.x = mx - door.x; dragOffset.y = my - door.y;
      updatePropPanel();
      return;
    }
  }
  selectedObject = null;
  document.getElementById("dev-props").classList.add("hidden");
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDeveloperMode) return;
  const rect = canvas.getBoundingClientRect();
  const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  if (isDragging && selectedObject) {
    selectedObject.x = Math.round(wp.x - dragOffset.x);
    selectedObject.y = Math.round(wp.y - dragOffset.y);
    updatePropPanel();
  }
});

canvas.addEventListener("mouseup", () => {
  if (isDragging || isDraggingSpawn || isDraggingInteraction || resizeHandle) saveLocal();
  isDragging = false; isDraggingSpawn = false; isDraggingInteraction = false; resizeHandle = null;
});

const devRoomSelect = document.getElementById("dev-room-select");
if (devRoomSelect) {
  ["x", "y", "w", "h"].forEach((key) => {
    document.getElementById(`prop-${key}`).addEventListener("change", (e) => {
      if (selectedObject) {
        const val = parseInt(e.target.value);
        if (key === "x") selectedObject.x = val;
        if (key === "y") selectedObject.y = val;
        if (key === "w") selectedObject.width = val;
        if (key === "h") selectedObject.height = val;
        saveLocal();
      }
    });
  });
}

document.getElementById("dev-delete-obj")?.addEventListener("click", deleteObject);

const availableObjects = Helios.EditorObjects;
const pickerModal = document.getElementById("object-picker");
const pickerGrid = document.getElementById("obj-grid");
document.getElementById("dev-open-picker")?.addEventListener("click", () => {
  if (!pickerGrid) return;
  pickerGrid.innerHTML = "";
  availableObjects.forEach((obj) => {
    const card = document.createElement("div");
    card.className = "obj-card";
    card.innerHTML = `<div class="obj-icon" style="background:${obj.color}"></div><span>${obj.label}</span>`;
    card.onclick = () => { addObject(obj.type); pickerModal.classList.add("hidden"); };
    pickerGrid.appendChild(card);
  });
  pickerModal.classList.remove("hidden");
});
document.getElementById("picker-cancel")?.addEventListener("click", () => pickerModal.classList.add("hidden"));

function addObject(type) {
  let obj = { x: camera.x + 340, y: camera.y + 260, width: 40, height: 40, type };
  if (type === "door") { obj.width = 64; obj.height = 80; obj.orientation = "top"; if (!room.doors) room.doors = []; room.doors.push(obj); }
  else {
    if (type === "student") { obj.width = 24; obj.height = 36; obj.variant = "boy"; obj.text = "Hello"; }
    if (type === "desk") { obj.width = 70; obj.height = 60; }
    if (type === "rug") { obj.width = 80; obj.height = 120; }
    if (type === "bed") { obj.width = 60; obj.height = 100; }
    if (type === "zone") { obj.width = 100; obj.height = 100; }
    room.furniture.push(obj);
  }
  selectedObject = obj;
  updatePropPanel();
  saveLocal();
}

const editIntroBtn = document.createElement("button");
editIntroBtn.textContent = "Edit Intro Dialogue";
editIntroBtn.className = "dev-btn";
editIntroBtn.style.marginTop = "10px";
editIntroBtn.onclick = () => {
  selectedObject = {
    type: "intro_manager", x: 0, y: 0, width: 0, height: 0,
    interaction: { enabled: true, type: "sequence", conversations: [introDialogue] }
  };
  updatePropPanel();
};
document.querySelector("#dev-sidebar .dev-section")?.appendChild(editIntroBtn);

const menuBtn = document.createElement("button");
menuBtn.textContent = "Menu";
menuBtn.className = "btn-sm";
menuBtn.style.cssText = "position:absolute;top:10px;left:10px;z-index:1000;display:none";
menuBtn.onclick = () => { if (confirm("Return to Main Menu? Unsaved progress in Play Mode will be lost.")) location.reload(); };
document.body.appendChild(menuBtn);

canvas.addEventListener("click", advanceDialogue);

/* ---------------------------------------------------------------------
 * Save / load helpers
 * ------------------------------------------------------------------- */
function saveLocal() { if (isDeveloperMode) saveDesignData(); }
function saveDesignData() {
  const json = Helios.Save.serialize({ levels, dialogue: introDialogue });
  try { localStorage.setItem(Helios.Save.DESIGN_KEY, json); } catch (e) { console.warn("LocalStorage save failed", e); }
}
function savePlayState() {
  if (isDeveloperMode) return;
  ensurePlayDataDefaults();
  try { Helios.Save.writeJson(localStorage, Helios.Save.PLAY_KEY, playData); } catch (e) { console.error(e); }
}

function hydratePersistentUnlockState() {
  ensurePlayDataDefaults();
  const hasCabinetKey = playData.inventory.some((item) => item && item.id === "cabinet_key");
  const hasSecretNote = playData.inventory.some((item) => item && item.id === "secret_note");
  const hasDoorKey = playData.inventory.some((item) => item && item.id === "door_key");
  const hasAxe = playData.inventory.some((item) => item && item.id === "axe");
  if (hasSecretNote) playData.worldState.leftCabinetNoteTaken = true;
  if (hasDoorKey || playData.worldState.classroomDoorUnlocked) playData.worldState.leftCabinetDoorKeyTaken = true;
  if (!playData.worldState.leftCabinetUnlocked) {
    const cabinetUsed = playData.worldState.leftCabinetNoteTaken || playData.worldState.leftCabinetDoorKeyTaken ||
      playData.worldState.classroomDoorUnlocked || hasSecretNote || hasDoorKey;
    if (!hasCabinetKey && cabinetUsed) playData.worldState.leftCabinetUnlocked = true;
  }
  if (hasAxe) playData.worldState.secretRoomChestOpened = true;
}

function loadPlayState() {
  try {
    const saved = Helios.Save.readJson(localStorage, Helios.Save.PLAY_KEY);
    if (saved) {
      playData = saved;
      ensurePlayDataDefaults();
      hydratePersistentUnlockState();
      if (playData.player.room) {
        loadLevel(playData.player.room);
        player.x = playData.player.x; player.y = playData.player.y; player.facing = playData.player.facing;
      }
      if (typeof updateInventoryUI === "function") updateInventoryUI();
      applyMasterVolume();
    }
  } catch (e) { console.error(e); }
}

function loadExternalData() {
  try {
    const data = Helios.Save.readJson(localStorage, Helios.Save.DESIGN_KEY);
    if (data) {
      if (data.levels && data.dialogue) {
        normalizeGameData(data);
        levels = data.levels;
        const baseKeys = Object.keys(Helios.Rooms);
        const forceRefresh = ["classroom", "secret_room", "ruined_classroom", "endless_hallway", "library_archive"];
        for (const key of baseKeys) {
          if (forceRefresh.includes(key) || !levels[key] || (levels[key] && levels[key].furniture.length === 0 && Helios.Rooms[key].furniture.length > 0)) {
            levels[key] = JSON.parse(JSON.stringify(Helios.Rooms[key]));
          }
        }
        normalizeGameData({ levels });
        introDialogue = data.dialogue;
        currentLevelName = Object.keys(levels)[0] || "classroom";
        loadLevel(currentLevelName);
        return;
      }
    }
  } catch (e) { console.warn("LocalStorage access failed", e); }
  normalizeGameData({ levels });
  currentLevelName = Object.keys(levels)[0] || "classroom";
  loadLevel(currentLevelName);
}

/* ---------------------------------------------------------------------
 * POV + overlay event wiring
 * ------------------------------------------------------------------- */
(function setupOverlays() {
  const povNote = document.getElementById("pov-note");
  const povKey = document.getElementById("pov-key");
  const closePov = document.getElementById("btn-close-pov");
  const closeNote = document.getElementById("btn-close-note");
  const flipNote = document.getElementById("btn-flip-note");
  const padlockInput = document.getElementById("padlock-input");
  const padlockOpen = document.getElementById("btn-padlock-open");
  const padlockClose = document.getElementById("btn-padlock-close");
  if (closePov) closePov.addEventListener("click", () => { playData.povActive = false; Helios.Overlay.setHidden(document, "pov-container", true); savePlayState(); });
  if (povNote) povNote.addEventListener("click", () => {
    const slot = findInventoryEmptySlot();
    if (slot !== -1) {
      playData.inventory[slot] = Helios.Inventory.clone("secret_note");
      playData.worldState.leftCabinetNoteTaken = true;
      updateInventoryUI();
      povNote.classList.add("picked-up");
      showTemporaryDialogue("Obtained Mysterious Letter.", "SYSTEM");
      savePlayState();
    } else { showTemporaryDialogue("Inventory Full!", "SYSTEM"); }
  });
  if (povKey) povKey.addEventListener("click", () => {
    const slot = findInventoryEmptySlot();
    if (slot !== -1) {
      playData.inventory[slot] = Helios.Inventory.clone("door_key");
      playData.worldState.leftCabinetDoorKeyTaken = true;
      updateInventoryUI();
      povKey.classList.add("picked-up");
      showTemporaryDialogue("Obtained Door Key.", "SYSTEM");
      savePlayState();
    } else { showTemporaryDialogue("Inventory Full!", "SYSTEM"); }
  });
  if (closeNote) closeNote.addEventListener("click", closeNoteOverlay);
  if (flipNote) flipNote.addEventListener("click", () => {
    const paper = document.querySelector(".note-paper");
    if (paper) paper.classList.toggle("note-paper--flipped");
  });
  if (padlockInput) {
    padlockInput.addEventListener("input", () => {
      padlockInput.value = padlockInput.value.replace(/\D/g, "").slice(0, 4);
      setPadlockFeedback("");
    });
    padlockInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); attemptPadlockUnlock(); }
    });
  }
  if (padlockOpen) padlockOpen.addEventListener("click", attemptPadlockUnlock);
  if (padlockClose) padlockClose.addEventListener("click", closePadlockOverlay);
  syncLeftCabinetPOV();
})();

/* ---------------------------------------------------------------------
 * Zoom & volume side controls (HTML, attached programmatically)
 * ------------------------------------------------------------------- */
(function createSideControlsUI() {
  const container = document.createElement("div");
  container.id = "zoom-controls";
  container.style.cssText = "position:absolute;bottom:80px;right:16px;z-index:900;display:flex;flex-direction:column;align-items:center;gap:10px;opacity:0.7;transition:opacity 0.2s;pointer-events:auto";
  container.addEventListener("mouseenter", () => container.style.opacity = "1");
  container.addEventListener("mouseleave", () => container.style.opacity = "0.7");
  const groupStyle = "display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 8px;border-radius:8px;background:rgba(10,10,16,0.62);border:1px solid rgba(255,255,255,0.08)";
  const titleStyle = "color:rgba(255,255,255,0.72);font-size:11px;letter-spacing:0.08em;font-family:'VT323',monospace;text-transform:uppercase";
  const btnStyle = "width:36px;height:36px;border:2px solid rgba(255,255,255,0.3);background:rgba(30,30,30,0.8);color:#fff;font-size:20px;cursor:pointer;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'VT323',monospace;user-select:none";
  const labelStyle = "color:#ccc;font-size:12px;font-family:'VT323',monospace;text-align:center;min-width:44px";
  const makeTitle = (text) => { const t = document.createElement("div"); t.style.cssText = titleStyle; t.textContent = text; return t; };
  const makeBtn = (text, title, onClick) => {
    const b = document.createElement("button"); b.textContent = text; b.style.cssText = btnStyle; b.title = title;
    b.onclick = (e) => { e.stopPropagation(); onClick(); };
    return b;
  };
  const zoomGroup = document.createElement("div"); zoomGroup.style.cssText = groupStyle;
  const zoomLabel = document.createElement("div"); zoomLabel.id = "zoom-label"; zoomLabel.style.cssText = labelStyle; zoomLabel.textContent = "1.0x";
  zoomGroup.appendChild(makeTitle("Zoom"));
  zoomGroup.appendChild(makeBtn("+", "Zoom In (scroll up / +)", () => { if (cutscene && cutscene.active) return; userZoom = Math.min(USER_ZOOM_MAX, userZoom + USER_ZOOM_STEP); }));
  zoomGroup.appendChild(zoomLabel);
  zoomGroup.appendChild(makeBtn("-", "Zoom Out (scroll down / -)", () => { if (cutscene && cutscene.active) return; userZoom = Math.max(USER_ZOOM_MIN, userZoom - USER_ZOOM_STEP); }));
  const volumeGroup = document.createElement("div"); volumeGroup.style.cssText = groupStyle;
  const volumeLabel = document.createElement("div"); volumeLabel.id = "volume-label"; volumeLabel.style.cssText = labelStyle; volumeLabel.textContent = "80%";
  volumeGroup.appendChild(makeTitle("Vol"));
  volumeGroup.appendChild(makeBtn("+", "Increase Volume", () => changeVolume(VOLUME_STEP)));
  volumeGroup.appendChild(volumeLabel);
  volumeGroup.appendChild(makeBtn("-", "Decrease Volume", () => changeVolume(-VOLUME_STEP)));
  container.appendChild(zoomGroup); container.appendChild(volumeGroup);
  document.body.appendChild(container);
  setInterval(() => {
    const lbl = document.getElementById("zoom-label");
    if (lbl) lbl.textContent = userZoom.toFixed(1) + "x";
    updateVolumeUI();
    const ctrl = document.getElementById("zoom-controls");
    if (ctrl) ctrl.style.display = (isGameActive && !isDeveloperMode) ? "flex" : "none";
  }, 200);
})();

/* ---------------------------------------------------------------------
 * Boot
 * ------------------------------------------------------------------- */
function startGame() {
  ensurePlayDataDefaults();
  initAudio();
  isGameActive = true;
  const startScreen = document.getElementById("start-screen");
  if (startScreen) startScreen.style.display = "none";
  menuBtn.style.display = "";
  if (!playData.introSeen) {
    dialogue = JSON.parse(JSON.stringify(introDialogue));
    stage = 0;
    updateDialogue();
  }
  updateSoundtrack();
  if (animationFrameId === null) loop();
}

document.getElementById("start-screen")?.addEventListener("pointerdown", () => { initAudio(); updateSoundtrack(); }, { once: true });

const startMenu = document.querySelector(".start-menu");
const hasSaveData = Helios.Save.hasPlayState(localStorage);
if (hasSaveData && startMenu) {
  const btnContinue = document.createElement("button");
  btnContinue.id = "btn-continue";
  btnContinue.className = "btn";
  btnContinue.textContent = "Continue Autosave";
  btnContinue.onclick = () => { isDeveloperMode = false; loadPlayState(); if (playData.player.room) loadLevel(playData.player.room); startGame(); };
  startMenu.insertBefore(btnContinue, startMenu.firstChild);
}
updateStartSaveButtons();

document.getElementById("btn-load-slots")?.addEventListener("click", () => {
  renderSaveSlots();
  Helios.Overlay.setHidden(document, "pause-overlay", false);
});

document.getElementById("btn-pause-resume")?.addEventListener("click", closePauseOverlay);
document.getElementById("btn-save-current")?.addEventListener("click", saveSelectedSlot);
document.getElementById("btn-load-current")?.addEventListener("click", loadSelectedSlot);
document.getElementById("btn-pause-menu")?.addEventListener("click", () => {
  closePauseOverlay();
  location.reload();
});

if (new URLSearchParams(location.search).get("dev") === "1") {
  const devButton = document.getElementById("btn-dev");
  if (devButton) devButton.style.display = "";
}

(function setupDevSecret() {
  const secret = ["d", "e", "v", "e"];
  let buffer = [];
  let resetTimer = null;
  document.addEventListener("keydown", (e) => {
    if (!e.ctrlKey) return;
    const startScreen = document.getElementById("start-screen");
    if (!startScreen || startScreen.style.display === "none") return;
    e.preventDefault();
    buffer.push(e.key.toLowerCase());
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { buffer = []; }, 2000);
    if (buffer.length >= secret.length) {
      const last4 = buffer.slice(-4);
      if (last4.join("") === secret.join("")) {
        document.getElementById("btn-dev").style.display = "";
        buffer = [];
      }
    }
  });
})();

document.getElementById("btn-play")?.addEventListener("click", () => {
  isDeveloperMode = false;
  deathSequence = null;
  officeTimer.active = false;
  checkpointBeforeLecture = null;
  checkpointBeforeOfficeRush = null;
  particles = [];
  cutscene = null;
  const preservedVolume = getVolumeLevel();
  playData = Helios.Play.create({ startingRoom: Object.keys(levels)[0] || "classroom", volume: preservedVolume });
  ensurePlayDataDefaults();
  savePlayState();
  loadLevel(playData.player.room);
  globalDarkness = 0;
  startGame();
});

document.getElementById("btn-dev")?.addEventListener("click", () => {
  isDeveloperMode = true;
  document.getElementById("dev-sidebar").classList.remove("hidden");
  updateDevRoomSelect();
  populateDevCheckpoints();
  startGame();
});

document.getElementById("dev-load-checkpoint")?.addEventListener("click", () => {
  populateDevCheckpoints();
  loadDevCheckpoint(document.getElementById("dev-checkpoint-select")?.value);
});

populateDevCheckpoints();
[
  ["debug-hitboxes", "hitboxes"],
  ["debug-interactions", "interactions"],
  ["debug-spawns", "spawns"],
  ["debug-state", "state"]
].forEach(([id, key]) => {
  const input = document.getElementById(id);
  if (!input) return;
  devDebug[key] = Boolean(input.checked);
  input.addEventListener("change", () => {
    devDebug[key] = Boolean(input.checked);
    updateDevStateSummary();
  });
});

document.getElementById("btn-reset")?.addEventListener("click", () => {
  if (confirm("Reset ALL data (Design + Play)?")) {
    Helios.Save.clear(localStorage);
    location.reload();
  }
});

document.getElementById("dev-save")?.addEventListener("click", async () => {
  const json = Helios.Save.serialize({ levels, dialogue: introDialogue });
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "game-data.json",
        types: [{ description: "JSON File", accept: { "application/json": [".json"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      alert("File saved successfully!");
      return;
    } catch (err) {
      if (err.name === "AbortError") return;
      alert("Error saving file via API. Falling back to download.");
    }
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "game-data.json"; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("dev-load")?.addEventListener("click", () => document.getElementById("dev-load-input").click());
document.getElementById("dev-load-input")?.addEventListener("change", (e) => {
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
        saveDesignData();
      } else { alert("Invalid game data file."); }
    } catch (err) { alert("Error parsing JSON"); }
  };
  reader.readAsText(file);
});

const resetBtn = document.createElement("button");
resetBtn.className = "dev-btn-danger";
resetBtn.textContent = "Reset Design Data";
resetBtn.onclick = () => { if (confirm("Clear local design changes and revert to file data? Page will reload.")) { localStorage.removeItem(Helios.Save.DESIGN_KEY); location.reload(); } };
document.querySelector("#dev-sidebar .dev-section")?.appendChild(resetBtn);

/* Kick off the first level as soon as the script loads. */
loadExternalData();
positionInventoryHUD();
