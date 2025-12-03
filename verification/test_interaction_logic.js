// Mock Environment
const window = {};
let player = { x: 100, y: 100, isSitting: false, facing: 'down' };
let room = { furniture: [], doors: [] };
let dialogueBox = { classList: new Set() };
let dialogue = [];
let stage = 0;
let events = [];

// Mock Helper functions
function getNearestDoor(threshold) {
    // Return mock
    return room.doors.find(d => {
        const dist = Math.hypot(player.x - d.x, player.y - d.y);
        return dist < threshold;
    });
}
function loadLevel(name) { events.push("LoadLevel: " + name); }
function updateDialogue() { events.push("UpdateDialogue"); }
function saveLocal() {}
function showTemporaryDialogue(text) { events.push("TempDialog: " + text); }
function doorAttachmentPoint(door) { return {x: door.x, y: door.y}; }

// Copy relevant functions from script.js (simplified/adapted for test)
// NOTE: I am redefining executeInteraction and handleInteraction based on the plan changes
// to verify the logic matches what I wrote.

function executeInteraction(target) {
    if (target.type === 'door') {
        events.push("Interact Door P:" + target.priority);
        return;
    }
    if (target.type === 'furniture') {
        const item = target.obj;
        const interaction = item.interaction;
        if (!interaction.state) interaction.state = { count: 0 };
        const count = interaction.state.count;

        events.push("Interact Furn P:" + target.priority + " Count:" + count);

        // Valid Convo Logic
        const validConvos = interaction.conversations.filter(c => {
            if (Array.isArray(c)) return true;
            if (c.reqCount !== undefined && count !== parseInt(c.reqCount)) return false;
            if (c.minCount !== undefined && count < parseInt(c.minCount)) return false;
            if (c.maxCount !== undefined && count > parseInt(c.maxCount)) return false;
            if (c.once && c.seen) return false;
            return true;
        });

        if (validConvos.length > 0) {
             const selected = validConvos[0];
             if (!Array.isArray(selected)) selected.seen = true;
             interaction.state.count++;
             events.push("Dialogue Started");
        } else {
             events.push("No Valid Dialogue");
        }
    }
}

function handleInteraction() {
    // Simplified Candidate Collection Logic matching the code
    const candidates = [];

    // Furniture
    room.furniture.forEach(item => {
        if (item.interaction && item.interaction.enabled) {
             // Mock overlap check
             const dist = Math.hypot(player.x - item.x, player.y - item.y);
             if (dist < 50) {
                 candidates.push({ type: 'furniture', obj: item, priority: item.interaction.priority || 1 });
             }
        }
    });

    // Doors
    room.doors.forEach(door => {
        const dist = Math.hypot(player.x - door.x, player.y - door.y);
        if (dist < 60) {
             candidates.push({ type: 'door', obj: door, priority: door.priority || 1 });
        }
    });

    if (candidates.length === 0) return;

    candidates.sort((a,b) => b.priority - a.priority);
    const maxP = candidates[0].priority;
    const top = candidates.filter(c => c.priority === maxP);

    // Seeded random for test stability? No, we will check set inclusion
    // Just pick first for deterministic test if length 1, else we log "Random Choice"
    if (top.length > 1) {
        events.push("Random Choice Pool Size: " + top.length);
        // We will simulate picking the first for the flow test
        executeInteraction(top[0]);
    } else {
        executeInteraction(top[0]);
    }
}

// TEST 1: Priority Resolution (Door vs Furniture)
events = [];
room.furniture = [
    { x: 100, y: 100, interaction: { enabled: true, priority: 5, conversations: [[]] } }
];
room.doors = [
    { x: 100, y: 100, priority: 1, target: "Hall" }
];
handleInteraction();
console.log("Test 1 (Furn Priority > Door):", events.includes("Interact Furn P:5 Count:0") ? "PASS" : "FAIL " + events);

// TEST 2: Priority Resolution (Door > Furniture)
events = [];
room.furniture[0].interaction.priority = 1;
room.doors[0].priority = 10;
handleInteraction();
console.log("Test 2 (Door Priority > Furn):", events.includes("Interact Door P:10") ? "PASS" : "FAIL " + events);

// TEST 3: Overlap Randomness
events = [];
room.furniture[0].interaction.priority = 5;
room.doors[0].priority = 5;
handleInteraction();
console.log("Test 3 (Equal Priority Random):", events.includes("Random Choice Pool Size: 2") ? "PASS" : "FAIL " + events);

// TEST 4: Conditional Dialogue (Req Count)
events = [];
room.furniture = [{
    x: 100, y: 100,
    interaction: {
        enabled: true,
        priority: 1,
        conversations: [
            { lines: ["First"], reqCount: 0 },
            { lines: ["Second"], reqCount: 1 }
        ]
    }
}];
room.doors = [];

// First interact
handleInteraction(); // Count 0 -> 1
const res1 = events.includes("Interact Furn P:1 Count:0") && events.includes("Dialogue Started");
events = [];

// Second interact
handleInteraction(); // Count 1 -> 2
const res2 = events.includes("Interact Furn P:1 Count:1") && events.includes("Dialogue Started");
events = [];

// Third interact (No match)
handleInteraction();
const res3 = events.includes("No Valid Dialogue");

console.log("Test 4 (Seq Logic):", res1 && res2 && res3 ? "PASS" : "FAIL");
