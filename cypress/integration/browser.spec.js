describe("Browser test suit", function () {
    afterEach(() => {
        cy.logout();
    });
    it("Given I'm an admin, when I click browser and choose the first source, I can click on uri link and visit Abstract Object page", function () {
        cy.login("admin");

        cy.get("#ui-id-2 > #toolsTreeDiv > .jstree-container-ul > #sourceBrowser > #sourceBrowser_anchor").click();

        cy.get(".jstree-container-ul > #OWL > .jstree-children > #CFIHOS-ISO > #CFIHOS-ISO_anchor").click();

        cy.get('span[class="treeType_Class"]').contains("AbstractObject").click();

        cy.get(".infosTable > tbody > tr:nth-child(1) > td > a").click();

        cy.get('a[href="http://data.15926.org/dm/AbstractObject"]');
    });
});
