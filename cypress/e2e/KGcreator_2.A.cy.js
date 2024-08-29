describe('KGcreator', () => {
  // 2
  before(() => {
    
    cy.viewport(1530, 730);
  })
    // Test number 2.A.1
    it(`Open KGcreator on HR-MODEL-ABOX-REF,csvSources-->  Employe_Competency--> View samples triples
      Check table content then Mapping graph
      And check graph `, () => {
      
    });
  
     // Test number 2.A.2
     it(`delete ALL KGcreator triples and create triples and check that Lineage inferred model is correct`, () => {
    
     });
     // Test number 2.A.3
     it(`Recreate Graph and Abort check that the mapping process stopped`, () => {
    
     });
     // Test number 2.A.4
     it(`Recreate Graph and check that Lineage inferred model is correct`, () => {
    
     });
    
      // Test number 2.A.5
     it(`Select {
      "s": "Employee",
      "p": "rdf:type",
      "o": "owl:NamedIndividual"
      } on mapping editor then test selected Mappings and check that only the concerned mappings are on table `, () => {
    
     });
     // Test number 2.A.6
     it(`Delete  {
"s": "Employee",
"p": "rdf:type",
"o": "http://rds.posccaesar.org/ontology/lis14/rdl/Person"
}, {
      "s": "Employee",
      "p": "rdf:type",
      "o": "owl:NamedIndividual"
      }
      on mapping editor then save and check that only the view sample triples results has decrease
       Then do it again through the bot by clicking on employee 
       --> namedIndividual --> set rdf:type --> IDO --> Person and check that the result of view sample triples
        came back of the number before this unit test
       `, () => {
    
     });
     // Test number 2.A.7
     it(` right click on Employe_competency file then trasnform then prefix URI toto
      Then test and add clicking
      Then View sample triples
      check that mapping file has changed and has a transform and check that with 
      table search toto you obtain the result on toto-Ambre has result
      Then delete transforms click on mapping graph and check that transform is not here   `, () => {
    
     });
     // Test number 2.A.8
     it(`Choose a source with multiples files `, () => {
    
     });

});





