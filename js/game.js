/* =====================================================================
 * HELIOS - Game runtime
 *
 * Wires systems together, handles input, renders scenes, runs the loop,
 * and bootstraps the game on DOMContentLoaded.
 * ===================================================================== */
"use strict";

// `Helios` is declared in js/helios.js and shared across all game scripts.
if (!window.Helios) throw new Error("Helios namespace missing - did js/helios.js load first?");

/* ---------------------------------------------------------------------
 * DOM references
 * ------------------------------------------------------------------- */
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const dialogueBox = document.getElementById("dialogue");
const dialogueLabel = document.getElementById("dialogue-label");
const dialogueLine = document.getElementById("dialogue-line");
const dialoguePrompt = document.getElementById("dialogue-prompt");

/* ---------------------------------------------------------------------
 * Game state
 * ------------------------------------------------------------------- */
const VOLUME_STEP = 0.1;
const MASTER_VOLUME_BOOST = 1.45;
const USER_ZOOM_MIN = 0.5;
const USER_ZOOM_MAX = 3.0;
const USER_ZOOM_STEP = 0.15;

let introDialogue = JSON.parse(JSON.stringify(Helios.Story.introDialogue));
let dialogue = [];
let levels = JSON.parse(JSON.stringify(Helios.Rooms));
let isDeveloperMode = false;
let isGameActive = false;

let playData = Helios.Play.create({ startingRoom: "classroom" });
let stage = 0;
let isHintActive = false;
let isInventoryOpen = false;
const keys = new Set();
const camera = { x: 0, y: 0, zoom: 1 };
let userZoom = 1;
let currentLevelName = "classroom";
let room = levels[currentLevelName];
let animationFrameId = null;
let isDragging = false;
let isDraggingSpawn = false;
let isDraggingInteraction = false;
let resizeHandle = null;
const dragOffset = { x: 0, y: 0 };
let cutscene = null;
let globalDarkness = 0;
let particles = [];
let screenShake = 0;
let checkpointBeforeLecture = null;
let checkpointBeforeOfficeRush = null;
const officeTimer = {
  active: false, framesLeft: 0, durationFrames: 30 * 60, flashed: false, hidden: true
};
let deathSequence = null;
let activePadlockId = null;
let clipboard = null;
let selectedObject = null;
let selectedSaveSlot = 1;
const devDebug = { hitboxes: false, interactions: true, spawns: true, state: true };
let noteOverlayState = { mode: "letter", documentId: null, pendingDoorReveal: false };
let tempDialogueTimeout = null;
let ruinBaseFurniture = null;
let ruinBaseDoors = null;

const player = {
  x: 0, y: 0, size: 24, speed: 3, facing: "down", walkFrame: 0, isSitting: false
};

Helios.Play.normalize(playData);

function ensurePlayDataDefaults() { playData = Helios.Play.normalize(playData); }

function getVolumeLevel() { return Helios.Play.clamp(playData.settings.volume); }
function getMasterVolume(level = getVolumeLevel()) { return level * MASTER_VOLUME_BOOST; }

/* ---------------------------------------------------------------------
 * Audio
 * ------------------------------------------------------------------- */
let audioCtx = null;
let currentOscillators = [];
let currentSoundtrackMode = null;
let dialogueVoiceTimers = [];
let musicMasterGain = null;
let masterOutputGain = null;
let melodyInterval = null;

function stopDialogueVoice() {
  dialogueVoiceTimers.forEach((t) => clearTimeout(t));
  dialogueVoiceTimers = [];
}

function getDialogueVoiceProfile(speaker) {
  if (!speaker) return null;
  const normalized = String(speaker).trim().toUpperCase();
  if (!normalized || normalized === "SYSTEM") return null;
  if (normalized === "LUKE") return { frequency: 180, type: "sine", volume: 0.06, speed: 75 };
  if (normalized === "TEACHER") return { frequency: 130, type: "triangle", volume: 0.05, speed: 85 };
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) hash = (hash * 31 + normalized.charCodeAt(i)) % 997;
  const types = ["sine", "triangle"];
  return {
    frequency: 160 + (hash % 140),
    type: types[hash % types.length],
    volume: 0.04 + ((hash % 3) * 0.008),
    speed: 70 + (hash % 20)
  };
}

