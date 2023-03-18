describe("Lineage", function () {
    // Logout after each test
    afterEach(() => {
        cy.logout();
    });

    // FIXME: remove this and fix the error
    Cypress.on("uncaught:exception", (err, runnable) => {
        return false;
    });

    context("Given I'm an admin", function () {
        let data;
        beforeEach(() => {
            cy.login("admin");
        });
        it("When I log in as admin and when I click lineage and click BFO, a graph pops up", function () {
            cy.get("#lineage_anchor").click();
            cy.get("#BFO_anchor").click();
            // when we arrive in lineage, the graph is empty
            cy.window()
                .then((win) => {
                    data = win.visjsGraph.data;
                })
                .then(() => {
                    expect(data.nodes.length).to.equal(0);
                    expect(data.edges.length).to.equal(0);
                });

            cy.get("#lineage_actionsWrapper > #lineage-topclasses").click();
            cy.window()
                .then((win) => {
                    data = win.visjsGraph.data;
                })
                .then(() => {
                    cy.wait(1000);
                })
                .then(() => {
                    expect(data.nodes.length).to.equal(14);
                    expect(data.edges.length).to.equal(0);
                });

            cy.get("#lineage_actionsWrapper > #lineage-expand").click();
            cy.window()
                .then((win) => {
                    data = win.visjsGraph.data;
                })
                .then(() => {
                    cy.wait(1000);
                })
                .then(() => {
                    expect(data.nodes.length).to.equal(35);
                    expect(data.edges.length).to.equal(34);
                });
        });
    });
    context("Given I'm an owl_user", function () {
        beforeEach(() => {
            cy.login("owl_user");
        });
        it("When I click lineage and click BFO, a graph pops up", function () {
            cy.get("#lineage_anchor").click();
            cy.get("#tools-panel").should("have.css", "display", "none");
            cy.get("#BFO_anchor").click();
        });
    });

    context("Given I'm an skos_user", function () {
        beforeEach(() => {
            cy.login("skos_user");
        });
        it("When I click lineage, I can't see BFO source", function () {
            cy.get("#lineage_anchor").click();
            cy.get("#BFO_anchor").should("not.exist");
        });
    });
});
