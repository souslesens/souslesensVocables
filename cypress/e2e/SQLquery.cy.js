describe("SQLquery", function () {
    afterEach(() => {
        cy.logout();
    });

    it("As an admin I click on SQLquery without triggering an error ", function () {
        cy.login("admin");
        cy.get("#SQLquery_anchor").click();
        cy.get("#BFO_anchor").click();
        cy.get('[style="display: flex; flex-direction: column"] > div > .btn').as("executeQuery");
        cy.get("@executeQuery").click();
    });
});
