describe("standardizer", function () {
    afterEach(() => {
        cy.logout();
    });

    it("As an Admin, When no sources are selected and compare is clicked, an alert pops up", function () {
        cy.login("admin");

        cy.get("#ui-id-2 > #toolsTreeDiv > .jstree-container-ul > #Standardizer > #Standardizer_anchor").click();

        cy.get("#toolPanelDiv > #actionDivContolPanelDiv > #Standardizer_leftTab > #Standardizer_leftTab_words > #Standardizer_wordsTA").type("something");

        cy.get("#actionDivContolPanelDiv > #Standardizer_leftTab > .ui-tabs-nav > .ui-tabs-tab > #ui-id-13").click();

        cy.get("#actionDivContolPanelDiv > #Standardizer_leftTab > #Standardizer_leftTab_source > div > .btn").click();

        cy.on("window:alert", (alertMessage) => {
            expect(alertMessage).to.contains("select data to compare");
        });
    });
});
