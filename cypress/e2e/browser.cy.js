describe("Browser test suit", function () {
    before(() => {
        cy.refreshBfoIndex();
    });

    context("Given I'm an admin", function () {
        beforeEach(() => {
            cy.resetConfig();
            cy.login("admin");
        });
        it("when I click browser and choose the first source, I can click on uri link and visit Abstract Object page", function () {
            cy.get("#sourceBrowser_anchor").click();
            cy.get("#BFO_anchor").click();
            cy.get('span[class="treeType_Class"]').contains("continuant").click();
            cy.get('a[href="http://purl.obolibrary.org/obo/BFO_0000002"]');
        });
    });

    context("Given I'm an owl_user", function () {
        afterEach(() => {
            cy.logout();
        });
        beforeEach(() => {
            cy.login("owl_user");
        });
        it("when I click browser and choose the first source, I can click on uri link and visit Abstract Object page", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#sourceBrowser_anchor").click();
            cy.get("#BFO_anchor").click();
            cy.get('span[class="treeType_Class"]').contains("continuant").click();
            cy.get('a[href="http://purl.obolibrary.org/obo/BFO_0000002"]');
        });
    });

    context("Given I'm a skos_user", function () {
        afterEach(() => {
            cy.logout();
        });
        beforeEach(() => {
            cy.login("skos_user");
        });
        it("when I click browser I can't see the BFO source", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#sourceBrowser_anchor").click();
            cy.get("#BFO_anchor").should("not.exist");
        });
    });
});
