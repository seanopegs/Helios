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
    inventory: [null, null, { id: 'cabinet_key', name: 'Cabinet Key', icon: '🔑' }, null],
    activeSlot: 0,
    povActive: false,
    introSeen: false
};

let stage = 0;
let isHintActive = false;
let isInventoryOpen = false;
const keys = new Set();
const camera = { x: 0, y: 0, zoom: 1 };
let userZoom = 1;
const USER_ZOOM_MIN = 0.5;
const USER_ZOOM_MAX = 3.0;
const USER_ZOOM_STEP = 0.15;

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
let checkpointBeforeLecture = null;
let officeTimer = {
    active: false,
    framesLeft: 0,
    durationFrames: 30 * 60,
    flashed: false
};
let deathSequence = null;

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

// Soundtrack Management
let audioCtx = null;
let currentOscillators = [];
let currentSoundtrackMode = null;
let dialogueVoiceTimers = [];
let musicMasterGain = null;
let melodyInterval = null;

function stopDialogueVoice() {
    dialogueVoiceTimers.forEach(timer => clearTimeout(timer));
    dialogueVoiceTimers = [];
}

function getDialogueVoiceProfile(speaker) {
    if (!speaker) return null;
    const normalized = String(speaker).trim().toUpperCase();
    if (!normalized || normalized === 'SYSTEM') return null;

    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        hash = (hash * 31 + normalized.charCodeAt(i)) % 997;
    }

    // LUKE gets a warm mid-range voice
    if (normalized === 'LUKE') {
        return { frequency: 180, type: 'sine', volume: 0.06, speed: 75 };
    }

    // TEACHER gets a deeper, authoritative voice
    if (normalized === 'TEACHER') {
        return { frequency: 130, type: 'triangle', volume: 0.05, speed: 85 };
    }

    // Other characters: unique voice from hash
    const types = ['sine', 'triangle'];
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

    // Main tone
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = profile.type;
    osc.frequency.setValueAtTime(profile.frequency + variance, t);

    // Softer envelope: gentle attack, longer sustain, smooth release
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(profile.volume, t + 0.015);
    gain.gain.setValueAtTime(profile.volume * 0.8, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

    // Optional harmonic overtone for richness
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime((profile.frequency + variance) * 2, t);
    gain2.gain.setValueAtTime(0.0001, t);
    gain2.gain.linearRampToValueAtTime(profile.volume * 0.15, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(audioCtx.destination);
    gain2.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
    osc2.start(t);
    osc2.stop(t + 0.1);

    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
}

function queueDialogueVoice(entry) {
    stopDialogueVoice();
    const profile = getDialogueVoiceProfile(entry && entry.speaker);
    if (!profile || !entry || !entry.text) return;

    const text = String(entry.text).trim();
    if (!text) return;

    // Count syllable-like chunks for natural pacing
    const words = text.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    const pulses = Math.max(3, Math.min(16, words.length + Math.ceil(text.length / 8)));
    const speed = profile.speed || 75;

    for (let i = 0; i < pulses; i++) {
        // Melodic pitch variation per "syllable"
        const pitchPattern = [0, 15, -10, 20, -5, 10, -15, 5];
        const variance = pitchPattern[i % pitchPattern.length];
        // Slight random jitter for naturalness
        const jitter = (Math.random() - 0.5) * 8;
        const delay = i * speed + (Math.random() * 15);
        dialogueVoiceTimers.push(setTimeout(() => playDialogueBlip(profile, variance + jitter), delay));
    }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!musicMasterGain) {
        musicMasterGain = audioCtx.createGain();
        musicMasterGain.gain.value = 1.0;
        musicMasterGain.connect(audioCtx.destination);
    }
}

function stopSoundtrack() {
    if (melodyInterval) {
        clearInterval(melodyInterval);
        melodyInterval = null;
    }
    currentOscillators.forEach(osc => {
        if (osc.stop) {
            try { osc.stop(); } catch(e) {}
        }
        if (osc.disconnect) {
            osc.disconnect();
        }
    });
    currentOscillators = [];
}

function playMelodyNote(freq, duration, delay, vol = 0.03) {
    if (!audioCtx || !musicMasterGain) return;
    const t = audioCtx.currentTime + delay;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.15);
    gain.gain.setValueAtTime(vol * 0.7, t + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(musicMasterGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);

    osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
    };
}

function playSoundtrack(mode) {
    if (!audioCtx) return;
    if (currentSoundtrackMode === mode) return;
    stopSoundtrack();
    currentSoundtrackMode = mode;

    if (!musicMasterGain) {
        musicMasterGain = audioCtx.createGain();
        musicMasterGain.gain.value = 1.0;
        musicMasterGain.connect(audioCtx.destination);
    }

    if (mode === 'normal') {
        // ── Warm ambient pad with slow evolving harmonics ──
        // Root chord: Am (A2, C3, E3) with octave doubling
        const padNotes = [
            { freq: 110,    vol: 0.025 },   // A2
            { freq: 130.81, vol: 0.020 },   // C3
            { freq: 164.81, vol: 0.018 },   // E3
            { freq: 220,    vol: 0.012 },   // A3 (octave)
            { freq: 329.63, vol: 0.008 },   // E4 (shimmer)
        ];

        padNotes.forEach((note, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = note.freq;

            // Slow breathing modulation
            const lfo = audioCtx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.06 + (idx * 0.02);
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = note.vol * 0.4;

            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            // Slight detuning for warmth
            const detune = audioCtx.createOscillator();
            detune.type = 'sine';
            detune.frequency.value = note.freq + (idx % 2 === 0 ? 0.5 : -0.5);
            const detuneGain = audioCtx.createGain();
            detuneGain.gain.value = note.vol * 0.3;

            gain.gain.value = note.vol;
            osc.connect(gain);
            detune.connect(detuneGain);
            gain.connect(musicMasterGain);
            detuneGain.connect(musicMasterGain);

            osc.start();
            lfo.start();
            detune.start();

            currentOscillators.push(osc, lfo, gain, lfoGain, detune, detuneGain);
        });

        // Gentle melody loop — pentatonic Am scale
        const melodyNotes = [
            329.63, 392.00, 440.00, 523.25, 587.33, // E4 G4 A4 C5 D5
            523.25, 440.00, 392.00, 329.63, 293.66,  // C5 A4 G4 E4 D4
        ];
        let melodyIdx = 0;
        melodyInterval = setInterval(() => {
            if (!audioCtx || currentSoundtrackMode !== 'normal') return;
            const note = melodyNotes[melodyIdx % melodyNotes.length];
            playMelodyNote(note, 2.2, 0, 0.016);
            melodyIdx++;
        }, 3000);

    } else if (mode === 'horror') {
        // ── Deep, evolving dread ──
        // Low sub-bass rumble
        const sub = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        sub.type = 'sine';
        sub.frequency.value = 36; // Very low C1-ish
        subGain.gain.value = 0.04;

        // Sub modulation (slow throb)
        const subLfo = audioCtx.createOscillator();
        subLfo.type = 'sine';
        subLfo.frequency.value = 0.15;
        const subLfoGain = audioCtx.createGain();
        subLfoGain.gain.value = 0.025;
        subLfo.connect(subLfoGain);
        subLfoGain.connect(subGain.gain);

        sub.connect(subGain);
        subGain.connect(musicMasterGain);
        sub.start();
        subLfo.start();
        currentOscillators.push(sub, subGain, subLfo, subLfoGain);

        // Dissonant tritone pad (A1 + Eb2)
        const dissonantPairs = [
            { freq: 55, vol: 0.018, type: 'sawtooth' },   // A1
            { freq: 77.78, vol: 0.014, type: 'sawtooth' }, // Eb2 (tritone)
            { freq: 110, vol: 0.008, type: 'triangle' },   // A2
            { freq: 155.56, vol: 0.006, type: 'triangle' }, // Eb3
        ];

        dissonantPairs.forEach((note, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = note.type;
            osc.frequency.value = note.freq;

            // Nervous tremolo
            const lfo = audioCtx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.3 + (idx * 0.15);
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = note.vol * 0.5;

            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            // Slow pitch drift for unease
            const pitchLfo = audioCtx.createOscillator();
            pitchLfo.type = 'sine';
            pitchLfo.frequency.value = 0.05 + (idx * 0.02);
            const pitchLfoGain = audioCtx.createGain();
            pitchLfoGain.gain.value = 2 + idx;
            pitchLfo.connect(pitchLfoGain);
            pitchLfoGain.connect(osc.frequency);

            gain.gain.value = note.vol;
            osc.connect(gain);
            gain.connect(musicMasterGain);

            osc.start();
            lfo.start();
            pitchLfo.start();

            currentOscillators.push(osc, gain, lfo, lfoGain, pitchLfo, pitchLfoGain);
        });

        // High eerie whistle (intermittent)
        const whistle = audioCtx.createOscillator();
        const whistleGain = audioCtx.createGain();
        whistle.type = 'sine';
        whistle.frequency.value = 1200;
        whistleGain.gain.value = 0.0;

        // Slow fade in/out cycle
        const whistleLfo = audioCtx.createOscillator();
        whistleLfo.type = 'sine';
        whistleLfo.frequency.value = 0.08;
        const whistleLfoGain = audioCtx.createGain();
        whistleLfoGain.gain.value = 0.006;
        whistleLfo.connect(whistleLfoGain);
        whistleLfoGain.connect(whistleGain.gain);

        // Vibrato on the whistle
        const vibrato = audioCtx.createOscillator();
        vibrato.type = 'sine';
        vibrato.frequency.value = 5;
        const vibratoGain = audioCtx.createGain();
        vibratoGain.gain.value = 15;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(whistle.frequency);

        whistle.connect(whistleGain);
        whistleGain.connect(musicMasterGain);
        whistle.start();
        whistleLfo.start();
        vibrato.start();

        currentOscillators.push(whistle, whistleGain, whistleLfo, whistleLfoGain, vibrato, vibratoGain);

    } else if (mode === 'death') {
        // ── Dramatic death stinger ──
        const t = audioCtx.currentTime;

        // Deep impact boom
        const boom = audioCtx.createOscillator();
        const boomGain = audioCtx.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(80, t);
        boom.frequency.exponentialRampToValueAtTime(20, t + 1.5);
        boomGain.gain.setValueAtTime(0.12, t);
        boomGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        boom.connect(boomGain);
        boomGain.connect(musicMasterGain);
        boom.start(t);
        boom.stop(t + 2.5);
        currentOscillators.push(boom, boomGain);

        // Descending screech
        const screech = audioCtx.createOscillator();
        const screechGain = audioCtx.createGain();
        screech.type = 'sawtooth';
        screech.frequency.setValueAtTime(600, t);
        screech.frequency.exponentialRampToValueAtTime(30, t + 2.0);
        screechGain.gain.setValueAtTime(0.04, t);
        screechGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        screech.connect(screechGain);
        screechGain.connect(musicMasterGain);
        screech.start(t);
        screech.stop(t + 2.5);
        currentOscillators.push(screech, screechGain);

        // Heartbeat-like thuds
        for (let i = 0; i < 4; i++) {
            const beat = audioCtx.createOscillator();
            const beatGain = audioCtx.createGain();
            beat.type = 'sine';
            const beatTime = t + i * 0.4;
            beat.frequency.setValueAtTime(50, beatTime);
            beat.frequency.exponentialRampToValueAtTime(25, beatTime + 0.15);
            beatGain.gain.setValueAtTime(0.0001, beatTime);
            beatGain.gain.linearRampToValueAtTime(0.08 - (i * 0.015), beatTime + 0.02);
            beatGain.gain.exponentialRampToValueAtTime(0.0001, beatTime + 0.3);
            beat.connect(beatGain);
            beatGain.connect(musicMasterGain);
            beat.start(beatTime);
            beat.stop(beatTime + 0.35);
            beat.onended = () => { beat.disconnect(); beatGain.disconnect(); };
            currentOscillators.push(beat, beatGain);
        }

        // Dissonant chord sting
        [300, 316, 450].forEach(freq => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.035, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            osc.connect(gain);
            gain.connect(musicMasterGain);
            osc.start(t);
            osc.stop(t + 2.0);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            currentOscillators.push(osc, gain);
        });
    }
}

