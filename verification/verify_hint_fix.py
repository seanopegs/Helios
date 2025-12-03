from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load the index.html directly
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Start game
        page.click("#btn-play")
        page.wait_for_selector("#scene")

        # We need to simulate being near a door to trigger the hint.
        # Since controlling the player via keyboard in headless might be tricky with frame timing,
        # we can inject JS to force the player position near a door.

        # Get a door position first
        door_pos = page.evaluate("""() => {
            const door = room.doors[0]; // Assuming there is at least one door
            return {x: door.x, y: door.y, width: door.width, height: door.height};
        }""")

        print(f"Door found at: {door_pos}")

        # Teleport player near the door
        page.evaluate(f"""() => {{
            player.x = {door_pos['x']} + {door_pos['width']}/2;
            player.y = {door_pos['y']} + {door_pos['height']} + 20;
        }}""")

        # Wait a bit for the game loop to update and drawHints to fire
        page.wait_for_timeout(500)

        # Check if "Press [SPACE] to open" is visible
        # It's in #dialogue-line
        dialogue_text = page.inner_text("#dialogue-line")
        print(f"Dialogue Text: {dialogue_text}")

        if "Press [SPACE] to open" in dialogue_text:
            print("Hint is visible.")
            # Check class of dialogue box
            classes = page.get_attribute("#dialogue", "class")
            print(f"Classes: {classes}")
            if "dialogue--active" in classes:
                print("Dialogue is active (as expected for hint).")

                # NOW, press Space
                page.keyboard.press("Space")

                # Check if interaction happened.
                # If interaction happened (enter door), the level might change or player pos might change.
                # Or simply, if it was treated as "Advance Dialogue", nothing would happen
                # (or it would try to go to next line, but hints are single line).

                # Actually, if we enter a door, 'loadLevel' is called.
                # We can spy on loadLevel or check title.
                page.wait_for_timeout(500)

                # If we entered a door, usually the title changes or player pos changes significantly
                # Let's check if loadLevel was called by checking document title if it was different?
                # Or better, check if we are still in the same spot?

                # Actually, simpler verification: The bug was that NOTHING happened.
                # If the logic works, handleInteraction is called.
                print("Space pressed.")
            else:
                print("FAIL: Hint did not make dialogue active?")
        else:
            print("FAIL: Hint not showing.")

        browser.close()

if __name__ == "__main__":
    run()
