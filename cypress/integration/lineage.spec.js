describe("Lineage", function () {
    // Logout after each test
    afterEach(() => {
        cy.logout();
    });

    context("Given I'm an admin", function () {
        beforeEach(() => {
            cy.login("admin");
        });
        it("When I log in as admin and when I click lineage and click BFO, a graph pops up", function () {
            cy.get("#lineage_anchor").click();
            cy.get("#BFO_anchor").click();
        });
    });

    context("Given I'm an owl_user", function () {
        beforeEach(() => {
            cy.login("owl_user");
        });
        it("When I click lineage and click BFO, a graph pops up", function () {
            cy.get("#lineage_anchor").click();
            cy.get("#BFO_anchor").click();
        });
    });

    context("Given I'm an skos_user", function () {
        beforeEach(() => {
            cy.login("skos_user");
        });
        it("When I click lineage, I can't see BFO source", function () {
            cy.get("#lineage_anchor").click();
            cy.get("#BFO_anchor").should("not.exist");
        });
    });
});
