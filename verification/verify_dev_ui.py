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

        # Enable Developer Mode
        page.click("#btn-dev")

        # Wait for canvas (game start)
        page.wait_for_selector("#scene")

        # Simulate selecting an object (e.g., clicking on the player or adding a new object)
        # It's easier to add a new object to ensure we have something selected
        page.click("#dev-add-obj")

        # Wait for properties panel to appear
        page.wait_for_selector("#dev-props:not(.hidden)")

        # Check for new Interaction Priority input
        # It's inside a div.dev-prop-row -> label "Priority"
        # We search for text "Priority"
        priority_label = page.get_by_text("Priority")
        if priority_label.is_visible():
            print("Priority Field Found")

        # Check for Interaction Checkbox
        # Expand interaction if needed (it defaults to unchecked in code unless we added one that has it)
        # The add-obj code adds a default object.
        # Let's toggle interaction ON
        page.get_by_label("Interact").check()

        # Check for advanced condition fields (Req, Min, Max, Once)
        # These are dynamically added when interactions exist.
        # Default interaction added by 'Interact' check has 1 empty conversation.
        # The UI code renders these fields for each conversation.

        page.wait_for_selector("text=Req:")
        page.wait_for_selector("text=Min:")
        page.wait_for_selector("text=Max:")
        page.wait_for_selector("text=Once")

        print("Advanced Condition Fields Found")

        # Take screenshot of the Properties Panel
        # We can clip to the relevant area
        panel = page.locator("#dev-sidebar")
        panel.screenshot(path="verification/dev_ui_check.png")

        browser.close()

if __name__ == "__main__":
    run()
