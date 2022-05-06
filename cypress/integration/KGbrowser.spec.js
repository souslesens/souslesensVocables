describe("KG Browser test suit", function () {
    afterEach(() => {
        cy.logout();
    });

    it("As an admin, I can click on KGbrowser without triggering an error", function () {
        cy.login("admin");
        cy.get("#KGbrowser_anchor").click();
        cy.wait(500);
    });
});
