/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import fs from "fs";

var gaiaToSkos = {
    csvToJson: function (filePath) {
        var str = "" + fs.readFileSync(filePath);
        str = str.replace(/[\u{0080}-\u{FFFF}]/gu, ""); //charactrese vides
        var lines = str.split("\n");
        var objs = [];
        var cols = [];

        lines[0]
            .trim()
            .split("\t")
            .forEach(function (cell) {
                cols.push(cell);
            });

        lines.forEach(function (line, lineIndex) {
            var cells = line.trim().split("\t");
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

    formatString: function (str) {
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

        return str;
    },

    parseTxt: function () {
        var classes = [];
        var categories = [];

        var filePath = "D:\\NLP\\importedResources\\gaia.txt";

        var objs = gaiaToSkos.csvToJson(filePath);
        var counter = 1000;
        var str = "";

        var classesMap = {};
        var categoriesMap = {};
        var categoriesClassMap = {};
        objs.forEach(function (item, _index) {
            if (item.Class && classes.indexOf(item.Class) < 0) {
                classes.push(item.Class);
            }
            if (item.ClassExtended && categories.indexOf(item.ClassExtended) < 0) {
                categories.push(item.ClassExtended);
                if (!categoriesClassMap[item.ClassExtended]) {
                    categoriesClassMap[item.ClassExtended] = item.Class;
                }
            }

            /*   var array = item.ClassExtended.split("-")
               var categoryLetter = array[0].trim();
               var category = array[1].trim();
               if (category && categories.indexOf(category) < 0) {
                   categories.push(category)
               }
               if (categoryLetter && categoriesLetters.indexOf(categoryLetter) < 0) {
                   categoriesLetters.push(categoryLetter)
               }

           }*/
        });

        classes.forEach(function (item) {
            var label = gaiaToSkos.formatString(item);
            var subject = "<http://data.total.com/resource/dictionary/gaia/" + counter + ">";
            classesMap[item] = subject;
            str += subject + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + label + "'@en .\n";

            counter++;
        });
        categories.forEach(function (item) {
            var label = gaiaToSkos.formatString(item);
            var subject = "<http://data.total.com/resource/dictionary/gaia/" + counter + ">";
            categoriesMap[item] = subject;
            str += subject + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + label + "'@en .\n";

            counter++;
        });

        for (var key in categoriesClassMap) {
            var subject = categoriesMap[key];
            var object = classesMap[categoriesClassMap[key]];
            if (!object) object = "<http://data.total.com/resource/dictionary/gaia/" + "null" + ">";
            else str += subject + " <http://www.w3.org/2004/02/skos/core#broader> " + object + ".\n";
        }

        objs.forEach(function (item, _index) {
            if (item.ClassExtended) {
                var subject = "<http://data.total.com/resource/dictionary/gaia/" + counter + ">";
                var label = gaiaToSkos.formatString(item.Term);
                str += subject + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + label + "'@en .\n";
                str += subject + "  <http://www.w3.org/2004/02/skos/core#broader> " + categoriesMap[item.ClassExtended] + ".\n";
                counter++;
            }
        });

        fs.writeFileSync(filePath.replace(".txt", ".rdf.nt"), str);
    },

    writeAcronymsTriples: function () {
        var filePath = "D:\\Total\\2020\\Stephanie\\acronyms.txt";

        var objs = gaiaToSkos.csvToJson(filePath);

        var str = "";
        objs.forEach(function (item, index) {
            // category	syn 	term	acronymEn	synEn
            if (item.term) {
                var subject = "<http://data.total.com/resource/acronyms/" + index + ">";
                var label = gaiaToSkos.formatString(item.term);
                var syn = gaiaToSkos.formatString(item.syn);
                var acronymEn = gaiaToSkos.formatString(item.acronymEn);
                var synEn = gaiaToSkos.formatString(item.synEn);

                str += subject + " <http://www.w3.org/2004/02/skos/core#prefLabel> '" + label + "'@en .\n";
                str += subject + "  <http://www.w3.org/2004/02/skos/core#broader> <http://data.total.com/resource/acronyms/" + item.category.replace(/ /g, "_") + ">.\n";

                if (syn) str += subject + " <http://www.w3.org/2004/02/skos/core#altLabel> '" + syn + "'@en .\n";
                if (acronymEn) str += subject + " <http://www.w3.org/2004/02/skos/core#altLabel> '" + acronymEn + "'@en .\n";
                if (synEn) str += subject + " <http://www.w3.org/2004/02/skos/core#altLabel> '" + synEn + "'@en .\n";
            }
        });
        fs.writeFileSync(filePath.replace(".txt", ".rdf.nt"), str);
    },
};

export default gaiaToSkos;
//gaiaToSkos.parseTxt()

gaiaToSkos.writeAcronymsTriples();