function updateSoundtrack() {
    if (deathSequence && deathSequence.active) {
        playSoundtrack('death');
        return;
    }

    if (playData.worldState.horrorActive) {
        playSoundtrack('horror');
    } else {
        playSoundtrack('normal');
    }
}

let tempDialogueTimeout = null;

const principalOfficeBaseFurniture = [
    { type: 'rug', x: 210, y: 220, width: 180, height: 160, color: '#4a148c', border: '#d4af37' }, // Deep purple, gold border
    { type: 'boss_desk', x: 200, y: 150, width: 200, height: 80, hasLamp: true, hasLaptop: true },
    { type: 'bookshelf', x: 32, y: 112, width: 90, height: 120 },
    { type: 'bookshelf', x: 478, y: 112, width: 90, height: 120 },
    { type: 'sofa', x: 90, y: 350, width: 140, height: 60, color: '#3e2723' }, // Leather sofa left
    { type: 'sofa', x: 370, y: 350, width: 140, height: 60, color: '#3e2723' }, // Leather sofa right
    { type: 'plant', x: 126, y: 70, width: 36, height: 75, potColor: '#eceff1' },
    { type: 'plant', x: 438, y: 70, width: 36, height: 75, potColor: '#eceff1' },
    { type: 'plant', x: 36, y: 460, width: 36, height: 80, potColor: '#eceff1' },
    { type: 'plant', x: 528, y: 460, width: 36, height: 80, potColor: '#eceff1' }
];

const principalOfficeDebris = [
    { type: 'debris', x: 85, y: 262, width: 52, height: 24 },
    { type: 'debris', x: 188, y: 246, width: 34, height: 20 },
    { type: 'debris', x: 450, y: 304, width: 56, height: 25 },
    { type: 'debris', x: 406, y: 460, width: 72, height: 18 },
    { type: 'debris', x: 220, y: 470, width: 60, height: 20 }
];

const principalOfficeHorrorFurniture = [
    { type: 'locker', id: 'office_entry_locker', x: 225, y: 110, width: 46, height: 90 },
    {
        type: 'vent',
        id: 'office_vent_escape',
        x: 42,
        y: 470,
        width: 82,
        height: 46,
        interaction: {
            enabled: true,
            type: 'sequence',
            priority: 7,
            conversations: [
                [
                    { speaker: 'LUKE', text: 'A vent! This is the only way out...' }
                ]
            ],
            area: { x: -14, y: -8, width: 112, height: 68 }
        }
    }
];

function applyHallwayHorrorState(level) {
    if (level.isHorrorified) return;
    level.isHorrorified = true;

    level.furniture.forEach(item => {
        if (item.type === 'locker' || item.type === 'window') {
            item.x += (Math.random() - 0.5) * 60;
            item.y += (Math.random() - 0.5) * 30;
        }
    });

    for (let i = 0; i < 15; i++) {
        level.furniture.push({
            type: 'student',
            x: 100 + Math.random() * 1200,
            y: 100 + Math.random() * 300,
            width: 24,
            height: 36,
            variant: Math.random() > 0.5 ? 'boy' : 'girl',
            shirt: '#' + Math.floor(Math.random() * 16777215).toString(16),
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10
        });
    }
}

function ensurePrincipalOfficeState(level) {
    level.furniture = principalOfficeBaseFurniture.map(item => JSON.parse(JSON.stringify(item)));

    if (playData.worldState.horrorActive) {
        level.furniture.push(
            ...principalOfficeHorrorFurniture.map(item => JSON.parse(JSON.stringify(item))),
            ...principalOfficeDebris.map(item => ({ ...item }))
        );
        level.isHorrorified = true;
        return;
    }

    level.isHorrorified = false;
}

function applyRoomState(name) {
    if (name === 'principal_office') {
        ensurePrincipalOfficeState(room);
    }

    if (!playData.worldState.horrorActive) return;

    if (name === 'hallway') {
        applyHallwayHorrorState(room);
    }
}

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

  if (!isDeveloperMode) {
      onLevelLoaded(name);
  }

  updateSoundtrack();
}

function onLevelLoaded(name) {
    if (name === 'lecture' && !playData.worldState.lecture_seen) {
        checkpointBeforeLecture = {
            room: 'lecture',
            x: player.x,
            y: player.y,
            facing: player.facing
        };
    }

    if (name === 'principal_office' && playData.worldState.horrorActive) {
        startOfficeTimer();
    } else if (name !== 'principal_office') {
        officeTimer.active = false;
    }
}

function startOfficeTimer() {
    officeTimer.active = true;
    officeTimer.framesLeft = officeTimer.durationFrames;
    officeTimer.flashed = false;
}

function triggerDeath(reason) {
    if (deathSequence && deathSequence.active) return;
    officeTimer.active = false;
    player.walkFrame = 0;

    deathSequence = {
        active: true,
        reason,
        frame: 0,
        zombieX: player.x + 220,
        zombieY: player.y,
        consumeProgress: 0,
        finished: false
    };
    updateSoundtrack();
}

function updateDeathSequence() {
    if (!deathSequence || !deathSequence.active) return;

    deathSequence.frame += 1;
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

    if (deathSequence.frame % 5 === 0) {
        createExplosion(player.x + (Math.random() - 0.5) * 16, player.y - 14 + (Math.random() - 0.5) * 12, "#7f0000");
    }

    if (deathSequence.frame > 170 && !deathSequence.finished) {
        deathSequence.finished = true;
        resetToLectureCheckpoint();
    }
}

function resetToLectureCheckpoint() {
    levels = JSON.parse(JSON.stringify(window.initialGameData.levels));
    normalizeGameData({ levels });

    playData.worldState.horrorActive = false;
    playData.worldState.lecture_seen = false;
    globalDarkness = 0;
    particles = [];
    cutscene = null;
    deathSequence = null;
    officeTimer.active = false;

    updateSoundtrack();

    const checkpoint = checkpointBeforeLecture || { room: 'lecture', x: 460, y: 520, facing: 'up' };
    playData.player.room = checkpoint.room;
    loadLevel(checkpoint.room);
    player.x = checkpoint.x;
    player.y = checkpoint.y;
    player.facing = checkpoint.facing || 'up';
    player.isSitting = false;

    playData.player.x = player.x;
    playData.player.y = player.y;
    playData.player.facing = player.facing;
    savePlayState();

    showTemporaryDialogue("You died. Restarting from before the lecture!", "SYSTEM");
}

