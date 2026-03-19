import { test, expect, chromium } from "playwright/test";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "../..");

const STYLES_LESS = path.join(PROJECT_ROOT, "public/vocables/modules/shared/styles.less");
const UI_JS = path.join(PROJECT_ROOT, "public/vocables/modules/shared/UI.js");
const BOT_CSS = path.join(PROJECT_ROOT, "public/vocables/modules/uiWidgets/css/Bot.css");

test.describe("Dialog responsive behavior - issue #1796", () => {
    test("styles.less: .ui-dialog has max-width and max-height constraints", () => {
        const content = fs.readFileSync(STYLES_LESS, "utf8");
        expect(content).toContain(".ui-dialog");
        expect(content).toMatch(/\.ui-dialog\s*\{[^}]*max-width[^}]*\}/s);
        expect(content).toMatch(/\.ui-dialog\s*\{[^}]*max-height[^}]*\}/s);
    });

    test("styles.less: .ui-dialog-content has overflow: auto", () => {
        const content = fs.readFileSync(STYLES_LESS, "utf8");
        expect(content).toContain(".ui-dialog-content");
        expect(content).toMatch(/\.ui-dialog-content[^}]*overflow[^}]*auto/s);
    });

    test("styles.less: dialog divs have overflow: auto", () => {
        const content = fs.readFileSync(STYLES_LESS, "utf8");
        expect(content).toContain("#mainDialogDiv");
        expect(content).toContain("#smallDialogDiv");
        expect(content).toContain("#botPanel");
        const overflowSection = content.match(/#mainDialogDiv[\s\S]*?#botPanel[\s\S]*?\}/);
        expect(overflowSection).not.toBeNull();
    });

    test("UI.js: openDialog sets maxWidth and maxHeight based on window size", () => {
        const content = fs.readFileSync(UI_JS, "utf8");
        const openDialogFn = content.match(/self\.openDialog\s*=\s*function[\s\S]*?self\.setDialogTitle/);
        expect(openDialogFn).not.toBeNull();
        expect(openDialogFn[0]).toContain("maxWidth");
        expect(openDialogFn[0]).toContain("maxHeight");
        expect(openDialogFn[0]).toContain("window.innerWidth");
        expect(openDialogFn[0]).toContain("window.innerHeight");
    });

    test("UI.js: repositionOpenDialogs function exists", () => {
        const content = fs.readFileSync(UI_JS, "utf8");
        expect(content).toContain("self.repositionOpenDialogs");
        expect(content).toContain("repositionOpenDialogs()");
    });

    test("UI.js: window resize handler calls repositionOpenDialogs", () => {
        const content = fs.readFileSync(UI_JS, "utf8");
        const resizeHandler = content.match(/window\.addEventListener[\s\S]*?"resize"[\s\S]*?true,?\s*\)/);
        expect(resizeHandler).not.toBeNull();
        expect(resizeHandler[0]).toContain("repositionOpenDialogs");
    });

    test("UI.js: repositionOpenDialogs constrains all dialog types", () => {
        const content = fs.readFileSync(UI_JS, "utf8");
        const reposFn = content.match(/self\.repositionOpenDialogs\s*=\s*function[\s\S]*?\};/);
        expect(reposFn).not.toBeNull();
        expect(reposFn[0]).toContain("mainDialogDiv");
        expect(reposFn[0]).toContain("smallDialogDiv");
        expect(reposFn[0]).toContain("botPanel");
        expect(reposFn[0]).toContain("widgetGenericDialogDiv");
        expect(reposFn[0]).toContain("maxWidth");
        expect(reposFn[0]).toContain("maxHeight");
    });

    test("Bot.css: botPanel uses responsive min() sizing", () => {
        const content = fs.readFileSync(BOT_CSS, "utf8");
        const botPanelRule = content.match(/#botPanel\s*\{[^}]*\}/s);
        expect(botPanelRule).not.toBeNull();
        expect(botPanelRule[0]).toMatch(/width:\s*min\(/);
        expect(botPanelRule[0]).toMatch(/height:\s*min\(/);
        expect(botPanelRule[0]).toContain("vw");
        expect(botPanelRule[0]).toContain("vh");
    });

    test("styles.less: ui-dialog max constraints use viewport units", () => {
        const content = fs.readFileSync(STYLES_LESS, "utf8");
        const uiDialogSection = content.match(/\.ui-dialog\s*\{[^}]*\}/s);
        expect(uiDialogSection).not.toBeNull();
        expect(uiDialogSection[0]).toMatch(/vw/);
        expect(uiDialogSection[0]).toMatch(/vh/);
    });
});
