describe("SPARQL endpoint test suit", function () {
    afterEach(() => {
        cy.logout();
    });

    context("Given I'm an admin", function () {
        beforeEach(() => {
            cy.login("admin");
        });

        it("when I click SPARQL endpoint, I can perform a sparql query", () => {
            cy.visit('http://localhost:3011/vocables/');
            cy.get('#SPARQL_anchor').click();
            cy.get('#BFO_anchor').click();
            cy.get('#queryIcon').click();
            cy.get('table[id="DataTables_Table_0"]')

        });
    });

    context("Given I'm an owl_user", function () {
        beforeEach(() => {
            cy.login("owl_user");
        });

        it("when I click SPARQL endpoint, I can perform a sparql query", () => {
            cy.visit('http://localhost:3011/vocables/');
            cy.get('#SPARQL_anchor').click();
            cy.get('#BFO_anchor').click();
            cy.get('#queryIcon').click();
            cy.get('table[id="DataTables_Table_0"]')
        });
    });

    context("Given I'm a skos_user", function () {
        beforeEach(() => {
            cy.login("skos_user");
        });

        it("when I click genealogy, it can't display the BFO source", () => {
            cy.visit('http://localhost:3011/vocables/');
            cy.get('#SPARQL_anchor').click();
            cy.get("#BFO_anchor").should("not.exist");
            cy.get('table[id="DataTables_Table_0"]').should("not.exist");
        });
    });
});
