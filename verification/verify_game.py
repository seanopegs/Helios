from playwright.sync_api import sync_playwright
import time
import json

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Use persistent context to ensure localStorage saves?
    # Actually normal context should preserve across reload.
    context = browser.new_context()
    page = context.new_page()

    # 1. Verify Intro Fix
    print("Loading Game...")
    page.goto("http://localhost:8000")

    # Click New Game
    print("Clicking New Game...")
    page.click("#btn-play")
    time.sleep(1)

    # Check introSeen status
    seen = page.evaluate("playData.introSeen")
    print(f"DEBUG: playData.introSeen = {seen}")

    # Fast forward dialogue
    print("Skipping Intro...")
    page.evaluate("stage = dialogue.length - 1; updateDialogue();")
    page.evaluate("stage += 1; updateDialogue();")
    time.sleep(0.5)

    # Check if saved
    seen_after = page.evaluate("playData.introSeen")
    ls_data = page.evaluate("localStorage.getItem('helios_play_data')")
    print(f"DEBUG: After skip, playData.introSeen = {seen_after}")
    print(f"DEBUG: LocalStorage = {ls_data}")

    # Reload and Continue
    print("Reloading...")
    page.reload()
    time.sleep(1)

    # Check LocalStorage after reload
    ls_data_reload = page.evaluate("localStorage.getItem('helios_play_data')")
    print(f"DEBUG: After reload, LocalStorage = {ls_data_reload}")

    # Click Continue
    if page.locator("#btn-continue").count() > 0:
        print("Clicking Continue...")
        page.click("#btn-continue")
        time.sleep(1)

        seen_cont = page.evaluate("playData.introSeen")
        print(f"DEBUG: After Continue, playData.introSeen = {seen_cont}")

        dialogue_box = page.locator("#dialogue")
        classes = dialogue_box.get_attribute("class")
        if "dialogue--hidden" not in classes:
             print("FAIL: Intro dialogue shown on Continue")
             # Force close it to continue test
             page.evaluate("stage = dialogue.length; updateDialogue();")
        else:
             print("PASS: Intro dialogue skipped on Continue")
    else:
        print("FAIL: No Continue button")

    # 2. Verify Cutscene
    print("Teleporting to Lecture Room...")
    page.evaluate("loadLevel('lecture')")
    # Reset lecture_seen to false just in case
    page.evaluate("playData.worldState['lecture_seen'] = false")
    time.sleep(0.5)

    page.evaluate("player.x = 215; player.y = 500;")
    time.sleep(0.5)

    print("Sitting...")
    page.keyboard.press("Space")
    time.sleep(1)

    has_teacher = page.evaluate("room.furniture.some(f => f.type === 'teacher')")
    if has_teacher:
        print("PASS: Teacher spawned")
    else:
        print("FAIL: Teacher not spawned")

    print("Waiting for Teacher walk...")
    time.sleep(3)
    page.screenshot(path="verification/1_teacher_walking.png")

    print("Waiting for Dialogue...")
    time.sleep(3) # Wait more for arrival

    dialogue_box = page.locator("#dialogue")
    classes = dialogue_box.get_attribute("class")
    if "dialogue--hidden" in classes:
         print("FAIL: Dialogue not active during cutscene")
    else:
         print("PASS: Dialogue active during cutscene")
         text = page.locator("#dialogue-line").inner_text()
         print(f"Dialogue: {text}")

    print("Skipping Lecture Dialogue...")
    page.evaluate("stage = dialogue.length - 1; updateDialogue();")
    page.evaluate("stage += 1; updateDialogue();")

    print("Waiting for Lights Out...")
    time.sleep(3)

    darkness = page.evaluate("globalDarkness")
    print(f"Global Darkness: {darkness}")
    if darkness >= 0.9:
        print("PASS: Darkness applied")
    else:
        print("FAIL: Darkness not applied")

    page.screenshot(path="verification/2_lights_out.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
