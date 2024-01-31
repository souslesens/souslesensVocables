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
    cy.intercept("http://localhost:3011/api/v1/config").as("getConfig");
    cy.intercept("http://localhost:3011/api/v1/sources").as("getSources");
    cy.intercept("http://localhost:3011/api/v1/profiles").as("getProfiles");
    cy.get("#username").click();
    cy.get("#username").type(username);
    cy.get("#password").type("admin");
    cy.get(".btn").click();
    cy.wait("@getConfig").its("response.statusCode").should("to.be.oneOf", [200, 304]);
    cy.wait("@getSources").its("response.statusCode").should("to.be.oneOf", [200, 304]);
    cy.wait("@getProfiles").its("response.statusCode").should("to.be.oneOf", [200, 304]);
});

Cypress.Commands.add("logout", () => {
    // FIXME:
    cy.on("uncaught:exception", (_err, _runnable) => {
        return false;
    });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.get("#dropdownMenuLink").click();
    cy.get("#logout-button").click();
});

Cypress.Commands.add("refreshBfoIndex", () => {
    cy.login("admin");
    cy.visit("http://localhost:3011/vocables/");
    cy.get("#graphDiv").click();
    cy.get("#admin_anchor").click();
    cy.get("#BFO_anchor > .jstree-checkbox").click();
    cy.get(".my-1:nth-child(1)").click();
    cy.on("uncaught:exception", (_err, _runnable) => {
        return false;
    });
    cy.logout();
});

Cypress.Commands.add("resetConfig", (configName = "config_1") => {
    cy.exec("rm -rf tests/data/config");
    cy.exec("mkdir -p tests/data/config");
    cy.exec(`cp -r tests/data/config_templates/${configName}/* tests/data/config/`);
});

Cypress.Commands.add("waitForProfilesAndSources", () => {
    cy.intercept("http://localhost:3011/api/v1/sources").as("getSources");
    cy.wait("@getSources");
    cy.intercept("http://localhost:3011/api/v1/profiles").as("getProfiles");
    cy.wait("@getProfiles");
});


/*  Karim test */
// Verify the state of The source selector and capacity to launch sources
Cypress.Commands.add("loadLineageAndGraph",()=>{
    cy.visit("http://localhost:3010/vocables/?tool=lineage");
    cy.intercept('/vocables/responsive/css/KGcreator/KGcreatorSkin.css').as('getLessSkin')
    cy.wait('@getLessSkin').then(
        (interception)=>{
            cy.wait(500);
            cy.get('#sourceSelector_searchInput').type('IDO');
            cy.get('#sourceSelector_searchInput').type('{enter}');
            cy.get('#'+'IDO'+'_anchor').click();
            //enter on lineage inerface in source IDO if is available
            cy.get('.slsv-button-1').first().click();
            cy.wait(500);
            cy.window().then(window => {
                const graphIsHere=window.Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty();
                cy.log(graphIsHere);
            });
            
        }
    );
    
})