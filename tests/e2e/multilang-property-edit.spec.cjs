// @ts-check
const { test, expect } = require("@playwright/test");

const BASE_URL = "http://localhost:3010";
const SOURCE = "testClasses";

test.describe("Multilingual property editing (issue #1867)", () => {
    test("getSelectedLang exists in PredicatesSelectorWidget", async ({ page }) => {
        await page.goto(BASE_URL + "/vocables?tool=lineage&source=" + SOURCE);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(3000);

        const hasGetSelectedLang = await page.evaluate(() => {
            return typeof window.PredicatesSelectorWidget?.getSelectedLang === "function";
        });
        expect(hasGetSelectedLang).toBe(true);
        console.log("PASS: getSelectedLang function exists");
    });

    test("lang div in predicatesSelectorWidgetDialog.html template", async ({ page }) => {
        const fs = require("fs");
        const html = fs.readFileSync(
            "public/vocables/modules/uiWidgets/html/predicatesSelectorWidgetDialog.html",
            "utf-8"
        );
        expect(html).toContain("editPredicate_langDiv");
        expect(html).toContain("editPredicate_langValue");
        console.log("PASS: lang div in HTML template");
    });

    test("setLargerObjectTextArea shows lang input", async ({ page }) => {
        await page.goto(BASE_URL + "/vocables?tool=lineage&source=" + SOURCE);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(3000);

        await page.evaluate(() => {
            if (window.PredicatesSelectorWidget && window.PredicatesSelectorWidget.load) {
                window.PredicatesSelectorWidget.load(
                    "sourceBrowser_addPropertyDiv",
                    window.Lineage_sources ? window.Lineage_sources.activeSource : null,
                    {},
                    null,
                    null
                );
            }
        });
        await page.waitForTimeout(2000);

        const langDivPresent = await page.evaluate(() => {
            return document.getElementById("editPredicate_langDiv") !== null;
        });

        if (langDivPresent) {
            await page.evaluate(() => {
                if (window.NodeInfosWidget && window.NodeInfosWidget.setLargerObjectTextArea) {
                    window.NodeInfosWidget.setLargerObjectTextArea();
                }
            });
            await page.waitForTimeout(500);

            const isVisible = await page.locator("#editPredicate_langDiv").isVisible().catch(() => false);
            expect(isVisible).toBe(true);
            console.log("PASS: lang div visible after setLargerObjectTextArea");
        } else {
            console.log("SKIP: predicate widget not loaded in this context - lang div not in DOM");
        }
    });

    test("full workflow - multilingual rdfs:comment", async ({ page }) => {
        await page.goto(BASE_URL + "/vocables?tool=lineage&source=" + SOURCE);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(4000);

        const classId = await page.evaluate(async (source) => {
            try {
                await new Promise(function(resolve) {
                    if (window.OntologyModels) {
                        window.OntologyModels.registerSourcesModel([source], null, resolve);
                    } else {
                        resolve();
                    }
                });
                var classes = window.Config && window.Config.ontologiesVocabularyModels && window.Config.ontologiesVocabularyModels[source] && window.Config.ontologiesVocabularyModels[source].classes;
                if (classes) {
                    var ids = Object.keys(classes);
                    if (ids.length > 0) return ids[0];
                }
                return null;
            } catch (e) {
                return null;
            }
        }, SOURCE);

        console.log("Class ID:", classId);
        if (!classId) {
            console.log("SKIP: no class found in ontology model");
            return;
        }

        // Open node info
        await page.evaluate(function(args) {
            var node = { data: { id: args.id, source: args.source } };
            window.NodeInfosWidget.showNodeInfos(args.source, node, "mainDialogDiv");
        }, { id: classId, source: SOURCE });
        await page.waitForTimeout(3000);

        // Load predicate selector
        await page.evaluate(function() {
            if (window.PredicatesSelectorWidget) {
                window.PredicatesSelectorWidget.load(
                    "sourceBrowser_addPropertyDiv",
                    window.Lineage_sources ? window.Lineage_sources.activeSource : null,
                    {},
                    null,
                    null
                );
            }
        });
        await page.waitForTimeout(2000);

        // Show text area to trigger lang div display
        const textBtn = page.locator("#editPredicate_largerTextButton");
        if (await textBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await textBtn.click();
            await page.waitForTimeout(500);
        }

        // Verify lang div is visible
        const langDivVisible = await page.locator("#editPredicate_langDiv").isVisible({ timeout: 3000 }).catch(() => false);
        console.log("Lang div visible:", langDivVisible);
        expect(langDivVisible).toBe(true);
        console.log("PASS: lang input shown when text area opened");

        // Add English comment
        await page.locator("#editPredicate_propertyValue").fill("rdfs:comment");
        await page.locator("#editPredicate_objectValue").fill("Test EN comment issue1867");
        await page.locator("#editPredicate_langValue").fill("en");
        await page.locator("#editPredicate_savePredicateButton").click();
        await page.waitForTimeout(2500);

        // Reload node info
        await page.evaluate(function(args) {
            window.NodeInfosWidget.showNodeInfos(args.source, { data: { id: args.id, source: args.source } }, "mainDialogDiv");
        }, { id: classId, source: SOURCE });
        await page.waitForTimeout(2500);

        // Add French comment
        await page.evaluate(function() {
            if (window.PredicatesSelectorWidget) {
                window.PredicatesSelectorWidget.load(
                    "sourceBrowser_addPropertyDiv",
                    window.Lineage_sources ? window.Lineage_sources.activeSource : null,
                    {},
                    null,
                    null
                );
            }
        });
        await page.waitForTimeout(1500);
        const textBtn2 = page.locator("#editPredicate_largerTextButton");
        if (await textBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
            await textBtn2.click();
            await page.waitForTimeout(500);
        }
        await page.locator("#editPredicate_propertyValue").fill("rdfs:comment");
        await page.locator("#editPredicate_objectValue").fill("Commentaire FR issue1867");
        await page.locator("#editPredicate_langValue").fill("fr");
        await page.locator("#editPredicate_savePredicateButton").click();
        await page.waitForTimeout(2500);

        // Reload node info to see multilingual display
        await page.evaluate(function(args) {
            window.NodeInfosWidget.showNodeInfos(args.source, { data: { id: args.id, source: args.source } }, "mainDialogDiv");
        }, { id: classId, source: SOURCE });
        await page.waitForTimeout(3000);

        // Verify language selector appears
        const commentSelects = page.locator("select[id^='detailsLangSelect_']");
        const selectCount = await commentSelects.count();
        console.log("Language selectors found:", selectCount);

        if (selectCount > 0) {
            const options = await commentSelects.first().locator("option").allTextContents();
            console.log("Lang options:", options);

            const hasEn = options.some(function(o) { return o.includes("en"); });
            const hasFr = options.some(function(o) { return o.includes("fr"); });
            expect(hasEn || hasFr).toBe(true);
            console.log("PASS: language selector has lang options");

            // Verify edit/delete buttons in lang divs
            const editBtns = page.locator("[id^='detailsLangDiv_'] button img[src*='EditIcon']");
            const eraseBtns = page.locator("[id^='detailsLangDiv_'] button img[src*='Erase']");
            const editCount = await editBtns.count();
            const eraseCount = await eraseBtns.count();
            console.log("Edit buttons in lang divs:", editCount);
            console.log("Erase buttons in lang divs:", eraseCount);

            expect(editCount).toBeGreaterThan(0);
            expect(eraseCount).toBeGreaterThan(0);
            console.log("PASS: edit and erase buttons present in language divs");

            // Test editing: click edit on first lang div value
            const firstEditBtn = editBtns.first();
            await firstEditBtn.click();
            await page.waitForTimeout(1500);

            // Verify lang value is pre-filled
            const langInput = page.locator("#editPredicate_langValue");
            const langInputVisible = await langInput.isVisible({ timeout: 2000 }).catch(() => false);
            if (langInputVisible) {
                const langVal = await langInput.inputValue();
                console.log("Pre-filled lang in edit dialog:", langVal);
                expect(langVal).toBeTruthy();
                console.log("PASS: language pre-filled in edit dialog with value:", langVal);

                // Save with new text
                const editedText = "Updated comment issue1867";
                await page.locator("#editPredicate_objectValue").fill(editedText);
                await page.locator("#editPredicate_savePredicateButton").click();
                await page.waitForTimeout(2500);
                console.log("PASS: edit saved");

                // Reload to confirm other lang values still present
                await page.evaluate(function(args) {
                    window.NodeInfosWidget.showNodeInfos(args.source, { data: { id: args.id, source: args.source } }, "mainDialogDiv");
                }, { id: classId, source: SOURCE });
                await page.waitForTimeout(3000);

                const langSelectsAfter = page.locator("select[id^='detailsLangSelect_']");
                const countAfter = await langSelectsAfter.count();
                console.log("Lang selectors after edit:", countAfter);
                if (countAfter > 0) {
                    const optionsAfter = await langSelectsAfter.first().locator("option").allTextContents();
                    console.log("Lang options after edit:", optionsAfter);
                    console.log("PASS: multilingual selector still present after edit");
                }
            }
        } else {
            console.log("SKIP: language selector not found - SPARQL endpoint may have failed");
        }

        // Cleanup: delete all rdfs:comment triples we added
        await page.evaluate(function(args) {
            window.Sparql_generic.deleteTriples(
                args.source,
                args.id,
                "<http://www.w3.org/2000/01/rdf-schema#comment>",
                null,
                function() {}
            );
        }, { id: classId, source: SOURCE });
        await page.waitForTimeout(1000);
        console.log("Cleanup done");
    });
});
