import sys
from playwright.sync_api import sync_playwright

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        print("Navigating to http://localhost:3001...")
        page.goto("http://localhost:3001", timeout=15000)
        page.wait_for_timeout(3000)
        
        # Take full page screenshot
        page.screenshot(path="d:/DOANTOTNGHIEP/scratch/dashboard_live_full.png")
        print("Saved scratch/dashboard_live_full.png")
        
        # Scroll to charts if available
        charts_elem = page.query_selector("canvas")
        if charts_elem:
            charts_elem.screenshot(path="d:/DOANTOTNGHIEP/scratch/dashboard_chart_crop.png")
            print("Saved scratch/dashboard_chart_crop.png")
        
        browser.close()
        print("Capture complete!")
except Exception as e:
    print("Playwright error:", e)
