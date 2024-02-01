describe('Lineage', () => {
  before(() => {
    
    cy.viewport(1530, 730);
  })

  it('As a normal user, I try to load a lineage  and test to dislayGraph, we see if there is a graph Display and see if legend is here', () => {
      cy.enterLineageOnIDO();
      cy.modelTestDisplay();
      
  });
});