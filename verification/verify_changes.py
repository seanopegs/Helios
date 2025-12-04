from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local server
        page.goto("http://localhost:8000")

        # Verify New Game button exists and is visible
        new_game_btn = page.locator("#btn-newgame")
        if new_game_btn.is_visible():
            print("New Game button visible")

        # Verify Developer Mode button exists
        dev_btn = page.locator("#btn-dev")
        if dev_btn.is_visible():
            print("Dev button visible")

        # Take screenshot of Start Screen
        page.screenshot(path="verification/start_screen.png")
        print("Start screen screenshot saved")

        # Click Developer Mode
        dev_btn.click()

        # Wait for scene to load
        page.wait_for_selector("#scene")

        # Verify Sidebar is visible
        sidebar = page.locator("#dev-sidebar")
        if sidebar.is_visible():
            print("Sidebar visible")

        # Take screenshot of Dev Mode
        page.screenshot(path="verification/dev_mode.png")
        print("Dev mode screenshot saved")

        # Open Object Picker
        page.locator("#dev-open-picker").click()
        page.wait_for_selector("#obj-picker")
        page.screenshot(path="verification/obj_picker.png")
        print("Object Picker screenshot saved")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
