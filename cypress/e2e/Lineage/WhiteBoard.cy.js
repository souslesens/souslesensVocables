  //Unit Testing Lineage 1.
describe('WhiteBoard', () => {
  before(() => {
    
    cy.viewport(1530, 730);
  })
  // WhiteBoardTab tests 1.A.

  // Test number 1.A.1
  it('Try to load Lineage on source HRMODEL-IDO-REF with URLparms, as Admin,and Profil with read access and one without to check access rights  ', () => {
   
      
  });
  // Test number 1.A.2
  it('Try to load Lineage on source HRMODEL-IDO-REF through URLparams then Use Model button , then check if nodes and relations are displayed  ', () => {
      cy.enterLineageOnIDO();
      cy.modelTestDisplay();
      
  });
  // Test number 1.A.3
  it(`Try to load Lineage on source IDO through URLparams, click on TopClasses then expand nodes until 
    Lineage window.Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length don't increase
    Then Test CSV button and check that Copy fill the Clipboard, That the #dataTableDivExport is correctly filled
    And that Export CSV button donwload a file, THen close dialog
    Click on SVG button then check if a SVG is dowloaded
    Then click on Clear all button and check that window.Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty() is false
    `, () => {
    cy.enterLineageOnIDO();
    cy.TopClassesAndExpand();
  });
  // Test number 1.A.4
  it(`Try to load Lineage on source IDO through URLparams, Then click on TopClasses, then Expand ,
     then test the window.Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length has decreased`, () => {
    
    
});
  // Test number 1.A.5
  it(`Try to load Lineage on source IDO through URLparams, click on TopClasses then expand nodes until 
    Lineage window.Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length don't increase
    Then click on Only Last and test the number of nodes`, () => {

  
  });
   // Test number 1.A.6
   it(`Click on arrowLateralPanelButton and look if the lateralPanelDiv width decrease and the icon has change
    then click again and see if the default icon and width came back, do it for each LineageTab`, () => {

  
  });
   // Test number 1.A.7
  it(`Try to load Lineage on source IDO through URLparams, click on TopClasses then expand nodes until 
    Lineage window.Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length don't increase
    Then search 'Person' Classes through visjsGraph_searchInput 
    Then right click on it --> Remove others
    Then click on parents button until  Lineage window.Lineage_whiteboard.lineageVisjsGraph.data.nodes.get().length don't increase `, () => {

  
  });
  // Test number 1.A.8
  it(` Try to load Lineage on source HR-MODEL-ABOX-REF through URLparams,
    Then click on Inferred Model and check Lineage window.Lineage_whiteboard.lineageVisjsGraph.data.nodes.get() length and predicates`, () => {

  
  });
  // Test number 1.A.9
  it(` Try to load Lineage on source BFO through URLparams, 
      Then click on Show Axiom Classes button  `, () => {

    
    });

    // Test number 1.A.10
  it(` Source no choosed yet `, () => {

  
  });
  // Test number 1.A.11
  it(`Click on moreActions button Lineage_MoreActionsButtons check that display=block
    Then click again and check display=none`, () => {

  });
  // Test number 1.A.12
  it(`Source no choosed yet`, () => {

  
  });
  //Test number 1.A.13
  it(`Load lineage on a source 
  Then click on Add Ressource Class-->'testingClass1' -->IDO-->Person-->Draw 
  Same with 'testingClass2'
  Then check they appear on whiteboard
  Then click on Add relation and choose 'hasRole' and check she is drawed
  Then right click on hasRole and delete
  Same with the two class created, right click--> node infos --> delete
  ,
  Test also that the button are not displayed :
   -in a non editable source with admin acount 
   -with a profil with read mode on a source

  `, () => {

  
  });
  //Test number 1.A.14
  it(`Launch Lineage on IDO then select an click on change source go to BFO and check if it has changed 
    `, () => {
  
    
    });
    //Test number 1.A.15
  it(`Launch Lineage on HRMODEL-IDO-REF 
    click on All then TOp classes and check that The a lot of nodes are displayed
    `, () => {
  
    
    });

     //Test number 1.A.16
  it(`Add BFO and check that she added on sourcesDiv
    `, () => {
  
    
    });


});





