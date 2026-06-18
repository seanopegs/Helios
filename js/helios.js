/* =====================================================================
 * HELIOS - A top-down 2D adventure game set in a quiet school.
 * Single-file source so the game runs by opening index.html directly.
 * ===================================================================== */

/* =====================================================================
 * SECTION 1: ASSET MANIFEST
 * ===================================================================== */
const Helios = window.Helios = window.Helios || {};

Helios.Assets = Object.freeze({
  images: Object.freeze({
    menuBackground: "assets/images/menu/quiet-school-hall.svg",
    uiFrame: "assets/images/ui/panel-frame.svg",
    favicon: "assets/images/ui/favicon.svg"
  })
});

/* =====================================================================
 * SECTION 2: GAME DATA
 * - All room definitions and story content live here.
 * - These are pure data so they are easy to read and tweak.
 * ===================================================================== */
Helios.Story = {
  SECRET_NOTE_CODE: "4173",

  introDialogue: [
    { text: "okay Luke", speaker: "LUKE" },
    { text: "this is your final chance", speaker: "LUKE" }
  ],

  startingRoom: "classroom",

  defaultLetter: {
    paperClass: "",
    contentClass: "",
    label: "",
    title: "",
    paragraphs: [
      "Luke,",
      "I know you've been looking for it. Don't stop.",
      "There are things deliberately hidden from you. But you're closer than you think.",
      "We need to talk. Library, 2nd floor. Come alone.",
      "Don't trust what's in plain sight. Pay attention to what's hidden."
    ],
    footer: "- ???",
    backTitle: "Back Side",
    backParagraphs: [
      "The numbers were scribbled in a hurry."
    ],
    code: "4173",
    backHint: "\"Use this only after the wood gives way.\"",
    canFlip: true,
    closeLabel: "Close Letter",
    flipLabel: "Flip Paper"
  },

  ruinedClassroomRequiredReads: 4,

  ruinedClassroomNoteLayouts: [
    { x: 132, y: 164, width: 44, height: 54, rotation: -15 },
    { x: 334, y: 166, width: 42, height: 52, rotation: 11 },
    { x: 552, y: 170, width: 44, height: 54, rotation: -8 },
    { x: 162, y: 414, width: 42, height: 52, rotation: 13 },
    { x: 392, y: 428, width: 44, height: 52, rotation: -10 },
    { x: 618, y: 420, width: 42, height: 52, rotation: 9 },
    { x: 748, y: 452, width: 40, height: 50, rotation: -6 }
  ],

  ruinedClassroomDecorativePapers: [
    { x: 250, y: 232, width: 30, height: 38, rotation: 6, variant: "report" },
    { x: 458, y: 248, width: 28, height: 34, rotation: -4, variant: "warning" },
    { x: 700, y: 232, width: 30, height: 36, rotation: 10, variant: "photo" },
    { x: 286, y: 474, width: 28, height: 34, rotation: -12, variant: "report" },
    { x: 666, y: 490, width: 30, height: 36, rotation: 5, variant: "scrawl" }
  ],

  ruinedClassroomDocuments: [
    {
      id: "class_photo",
      paperClass: "note-paper--document",
      contentClass: "note-content--report",
      label: "Recovered Photo",
      title: "Homeroom 7-B",
      paragraphs: [
        "The desks in the picture match this room exactly.",
        "Every face is blurred except the boy in the green sweater.",
        "Someone circled the empty seat beside him in red ink."
      ],
      photo: { style: "classroom", caption: "\"The one on the far left disappears first.\"" }
    },
    {
      id: "teacher_observation",
      paperClass: "note-paper--document note-paper--report",
      contentClass: "note-content--report",
      label: "Observation Report",
      title: "Subject: Luke",
      paragraphs: [
        "Subject claims he has already sat in this room before.",
        "When asked to identify the missing students, subject named himself first.",
        "Recommendation: continue exposure until recognition becomes unavoidable."
      ]
    },
    {
      id: "child_warning",
      paperClass: "note-paper--document note-paper--scrawl",
      contentClass: "note-content--scrawl",
      label: "Found Under Desk",
      title: "Do not make me sit there again",
      paragraphs: [
        "I do not want the front seat.",
        "Something under the desk keeps touching my ankle when the lights blink.",
        "It knows my name before the teacher says it."
      ]
    },
    {
      id: "attendance_sheet",
      paperClass: "note-paper--document note-paper--report",
      contentClass: "note-content--report",
      label: "Attendance Ledger",
      title: "Class Register",
      paragraphs: [
        "Every name has been crossed out in red except one.",
        "Luke is written again at the bottom in a different hand.",
        "Beside it: \"returned after memory reset.\""
      ]
    },
    {
      id: "medical_log",
      paperClass: "note-paper--document note-paper--report",
      contentClass: "note-content--report",
      label: "Clinical Notes",
      title: "Dissociation Event",
      paragraphs: [
        "Subject hears pages turning when no books are present.",
        "Mention of the library causes immediate distress and involuntary recall.",
        "Patient insists the door becomes farther away after midnight."
      ]
    },
    {
      id: "hallway_polaroid",
      paperClass: "note-paper--document",
      contentClass: "note-content--report",
      label: "Polaroid",
      title: "Left Hallway",
      paragraphs: [
        "The corridor in the photograph should not fit inside this building.",
        "A door waits at the far end, small as a thumbnail.",
        "Written on the border: \"Do not look back while walking.\""
      ],
      photo: { style: "hallway", caption: "Taken from the left door. The exit looks farther in every copy." }
    },
    {
      id: "red_warning",
      paperClass: "note-paper--document note-paper--warning",
      contentClass: "note-content--warning",
      label: "Warning",
      title: "Do not stop counting",
      paragraphs: [
        "Count the desks.",
        "Count the heads.",
        "If the numbers do not match, keep your eyes on the floor until the noise stops."
      ]
    },
    {
      id: "repetition_page",
      paperClass: "note-paper--document note-paper--scrawl",
      contentClass: "note-content--scrawl",
      label: "Exercise Sheet",
      title: "Library library library",
      paragraphs: [
        "The whole page is filled with the same word, written harder each line.",
        "Near the bottom the handwriting changes.",
        "The final sentence reads: \"go now before he notices you remember.\""
      ]
    },
    {
      id: "prediction_sheet",
      paperClass: "note-paper--document note-paper--warning",
      contentClass: "note-content--warning",
      label: "Prediction",
      title: "Sequence",
      paragraphs: [
        "He will read four pages.",
        "Then he will stand near the left door and wait for it to breathe.",
        "When it opens, he will pretend he has never seen the hallway before."
      ]
    },
    {
      id: "self_letter",
      paperClass: "note-paper--document note-paper--scrawl",
      contentClass: "note-content--scrawl",
      label: "Folded Note",
      title: "If you are reading this",
      paragraphs: [
        "They managed to make you forget again.",
        "You left this room once already and still came back.",
        "Whatever is in the library is the reason you keep returning here."
      ],
      footer: "- Luke"
    },
    {
      id: "library_intake",
      paperClass: "note-paper--document note-paper--report",
      contentClass: "note-content--report",
      label: "Intake Summary",
      title: "Archive Transfer",
      paragraphs: [
        "Subject moved from classroom staging area to library containment wing.",
        "Memory degradation remained unstable after repeated exposure to shelf 19.",
        "New instruction: do not allow the subject to see his own photograph twice."
      ]
    },
    {
      id: "portrait_photo",
      paperClass: "note-paper--document",
      contentClass: "note-content--report",
      label: "Damaged Portrait",
      title: "Identification",
      paragraphs: [
        "The face in the picture has been scratched away except for the eyes.",
        "The eyes still match yours.",
        "On the back: \"He only recognizes himself in pieces.\""
      ],
      photo: { style: "portrait", caption: "The frame is cracked from the inside." }
    }
  ]
};

Helios.Story.ruinedClassroomCoreDocumentIds = ["prediction_sheet", "self_letter"];
Helios.Story.ruinedClassroomDocumentMap = Object.fromEntries(
  Helios.Story.ruinedClassroomDocuments.map((doc) => [doc.id, doc])
);

