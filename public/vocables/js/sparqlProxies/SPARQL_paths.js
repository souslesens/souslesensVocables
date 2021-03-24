var SPARQL_paths=(function(){

    /*


https://stackoverflow.com/questions/26698675/sparql-property-path-queries-with-arbitrary-properties
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct count(*) from <http://data.total.com/resource/one-model/assets/sil/> WHERE {?s (<>|!<>) ?o. ?s rdf:type <http://w3id.org/readi/rdl/CFIHOS-30000654>   } limit 100


 PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> select distinct ?p ?obj from <http://data.total.com/resource/one-model/assets/sil/> WHERE {?sub (<>|!<>)* ?x .
?x ?p ?y .
?y (<>|!<>)* ?obj . ?sub rdf:type <http://w3id.org/readi/rdl/CFIHOS-30000654>   } limit 100






 */


})()
