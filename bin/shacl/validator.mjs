import rdf from '@zazuko/env-node'
import SHACLValidator from 'rdf-validate-shacl'
import {writeFileSync,readFileSync}from 'fs'
//import N3Writer from "n3/lib/N3Writer.js";


//const N3 =import('n3')





export async function validateTriples(_shapes,_triples){


   // const shapes = await rdf.dataset().import(_shapes)
   // const data = await rdf.dataset().import(_triples)

var shapesPath="D:\\myShapes.ttl"
    var dataPath="D:\\myData.ttl"
    try {

    writeFileSync(shapesPath,_shapes)
    writeFileSync(dataPath,_triples)

const shapes = await rdf.dataset().import(rdf.fromFile(shapesPath))
const data = await rdf.dataset().import(rdf.fromFile(dataPath))

        const validator = new SHACLValidator(shapes, {factory: rdf})
        const report = await validator.validate(data)
        for (const result of report.results) {
            // See https://www.w3.org/TR/shacl/#results-validation-result for details
            // about each property
            console.log(result.message)
            console.log(result.path)
            console.log(result.focusNode)
            console.log(result.severity)
            console.log(result.sourceConstraintComponent)
            console.log(result.sourceShape)
        }

        // Validation report as RDF dataset
        // console.log(await report.dataset.serialize({ format: 'text/n3' }))
        var result = await report.dataset.serialize({format: 'text/n3'})
        return result
    }
    catch(e){
    console.log(e)
        throw(e)
    }






}




async function main(triples, callback) {
    const shapes = await rdf.dataset().import(rdf.fromFile("D:\\projects\\sls-shacl\\rdf\\exampleShapes.ttl"));
    const data = await rdf.dataset().import(rdf.fromFile("D:\\projects\\sls-shacl\\rdf\\exampleData.ttl"));

    const validator = new SHACLValidator(shapes, { factory: rdf });
    const report = await validator.validate(data);

    // Check conformance: `true` or `false`
    console.log(report.conforms);

    for (const result of report.results) {
        // See https://www.w3.org/TR/shacl/#results-validation-result for details
        // about each property
        console.log(result.message);
        console.log(result.path);
        console.log(result.focusNode);
        console.log(result.severity);
        console.log(result.sourceConstraintComponent);
        console.log(result.sourceShape);
    }

    // Validation report as RDF dataset
    // console.log(await report.dataset.serialize({ format: 'text/n3' }))
    var result = await report.dataset.serialize({ format: "text/n3" });
    return callback(null, result);
}

//main();






//https://docs.cambridgesemantics.com/graphlakehouse/v3.2/userdoc/shacl-constraints.htm