/* ---------- ROOM DEFINITIONS ---------- */
Helios.Rooms = {
  classroom: {
    width: 680, height: 520, wallHeight: 96, padding: 32, theme: "dorm",
    doors: [
      { id: "door_class_to_hall", x: 308, y: 18, width: 64, height: 80,
        orientation: "top", target: "hallway", targetDoorId: "door_hall_to_class" }
    ],
    spawn: { x: 340, y: 400 },
    furniture: [
      { type: "rug", x: 150, y: 220, width: 80, height: 120, color: "#a1887f" },
      { type: "rug", x: 450, y: 220, width: 80, height: 120, color: "#a1887f" },
      { id: "left_cabinet", type: "cupboard", x: 40, y: 50, width: 60, height: 90 },
      { type: "cupboard", x: 580, y: 50, width: 60, height: 90, id: "right_cabinet",
        interaction: { enabled: true, type: "sequence", priority: 5,
          conversations: [[{ speaker: "LUKE", text: "This cabinet is empty... nothing here." }]],
          area: { x: -10, y: -10, width: 80, height: 110 } } },
      { type: "desk", x: 460, y: 140, width: 90, height: 50, hasLaptop: true, hasLamp: true },
      { type: "shelf", x: 130, y: 40, width: 60, height: 30 },
      { type: "shelf", x: 490, y: 40, width: 60, height: 30 },
      { type: "bed", x: 40, y: 180, width: 60, height: 100 },
      { type: "desk", x: 40, y: 290, width: 60, height: 60, hasLaptop: true, hasLamp: true },
      { type: "bed", x: 40, y: 360, width: 60, height: 100 },
      { type: "bed", x: 580, y: 180, width: 60, height: 100 },
      { type: "desk", x: 580, y: 290, width: 60, height: 60, hasLaptop: true, hasLamp: true },
      { type: "bed", x: 580, y: 360, width: 60, height: 100 },
      { type: "chest", x: 270, y: 250, width: 140, height: 70 }
    ]
  },

  hallway: {
    width: 1400, height: 520, wallHeight: 96, padding: 32, theme: "hall",
    doors: [
      { id: "door_hall_to_class", x: 1258, y: 440, width: 54, height: 80,
        orientation: "bottom", target: "classroom", targetDoorId: "door_class_to_hall" },
      { id: "door_hall_to_lecture", x: 24, y: 220, width: 54, height: 90,
        orientation: "left", target: "lecture", targetDoorId: "door_lecture_to_hall" }
    ],
    spawn: { x: 1282, y: 440 },
    furniture: [
      { type: "locker", x: 100, y: 36, width: 40, height: 80 },
      { type: "locker", x: 140, y: 36, width: 40, height: 80 },
      { type: "locker", x: 180, y: 36, width: 40, height: 80 },
      { type: "locker", x: 500, y: 36, width: 40, height: 80 },
      { type: "locker", x: 540, y: 36, width: 40, height: 80 },
      { type: "locker", x: 580, y: 36, width: 40, height: 80 },
      { type: "locker", x: 900, y: 36, width: 40, height: 80 },
      { type: "locker", x: 940, y: 36, width: 40, height: 80 },
      { type: "locker", x: 980, y: 36, width: 40, height: 80 },
      { type: "window", x: 300, y: 20, width: 100, height: 50 },
      { type: "window", x: 700, y: 20, width: 100, height: 50 },
      { type: "window", x: 1100, y: 20, width: 100, height: 50 },
      { type: "student", x: 280, y: 120, width: 24, height: 36, variant: "boy", shirt: "#81c784", name: "JOSH",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "JOSH", text: "Where is the library again?!" }, { speaker: "MIA", text: "I think it is upstairs." }]] } },
      { type: "student", x: 320, y: 120, width: 24, height: 36, variant: "girl", shirt: "#f48fb1", name: "MIA",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "MIA", text: "We are going to be late." }, { speaker: "JOSH", text: "Chill, it is fine." }]] } },
      { type: "student", x: 450, y: 150, width: 24, height: 36, variant: "boy", shirt: "#64b5f6", name: "KYLE",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "KYLE", text: "Did you see that new game?" }, { speaker: "DAN", text: "Yeah it looks awesome." }, { speaker: "SUE", text: "You guys are nerds." }]] } },
      { type: "student", x: 490, y: 150, width: 24, height: 36, variant: "boy", shirt: "#ffb74d", name: "DAN",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "DAN", text: "I want to play it tonight." }, { speaker: "KYLE", text: "Let's co-op!" }]] } },
      { type: "student", x: 470, y: 190, width: 24, height: 36, variant: "girl", shirt: "#e57373", name: "SUE",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "SUE", text: "I have so much homework to do..." }]] } },
      { type: "student", x: 740, y: 240, width: 24, height: 36, variant: "girl", shirt: "#ce93d8", name: "LISA",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "LISA", text: "This class is so boring." }, { speaker: "JEN", text: "I know right?" }, { speaker: "TOM", text: "Shh keep it down." }]] } },
      { type: "student", x: 780, y: 250, width: 24, height: 36, variant: "girl", shirt: "#80cbc4", name: "JEN",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "JEN", text: "Did you understand the math assignment?" }, { speaker: "LISA", text: "Not at all." }]] } },
      { type: "student", x: 760, y: 200, width: 24, height: 36, variant: "boy", shirt: "#ffab91", name: "TOM",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "TOM", text: "I literally slept through chapter 4." }]] } },
      { type: "student", x: 1040, y: 140, width: 24, height: 36, variant: "boy", shirt: "#90caf9", name: "SAM",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "SAM", text: "Did you do the homework?" }, { speaker: "KIM", text: "Whoops..." }]] } },
      { type: "student", x: 1080, y: 140, width: 24, height: 36, variant: "girl", shirt: "#ffcc80", name: "KIM",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "KIM", text: "I will just copy yours." }, { speaker: "SAM", text: "No way!" }]] } },
      { type: "student", x: 100, y: 220, width: 24, height: 36, variant: "girl", shirt: "#a5d6a7", name: "BETH",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "BETH", text: "I am so tired." }]] } },
      { type: "student", x: 230, y: 320, width: 24, height: 36, variant: "boy", shirt: "#bcaaa4", name: "RYAN",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "RYAN", text: "Is it lunch time yet?" }]] } },
      { type: "student", x: 620, y: 380, width: 24, height: 36, variant: "girl", shirt: "#ef9a9a", name: "CHLOE",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "CHLOE", text: "Nice weather today." }]] } },
      { type: "student", x: 930, y: 360, width: 24, height: 36, variant: "boy", shirt: "#9fa8da", name: "ALEX",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "ALEX", text: "I need coffee." }]] } },
      { type: "student", x: 970, y: 360, width: 24, height: 36, variant: "girl", shirt: "#fff59d", name: "EMMA",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "EMMA", text: "Let's go to the cafeteria." }, { speaker: "ALEX", text: "Good idea." }]] } },
      { type: "student", x: 1150, y: 280, width: 24, height: 36, variant: "boy", shirt: "#64ffda", name: "ZACK",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "ZACK", text: "I forgot my locker combination." }]] } },
      { type: "student", x: 1190, y: 280, width: 24, height: 36, variant: "boy", shirt: "#b0bec5", name: "LUIS",
        interaction: { enabled: true, type: "sequence", conversations: [[{ speaker: "LUIS", text: "Again? You literally wrote it down!" }, { speaker: "ZACK", text: "I lost the paper..." }]] } }
    ]
  },

  lecture: {
    width: 960, height: 820, wallHeight: 110, padding: 32, theme: "classroom",
    doors: [
      { id: "door_lecture_to_hall", x: 870, y: 180, width: 64, height: 88,
        orientation: "right", target: "hallway", targetDoorId: "door_hall_to_lecture" },
      { id: "door_lecture_to_principal_hall", x: 420, y: 690, width: 120, height: 130,
        orientation: "bottom", target: "principal_hallway", targetDoorId: "door_hall_to_lecture",
        prompt: "ke terowongan bawah" }
    ],
    spawn: { x: 460, y: 520 },
    furniture: [
      { type: "whiteboard", x: 340, y: 30, width: 240, height: 60 },
      { type: "table", x: 400, y: 150, width: 120, height: 60 },
      { type: "desk", variant: "study", x: 180, y: 240, width: 70, height: 60 },
      { type: "student", x: 203, y: 274, width: 24, height: 36, variant: "boy", shirt: "#e57373", name: "BEN", text: "Did you do the homework?", behavior: "sit" },
      { type: "desk", variant: "study", x: 340, y: 240, width: 70, height: 60 },
      { type: "student", x: 363, y: 274, width: 24, height: 36, variant: "girl", shirt: "#ba68c8", name: "LILY", text: "I love this subject!", behavior: "sit" },
      { type: "desk", variant: "study", x: 500, y: 240, width: 70, height: 60 },
      { type: "student", x: 523, y: 274, width: 24, height: 36, variant: "boy", shirt: "#64b5f6", name: "JOE", text: "Zzz...", behavior: "sit" },
      { type: "desk", variant: "study", x: 660, y: 240, width: 70, height: 60 },
      { type: "student", x: 683, y: 274, width: 24, height: 36, variant: "girl", shirt: "#81c784", name: "ANA", text: "Professor is late.", behavior: "sit" },
      { type: "desk", variant: "study", x: 180, y: 340, width: 70, height: 60 },
      { type: "student", x: 203, y: 374, width: 24, height: 36, variant: "girl", shirt: "#ffb74d", name: "KIM", text: "Can I borrow a pen?", behavior: "sit" },
      { type: "desk", variant: "study", x: 340, y: 340, width: 70, height: 60 },
      { type: "student", x: 363, y: 374, width: 24, height: 36, variant: "boy", shirt: "#a1887f", name: "LEO", text: "Focusing...", behavior: "sit" },
      { type: "desk", variant: "study", x: 500, y: 340, width: 70, height: 60 },
      { type: "student", x: 523, y: 374, width: 24, height: 36, variant: "girl", shirt: "#90a4ae", name: "EVE", text: "...", behavior: "sit" },
      { type: "desk", variant: "study", x: 660, y: 340, width: 70, height: 60 },
      { type: "student", x: 683, y: 374, width: 24, height: 36, variant: "boy", shirt: "#7986cb", name: "SAM", text: "When is lunch?", behavior: "sit" },
      { type: "desk", variant: "study", x: 180, y: 440, width: 70, height: 60, id: "player_seat" },
      { type: "desk", variant: "study", x: 340, y: 440, width: 70, height: 60 },
      { type: "student", x: 363, y: 474, width: 24, height: 36, variant: "boy", shirt: "#4db6ac", name: "MAX", text: "Hey Luke!", behavior: "sit" },
      { type: "desk", variant: "study", x: 500, y: 440, width: 70, height: 60 },
      { type: "student", x: 523, y: 474, width: 24, height: 36, variant: "girl", shirt: "#f06292", name: "ZOE", text: "Nice weather today.", behavior: "sit" },
      { type: "desk", variant: "study", x: 660, y: 440, width: 70, height: 60 },
      { type: "student", x: 683, y: 474, width: 24, height: 36, variant: "boy", shirt: "#9575cd", name: "IAN", text: "I'm hungry.", behavior: "sit" },
      { type: "locker", x: 170, y: 700, width: 50, height: 100 },
      { type: "locker", x: 220, y: 700, width: 50, height: 100 },
      { type: "locker", x: 270, y: 700, width: 50, height: 100 },
      { type: "locker", x: 320, y: 700, width: 50, height: 100 },
      { type: "locker", x: 590, y: 700, width: 50, height: 100 },
      { type: "locker", x: 640, y: 700, width: 50, height: 100 },
      { type: "locker", x: 690, y: 700, width: 50, height: 100 },
      { type: "locker", x: 740, y: 700, width: 50, height: 100 }
    ]
  },

  principal_hallway: {
    width: 400, height: 600, wallHeight: 96, padding: 32, theme: "hall",
    doors: [
      { id: "door_hall_to_lecture", x: 140, y: 18, width: 120, height: 80,
        orientation: "top", target: "lecture", targetDoorId: "door_lecture_to_principal_hall" },
      { id: "door_hall_to_principal", x: 168, y: 520, width: 64, height: 80,
        orientation: "bottom", target: "principal_office", targetDoorId: "door_principal_to_hallway",
        prompt: "to principal office" }
    ],
    spawn: { x: 200, y: 100 },
    furniture: [
      { type: "locker", x: 32, y: 140, width: 24, height: 240, orientation: "right" },
      { type: "locker", x: 344, y: 140, width: 24, height: 240, orientation: "left" }
    ]
  },

  principal_office: {
    width: 600, height: 600, wallHeight: 96, padding: 32, theme: "office",
    doors: [
      { id: "door_principal_to_hallway", x: 268, y: 18, width: 64, height: 80,
        orientation: "top", target: "principal_hallway", targetDoorId: "door_hall_to_principal" }
    ],
    spawn: { x: 300, y: 300 },
    furniture: [
      { type: "rug", x: 210, y: 220, width: 180, height: 160, color: "#4a148c", border: "#d4af37" },
      { type: "boss_desk", x: 200, y: 150, width: 200, height: 80, hasLamp: true, hasLaptop: true },
      { type: "bookshelf", x: 32, y: 112, width: 90, height: 120 },
      { type: "bookshelf", x: 478, y: 112, width: 90, height: 120 },
      { type: "sofa", x: 90, y: 350, width: 140, height: 60, color: "#3e2723" },
      { type: "sofa", x: 370, y: 350, width: 140, height: 60, color: "#3e2723" },
      { type: "plant", x: 126, y: 70, width: 36, height: 75, potColor: "#eceff1" },
      { type: "plant", x: 438, y: 70, width: 36, height: 75, potColor: "#eceff1" },
      { type: "plant", x: 36, y: 460, width: 36, height: 80, potColor: "#eceff1" },
      { type: "plant", x: 528, y: 460, width: 36, height: 80, potColor: "#eceff1" }
    ]
  },

  vent_tunnel: {
    width: 1400, height: 520, wallHeight: 0, padding: 0, theme: "office",
    doors: [],
    spawn: { x: 1300, y: 260 },
    furniture: []
  },

  secret_room: {
    width: 500, height: 500, wallHeight: 96, padding: 32, theme: "dorm",
    doors: [],
    spawn: { x: 250, y: 320 },
    furniture: [
      { type: "vent", id: "broken_vent_in", x: 188, y: 34, width: 58, height: 30 },
      { type: "debris", x: 198, y: 132, width: 38, height: 18 },
      { type: "chest", id: "secret_room_supply_chest", x: 52, y: 338, width: 84, height: 52,
        interaction: { enabled: true, type: "sequence", priority: 7, prompt: "to open the chest",
          conversations: [[{ speaker: "LUKE", text: "A wooden chest..." }]],
          area: { x: -16, y: -8, width: 116, height: 82 } } },
      { type: "floor_patch", id: "secret_room_loose_floorboards", x: 346, y: 384, width: 98, height: 68,
        interaction: { enabled: true, type: "sequence", priority: 5, prompt: "to inspect the floor",
          conversations: [[{ speaker: "LUKE", text: "These planks look a little different..." }]],
          area: { x: -12, y: -12, width: 122, height: 96 } } },
      { type: "padlocked_hatch", id: "secret_room_padlocked_hatch", x: 352, y: 368, width: 92, height: 82,
        interaction: { enabled: true, type: "sequence", priority: 8, prompt: "to inspect the hatch",
          conversations: [[{ speaker: "LUKE", text: "There is a padlock on it." }]],
          area: { x: -12, y: -18, width: 116, height: 112 } } },
      { type: "wall_switch", id: "secret_room_light_switch", x: 360, y: 38, width: 14, height: 24,
        interaction: { enabled: true, type: "sequence", priority: 5,
          conversations: [[{ speaker: "LUKE", text: "*klik*" }]],
          area: { x: -36, y: -12, width: 92, height: 110 } } }
    ]
  },

  ruined_classroom: {
    width: 880, height: 560, wallHeight: 110, padding: 32, theme: "classroom",
    doors: [
      { id: "door_ruined_to_secret", x: 18, y: 214, width: 64, height: 88,
        orientation: "left", target: "secret_room",
        targetSpawn: { x: 392, y: 360 },
        prompt: "back to the hidden room" }
    ],
    spawn: { x: 120, y: 260 },
    furniture: [
      { type: "whiteboard", x: 300, y: 28, width: 260, height: 60 },
      { type: "debris", x: 250, y: 102, width: 44, height: 20 },
      { type: "debris", x: 574, y: 92, width: 56, height: 24 },
      { type: "debris", x: 132, y: 420, width: 58, height: 20 },
      { type: "debris", x: 690, y: 438, width: 74, height: 24 },
      { type: "desk", variant: "study", x: 180, y: 184, width: 70, height: 60 },
      { type: "student", headless: true, x: 203, y: 218, width: 24, height: 36, variant: "boy", shirt: "#8d6e63", name: "MILO" },
      { type: "desk", variant: "study", x: 360, y: 184, width: 70, height: 60 },
      { type: "student", headless: true, x: 383, y: 218, width: 24, height: 36, variant: "girl", shirt: "#90a4ae", name: "KATE" },
      { type: "desk", variant: "study", x: 540, y: 184, width: 70, height: 60 },
      { type: "student", headless: true, x: 563, y: 218, width: 24, height: 36, variant: "boy", shirt: "#7986cb", name: "REY" },
      { type: "desk", variant: "study", x: 180, y: 304, width: 70, height: 60 },
      { type: "student", headless: true, x: 203, y: 338, width: 24, height: 36, variant: "girl", shirt: "#ef9a9a", name: "NIA" },
      { type: "desk", variant: "study", x: 360, y: 304, width: 70, height: 60 },
      { type: "student", headless: true, x: 383, y: 338, width: 24, height: 36, variant: "boy", shirt: "#4db6ac", name: "JULES" },
      { type: "desk", variant: "study", x: 540, y: 304, width: 70, height: 60 },
      { type: "student", headless: true, x: 563, y: 338, width: 24, height: 36, variant: "girl", shirt: "#ce93d8", name: "ARIA" },
      { type: "locker", x: 742, y: 130, width: 46, height: 98 },
      { type: "locker", x: 742, y: 230, width: 46, height: 98 },
      { type: "locker", x: 742, y: 330, width: 46, height: 98 },
      { type: "window", x: 120, y: 24, width: 90, height: 50 },
      { type: "window", x: 650, y: 24, width: 90, height: 50 }
    ]
  },

  endless_hallway: {
    width: 2200, height: 560, wallHeight: 96, padding: 32, theme: "hall",
    doors: [
      { id: "door_hallway_from_ruined", x: 2110, y: 214, width: 64, height: 88,
        orientation: "right", target: "ruined_classroom", targetDoorId: "door_ruined_to_secret",
        prompt: "back to the ruined classroom" },
      { id: "door_hallway_to_library", x: 18, y: 214, width: 64, height: 88,
        orientation: "left", target: "library_archive", targetDoorId: "door_library_from_hall",
        prompt: "to the library" }
    ],
    spawn: { x: 2064, y: 258 },
    furniture: [
      { type: "rug", x: 120, y: 206, width: 1920, height: 128, color: "#3b2a29", border: "#705246" },
      { type: "rug", x: 150, y: 230, width: 1860, height: 80, color: "#241817" },
      { type: "window", x: 190, y: 20, width: 90, height: 50 },
      { type: "window", x: 590, y: 20, width: 90, height: 50 },
      { type: "window", x: 990, y: 20, width: 90, height: 50 },
      { type: "window", x: 1390, y: 20, width: 90, height: 50 },
      { type: "window", x: 1790, y: 20, width: 90, height: 50 },
      { type: "whiteboard", x: 320, y: 28, width: 180, height: 52, scribbleText: ["DO NOT", "LOOK BACK"], scribbleColor: "#5a1010" },
      { type: "whiteboard", x: 760, y: 28, width: 180, height: 52, scribbleText: ["THE HALL", "GETS LONGER"], scribbleColor: "#222" },
      { type: "whiteboard", x: 1200, y: 28, width: 180, height: 52, scribbleText: ["HE READ", "ALL OF THEM"], scribbleColor: "#6f1010" },
      { type: "whiteboard", x: 1640, y: 28, width: 180, height: 52, scribbleText: ["LIBRARY", "THIS WAY"], scribbleColor: "#2f3f52" },
      { type: "bookshelf", x: 128, y: 110, width: 88, height: 126 },
      { type: "bookshelf", x: 1960, y: 110, width: 88, height: 126 },
      { type: "debris", x: 520, y: 382, width: 54, height: 18 },
      { type: "debris", x: 1060, y: 390, width: 62, height: 20 },
      { type: "debris", x: 1520, y: 378, width: 58, height: 18 }
    ]
  },

  library_archive: {
    width: 980, height: 640, wallHeight: 110, padding: 32, theme: "office",
    doors: [
      { id: "door_library_from_hall", x: 890, y: 210, width: 64, height: 88,
        orientation: "right", target: "endless_hallway", targetDoorId: "door_hallway_to_library",
        prompt: "back to the hallway" }
    ],
    spawn: { x: 820, y: 268 },
    furniture: [
      { type: "whiteboard", x: 360, y: 34, width: 260, height: 58, scribbleText: ["ARCHIVE ROOM"], scribbleColor: "#263238" },
      { type: "rug", x: 330, y: 180, width: 260, height: 330, color: "#5a4338", border: "#c4a06b" },
      { type: "bookshelf", x: 60, y: 132, width: 88, height: 126 },
      { type: "bookshelf", x: 60, y: 282, width: 88, height: 126 },
      { type: "bookshelf", x: 60, y: 432, width: 88, height: 126 },
      { type: "bookshelf", x: 832, y: 132, width: 88, height: 126 },
      { type: "bookshelf", x: 832, y: 282, width: 88, height: 126 },
      { type: "bookshelf", x: 832, y: 432, width: 88, height: 126 },
      { type: "bookshelf", x: 220, y: 132, width: 88, height: 126 },
      { type: "bookshelf", x: 360, y: 132, width: 88, height: 126 },
      { type: "bookshelf", x: 500, y: 132, width: 88, height: 126 },
      { type: "bookshelf", x: 640, y: 132, width: 88, height: 126 },
      { type: "table", x: 392, y: 324, width: 160, height: 70,
        interaction: { enabled: true, type: "sequence", priority: 5,
          conversations: [[{ speaker: "LUKE", text: "Fresh drag marks cut through the dust. Someone took something heavy from this table." }]],
          area: { x: -20, y: -10, width: 200, height: 110 } } },
      { type: "bookshelf", x: 222, y: 442, width: 88, height: 126,
        interaction: { enabled: true, type: "sequence", priority: 4,
          conversations: [[{ speaker: "LUKE", text: "One section is empty. The missing books were pulled out recently." }]],
          area: { x: -10, y: -10, width: 108, height: 146 } } },
      { type: "debris", x: 458, y: 266, width: 42, height: 16 },
      { type: "plant", x: 158, y: 74, width: 36, height: 80, potColor: "#d7ccc8" },
      { type: "plant", x: 786, y: 74, width: 36, height: 80, potColor: "#d7ccc8" }
    ]
  }
};

