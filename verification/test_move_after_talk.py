from playwright.sync_api import sync_playwright

def verify_movement_bug(page):
    page.goto("http://localhost:8080/index.html")

    # Click Dev Mode button
    page.click("#btn-dev")
    page.wait_for_selector("#scene")

    # 1. Add object
    page.click("#dev-add-obj")
    page.wait_for_selector("#dev-props", state="visible")

    # 2. Enable interaction
    page.locator("#prop-extra label:has-text('Interact') input").click()

    # 3. Add a simple conversation
    page.click("button:has-text('+ Line')")

    # 4. Move object NEAR player (340, 440) instead of ON TOP (340, 400)
    # Player is at 340, 400 (or close to it)
    page.fill("#prop-x", "340")
    page.fill("#prop-y", "440")
    page.evaluate("document.getElementById('prop-y').dispatchEvent(new Event('change'))")

    # Interact
    page.keyboard.press("Space")

    # Verify dialogue appears
    page.wait_for_selector("#dialogue.dialogue--active")

    # Advance dialogue forcefully
    page.evaluate("advanceDialogue()")

    # Wait for dialogue to close
    page.wait_for_selector("#dialogue:not(.dialogue--active)")

    # 5. Try to move
    initial_x = page.evaluate("player.x")

    # Press D to move right
    page.keyboard.down("d")
    page.wait_for_timeout(200)
    page.keyboard.up("d")

    final_x = page.evaluate("player.x")

    print(f"Initial X: {initial_x}, Final X: {final_x}")

    if final_x > initial_x:
        print("Success: Player moved after interaction.")
    else:
        # Check if we are still colliding
        print("Check collision or stuck state")
        page.screenshot(path="verification/stuck_debug.png")
        raise Exception("Failure: Player stuck after interaction.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_movement_bug(page)
        except Exception as e:
            print(f"Error: {e}")
            raise e
        finally:
            browser.close()
