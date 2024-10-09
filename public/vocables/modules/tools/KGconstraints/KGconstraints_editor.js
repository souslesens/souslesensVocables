import KGquery_filter_bot from "../../bots/KGquery_filter_bot.js";
import KGconstraintsEditor_bot from "../../bots/KGconstraintsEditor_bot.js";
import OntologyModels from "../../shared/ontologyModels.js";
import _botEngine from "../../bots/_botEngine.js";

//https://docs.cambridgesemantics.com/anzograph/v3.1/userdoc/shacl-constraints.htm
var KGconstraints_editor = (function () {
    var self = {}

    self.onLoaded = function () {
        $("#graphDiv").load("./modules/tools/KGconstraints/html/centralPanel.html", function () {
            $("#lateralPanelDiv").load("./modules/tools/KGconstraints/html/leftPanel.html", function () {

                self.currentSource = "DALIA_LIFEX_COSTS"// Lineage_sources.activeSource


            })
        })
    }


    self.getModelFromKGOld= function (callback) {
        var inferredModel = {}
        //getClassesFomKG
        async.series([

            //get effective distinct ObjectProperties
            function (callbackSeries) {
                KGquery_graph.message("getInferredModel");
                OntologyModels.getInferredModel(source, {}, function (err, result) {
                    if (err) {
                        return callbackSeries(err);
                    }
                    inferredModel = inferredModel.concat(result);

                    callbackSeries();
                });
            },

            function (callbackSeries) {
                KGquery_graph.message("getInferredClassValueDataTypes");
                OntologyModels.getInferredClassValueDataTypes(source, {}, function (err, result) {
                    if (err) {
                        return callbackSeries(err);
                    }

                    result.forEach(function (item) {
                        if (item.datatype) {
                            if (!nonObjectProperties[item.class.value]) {
                                nonObjectProperties[item.class.value] = [];
                            }
                            nonObjectProperties[item.class.value].push({
                                label: Sparql_common.getLabelFromURI(item.prop.value),
                                id: item.prop.value,
                                datatype: item.datatype.value,
                            });
                        }
                    });
                    callbackSeries();
                });
            }
            ], function (err) {


            return callback(err, model)


        })


    }

    self.startConstraintEidtorBot = function () {
      KGquery_graph.getInferredModelVisjsData(self.currentSource,function(err,model){
            if (err) {
                return alert(err)
            }
            var params = {source: self.currentSource, model: model, constraintsMap:self.constraintsMap}
            KGconstraintsEditor_bot.start(KGconstraintsEditor_bot.workflow_dataTypePropertyConstraint, params, function (err, result) {
                if (err) {
                    return alert(err)
                }

                self.buildClassShape(KGconstraintsEditor_bot.params)

            })
        })
    }

    self.buildClassShape = function (botParams) {
        var shape= {
            classUri : botParams.classUri,
            path : botParams.propertyUri,
        }
        if(botParams.propertyTargetClass)
            shape.value="<"+botParams.propertyTargetClass+">"
        else if(botParams.propertyTargetString)
            shape.value="\""+botParams.propertyTargetClass+"\""
        else if(botParams.propertyTargetInt)
            shape.value=botParams.propertyTargetClass
        else
            shape.value="\""+botParams.propertyTargetClass+"\""


        var shape="schema:"+shape.classUri+"Shape\n" +
        "    a sh:NodeShape ;\n" +
        "    sh:targetClass <"+shape.classUri+">;\n" +
        "    sh:property [\n" +
        "        sh:path "+shape.path+" ;\n" +
             shape.value+

        "    ] ;"

var x=shape;


        var header="@prefix dash: <http://datashapes.org/dash#> .\n" +
            "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n" +
            "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n" +
            "@prefix schema: <http://schema.org/> .\n" +
            "@prefix sh: <http://www.w3.org/ns/shacl#> .\n" +
            "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n"


    }

    //https://docs.cambridgesemantics.com/anzograph/v3.1/userdoc/shacl-constraints.htm
    self.constraintsMap={
        "Cardinality Constraints": {
            "sh:maxCount": {
                "shapeType": ["property"],
                "dataType": ["int"],
                "example": "sh:property [ sh:path ex:lastName ; sh:maxCount 1; sh:datatype xsd:string; ]",
                "description": "This constraint sets a limit on the maximum number of values for a property. The following example limits the lastName property to one value"
            },
            "sh:minCount": {
                "shapeType": ["property"],
                "dataType":  ["int"],
                "example": "sh:property [ sh:path ex:lastName ; sh:minCount 1; sh:maxCount 1; sh:datatype xsd:string ]",
                "description": "This constraint requires a minimum number of values for a property. The following example requires the lastName property to have one value."
            }
        },
        "Logical Constraints": {
            "sh:or": {
                "shapeType": ["node", "property"],
                "dataType": ["URI list"],
                "example": "sh:property [ sh:path ex:child ; sh:or (ex:biological ex:adopted) ]",
                "description": "This constraint requires a node or property to conform to at least one of the listed shapes. The following example requires the child property to contain a value that conforms to the biological or adopted shapes."
            },
            "sh:and": {
                "shapeType": ["node", "property"],
                "dataType":  ["URI list"],
                "example": "sh:property [ sh:path ex:employee ; sh:and (ex:person ex:organization) ]",
                "description": "This constraint requires a node or property to conform to all of the listed shapes. The following example requires the employee property to conform to the person and organization shapes."
            },
            "sh:not": {
                "shapeType": ["node", "property"],
                "dataType": ["URI"],
                "example": "sh:property [ sh:path ex:president ; sh:not ex:felon ; ]",
                "description": "This constraint defines a condition where a node or property must not conform to any of the listed shapes. The following example specifies that the president property cannot conform to the felon shape."
            },
            "sh:xone": {
                "shapeType":["node", "property"],
                "dataType": ["URI list"],
                "example": "sh:property [ sh:path ex:child ; sh:xone (ex:biological ex:adopted) ]",
                "description": "This constraint defines a condition where a node or property must conform to one and only one of the listed shapes. The following example specifies that the child property must conform to either the biological or adopted shape but cannot conform to both shapes."
            }
        },
        "Other Constraints": {
            "sh:in": {
                "shapeType":["node", "property"],
                "dataType": ["URI","literal list"],
                "example": "sh:property [ sh:path ex:continent ; sh:in (ex:Asia, ex:Europe, ex:NorthAmerica); ]",
                "description": "This constraint restricts a node or property value to be one of those specified. The following example restricts the continent property to contain one of three possible values."
            },
            "sh:closed": {
                "shapeType": ["node"],
                "dataType":  ["URI list","boolean"],
                "example": "ex:EmployeeShape a sh:NodeShape; sh:targetClass ex:Employee; sh:closed true; sh:ignoredProperties (rdf:type) sh:property [ sh:path ex:id ; sh:datatype xsd:long; ] sh:property [ sh:path ex:record ; sh:class sh:EmployeeRecord; ]",
                "description": "The closed and optional ignoredProperties constraints can be used to limit the properties that are allowed for a node. If sh:closed true, only the properties that are described in the shape are valid. You can include ignoredProperties if you want to list any properties that are not described in the shape but should be allowed for the target. In the following example, the only allowed properties for Employee are rdf:type, id, and record."
            },

            "sh:hasValue": {
                "shapeType":["node", "property"],
                "dataType": ["URI", "literal"],
                "example": "ex:BookShape a sh:NodeShape ; sh:targetClass ex:Book ; sh:property [ sh:path ex:genre ; sh:hasValue ex:Mystery ; ]",
                "description": "This constraint requires a node or property to have at least one value that matches the specified sh:hasValue. The following example requires the genre property for the Book node to have at least one value that is ex:Mystery."
            },
            "sh:sparql": {
                "shapeType":["node", "property"],
                "dataType": ["URI","string"],
                "example": "",
                "description": "This SPARQL-based constraint can be used to set restrictions based on the specified SPARQL SELECT query. The following pre-bound variables are known in the SPARQL query:"
            },

        },
        "Property Pair Constraints": {
            "sh:equals": {
                "shapeType": ["property"],
                "dataType": ["URI"],
                "example": "sh:property [ sh:path ex:firstName ; sh:equals ex:givenName; ]",
                "description": "This constraint requires a property to have a value that is equal to the specified value (value1 = value2). The following example requires the value for the firstName property to equal the value of givenName."
            },
            "sh:disjoint": {
                "shapeType": ["property"],
                "dataType": ["URI"],
                "example": "sh:property [ sh:path ex:prefLabel ; sh:disjoint ex:label ; ]",
                "description": "This constraint requires a property to have a value that is not equal to the specified value (value1 != value2). The following example specifies that the prefix label must not equal the label value."
            },
            "sh:lessThan": {
                "shapeType":["property"],
                "dataType": ["URI"],
                "example": "sh:property [ sh:path ex:startDate ; sh:lessThan ex:endDate; ]",
                "description": "This constraint requires a property to have a value that is less than the specified value (value1 < value2). The following example requires the startDate value to be less than the endDate value."
            },
            "sh:lessThanOrEquals": {
                "shapeType": ["property"],
                "dataType":  ["URI"],
                "example": "sh:property [ sh:path ex:startDate ; sh:lessThanOrEquals ex:endDate; ]",
                "description": "This constraint requires a property to have a value that is less than or equal to the specified value (value1 <= value2). The following example requires the startDate value to be less than or equal to the endDate value."
            }
        },
        "Shape-Based Constraints": {
            "sh:node": {
                "shapeType": ["node", "property"],
                "dataType": ["URI list"],
                "example": "sh:property [  sh:path ex:address ;sh:minCount 1 ;  sh:node ex:AddressShape ;]",
                "description": "This constraint requires a node or property to conform to the specified shape. The following example requires that the address property conforms to the AddressShape."
            },
            "sh:property": {
                "shapeType":["node", "property"],
                "dataType": ["URI list"],
                "example": "",
                "description": "This constraint is used to define the property shape for a node or property."
            }
        },
        "String-Based Constraints": {
            "sh:minLength": {
                "shapeType":["node", "property"],
                "dataType":  ["int"],
                "example": "sh:property [ sh:path ex:password ; sh:minLength 8 ; ]",
                "description": "This constraint requires a literal value or URI to meet a minimum character length. The following example requires the password property to have a value that is at least 8 characters."
            },
            "sh:maxLength": {
                "shapeType": ["node", "property"],
                "dataType": ["int"],
                "example": "sh:property [ sh:path ex:country ; sh:maxLength 60 ; ]",
                "description": "This constraint sets a limit on the number of characters a literal value or URI can have. The following example limits values for the country property to 60 characters."
            },
            "sh:pattern": {
                "shapeType":["node", "property"],
                "dataType": ["string"],
                "example": "sh:property [ sh:path ex:zipcode ; sh:pattern \"^\\\\d{5}$\"; ]",
                "description": "The pattern and optional flags constraint can be included to require a property or node to match a regular expression pattern. For the supported regex syntax, see the Regular Expression Syntax section of the W3C XQuery 1.0 and XPath 2.0 Functions and Operators specification."
            },

            "sh:languageIn": {
                "shapeType": ["property"],
                "dataType": ["string list"],
                "example": "sh:property [ sh:path ex:description ; sh:languageIn (\"en\", \"de\", \"fr\"); ]",
                "description": "This constraint limits the language tags that are allowed for a property. The following example limits the description property to English, German, or French."
            },
            "sh:uniqueLang": {
                "shapeType":  ["property"],
                "dataType": ["boolean"],
                "example": "sh:property [ sh:path ex:label ; sh:uniqueLang true ; ]",
                "description": "This constraint creates a condition where no two values can have the same language tag. Each value must have a unique tag. The following example requires each label value to have a unique language tag."
            }
        },
        "Value Range Constraints": {
            "sh:minExclusive": {
                "shapeType":["node", "property"],
                "dataType":["literal"],
                "example": "sh:property [ sh:path ex:length ; sh:minExclusive 0; ]",
                "description": "This constraint sets the minimum value for a node or property, excluding the value that is specified. The following example requires the minimum value for the length property to be greater than 0."
            },
            "sh:maxExclusive": {
                "shapeType": ["node", "property"],
                "dataType": ["literal"],
                "example": "sh:property [ sh:path ex:price ; sh:maxExclusive 100.00; ]",
                "description": "This constraint sets the maximum value for a node or property, excluding the value that is specified. The following example requires the maximum value for the price property to be less than 100.00."
            },
            "sh:minInclusive": {
                "shapeType": ["node", "property"],
                "dataType":["literal"],
                "example": "sh:property [ sh:path ex:age ; sh:minInclusive 0; ]",
                "description": "This constraint sets the minimum value for a node or property, including the value that is specified. The following example requires the minimum value for the age property to be greater than or equal to 0."
            },
            "sh:maxInclusive": {
                "shapeType": ["node", "property"],
                "dataType": ["literal"],
                "example": "sh:property [ sh:path ex:age ; sh:maxInclusive 120; ]",
                "description": "This constraint sets the maximum value for a node or property, including the value that is specified. The following example requires the maximum value for the age property to be less than or equal to 120."
            }
        },
        "Value Type Constraints": {
            "sh:nodeKind": {
                "shapeType": ["node", "property"],
                "dataType": ["URI"],
                "example": "sh:property [ sh:path ex:birthDate ; sh:nodeKind sh:Literal ; ]",
                "description": "This constraint requires the values for a node or property to be of a certain type. Valid nodeKind values are:"
            },
            "sh:datatype": {
                "shapeType": ["node", "property"],
                "dataType":  ["URI"],
                "example": "sh:property [ sh:path ex:age ; sh:datatype xsd:integer ; ]",
                "description": "This constraint requires each node or property value to be the specified data type. The following example requires the age property to be an integer."
            },
            "sh:class": {
                "shapeType": ["node", "property"],
                "dataType": ["URI list"],
                "example": "sh:property [ sh:path ex:address ; sh:class ex:PostalAddress; ]",
                "description": "This constraint requires each node or property to have an rdf:type that matches one of the values specified in sh:class. The following example requires the address property to be a PostalAddress."
            }
        },

    }





    return self;
})()
export default KGconstraints_editor
window.KGconstraints_editor = KGconstraints_editor