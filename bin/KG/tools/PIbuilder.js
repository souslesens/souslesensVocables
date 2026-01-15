import httpProxy from '../../httpProxy.js';
import async from 'async';
import fs from 'fs';
var PIbuilder = {
    buildPIcsv: function () {
        var query =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "select distinct ?FunctionalObject_3 ?FunctionalObject_3Label ?FunctionalObject_3Type ?equipment_class_2 ?equipment_class_2Label ?equipment_class_2Type ?CFIHOS_Tag_Type_1 ?CFIHOS_Tag_Type_1Label ?CFIHOS_Tag_Type_1Type ?SCD_Clause_0 ?SCD_Clause_0Label ?SCD_Clause_0Type" +
            "  from <http://data.total.com/resource/one-model/assets/aftwin-uk/0.5/> WHERE {" +
            "?FunctionalObject_3    rdf:type ?FunctionalObject_3Type.filter(   ?FunctionalObject_3Type =<http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/FunctionalObject> )optional {?FunctionalObject_3 rdfs:label ?FunctionalObject_3Label}  OPTIONAL{?FunctionalObject_3 rdfs:label ?FunctionalObject_3Label}  ?FunctionalObject_3 rdf:type ?FunctionalObject_3Type. ?equipment_class_2    rdf:type ?equipment_class_2Type.filter(   ?equipment_class_2Type =<http://w3id.org/readi/rdl/CFIHOS-30000311> )optional {?equipment_class_2 rdfs:label ?equipment_class_2Label}  OPTIONAL{?equipment_class_2 rdfs:label ?equipment_class_2Label}  ?equipment_class_2 rdf:type ?equipment_class_2Type. ?CFIHOS_Tag_Type_1    rdf:type ?CFIHOS_Tag_Type_1Type.filter(   ?CFIHOS_Tag_Type_1Type =<http://w3id.org/readi/rdl/D101001495> )optional {?CFIHOS_Tag_Type_1 rdfs:label ?CFIHOS_Tag_Type_1Label}  ?CFIHOS_Tag_Type_2 <https://w3id.org/requirement-ontology/rdl/REQ_0020> |^ <https://w3id.org/requirement-ontology/rdl/REQ_0020> ?CFIHOS_Tag_Type_1.  ?equipment_class_2 <http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/concretizedBy> |^ <http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/concretizedBy> ?CFIHOS_Tag_Type_1.  ?FunctionalObject_3 <http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/represents> |^ <http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/represents> ?CFIHOS_Tag_Type_1.  OPTIONAL{?CFIHOS_Tag_Type_1 rdfs:label ?CFIHOS_Tag_Type_1Label}  ?CFIHOS_Tag_Type_1 rdf:type ?CFIHOS_Tag_Type_1Type. ?SCD_Clause_0    rdf:type ?SCD_Clause_0Type.filter(   ?SCD_Clause_0Type =<https://w3id.org/requirement-ontology/rdl/REQ_0008> )optional {?SCD_Clause_0 rdfs:label ?SCD_Clause_0Label}  ?CFIHOS_Tag_Type_1 <https://w3id.org/requirement-ontology/rdl/REQ_0021> |^ <https://w3id.org/requirement-ontology/rdl/REQ_0021> ?SCD_Clause_0.  OPTIONAL{?SCD_Clause_0 rdfs:label ?SCD_Clause_0Label}  ?SCD_Clause_0 rdf:type ?SCD_Clause_0Type.  }" +
            "  limit 20000";
        var params = { query: query };
        var sparqlServerUrl = null;

        var data;
        var objs = [];
        async.series(
            [
                function (callbackSeries) {
                    httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                        if (err) return callbackSeries(err);
                        data = result.results.bindings;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    data.forEach(function (item) {
                        var equipment = item["equipment_class_2Label"];
                        var functionalClass = item["FunctionalObject_3Label"];
                        var tag = item["CFIHOS_Tag_Type_1Label"];
                        var clause = item["SCD_Clause_0Label"];

                        var obj = {
                            equipment: equipment ? equipment.value : "",
                            functionalClass: functionalClass ? functionalClass.value : "",
                            tag: tag ? tag.value : "",
                            clause: clause ? clause.value : "",
                        };
                        objs.push(obj);
                    });

                    callbackSeries();
                },

                function (callbackSeries) {
                    var str = "clause\ttag\tfunctionalClass\tequipment\n";
                    objs.forEach(function (item) {
                        str += item.clause + "\t" + item.tag + "\t" + item.functionalClass + "\t" + item.equipment + "\n";
                    });

                    fs.writeFileSync("D:\\NLP\\ontologies\\SIL\\test.txt", str);
                    callbackSeries();
                },
            ],
            function (_err) {
                /* do nothing ? */
            },
        );
    },
};

export default PIbuilder;
PIbuilder.buildPIcsv();
