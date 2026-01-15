/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import fs from 'fs';

var RcReportsTriples = {
    csvToJson: function (filePath, sep) {
        if (!sep) sep = "\t";
        var str = "" + fs.readFileSync(filePath);
        //str = str.replace(/[\u{0080}-\u{FFFF}]/gu, "");//charactrese vides
        var lines = str.split("\n");
        var objs = [];
        var cols = [];

        lines[0]
            .trim()
            .split(sep)
            .forEach(function (cell) {
                cols.push(cell);
            });

        lines.forEach(function (line, lineIndex) {
            if (line.indexOf("é") > -1) line = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            var cells = line.trim().split(sep);
            var obj = {};
            cells.forEach(function (cell, index) {
                if (lineIndex == 0) cols.push(cell);
                else {
                    obj[cols[index]] = cell;
                }
            });
            objs.push(obj);
        });
        return objs;
    },

    formatString: function (str, forUri) {
        if (!str || !str.replace) return null;

        str = str.replace(/"/gm, '\\"');
        str = str.replace(/;/gm, " ");
        str = str.replace(/\n/gm, "\\\\n");
        str = str.replace(/\r/gm, "");
        str = str.replace(/\t/gm, " ");
        str = str.replace(/\(/gm, "-");
        str = str.replace(/\)/gm, "-");
        str = str.replace(/\\xa0/gm, " ");
        str = str.replace(/'/gm, "\\'");
        if (forUri) str = str.replace(/ /gm, "_");

        return str;
    },

    //A	report_id	location_id	equipment_id	E	F	concept_Niv1	concept_Niv2	concept_Niv3	concept_Niv4	concept_Niv5	concept_Niv6		location_site	O	P	equipment_manufactuter	equipment_modelNumber	equipment_3_label	location_plant_section	location_plant unit
    csvToTriples: function (filePath) {
        var json = RcReportsTriples.csvToJson(filePath, ",");
        var graphUri = "http://data.total.com/resource/reportsRC/";
        var types = [];
        var typesCorpus = [];
        var typesConcept = [];
        var typesConceptReport = {};

        var dontProcessCorpus = true;

        var corpusHierarchy = ["equipment_category", "equipment_manufacturer", "location_id", "report_id"];

        var conceptsMap = {
            //    "Failure Mechanism": ["concept_Niv1", "concept_Niv2", "concept_Niv3", "concept_Niv4", "concept_Niv5", "concept_Niv6"],
            //    "Retained Action": ["concept_Niv1", "concept_Niv2", "concept_Niv3", "concept_Niv4", "concept_Niv5", "concept_Niv6"],
            equipment_manufacturer: ["equipment_manufacturer"],
            equipment_category: ["equipment_category"],
            //  "equipment": ["equipment_manufactuter", "equipment_modelNumber", "equipment_id"]
        };
        //  var filtersConcept_Niv1 = ["Failure Mechanism", "Retained Action"]

        var conceptsFilePath = filePath.replace(".csv", "_thesaurus.rdf.nt");
        var corpusFilePath = filePath.replace(".csv", "_corpus.rdf.nt");

        var corpusStream = fs.createWriteStream(corpusFilePath);
        var conceptsStream = fs.createWriteStream(conceptsFilePath);

        corpusStream.write("<http://data.total.com/resource/reportsRC/Report>  <http://www.w3.org/2004/02/skos/core#topConceptOf> <http://data.total.com/resource/reportsRC/corpus/>.\n");
        corpusStream.write("<" + graphUri + "Report" + ">  <http://www.w3.org/2004/02/skos/core#prefLabel> 'Report'@en .\n");

        //*************************** init top concepts****************************************
        for (var key in conceptsMap) {
            var conceptTypeUri = "<" + graphUri + RcReportsTriples.formatString(key, true) + "> ";
            typesConcept.push(key);
            conceptsStream.write(conceptTypeUri + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2004/02/skos/core#ConceptScheme>.\n");
            conceptsStream.write(conceptTypeUri + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + key + "' .\n");
        }

        //*************************** each line key****************************************
        json.forEach(function (item, index) {
            if (index % 500 == 0) console.log(index);

            if (!item.report_id) return;

            var date = item["notif_date"];
            var site = item["location_site"];

            if (!date || !site) return;

            var reportUri = "<" + graphUri + item.report_id + ">";

            //*************************** each concepts Type****************************************
            for (var conceptType in conceptsMap) {
                //     var conceptType=item["conceptsMap"]
                var conceptTypeUri = "<" + graphUri + RcReportsTriples.formatString(conceptType, true) + "> ";

                var fields = conceptsMap[conceptType];
                if (!fields) return;

                //*************************** each conceptType field****************************************
                fields.forEach(function (field, indexFields) {
                    if (!item[field]) return;

                    var conceptUri = "<" + graphUri + RcReportsTriples.formatString(item[field], true) + ">";

                    //*************************** concepts Hierarchy unique****************************************
                    if (typesConcept.indexOf(item[field]) < 0) {
                        typesConcept.push(item[field]);
                        var broaderFieldValueUri;
                        if (indexFields > 0) {
                            broaderFieldValueUri = "<" + graphUri + RcReportsTriples.formatString(item[fields[indexFields - 1]], true) + ">";
                        } else {
                            broaderFieldValueUri = conceptTypeUri;
                        }
                        conceptsStream.write(conceptUri + " <http://www.w3.org/2004/02/skos/core#broader> " + broaderFieldValueUri + ".\n");
                        conceptsStream.write(conceptUri + " <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> " + conceptTypeUri + ".\n");
                        conceptsStream.write(conceptUri + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + RcReportsTriples.formatString(item[field]) + "'@en.\n");
                    }
                    //*************************** end concepts Hierarchy unique****************************************

                    //*************************** corpus item subject concept****************************************
                    //on rattache le report au plus bas niveau de la herarchie des concepts

                    var conceptReport = reportUri + "_" + conceptUri;
                    if (!typesConceptReport[conceptReport]) {
                        typesConceptReport[conceptReport] = "x";
                        if (indexFields < fields.length - 1 && item[fields[indexFields + 1]] == "") {
                            corpusStream.write(reportUri + " <http://purl.org/dc/terms/subject> " + conceptUri + ".\n");
                        } else if (fields.length == 1) {
                            corpusStream.write(reportUri + " <http://purl.org/dc/terms/subject> " + conceptUri + ".\n");
                        }
                    }
                });
            }

            //*************************** corpus ****************************************
            if (!dontProcessCorpus) {
                if (typesCorpus.indexOf(item.report_id) < 0) {
                    typesCorpus.push(item.report_id);

                    corpusHierarchy.forEach(function (colName, index) {
                        var colUri = "<" + graphUri + colName + ">";

                        var value = item[colName];
                        if (!value) value = colName + "_unknown";

                        if (types.indexOf(value) < 0 || colName == "report_id") {
                            types.push(value);

                            var uri = "<" + graphUri + RcReportsTriples.formatString(value, true) + ">";
                            var parentUri;
                            if (index == 0) parentUri = "<" + graphUri + "Report>";
                            else {
                                var parentValue = item[corpusHierarchy[index - 1]];
                                if (!parentValue) parentValue = corpusHierarchy[index - 1] + "_unknown";
                                parentUri = "<" + graphUri + RcReportsTriples.formatString(parentValue, true) + ">";
                            }

                            corpusStream.write(uri + " <http://www.w3.org/2004/02/skos/core#broader> " + parentUri + ".\n");
                            corpusStream.write(uri + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + RcReportsTriples.formatString(value) + "'@en.\n");

                            // if(index<corpusHierarchy.length-1)
                            corpusStream.write(uri + "  <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> " + colUri + ".\n");
                            //  corpusStream.write( reportUri + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + RcReportsTriples.formatString(item.report_id) + "'.\n";
                        }
                    });
                }
            }

            //  }

            // var label = gaiaToSkos.formatString(item.Term);
        });
        conceptsStream.close();
        corpusStream.close();
        //  fs.writeFileSync(filePath.replace(".txt", "_corpus.rdf.nt"), strCorpus)
        // fs.writeFileSync(filePath.replace(".txt", "_thesaurus.rdf.nt"), strConcepts)
    },

    extractLines: function (filePath) {
        var tag = "Failure Mechanism";
        // var tag='Retained Action';

        var outputFilePath = filePath.replace(".", "_" + tag.replace(/ /g, "_") + ".");
        var outputStream = fs.createWriteStream(outputFilePath, {
            //   flags: 'a' // 'a' means appending (old data will be preserved)
        });

        var header =
            "A,report_id,location_id,equipment_id,notif_date,F,concept_Niv1,concept_Niv2,concept_Niv3,concept_Niv4,concept_Niv5,concept_Niv6,,location_site,O,P,equipment_manufacturer,equipment_modelNumber,equipment_category,location_plant_section,location_plant unit\n";
        outputStream.write(header);

        var readline = require("readline");
        const readInterface = readline.createInterface({
            input: fs.createReadStream(filePath),
            output: process.stdout,
            console: false,
        });

        readInterface.on("line", function (line) {
            if (line.indexOf(tag) > -1) {
                outputStream.write(line + "\n");
            }
        });

        readInterface.on("close", function () {
            outputStream.close();
        });
    },
};
module.exports = RcReportsTriples;

//RcReportsTriples.csvToTriples("D:\\Total\\2020\\Pierre\\RcReportsExtracts.txt")

RcReportsTriples.csvToTriples("D:\\Total\\2020\\Pierre\\report_notification_Failure_Mechanism.csv");
//RcReportsTriples.csvToTriples("D:\\Total\\2020\\Pierre\\report_notification_Retained_Action.csv")

//RcReportsTriples.extractLines("D:\\Total\\2020\\Pierre\\report_notification.csv")
