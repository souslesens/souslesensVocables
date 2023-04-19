import Clipboard from "./../clipboard.js"
import Sparql_generic from "./../sparqlProxies/sparql_generic.js"
import SourceBrowser from "./sourceBrowser.js"



/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Annotator = (function () {
    var self = {};
    self.selectedSources;

    self.onLoaded = function () {
        var html = "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Annotator.showActionPanel()'>OK</button>";
        $("#sourceDivControlPanelDiv").html(html);
    };

    self.onSourceSelect = function () {
        // Pass
    };

    self.showActionPanel = function () {
        self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked();
        $("#actionDiv").html("");
        $("#graphDiv").load("snippets/annotator.html");
        $("#accordion").accordion("option", { active: 2 });
    };

    self.uploadAndaAnnotate = function () {
        // Pass
    };
    self.annotate = function () {
        $("#waitImg").css("display", "block");
        MainController.UI.message("querying Spacy library (can take time...)");
        var text = $("#Annotator_textArea").val();
        var sourcesLabels = self.selectedSources;
        var sources = [];
        sourcesLabels.forEach(function (label) {
            var source = Config.sources[label];
            source.name = label;
            sources.push(source);
        });
        var payload = {
            text: text,
            sources: sources,
        };

        $.ajax({
            type: "POST",
            url: Config.apiUrl + "/annotate",
            data: payload,
            dataType: "json",
            /* beforeSend: function(request) {
                     request.setRequestHeader('Age', '10000');
                 },*/

            success: function (data, _textStatus, _jqXHR) {
                MainController.UI.message("");
                $("#waitImg").css("display", "none");
                self.showAnnotationResult(data);
            },

            error: function (err) {
                MainController.UI.message(err);
                $("#waitImg").css("display", "none");
            },
        });
    };
    self.showAnnotationResult = function (data) {
        if (Object.keys(data.entities).length == 0 && data.missingNouns.length == 0) {
            $("#Annotator_AnnotationResultDiv").html("");
            return alert("no matching concepts");
        }

        var html = "<table  class='center' >";
        html += "<tr><td>&nbsp;</td>";
        var sourcesLabels = self.selectedSources;
        sourcesLabels.forEach(function (source) {
            html += "<td>" + source + "</td>";
        });

        html += "</tr>";
        for (var word in data.entities) {
            html += "<tr><td>" + word + "</td>";

            sourcesLabels.forEach(function (source) {
                var value = "";
                if (data.entities[word][source]) {
                    data.entities[word][source].forEach(function (entity) {
                        if (entity.source == source) var id = "AnnotatorEntity|" + source + "|" + entity.id;
                        //     console.log(id)
                        value += "<span class='Annotator_entitySpan' data-source='" + source + "' data-label='" + word + "'  data-id='" + entity.id + "' id='" + id + "'>" + "+" + "</span>";
                    });
                }
                html += "<td>" + value + "</td>";
            });
            html += "</tr>";
        }
        html += "</table>";

        $("#Annotator_AnnotationResultDiv").html(html);
        $(".Annotator_entitySpan").bind("click", Annotator.onNodeClick);

        html = "";
        var uniqueMissingNouns = {};
        data.missingNouns.forEach(function (item) {
            if (!uniqueMissingNouns[item]) {
                uniqueMissingNouns[item] = 1;
                html += "<span class='Annotator_orphanNouns' id='Annotator_noun|" + "orphan" + "|" + item + "'>" + item + "</span>";
            }
        });
        $("#Annotator_orphanNounsDiv").html(html);
        $(".Annotator_orphanNouns").bind("click", function (e) {
            if (e.ctrlKey) Clipboard.copy({ type: "word", source: "none", label: $(this).html() }, $(this).attr("id"), e);
        });
    };

    self.onNodeClick = function (e) {
        var source = $(this).data("source");
        var label = $(this).data("label");
        var id = $(this).data("id");
        if (e.ctrlKey) {
            Clipboard.copy({ type: "node", source: source, id: id, label: label }, $(this).attr("id"), e);
        } else self.getEntityInfo(e);
    };

    self.getEntityInfo = function (e) {
        var id = e.target.id;
        var array = id.split("|");
        var source = array[1];
        id = array[2];
        SourceBrowser.showNodeInfos(source, id, "Annotator_EntityDetailsDiv");
        Sparql_generic.getSingleNodeAllGenealogy(source, e.target, function (err, result) {
            if (err) return MainController.UI.message(err);

            var html = "Genealogy : ";
            result.forEach(function (item) {
                html +=
                    "<span class='Annotator_entityGenealogySpan'  data-source='" +
                    source +
                    "' data-id='" +
                    item.broader.value +
                    "'  data-label='" +
                    item.broaderLabel.value +
                    "' id='Annotator_entity|" +
                    source +
                    "|" +
                    item.broader.value +
                    "'>" +
                    item.broaderLabel.value +
                    "</span>";
            });

            $("#Annotator_EntityGenealogyDiv").html(html);
            $(".Annotator_entityGenealogySpan").bind("click", Annotator.onNodeClick);
        });
    };

    self.setTestText = function () {
        var text =
            "Compaction drives characteristically exhibit elevated rock compressibilities, often 10 to 50 times greater than normal. Rock compressibility is called pore volume (PV), or pore, compressibility and is expressed in units of PV change per unit PV per unit pressure change. Rock compressibility is a function of pressure. Normal compressibilities range from 3 to 8 × 10–6 psi–1 at pressures greater than approximately 1,000 psia. In contrast, elevated rock compressibilities can reach as high as 150 × 10–6 psi–1 or higher at comparable pressures. [1]\n";
        $("#Annotator_textArea").val(text);
    };

    return self;
})();



export default Annotator

window.Annotator=Annotator;