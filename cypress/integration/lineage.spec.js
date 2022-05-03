describe("Lineage", function () {
    it("When I log in as Admin and when I click lineage and click CFIHOS a graph pops up", function () {
        cy.viewport(960, 630);

        // Login as admin
        cy.visit("http://localhost:3011/login");
        cy.get("#username").click();
        cy.get("#username").type("admin");
        cy.get("#password").type("admin");
        cy.get(".btn").click();
        cy.url().should("contains", "http://localhost:3011/vocables/");

        // test BFO source
        cy.get("#lineage_anchor").click();
        cy.get("#BFO_anchor").click();
    });
});
