describe('SPARQL', () => {
  before(() => {
    
    cy.viewport(1530, 730);
  })
  //5.A.1
  it('Enter on SPARQL trough url params fill the query div with a select * from IDO click on execute and check that the result is displayed', () => {
      cy.enterLineageOnIDO();
      cy.modelTestDisplay();
      
  });
  
});





