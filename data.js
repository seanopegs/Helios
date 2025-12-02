window.initialGameData = {
  dialogue: [
    { text: "okay Luke", speaker: "LUKE" },
    { text: "this is your final chance", speaker: "LUKE" },
    { text: "Use WASD to reach the door at the top.", speaker: "" }
  ],
  levels: {
    classroom: {
      width: 680,
      height: 520,
      wallHeight: 96,
      padding: 32,
      theme: 'dorm',
      doors: [
        { x: 308, y: 18, width: 64, height: 80, orientation: 'top', target: 'hallway', targetSpawn: { x: 1282, y: 440 } }
      ],
      spawn: { x: 340, y: 400 },
      furniture: [
        { type: 'rug', x: 150, y: 220, width: 80, height: 120, color: "#a1887f" },
        { type: 'rug', x: 450, y: 220, width: 80, height: 120, color: "#a1887f" },
        { type: 'cupboard', x: 40, y: 50, width: 60, height: 90 },
        { type: 'cupboard', x: 580, y: 50, width: 60, height: 90 },
        { type: 'desk', x: 460, y: 140, width: 90, height: 50, hasLaptop: true, hasLamp: true },
        { type: 'shelf', x: 130, y: 40, width: 60, height: 30 },
        { type: 'shelf', x: 490, y: 40, width: 60, height: 30 },
        { type: 'bed', x: 40, y: 180, width: 60, height: 100 },
        { type: 'desk', x: 40, y: 290, width: 60, height: 60, hasLaptop: true, hasLamp: true },
        { type: 'bed', x: 40, y: 360, width: 60, height: 100 },
        { type: 'bed', x: 580, y: 180, width: 60, height: 100 },
        { type: 'desk', x: 580, y: 290, width: 60, height: 60, hasLaptop: true, hasLamp: true },
        { type: 'bed', x: 580, y: 360, width: 60, height: 100 },
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
        { x: 1258, y: 440, width: 54, height: 80, orientation: 'bottom', target: 'classroom', targetSpawn: { x: 340, y: 130 } },
        { x: 24, y: 220, width: 54, height: 90, orientation: 'left', target: 'lecture', targetSpawn: { x: 842, y: 224 } }
      ],
      spawn: { x: 1282, y: 440 },
      furniture: [
        { type: 'locker', x: 100, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 140, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 180, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 500, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 540, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 580, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 900, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 940, y: 36, width: 40, height: 80 },
        { type: 'locker', x: 980, y: 36, width: 40, height: 80 },
        { type: 'window', x: 300, y: 20, width: 100, height: 50 },
        { type: 'window', x: 700, y: 20, width: 100, height: 50 },
        { type: 'window', x: 1100, y: 20, width: 100, height: 50 }
      ]
    },
    lecture: {
      width: 960,
      height: 820,
      wallHeight: 110,
      padding: 32,
      theme: 'classroom',
      doors: [
        { x: 870, y: 180, width: 64, height: 88, orientation: 'right', target: 'hallway', targetSpawn: { x: 122, y: 262 } }
      ],
      spawn: { x: 460, y: 520 },
      furniture: [
        { type: 'whiteboard', x: 340, y: 30, width: 240, height: 60 },
        { type: 'table', x: 400, y: 150, width: 120, height: 60 },
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
        { type: 'desk', variant: 'study', x: 180, y: 440, width: 70, height: 60, id: 'player_seat' },
        { type: 'desk', variant: 'study', x: 340, y: 440, width: 70, height: 60 },
        { type: 'student', x: 363, y: 474, width: 24, height: 36, variant: 'boy', shirt: '#4db6ac', text: "Hey Luke!" },
        { type: 'desk', variant: 'study', x: 500, y: 440, width: 70, height: 60 },
        { type: 'student', x: 523, y: 474, width: 24, height: 36, variant: 'girl', shirt: '#f06292', text: "Nice weather today." },
        { type: 'desk', variant: 'study', x: 660, y: 440, width: 70, height: 60 },
        { type: 'student', x: 683, y: 474, width: 24, height: 36, variant: 'boy', shirt: '#9575cd', text: "I'm hungry." },
        { type: 'locker', x: 200, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 250, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 300, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 350, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 560, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 610, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 660, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 710, y: 700, width: 50, height: 100 },
        { type: 'rug', x: 420, y: 720, width: 120, height: 80, color: "#607d8b" }
      ]
    }
  }
};