Helios.RoomTitles = {
  classroom: "Helios - Luke's Room",
  hallway: "Helios - Student Hallway",
  lecture: "Helios - Classroom",
  principal_hallway: "Helios - Principal Hallway",
  principal_office: "Helios - Principal Office",
  vent_tunnel: "Helios - Vent Tunnel",
  secret_room: "Helios - Hidden Room",
  ruined_classroom: "Helios - Ruined Classroom",
  endless_hallway: "Helios - Endless Hallway",
  library_archive: "Helios - Library Archive"
};

/* Per-room music mode overrides. */
Helios.RoomHooks = {
  classroom: {},
  hallway: {},
  lecture: {},
  principal_hallway: {},
  principal_office: {
    getMusicMode: (playData) => playData?.worldState?.horrorActive ? "horror" : "normal"
  },
  vent_tunnel: { getMusicMode: () => "horror" },
  secret_room: {
    getMusicMode: (playData) => playData?.worldState?.horrorActive && !playData?.worldState?.secretRoomLightOn ? "horror" : "normal"
  },
  ruined_classroom: { getMusicMode: () => "horror" },
  endless_hallway: { getMusicMode: () => "horror" },
  library_archive: { getMusicMode: () => "horror" }
};

Helios.getRoomTitle = function(name) {
  return Helios.RoomTitles[name] || "Helios - Luke's Room";
};

