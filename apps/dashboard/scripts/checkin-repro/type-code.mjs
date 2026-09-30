// Drive the real CheckInModal in Chromium/WebKit.
//   cd apps/dashboard
//   pnpm exec vite --config scripts/checkin-repro/vite.config.ts --host 127.0.0.1 --port 4177
//   node scripts/checkin-repro/type-code.mjs   # needs a playwright install
// Original modal (c077828): IEEE2024 stays IEEE2024, caret 1..8, same node,
// direction ltr, text-align center, text-transform uppercase. No reverse.

import { chromium, webkit } from "playwright";

const CODE = "IEEE2024";
const URL = process.env.REPRO_URL ?? "http://127.0.0.1:4177/";
const VIEWPORTS = [
	{ name: "desktop", width: 1280, height: 720 },
	{ name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

async function snapshot(input) {
	return input.evaluate((el) => ({
		value: el.value,
		selectionStart: el.selectionStart,
		selectionEnd: el.selectionEnd,
		dir: el.dir || el.getAttribute("dir") || "",
		className: el.className,
		parentDirs: (() => {
			const dirs = [];
			let node = el.parentElement;
			while (node && dirs.length < 8) {
				dirs.push({
					tag: node.tagName,
					dir: node.dir || node.getAttribute("dir") || "",
					direction: getComputedStyle(node).direction,
				});
				node = node.parentElement;
			}
			return dirs;
		})(),
		computed: {
			direction: getComputedStyle(el).direction,
			textAlign: getComputedStyle(el).textAlign,
			textTransform: getComputedStyle(el).textTransform,
			unicodeBidi: getComputedStyle(el).unicodeBidi,
		},
	}));
}

async function runOnPage(browserName, browser, viewport) {
	const context = await browser.newContext({
		viewport: { width: viewport.width, height: viewport.height },
		isMobile: Boolean(viewport.isMobile),
		hasTouch: Boolean(viewport.hasTouch),
	});
	const page = await context.newPage();
	await page.goto(URL, { waitUntil: "networkidle" });
	const input = page.locator("#event-code");
	await input.waitFor({ state: "visible", timeout: 15_000 });
	await input.click();
	const identity = await input.evaluate((el) => {
		el.dataset.reproNode = "1";
		return el.dataset.reproNode;
	});

	const steps = [];
	for (const character of CODE) {
		await page.keyboard.type(character, { delay: 40 });
		const sameNode = await input.evaluate(
			(el, marker) => el.dataset.reproNode === marker,
			identity,
		);
		steps.push({ typed: character, sameNode, ...(await snapshot(input)) });
	}

	const submitted = await page.evaluate(() => window.__submittedCode);
	await context.close();
	return { browser: browserName, viewport: viewport.name, steps, submitted };
}

async function launch(name) {
	if (name === "webkit") {
		return webkit.launch({ headless: true });
	}
	return chromium.launch({ headless: true });
}

const engines = process.env.REPRO_BROWSERS?.split(",") ?? ["chromium"];
const results = [];

for (const engine of engines) {
	let browser;
	try {
		browser = await launch(engine);
	} catch (error) {
		results.push({ browser: engine, error: String(error) });
		continue;
	}
	try {
		for (const viewport of VIEWPORTS) {
			results.push(await runOnPage(engine, browser, viewport));
		}
	} finally {
		await browser.close();
	}
}

console.log(JSON.stringify(results, null, 2));