function playDialogueBlip(profile, variance = 0) {
  if (!audioCtx || !profile) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = profile.type;
  osc.frequency.setValueAtTime(profile.frequency + variance, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(profile.volume, t + 0.015);
  gain.gain.setValueAtTime(profile.volume * 0.8, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime((profile.frequency + variance) * 2, t);
  gain2.gain.setValueAtTime(0.0001, t);
  gain2.gain.linearRampToValueAtTime(profile.volume * 0.15, t + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  osc.connect(gain); osc2.connect(gain2);
  gain.connect(masterOutputGain || audioCtx.destination);
  gain2.connect(masterOutputGain || audioCtx.destination);
  osc.start(t); osc.stop(t + 0.12);
  osc2.start(t); osc2.stop(t + 0.1);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
}

function queueDialogueVoice(entry) {
  stopDialogueVoice();
  const profile = getDialogueVoiceProfile(entry && entry.speaker);
  if (!profile || !entry || !entry.text) return;
  const text = String(entry.text).trim();
  if (!text) return;
  const words = text.replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 0);
  const pulses = Math.max(3, Math.min(16, words.length + Math.ceil(text.length / 8)));
  const speed = profile.speed || 75;
  const pitchPattern = [0, 15, -10, 20, -5, 10, -15, 5];
  for (let i = 0; i < pulses; i++) {
    const variance = pitchPattern[i % pitchPattern.length] + (Math.random() - 0.5) * 8;
    const delay = i * speed + Math.random() * 15;
    dialogueVoiceTimers.push(setTimeout(() => playDialogueBlip(profile, variance), delay));
  }
}

function initAudio() {
  ensurePlayDataDefaults();
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (!masterOutputGain) {
    masterOutputGain = audioCtx.createGain();
    masterOutputGain.connect(audioCtx.destination);
  }
  if (!musicMasterGain) {
    musicMasterGain = audioCtx.createGain();
    musicMasterGain.gain.value = 1.0;
    musicMasterGain.connect(masterOutputGain);
  }
  applyMasterVolume();
}

function applyMasterVolume() {
  if (masterOutputGain) masterOutputGain.gain.value = getMasterVolume();
  updateVolumeUI();
}

function stopSoundtrack() {
  if (melodyInterval) { clearInterval(melodyInterval); melodyInterval = null; }
  currentOscillators.forEach((osc) => {
    try { osc.stop && osc.stop(); } catch (_) {}
    osc.disconnect && osc.disconnect();
  });
  currentOscillators = [];
}

function playMelodyNote(freq, duration, delay, vol = 0.03) {
  if (!audioCtx || !musicMasterGain) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.15);
  gain.gain.setValueAtTime(vol * 0.7, t + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain); gain.connect(musicMasterGain);
  osc.start(t); osc.stop(t + duration + 0.01);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}

function playSoundtrack(mode) {
  if (!audioCtx) return;
  if (currentSoundtrackMode === mode) return;
  const soundtrack = Helios.Soundtracks.get(mode);
  if (!soundtrack) return;
  stopSoundtrack();
  currentSoundtrackMode = mode;
  if (!musicMasterGain) {
    musicMasterGain = audioCtx.createGain();
    musicMasterGain.gain.value = 1.0;
    musicMasterGain.connect(masterOutputGain || audioCtx.destination);
  }
  const MODES = Helios.Soundtracks.MODES;
  if (mode === MODES.MENU) {
    soundtrack.padNotes.forEach((note, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.value = note.freq;
      gain.gain.value = note.vol;
      lfo.type = "sine";
      lfo.frequency.value = 0.035 + idx * 0.015;
      lfoGain.gain.value = note.vol * 0.35;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      osc.connect(gain); gain.connect(musicMasterGain);
      osc.start(); lfo.start();
      currentOscillators.push(osc, gain, lfo, lfoGain);
    });
    let motifIdx = 0;
    melodyInterval = setInterval(() => {
      if (!audioCtx || currentSoundtrackMode !== MODES.MENU) return;
      playMelodyNote(soundtrack.motif[motifIdx % soundtrack.motif.length], soundtrack.melodyDuration, 0, soundtrack.melodyVolume);
      motifIdx++;
    }, soundtrack.melodyIntervalMs);
  } else if (mode === MODES.NORMAL) {
    soundtrack.padNotes.forEach((note, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.value = note.freq;
      const lfo = audioCtx.createOscillator();
      lfo.type = "sine"; lfo.frequency.value = 0.06 + (idx * 0.02);
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = note.vol * 0.4;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      const detune = audioCtx.createOscillator();
      detune.type = "sine";
      detune.frequency.value = note.freq + (idx % 2 === 0 ? 0.5 : -0.5);
      const detuneGain = audioCtx.createGain();
      detuneGain.gain.value = note.vol * 0.3;
      gain.gain.value = note.vol;
      osc.connect(gain); detune.connect(detuneGain);
      gain.connect(musicMasterGain); detuneGain.connect(musicMasterGain);
      osc.start(); lfo.start(); detune.start();
      currentOscillators.push(osc, lfo, gain, lfoGain, detune, detuneGain);
    });
    let melodyIdx = 0;
    melodyInterval = setInterval(() => {
      if (!audioCtx || currentSoundtrackMode !== MODES.NORMAL) return;
      const note = soundtrack.melody[melodyIdx % soundtrack.melody.length];
      playMelodyNote(note, soundtrack.melodyDuration, 0, soundtrack.melodyVolume);
      melodyIdx++;
    }, soundtrack.melodyIntervalMs);
  } else if (mode === MODES.HORROR) {
    const sub = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    sub.type = "sine"; sub.frequency.value = soundtrack.sub.frequency;
    subGain.gain.value = soundtrack.sub.volume;
    const subLfo = audioCtx.createOscillator();
    subLfo.type = "sine"; subLfo.frequency.value = soundtrack.sub.lfoFrequency;
    const subLfoGain = audioCtx.createGain();
    subLfoGain.gain.value = soundtrack.sub.lfoGain;
    subLfo.connect(subLfoGain); subLfoGain.connect(subGain.gain);
    sub.connect(subGain); subGain.connect(musicMasterGain);
    sub.start(); subLfo.start();
    currentOscillators.push(sub, subGain, subLfo, subLfoGain);
    soundtrack.dissonantPairs.forEach((note, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = note.type; osc.frequency.value = note.freq;
      const lfo = audioCtx.createOscillator();
      lfo.type = "sine"; lfo.frequency.value = 0.3 + (idx * 0.15);
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = note.vol * 0.5;
      lfo.connect(lfoGain); lfoGain.connect(gain.gain);
      const pitchLfo = audioCtx.createOscillator();
      pitchLfo.type = "sine"; pitchLfo.frequency.value = 0.05 + (idx * 0.02);
      const pitchLfoGain = audioCtx.createGain();
      pitchLfoGain.gain.value = 2 + idx;
      pitchLfo.connect(pitchLfoGain); pitchLfoGain.connect(osc.frequency);
      gain.gain.value = note.vol;
      osc.connect(gain); gain.connect(musicMasterGain);
      osc.start(); lfo.start(); pitchLfo.start();
      currentOscillators.push(osc, gain, lfo, lfoGain, pitchLfo, pitchLfoGain);
    });
    const whistle = audioCtx.createOscillator();
    const whistleGain = audioCtx.createGain();
    whistle.type = "sine"; whistle.frequency.value = soundtrack.whistle.frequency;
    whistleGain.gain.value = 0.0;
    const whistleLfo = audioCtx.createOscillator();
    whistleLfo.type = "sine"; whistleLfo.frequency.value = soundtrack.whistle.lfoFrequency;
    const whistleLfoGain = audioCtx.createGain();
    whistleLfoGain.gain.value = soundtrack.whistle.lfoGain;
    whistleLfo.connect(whistleLfoGain); whistleLfoGain.connect(whistleGain.gain);
    const vibrato = audioCtx.createOscillator();
    vibrato.type = "sine"; vibrato.frequency.value = soundtrack.whistle.vibratoFrequency;
    const vibratoGain = audioCtx.createGain();
    vibratoGain.gain.value = soundtrack.whistle.vibratoGain;
    vibrato.connect(vibratoGain); vibratoGain.connect(whistle.frequency);
    whistle.connect(whistleGain); whistleGain.connect(musicMasterGain);
    whistle.start(); whistleLfo.start(); vibrato.start();
    currentOscillators.push(whistle, whistleGain, whistleLfo, whistleLfoGain, vibrato, vibratoGain);
  } else if (mode === MODES.DEATH) {
    const t = audioCtx.currentTime;
    const boom = audioCtx.createOscillator();
    const boomGain = audioCtx.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(soundtrack.boom.startFrequency, t);
    boom.frequency.exponentialRampToValueAtTime(soundtrack.boom.endFrequency, t + 1.5);
    boomGain.gain.setValueAtTime(soundtrack.boom.volume, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    boom.connect(boomGain); boomGain.connect(musicMasterGain);
    boom.start(t); boom.stop(t + soundtrack.boom.duration);
    currentOscillators.push(boom, boomGain);
    const screech = audioCtx.createOscillator();
    const screechGain = audioCtx.createGain();
    screech.type = "sawtooth";
    screech.frequency.setValueAtTime(soundtrack.screech.startFrequency, t);
    screech.frequency.exponentialRampToValueAtTime(soundtrack.screech.endFrequency, t + 2.0);
    screechGain.gain.setValueAtTime(soundtrack.screech.volume, t);
    screechGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    screech.connect(screechGain); screechGain.connect(musicMasterGain);
    screech.start(t); screech.stop(t + soundtrack.screech.duration);
    currentOscillators.push(screech, screechGain);
    soundtrack.heartbeats.forEach((heartbeat) => {
      const beat = audioCtx.createOscillator();
      const beatGain = audioCtx.createGain();
      beat.type = "sine";
      const beatTime = t + heartbeat.delay;
      beat.frequency.setValueAtTime(50, beatTime);
      beat.frequency.exponentialRampToValueAtTime(25, beatTime + 0.15);
      beatGain.gain.setValueAtTime(0.0001, beatTime);
      beatGain.gain.linearRampToValueAtTime(heartbeat.volume, beatTime + 0.02);
      beatGain.gain.exponentialRampToValueAtTime(0.0001, beatTime + 0.3);
      beat.connect(beatGain); beatGain.connect(musicMasterGain);
      beat.start(beatTime); beat.stop(beatTime + 0.35);
      beat.onended = () => { beat.disconnect(); beatGain.disconnect(); };
      currentOscillators.push(beat, beatGain);
    });
    soundtrack.chordSting.forEach((freq) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.018, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      osc.connect(gain); gain.connect(musicMasterGain);
      osc.start(t); osc.stop(t + 2.0);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      currentOscillators.push(osc, gain);
    });
  }
}

function getMusicModeForRoom(name) {
  const hooks = Helios.RoomHooks[name] || {};
  if (typeof hooks.getMusicMode === "function") return hooks.getMusicMode(playData);
  return playData?.worldState?.horrorActive ? "horror" : "normal";
}

function updateSoundtrack() {
  if (!isGameActive) { playSoundtrack("menu"); return; }
  if (deathSequence && deathSequence.active) { playSoundtrack("death"); return; }
  playSoundtrack(getMusicModeForRoom(currentLevelName));
}

/* ---------------------------------------------------------------------
 * Game state helpers
 * ------------------------------------------------------------------- */
function isItemInInventory(id) { return playData.inventory.some((item) => item && item.id === id); }
function findInventoryEmptySlot() { return playData.inventory.findIndex((slot) => slot === null); }
function removeInventoryItem(id) {
  const slot = playData.inventory.findIndex((item) => item && item.id === id);
  if (slot === -1) return false;
  playData.inventory[slot] = null;
  updateInventoryUI();
  return true;
}
function addMoney(amount) {
  ensurePlayDataDefaults();
  playData.money = Math.max(0, Math.floor(playData.money + amount));
}
function isItemHidden(item) {
  if (!item) return true;
  if (item.id === "secret_room_padlocked_hatch" && !playData.worldState.secretRoomHatchRevealed) return true;
  return false;
}
function isOverlayVisible(id) { return Helios.Overlay.isVisible(document, id); }
function isModalBlockingInput() { return Helios.Overlay.isBlocking({ documentRef: document, povActive: playData.povActive }); }
function getItemAnchor(item) { return Helios.Proximity.getAnchor(item); }
function isPlayerNearItem(item, threshold = 80) {
  if (!item || isItemHidden(item)) return false;
  const anchor = getItemAnchor(item);
  return Math.hypot(player.x - anchor.x, player.y - anchor.y) <= threshold;
}
function getRoomItem(itemId) { return room.furniture.find((item) => item.id === itemId); }

/* ---------------------------------------------------------------------
 * Ruined classroom state
 * ------------------------------------------------------------------- */
function cacheRuinedClassroomBase() {
  if (!ruinBaseFurniture) {
    ruinBaseFurniture = JSON.parse(JSON.stringify(levels.ruined_classroom.furniture || []));
    ruinBaseDoors = JSON.parse(JSON.stringify(levels.ruined_classroom.doors || []));
  }
}
cacheRuinedClassroomBase();

function ensureRuinedClassroomDocumentSet() {
  const result = Helios.RuinedClassroom.createDocumentSet({
    worldState: playData.worldState,
    documents: Helios.Story.ruinedClassroomDocuments,
    documentMap: Helios.Story.ruinedClassroomDocumentMap,
    coreDocumentIds: Helios.Story.ruinedClassroomCoreDocumentIds,
    layouts: Helios.Story.ruinedClassroomNoteLayouts
  });
  if (result.changed) savePlayState();
  return result.selectedIds;
}
function getRuinedClassroomReadCount() {
  return Helios.RuinedClassroom.countRead(playData.worldState, ensureRuinedClassroomDocumentSet());
}
function markRuinedDocumentRead(documentId) {
  const result = Helios.RuinedClassroom.markRead({
    worldState: playData.worldState,
    documentId,
    selectedIds: ensureRuinedClassroomDocumentSet(),
    requiredReads: Helios.Story.ruinedClassroomRequiredReads
  });
  if (result.firstRead || result.justOpenedDoor) savePlayState();
  return result;
}
function isRuinedDocumentRead(id) { return Helios.RuinedClassroom.isRead(playData.worldState, id); }

function ensureRuinedClassroomState(level) {
  level.doors = ruinBaseDoors.map((d) => JSON.parse(JSON.stringify(d)));
  level.furniture = ruinBaseFurniture.map((f) => JSON.parse(JSON.stringify(f)));
  const board = level.furniture.find((item) => item.type === "whiteboard");
  if (board) {
    if (playData.worldState.ruinedDoorOpened) {
      board.scribbleText = ["YOU TOOK", "LONG ENOUGH"];
      board.scribbleColor = "#6d0f0f";
    } else {
      board.scribbleText = ["KEEP", "READING"];
      board.scribbleColor = "#2b2b2b";
    }
  }
  const ruinedDoor = level.doors.find((door) => door.id === "door_ruined_to_secret");
  if (ruinedDoor) {
    ruinedDoor.sealedVisual = !playData.worldState.ruinedDoorOpened;
    ruinedDoor.priority = 9;
  }
  const selectedIds = ensureRuinedClassroomDocumentSet();
  const spawned = selectedIds
    .slice(0, Helios.Story.ruinedClassroomNoteLayouts.length)
    .map((id, index) => Helios.RuinedClassroom.buildDocumentFurniture(id, Helios.Story.ruinedClassroomNoteLayouts[index], index, Helios.Story.ruinedClassroomDocumentMap))
    .filter(Boolean);
  level.furniture.push(...spawned);
  Helios.Story.ruinedClassroomDecorativePapers.forEach((paper, index) => {
    level.furniture.push(Helios.RuinedClassroom.buildDecorativePaper(paper, index));
  });
}

function applyRoomState(name) {
  if (name === "principal_office") Helios.RoomState.applyPrincipalOffice(room, playData.worldState);
  if (name === "ruined_classroom") ensureRuinedClassroomState(room);
  if (!playData.worldState.horrorActive) return;
  if (name === "hallway") Helios.RoomState.applyHallwayHorror(room);
}

function normalizeGameData(data) {
  if (!data.levels) return;
  Object.entries(data.levels).forEach(([levelName, level]) => {
    if (level.doors) level.doors.forEach((door) => { if (door.priority === undefined) door.priority = 1; });
    if (!level.furniture) return;
    level.furniture.forEach((item) => {
      const isLeftCabinet = item.id === "left_cabinet" || (levelName === "classroom" && item.type === "cupboard" && item.x <= 50 && item.y <= 60);
      if (isLeftCabinet) {
        item.id = "left_cabinet";
        item.interaction = { enabled: true, type: "sequence", priority: 5, conversations: [[{ speaker: "LUKE", text: "..." }]], area: { x: -10, y: -10, width: 80, height: 110 } };
      }
      const isRightCabinet = item.id === "right_cabinet" || (levelName === "classroom" && item.type === "cupboard" && item.x >= 550 && item.y <= 60);
      if (isRightCabinet) {
        item.id = "right_cabinet";
        item.interaction = { enabled: true, type: "sequence", priority: 5, conversations: [[{ speaker: "LUKE", text: "This cabinet is locked shut... I can't open it." }]], area: { x: -10, y: -10, width: 80, height: 110 } };
      }
      if (!item.interaction) {
        if (item.type === "student" && item.text) {
          item.interaction = { enabled: true, type: "sequence",
            conversations: [[{ speaker: item.name || "STUDENT", text: item.text }]],
            area: { x: -10, y: item.height, width: item.width + 20, height: 40 } };
        } else if (item.type === "bed") {
          item.interaction = { enabled: true, type: "sequence", conversations: [[{ speaker: "LUKE", text: "it's not the right time to sleep" }]], area: { x: -5, y: -5, width: item.width + 10, height: item.height + 10 } };
        } else if (item.type === "cupboard") {
          item.interaction = { enabled: true, type: "sequence", conversations: [[{ speaker: "LUKE", text: "why?" }]], area: { x: -5, y: -5, width: item.width + 10, height: item.height + 10 } };
        }
      }
      if (item.interaction && item.interaction.priority === undefined) item.interaction.priority = 1;
      Helios.Collision.applyDefaultCollisionRect(item);
    });
  });
}
normalizeGameData({ levels });

/* ---------------------------------------------------------------------
 * Level loading
 * ------------------------------------------------------------------- */
function loadLevel(name, targetDoorId) {
  if (!levels[name]) return;
  currentLevelName = name;
  room = levels[name];
  if (!isDeveloperMode) {
    applyRoomState(name);
    playData.player.room = name;
  }
  let spawned = false;
  if (targetDoorId) {
    const targetDoor = (room.doors || []).find((d) => d.id === targetDoorId);
    if (targetDoor) {
      if (targetDoor.customSpawn) { player.x = targetDoor.customSpawn.x; player.y = targetDoor.customSpawn.y; }
      else {
        const spawn = Helios.Proximity.getDoorAnchor(targetDoor);
        player.x = spawn.x; player.y = spawn.y + 10;
        if (targetDoor.orientation === "bottom") player.y = targetDoor.y - 24;
        else if (targetDoor.orientation === "left") player.x = targetDoor.x + targetDoor.width + 12;
        else if (targetDoor.orientation === "right") player.x = targetDoor.x - 12;
      }
      spawned = true;
    }
  }
  if (!spawned) {
    if (room.spawn && typeof room.spawn.x === "number") {
      player.x = room.spawn.x; player.y = room.spawn.y;
    } else {
      player.x = room.width / 2; player.y = room.height / 2;
    }
  }
  if (!isFinite(player.x)) player.x = 100;
  if (!isFinite(player.y)) player.y = 100;
  if (!isDeveloperMode && isGameActive) {
    playData.player.x = player.x; playData.player.y = player.y; playData.player.facing = player.facing;
    savePlayState();
  }
  camera.x = 0; camera.y = 0;
  handleMovement();
  document.title = Helios.getRoomTitle(name);
  if (isDeveloperMode) updateDevRoomSelect();
  if (!isDeveloperMode) onLevelLoaded(name);
  updateSoundtrack();
  if (typeof updateHorrorChrome === "function") updateHorrorChrome();
}

function onLevelLoaded(name) {
  if (name === "lecture" && !playData.worldState.lecture_seen) {
    checkpointBeforeLecture = { room: "lecture", x: player.x, y: player.y, facing: player.facing };
  }
  if (playData.worldState.officeRushPending) {
    if (name === "principal_office") clearOfficeRushState();
    else if (!deathSequence || !deathSequence.active) {
      if (!checkpointBeforeOfficeRush) captureOfficeRushCheckpoint();
      startOfficeTimer();
    }
  } else if (name !== "principal_office") {
    officeTimer.active = false;
  }
  if (name === "endless_hallway" && !playData.worldState.endlessHallwaySeen) {
    playData.worldState.endlessHallwaySeen = true;
    savePlayState();
    if (isGameActive) setTimeout(() => showTemporaryDialogue("The hall stretches toward a door marked LIBRARY.", "LUKE"), 80);
  }
  if (name === "library_archive" && !playData.worldState.libraryArchiveSeen) {
    playData.worldState.libraryArchiveSeen = true;
    savePlayState();
    if (isGameActive) setTimeout(() => showTemporaryDialogue("This is where the letter wanted me to come.", "LUKE"), 80);
  }
}

function captureOfficeRushCheckpoint() {
  checkpointBeforeOfficeRush = {
    levels: JSON.parse(JSON.stringify(levels)),
    player: { room: currentLevelName, x: player.x, y: player.y, facing: player.facing },
    worldState: JSON.parse(JSON.stringify(playData.worldState || {}))
  };
}
function markOfficeRushActive() {
  playData.worldState.officeRushPending = true;
  captureOfficeRushCheckpoint();
  startOfficeTimer();
  savePlayState();
}
function startOfficeTimer() {
  officeTimer.active = true;
  officeTimer.framesLeft = officeTimer.durationFrames;
  officeTimer.flashed = false;
}
function clearOfficeRushState() {
  officeTimer.active = false;
  playData.worldState.officeRushPending = false;
  checkpointBeforeOfficeRush = null;
  savePlayState();
}
function updateOfficeTimer() {
  if (!officeTimer.active) return;
  officeTimer.framesLeft -= 1;
  if (officeTimer.framesLeft <= 0) { officeTimer.framesLeft = 0; triggerDeath("office_rush_timeout"); return; }
  officeTimer.flashed = officeTimer.framesLeft <= 10 * 60;
}

/* ---------------------------------------------------------------------
 * Death / horror sequences
 * ------------------------------------------------------------------- */
function triggerDeath(reason) {
  if (deathSequence && deathSequence.active) return;
  officeTimer.active = false;
  player.walkFrame = 0;
  if (reason === "office_rush_timeout") {
    deathSequence = { active: true, type: "head_burst", reason, frame: 0, cameraZoom: userZoom, burstProgress: 0, exploded: false, finished: false, awaitingContinue: false, continueAction: "lecture" };
  } else {
    deathSequence = { active: true, type: "devoured", reason, frame: 0, zombieX: player.x + 220, zombieY: player.y, consumeProgress: 0, finished: false, awaitingContinue: false, continueAction: "lecture" };
  }
  updateSoundtrack();
}
function updateDeathSequence() {
  if (!deathSequence || !deathSequence.active) return;
  if (deathSequence.awaitingContinue) return;
  deathSequence.frame += 1;
  if (deathSequence.type === "head_burst") {
    if (deathSequence.frame <= 45) {
      deathSequence.cameraZoom = Math.min(2.65, deathSequence.cameraZoom + 0.04);
      globalDarkness = Math.min(0.82, 0.35 + deathSequence.frame * 0.01);
    } else {
      if (!deathSequence.exploded) {
        deathSequence.exploded = true;
        screenShake = 26;
        const headX = player.x + (Math.random() - 0.5) * 6;
        const headY = player.y - 16;
        createExplosion(headX, headY, "#ff3d00");
        createExplosion(headX, headY, "#b71c1c");
        createExplosion(headX, headY, "#7f0000");
      }
      deathSequence.burstProgress = Math.min(1, deathSequence.burstProgress + 0.06);
      globalDarkness = Math.min(0.96, globalDarkness + 0.02);
      if (deathSequence.frame % 3 === 0) createExplosion(player.x + (Math.random() - 0.5) * 18, player.y - 18 + (Math.random() - 0.5) * 16, "#7f0000");
    }
    if (deathSequence.frame > 115 && !deathSequence.finished) {
      deathSequence.finished = true; deathSequence.awaitingContinue = true;
    }
    return;
  }
  const dx = player.x - deathSequence.zombieX;
  const dy = player.y - deathSequence.zombieY;
  const dist = Math.hypot(dx, dy) || 1;
  if (deathSequence.frame < 70) {
    const rushSpeed = 7;
    deathSequence.zombieX += (dx / dist) * rushSpeed;
    deathSequence.zombieY += (dy / dist) * rushSpeed;
    screenShake = Math.max(screenShake, 6);
  } else {
    deathSequence.consumeProgress = Math.min(1, deathSequence.consumeProgress + 0.03);
    globalDarkness = Math.min(0.9, globalDarkness + 0.02);
  }
  if (deathSequence.frame % 5 === 0) createExplosion(player.x + (Math.random() - 0.5) * 16, player.y - 14 + (Math.random() - 0.5) * 12, "#7f0000");
  if (deathSequence.frame > 170 && !deathSequence.finished) {
    deathSequence.finished = true; deathSequence.awaitingContinue = true;
  }
}
function continueDeathSequence() {
  if (!deathSequence || !deathSequence.active || !deathSequence.awaitingContinue) return;
  const action = deathSequence.continueAction || "lecture";
  if (action === "office_rush") { resetToOfficeRushCheckpoint(); return; }
  resetToLectureCheckpoint();
}
function resetToOfficeRushCheckpoint() {
  cutscene = null; deathSequence = null; officeTimer.active = false;
  particles = []; globalDarkness = 0.7; camera.zoom = 1;
  if (checkpointBeforeOfficeRush && checkpointBeforeOfficeRush.levels) {
    levels = JSON.parse(JSON.stringify(checkpointBeforeOfficeRush.levels));
    normalizeGameData({ levels });
  }
  const checkpoint = checkpointBeforeOfficeRush || {
    player: { room: "lecture", x: 460, y: 520, facing: "up" },
    worldState: { horrorActive: true, lecture_seen: true, officeRushPending: true }
  };
  playData.worldState = JSON.parse(JSON.stringify(checkpoint.worldState || playData.worldState || {}));
  playData.worldState.horrorActive = true;
  playData.worldState.lecture_seen = true;
  playData.worldState.officeRushPending = true;
  const restorePlayer = checkpoint.player || { room: "lecture", x: 460, y: 520, facing: "up" };
  playData.player.room = restorePlayer.room;
  loadLevel(restorePlayer.room);
  player.x = restorePlayer.x; player.y = restorePlayer.y; player.facing = restorePlayer.facing || "up";
  player.isSitting = false;
  playData.player.x = player.x; playData.player.y = player.y; playData.player.facing = player.facing;
  updateSoundtrack();
  savePlayState();
}
function resetToLectureCheckpoint() {
  levels = JSON.parse(JSON.stringify(Helios.Rooms));
  normalizeGameData({ levels });
  playData.worldState.horrorActive = false;
  playData.worldState.lecture_seen = false;
  playData.worldState.officeRushPending = false;
  globalDarkness = 0; particles = []; cutscene = null; deathSequence = null;
  officeTimer.active = false; checkpointBeforeOfficeRush = null; camera.zoom = 1;
  updateSoundtrack();
  const checkpoint = checkpointBeforeLecture || { room: "lecture", x: 460, y: 520, facing: "up" };
  playData.player.room = checkpoint.room;
  loadLevel(checkpoint.room);
  player.x = checkpoint.x; player.y = checkpoint.y; player.facing = checkpoint.facing || "up";
  player.isSitting = false;
  playData.player.x = player.x; playData.player.y = player.y; playData.player.facing = player.facing;
  savePlayState();
  showTemporaryDialogue("You died. Restarting from before the lecture!", "SYSTEM");
}
