// Mock Environment
let dialogueBox = { classList: new Set() };
let isHintActive = false;
let events = [];

function advanceDialogue() {
    events.push("Advanced Dialogue");
}

function handleInteraction() {
    events.push("Interaction Triggered");
}

// Keydown Logic Simulation (The code I just wrote)
function onKeyDown(key) {
    if (key === " ") {
        if (dialogueBox.classList.has("dialogue--active") && !isHintActive) {
             advanceDialogue();
        } else {
             handleInteraction();
        }
    }
}

// Helper to reset state
function reset() {
    events = [];
    dialogueBox.classList.clear();
    isHintActive = false;
}

// Scenario 1: Normal Dialogue (No Hint)
reset();
dialogueBox.classList.add("dialogue--active");
isHintActive = false;
onKeyDown(" ");
console.log("Scenario 1 (Dialogue Active, No Hint):", events[0] === "Advanced Dialogue" ? "PASS" : "FAIL " + events);

// Scenario 2: Hint Active (Door Nearby)
reset();
dialogueBox.classList.add("dialogue--active");
isHintActive = true;
onKeyDown(" ");
console.log("Scenario 2 (Hint Active):", events[0] === "Interaction Triggered" ? "PASS" : "FAIL " + events);

// Scenario 3: No Dialogue, No Hint
reset();
onKeyDown(" ");
console.log("Scenario 3 (No UI):", events[0] === "Interaction Triggered" ? "PASS" : "FAIL " + events);
