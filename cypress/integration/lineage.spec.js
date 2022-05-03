describe("Lineage", function () {
    it("When I log in as Admin and when I click lineage and click CFIHOS a graph pops up", function () {
        cy.viewport(960, 630);

        cy.visit("http://localhost:3011/login");

        cy.get(".modal-content > .modal-body > form > .form-group > #username").click();

        cy.get(".modal-content > .modal-body > form > .form-group > #username").type("admin");

        cy.get(".modal-content > .modal-body > form > .form-group > #password").type("admin");

        cy.get(".modal-dialog > .modal-content > .modal-body > form > .btn").click();

        cy.visit("http://localhost:3010/vocables/");

        cy.get("#ui-id-2 > #toolsTreeDiv > .jstree-container-ul > #lineage > #lineage_anchor").click();

        cy.get(".jstree-container-ul > #OWL > .jstree-children > #CFIHOS-ISO > #CFIHOS-ISO_anchor").click();

        //FIXME: https://forge.extranet.logilab.fr/totalenergies/tsf/-/issues/140
        cy.on("uncaught:exception", (_err, _runnable) => {
            return false;
        });

        cy.get("div > #centralPanelDiv > #graphDiv > .vis-network > canvas").click();
    });
});
