#!/usr/bin/env python3
"""Repeatable demo journey against a running SPA server (default localhost:8081).

Requires Python Playwright and Chromium; see README for setup. Uses fresh browser
contexts and fictional demo data only. Saves screenshots/logs to .artifacts/.
"""
import argparse
import json
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ARTIFACTS = Path('.artifacts')
COFFEE = 'A coffee & a little catch-up'
MESSAGE = 'Local browser check: see you at the public entrance!'


def journey(browser, base, name, viewport, mobile=False):
    for suffix in ('failure.png', 'failure.txt', 'result.json'):
        (ARTIFACTS / f'{name}-{suffix}').unlink(missing_ok=True)
    context = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile, timezone_id='Europe/London')
    page = context.new_page()
    page.set_default_timeout(45_000)
    expect.set_options(timeout=15_000)
    errors = []
    failed_responses = []
    page.on('response', lambda response: failed_responses.append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
    page.on('pageerror', lambda error: errors.append({'type': 'pageerror', 'message': str(error)}))
    page.on('console', lambda msg: errors.append({'type': 'console', 'message': msg.text}) if msg.type == 'error' else None)
    result = {'viewport': viewport, 'steps': [], 'errors': errors, 'failed_responses': failed_responses}
    try:
        page.goto(base, wait_until='networkidle')
        expect(page.get_by_role('heading', name='Plans changed? Find your next one.')).to_be_visible()
        expect(page.get_by_text('LOCAL DEMO', exact=True)).to_be_visible()
        expect(page.get_by_role('link', name=re.compile(r'^A coffee & a little catch-up,'))).to_be_visible()
        page.screenshot(path=str(ARTIFACTS / f'{name}-home.png'), full_page=True)
        result['steps'].append('Explore renders with explicit local-demo banner')

        # Filter categories and restore before entering a plan.
        page.get_by_role('button', name='Coffee', exact=True).click()
        expect(page.get_by_role('link', name=re.compile(r'^A coffee & a little catch-up,'))).to_be_visible()
        expect(page.get_by_role('link', name=re.compile(r'^One more for badminton\?,'))).to_have_count(0)
        page.get_by_role('button', name='All plans', exact=True).click()
        result['steps'].append('Activity filtering hides unrelated plans')

        page.get_by_role('link', name=re.compile(r'^A coffee & a little catch-up,')).click()
        expect(page.get_by_role('heading', name=COFFEE, exact=True)).to_be_visible()
        expect(page.get_by_text(re.compile('Exact meeting details unlock after acceptance'))).to_be_visible()
        expect(page.get_by_label('Message to the group', exact=True)).to_have_count(0)
        page.get_by_label('A message to the host (optional)', exact=True).fill('I would love a relaxed coffee by the river.')
        page.get_by_role('button', name='Request to join', exact=True).click()
        expect(page.get_by_text('Request sent.', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Withdraw request', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Request to join', exact=True)).to_have_count(0)
        result['steps'].append('Alex requests; pending does not unlock venue/chat or duplicate requests')

        page.get_by_role('link', name='Profile', exact=True).click()
        page.get_by_role('button', name='Maya · Host a plan', exact=True).click()
        expect(page.get_by_label('Name', exact=True)).to_have_value('Maya Patel')
        page.get_by_role('link', name='My Plans', exact=True).click()
        page.get_by_role('link', name=re.compile(r'^A coffee & a little catch-up,')).click()
        page.get_by_role('button', name='Accept Alex Morgan', exact=True).click()
        expect(page.get_by_text('Guest accepted. Their place is confirmed.', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Accept Alex Morgan', exact=True)).to_have_count(0)
        page.get_by_label('Message to the group', exact=True).fill(MESSAGE)
        page.get_by_role('button', name='Send message', exact=True).click()
        expect(page.get_by_text(MESSAGE, exact=True)).to_be_visible()
        expect(page.get_by_label('Message to the group', exact=True)).to_have_value('')
        result['steps'].append('Maya accepts Alex and sends a persisted group message')

        page.get_by_role('link', name='Profile', exact=True).click()
        page.get_by_role('button', name='Alex · Explore & join', exact=True).click()
        expect(page.get_by_label('Name', exact=True)).to_have_value('Alex Morgan')
        page.get_by_role('link', name='My Plans', exact=True).click()
        page.get_by_role('button', name='Confirmed', exact=True).click()
        page.get_by_role('link', name=re.compile(r'^A coffee & a little catch-up,')).click()
        expect(page.get_by_text('You’re in.', exact=True)).to_be_visible()
        expect(page.get_by_text('Quay Ingredient, public entrance', exact=True)).to_be_visible()
        expect(page.get_by_text(MESSAGE, exact=True)).to_be_visible()
        page.reload(wait_until='networkidle')
        expect(page.get_by_text('You’re in.', exact=True)).to_be_visible()
        expect(page.get_by_text(MESSAGE, exact=True)).to_be_visible()
        page.get_by_label('Message to the group', exact=True).fill('Local browser check: thanks, looking forward to it!')
        page.get_by_role('button', name='Send message', exact=True).click()
        expect(page.get_by_text('Local browser check: thanks, looking forward to it!', exact=True)).to_be_visible()
        result['steps'].append('Alex sees confirmation, venue and chat after actor switch and reload; can reply')

        page.get_by_role('link', name='PlanB home', exact=True).click()
        page.get_by_role('link', name='Save my plan', exact=True).click()
        page.get_by_label('Plan title', exact=True).fill('Browser check: Quayside coffee')
        page.get_by_label('Public meeting venue', exact=True).fill('Quay Ingredient public entrance')
        page.get_by_label('What’s the plan?', exact=True).fill('A fictional test coffee at a public venue to verify creating a plan.')
        page.get_by_role('button', name='Open my plan', exact=True).click()
        expect(page.get_by_role('heading', name='Browser check: Quayside coffee', exact=True)).to_be_visible()
        page.get_by_role('button', name='Edit plan', exact=True).click()
        page.get_by_label('Plan title', exact=True).fill('Browser check: Quayside coffee, updated')
        page.get_by_role('button', name='Save changes', exact=True).click()
        expect(page.get_by_role('heading', name='Browser check: Quayside coffee, updated', exact=True)).to_be_visible()
        page.get_by_role('button', name='Cancel plan', exact=True).click()
        page.get_by_role('button', name='Yes, cancel plan', exact=True).click()
        expect(page.get_by_text('Plan cancelled. Guests have been notified.', exact=True)).to_be_visible()
        expect(page.get_by_text('cancelled', exact=True)).to_be_visible()
        expect(page.get_by_label('Message to the group', exact=True)).to_have_count(0)
        page.reload(wait_until='networkidle')
        expect(page.get_by_text('cancelled', exact=True)).to_be_visible()
        result['steps'].append('Alex creates, edits and cancels a plan; cancellation persists and closes chat')

        page.get_by_role('link', name='PlanB home', exact=True).click()
        page.get_by_role('link', name='I’m free', exact=True).click()
        tomorrow = (datetime.now(ZoneInfo('Europe/London')) + timedelta(days=1)).strftime('%Y-%m-%d')
        page.get_by_label('Start date', exact=True).fill(tomorrow)
        page.get_by_label('Start time', exact=True).fill('00:00')
        page.get_by_label('End date', exact=True).fill(tomorrow)
        page.get_by_label('End time', exact=True).fill('23:59')
        page.get_by_label('Approximate area', exact=True).fill('Gateshead')
        page.get_by_role('button', name='Find matching plans', exact=True).click()
        expect(page.get_by_text('Availability saved. Your matching plans are below.', exact=True)).to_be_visible()
        expect(page.get_by_role('link', name=re.compile(r'^River views & a slow Sunday,'))).to_be_visible()
        result['steps'].append('Private availability window finds a matching Gateshead walk')

        page.get_by_role('link', name='My Plans', exact=True).click()
        page.get_by_role('button', name='Confirmed', exact=True).click()
        page.get_by_role('link', name=re.compile(r'^A coffee & a little catch-up,')).click()
        page.get_by_role('button', name='Report or block someone', exact=True).click()
        page.get_by_label('Reason for reporting', exact=True).fill('Fictional browser check report, testing the local-only report flow.')
        page.get_by_role('button', name='Store report', exact=True).click()
        expect(page.get_by_text('Demo report saved locally. No real moderation team is monitoring it.', exact=True)).to_be_visible()
        page.get_by_role('button', name='Block selected person', exact=True).click()
        page.get_by_role('button', name='Confirm block', exact=True).click()
        expect(page.get_by_text('This plan isn’t available', exact=True)).to_be_visible()
        page.reload(wait_until='networkidle')
        expect(page.get_by_text('This plan isn’t available', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Send message', exact=True)).to_have_count(0)
        saved = page.evaluate("JSON.parse(localStorage.getItem('planb:demo:v1'))")
        assert any(report['reason'].startswith('Fictional browser check report') for report in saved['reports'])
        assert any(block['blockerId'] == 'demo-alex' and block['blockedId'] == 'demo-maya' for block in saved['blocks'])
        assert not any(request['planId'] == 'coffee-quayside' and request['userId'] == 'demo-alex' and request['status'] == 'accepted' for request in saved['requests'])
        result['steps'].append('Report stored locally; block persists and revokes shared membership/chat')
        result['passed'] = not errors
    except Exception as error:
        result['passed'] = False
        result['failure'] = str(error)
        result['url'] = page.url
        page.screenshot(path=str(ARTIFACTS / f'{name}-failure.png'), full_page=True)
        (ARTIFACTS / f'{name}-failure.txt').write_text(page.locator('body').inner_text())
        raise
    finally:
        (ARTIFACTS / f'{name}-result.json').write_text(json.dumps(result, indent=2))
        context.close()
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://localhost:8081')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--only', choices=['desktop', 'phone'], help='Run a single viewport')
    args = parser.parse_args()
    ARTIFACTS.mkdir(exist_ok=True)
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        try:
            if args.only != 'phone':
                results.append(journey(browser, args.base_url, 'desktop', {'width': 1440, 'height': 1000}))
            if args.only != 'desktop':
                results.append(journey(browser, args.base_url, 'phone', {'width': 390, 'height': 844}, mobile=True))
        finally:
            browser.close()
    print(json.dumps(results, indent=2))
    if not all(result['passed'] for result in results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
