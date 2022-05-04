describe("Match test suit", function () {
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
        it("when I click match and choose the first source, I can search for quality", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#graphDiv > div").click();
            cy.get("#sourceMatcher_anchor").click();
            cy.get("#BFO_anchor").click();
            cy.get("#GenericTools_searchTermInput").click();
            cy.get("#GenericTools_searchTermInput").type("quality");
            cy.get(".btn:nth-child(7)").click();
            cy.get('span[class="searched_concept"]').contains("quality");
        });

        //TODO: compare with another source
        it("when I click match and choose the first source, I can compare with BFO", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#sourceMatcher_anchor").click();
            cy.get("#BFO_anchor").click();
            cy.get("#SourceMatcher_targetGraphUriSelect").select("BFO");
            cy.get(".my-1:nth-child(3)").click();
            cy.get('div[class="vis-network"]');
        });
    });

    context("Given I'm an owl_user", function () {
        beforeEach(() => {
            cy.login("owl_user");
        });
        it("when I click browser and choose the first source, I can click on uri link and visit Abstract Object page", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#graphDiv > div").click();
            cy.get("#sourceMatcher_anchor").click();
            cy.get("#BFO_anchor").click();
            cy.get("#GenericTools_searchTermInput").click();
            cy.get("#GenericTools_searchTermInput").type("quality");
            cy.get(".btn:nth-child(7)").click();
            cy.get('span[class="searched_concept"]').contains("quality");
        });

        //TODO: compare with another source
        it("when I click match and choose the first source, I can compare with BFO", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#sourceMatcher_anchor").click();
            cy.get("#BFO_anchor").click();
            cy.get("#SourceMatcher_targetGraphUriSelect").select("BFO");
            cy.get(".my-1:nth-child(3)").click();
            cy.get('div[class="vis-network"]');
        });
    });

    context("Given I'm a skos_user", function () {
        beforeEach(() => {
            cy.login("skos_user");
        });
        it("when I click browser I can't see the BFO source", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#graphDiv > div").click();
            cy.get("#sourceMatcher_anchor").click();
            cy.get("#BFO_anchor").should("not.exist");
        });

        //TODO: compare with another source
        it("when I click match and choose the first source, I can't see the BFO source", function () {
            cy.visit("http://localhost:3011/vocables/");
            cy.get("#sourceMatcher_anchor").click();
            cy.get("#BFO_anchor").should("not.exist");
            cy.get('div[class="vis-network"]').should("not.exist");
        });
    });
});
