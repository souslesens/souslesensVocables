// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
Cypress.Commands.add("login", (username) => {
    cy.visit("http://localhost:3011/login");
    cy.viewport(1920, 1200);
    cy.get("#username").click();
    cy.get("#username").type(username);
    cy.get("#password").type("admin");
    cy.get(".btn").click();
});

Cypress.Commands.add("logout", () => {
    // FIXME:
    cy.on("uncaught:exception", (_err, _runnable) => {
        return false;
    });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.get("#user-username").click();
    cy.get("li:nth-child(2) > .dropdown-item").click();
});

Cypress.Commands.add("refreshBfoIndex", () => {
    cy.login("admin");
    cy.visit("http://localhost:3011/vocables/");
    cy.get("#graphDiv").click();
    cy.get("#admin_anchor").click();
    cy.get("#BFO_anchor > .jstree-checkbox").click();
    cy.get(".my-1:nth-child(1)").click();
    cy.logout();
});
