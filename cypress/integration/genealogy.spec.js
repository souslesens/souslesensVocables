describe("Genealogy tests suit", function () {
    afterEach(() => {
        cy.logout();
    });

    it("When I logged as an admin and when I click on genealogy, choose a source, and compare with a term ", function () {
        cy.login("admin");

        cy.get("#ui-id-2 > #toolsTreeDiv > .jstree-container-ul > #ancestors > #ancestors_anchor").click();

        cy.get(".jstree-container-ul > #OWL > .jstree-children > #CFIHOS-ISO > #CFIHOS-ISO_anchor").click();

        cy.get("#leftPanelDiv > #accordion > #sourcesPanel > #sourceDivControlPanelDiv > .btn").click();

        cy.get("#toolPanelDiv > #actionDiv > #dialogDiv > div:nth-child(2) > .btn").click();

        cy.get("span[class='tree_level_2']").contains("CARBON / undefined").click();

        cy.get("#toolPanelDiv > #actionDiv > #dialogDiv > #conceptOperationsDiv > .btn").click();

        cy.get("div > #centralPanelDiv > #graphDiv > .vis-network > canvas").click();
        // We cant run those steps because those elements are inside a canvas div.
        //cy.get("#accordion > #toolPanelDiv > #actionDiv > #graphPopupDiv > .popupMenuItem:nth-child(2)").click();

        //cy.get(".infosTable > tbody > tr:nth-child(1) > td > a");
    });
});
