

/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */



var sparqlTests = (function () {
    var self = {};

    // Test suite for getUriFilter function
    self.getUriFilterTests = function () {
    console.log("=== Testing getUriFilter function ===\n");
    
    // Test 1: Single URI
    console.log("Test 1: Single URI");
    var result1 = Sparql_common.getUriFilter("s", ["http://example.org/uri1"]);
    console.log("Input: ['http://example.org/uri1']");
    console.log("Output:", result1);
    console.log("Expected: filter( ?s=<http://example.org/uri1>).");
    console.log("✓ Pass:", result1 === "filter( ?s=<http://example.org/uri1>).");
    console.log("");
    
    // Test 2: Multiple URIs
    console.log("Test 2: Multiple URIs");
    var result2 = Sparql_common.getUriFilter("s", ["http://example.org/uri1", "http://example.org/uri2"]);
    console.log("Input: ['http://example.org/uri1', 'http://example.org/uri2']");
    console.log("Output:", result2);
    console.log("Expected: filter (?s in (<http://example.org/uri1>,<http://example.org/uri2>)).");
    console.log("");
    
    // Test 3: Single blank node
    console.log("Test 3: Single blank node");
    var result3 = Sparql_common.getUriFilter("s", ["nodeID://b2052626"]);
    console.log("Input: ['nodeID://b2052626']");
    console.log("Output:", result3);
    console.log("Expected: filter (str(?s) = \"nodeID://b2052626\").");
    console.log("");
    
    // Test 4: Multiple blank nodes
    console.log("Test 4: Multiple blank nodes");
    var result4 = Sparql_common.getUriFilter("s", ["nodeID://b2052626", "nodeID://b2052627"]);
    console.log("Input: ['nodeID://b2052626', 'nodeID://b2052627']");
    console.log("Output:", result4);
    console.log("Expected: filter (str(?s) in (\"nodeID://b2052626\",\"nodeID://b2052627\")).");
    console.log("");
    
    // Test 5: Mixed - one URI and one blank node
    console.log("Test 5: Mixed - one URI and one blank node");
    var result5 = Sparql_common.getUriFilter("s", ["http://example.org/uri1", "nodeID://b2052626"]);
    console.log("Input: ['http://example.org/uri1', 'nodeID://b2052626']");
    console.log("Output:", result5);
    console.log("Expected: filter (?s=<http://example.org/uri1> || str(?s) = \"nodeID://b2052626\").");
    console.log("");
    
    // Test 6: Mixed - multiple URIs and multiple blank nodes
    console.log("Test 6: Mixed - multiple URIs and multiple blank nodes");
    var result6 = Sparql_common.getUriFilter("s", ["http://example.org/uri1", "http://example.org/uri2", "nodeID://b2052626", "nodeID://b2052627"]);
    console.log("Input: ['http://example.org/uri1', 'http://example.org/uri2', 'nodeID://b2052626', 'nodeID://b2052627']");
    console.log("Output:", result6);
    console.log("Expected: filter (?s in (<http://example.org/uri1>,<http://example.org/uri2>) || str(?s) in (\"nodeID://b2052626\",\"nodeID://b2052627\")).");
    console.log("");
    
    // Test 7: Single literal
    console.log("Test 7: Single literal");
    var result7 = Sparql_common.getUriFilter("label", ["Test Label"]);
    console.log("Input: ['Test Label']");
    console.log("Output:", result7);
    console.log("Expected: filter( ?label=\"Test Label\").");
    console.log("");
    
    // Test 8: Multiple literals
    console.log("Test 8: Multiple literals");
    var result8 = Sparql_common.getUriFilter("label", ["Label1", "Label2"]);
    console.log("Input: ['Label1', 'Label2']");
    console.log("Output:", result8);
    console.log("Expected: filter (?label in (\"Label1\",\"Label2\")).");
    console.log("");
    
    // Test 9: Mixed URIs and literals
    console.log("Test 9: Mixed URIs and literals");
    var result9 = Sparql_common.getUriFilter("value", ["http://example.org/uri1", "Simple Text"]);
    console.log("Input: ['http://example.org/uri1', 'Simple Text']");
    console.log("Output:", result9);
    console.log("Expected: filter (?value in (<http://example.org/uri1>,\"Simple Text\")).");
    console.log("");
    
    // Test 10: Prefixed URI (should be treated as URI)
    console.log("Test 10: Prefixed URI");
    var result10 = Sparql_common.getUriFilter("type", ["rdf:type"]);
    console.log("Input: ['rdf:type']");
    console.log("Output:", result10);
    console.log("Expected: filter( ?type=<rdf:type>).");
    console.log("");
    
    // Test 11: Complex mixed case
    console.log("Test 11: Complex mixed case - URIs, literals, and blank nodes");
    var result11 = Sparql_common.getUriFilter("entity", [
        "http://example.org/person1", 
        "Simple Name", 
        "nodeID://b123", 
        "http://example.org/person2",
        "nodeID://b456"
    ]);
    console.log("Input: ['http://example.org/person1', 'Simple Name', 'nodeID://b123', 'http://example.org/person2', 'nodeID://b456']");
    console.log("Output:", result11);
    console.log("Expected: Complex filter with both standard values IN and blank nodes str() IN");
    console.log("");
    
    // Test 12: Empty array
    console.log("Test 12: Empty array");
    var result12 = Sparql_common.getUriFilter("s", []);
    console.log("Input: []");
    console.log("Output:", result12);
    console.log("Expected: '.' (empty filter)");
    console.log("");
    
    // Test 13: String with quotes
    console.log("Test 13: String with quotes");
    var result13 = Sparql_common.getUriFilter("label", ['Text with "quotes"']);
    console.log("Input: ['Text with \"quotes\"']");
    console.log("Output:", result13);
    console.log("Expected: filter( ?label=\"Text with 'quotes'\").");
    console.log("");
    
    // Test 14: Different variable names
    console.log("Test 14: Different variable names");
    var result14a = Sparql_common.getUriFilter("subject", ["nodeID://b123"]);
    var result14b = Sparql_common.getUriFilter("obj", ["http://example.org/test"]);
    console.log("Input: variable 'subject', ['nodeID://b123']");
    console.log("Output:", result14a);
    console.log("Input: variable 'obj', ['http://example.org/test']");
    console.log("Output:", result14b);
    console.log("");
    
    console.log("=== All tests completed ===");
}

    return self;
})();



export default sparqlTests;

window.sparqlTests = sparqlTests;
