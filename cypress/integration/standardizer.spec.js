describe("standardizer", function () {
    it("When no sources are selected and compare is clicked, an alert pops up", function () {
        cy.viewport(1920, 975);

        cy.visit("/");

        //cy.intercept("GET", "/api/v1/sources", { fixture: "sources" });
        cy.get(".modal-content > .modal-body > form > .form-group > #username").click();

        cy.get(".modal-content > .modal-body > form > .form-group > #username").type("admin");

        cy.get(".modal-content > .modal-body > form > .form-group > #password").type("admin");

        cy.get(".modal-dialog > .modal-content > .modal-body > form > .btn").click();

        cy.visit("vocables/");

        cy.get("#ui-id-2 > #toolsTreeDiv > .jstree-container-ul > #Standardizer > #Standardizer_anchor").click();

        cy.get("#toolPanelDiv > #actionDivContolPanelDiv > #Standardizer_leftTab > #Standardizer_leftTab_words > #Standardizer_wordsTA").type("something");

        cy.get("#actionDivContolPanelDiv > #Standardizer_leftTab > .ui-tabs-nav > .ui-tabs-tab > #ui-id-13").click();

        cy.get("#actionDivContolPanelDiv > #Standardizer_leftTab > #Standardizer_leftTab_source > div > .btn").click();

        cy.on("window:alert", (alertMessage) => {
            expect(alertMessage).to.contains("select data to compare");
        });
    });
});
