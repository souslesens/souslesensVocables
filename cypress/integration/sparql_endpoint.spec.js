describe("Sparql Endpoint test suit", function () {
    afterEach(() => {
        cy.logout();
    });

    it("When I logged as an admin and when I click on genealogy, choose a source, and compare with a term ", function () {
        cy.login("admin");

        cy.get("#SPARQL").click();

        // cy.on("uncaught:exception", () => {
        //     return false;
        // });
    });
});
