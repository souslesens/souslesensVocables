describe("ConfigEditor tests suit", function () {
    // afterEach(() => {
    //     cy.logout();
    // });
    context("Given I'm an admin", function () {
        beforeEach(() => {
            cy.login("admin");
        });
        afterEach(() => {
            cy.resetConfig("config_1");
        });
        it("When I click Config Editor, I can see the profiles table", function () {
            cy.get("#ConfigEditor_anchor").click();
            cy.get(".MuiPaper-root").as("Table");
        });
        it("When I update a user profile, I can see the user updated in the table", function () {
            cy.get("#ConfigEditor_anchor").click();
            cy.get(".MuiPaper-root").as("Table");
            cy.get(".MuiTabs-flexContainer > :nth-child(1)").as("UserTab").click();
            cy.get("#edit-button-skos_user").as("UserToUpdate").click();
            cy.get("#select-groups").click();
            cy.get('[data-value="skos_only"]').click();
            cy.get('[data-value="owl_only"]').click().type("{esc}");
            cy.intercept("/api/v1/users").as("UsersRoute");
            cy.get("#btn-save-user").as("SaveUserButton").click();
            cy.wait("@UsersRoute").its("response.statusCode").should("eq", 200);
        });
        it("I can create a new user ", function () {
            cy.get("#ConfigEditor_anchor").click();
            cy.get(".MuiPaper-root").as("Table");
            cy.get(".MuiTabs-flexContainer > :nth-child(1)").as("UserTab").click();
            cy.get("#create-button").as("UserToUpdate").click();
            cy.get("#select-groups").click();
            cy.get('[data-value="skos_only"]').click();
            cy.get('[data-value="owl_only"]').click().type("{esc}");
            cy.intercept("/api/v1/users").as("UsersRoute");
            cy.get("#btn-save-user").as("SaveUserButton").click();
            cy.wait("@UsersRoute").its("response.statusCode").should("eq", 200);
        });
    });
});
