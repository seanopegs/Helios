from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Determine the absolute path to the index.html file
        current_dir = os.getcwd()
        file_path = f"file://{current_dir}/index.html"

        print(f"Navigating to {file_path}")
        page.goto(file_path)

        # 1. Take a screenshot of the Start Screen
        page.screenshot(path="verification/1_start_screen.png")
        print("Captured Start Screen")

        # 2. Switch to Developer Mode
        page.click("#btn-dev")

        # Wait for Sidebar to appear
        page.wait_for_selector("#dev-sidebar")

        # 3. Take a screenshot of Dev Mode with Sidebar
        page.screenshot(path="verification/2_dev_mode.png")
        print("Captured Dev Mode")

        # 4. Open Object Picker
        page.click("#dev-open-picker")
        page.wait_for_selector("#object-picker")

        # 5. Screenshot Object Picker
        page.screenshot(path="verification/3_object_picker.png")
        print("Captured Object Picker")

        browser.close()

if __name__ == "__main__":
    run()
