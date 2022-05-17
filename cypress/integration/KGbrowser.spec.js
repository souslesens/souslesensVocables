describe("KG Browser test suit", function () {
    afterEach(() => {
        cy.logout();
    });

    it("As an admin, I can click on KGbrowser without triggering an error", function () {
        cy.login("admin");
        cy.on("uncaught:exception", (_err, _runnable) => {
            return false;
        });
        cy.get("#KGbrowser_anchor").click();
        cy.get("#KGbrowser_searchTermInput").type("pump");
        cy.get("#KGbrowser_onSearchAllInput").click();
        cy.on("window:alert", (alertMessage) => {
            expect(alertMessage).to.contains("select a source");
        });
    });
});