var constraintsStr="type\tconstraint\tshapeType\tdataType\texample\tdescription\n" +
    "Cardinality Constraints\tsh:maxCount\tproperty\tint\tsh:property [ sh:path ex:lastName ; sh:maxCount 1; sh:datatype xsd:string; ]\tThis constraint sets a limit on the maximum number of values for a property. The following example limits the lastName property to one value\n" +
    "Cardinality Constraints\tsh:minCount\tproperty\tint\tsh:property [ sh:path ex:lastName ; sh:minCount 1; sh:maxCount 1; sh:datatype xsd:string ]\tThis constraint requires a minimum number of values for a property. The following example requires the lastName property to have one value.\n" +
    "Logical Constraints\tsh:or\tnode, property\tURI list\tsh:property [ sh:path ex:child ; sh:or (ex:biological ex:adopted) ]\tThis constraint requires a node or property to conform to at least one of the listed shapes. The following example requires the child property to contain a value that conforms to the biological or adopted shapes.\n" +
    "Logical Constraints\tsh:and\tnode, property\tURI list\tsh:property [ sh:path ex:employee ; sh:and (ex:person ex:organization) ]\tThis constraint requires a node or property to conform to all of the listed shapes. The following example requires the employee property to conform to the person and organization shapes.\n" +
    "Logical Constraints\tsh:not\tnode, property\tURI\tsh:property [ sh:path ex:president ; sh:not ex:felon ; ]\tThis constraint defines a condition where a node or property must not conform to any of the listed shapes. The following example specifies that the president property cannot conform to the felon shape.\n" +
    "Logical Constraints\tsh:xone\tnode, property\tURI list\tsh:property [ sh:path ex:child ; sh:xone (ex:biological ex:adopted) ]\tThis constraint defines a condition where a node or property must conform to one and only one of the listed shapes. The following example specifies that the child property must conform to either the biological or adopted shape but cannot conform to both shapes.\n" +
    "Other Constraints\tsh:in\tnode, property\tURI or literal list\tsh:property [ sh:path ex:continent ; sh:in (ex:Asia, ex:Europe, ex:NorthAmerica); ]\tThis constraint restricts a node or property value to be one of those specified. The following example restricts the continent property to contain one of three possible values.\n" +
    "Other Constraints\tsh:closed\tnode\t\tex:EmployeeShape a sh:NodeShape; sh:targetClass ex:Employee; sh:closed true; sh:ignoredProperties (rdf:type) sh:property [ sh:path ex:id ; sh:datatype xsd:long; ] sh:property [ sh:path ex:record ; sh:class sh:EmployeeRecord; ]\tThe closed and optional ignoredProperties constraints can be used to limit the properties that are allowed for a node. If sh:closed true, only the properties that are described in the shape are valid. You can include ignoredProperties if you want to list any properties that are not described in the shape but should be allowed for the target. In the following example, the only allowed properties for Employee are rdf:type, id, and record.\n" +
    "Other Constraints\tsh:ignoredProperties\tURI list\t\tex:EmployeeShape a sh:NodeShape; sh:targetClass ex:Employee; sh:closed true; sh:ignoredProperties (rdf:type) sh:property [ sh:path ex:id ; sh:datatype xsd:long; ] sh:property [ sh:path ex:record ; sh:class sh:EmployeeRecord; ]\tThe closed and optional ignoredProperties constraints can be used to limit the properties that are allowed for a node. If sh:closed true, only the properties that are described in the shape are valid. You can include ignoredProperties if you want to list any properties that are not described in the shape but should be allowed for the target. In the following example, the only allowed properties for Employee are rdf:type, id, and record.\n" +
    "Other Constraints\tsh:hasValue\tnode, property\tURI, literal\tex:BookShape a sh:NodeShape ; sh:targetClass ex:Book ; sh:property [ sh:path ex:genre ; sh:hasValue ex:Mystery ; ]\tThis constraint requires a node or property to have at least one value that matches the specified sh:hasValue. The following example requires the genre property for the Book node to have at least one value that is ex:Mystery.\n" +
    "Other Constraints\tsh:sparql\tnode, property\tURI,string\t\tThis SPARQL-based constraint can be used to set restrictions based on the specified SPARQL SELECT query. The following pre-bound variables are known in the SPARQL query:\n" +
    "Other Constraints\tsh:select\tnode, property\tURI,string\t\tThis SPARQL-based constraint can be used to set restrictions based on the specified SPARQL SELECT query. The following pre-bound variables are known in the SPARQL query:\n" +
    "Property Pair Constraints\tsh:equals\tproperty\tURI\tsh:property [ sh:path ex:firstName ; sh:equals ex:givenName; ]\tThis constraint requires a property to have a value that is equal to the specified value (value1 = value2). The following example requires the value for the firstName property to equal the value of givenName.\n" +
    "Property Pair Constraints\tsh:disjoint\tproperty\tURI\tsh:property [ sh:path ex:prefLabel ; sh:disjoint ex:label ; ]\tThis constraint requires a property to have a value that is not equal to the specified value (value1 != value2). The following example specifies that the prefix label must not equal the label value.\n" +
    "Property Pair Constraints\tsh:lessThan\tproperty\tURI\tsh:property [ sh:path ex:startDate ; sh:lessThan ex:endDate; ]\tThis constraint requires a property to have a value that is less than the specified value (value1 < value2). The following example requires the startDate value to be less than the endDate value.\n" +
    "Property Pair Constraints\tsh:lessThanOrEquals\tproperty\tURI\tsh:property [ sh:path ex:startDate ; sh:lessThanOrEquals ex:endDate; ]\tThis constraint requires a property to have a value that is less than or equal to the specified value (value1 <= value2). The following example requires the startDate value to be less than or equal to the endDate value.\n" +
    "Shape-Based Constraints\tsh:node\tnode, property\tURI list\tsh:property [  sh:path ex:address ;sh:minCount 1 ;  sh:node ex:AddressShape ;]\tThis constraint requires a node or property to conform to the specified shape. The following example requires that the address property conforms to the AddressShape.\n" +
    "Shape-Based Constraints\tsh:property\tnode, property\tURI list\t\tThis constraint is used to define the property shape for a node or property.\n" +
    "String-Based Constraints\tsh:minLength\tnode, property\tint\tsh:property [ sh:path ex:password ; sh:minLength 8 ; ]\tThis constraint requires a literal value or URI to meet a minimum character length. The following example requires the password property to have a value that is at least 8 characters.\n" +
    "String-Based Constraints\tsh:maxLength\tnode, property\tint\tsh:property [ sh:path ex:country ; sh:maxLength 60 ; ]\tThis constraint sets a limit on the number of characters a literal value or URI can have. The following example limits values for the country property to 60 characters.\n" +
    'String-Based Constraints\tsh:pattern\tnode\tstring\tsh:property [ sh:path ex:zipcode ; sh:pattern "^\\\\d{5}$"; ]\tThe pattern and optional flags constraint can be included to require a property or node to match a regular expression pattern. For the supported regex syntax, see the Regular Expression Syntax section of the W3C XQuery 1.0 and XPath 2.0 Functions and Operators specification.\n' +
    'String-Based Constraints\tsh:flags\tnode, property\tstring\tsh:property [ sh:path ex:zipcode ; sh:pattern "^\\\\d{5}$"; ]\tThe pattern and optional flags constraint can be included to require a property or node to match a regular expression pattern. For the supported regex syntax, see the Regular Expression Syntax section of the W3C XQuery 1.0 and XPath 2.0 Functions and Operators specification.\n' +
    'String-Based Constraints\tsh:languageIn\tproperty\tstring list\tsh:property [ sh:path ex:description ; sh:languageIn ("en", "de", "fr"); ]\tThis constraint limits the language tags that are allowed for a property. The following example limits the description property to English, German, or French.\n' +
    "String-Based Constraints\tsh:uniqueLang\tproperty\tboolean\tsh:property [ sh:path ex:label ; sh:uniqueLang true ; ]\tThis constraint creates a condition where no two values can have the same language tag. Each value must have a unique tag. The following example requires each label value to have a unique language tag.\n" +
    "Value Range Constraints\tsh:minExclusive\tnode, property\tliteral\tsh:property [ sh:path ex:length ; sh:minExclusive 0; ]\tThis constraint sets the minimum value for a node or property, excluding the value that is specified. The following example requires the minimum value for the length property to be greater than 0.\n" +
    "Value Range Constraints\tsh:maxExclusive\tnode, property\tliteral\tsh:property [ sh:path ex:price ; sh:maxExclusive 100.00; ]\tThis constraint sets the maximum value for a node or property, excluding the value that is specified. The following example requires the maximum value for the price property to be less than 100.00.\n" +
    "Value Range Constraints\tsh:minInclusive\tnode, property\tliteral\tsh:property [ sh:path ex:age ; sh:minInclusive 0; ]\tThis constraint sets the minimum value for a node or property, including the value that is specified. The following example requires the minimum value for the age property to be greater than or equal to 0.\n" +
    "Value Range Constraints\tsh:maxInclusive\tnode, property\tliteral\tsh:property [ sh:path ex:age ; sh:maxInclusive 120; ]\tThis constraint sets the maximum value for a node or property, including the value that is specified. The following example requires the maximum value for the age property to be less than or equal to 120.\n" +
    "Value Type Constraints\tsh:nodeKind\tnode, property\tURI\tsh:property [ sh:path ex:birthDate ; sh:nodeKind sh:Literal ; ]\tThis constraint requires the values for a node or property to be of a certain type. Valid nodeKind values are:\n" +
    "Value Type Constraints\tsh:datatype\tnode, property\tURI\tsh:property [ sh:path ex:age ; sh:datatype xsd:integer ; ]\tThis constraint requires each node or property value to be the specified data type. The following example requires the age property to be an integer.\n" +
    "Value Type Constraints\tsh:class\tnode, property\tURI list\tsh:property [ sh:path ex:address ; sh:class ex:PostalAddress; ]\tThis constraint requires each node or property to have an rdf:type that matches one of the values specified in sh:class. The following example requires the address property to be a PostalAddress.\n";

function getConstraintsMap() {
    var array = constraintsStr.split("\n");
    var map = {};
    array.forEach(function (line, index) {
        if (index == 0) return;
        var cells = line.split("\t");

        if (!map[cells[0]]) map[cells[0]] = {};
        map[cells[0]][cells[1]] = {
            shapeType: cells[2],
            dataType: cells[3],
            example: cells[4],
            description: cells[5],
        };
    });
    return console.log(JSON.stringify(map, null, 2));
}

//getConstraintsMap()