/* =====================================================================
 * SECTION 3: EDITOR CONFIG (developer mode object types)
 * ===================================================================== */
Helios.EditorObjects = Object.freeze([
  { type: "desk", label: "Desk", color: "#6d4c41" },
  { type: "bed", label: "Bed", color: "#5c6bc0" },
  { type: "student", label: "Student", color: "#4caf50" },
  { type: "cupboard", label: "Cupboard", color: "#4e342e" },
  { type: "door", label: "Door", color: "#d89c27" },
  { type: "rug", label: "Rug", color: "#8d6e63" },
  { type: "shelf", label: "Shelf", color: "#5d4037" },
  { type: "window", label: "Window", color: "#81d4fa" },
  { type: "chest", label: "Chest", color: "#5d4037" },
  { type: "locker", label: "Locker", color: "#607d8b" },
  { type: "whiteboard", label: "Whiteboard", color: "#b0bec5" },
  { type: "table", label: "Table", color: "#9e8c74" },
  { type: "zone", label: "Zone", color: "#0000ff" }
]);

/* =====================================================================
 * SECTION 4: SHARED GAME SYSTEMS
 * - Kept in this file so index.html still runs as a static file.
 * ===================================================================== */
(function installCoreSystems() {
  const INVENTORY_SIZE = 4;
  const DEFAULT_VOLUME = 0.8;
  const SAVE_VERSION = 2;
  const PLAY_KEY = "helios_play_data";
  const DESIGN_KEY = "helios_design_data";
  const SLOT_PREFIX = "helios_play_slot_";
  const NON_BLOCKING_TYPES = new Set([
    "rug", "window", "shelf", "zone", "wall_switch", "floor_patch",
    "padlocked_hatch", "document_page", "debris"
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  Helios.Play = {
    SCHEMA_VERSION: SAVE_VERSION,
    clamp(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return DEFAULT_VOLUME;
      return Math.max(0, Math.min(1, Math.round(number * 10) / 10));
    },
    create(options = {}) {
      const roomName = options.startingRoom || Helios.Story.startingRoom || "classroom";
      const room = Helios.Rooms[roomName] || Helios.Rooms[Helios.Story.startingRoom] || {};
      const spawn = room.spawn || { x: 0, y: 0 };
      const inventory = Array.from({ length: INVENTORY_SIZE }, () => null);
      inventory[2] = Helios.Inventory.clone("cabinet_key");
      return Helios.Play.normalize({
        schemaVersion: SAVE_VERSION,
        savedAt: Date.now(),
        player: {
          room: roomName,
          x: Number.isFinite(options.x) ? options.x : spawn.x,
          y: Number.isFinite(options.y) ? options.y : spawn.y,
          facing: options.facing || "down"
        },
        worldState: clone(options.worldState || {}),
        inventory: options.inventory ? clone(options.inventory) : inventory,
        money: Number.isFinite(options.money) ? options.money : 0,
        activeSlot: Number.isFinite(options.activeSlot) ? options.activeSlot : 0,
        povActive: false,
        introSeen: Boolean(options.introSeen),
        settings: { volume: Helios.Play.clamp(options.volume ?? DEFAULT_VOLUME) }
      });
    },
    normalize(data) {
      const play = (data && typeof data === "object") ? data : {};
      play.schemaVersion = SAVE_VERSION;
      if (!play.player || typeof play.player !== "object") play.player = {};
      play.player.room = play.player.room || Helios.Story.startingRoom || "classroom";
      const room = Helios.Rooms[play.player.room] || Helios.Rooms[Helios.Story.startingRoom] || {};
      const spawn = room.spawn || { x: 0, y: 0 };
      play.player.x = Number.isFinite(play.player.x) ? play.player.x : spawn.x;
      play.player.y = Number.isFinite(play.player.y) ? play.player.y : spawn.y;
      play.player.facing = play.player.facing || "down";
      if (!play.worldState || typeof play.worldState !== "object") play.worldState = {};
      if (!Array.isArray(play.inventory)) play.inventory = [];
      play.inventory = play.inventory.slice(0, INVENTORY_SIZE);
      while (play.inventory.length < INVENTORY_SIZE) play.inventory.push(null);
      play.money = Number.isFinite(play.money) ? Math.max(0, Math.floor(play.money)) : 0;
      play.activeSlot = Number.isFinite(play.activeSlot) ? Math.floor(play.activeSlot) : 0;
      play.activeSlot = Math.max(0, Math.min(INVENTORY_SIZE - 1, play.activeSlot));
      play.povActive = Boolean(play.povActive);
      play.introSeen = Boolean(play.introSeen);
      if (!play.settings || typeof play.settings !== "object") play.settings = {};
      play.settings.volume = Helios.Play.clamp(play.settings.volume);
      play.savedAt = Number.isFinite(play.savedAt) ? play.savedAt : Date.now();
      return play;
    }
  };

  Helios.Save = {
    PLAY_KEY,
    DESIGN_KEY,
    SLOT_COUNT: 5,
    serialize(data) {
      return JSON.stringify(data, (key, value) => key.startsWith("_") ? undefined : value, 2);
    },
    readJson(storage, key) {
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    },
    writeJson(storage, key, value) {
      const data = value && value.player ? Helios.Play.normalize(value) : value;
      if (data && data.player) data.savedAt = Date.now();
      storage.setItem(key, JSON.stringify(data));
    },
    hasPlayState(storage) {
      return Boolean(Helios.Save.readJson(storage, PLAY_KEY));
    },
    getSlotKey(slot) {
      const n = Number(slot);
      if (!Number.isInteger(n) || n < 1 || n > Helios.Save.SLOT_COUNT) return null;
      return `${SLOT_PREFIX}${n}`;
    },
    readSlot(storage, slot) {
      const key = Helios.Save.getSlotKey(slot);
      if (!key) return null;
      const data = Helios.Save.readJson(storage, key);
      return data ? Helios.Play.normalize(data) : null;
    },
    writeSlot(storage, slot, playData) {
      const key = Helios.Save.getSlotKey(slot);
      if (!key) return false;
      Helios.Save.writeJson(storage, key, clone(playData));
      return true;
    },
    hasSlot(storage, slot) {
      return Boolean(Helios.Save.readSlot(storage, slot));
    },
    listSlots(storage) {
      const slots = [];
      for (let i = 1; i <= Helios.Save.SLOT_COUNT; i++) {
        const data = Helios.Save.readSlot(storage, i);
        slots.push({ slot: i, data, occupied: Boolean(data) });
      }
      return slots;
    },
    clear(storage) {
      storage.removeItem(PLAY_KEY);
      storage.removeItem(DESIGN_KEY);
      for (let i = 1; i <= Helios.Save.SLOT_COUNT; i++) storage.removeItem(`${SLOT_PREFIX}${i}`);
    }
  };

  Helios.Inventory = {
    SIZE: INVENTORY_SIZE,
    ITEMS: Object.freeze({
      cabinet_key: { id: "cabinet_key", name: "Cabinet Key", label: "Cabinet Key", icon: "\uD83D\uDD11" },
      secret_note: { id: "secret_note", name: "Mysterious Letter", label: "Mysterious Letter", icon: "\uD83D\uDCDD" },
      door_key: { id: "door_key", name: "Door Key", label: "Door Key", icon: "\uD83D\uDDDD\uFE0F" },
      axe: { id: "axe", name: "Rusty Axe", label: "Rusty Axe", icon: "\uD83E\uDE93" }
    }),
    clone(id) {
      return clone(Helios.Inventory.ITEMS[id] || { id, name: id, label: id, icon: "?" });
    },
    getHandler(id) {
      const handlers = {
        secret_note: ({ openNoteOverlay }) => openNoteOverlay(),
        axe: ({ currentLevelName, getRoomItem, isPlayerNearItem, playData, savePlayState, showTemporaryDialogue }) => {
          const floor = getRoomItem("secret_room_loose_floorboards");
          if (currentLevelName === "secret_room" && floor && isPlayerNearItem(floor, 96)) {
            playData.worldState.secretRoomHatchRevealed = true;
            savePlayState();
            showTemporaryDialogue("The loose boards splinter open. There is a hatch underneath.", "LUKE");
            return;
          }
          showTemporaryDialogue("I should use this on something weak enough to break.", "LUKE");
        }
      };
      return handlers[id] || null;
    }
  };

  Helios.Input = {
    ACTIONS: Object.freeze({
      MOVE_UP: "move_up",
      MOVE_DOWN: "move_down",
      MOVE_LEFT: "move_left",
      MOVE_RIGHT: "move_right",
      INTERACT: "interact",
      CANCEL: "cancel",
      TOGGLE_HELP: "toggle_help",
      TOGGLE_INVENTORY: "toggle_inventory",
      USE_ITEM: "use_item",
      ZOOM_IN: "zoom_in",
      ZOOM_OUT: "zoom_out",
      PAUSE: "pause"
    }),
    mapKeyToAction(key) {
      const normalized = key === " " ? "space" : String(key || "").toLowerCase();
      const map = {
        w: "move_up", arrowup: "move_up",
        s: "move_down", arrowdown: "move_down",
        a: "move_left", arrowleft: "move_left",
        d: "move_right", arrowright: "move_right",
        space: "interact", enter: "interact",
        escape: "cancel",
        i: "toggle_help",
        e: "toggle_inventory",
        x: "use_item",
        "+": "zoom_in", "=": "zoom_in",
        "-": "zoom_out", "_": "zoom_out",
        p: "pause"
      };
      return map[normalized] || null;
    },
    isMoveAction(action) {
      return action === "move_up" || action === "move_down" || action === "move_left" || action === "move_right";
    }
  };

  Helios.Overlay = {
    isVisible(documentRef, id) {
      const el = documentRef.getElementById(id);
      return Boolean(el && !el.classList.contains("hidden"));
    },
    setHidden(documentRef, id, hidden) {
      const el = documentRef.getElementById(id);
      if (!el) return false;
      el.classList.toggle("hidden", Boolean(hidden));
      return true;
    },
    isBlocking({ documentRef, povActive }) {
      const active = documentRef.activeElement;
      const typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      return Boolean(
        typing ||
        povActive ||
        Helios.Overlay.isVisible(documentRef, "pov-container") ||
        Helios.Overlay.isVisible(documentRef, "note-overlay") ||
        Helios.Overlay.isVisible(documentRef, "padlock-overlay") ||
        Helios.Overlay.isVisible(documentRef, "pause-overlay") ||
        Helios.Overlay.isVisible(documentRef, "confirm-overlay") ||
        Helios.Overlay.isVisible(documentRef, "texture-editor") ||
        Helios.Overlay.isVisible(documentRef, "object-picker")
      );
    }
  };

  Helios.Dialogue = {
    getView({ dialogue, stage }) {
      const entry = Array.isArray(dialogue) ? dialogue[stage] : null;
      if (!entry) return { active: false, speaker: "", text: "", prompt: "", hideSpeaker: true };
      return {
        active: true,
        speaker: entry.speaker || "",
        text: entry.text || "",
        prompt: "Space / click to continue",
        hideSpeaker: !entry.speaker
      };
    },
    apply(elements, view) {
      if (!elements || !elements.box) return;
      elements.box.classList.toggle("dialogue--active", Boolean(view.active));
      elements.box.classList.toggle("dialogue--hidden", !view.active);
      if (elements.label) {
        elements.label.textContent = view.speaker || "";
        elements.label.classList.toggle("dialogue__label--hidden", Boolean(view.hideSpeaker));
      }
      if (elements.line) elements.line.textContent = view.text || "";
      if (elements.prompt) elements.prompt.textContent = view.prompt || "";
    },
    advance({ dialogueLength, stage }) {
      const nextStage = stage + 1;
      if (nextStage >= dialogueLength) return { stage: dialogueLength, completed: true };
      return { stage: nextStage, completed: false };
    },
    createHint(target) {
      let text = "Press Space to interact";
      if (target?.type === "door") text = `Press Space ${target.prompt || "to open"}`;
      else if (target?.type === "cabinet") text = "Press Space to inspect cabinet";
      else if (target?.prompt) text = `Press Space ${target.prompt}`;
      return { active: true, speaker: "", text, prompt: "", hideSpeaker: true };
    }
  };

  Helios.Viewport = {
    getSceneRenderOffset({ canvas, room, zoom = 1 }) {
      const z = zoom || 1;
      return {
        x: Math.max(0, (canvas.width / z - room.width) / 2),
        y: Math.max(0, (canvas.height / z - room.height) / 2)
      };
    },
    screenToWorld({ canvasX, canvasY, camera, canvas, room, zoom = 1 }) {
      const offset = Helios.Viewport.getSceneRenderOffset({ canvas, room, zoom });
      return {
        x: canvasX / zoom - offset.x + camera.x,
        y: canvasY / zoom - offset.y + camera.y
      };
    },
    getCameraPosition({ target, canvas, room, zoom = 1, cutsceneActive = false }) {
      const viewW = canvas.width / (zoom || 1);
      const viewH = canvas.height / (zoom || 1);
      const maxX = Math.max(0, room.width - viewW);
      const maxY = Math.max(0, room.height - viewH);
      const leadY = cutsceneActive ? 0 : 18;
      return {
        x: Math.max(0, Math.min(maxX, target.x - viewW / 2)),
        y: Math.max(0, Math.min(maxY, target.y - viewH / 2 - leadY))
      };
    }
  };

  Helios.Proximity = {
    getAnchor(item) {
      if (!item) return { x: 0, y: 0 };
      if (item.type === "door") return Helios.Proximity.getDoorAnchor(item);
      return { x: item.x + item.width / 2, y: item.y + item.height };
    },
    getDoorAnchor(door) {
      const orientation = door.orientation || (door.y > 200 ? "bottom" : "top");
      const centerX = door.x + door.width / 2;
      const centerY = door.y + door.height / 2;
      if (orientation === "top") return { x: centerX, y: door.y + door.height };
      if (orientation === "bottom") return { x: centerX, y: door.y };
      if (orientation === "left") return { x: door.x + door.width, y: centerY };
      if (orientation === "right") return { x: door.x, y: centerY };
      return { x: centerX, y: centerY };
    },
    isActorInsideInteractionArea({ item, actor }) {
      if (!item || !actor) return false;
      const area = item.interaction?.area || { x: -12, y: -12, width: item.width + 24, height: item.height + 24 };
      const left = item.x + area.x;
      const top = item.y + area.y;
      return actor.x >= left && actor.x <= left + area.width && actor.y >= top && actor.y <= top + area.height;
    },
    findNearestDoor({ doors, actor, threshold = Infinity }) {
      let best = null;
      let bestDist = threshold;
      for (const door of doors || []) {
        const dist = Helios.Proximity.distanceToDoorRect(door, actor);
        if (dist <= bestDist) {
          best = door;
          bestDist = dist;
        }
      }
      return best;
    },
    distanceToDoorRect(door, actor) {
      if (!door || !actor) return Infinity;
      const left = door.x;
      const right = door.x + (door.width || 0);
      const top = door.y;
      const bottom = door.y + (door.height || 0);
      const cx = Math.max(left, Math.min(actor.x, right));
      const cy = Math.max(top, Math.min(actor.y, bottom));
      return Math.hypot(actor.x - cx, actor.y - cy);
    },
    findNearestPromptFurniture({ furniture, actor, threshold = 82, isHidden }) {
      let best = null;
      let bestDist = threshold;
      for (const item of furniture || []) {
        if (!item?.interaction?.enabled) continue;
        if (isHidden && isHidden(item)) continue;
        const anchor = Helios.Proximity.getAnchor(item);
        const dist = Math.hypot(actor.x - anchor.x, actor.y - anchor.y);
        const inside = Helios.Proximity.isActorInsideInteractionArea({ item, actor });
        if ((inside || dist <= bestDist) && dist <= bestDist + 28) {
          best = item;
          bestDist = Math.min(dist, bestDist);
        }
      }
      return best;
    }
  };

  Helios.Collision = {
    getDefaultRect(item) {
      const w = item.width || 0;
      const h = item.height || 0;
      const rects = {
        desk: { x: 6, y: Math.max(8, h * 0.42), width: Math.max(8, w - 12), height: Math.max(10, h * 0.48) },
        table: { x: 8, y: Math.max(8, h * 0.34), width: Math.max(8, w - 16), height: Math.max(10, h * 0.5) },
        boss_desk: { x: 12, y: Math.max(12, h * 0.36), width: Math.max(8, w - 24), height: Math.max(14, h * 0.5) },
        bed: { x: 6, y: 10, width: Math.max(8, w - 12), height: Math.max(10, h - 16) },
        cupboard: { x: 4, y: Math.max(8, h * 0.18), width: Math.max(8, w - 8), height: Math.max(10, h * 0.72) },
        chest: { x: 5, y: Math.max(8, h * 0.34), width: Math.max(8, w - 10), height: Math.max(8, h * 0.52) },
        locker: { x: 3, y: Math.max(8, h * 0.16), width: Math.max(6, w - 6), height: Math.max(10, h * 0.78) },
        bookshelf: { x: 6, y: Math.max(10, h * 0.16), width: Math.max(8, w - 12), height: Math.max(10, h * 0.78) },
        sofa: { x: 8, y: Math.max(8, h * 0.28), width: Math.max(8, w - 16), height: Math.max(10, h * 0.58) },
        plant: { x: Math.max(0, w * 0.25), y: Math.max(8, h * 0.48), width: Math.max(8, w * 0.5), height: Math.max(8, h * 0.42) },
        whiteboard: null,
        student: { x: Math.max(0, w * 0.18), y: Math.max(8, h * 0.52), width: Math.max(8, w * 0.64), height: Math.max(8, h * 0.4) },
        teacher: { x: Math.max(0, w * 0.16), y: Math.max(8, h * 0.48), width: Math.max(8, w * 0.68), height: Math.max(8, h * 0.44) },
        vent: null
      };
      return Object.prototype.hasOwnProperty.call(rects, item.type) ? rects[item.type] : null;
    },
    applyDefaultCollisionRect(item) {
      if (!item || item.collisionRect || NON_BLOCKING_TYPES.has(item.type)) return item;
      const rect = Helios.Collision.getDefaultRect(item);
      if (rect) item.collisionRect = rect;
      return item;
    },
    getRect(item) {
      if (item.collisionRect) {
        return {
          x: item.x + item.collisionRect.x,
          y: item.y + item.collisionRect.y,
          width: item.collisionRect.width,
          height: item.collisionRect.height
        };
      }
      return { x: item.x, y: item.y, width: item.width, height: item.height };
    },
    isBlocking(item) {
      return Boolean(item && (item.collisionRect || !NON_BLOCKING_TYPES.has(item.type)));
    },
    hasCollisionAt({ x, y, room, player, isItemHidden }) {
      const half = (player.size || 24) / 2;
      if (x - half < (room.padding || 0)) return true;
      if (x + half > room.width - (room.padding || 0)) return true;
      if (y - half < (room.wallHeight || 0)) return true;
      if (y + half > room.height - (room.padding || 0)) return true;
      for (const item of room.furniture || []) {
        if (isItemHidden && isItemHidden(item)) continue;
        if (!Helios.Collision.isBlocking(item)) continue;
        const rect = Helios.Collision.getRect(item);
        if (x + half > rect.x && x - half < rect.x + rect.width &&
            y + half > rect.y && y - half < rect.y + rect.height) {
          return true;
        }
      }
      return false;
    }
  };

  Helios.RoomState = {
    applyPrincipalOffice(room, worldState) {
      if (!room || !worldState?.horrorActive) return;
      const furniture = room.furniture || [];
      if (furniture.some((item) => item.id === "principal_office_vent")) return;
      furniture.forEach((item) => {
        if (item.type === "boss_desk") { item.damaged = true; item.scorched = true; }
        else if (item.type === "sofa") { item.damaged = true; item.overturned = true; }
        else if (item.type === "plant") { item.damaged = true; item.knockedOver = true; }
        else if (item.type === "bookshelf") { item.damaged = true; item.scorched = true; }
        else if (item.type === "rug") { item.scorched = true; }
      });
      furniture.push(
        { type: "debris", id: "office_debris_desk", x: 196, y: 236, width: 72, height: 22 },
        { type: "debris", id: "office_debris_floor_l", x: 120, y: 312, width: 50, height: 18 },
        { type: "debris", id: "office_debris_floor_r", x: 432, y: 312, width: 54, height: 20 },
        { type: "debris", id: "office_debris_vent", x: 416, y: 104, width: 64, height: 16 },
        { type: "debris", id: "office_debris_corner", x: 64, y: 472, width: 46, height: 18 },
        { type: "debris", id: "office_debris_corner2", x: 486, y: 472, width: 48, height: 18 }
      );
      room.blastHole = { x: 432, y: 0, width: 72, height: 96 };
      furniture.push({
        type: "vent", id: "principal_office_vent", x: 440, y: 60, width: 56, height: 32, open: true,
        interaction: {
          enabled: true, type: "sequence", priority: 12, prompt: "to crawl into the vent",
          conversations: [[{ speaker: "LUKE", text: "The blast ripped the wall open. I can climb through the vent." }]],
          area: { x: -24, y: -8, width: 104, height: 120 }
        }
      });
    },
    applyHallwayHorror(room) {
      if (!room) return;
      (room.furniture || []).forEach((item) => {
        if (item.type === "student") item.headless = true;
      });
    }
  };

  Helios.RuinedClassroom = {
    createDocumentSet({ worldState, documents, coreDocumentIds }) {
      const ids = Array.isArray(worldState.ruinedDocumentIds) ? worldState.ruinedDocumentIds.slice() : [];
      let changed = false;
      const available = documents.map((doc) => doc.id);
      const required = [...coreDocumentIds];
      for (const id of required) {
        if (!ids.includes(id)) {
          ids.push(id);
          changed = true;
        }
      }
      for (const id of available) {
        if (ids.length >= Helios.Story.ruinedClassroomNoteLayouts.length) break;
        if (!ids.includes(id)) {
          ids.push(id);
          changed = true;
        }
      }
      if (changed || !Array.isArray(worldState.ruinedDocumentIds)) worldState.ruinedDocumentIds = ids;
      if (!worldState.ruinedDocumentsRead || typeof worldState.ruinedDocumentsRead !== "object") {
        worldState.ruinedDocumentsRead = {};
        changed = true;
      }
      return { selectedIds: ids, changed };
    },
    countRead(worldState, selectedIds) {
      return selectedIds.filter((id) => worldState.ruinedDocumentsRead?.[id]).length;
    },
    markRead({ worldState, documentId, selectedIds, requiredReads }) {
      if (!worldState.ruinedDocumentsRead || typeof worldState.ruinedDocumentsRead !== "object") worldState.ruinedDocumentsRead = {};
      const firstRead = !worldState.ruinedDocumentsRead[documentId];
      if (firstRead) worldState.ruinedDocumentsRead[documentId] = true;
      const readCount = Helios.RuinedClassroom.countRead(worldState, selectedIds);
      const justOpenedDoor = readCount >= requiredReads && !worldState.ruinedDoorOpened;
      if (justOpenedDoor) worldState.ruinedDoorOpened = true;
      return { firstRead, readCount, justOpenedDoor };
    },
    isRead(worldState, id) {
      return Boolean(worldState?.ruinedDocumentsRead?.[id]);
    },
    buildDocumentFurniture(id, layout, index, documentMap) {
      if (!documentMap[id] || !layout) return null;
      return {
        type: "document_page",
        id: `ruined_doc_${id}`,
        documentId: id,
        documentVariant: documentMap[id].photo?.style || "report",
        x: layout.x, y: layout.y, width: layout.width, height: layout.height,
        rotation: layout.rotation || 0,
        interaction: {
          enabled: true, type: "sequence", priority: 10, prompt: "to read the page",
          conversations: [[{ speaker: "LUKE", text: "Another page waits on the floor." }]],
          area: { x: -24, y: -24, width: layout.width + 48, height: layout.height + 48 }
        },
        _spawnIndex: index
      };
    },
    buildDecorativePaper(paper, index) {
      return {
        type: "document_page",
        id: `ruined_decor_${index}`,
        documentVariant: paper.variant || "report",
        x: paper.x, y: paper.y, width: paper.width, height: paper.height,
        rotation: paper.rotation || 0,
        decorative: true
      };
    }
  };

  Helios.NoteRenderer = {
    renderLetter(content) {
      const paragraphs = (content.paragraphs || []).map((p, i) =>
        `<p class="${i === 0 ? "note-greeting" : ""}">${escapeHtml(p)}</p>`).join("");
      const footer = content.footer ? `<p class="note-signature">${escapeHtml(content.footer)}</p>` : "";
      return `${content.label ? `<div class="note-doc-label">${escapeHtml(content.label)}</div>` : ""}${content.title ? `<h2 class="note-doc-title">${escapeHtml(content.title)}</h2>` : ""}${paragraphs}${footer}`;
    },
    renderDocument(content) {
      const paragraphs = (content.paragraphs || []).map((p) => `<p class="note-doc-paragraph">${escapeHtml(p)}</p>`).join("");
      const photo = content.photo ? `<div class="note-photo note-photo--${escapeHtml(content.photo.style || "classroom")}"><div class="note-photo__art"></div><div class="note-photo__caption">${escapeHtml(content.photo.caption || "")}</div></div>` : "";
      const footer = content.footer ? `<p class="note-doc-footer">${escapeHtml(content.footer)}</p>` : "";
      return `${content.label ? `<div class="note-doc-label">${escapeHtml(content.label)}</div>` : ""}<h2 class="note-doc-title">${escapeHtml(content.title || "Document")}</h2>${photo}<div class="note-doc-body">${paragraphs}</div>${footer}`;
    },
    renderBack(content) {
      const lines = [];
      if (content.backTitle) lines.push(`<h2 class="note-doc-title">${escapeHtml(content.backTitle)}</h2>`);
      (content.backParagraphs || []).forEach((p) => lines.push(`<p class="note-backline">${escapeHtml(p)}</p>`));
      if (content.code) lines.push(`<div class="note-code-label">Code</div><div class="note-code">${escapeHtml(content.code)}</div>`);
      if (content.backHint) lines.push(`<p class="note-backhint">${escapeHtml(content.backHint)}</p>`);
      return lines.join("");
    }
  };

  Helios.Soundtracks = {
    MODES: Object.freeze({ MENU: "menu", NORMAL: "normal", HORROR: "horror", DEATH: "death" }),
    get(mode) {
      const modes = Helios.Soundtracks.MODES;
      const tracks = {
        [modes.MENU]: {
          padNotes: [{ freq: 130.81, vol: 0.008 }, { freq: 196.00, vol: 0.005 }],
          motif: [220.00, 196.00, 174.61, 164.81],
          melodyDuration: 1.6,
          melodyVolume: 0.006,
          melodyIntervalMs: 6800
        },
        [modes.NORMAL]: {
          padNotes: [{ freq: 146.83, vol: 0.007 }, { freq: 220.00, vol: 0.004 }],
          melody: [261.63, 246.94, 220.00, 196.00],
          melodyDuration: 1.25,
          melodyVolume: 0.005,
          melodyIntervalMs: 7600
        },
        [modes.HORROR]: {
          sub: { frequency: 49, volume: 0.018, lfoFrequency: 0.06, lfoGain: 0.01 },
          dissonantPairs: [
            { type: "triangle", freq: 146.83, vol: 0.0045 },
            { type: "sine", freq: 138.59, vol: 0.0035 },
            { type: "sine", freq: 220.00, vol: 0.0025 }
          ],
          whistle: { frequency: 740, lfoFrequency: 0.045, lfoGain: 0.006, vibratoFrequency: 3.5, vibratoGain: 3 }
        },
        [modes.DEATH]: {
          boom: { startFrequency: 82, endFrequency: 24, volume: 0.07, duration: 2.1 },
          screech: { startFrequency: 520, endFrequency: 120, volume: 0.012, duration: 1.8 },
          heartbeats: [
            { delay: 0.15, volume: 0.045 },
            { delay: 0.55, volume: 0.038 },
            { delay: 1.05, volume: 0.03 }
          ],
          chordSting: [110, 146.83, 207.65]
        }
      };
      return tracks[mode] || tracks[modes.NORMAL];
    }
  };

  Helios.DevCheckpoints = Object.freeze([
    { id: "start", label: "Start", room: "classroom", x: 340, y: 400, facing: "up", inventory: [null, null, "cabinet_key", null], worldState: {}, introSeen: true },
    { id: "classroom_unlocked", label: "Classroom Unlocked", room: "classroom", x: 340, y: 72, facing: "up", inventory: ["secret_note", null, null, null], worldState: { leftCabinetUnlocked: true, leftCabinetNoteTaken: true, leftCabinetDoorKeyTaken: true, classroomDoorUnlocked: true }, introSeen: true },
    { id: "hallway", label: "Hallway", room: "hallway", x: 1282, y: 410, facing: "left", inventory: ["secret_note", null, null, null], worldState: { leftCabinetUnlocked: true, classroomDoorUnlocked: true }, introSeen: true },
    { id: "lecture", label: "Lecture", room: "lecture", x: 460, y: 520, facing: "up", inventory: ["secret_note", null, null, null], worldState: { leftCabinetUnlocked: true, classroomDoorUnlocked: true }, introSeen: true },
    { id: "office_chase", label: "Office Chase", room: "principal_hallway", x: 200, y: 430, facing: "down", inventory: ["secret_note", null, null, null], worldState: { horrorActive: true, lecture_seen: true, officeRushPending: true, classroomDoorUnlocked: true }, introSeen: true, darkness: 0.5 },
    { id: "principal_office", label: "Principal Office", room: "principal_office", x: 300, y: 300, facing: "up", inventory: ["secret_note", null, null, null], worldState: { horrorActive: true, lecture_seen: true, classroomDoorUnlocked: true }, introSeen: true, darkness: 0.65 },
    { id: "secret_room", label: "Secret Room", room: "secret_room", x: 250, y: 320, facing: "up", inventory: ["secret_note", null, null, null], worldState: { horrorActive: true, lecture_seen: true, secretRoomLightOn: false }, introSeen: true, darkness: 0.55 },
    { id: "ruined_classroom", label: "Ruined Classroom", room: "ruined_classroom", x: 120, y: 260, facing: "right", inventory: ["secret_note", "axe", null, null], worldState: { horrorActive: true, secretRoomChestOpened: true, secretRoomHatchRevealed: true, secretRoomPadlockUnlocked: true }, introSeen: true, darkness: 0.55 },
    { id: "endless_hallway", label: "Endless Hallway", room: "endless_hallway", x: 2064, y: 258, facing: "left", inventory: ["secret_note", "axe", null, null], worldState: { horrorActive: true, ruinedDoorOpened: true, endlessHallwaySeen: true }, introSeen: true, darkness: 0.6 },
    { id: "library_archive", label: "Library Archive", room: "library_archive", x: 820, y: 268, facing: "left", inventory: ["secret_note", "axe", null, null], worldState: { horrorActive: true, ruinedDoorOpened: true, endlessHallwaySeen: true, libraryArchiveSeen: true }, introSeen: true, darkness: 0.45 }
  ]);
})();
