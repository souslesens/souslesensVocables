describe("Kgmapping test suit", function () {
    afterEach(() => {
        cy.logout();
    });

    it.skip("When I click on KGmapping", function () {
        cy.login("admin");
        cy.get("#KGmappings_anchor").click();
    });
});
