from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8000/index.html")

    # 1. Start Game
    page.click("#btn-play")
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/step1_play_mode.png")

    # 2. Check Menu Button in Play Mode
    menu_btn = page.get_by_role("button", name="🏠 Menu")
    expect(menu_btn).to_be_visible()

    # Reload to go back to start
    page.reload()

    # 3. Enter Dev Mode
    page.click("#btn-dev")
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/step3_dev_mode.png")

    # 4. Check Dev UI Elements
    # Edit Intro Button
    edit_intro_btn = page.get_by_role("button", name="Edit Intro Dialogue")
    expect(edit_intro_btn).to_be_visible()

    # Add Object 'zone'
    add_select = page.locator("#dev-obj-type")
    add_select.fill("zone")
    page.click("#dev-add-obj")
    page.wait_for_timeout(500)

    # Verify Zone Object is Selected and Visible in Dev Mode
    # We can check if prop panel is visible
    expect(page.locator("#dev-props")).not_to_have_class("dev-props hidden")
    # The class list string match might be tricky, checking visibility is better
    expect(page.locator("#dev-props")).to_be_visible()

    # Check "Auto Trigger" checkbox existence
    # First enable interact
    interact_lbl = page.locator("#dev-props").get_by_text("Interact", exact=False)
    interact_lbl.click()
    page.wait_for_timeout(500)

    # Now check for Auto Trigger
    auto_lbl = page.locator("#dev-props").get_by_text("Auto Trigger", exact=False)
    expect(auto_lbl).to_be_visible()

    page.screenshot(path="verification/step4_dev_props.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
