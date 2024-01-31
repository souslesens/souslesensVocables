describe('Lineage', () => {
  before(() => {
    
    cy.viewport(1530, 730);
  })

  it('As a normal user, I try to load a graph and ', () => {
    cy.loadLineageAndGraph();
  })
});