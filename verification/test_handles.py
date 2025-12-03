from playwright.sync_api import sync_playwright

def verify_handles(page):
    page.goto("http://localhost:8080/index.html")

    # Click Dev Mode button
    page.click("#btn-dev")

    # Wait for canvas
    page.wait_for_selector("#scene")

    # Add an object
    page.click("#dev-add-obj")

    # Wait for props panel
    page.wait_for_selector("#dev-props", state="visible")

    # Enable interaction
    checkbox = page.locator("#prop-extra label:has-text('Interact') input")
    checkbox.click()

    # Wait for updates.
    page.wait_for_timeout(500)

    # Take screenshot to verify the 4 corner handles are visible
    page.screenshot(path="verification/handles.png")

    print("Verification script finished successfully")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_handles(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()