function normalizeGameData(data) {
    if (!data.levels) return;
    Object.entries(data.levels).forEach(([levelName, level]) => {
        if (level.doors) {
            level.doors.forEach(door => {
                if (door.priority === undefined) door.priority = 1;
            });
        }
        if (!level.furniture) return;
        level.furniture.forEach(item => {
            // --- Always ensure left_cabinet is correctly identified and given an interaction ---
            // Match by id OR by being the left cupboard in classroom (handles stale localStorage)
            const isLeftCabinet = item.id === 'left_cabinet' ||
                (levelName === 'classroom' && item.type === 'cupboard' && item.x <= 50 && item.y <= 60);
            if (isLeftCabinet) {
                item.id = 'left_cabinet'; // Ensure id is set
                item.interaction = { enabled: true, type: 'sequence', priority: 5, conversations: [[{ speaker: 'LUKE', text: '...' }]], area: { x: -10, y: -10, width: 80, height: 110 } };
            }
            // Right cabinet: show "locked"
            const isRightCabinet = item.id === 'right_cabinet' ||
                (levelName === 'classroom' && item.type === 'cupboard' && item.x >= 550 && item.y <= 60);
            if (isRightCabinet) {
                item.id = 'right_cabinet';
                item.interaction = { enabled: true, type: 'sequence', priority: 5, conversations: [[{ speaker: 'LUKE', text: 'This cabinet is locked shut... I can\'t open it.' }]], area: { x: -10, y: -10, width: 80, height: 110 } };
            }
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
    return { x: door.x + door.width / 2, y: door.y + door.height / 2 };
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
    queueDialogueVoice(entry);
    dialogueBox.classList.add("dialogue--active");
    dialogueBox.classList.remove("dialogue--hidden");
  } else {
    stopDialogueVoice();
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
  queueDialogueVoice({ text, speaker });
  dialogueBox.classList.add("dialogue--active");
  dialogueBox.classList.remove("dialogue--hidden");

  tempDialogueTimeout = setTimeout(() => {
    tempDialogueTimeout = null;
    stopDialogueVoice();
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
    if (!hasCustom && (item.type === 'window' || item.type === 'rug' || item.type === 'shelf' || item.type === 'zone' || item.type === 'wall_switch')) continue;

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
                       (cutscene && cutscene.active) ||
                       (deathSequence && deathSequence.active);

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

  // During cutscenes, use cutscene zoom; otherwise use player zoom
  const effectiveZoom = (cutscene && cutscene.active) ? camera.zoom : userZoom;
  const viewW = canvas.width / effectiveZoom;
  const viewH = canvas.height / effectiveZoom;

  const camTargetX = targetX - viewW / 2;
  const camTargetY = targetY - viewH / 2;

  if (cutscene && cutscene.active) {
       camera.x = camTargetX;
       camera.y = camTargetY;
  } else {
       const maxCamX = Math.max(0, room.width - viewW);
       const maxCamY = Math.max(0, room.height - viewH);
       camera.x = Math.max(0, Math.min(camTargetX, maxCamX));
       camera.y = Math.max(0, Math.min(camTargetY, maxCamY));
  }

  if (!isFinite(camera.x)) camera.x = 0;
  if (!isFinite(camera.y)) camera.y = 0;
}

function drawRoom() {
  if (currentLevelName === 'vent_tunnel') {
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
    for (let x = 0; x < room.width; x += 44) {
      ctx.fillRect(x, shaftTop + 10, 2, shaftHeight - 20);
    }
    for (let y = shaftTop + 14; y < shaftBottom - 10; y += 14) {
      ctx.fillRect(0, y, room.width, 2);
    }

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(0, shaftTop + 8, room.width, 8);
    ctx.fillRect(0, shaftBottom - 16, room.width, 8);
    return;
  }

  const themes = {
    hall: { wall: "#3f5765", wallTop: "#576d79", floor: "#cfd8dc", floorAlt: "#bcc8cc", baseboard: "#1c262f", detail: "#b0bec5", pattern: 64, vertical: true, floorMode: 'tile' },
    dorm: { wall: "#8d6e63", wallTop: "#a78577", floor: "#4a2e24", floorAlt: "#6b4330", baseboard: "#281915", detail: "rgba(0,0,0,0.18)", pattern: 32, vertical: true, floorMode: 'wood' },
    classroom: { wall: "#6f707f", wallTop: "#8f90a0", floor: "#5e3b2d", floorAlt: "#7a4b39", baseboard: "#2a1712", detail: "rgba(255,255,255,0.08)", pattern: 46, vertical: true, floorMode: 'wood' },
    office_clean: { wall: "#8c6f64", wallTop: "#ab8c7f", floor: "#5a372b", floorAlt: "#744839", baseboard: "#5c433c", detail: "rgba(255,255,255,0.08)", pattern: 42, vertical: true, floorMode: 'wood' },
    office: { wall: "#5d463f", wallTop: "#7c5d53", floor: "#35211a", floorAlt: "#4a2d24", baseboard: "#1a1412", detail: "rgba(255,255,255,0.05)", pattern: 26, vertical: true, floorMode: 'wood' }
  };
  const themeName = currentLevelName === 'principal_office' && !playData.worldState.horrorActive ? 'office_clean' : (room.theme || 'dorm');
  const palette = themes[themeName] || themes.dorm;

  const wallGradient = ctx.createLinearGradient(0, 0, 0, room.wallHeight);
  wallGradient.addColorStop(0, palette.wallTop || palette.wall);
  wallGradient.addColorStop(0.65, palette.wall);
  wallGradient.addColorStop(1, palette.wall);
  ctx.fillStyle = wallGradient;
  ctx.fillRect(0, 0, room.width, room.wallHeight);

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = room.padding; i < room.width - room.padding; i += 30) {
      ctx.fillRect(i, 0, 1, room.wallHeight - 10);
  }
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  for (let i = room.padding + 14; i < room.width - room.padding; i += 30) {
      ctx.fillRect(i, 0, 1, room.wallHeight - 4);
  }
  ctx.restore();

  const floorGradient = ctx.createLinearGradient(0, room.wallHeight, 0, room.height);
  floorGradient.addColorStop(0, palette.floorAlt || palette.floor);
  floorGradient.addColorStop(0.22, palette.floor);
  floorGradient.addColorStop(1, "#1a120f");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, room.wallHeight, room.width, room.height - room.wallHeight);

  ctx.save();
  if (palette.floorMode === 'wood') {
    const plankHeight = themeName === 'classroom' ? 28 : 24;
    for (let y = room.wallHeight; y < room.height; y += plankHeight) {
        const plankColor = ((Math.floor((y - room.wallHeight) / plankHeight) % 2) === 0) ? palette.floorAlt : palette.floor;
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
    for (let i = room.wallHeight; i < room.height; i += palette.pattern) {
      ctx.fillRect(0, i, room.width, 2);
    }
    if (palette.vertical) {
      for (let i = 0; i < room.width; i += palette.pattern) {
        ctx.fillRect(i, room.wallHeight, 2, room.height - room.wallHeight);
      }
    }
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

  const centerGlow = ctx.createRadialGradient(
      room.width / 2, room.wallHeight + 120, 40,
      room.width / 2, room.wallHeight + 120, room.width * 0.55
  );
  centerGlow.addColorStop(0, "rgba(255,220,180,0.16)");
  centerGlow.addColorStop(0.45, "rgba(255,190,120,0.08)");
  centerGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(room.padding, 0, room.width - room.padding * 2, room.height - room.padding);

  if (themeName === 'office' && playData.worldState.horrorActive) {
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
    if (!item || item.type === 'window' || item.type === 'wall_switch' || item.type === 'vent') return;

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
    ctx.globalCompositeOperation = 'screen';

    room.furniture.forEach(item => {
        if (!item) return;

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

            const beam = ctx.createLinearGradient(lightX, lightY, lightX + 18, lightY + 165);
            beam.addColorStop(0, "rgba(255,230,170,0.11)");
            beam.addColorStop(1, "rgba(255,230,170,0)");
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(lightX - 4, lightY + 4);
            ctx.lineTo(lightX + 8, lightY + 4);
            ctx.lineTo(lightX + 68, lightY + 150);
            ctx.lineTo(lightX - 56, lightY + 150);
            ctx.closePath();
            ctx.fill();
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

    const floorSheen = ctx.createLinearGradient(0, canvas.height * 0.28, 0, canvas.height);
    floorSheen.addColorStop(0, "rgba(255,255,255,0)");
    floorSheen.addColorStop(0.58, "rgba(255,210,165,0.02)");
    floorSheen.addColorStop(1, "rgba(255,255,255,0.04)");
    ctx.fillStyle = floorSheen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.18,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.72
    );
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

function drawDoor(door, targetCtx = ctx) {
  const { x, y, width, height } = door;
  const orientation = door.orientation || (y > room.height / 2 ? 'bottom' : 'top');

  if (orientation === 'bottom') {
      if (currentLevelName === 'hallway' || currentLevelName === 'principal_hallway') {
          // Simple mat for hallway
          const matTop = y;
          const matHeight = 28;
          
          targetCtx.fillStyle = "#3e2723"; 
          targetCtx.fillRect(x - 2, matTop - 2, width + 4, matHeight + 4);
          targetCtx.fillStyle = "#5d4037";
          targetCtx.fillRect(x, matTop, width, matHeight);
          targetCtx.fillStyle = "rgba(0,0,0,0.15)";
          for(let i=0; i<width; i+=8) {
              targetCtx.fillRect(x + i, matTop, 4, matHeight);
          }
          for(let j=0; j<matHeight; j+=8) {
              targetCtx.fillRect(x, matTop + j, width, 2);
          }
          targetCtx.fillStyle = "rgba(255,255,255,0.6)";
          targetCtx.beginPath();
          targetCtx.moveTo(x + width/2 - 10, matTop + 8);
          targetCtx.lineTo(x + width/2 + 10, matTop + 8);
          targetCtx.lineTo(x + width/2, matTop + 20);
          targetCtx.fill();
          targetCtx.fillStyle = "#4e342e";
          targetCtx.fillRect(x - 4, y + 40, width + 8, 12);
      } else {
          // Open 2.5D Double Door Corridor
          const padding = 32;
          const themes = {
            hall: { wall: "#3f5765", floor: "#cfd8dc", baseboard: "#1c262f" },
            dorm: { wall: "#8d6e63", floor: "#3e2723", baseboard: "#281915" },
            classroom: { wall: "#2c3e50", floor: "#e9e4d5", baseboard: "#1f2d3a" },
            office_clean: { wall: "#8c6f64", floor: "#7b5d52", baseboard: "#5c433c" },
            office: { wall: "#5d463f", floor: "#2a1f1c", baseboard: "#1a1412" }
          };
          let tName = room.theme || 'dorm';
          if (typeof currentLevelName !== 'undefined' && currentLevelName === 'principal_office' && playData && playData.worldState && !playData.worldState.horrorActive) tName = 'office_clean';
          const pal = themes[tName] || themes.dorm;
          
          const bottomEdge = room.height - padding;
          
          // Dark passage going south
          targetCtx.fillStyle = "#1e1410";
          targetCtx.fillRect(x, bottomEdge, width, padding + 10);
          
          // Faux south walls (left and right of the 120px passage)
          targetCtx.fillStyle = pal.wall;
          targetCtx.fillRect(x - 50, bottomEdge, 50, padding);
          targetCtx.fillRect(x + width, bottomEdge, 50, padding);
          targetCtx.fillStyle = pal.baseboard;
          targetCtx.fillRect(x - 50, bottomEdge, 50, 6);
          targetCtx.fillRect(x + width, bottomEdge, 50, 6);
          
          // Frame structure around the opening
          targetCtx.fillStyle = "#4e342e";
          targetCtx.fillRect(x, bottomEdge, width, 6); // Top header spanning the gap
          targetCtx.fillStyle = "#2d1e19";
          targetCtx.fillRect(x, bottomEdge + 6, 6, padding - 6); // Left inner frame
          targetCtx.fillRect(x + width - 6, bottomEdge + 6, 6, padding - 6); // Right inner frame
          
          // Swung-open door panels (looks like thin rectangles extending outwards/downwards from the frame)
          targetCtx.fillStyle = "#6d4c41"; // Outer door skin
          targetCtx.fillRect(x + 6, bottomEdge + 6, 4, padding - 6); // Left door swung open
          targetCtx.fillRect(x + width - 10, bottomEdge + 6, 4, padding - 6); // Right door swung open
          
          // Door handles on the open edge
          targetCtx.fillStyle = "#f0c419";
          targetCtx.fillRect(x + 8, bottomEdge + padding - 10, 3, 6); // Handle left
          targetCtx.fillRect(x + width - 11, bottomEdge + padding - 10, 3, 6); // Handle right
          
          // Large elegant door mat inside the room
          const matH = 28;
          targetCtx.fillStyle = "#3e2723";
          targetCtx.fillRect(x - 4, bottomEdge - matH - 4, width + 8, matH + 4);
          targetCtx.fillStyle = "#5d4037";
          targetCtx.fillRect(x - 2, bottomEdge - matH - 2, width + 4, matH);
          
          // Down arrow on mat
          targetCtx.fillStyle = "rgba(255,255,255,0.4)";
          targetCtx.beginPath();
          targetCtx.moveTo(x + width/2, bottomEdge - 6);
          targetCtx.lineTo(x + width/2 - 12, bottomEdge - matH + 6);
          targetCtx.lineTo(x + width/2 + 12, bottomEdge - matH + 6);
          targetCtx.fill();
      }

  } else if (orientation === 'left') {
      const padding = 32;
      const themes = {
        hall: { wall: "#3f5765", floor: "#cfd8dc", baseboard: "#1c262f" },
        dorm: { wall: "#8d6e63", floor: "#3e2723", baseboard: "#281915" },
        classroom: { wall: "#2c3e50", floor: "#e9e4d5", baseboard: "#1f2d3a" },
        office_clean: { wall: "#8c6f64", floor: "#7b5d52", baseboard: "#5c433c" },
        office: { wall: "#5d463f", floor: "#2a1f1c", baseboard: "#1a1412" }
      };
      let tName = room.theme || 'dorm';
      if (typeof currentLevelName !== 'undefined' && currentLevelName === 'principal_office' && playData && playData.worldState && !playData.worldState.horrorActive) tName = 'office_clean';
      const pal = themes[tName] || themes.dorm;

      // Dark passage
      targetCtx.fillStyle = "#1e1410";
      targetCtx.fillRect(x - 10, y, padding + 10 - x, height);

      // Faux walls to give 2.5D depth
      targetCtx.fillStyle = pal.wall;
      targetCtx.fillRect(0, y - 50, padding, 50);
      targetCtx.fillRect(0, y + height, padding, 50);
      targetCtx.fillStyle = pal.baseboard;
      targetCtx.fillRect(padding - 6, y - 50, 6, 50);
      targetCtx.fillRect(padding - 6, y + height, 6, 50);

      // Frame cut edges
      targetCtx.fillStyle = "#4e342e";
      targetCtx.fillRect(padding - 6, y, 6, height); // inner rim
      targetCtx.fillStyle = "#2d1e19";
      targetCtx.fillRect(x - 10, y, padding + 10 - x, 6); // top depth
      targetCtx.fillRect(x - 10, y + height - 6, padding + 10 - x, 6); // bottom depth

      // Door mat inside the room
      const matW = 20;
      targetCtx.fillStyle = "#3e2723";
      targetCtx.fillRect(padding, y + 4, matW + 4, height - 8);
      targetCtx.fillStyle = "#5d4037";
      targetCtx.fillRect(padding + 2, y + 6, matW, height - 12);
      targetCtx.fillStyle = "rgba(255,255,255,0.4)";
      targetCtx.beginPath();
      targetCtx.moveTo(padding + 8, y + height/2);
      targetCtx.lineTo(padding + 16, y + height/2 - 6);
      targetCtx.lineTo(padding + 16, y + height/2 + 6);
      targetCtx.fill();

  } else if (orientation === 'right') {
      const padding = 32;
      const themes = {
        hall: { wall: "#3f5765", floor: "#cfd8dc", baseboard: "#1c262f" },
        dorm: { wall: "#8d6e63", floor: "#3e2723", baseboard: "#281915" },
        classroom: { wall: "#2c3e50", floor: "#e9e4d5", baseboard: "#1f2d3a" },
        office_clean: { wall: "#8c6f64", floor: "#7b5d52", baseboard: "#5c433c" },
        office: { wall: "#5d463f", floor: "#2a1f1c", baseboard: "#1a1412" }
      };
      let tName = room.theme || 'dorm';
      if (typeof currentLevelName !== 'undefined' && currentLevelName === 'principal_office' && playData && playData.worldState && !playData.worldState.horrorActive) tName = 'office_clean';
      const pal = themes[tName] || themes.dorm;
      
      const rightEdge = room.width - padding;

      // Dark passage
      targetCtx.fillStyle = "#1e1410";
      targetCtx.fillRect(rightEdge, y, width, height);

      // Faux walls to give 2.5D depth
      targetCtx.fillStyle = pal.wall;
      targetCtx.fillRect(rightEdge, y - 50, padding, 50);
      targetCtx.fillRect(rightEdge, y + height, padding, 50);
      targetCtx.fillStyle = pal.baseboard;
      targetCtx.fillRect(rightEdge, y - 50, 6, 50);
      targetCtx.fillRect(rightEdge, y + height, 6, 50);

      // Frame cut edges
      targetCtx.fillStyle = "#4e342e";
      targetCtx.fillRect(rightEdge, y, 6, height); // inner rim
      targetCtx.fillStyle = "#2d1e19";
      targetCtx.fillRect(rightEdge + 6, y, width - 6, 6); // top depth
      targetCtx.fillRect(rightEdge + 6, y + height - 6, width - 6, 6); // bottom depth

      // Door mat inside the room
      const matW = 20;
      targetCtx.fillStyle = "#3e2723";
      targetCtx.fillRect(rightEdge - matW - 4, y + 4, matW + 4, height - 8);
      targetCtx.fillStyle = "#5d4037";
      targetCtx.fillRect(rightEdge - matW - 2, y + 6, matW, height - 12);
      targetCtx.fillStyle = "rgba(255,255,255,0.4)";
      targetCtx.beginPath();
      targetCtx.moveTo(rightEdge - 8, y + height/2);
      targetCtx.lineTo(rightEdge - 16, y + height/2 - 6);
      targetCtx.lineTo(rightEdge - 16, y + height/2 + 6);
      targetCtx.fill();
  } else {
      // Top door (North wall)
      targetCtx.fillStyle = "#3a271f";
      targetCtx.fillRect(x - 6, y - 6, width + 12, height + 10);
      
      const gradient = targetCtx.createLinearGradient(0, y, 0, y + height);
      gradient.addColorStop(0, "#8d6e63");
      gradient.addColorStop(1, "#5d4037");
      targetCtx.fillStyle = gradient;
      targetCtx.fillRect(x, y, width, height);

      if (width > 80) {
          // Double Door
          const panelW = width / 2;
          // Center line
          targetCtx.fillStyle = "#3e2723";
          targetCtx.fillRect(x + panelW - 1, y, 2, height);
          
          // Handles
          targetCtx.fillStyle = "#f0c419";
          targetCtx.beginPath();
          targetCtx.arc(x + panelW - 6, y + height / 2 + 6, 4, 0, Math.PI * 2);
          targetCtx.arc(x + panelW + 6, y + height / 2 + 6, 4, 0, Math.PI * 2);
          targetCtx.fill();
          
          // Panel details (rectangles)
          targetCtx.strokeStyle = "rgba(0,0,0,0.15)";
          targetCtx.lineWidth = 2;
          targetCtx.strokeRect(x + 8, y + 8, panelW - 16, height/2 - 12);
          targetCtx.strokeRect(x + panelW + 8, y + 8, panelW - 16, height/2 - 12);
          targetCtx.strokeRect(x + 8, y + height/2 + 8, panelW - 16, height/2 - 16);
          targetCtx.strokeRect(x + panelW + 8, y + height/2 + 8, panelW - 16, height/2 - 16);
      } else {
          // Single Door
          targetCtx.fillStyle = "rgba(0,0,0,0.2)";
          targetCtx.fillRect(x, y, 6, height);
          
          targetCtx.fillStyle = "#f0c419";
          targetCtx.beginPath();
          targetCtx.arc(x + width - 12, y + height / 2, 4, 0, Math.PI * 2);
          targetCtx.fill();
          
          // Panel details
          targetCtx.strokeStyle = "rgba(0,0,0,0.15)";
          targetCtx.lineWidth = 2;
          targetCtx.strokeRect(x + 10, y + 10, width - 20, height/2 - 16);
          targetCtx.strokeRect(x + 10, y + height/2 + 10, width - 20, height/2 - 20);
      }
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
    
    // Optional elegant border
    if (item.border) {
        targetCtx.strokeStyle = item.border;
        targetCtx.lineWidth = 4;
        targetCtx.strokeRect(item.x + 4, item.y + 4, item.width - 8, item.height - 8);
        targetCtx.lineWidth = 1;
    }

    targetCtx.strokeStyle = "rgba(0,0,0,0.1)";
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    for(let i=4; i<item.width; i+=4) {
        targetCtx.moveTo(item.x + i, item.y);
        targetCtx.lineTo(item.x + i, item.y + item.height);
    }
    targetCtx.stroke();
}

function drawSofa(item, targetCtx = ctx) {
    const color = item.color || "#4e342e";
    const highlight = item.highlight || "#5d4037"; // Lighter for top 2.5d surfaces
    const shadow = "#2d1e19"; // Darker for depth

    // Bottom shadow
    targetCtx.fillStyle = "rgba(0,0,0,0.3)";
    targetCtx.fillRect(item.x - 2, item.y + item.height - 4, item.width + 4, 8);

    // Backrest (Vertical part)
    targetCtx.fillStyle = shadow;
    targetCtx.fillRect(item.x, item.y, item.width, item.height / 2);

    // Backrest top padding (2.5D Top surface)
    targetCtx.fillStyle = highlight;
    targetCtx.beginPath();
    targetCtx.moveTo(item.x, item.y);
    targetCtx.lineTo(item.x + 6, item.y - 6);
    targetCtx.lineTo(item.x + item.width - 6, item.y - 6);
    targetCtx.lineTo(item.x + item.width, item.y);
    targetCtx.fill();

    // Seat cushion (Extends forward)
    targetCtx.fillStyle = highlight;
    targetCtx.fillRect(item.x + 8, item.y + item.height / 2, item.width - 16, item.height / 2 - 4);
    
    // Front edge of seat cushion 
    targetCtx.fillStyle = color;
    targetCtx.fillRect(item.x + 8, item.y + item.height - 4, item.width - 16, 4);

    // Armrests
    // Left
    targetCtx.fillStyle = color;
    targetCtx.fillRect(item.x, item.y + 10, 8, item.height - 10);
    targetCtx.fillStyle = highlight; // Top surface of left armrest
    targetCtx.fillRect(item.x, item.y + 10, 8, -6);
    
    // Right
    targetCtx.fillStyle = color;
    targetCtx.fillRect(item.x + item.width - 8, item.y + 10, 8, item.height - 10);
    targetCtx.fillStyle = highlight; // Top surface of right armrest
    targetCtx.fillRect(item.x + item.width - 8, item.y + 10, 8, -6);

    // Cushion details (tufting gaps)
    targetCtx.fillStyle = "rgba(0,0,0,0.15)";
    if (item.width > 60) {
        targetCtx.fillRect(item.x + item.width / 2 - 1, item.y + item.height / 2, 2, item.height / 2);
    }
}

function drawBookshelf(item, targetCtx = ctx) {
    const woodColor = "#3e2723";
    const woodHighlight = "#4e342e";
    const shelves = 4;
    const shelfHeight = item.height / shelves;

    // Side Depth (Left perspective)
    targetCtx.fillStyle = "#2d1e19";
    targetCtx.beginPath();
    targetCtx.moveTo(item.x, item.y);
    targetCtx.lineTo(item.x + 10, item.y - 8);
    targetCtx.lineTo(item.x + 10, item.y + item.height - 8);
    targetCtx.lineTo(item.x, item.y + item.height);
    targetCtx.fill();

    // Top surface
    targetCtx.fillStyle = woodHighlight;
    targetCtx.beginPath();
    targetCtx.moveTo(item.x, item.y);
    targetCtx.lineTo(item.x + 10, item.y - 8);
    targetCtx.lineTo(item.x + item.width + 10, item.y - 8);
    targetCtx.lineTo(item.x + item.width, item.y);
    targetCtx.fill();

    // Main Face (Right side frame, top frame)
    targetCtx.fillStyle = woodColor;
    targetCtx.fillRect(item.x, item.y, item.width, item.height);

    // Back wall of the bookshelf (Dark)
    targetCtx.fillStyle = "#1a100c";
    targetCtx.fillRect(item.x + 6, item.y + 6, item.width - 12, item.height - 12);

    for (let i = 1; i < shelves; i++) {
        const y = item.y + i * shelfHeight;
        // Shelf board
        targetCtx.fillStyle = woodColor;
        targetCtx.fillRect(item.x + 6, y, item.width - 12, 4);
        
        // Books on shelf
        targetCtx.fillStyle = "rgba(0,0,0,0.5)";
        targetCtx.fillRect(item.x + 6, y - 4, item.width - 12, 4); // Shadow under books
        
        let bkX = item.x + 8;
        let bookIndex = 0;
        while(bkX < item.x + item.width - 10) {
            // Simple pseudo-random hash based on item position and book index
            const seed = Math.sin(item.x * 12.9898 + y * 78.233 + bookIndex * 37.719) * 43758.5453;
            const pseudoRandom = seed - Math.floor(seed);
            
            const bkW = 4 + pseudoRandom * 8;
            
            const seed2 = Math.sin(item.x * 15.123 + y * 42.111 + bookIndex * 19.333) * 43758.5453;
            const pseudoRandom2 = seed2 - Math.floor(seed2);
            const bkH = 10 + pseudoRandom2 * 10;
            
            if (bkX + bkW > item.x + item.width - 8) break;
            
            // Random book color
            const colors = ["#b71c1c", "#1565c0", "#2e7d32", "#f57f17", "#efefef", "#4e342e"];
            const colorIndex = Math.floor(pseudoRandom * colors.length);
            targetCtx.fillStyle = colors[colorIndex];
            
            // Random lean
            const lean = (pseudoRandom2 - 0.5) * 4;
            
            targetCtx.save();
            targetCtx.translate(bkX + bkW/2, y);
            targetCtx.rotate(lean * Math.PI / 180);
            targetCtx.fillRect(-bkW/2, -bkH, bkW, bkH);
            
            // Book spine detail
            targetCtx.fillStyle = "rgba(255,255,255,0.2)";
            targetCtx.fillRect(-bkW/2 + 1, -bkH + 2, bkW - 2, 2);
            targetCtx.restore();
            
            bkX += bkW + 1;
            
            // Occasional gap
            if (pseudoRandom > 0.7) bkX += 4;
            
            bookIndex++;
        }
    }
}

function drawBossDesk(item, targetCtx = ctx) {
    const woodWood = "#3e2723";
    const woodHighlight = "#4e342e";
    const woodTrim = "#d4af37"; // Gold trim

    // 1. Shadow
    targetCtx.fillStyle = "rgba(0,0,0,0.4)";
    targetCtx.fillRect(item.x - 4, item.y + item.height - 4, item.width + 8, 12);

    // 2. Base/Sides of desk (Perspective depth)
    targetCtx.fillStyle = "#2d1e19";
    targetCtx.fillRect(item.x, item.y + 12, item.width, item.height - 12);
    
    // Front Panels (Cabinets)
    targetCtx.fillStyle = woodWood;
    targetCtx.fillRect(item.x, item.y + 12, item.width / 3.5, item.height - 12); // Left drawer column
    targetCtx.fillRect(item.x + item.width - item.width/3.5, item.y + 12, item.width / 3.5, item.height - 12); // Right drawer column
    
    // Drawers on the panels
    targetCtx.strokeStyle = "#1a100c";
    targetCtx.lineWidth = 2;
    // Left drawers
    targetCtx.strokeRect(item.x + 6, item.y + 18, item.width/3.5 - 12, item.height/2 - 14);
    targetCtx.strokeRect(item.x + 6, item.y + item.height/2 + 8, item.width/3.5 - 12, item.height/2 - 14);
    // Right drawers
    targetCtx.strokeRect(item.x + item.width - item.width/3.5 + 6, item.y + 18, item.width/3.5 - 12, item.height/2 - 14);
    targetCtx.strokeRect(item.x + item.width - item.width/3.5 + 6, item.y + item.height/2 + 8, item.width/3.5 - 12, item.height/2 - 14);
    
    // Gold Handles
    targetCtx.fillStyle = woodTrim;
    targetCtx.fillRect(item.x + item.width/7 - 6, item.y + 24, 12, 3);
    targetCtx.fillRect(item.x + item.width/7 - 6, item.y + item.height/2 + 14, 12, 3);
    targetCtx.fillRect(item.x + item.width - item.width/7 - 6, item.y + 24, 12, 3);
    targetCtx.fillRect(item.x + item.width - item.width/7 - 6, item.y + item.height/2 + 14, 12, 3);

    // 3. Desk Surface (Thick top)
    targetCtx.fillStyle = woodHighlight;
    // Top surface plate
    targetCtx.fillRect(item.x - 4, item.y, item.width + 8, 14);
    // Front edge of surface
    targetCtx.fillStyle = woodWood;
    targetCtx.fillRect(item.x - 4, item.y + 14, item.width + 8, 6);
    
    // Elegant inlay on top surface
    targetCtx.strokeStyle = "#1a100c";
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(item.x + 4, item.y + 2, item.width - 8, 10);
    
    // Items on desk
    if (item.hasLaptop) { // Boss laptop
        targetCtx.fillStyle = "#90a4ae"; // Silver macbook-style
        targetCtx.fillRect(item.x + item.width/2 - 12, item.y + 2, 24, 10);
        targetCtx.fillStyle = "#37474f";
        targetCtx.fillRect(item.x + item.width/2 - 10, item.y + 4, 20, 6);
        targetCtx.fillStyle = "#81d4fa"; // Screen glow
        targetCtx.beginPath();
        targetCtx.moveTo(item.x + item.width/2 - 8, item.y + 10);
        targetCtx.lineTo(item.x + item.width/2 + 8, item.y + 10);
        targetCtx.lineTo(item.x + item.width/2 + 12, item.y + 16);
        targetCtx.lineTo(item.x + item.width/2 - 12, item.y + 16);
        targetCtx.fill();
    }
    if (item.hasLamp) {
        // Brass/Green executive banker's lamp
        targetCtx.fillStyle = "#d4af37"; // Brass stand
        targetCtx.fillRect(item.x + 20, item.y + 10, 8, 4); // base
        targetCtx.fillRect(item.x + 23, item.y - 4, 2, 14); // pole
        targetCtx.fillStyle = "#2e7d32"; // Green glass shade
        targetCtx.beginPath();
        targetCtx.arc(item.x + 24, item.y - 4, 12, Math.PI, 0); // half circle shade
        targetCtx.fill();
        targetCtx.fillStyle = "#fbc02d"; // Light glow
        targetCtx.globalAlpha = 0.5;
        targetCtx.beginPath();
        targetCtx.moveTo(item.x + 12, item.y - 4);
        targetCtx.lineTo(item.x + 36, item.y - 4);
        targetCtx.lineTo(item.x + 46, item.y + 14);
        targetCtx.lineTo(item.x + 2, item.y + 14);
        targetCtx.fill();
        targetCtx.globalAlpha = 1.0;
    }
}

function drawPlant(item, targetCtx = ctx) {
    const potColor = item.potColor || "#eceff1";
    const potHeight = item.height * 0.4;
    const potWidth = item.width * 0.8;
    const potX = item.x + (item.width - potWidth) / 2;
    const potY = item.y + item.height - potHeight;

    // Shadow on floor
    targetCtx.fillStyle = "rgba(0,0,0,0.3)";
    targetCtx.beginPath();
    targetCtx.ellipse(item.x + item.width / 2, item.y + item.height, potWidth / 2 + 4, 6, 0, 0, Math.PI * 2);
    targetCtx.fill();

    // Plant Leaves (Back layer)
    targetCtx.fillStyle = "#1b5e20"; // Very dark green
    targetCtx.beginPath();
    targetCtx.ellipse(item.x + item.width/2 - 6, potY - 10, 8, item.height * 0.5, -0.2, 0, Math.PI*2);
    targetCtx.ellipse(item.x + item.width/2 + 6, potY - 12, 10, item.height * 0.6, 0.3, 0, Math.PI*2);
    targetCtx.fill();

    // Pot Base/Body
    targetCtx.fillStyle = potColor;
    targetCtx.beginPath();
    targetCtx.moveTo(potX + 4, item.y + item.height);
    targetCtx.lineTo(potX + potWidth - 4, item.y + item.height);
    targetCtx.lineTo(potX + potWidth, potY);
    targetCtx.lineTo(potX, potY);
    targetCtx.fill();

    // Pot shading
    targetCtx.fillStyle = "rgba(0,0,0,0.2)";
    targetCtx.beginPath();
    targetCtx.moveTo(potX + potWidth / 2, item.y + item.height);
    targetCtx.lineTo(potX + potWidth - 4, item.y + item.height);
    targetCtx.lineTo(potX + potWidth, potY);
    targetCtx.lineTo(potX + potWidth / 2, potY);
    targetCtx.fill();

    // Pot Rim
    targetCtx.fillStyle = potColor;
    targetCtx.fillRect(potX - 2, potY - 4, potWidth + 4, 4);
    targetCtx.fillStyle = "rgba(255,255,255,0.4)"; // rim highlight
    targetCtx.fillRect(potX - 2, potY - 4, potWidth + 4, 1);
    targetCtx.fillStyle = "rgba(0,0,0,0.1)"; // rim shadow
    targetCtx.fillRect(potX - 2, potY, potWidth + 4, 1);

    // Dirt inside pot
    targetCtx.fillStyle = "#3e2723";
    targetCtx.beginPath();
    targetCtx.ellipse(item.x + item.width/2, potY - 4, potWidth/2, 3, 0, 0, Math.PI*2);
    targetCtx.fill();

    // Foreground Leaves
    targetCtx.fillStyle = "#2e7d32";
    targetCtx.beginPath();
    targetCtx.ellipse(item.x + item.width/2 - 8, potY + 2, 8, item.height * 0.4, -0.5, 0, Math.PI*2);
    targetCtx.ellipse(item.x + item.width/2 + 8, potY + 4, 7, item.height * 0.35, 0.6, 0, Math.PI*2);
    targetCtx.fill();

    targetCtx.fillStyle = "#43a047";
    targetCtx.beginPath();
    targetCtx.ellipse(item.x + item.width/2, potY, 9, item.height * 0.45, 0.1, 0, Math.PI*2);
    targetCtx.fill();

    // Leaf veins
    targetCtx.strokeStyle = "#81c784";
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    targetCtx.moveTo(item.x + item.width/2, potY + 8);
    targetCtx.lineTo(item.x + item.width/2 - 3, potY - item.height * 0.3);
    targetCtx.stroke();
    
    // extra leaf
    targetCtx.strokeStyle = "#66bb6a";
    targetCtx.beginPath();
    targetCtx.moveTo(item.x + item.width/2 - 6, potY + 4);
    targetCtx.lineTo(item.x + item.width/2 - 12, potY - item.height * 0.2);
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
    if (item.orientation === 'right') {
        const ext = 12; // Thicker front profile for better visibility
        const topH = 10; // Angle of depth receding into the wall
        
        // 1. Draw top 2.5D surface
        targetCtx.fillStyle = "#37474f"; // Darker depth top
        targetCtx.beginPath();
        targetCtx.moveTo(item.x, item.y); 
        targetCtx.lineTo(item.x + item.width - ext, item.y);
        targetCtx.lineTo(item.x + item.width - ext, item.y + topH);
        targetCtx.lineTo(item.x + item.width, item.y + topH + 6);
        targetCtx.lineTo(item.x, item.y + topH + 6);
        targetCtx.fill();

        // 2. South Side Panel (Receding part)
        targetCtx.fillStyle = "#455a64"; 
        targetCtx.fillRect(item.x, item.y + topH + 6, item.width - ext, item.height - topH - 6);
        
        // 3. East Panel (Front doors facing outwards)
        targetCtx.fillStyle = "#607d8b";
        targetCtx.fillRect(item.x + item.width - ext, item.y + topH + 6, ext, item.height - topH - 6);
        
        // Front door edge highlight (makes it pop out of the side panel)
        targetCtx.fillStyle = "#90a4ae";
        targetCtx.fillRect(item.x + item.width - ext, item.y + topH + 6, 2, item.height - topH - 6);
        targetCtx.fillStyle = "#37474f"; // Right edge shadow
        targetCtx.fillRect(item.x + item.width - 1, item.y + topH + 6, 1, item.height - topH - 6);

        // 4. Bottom shadow footing
        targetCtx.fillStyle = "#263238";
        targetCtx.fillRect(item.x, item.y + item.height - 4, item.width, 4);

        // Locker separation lines with 2.5D stepped indent
        targetCtx.fillStyle = "rgba(0,0,0,0.4)";
        for (let y = item.y + 40; y < item.y + item.height - 10; y += 40) {
            targetCtx.fillRect(item.x, y + topH, item.width - ext, 2); // Side panel gap
            targetCtx.fillRect(item.x + item.width - ext, y + topH + 2, ext, 2); // Front door gap (stepped down)
            targetCtx.fillStyle = "rgba(255,255,255,0.15)";
            targetCtx.fillRect(item.x + item.width - ext, y + topH + 1, ext, 1); // Top rim highlight of each locker door
            targetCtx.fillStyle = "rgba(0,0,0,0.4)";
        }

        // Vents and handles
        for (let y = item.y + topH + 8; y < item.y + item.height; y += 40) {
            targetCtx.fillStyle = "#cfd8dc";
            targetCtx.fillRect(item.x + item.width - ext + 4, y + 4, ext - 6, 1);
            targetCtx.fillRect(item.x + item.width - ext + 4, y + 8, ext - 6, 1);
            targetCtx.fillRect(item.x + item.width - ext + 4, y + 12, ext - 6, 1);
            
            targetCtx.fillStyle = "#ffd54f"; // Brighter handle
            targetCtx.fillRect(item.x + item.width - 4, y + 18, 2, 8);
            targetCtx.fillStyle = "#e65100"; // Deep lock shadow
            targetCtx.fillRect(item.x + item.width - 3, y + 18, 1, 8);
        }
    } else if (item.orientation === 'left') {
        const ext = 12; // Thicker front profile
        const topH = 10; 
        
        // 1. Draw top 2.5D surface
        targetCtx.fillStyle = "#37474f";
        targetCtx.beginPath();
        targetCtx.moveTo(item.x + ext, item.y); 
        targetCtx.lineTo(item.x + item.width, item.y); 
        targetCtx.lineTo(item.x + item.width, item.y + topH + 6); 
        targetCtx.lineTo(item.x, item.y + topH + 6); 
        targetCtx.lineTo(item.x + ext, item.y + topH); 
        targetCtx.fill();

        // 2. South Side Panel
        targetCtx.fillStyle = "#455a64";
        targetCtx.fillRect(item.x + ext, item.y + topH + 6, item.width - ext, item.height - topH - 6);
        
        // 3. West Panel (front doors)
        targetCtx.fillStyle = "#607d8b";
        targetCtx.fillRect(item.x, item.y + topH + 6, ext, item.height - topH - 6);
        
        // Front door edge highlight & shadow
        targetCtx.fillStyle = "#90a4ae";
        targetCtx.fillRect(item.x + ext - 2, item.y + topH + 6, 2, item.height - topH - 6);
        targetCtx.fillStyle = "#37474f";
        targetCtx.fillRect(item.x, item.y + topH + 6, 1, item.height - topH - 6);

        // 4. Bottom shadow footing
        targetCtx.fillStyle = "#263238";
        targetCtx.fillRect(item.x, item.y + item.height - 4, item.width, 4);

        // Locker separation lines
        targetCtx.fillStyle = "rgba(0,0,0,0.4)";
        for (let y = item.y + 40; y < item.y + item.height - 10; y += 40) {
            targetCtx.fillRect(item.x + ext, y + topH, item.width - ext, 2); // Side panel gap
            targetCtx.fillRect(item.x, y + topH + 2, ext, 2); // Front door gap (stepped down)
            targetCtx.fillStyle = "rgba(255,255,255,0.15)";
            targetCtx.fillRect(item.x, y + topH + 1, ext, 1); 
            targetCtx.fillStyle = "rgba(0,0,0,0.4)";
        }

        // Vents and handles
        for (let y = item.y + topH + 8; y < item.y + item.height; y += 40) {
            targetCtx.fillStyle = "#cfd8dc";
            targetCtx.fillRect(item.x + 2, y + 4, ext - 6, 1);
            targetCtx.fillRect(item.x + 2, y + 8, ext - 6, 1);
            targetCtx.fillRect(item.x + 2, y + 12, ext - 6, 1);
            
            targetCtx.fillStyle = "#ffd54f";
            targetCtx.fillRect(item.x + 2, y + 18, 2, 8);
            targetCtx.fillStyle = "#e65100";
            targetCtx.fillRect(item.x + 2, y + 18, 1, 8);
        }
    } else {
        // Standard front-facing locker
        targetCtx.fillStyle = "#607d8b";
        targetCtx.fillRect(item.x, item.y, item.width, item.height);
        targetCtx.fillStyle = "#546e7a";
        targetCtx.fillRect(item.x + 4, item.y + 10, item.width - 8, 4);
        targetCtx.fillRect(item.x + 4, item.y + 16, item.width - 8, 4);
        targetCtx.fillRect(item.x + 4, item.y + 22, item.width - 8, 4);
        targetCtx.fillStyle = "#cfd8dc";
        targetCtx.fillRect(item.x + item.width - 8, item.y + item.height/2, 4, 10);
    }
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
    const w = item.width || 24;
    const h = item.height || 36;
    const facing = item.facing || 'down';
    const walkFrame = item.walkFrame || 0;
    const isMoving = Boolean(item.isWalking);
    const walkCycle = Math.sin(walkFrame);
    const stride = isMoving ? walkCycle * 5 : 0;
    const bob = isMoving
        ? Math.abs(Math.sin(walkFrame * 2)) * 2
        : Math.sin(Date.now() / 500 + (item.phase || 0)) * 2;
    const baseY = item.y - bob;
    const px = item.x;
    const py = baseY;

    // Shadow
    targetCtx.fillStyle = "rgba(0,0,0,0.2)";
    if (facing === 'left' || facing === 'right') {
        targetCtx.beginPath();
        targetCtx.ellipse(px + w / 2, py + h - 2, w / 2, 4, 0, 0, Math.PI * 2);
        targetCtx.fill();
    } else {
        targetCtx.fillRect(px + 2, py + h - 4, w - 4, 4);
    }

    if (facing === 'left' || facing === 'right') {
        const isRight = facing === 'right';
        const legSwing = isMoving ? stride : 0;

        targetCtx.fillStyle = "#212121";
        targetCtx.fillRect(px + w/2 - 3 + legSwing, py + 26, 6, 10);
        targetCtx.fillRect(px + w/2 - 3 - legSwing, py + 26, 6, 10);

        targetCtx.fillStyle = "#3e2723";
        targetCtx.fillRect(px + 4, py + 12, w - 8, 14);
        targetCtx.fillStyle = "#d32f2f";
        targetCtx.fillRect(px + w/2 - 1, py + 14, 2, 8);

        targetCtx.fillStyle = "#f1c27d";
        targetCtx.fillRect(px + 4, py, w - 8, 12);

        targetCtx.fillStyle = "#5d4037";
        targetCtx.fillRect(px + 2, py, w - 4, 4);
        if (isRight) {
            targetCtx.fillRect(px + 2, py, 4, 10);
            targetCtx.fillStyle = "#212121";
            targetCtx.fillRect(px + w - 8, py + 6, 2, 2);
            targetCtx.fillStyle = "#5d4037";
            targetCtx.fillRect(px + w - 2, py - 2, 4, 14);
            targetCtx.fillRect(px + 8, py - 8, w - 8, 6);
        } else {
            targetCtx.fillRect(px + w - 6, py, 4, 10);
            targetCtx.fillStyle = "#212121";
            targetCtx.fillRect(px + 6, py + 6, 2, 2);
            targetCtx.fillStyle = "#5d4037";
            targetCtx.fillRect(px - 2, py - 2, 4, 14);
            targetCtx.fillRect(px, py - 8, w - 8, 6);
        }

        targetCtx.fillStyle = "#3e2723";
        targetCtx.fillRect(px + 6, py - 3, w - 12, 2);
        return;
    }

    // Body (Fancy Suit)
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(px, py + 12, w, 14);
    // Tie
    targetCtx.fillStyle = "#d32f2f";
    targetCtx.fillRect(px + w/2 - 2, py + 14, 4, 8);

    // Legs
    targetCtx.fillStyle = "#212121";
    targetCtx.fillRect(px + 4, py + 26 + stride, 6, 8);
    targetCtx.fillRect(px + w - 10, py + 26 - stride, 6, 8);

    if (!item.headless) {
        // Head
        targetCtx.fillStyle = "#f1c27d";
        targetCtx.fillRect(px + 2, py, w - 4, 12);

        // Eyes
        targetCtx.fillStyle = "#212121";
        targetCtx.fillRect(px + 6, py + 5, 2, 2);
        targetCtx.fillRect(px + w - 8, py + 5, 2, 2);

        // Mustache
        targetCtx.fillStyle = "#5d4037";
        targetCtx.fillRect(px + 6, py + 8, w - 12, 2);

        // Cowboy Hat
        targetCtx.fillStyle = "#5d4037";
        // Brim
        targetCtx.fillRect(px - 4, py - 2, w + 8, 4);
        // Top
        targetCtx.fillRect(px + 2, py - 8, w - 4, 6);
        // Band
        targetCtx.fillStyle = "#3e2723";
        targetCtx.fillRect(px + 2, py - 3, w - 4, 2);
    } else {
        // Neck/Gore
        targetCtx.fillStyle = "#b71c1c";
        targetCtx.fillRect(px + w/2 - 3, py + 10, 6, 4);
        if (Math.random() > 0.5) {
             targetCtx.fillStyle = "#e53935";
             targetCtx.fillRect(px + w/2 - 2, py + 8, 4, 2);
        }
    }
}

function drawDebris(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#4e342e";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.fillStyle = "#3e2723";
    targetCtx.fillRect(item.x + 4, item.y + 3, item.width - 8, Math.max(3, item.height - 6));
    targetCtx.fillStyle = "rgba(255,255,255,0.12)";
    targetCtx.fillRect(item.x + 2, item.y + 2, Math.max(6, item.width * 0.4), 2);
}

function drawVent(item, targetCtx = ctx) {
    targetCtx.fillStyle = "#7b8b94";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.fillStyle = "#455a64";
    for (let i = 6; i < item.height - 4; i += 6) {
        targetCtx.fillRect(item.x + 5, item.y + i, item.width - 10, 2);
    }
    targetCtx.strokeStyle = "#263238";
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(item.x, item.y, item.width, item.height);
}

function drawWallSwitch(item, targetCtx = ctx) {
    const isOn = playData.worldState.secretRoomLightOn;
    
    // Wall plate
    targetCtx.fillStyle = "#eceff1";
    targetCtx.fillRect(item.x, item.y, item.width, item.height);
    targetCtx.strokeStyle = "#b0bec5";
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(item.x, item.y, item.width, item.height);
    
    // Switch toggle
    const switchW = 6;
    const switchH = 10;
    const switchX = item.x + (item.width - switchW) / 2;
    const switchY = isOn ? item.y + 3 : item.y + item.height - switchH - 3;
    
    targetCtx.fillStyle = isOn ? "#66bb6a" : "#78909c";
    targetCtx.fillRect(switchX, switchY, switchW, switchH);
    
    // Tiny indicator light
    targetCtx.fillStyle = isOn ? "#ffeb3b" : "#37474f";
    targetCtx.beginPath();
    targetCtx.arc(item.x + item.width / 2, item.y + item.height / 2 + (isOn ? 6 : -6), 2, 0, Math.PI * 2);
    targetCtx.fill();
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
    else if (item.type === 'debris') drawDebris(item, targetCtx);
    else if (item.type === 'vent') drawVent(item, targetCtx);
    else if (item.type === 'chest') drawChest(item, targetCtx);
    else if (item.type === 'rug') drawRug(item, targetCtx);
    else if (item.type === 'shelf') drawShelf(item, targetCtx);
    else if (item.type === 'whiteboard') drawWhiteboard(item, targetCtx);
    else if (item.type === 'boss_desk') drawBossDesk(item, targetCtx);
    else if (item.type === 'sofa') drawSofa(item, targetCtx);
    else if (item.type === 'bookshelf') drawBookshelf(item, targetCtx);
    else if (item.type === 'plant') drawPlant(item, targetCtx);
    else if (item.type === 'wall_switch') drawWallSwitch(item, targetCtx);
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
  
  if (player.isCrawling) {
      const isMoving = player.walkFrame !== 0;
      const walkCycle = Math.sin(player.walkFrame);
      const px = x;
      const py = y - h/2; // Center horizontally
      
      ctx.translate(px, py);
      ctx.rotate(-Math.PI / 2); // Rotate 90 degrees left
      ctx.translate(-px, -py);
      
      const pxC = x - w/2;
      const pyC = y - h + 8;
      
      // Draw upward-facing back sprite (crawling)
      const elbowSwing = walkCycle * 4;
      const kneeSwing = -walkCycle * 6; // Opposite to elbows
      
      // Hands/Elbows
      ctx.fillStyle = skinColor;
      ctx.fillRect(pxC - 2 + elbowSwing, pyC + 10, 4, 6);
      ctx.fillRect(pxC + w - 2 - elbowSwing, pyC + 10, 4, 6);
      
      // Knees/Feet
      ctx.fillStyle = pantsColor;
      ctx.fillRect(pxC + 4, pyC + 26 + kneeSwing, 6, 12);
      ctx.fillRect(pxC + w - 10, pyC + 26 - kneeSwing, 6, 12);
      
      // Shirt back
      ctx.fillStyle = shirtColor;
      ctx.fillRect(pxC, pyC + 12, w, 14);
      ctx.fillStyle = stripeColor;
      ctx.fillRect(pxC, pyC + 18, w, 4);
      
      // Head back
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

  // Zoom: use cutscene zoom during cutscenes, otherwise player zoom
  const activeZoom = (cutscene && cutscene.active) ? camera.zoom : userZoom;
  if (activeZoom && activeZoom !== 1) {
      ctx.scale(activeZoom, activeZoom);
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
      draw: () => {
        drawFurnitureShadow(item);
        drawFurnitureItem(item);
      }
    });
  });
  renderList.sort((a, b) => a.y - b.y);
  renderList.forEach(obj => obj.draw());
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

function drawOfficeTimer() {
    if (!officeTimer.active) return;
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

    const zx = deathSequence.zombieX - camera.x;
    const zy = deathSequence.zombieY - camera.y;
    const px = player.x - camera.x;
    const py = player.y - camera.y;
    const bite = deathSequence.consumeProgress;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zombie
    ctx.fillStyle = "#1b5e20";
    ctx.fillRect(zx - 12, zy - 34, 24, 36);
    ctx.fillStyle = "#66bb6a";
    ctx.fillRect(zx - 10, zy - 48, 20, 14);
    ctx.fillStyle = "#b71c1c";
    ctx.fillRect(zx - 9, zy - 30, 6, 3);

    // Bite overlay on player
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
    ctx.font = "16px 'VT323', monospace";
    ctx.fillStyle = "#fff";
    const reason = deathSequence.reason === 'timer' ? 'Time\'s up.' : 'Leaving the principal\'s office = death.';
    ctx.fillText(reason, canvas.width / 2, 72);
    ctx.restore();
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
  if (deathSequence && deathSequence.active) return;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "16px 'VT323', 'Courier New', monospace";
  ctx.textAlign = "center";
  if (stage >= 2 && currentLevelName === 'classroom') {
    ctx.fillStyle = "#9e9e9e";
    ctx.fillText("W A S D", canvas.width - 60, canvas.height - 40);
  }

  // Persistent "Press I for Help" hint in top-right corner
  ctx.textAlign = "right";
  ctx.font = "14px 'VT323', 'Courier New', monospace";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("Press I for Help", canvas.width - 12, 18);

  ctx.restore();
  let showingHint = false;

  // Check for nearby cabinets (proximity hint like doors)
  const cabinets = room.furniture.filter(f => f.id === 'left_cabinet' || f.id === 'right_cabinet');
  for (const cabinet of cabinets) {
      const cabCX = cabinet.x + cabinet.width / 2;
      const cabCY = cabinet.y + cabinet.height / 2;
      const cabDist = Math.hypot(player.x - cabCX, player.y - cabCY);
      if (cabDist < 100) {
          showingHint = true;
          if (!isHintActive) {
             dialogueBox.classList.remove("dialogue--hidden");
             dialogueBox.classList.add("dialogue--active");
             dialogueLine.textContent = `Press [SPACE] to open locker`;
             dialogueLabel.classList.add("dialogue__label--hidden");
             dialoguePrompt.textContent = "";
             isHintActive = true;
          }
          break;
      }
  }

  if (!showingHint) {
      const nearbyDoor = getNearestDoor(56);
      if (nearbyDoor) {
          showingHint = true;
          if (!isHintActive) {
             dialogueBox.classList.remove("dialogue--hidden");
             dialogueBox.classList.add("dialogue--active");
             const promptText = nearbyDoor.prompt || "to open";
             dialogueLine.textContent = `Press [SPACE] ${promptText}`;
             dialogueLabel.classList.add("dialogue__label--hidden");
             dialoguePrompt.textContent = "";
             isHintActive = true;
          }
      }
  }
  if (!showingHint && isHintActive) {
      isHintActive = false;
      updateDialogue();
  }
}

function updateOfficeTimer() {
    if (!officeTimer.active) return;
    officeTimer.framesLeft -= 1;

    if (officeTimer.framesLeft <= 0) {
        officeTimer.framesLeft = 0;
        triggerDeath('timer');
        return;
    }

    if (officeTimer.framesLeft <= 10 * 60) {
        if (!officeTimer.flashed) {
            showTemporaryDialogue("Hurry! Time is almost up!", "SYSTEM");
            officeTimer.flashed = true;
        }
        screenShake = Math.max(screenShake, 1.5);
    }
}

function updateNPCs() {
    if (playData.worldState.horrorActive) return; // Horror state handles its own chaotic NPC logic
    if (cutscene && cutscene.active) return; // Don't interrupt cutscenes

    room.furniture.forEach(item => {
        if (item.type !== 'student' && item.type !== 'teacher') return;

        // Ensure no wandering
        item.walkFrame = 0;
        item.vx = 0;
        item.vy = 0;

        // Background breathing phase
        if (item.phase === undefined) item.phase = Math.random() * Math.PI * 2;
        item.phase += 0.03;
    });
}

function loop() {
  if (cutscene && cutscene.active && cutscene.update) {
      cutscene.update();
  }
  updateOfficeTimer();
  updateDeathSequence();
  updateHorrorState();
  updateNPCs();
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
        phase: 0,
        facing: 'left',
        walkFrame: 0,
        isWalking: false
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
                teacher.walkFrame = 0;
                currentWaypointIndex++;
            } else {
                const speed = 2;
                teacher.isWalking = true;
                if (Math.abs(dx) > Math.abs(dy)) {
                    teacher.facing = dx > 0 ? 'right' : 'left';
                } else {
                    teacher.facing = dy > 0 ? 'down' : 'up';
                }
                teacher.walkFrame += 0.18;
                teacher.x += (dx / dist) * speed;
                teacher.y += (dy / dist) * speed;
            }
        } else if (phase === 'sit') {
            teacher.isWalking = false;
            teacher.walkFrame = 0;
            teacher.facing = 'down';
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
             updateSoundtrack();

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

function startVentCrawlCutscene() {
    cutscene = { active: true, focus: null };
    
    // Teleport to vent tunnel
    loadLevel('vent_tunnel');
    player.x = room.spawn.x;
    player.y = room.spawn.y;
    player.isCrawling = true;
    player.facing = 'left';
    
    cutscene.focus = player;

    let phase = 'crawl';
    let timer = 0;

    cutscene.update = () => {
        if (phase === 'crawl') {
            player.walkFrame += 0.2; // faster animation for crawling
            player.x -= 3; // crawl speed to the left
            
            // Reached end of tunnel
            if (player.x <= 100) {
                phase = 'fade_out';
                timer = 0;
            }
            
            // Ensure camera follows player tightly in tunnel
            const camTargetX = player.x - canvas.width / 2;
            const camTargetY = player.y - canvas.height / 2;
            camera.x = Math.max(0, Math.min(camTargetX, room.width - canvas.width));
            camera.y = Math.max(0, Math.min(camTargetY, room.height - canvas.height));
            
        } else if (phase === 'fade_out') {
            timer++;
            globalDarkness = Math.min(1.0, timer / 60); // Fade to black over 1 second
            if (timer > 60) {
                phase = 'teleport';
            }
        } else if (phase === 'teleport') {
            // Load new secret room
            loadLevel('secret_room');
            // Force reset in case local storage was broken
            room.furniture = JSON.parse(JSON.stringify(window.initialGameData.levels['secret_room'].furniture));

            const brokenVent = room.furniture.find(f => f.id === 'broken_vent_in');
            const ventCenterX = brokenVent ? brokenVent.x + brokenVent.width / 2 : room.spawn.x;
            const standY = brokenVent
                ? Math.max(room.wallHeight + 26, brokenVent.y + brokenVent.height + 54)
                : 150;

            player.x = ventCenterX;
            player.y = standY;
            player.isCrawling = false; // Stand up
            player.facing = 'down';
            
            playData.player.room = 'secret_room';
            playData.player.x = player.x;
            playData.player.y = player.y;
            playData.player.facing = player.facing;
            savePlayState();
            
            phase = 'fade_in';
            timer = 0;
            
        } else if (phase === 'fade_in') {
            timer++;
            globalDarkness = Math.max(0, 1.0 - (timer / 60)); // Fade in over 1 second
            
            if (timer > 60) {
                globalDarkness = 0;
                phase = 'explode';
            }
        } else if (phase === 'explode') {
            const brokenVent = room.furniture.find(f => f.id === 'broken_vent_in');
            const blastX = brokenVent ? brokenVent.x + brokenVent.width / 2 : 250;
            const blastY = brokenVent ? brokenVent.y + brokenVent.height / 2 : 64;

            // Break the vent behind him
            createExplosion(blastX, blastY, "#7b8b94"); // Metal explosion
            createExplosion(blastX, blastY, "#455a64");
            screenShake = 15;
            
            // Switch out of horror music
            playSoundtrack('normal');

            // Change vent interaction in this room to do nothing
            if (brokenVent) {
                 brokenVent.interaction = {
                    enabled: true,
                    type: 'sequence',
                    conversations: [[{ speaker: 'LUKE', text: "It's jammed... can't get through anymore." }]],
                    area: { x: -10, y: -10, width: brokenVent.width + 20, height: brokenVent.height + 20 }
                 };
            }
            
            phase = 'dialogue';
            timer = 0;
            // Clear any lingering temporary dialogues that blocked movement
            if (tempDialogueTimeout) {
                clearTimeout(tempDialogueTimeout);
                tempDialogueTimeout = null;
                dialogueBox.classList.remove("dialogue--active");
            }
        } else if (phase === 'dialogue') {
            showTemporaryDialogue("Damn... the vent is broken, I can't go back.", "LUKE");
            phase = 'end';
        } else if (phase === 'end') {
            cutscene.active = false;
            cutscene = null;
        }
    };
}

function updateHorrorState() {
    if (!playData.worldState.horrorActive) return;

    // Don't override darkness during cutscenes (e.g. vent crawl fade)
    if (cutscene && cutscene.active) return;

    // Ensure darkness, except if in the secret room and the light is turned on
    if (currentLevelName === 'secret_room' && playData.worldState.secretRoomLightOn) {
        globalDarkness = 0.1;
    } else {
        globalDarkness = 0.7;
    }

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
                 if (playData.worldState.horrorActive && (item.type === 'student' || item.type === 'teacher')) continue;
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
                 if (playData.worldState.horrorActive && (item.type === 'student' || item.type === 'teacher')) continue;
                 candidates.push({
                     type: 'legacy_text',
                     obj: item,
                     priority: 1
                 });
             }
         }
    }

    // Check for nearby cabinets by proximity (reliable, like desks)
    const nearbyCabinets = room.furniture.filter(f => f.id === 'left_cabinet' || f.id === 'right_cabinet');
    for (const cab of nearbyCabinets) {
        const cabCX = cab.x + cab.width / 2;
        const cabCY = cab.y + cab.height / 2;
        const cabDist = Math.hypot(player.x - cabCX, player.y - cabCY);
        if (cabDist < 100) {
            candidates.push({
                type: 'furniture',
                obj: cab,
                index: room.furniture.indexOf(cab),
                priority: 10
            });
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

        // Locked classroom door
        if (currentLevelName === 'classroom' && door.id === 'door_class_to_hall' && !playData.worldState.classroomDoorUnlocked) {
            // Check if holding door_key
            const activeItem = isInventoryOpen && playData.inventory[playData.activeSlot];
            if (activeItem && activeItem.id === 'door_key') {
                playData.worldState.classroomDoorUnlocked = true;
                playData.inventory[playData.activeSlot] = null;
                playData.worldState.leftCabinetDoorKeyTaken = true;
                updateInventoryUI();
                showTemporaryDialogue("The door is now unlocked!", "LUKE");
                savePlayState();
                return;
            }
            showTemporaryDialogue("The door is locked. I need a key to open it.", "LUKE");
            return;
        }

        if (currentLevelName === 'principal_office' && playData.worldState.horrorActive && door.id === 'door_principal_to_hallway') {
            triggerDeath('door_exit');
            return;
        }

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

        if (item.type === 'vent' && currentLevelName === 'principal_office') {
            officeTimer.active = false;
            startVentCrawlCutscene();
            return;
        }

        // Wall switch toggles secret room lights
        if (item.type === 'wall_switch' && item.id === 'secret_room_light_switch') {
            playData.worldState.secretRoomLightOn = !playData.worldState.secretRoomLightOn;
            const msg = playData.worldState.secretRoomLightOn ? "Light turned on." : "Light turned off.";
            showTemporaryDialogue(msg, "LUKE");
            savePlayState();
            return;
        }

        // --- POV Cabinet Logic ---
        const isKeySelected = isInventoryOpen && playData.inventory[playData.activeSlot] && playData.inventory[playData.activeSlot].id === 'cabinet_key';
        const isLeftCabinetUnlocked = Boolean(playData.worldState.leftCabinetUnlocked);

        if (item.id === 'left_cabinet') {
             if (isLeftCabinetUnlocked || isKeySelected) {
                  if (!isLeftCabinetUnlocked) {
                      playData.worldState.leftCabinetUnlocked = true;
                      playData.inventory[playData.activeSlot] = null;
                      updateInventoryUI();
                  }
                  openLeftCabinetPOV();
                  savePlayState();
                  return;
             }
             showTemporaryDialogue("It's locked.", "LUKE");
             return;
        } else if (isKeySelected && (item.type === 'cupboard' || item.type === 'locker' || item.type === 'chest' || item.type === 'door')) {
             // Tried to use key on wrong storage/door
             showTemporaryDialogue("This key doesn't fit.", "LUKE");
             return;
        }

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

function syncLeftCabinetPOV() {
    const povNote = document.getElementById('pov-note');
    const povKey = document.getElementById('pov-key');

    if (povNote) {
        const noteTaken = Boolean(playData.worldState.leftCabinetNoteTaken) ||
            playData.inventory.some(item => item && item.id === 'secret_note');
        povNote.classList.toggle('picked-up', noteTaken);
    }

    if (povKey) {
        const keyTaken = Boolean(playData.worldState.leftCabinetDoorKeyTaken) ||
            playData.inventory.some(item => item && item.id === 'door_key');
        povKey.classList.toggle('picked-up', keyTaken);
    }
}

function openLeftCabinetPOV() {
    playData.povActive = true;
    syncLeftCabinetPOV();
    document.getElementById('pov-container').classList.remove('hidden');
}

// ── Inventory HUD Positioning ──
function positionInventoryHUD() {
    const hud = document.getElementById('inventory-hud');
    const frame = document.querySelector('.frame');
    if (!hud || !frame) return;
    const frameRect = frame.getBoundingClientRect();
    hud.style.left = (frameRect.left - 70) + 'px'; // 70px = slot width + gap
}
window.addEventListener('resize', positionInventoryHUD);
positionInventoryHUD();

// ── Help and Inventory UI Updaters ──
function toggleHelpScreen() {
    const helpScreen = document.getElementById('help-screen');
    if (helpScreen) helpScreen.classList.toggle('hidden');
}

function updateInventoryUI() {
    const hud = document.getElementById('inventory-hud');
    if (!hud) return;

    if (isInventoryOpen) {
        hud.classList.remove('hidden');
    } else {
        hud.classList.add('hidden');
        return; // Don't need to update DOM if hidden
    }

    for (let i = 0; i < 4; i++) {
        const slotEl = document.getElementById(`slot-${i}`);
        if (!slotEl) continue;

        // Active State
        if (i === playData.activeSlot) {
            slotEl.classList.add('active');
        } else {
            slotEl.classList.remove('active');
        }

        // Item Icon
        const item = playData.inventory[i];
        slotEl.innerHTML = ''; // Clear
        slotEl.setAttribute('data-slot', i + 1);

        if (item) {
            const iconEl = document.createElement('div');
            iconEl.className = 'inv-item';
            // Placeholder: Use text emoji if provided, else just style
            if (item.icon) {
                iconEl.textContent = item.icon;
                iconEl.style.fontSize = '24px';
                iconEl.style.textAlign = 'center';
                iconEl.style.lineHeight = '32px';
            }
            iconEl.title = item.name;
            slotEl.appendChild(iconEl);
        }
    }
}

document.addEventListener("keydown", (event) => {
  if (playData.povActive && event.key === "Escape") {
      playData.povActive = false;
      document.getElementById('pov-container').classList.add('hidden');
      return;
  }
  
  if (playData.povActive) return; // Disable movement/interaction in POV

  const key = event.key.toLowerCase();
  
  // UI Toggles
  if (key === 'i' && document.activeElement.tagName !== 'INPUT') {
      toggleHelpScreen();
      return;
  }
  if (key === 'e' && document.activeElement.tagName !== 'INPUT') {
      isInventoryOpen = !isInventoryOpen;
      updateInventoryUI();
      positionInventoryHUD();
      return;
  }
  
  // Inventory Slots (1-4)
  if (['1', '2', '3', '4'].includes(key) && isInventoryOpen && document.activeElement.tagName !== 'INPUT') {
      playData.activeSlot = parseInt(key) - 1;
      updateInventoryUI();
      return;
  }

  // X Key: Use Active Item
  if (key === 'x' && document.activeElement.tagName !== 'INPUT') {
      useActiveItem();
      return;
  }

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

// ── Player Zoom & Inventory Scroll Controls ──
canvas.addEventListener("wheel", (e) => {
    // Inventory scrolling
    if (isInventoryOpen) {
        e.preventDefault();
        if (e.deltaY < 0) {
            playData.activeSlot = (playData.activeSlot - 1 + 4) % 4; // Scroll up -> previous slot
        } else {
            playData.activeSlot = (playData.activeSlot + 1) % 4; // Scroll down -> next slot
        }
        updateInventoryUI();
        return;
    }

    // Don't zoom during cutscenes, dev mode, or death
    if (cutscene && cutscene.active) return;
    if (isDeveloperMode) return;
    if (deathSequence && deathSequence.active) return;
    if (!isGameActive) return;
    if (playData.povActive) return;

    e.preventDefault();
    if (e.deltaY < 0) {
        // Scroll up = zoom in
        userZoom = Math.min(USER_ZOOM_MAX, userZoom + USER_ZOOM_STEP);
    } else {
        // Scroll down = zoom out
        userZoom = Math.max(USER_ZOOM_MIN, userZoom - USER_ZOOM_STEP);
    }
}, { passive: false });

// Keyboard zoom: + and - keys
document.addEventListener("keydown", (e) => {
    if (cutscene && cutscene.active) return;
    if (isDeveloperMode) return;
    if (!isGameActive) return;
    if (document.activeElement.tagName === 'INPUT') return;

    if (e.key === '=' || e.key === '+') {
        userZoom = Math.min(USER_ZOOM_MAX, userZoom + USER_ZOOM_STEP);
    } else if (e.key === '-' || e.key === '_') {
        userZoom = Math.max(USER_ZOOM_MIN, userZoom - USER_ZOOM_STEP);
    }
});

// ── POV Interactions ──
(function setupPOV() {
    const povNote = document.getElementById('pov-note');
    const povKey = document.getElementById('pov-key');
    const closeBtn = document.getElementById('btn-close-pov');
    const noteOverlay = document.getElementById('note-overlay');
    const closeNote = document.getElementById('btn-close-note');

    // Close POV button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            playData.povActive = false;
            document.getElementById('pov-container').classList.add('hidden');
            savePlayState();
        });
    }

    // Pick up Note
    if (povNote) {
        povNote.addEventListener('click', () => {
            const emptySlot = playData.inventory.findIndex(s => s === null);
            if (emptySlot !== -1) {
                playData.inventory[emptySlot] = { id: 'secret_note', name: 'Mysterious Letter', icon: '📝' };
                playData.worldState.leftCabinetNoteTaken = true;
                updateInventoryUI();
                povNote.classList.add('picked-up');
                showTemporaryDialogue("Obtained Mysterious Letter.", "SYSTEM");
                savePlayState();
            } else {
                showTemporaryDialogue("Inventory Full!", "SYSTEM");
            }
        });
    }

    // Pick up Door Key
    if (povKey) {
        povKey.addEventListener('click', () => {
            const emptySlot = playData.inventory.findIndex(s => s === null);
            if (emptySlot !== -1) {
                playData.inventory[emptySlot] = { id: 'door_key', name: 'Door Key', icon: '🗝️' };
                playData.worldState.leftCabinetDoorKeyTaken = true;
                updateInventoryUI();
                povKey.classList.add('picked-up');
                showTemporaryDialogue("Obtained Door Key.", "SYSTEM");
                savePlayState();
            } else {
                showTemporaryDialogue("Inventory Penuh!", "SYSTEM");
            }
        });
    }

    // Close Note Overlay
    if (closeNote) {
        closeNote.addEventListener('click', () => {
            noteOverlay.classList.add('hidden');
        });
    }
    syncLeftCabinetPOV();
})();

// ── X Key: Use Active Item (for reading/inspecting only) ──
function useActiveItem() {
    if (!isInventoryOpen) {
        showTemporaryDialogue("Open inventory first! (press E)", "SYSTEM");
        return;
    }
    const item = playData.inventory[playData.activeSlot];
    if (!item) {
        showTemporaryDialogue("Empty slot.", "SYSTEM");
        return;
    }

    if (item.id === 'secret_note') {
        document.getElementById('note-overlay').classList.remove('hidden');
        return;
    }

    showTemporaryDialogue("I can't use this directly.", "LUKE");
}

// Create zoom buttons UI
(function createZoomUI() {
    const container = document.createElement("div");
    container.id = "zoom-controls";
    container.style.cssText = `
        position: absolute; bottom: 80px; right: 16px; z-index: 900;
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        opacity: 0.7; transition: opacity 0.2s;
        pointer-events: auto;
    `;
    container.addEventListener("mouseenter", () => container.style.opacity = "1");
    container.addEventListener("mouseleave", () => container.style.opacity = "0.7");

    const btnStyle = `
        width: 36px; height: 36px; border: 2px solid rgba(255,255,255,0.3);
        background: rgba(30,30,30,0.8); color: #fff; font-size: 20px;
        cursor: pointer; border-radius: 6px; display: flex; align-items: center;
        justify-content: center; font-family: 'VT323', monospace; user-select: none;
    `;

    const btnIn = document.createElement("button");
    btnIn.textContent = "+";
    btnIn.style.cssText = btnStyle;
    btnIn.title = "Zoom In (scroll up / +)";
    btnIn.onclick = (e) => {
        e.stopPropagation();
        if (cutscene && cutscene.active) return;
        userZoom = Math.min(USER_ZOOM_MAX, userZoom + USER_ZOOM_STEP);
    };

    const label = document.createElement("div");
    label.id = "zoom-label";
    label.style.cssText = `
        color: #ccc; font-size: 12px; font-family: 'VT323', monospace;
        text-align: center; min-width: 36px;
    `;
    label.textContent = "1.0x";

    const btnOut = document.createElement("button");
    btnOut.textContent = "−";
    btnOut.style.cssText = btnStyle;
    btnOut.title = "Zoom Out (scroll down / -)";
    btnOut.onclick = (e) => {
        e.stopPropagation();
        if (cutscene && cutscene.active) return;
        userZoom = Math.max(USER_ZOOM_MIN, userZoom - USER_ZOOM_STEP);
    };

    container.appendChild(btnIn);
    container.appendChild(label);
    container.appendChild(btnOut);
    document.body.appendChild(container);

    // Update label periodically
    setInterval(() => {
        const lbl = document.getElementById("zoom-label");
        if (lbl) lbl.textContent = userZoom.toFixed(1) + "x";
        const ctrl = document.getElementById("zoom-controls");
        if (ctrl) {
            ctrl.style.display = (isGameActive && !isDeveloperMode) ? "flex" : "none";
        }
    }, 200);
})();

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
  initAudio();
  isGameActive = true;
  document.getElementById("start-screen").style.display = "none";
  if (!playData.introSeen) {
      dialogue = JSON.parse(JSON.stringify(introDialogue));
      stage = 0;
      updateDialogue();
  }
  updateSoundtrack();
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
                // Merge any missing levels from initialGameData (e.g. newly added rooms)
                const baseKeys = Object.keys(window.initialGameData.levels);
                // Always force-refresh classroom to ensure left_cabinet id
                const forceRefresh = ['classroom'];
                for (const key of baseKeys) {
                    // Check if level is missing or structurally empty (no furniture)
                    if (forceRefresh.includes(key) || !levels[key] || (levels[key] && levels[key].furniture.length === 0 && window.initialGameData.levels[key].furniture.length > 0)) {
                        levels[key] = JSON.parse(JSON.stringify(window.initialGameData.levels[key]));
                    }
                }
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

// Hidden Dev Mode: type Ctrl + D E V E to reveal
(function() {
    const secret = ['d', 'e', 'v', 'e'];
    let buffer = [];
    let resetTimer = null;
    document.addEventListener('keydown', (e) => {
        if (!e.ctrlKey) return;
        // Only on start screen
        const startScreen = document.getElementById('start-screen');
        if (!startScreen || startScreen.style.display === 'none') return;

        e.preventDefault();
        buffer.push(e.key.toLowerCase());
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { buffer = []; }, 2000);

        if (buffer.length >= secret.length) {
            const last4 = buffer.slice(-4);
            if (last4.join('') === secret.join('')) {
                document.getElementById('btn-dev').style.display = '';
                buffer = [];
            }
        }
    });
})();

document.getElementById("btn-play").addEventListener("click", () => {
  isDeveloperMode = false;
  deathSequence = null;
  officeTimer.active = false;
  checkpointBeforeLecture = null;
  particles = [];
  cutscene = null;
  // New Game: Reset Play Data
  playData = {
      player: { x: 0, y: 0, room: Object.keys(levels)[0] || 'classroom', facing: 'down' },
      worldState: {},
      inventory: [null, null, { id: 'cabinet_key', name: 'Cabinet Key', icon: '🔑' }, null],
      activeSlot: 0,
      povActive: false,
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

function hydratePersistentUnlockState() {
    if (!playData.worldState) playData.worldState = {};
    if (!Array.isArray(playData.inventory)) playData.inventory = [];

    const hasCabinetKey = playData.inventory.some(item => item && item.id === 'cabinet_key');
    const hasSecretNote = playData.inventory.some(item => item && item.id === 'secret_note');
    const hasDoorKey = playData.inventory.some(item => item && item.id === 'door_key');

    if (hasSecretNote) {
        playData.worldState.leftCabinetNoteTaken = true;
    }

    if (hasDoorKey || playData.worldState.classroomDoorUnlocked) {
        playData.worldState.leftCabinetDoorKeyTaken = true;
    }

    if (!playData.worldState.leftCabinetUnlocked) {
        const cabinetWasClearlyUsed =
            playData.worldState.leftCabinetNoteTaken ||
            playData.worldState.leftCabinetDoorKeyTaken ||
            playData.worldState.classroomDoorUnlocked ||
            hasSecretNote ||
            hasDoorKey;

        if (!hasCabinetKey && cabinetWasClearlyUsed) {
            playData.worldState.leftCabinetUnlocked = true;
        }
    }
}

function loadPlayState() {
    try {
        const json = localStorage.getItem('helios_play_data');
        if (json) {
            playData = JSON.parse(json);
            hydratePersistentUnlockState();
            // Load Level
            if (playData.player.room) {
                loadLevel(playData.player.room);
                player.x = playData.player.x;
                player.y = playData.player.y;
                player.facing = playData.player.facing;
            }
            if (typeof updateInventoryUI === 'function') updateInventoryUI();
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
