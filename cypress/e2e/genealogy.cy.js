describe("Genealogy test suit", function () {
    before(() => {
        cy.refreshBfoIndex();
    });
    afterEach(() => {
        cy.logout();
    });

    context("Given I'm an admin", function () {
        beforeEach(() => {
            cy.login("admin");
        });

        it("when I click genealogy, it display graph ancestor", () => {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#ancestors_anchor").click();
            cy.get("#BFO_anchor > .jstree-checkbox").click();
            cy.get(".my-1:nth-child(1)").click();
            cy.get("#searchWordInput").dblclick();
            cy.get("#searchWordInput").clear().type("quality");
            cy.get("div:nth-child(2) > .my-1").click();
            cy.get("#conceptOperationsDiv > .btn").click();
            cy.get('span[class="tree_level_1"]').contains("BFO");
            cy.get('div[class="vis-network"]');
        });
    });

    context("Given I'm an owl_user", function () {
        beforeEach(() => {
            cy.login("owl_user");
        });

        it("when I click genealogy, it display graph ancestor", () => {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#ancestors_anchor").click();
            cy.get("#BFO_anchor > .jstree-checkbox").click();
            cy.get(".my-1:nth-child(1)").click();
            cy.get("#searchWordInput").dblclick();
            cy.get("#searchWordInput").clear().type("quality");
            cy.get("div:nth-child(2) > .my-1").click();
            cy.get("#conceptOperationsDiv > .btn").click();
            cy.get('span[class="tree_level_1"]').contains("BFO");
            cy.get('div[class="vis-network"]');
        });
    });

    context("Given I'm a skos_user", function () {
        beforeEach(() => {
            cy.login("skos_user");
        });

        it("when I click genealogy, it can't display the BFO source", () => {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#ancestors_anchor").click();
            cy.get("#BFO_anchor").should("not.exist");
            cy.get('div[class="vis-network"]').should("not.exist");
        });
    });
});
