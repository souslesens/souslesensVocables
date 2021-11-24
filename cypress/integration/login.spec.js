describe("Login testing", () => {
    it("can visit login page", () => {
        cy.visit("/");
        cy.get("form");
    });
    it("can fill username", () => {
        cy.get('input[id="username"]').type("test").should("have.value", "test");
    });
    it("can fill password", () => {
        cy.get('input[id="password"]').type("test password").should("have.value", "test password");
    });
    it("can fill fields with correct credentials and click submit button", () => {
        cy.get('input[id="username"]').type("admin")
        cy.get('input[id="password"]').type("admin")
        cy.get('form').submit()
        cy.visit("/vocables")

    });
    it("click submit button without credentials yield alerts", () => {
        cy.get('form').submit()
        cy.get('.alert')
            .should('have.text', "Missing credentials")
    });
    it("can't fill fields with incorrect credentials and click submit button", () => {
        cy.get('input[id="username"]').type("incorrect")
        cy.get('input[id="password"]').type("incorrect")
        cy.get('form').submit()
        cy.get('.alert').should('have.text', "Incorrect username or password.")

    });



});