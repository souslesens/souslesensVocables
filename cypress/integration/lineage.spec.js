describe("Lineage", function () {
    // Logout after each test
    afterEach(() => {
        cy.logout();
    });

    it("When I log in as admin and when I click lineage and click BFO, a graph pops up", function () {
        // Login as admin
        cy.login("admin");

        // test BFO source
        cy.get("#lineage_anchor").click();
        cy.get("#BFO_anchor").click();
    });

    it("When I log in as owl_user and when I click lineage and click BFO, a graph pops up", function () {
        // Login as owl_user
        cy.login("owl_user");

        // test BFO source
        cy.get("#lineage_anchor").click();
        cy.get("#BFO_anchor").click();
    });

    it("When I log in as skos_user and when I click lineage and click BFO, NO graph pops up", function () {
        // Login as skos_user
        cy.login("skos_user");

        // test BFO source is not available
        cy.get("#lineage_anchor").click();
        cy.get("#BFO_anchor").should("not.exist");
    });
});
