// This is a mock test to verify logic flow, as we cannot run the full game in node easily without a browser shim
// We will simulate the state variables and the function logic

let dialogueBox = { classList: new Set() };
let dialogue = ["Line 1", "Line 2"];
let stage = 0;
let isDeveloperMode = false;
let keys = new Set();
let events = [];

function advanceDialogue() {
    stage++;
    events.push("Advanced to " + stage);
}

function handleInteraction() {
    events.push("Interaction Triggered");
}

// Keydown Logic Simulation
function onKeyDown(key) {
    if (key === " ") {
        if (dialogueBox.classList.has("dialogue--active")) {
             advanceDialogue();
             return; // Proposed Change: RETURN here
        }
        handleInteraction();
    }
}

// Scenario 1: No Dialogue
dialogueBox.classList.delete("dialogue--active");
onKeyDown(" ");
console.log("Scenario 1 (No Dialogue):", events.pop() === "Interaction Triggered" ? "PASS" : "FAIL");

// Scenario 2: Dialogue Active
dialogueBox.classList.add("dialogue--active");
stage = 0;
onKeyDown(" ");
console.log("Scenario 2 (Dialogue Active):", events.pop() === "Advanced to 1" ? "PASS" : "FAIL");

// Double check interaction didn't fire in Scenario 2
if (events.length > 0) console.log("FAIL: Extra events fired", events);
