from playwright.sync_api import sync_playwright

def verify_dev_tools(page):
    page.goto("http://localhost:8080/index.html")

    # Click Dev Mode button
    page.click("#btn-dev")

    # Wait for canvas
    page.wait_for_selector("#scene")

    # Click Add Object
    page.click("#dev-add-obj")

    # Wait for props panel
    page.wait_for_selector("#dev-props", state="visible")

    # Verify Copy/Paste buttons exist
    page.wait_for_selector("button:has-text('Copy')")
    page.wait_for_selector("button:has-text('Paste')")

    # Click "Interact" checkbox
    # We locate it inside the label that contains "Interact" text inside #prop-extra
    # Selector: #prop-extra label:has-text("Interact") input
    checkbox = page.locator("#prop-extra label:has-text('Interact') input")
    checkbox.click()

    # Check if Interaction UI appears
    # Mode selector
    page.wait_for_selector("#prop-extra label:has-text('Mode')")

    # Check for Conversation UI
    page.wait_for_selector("text=Convo #1")
    page.wait_for_selector("button:has-text('+ Line')")
    page.wait_for_selector("button:has-text('+ New Conversation')")

    # Take screenshot of the UI
    page.screenshot(path="verification/dev_ui.png")

    print("Verification script finished successfully")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_dev_tools(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
