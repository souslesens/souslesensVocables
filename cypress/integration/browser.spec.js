describe("Browser test suit", function () {
    it("Given I'm an admin, when I click browser and choose the first source, I can click on uri link and visit Abstract Object page", function () {
        cy.viewport(960, 968);

        cy.visit("http://localhost:3010/login");

        cy.get(".modal-content > .modal-body > form > .form-group > #username").click();

        cy.get(".modal-content > .modal-body > form > .form-group > #username").type("admin");

        cy.get(".modal-content > .modal-body > form > .form-group > #password").type("admin");

        cy.get(".modal-dialog > .modal-content > .modal-body > form > .btn").click();

        cy.visit("http://localhost:3010/vocables/");

        cy.get("#ui-id-2 > #toolsTreeDiv > .jstree-container-ul > #sourceBrowser > #sourceBrowser_anchor").click();

        cy.get(".jstree-container-ul > #OWL > .jstree-children > #CFIHOS-ISO > #CFIHOS-ISO_anchor").click();

        cy.get("#currentSourceTreeDiv > .jstree-container-ul > #http\3A//data.15926.org/dm/AbstractObject_6171 > #http\3A//data.15926.org/dm/AbstractObject_6171_anchor > .treeType_Class").click();

        cy.get(".infosTable > tbody > tr:nth-child(1) > td > a").click();

        cy.visit("http://data.15926.org/dm/AbstractObject");
    });
});
