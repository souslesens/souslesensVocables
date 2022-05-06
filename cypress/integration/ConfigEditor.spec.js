describe("ConfigEditor tests suit", function () {
    afterEach(() => {
        cy.logout();
    });

    it("As an admin, when I click Config Editor, I can see the profiles table", function () {
        cy.login("admin");
        cy.get("#ConfigEditor_anchor").click();
        cy.get(".MuiPaper-root").as("Table");
    });
});
