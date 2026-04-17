window.initialGameData = {
  dialogue: [
    { text: "okay Luke", speaker: "LUKE" },
    { text: "this is your final chance", speaker: "LUKE" }
  ],
  levels: {
    classroom: {
      width: 680,
      height: 520,
      wallHeight: 96,
      padding: 32,
      theme: 'dorm',
      doors: [
        {
          id: 'door_class_to_hall',
          x: 308, y: 18, width: 64, height: 80,
          orientation: 'top',
          target: 'hallway',
          targetDoorId: 'door_hall_to_class'
        }
      ],
      spawn: { x: 340, y: 400 },
      furniture: [
        { type: 'rug', x: 150, y: 220, width: 80, height: 120, color: "#a1887f" },
        { type: 'rug', x: 450, y: 220, width: 80, height: 120, color: "#a1887f" },
        { id: 'left_cabinet', type: 'cupboard', x: 40, y: 50, width: 60, height: 90 },
        { type: 'cupboard', x: 580, y: 50, width: 60, height: 90,
          id: 'right_cabinet',
          interaction: { enabled: true, type: 'sequence', priority: 5, conversations: [[{ speaker: 'LUKE', text: 'This cabinet is empty... nothing here.' }]], area: { x: -10, y: -10, width: 80, height: 110 } } },
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
        {
          id: 'door_hall_to_class',
          x: 1258, y: 440, width: 54, height: 80,
          orientation: 'bottom',
          target: 'classroom',
          targetDoorId: 'door_class_to_hall'
        },
        {
          id: 'door_hall_to_lecture',
          x: 24, y: 220, width: 54, height: 90,
          orientation: 'left',
          target: 'lecture',
          targetDoorId: 'door_lecture_to_hall'
        }
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
        { type: 'window', x: 1100, y: 20, width: 100, height: 50 },
        { type: 'student', x: 280, y: 120, width: 24, height: 36, variant: 'boy', shirt: '#81c784', name: 'JOSH', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'JOSH', text: 'Where is the library again?!'}, {speaker: 'MIA', text: 'I think it is upstairs.'}]] } },
        { type: 'student', x: 320, y: 120, width: 24, height: 36, variant: 'girl', shirt: '#f48fb1', name: 'MIA', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'MIA', text: 'We are going to be late.'}, {speaker: 'JOSH', text: 'Chill, it is fine.'}]] } },
        { type: 'student', x: 450, y: 150, width: 24, height: 36, variant: 'boy', shirt: '#64b5f6', name: 'KYLE', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'KYLE', text: 'Did you see that new game?'}, {speaker: 'DAN', text: 'Yeah it looks awesome.'}, {speaker: 'SUE', text: 'You guys are nerds.'}]] } },
        { type: 'student', x: 490, y: 150, width: 24, height: 36, variant: 'boy', shirt: '#ffb74d', name: 'DAN', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'DAN', text: 'I want to play it tonight.'}, {speaker: 'KYLE', text: 'Let’s co-op!'}]] } },
        { type: 'student', x: 470, y: 190, width: 24, height: 36, variant: 'girl', shirt: '#e57373', name: 'SUE', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'SUE', text: 'I have so much homework to do...'}]] } },
        { type: 'student', x: 740, y: 240, width: 24, height: 36, variant: 'girl', shirt: '#ce93d8', name: 'LISA', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'LISA', text: 'This class is so boring.'}, {speaker: 'JEN', text: 'I know right?'}, {speaker: 'TOM', text: 'Shh keep it down.'}]] } },
        { type: 'student', x: 780, y: 250, width: 24, height: 36, variant: 'girl', shirt: '#80cbc4', name: 'JEN', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'JEN', text: 'Did you understand the math assignment?'}, {speaker: 'LISA', text: 'Not at all.'}]] } },
        { type: 'student', x: 760, y: 200, width: 24, height: 36, variant: 'boy', shirt: '#ffab91', name: 'TOM', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'TOM', text: 'I literally slept through chapter 4.'}]] } },
        { type: 'student', x: 1040, y: 140, width: 24, height: 36, variant: 'boy', shirt: '#90caf9', name: 'SAM', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'SAM', text: 'Did you do the homework?'}, {speaker: 'KIM', text: 'Whoops...'}]] } },
        { type: 'student', x: 1080, y: 140, width: 24, height: 36, variant: 'girl', shirt: '#ffcc80', name: 'KIM', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'KIM', text: 'I will just copy yours.'}, {speaker: 'SAM', text: 'No way!'}]] } },
        { type: 'student', x: 100, y: 220, width: 24, height: 36, variant: 'girl', shirt: '#a5d6a7', name: 'BETH', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'BETH', text: 'I am so tired.'}]] } },
        { type: 'student', x: 230, y: 320, width: 24, height: 36, variant: 'boy', shirt: '#bcaaa4', name: 'RYAN', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'RYAN', text: 'Is it lunch time yet?'}]] } },
        { type: 'student', x: 620, y: 380, width: 24, height: 36, variant: 'girl', shirt: '#ef9a9a', name: 'CHLOE', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'CHLOE', text: 'Nice weather today.'}]] } },
        { type: 'student', x: 930, y: 360, width: 24, height: 36, variant: 'boy', shirt: '#9fa8da', name: 'ALEX', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'ALEX', text: 'I need coffee.'}]] } },
        { type: 'student', x: 970, y: 360, width: 24, height: 36, variant: 'girl', shirt: '#fff59d', name: 'EMMA', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'EMMA', text: 'Let’s go to the cafeteria.'}, {speaker: 'ALEX', text: 'Good idea.'}]] } },
        { type: 'student', x: 1150, y: 280, width: 24, height: 36, variant: 'boy', shirt: '#64ffda', name: 'ZACK', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'ZACK', text: 'I forgot my locker combination.'}]] } },
        { type: 'student', x: 1190, y: 280, width: 24, height: 36, variant: 'boy', shirt: '#b0bec5', name: 'LUIS', interaction: { enabled: true, type: 'sequence', conversations: [[{speaker: 'LUIS', text: 'Again? You literally wrote it down!'}, {speaker: 'ZACK', text: 'I lost the paper...'}]] } }
      ]
    },
    lecture: {
      width: 960,
      height: 820,
      wallHeight: 110,
      padding: 32,
      theme: 'classroom',
      doors: [
        {
          id: 'door_lecture_to_hall',
          x: 870, y: 180, width: 64, height: 88,
          orientation: 'right',
          target: 'hallway',
          targetDoorId: 'door_hall_to_lecture'
        },
        {
          id: 'door_lecture_to_principal_hall',
          x: 420, y: 690, width: 120, height: 130,
          orientation: 'bottom',
          target: 'principal_hallway',
          targetDoorId: 'door_hall_to_lecture',
          prompt: 'ke terowongan bawah'
        }
      ],
      spawn: { x: 460, y: 520 },
      furniture: [
        { type: 'whiteboard', x: 340, y: 30, width: 240, height: 60 },
        { type: 'table', x: 400, y: 150, width: 120, height: 60 },
        { type: 'desk', variant: 'study', x: 180, y: 240, width: 70, height: 60 },
        { type: 'student', x: 203, y: 274, width: 24, height: 36, variant: 'boy', shirt: '#e57373', name: 'BEN', text: "Did you do the homework?", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 340, y: 240, width: 70, height: 60 },
        { type: 'student', x: 363, y: 274, width: 24, height: 36, variant: 'girl', shirt: '#ba68c8', name: 'LILY', text: "I love this subject!", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 500, y: 240, width: 70, height: 60 },
        { type: 'student', x: 523, y: 274, width: 24, height: 36, variant: 'boy', shirt: '#64b5f6', name: 'JOE', text: "Zzz...", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 660, y: 240, width: 70, height: 60 },
        { type: 'student', x: 683, y: 274, width: 24, height: 36, variant: 'girl', shirt: '#81c784', name: 'ANA', text: "Professor is late.", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 180, y: 340, width: 70, height: 60 },
        { type: 'student', x: 203, y: 374, width: 24, height: 36, variant: 'girl', shirt: '#ffb74d', name: 'KIM', text: "Can I borrow a pen?", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 340, y: 340, width: 70, height: 60 },
        { type: 'student', x: 363, y: 374, width: 24, height: 36, variant: 'boy', shirt: '#a1887f', name: 'LEO', text: "Focusing...", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 500, y: 340, width: 70, height: 60 },
        { type: 'student', x: 523, y: 374, width: 24, height: 36, variant: 'girl', shirt: '#90a4ae', name: 'EVE', text: "...", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 660, y: 340, width: 70, height: 60 },
        { type: 'student', x: 683, y: 374, width: 24, height: 36, variant: 'boy', shirt: '#7986cb', name: 'SAM', text: "When is lunch?", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 180, y: 440, width: 70, height: 60, id: 'player_seat' },
        { type: 'desk', variant: 'study', x: 340, y: 440, width: 70, height: 60 },
        { type: 'student', x: 363, y: 474, width: 24, height: 36, variant: 'boy', shirt: '#4db6ac', name: 'MAX', text: "Hey Luke!", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 500, y: 440, width: 70, height: 60 },
        { type: 'student', x: 523, y: 474, width: 24, height: 36, variant: 'girl', shirt: '#f06292', name: 'ZOE', text: "Nice weather today.", behavior: 'sit' },
        { type: 'desk', variant: 'study', x: 660, y: 440, width: 70, height: 60 },
        { type: 'student', x: 683, y: 474, width: 24, height: 36, variant: 'boy', shirt: '#9575cd', name: 'IAN', text: "I'm hungry.", behavior: 'sit' },
        { type: 'locker', x: 170, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 220, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 270, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 320, y: 700, width: 50, height: 100 },
        
        { type: 'locker', x: 590, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 640, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 690, y: 700, width: 50, height: 100 },
        { type: 'locker', x: 740, y: 700, width: 50, height: 100 }
      ]
    },
    principal_hallway: {
      width: 400,
      height: 600,
      wallHeight: 96,
      padding: 32,
      theme: 'hall',
      doors: [
        {
          id: 'door_hall_to_lecture',
          x: 140, y: 18, width: 120, height: 80,
          orientation: 'top',
          target: 'lecture',
          targetDoorId: 'door_lecture_to_principal_hall'
        },
        {
          id: 'door_hall_to_principal',
          x: 168, y: 520, width: 64, height: 80,
          orientation: 'bottom',
          target: 'principal_office',
          targetDoorId: 'door_principal_to_hallway',
          prompt: 'to principal office'
        }
      ],
      spawn: { x: 200, y: 100 },
      furniture: [
        { type: 'locker', x: 32, y: 140, width: 24, height: 240, orientation: 'right' },
        { type: 'locker', x: 344, y: 140, width: 24, height: 240, orientation: 'left' }
      ]
    },
    principal_office: {
      width: 600,
      height: 600,
      wallHeight: 96,
      padding: 32,
      theme: 'office',
      doors: [
        {
          id: 'door_principal_to_hallway',
          x: 268, y: 18, width: 64, height: 80,
          orientation: 'top',
          target: 'principal_hallway',
          targetDoorId: 'door_hall_to_principal'
        }
      ],
      spawn: { x: 300, y: 300 },
      furniture: [
          { type: 'rug', x: 210, y: 220, width: 180, height: 160, color: '#4a148c', border: '#d4af37' },
          { type: 'boss_desk', x: 200, y: 150, width: 200, height: 80, hasLamp: true, hasLaptop: true },
          { type: 'bookshelf', x: 32, y: 112, width: 90, height: 120 },
          { type: 'bookshelf', x: 478, y: 112, width: 90, height: 120 },
          { type: 'sofa', x: 90, y: 350, width: 140, height: 60, color: '#3e2723' },
          { type: 'sofa', x: 370, y: 350, width: 140, height: 60, color: '#3e2723' },
          { type: 'plant', x: 126, y: 70, width: 36, height: 75, potColor: '#eceff1' },
          { type: 'plant', x: 438, y: 70, width: 36, height: 75, potColor: '#eceff1' },
          { type: 'plant', x: 36, y: 460, width: 36, height: 80, potColor: '#eceff1' },
          { type: 'plant', x: 528, y: 460, width: 36, height: 80, potColor: '#eceff1' }
      ]
    },
    vent_tunnel: {
      width: 1400,
      height: 520,
      wallHeight: 0,
      padding: 0,
      theme: 'office',
      doors: [],
      spawn: { x: 1300, y: 260 },
      furniture: []
    },
    secret_room: {
      width: 500,
      height: 500,
      wallHeight: 96,
      padding: 32,
      theme: 'dorm',
      doors: [],
      spawn: { x: 250, y: 320 },
      furniture: [
        { type: 'vent', id: 'broken_vent_in', x: 188, y: 34, width: 58, height: 30 },
        { type: 'debris', x: 198, y: 132, width: 38, height: 18 },
        {
            type: 'chest',
            id: 'secret_room_supply_chest',
            x: 52,
            y: 338,
            width: 84,
            height: 52,
            interaction: {
                enabled: true,
                type: 'sequence',
                priority: 7,
                prompt: 'to open the chest',
                conversations: [[{ speaker: 'LUKE', text: 'A wooden chest...' }]],
                area: { x: -16, y: -8, width: 116, height: 82 }
            }
        },
        {
            type: 'floor_patch',
            id: 'secret_room_loose_floorboards',
            x: 346,
            y: 384,
            width: 98,
            height: 68,
            interaction: {
                enabled: true,
                type: 'sequence',
                priority: 5,
                prompt: 'to inspect the floor',
                conversations: [[{ speaker: 'LUKE', text: 'These planks look a little different...' }]],
                area: { x: -12, y: -12, width: 122, height: 96 }
            }
        },
        {
            type: 'padlocked_hatch',
            id: 'secret_room_padlocked_hatch',
            x: 352,
            y: 368,
            width: 92,
            height: 82,
            interaction: {
                enabled: true,
                type: 'sequence',
                priority: 8,
                prompt: 'to inspect the hatch',
                conversations: [[{ speaker: 'LUKE', text: 'There is a padlock on it.' }]],
                area: { x: -12, y: -18, width: 116, height: 112 }
            }
        },
        { 
            type: 'wall_switch', 
            id: 'secret_room_light_switch', 
            x: 360, 
            y: 38, 
            width: 14, 
            height: 24,
            interaction: {
                enabled: true,
                type: 'sequence',
                priority: 5,
                conversations: [
                    [{ speaker: 'LUKE', text: '*klik*' }]
                ],
                area: { x: -36, y: -12, width: 92, height: 110 }
            }
        }
      ]
    },
    ruined_classroom: {
      width: 880,
      height: 560,
      wallHeight: 110,
      padding: 32,
      theme: 'classroom',
      doors: [
        {
          id: 'door_ruined_to_secret',
          x: 18, y: 214, width: 64, height: 88,
          orientation: 'left',
          target: 'secret_room',
          targetSpawn: { x: 392, y: 360 },
          prompt: 'back to the hidden room'
        }
      ],
      spawn: { x: 120, y: 260 },
      furniture: [
        { type: 'whiteboard', x: 300, y: 28, width: 260, height: 60 },
        { type: 'debris', x: 250, y: 102, width: 44, height: 20 },
        { type: 'debris', x: 574, y: 92, width: 56, height: 24 },
        { type: 'debris', x: 132, y: 420, width: 58, height: 20 },
        { type: 'debris', x: 690, y: 438, width: 74, height: 24 },
        { type: 'desk', variant: 'study', x: 180, y: 184, width: 70, height: 60 },
        { type: 'student', headless: true, x: 203, y: 218, width: 24, height: 36, variant: 'boy', shirt: '#8d6e63', name: 'MILO' },
        { type: 'desk', variant: 'study', x: 360, y: 184, width: 70, height: 60 },
        { type: 'student', headless: true, x: 383, y: 218, width: 24, height: 36, variant: 'girl', shirt: '#90a4ae', name: 'KATE' },
        { type: 'desk', variant: 'study', x: 540, y: 184, width: 70, height: 60 },
        { type: 'student', headless: true, x: 563, y: 218, width: 24, height: 36, variant: 'boy', shirt: '#7986cb', name: 'REY' },
        { type: 'desk', variant: 'study', x: 180, y: 304, width: 70, height: 60 },
        { type: 'student', headless: true, x: 203, y: 338, width: 24, height: 36, variant: 'girl', shirt: '#ef9a9a', name: 'NIA' },
        { type: 'desk', variant: 'study', x: 360, y: 304, width: 70, height: 60 },
        { type: 'student', headless: true, x: 383, y: 338, width: 24, height: 36, variant: 'boy', shirt: '#4db6ac', name: 'JULES' },
        { type: 'desk', variant: 'study', x: 540, y: 304, width: 70, height: 60 },
        { type: 'student', headless: true, x: 563, y: 338, width: 24, height: 36, variant: 'girl', shirt: '#ce93d8', name: 'ARIA' },
        { type: 'locker', x: 742, y: 130, width: 46, height: 98 },
        { type: 'locker', x: 742, y: 230, width: 46, height: 98 },
        { type: 'locker', x: 742, y: 330, width: 46, height: 98 },
        { type: 'window', x: 120, y: 24, width: 90, height: 50 },
        { type: 'window', x: 650, y: 24, width: 90, height: 50 }
      ]
    },
    endless_hallway: {
      width: 2200,
      height: 560,
      wallHeight: 96,
      padding: 32,
      theme: 'hall',
      doors: [
        {
          id: 'door_hallway_from_ruined',
          x: 2110, y: 214, width: 64, height: 88,
          orientation: 'right',
          target: 'ruined_classroom',
          targetDoorId: 'door_ruined_to_secret',
          prompt: 'back to the ruined classroom'
        },
        {
          id: 'door_hallway_to_library',
          x: 18, y: 214, width: 64, height: 88,
          orientation: 'left',
          target: 'library_archive',
          targetDoorId: 'door_library_from_hall',
          prompt: 'to the library'
        }
      ],
      spawn: { x: 2064, y: 258 },
      furniture: [
        { type: 'rug', x: 120, y: 206, width: 1920, height: 128, color: '#3b2a29', border: '#705246' },
        { type: 'rug', x: 150, y: 230, width: 1860, height: 80, color: '#241817' },
        { type: 'window', x: 190, y: 20, width: 90, height: 50 },
        { type: 'window', x: 590, y: 20, width: 90, height: 50 },
        { type: 'window', x: 990, y: 20, width: 90, height: 50 },
        { type: 'window', x: 1390, y: 20, width: 90, height: 50 },
        { type: 'window', x: 1790, y: 20, width: 90, height: 50 },
        { type: 'whiteboard', x: 320, y: 28, width: 180, height: 52, scribbleText: ['DO NOT', 'LOOK BACK'], scribbleColor: '#5a1010' },
        { type: 'whiteboard', x: 760, y: 28, width: 180, height: 52, scribbleText: ['THE HALL', 'GETS LONGER'], scribbleColor: '#222' },
        { type: 'whiteboard', x: 1200, y: 28, width: 180, height: 52, scribbleText: ['HE READ', 'ALL OF THEM'], scribbleColor: '#6f1010' },
        { type: 'whiteboard', x: 1640, y: 28, width: 180, height: 52, scribbleText: ['LIBRARY', 'THIS WAY'], scribbleColor: '#2f3f52' },
        { type: 'bookshelf', x: 128, y: 110, width: 88, height: 126 },
        { type: 'bookshelf', x: 1960, y: 110, width: 88, height: 126 },
        { type: 'debris', x: 520, y: 382, width: 54, height: 18 },
        { type: 'debris', x: 1060, y: 390, width: 62, height: 20 },
        { type: 'debris', x: 1520, y: 378, width: 58, height: 18 }
      ]
    },
    library_archive: {
      width: 980,
      height: 640,
      wallHeight: 110,
      padding: 32,
      theme: 'office',
      doors: [
        {
          id: 'door_library_from_hall',
          x: 890, y: 210, width: 64, height: 88,
          orientation: 'right',
          target: 'endless_hallway',
          targetDoorId: 'door_hallway_to_library',
          prompt: 'back to the hallway'
        }
      ],
      spawn: { x: 820, y: 268 },
      furniture: [
        { type: 'whiteboard', x: 360, y: 34, width: 260, height: 58, scribbleText: ['ARCHIVE ROOM'], scribbleColor: '#263238' },
        { type: 'rug', x: 330, y: 180, width: 260, height: 330, color: '#5a4338', border: '#c4a06b' },
        { type: 'bookshelf', x: 60, y: 132, width: 88, height: 126 },
        { type: 'bookshelf', x: 60, y: 282, width: 88, height: 126 },
        { type: 'bookshelf', x: 60, y: 432, width: 88, height: 126 },
        { type: 'bookshelf', x: 832, y: 132, width: 88, height: 126 },
        { type: 'bookshelf', x: 832, y: 282, width: 88, height: 126 },
        { type: 'bookshelf', x: 832, y: 432, width: 88, height: 126 },
        { type: 'bookshelf', x: 220, y: 132, width: 88, height: 126 },
        { type: 'bookshelf', x: 360, y: 132, width: 88, height: 126 },
        { type: 'bookshelf', x: 500, y: 132, width: 88, height: 126 },
        { type: 'bookshelf', x: 640, y: 132, width: 88, height: 126 },
        {
          type: 'table',
          x: 392,
          y: 324,
          width: 160,
          height: 70,
          interaction: {
            enabled: true,
            type: 'sequence',
            priority: 5,
            conversations: [[
              { speaker: 'LUKE', text: 'Fresh drag marks cut through the dust. Someone took something heavy from this table.' }
            ]],
            area: { x: -20, y: -10, width: 200, height: 110 }
          }
        },
        {
          type: 'bookshelf',
          x: 222,
          y: 442,
          width: 88,
          height: 126,
          interaction: {
            enabled: true,
            type: 'sequence',
            priority: 4,
            conversations: [[
              { speaker: 'LUKE', text: 'One section is empty. The missing books were pulled out recently.' }
            ]],
            area: { x: -10, y: -10, width: 108, height: 146 }
          }
        },
        { type: 'debris', x: 458, y: 266, width: 42, height: 16 },
        { type: 'plant', x: 158, y: 74, width: 36, height: 80, potColor: '#d7ccc8' },
        { type: 'plant', x: 786, y: 74, width: 36, height: 80, potColor: '#d7ccc8' }
      ]
    }
  }
};
