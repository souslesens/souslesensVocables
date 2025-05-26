import Lineage_dictionary from "../lineage/lineage_dictionary.js";
import SearchUtil from "../../search/searchUtil.js";
import Sparql_proxy from "../../sparqlProxies/sparql_proxy.js";
import Sparql_generic from "../../sparqlProxies/sparql_generic.js";
import MainController from "../../shared/mainController.js";
import Sparql_OWL from "../../sparqlProxies/sparql_OWL.js";
import Export from "../../shared/export.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";
import SparqlQueryUI from "../sparqlQueryUI.js";
import SourceSelectorWidget from "../../uiWidgets/sourceSelectorWidget.js";
import OntologyModels from "../../shared/ontologyModels.js";
import UIcontroller from "../mappingModeler/uiController.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Admin = (function () {
    var self = {};

    self.onLoaded = function () {
        $("#lateralPanelDiv").load("modules/tools/admin/admin.html", function () {
            var options = {
                withCheckboxes: true,
            };
            SourceSelectorWidget.initWidget(null, "sourcesTreeDiv", false, null, null, options);
        });
        /*   var html =
    " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.showTSFdictionary()'>TSF Dictionary</button>" +
    "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.refreshIndexes()'>refreshIndexes </button>&nbsp;<input type='checkbox'  id='admin_refreshIndexWithImportCBX' > Imports also<br>" +
    " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.exportTaxonomyToCsv()'>export Taxonomy To Csv </button>" +
    " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.exportTTL()'>export TTL </button>" +
    " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.getClassesLineage()'>getLineage </button>" +
    " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.showUserSources()'>showUserSources </button>" +
    " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.generateInverseRestrictionsDialog()'>generateInverseRestrictions </button>" +
    " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.drawPropsRangeAndDomainMatrix()'>drawPropsRangeAndDomainMatrix </button>" +
    " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.createDecapitalizedLabelTriples()'>createDecapitalizedLabelTriples </button>";
$("#sourceDivControlPanelDiv").html(html);*/
    };

    self.onSourceSelect = function () {
        // Pass
    };

    self.showTSFdictionary = function () {
        Lineage_dictionary.showTSFdictionaryDialog("Lineage_dictionary");
    };
    self.cleanIndices = function () {
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/elasticsearch/clean`,
            success: function (data, _textStatus, _jqXHR) {
                if (data.toDelete.length > 0) {
                    const yes = confirm(`Delete ${data.toDelete.length} indices? (${data.toDelete.join(", ")})`);
                    if (yes) {
                        $.ajax({
                            type: "POST",
                            url: `${Config.apiUrl}/elasticsearch/clean`,
                            success: function (data, _text, _jqXHR) {
                                if (data.deleted.length > 0) {
                                    alert(`${data.deleted.length} indices deleted`);
                                }
                            },
                        });
                    }
                } else {
                    alert("No index to delete");
                }
            },
            error: function (err) {
                console.error("Error", err);
                alert(err);
            },
        });
    };
    self.refreshIndexes = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (!sources || sources.length == 0) {
            return alert(" no source selected");
        }
        if (!confirm("refresh selected indexes")) {
            return;
        }

        async.eachSeries(
            sources,
            function (source, callbackEach) {
                if (!Config.sources[source] || !Config.sources[source].schemaType) {
                    return callbackEach();
                }
                $("#waitImg").css("display", "block");
                SearchUtil.generateElasticIndex(
                    source,
                    {
                        indexProperties: 1,
                        indexNamedIndividuals: 1,
                    },
                    function (err, _result) {
                        UI.message("DONE " + source, true);
                        callbackEach(err);
                    },
                );
            },
            function (err) {
                if (err) {
                    return UI.message(err, true);
                }
                UI.message("ALL DONE", true);
                $("#sourceSelector_jstreeDiv").jstree(true).uncheck_all();
            },
        );
    };

    self.exportNT = function () {
        //   var sources =SourceSelectorWidget.getCheckedSources();
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }

        $("#waitImg").css("display", "block");
        UI.message(sources[0] + " processing...");
        $.ajax({
            type: "GET",
            url: `${Config.apiUrl}/admin/ontology/${sources[0]}`,
            dataType: "text/plain",
            success: function (_data2, _textStatus, _jqXHR) {
                // no success see index.js
            },
            error: function (err) {
                // bizarre !!!
                download(err.responseText, sources[0] + ".txt", "text/plain");
                UI.message(sources[0] + " downloaded");
            },
        });
    };
    self.exportTTL = function () {
        //   var sources =SourceSelectorWidget.getCheckedSources();
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }

        $("#waitImg").css("display", "block");
        // UI.message(sources[0] + " processing...");
        Sparql_proxy.exportGraph(sources[0]);
    };
    self.getClassesLineage = function () {
        //   var sources =SourceSelectorWidget.getCheckedSources();
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }

        Sparql_generic.getSourceTaxonomy(sources[0], null, function (_err, _result) {
            // Pass
        });
    };

    self.getUserAllowedSources = function (sourcesSelection) {
        var sources = [];
        Object.keys(Config.sources)
            .sort()
            .forEach(function (sourceLabel, _index) {
                MainController.initControllers();
                if (sourcesSelection && sourcesSelection.indexOf(sourceLabel) < 0) {
                    return;
                }
                if (Config.sources[sourceLabel].isDraft) {
                    return;
                }
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0) {
                    return;
                }
                sources.push(sourceLabel);
            });
        return sources;
    };
    self.ShowProfilesSourcesMatrix = function () {
        // Pass
    };

    self.ShowUsersSourcesMatrix = function () {
        // Pass
    };

    self.showUserSources = function (callback) {
        var str = "";
        var sources = [];
        Object.keys(Config.sources)
            .sort()
            .forEach(function (sourceLabel, _index) {
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0) {
                    return;
                }
                str +=
                    "<tr><td>" +
                    sourceLabel +
                    "</td><td>" +
                    Config.sources[sourceLabel].group +
                    "</td><td>" +
                    Config.sources[sourceLabel].schemaType +
                    "</td><td>" +
                    Config.sources[sourceLabel].sparql_server.url +
                    "</td><td>" +
                    Config.sources[sourceLabel].graphUri +
                    "</td></tr>";
                sources.push(sourceLabel);
            });

        if (callback) {
            return callback(sources);
        }
        var html = "<div style='width: 800px;height: 800px ; overflow: auto'><table>" + str + "</table></div>";
        $("#graphDiv").html(html);
    };

    self.generateInverseRestrictionsDialog = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }
        var html = "<table>";
        html += "<tr><td>propId</td><td><input id='admin_propId' style='width:400px'></td></tr>";
        html += "<tr><td>inverse propId</td><td><input id='admin_inversePropId'  style='width:400px'></td></tr>";
        html += "</table>";
        html += "<button onclick='Admin.generateInverseRestrictions()'>Generate</button>";

        $("#mainDialogDiv").html(html);
        $("#mainDialogDiv").dialog("open");
    };

    self.generateInverseRestrictions = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }
        var source = sources[0];
        var propId = $("#admin_propId").val();
        var inversePropId = $("#admin_inversePropId").val();
        if (propId && inversePropId) {
            Sparql_OWL.generateInverseRestrictions(source, propId, inversePropId, function (err, result) {
                if (err) {
                    return alert(err.responseText || err);
                }
                UI.message(result + " restrictions created");
            });
        } else {
            alert("missing propId or inversePropId");
        }
    };

    self.clearOntologyModelCache = function (source) {
        if (!source) {
            var sources = SourceSelectorWidget.getCheckedSources();

            if (sources.length == 0) {
                return alert("select a source");
            } else {
                source = sources[0];
            }
        }
        OntologyModels.clearOntologyModelCache(source, function (err, result) {
            if (err) {
                return alert(err.responseText || err);
            }

            UI.message("DONE");
        });
    };

    self.exportTaxonomyToCsv = function (_rootUri) {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }

        var sourceLabel = sources[0];
        var matrix = [];

        var maxLevels = 0;
        async.series(
            [
                function (callbackSeries) {
                    var options = {};
                    Sparql_generic.getSourceTaxonomy(sourceLabel, options, function (err, result) {
                        if (err) {
                            return UI.message(err, true);
                        }

                        var labels = result.labels;
                        for (var key in result.classesMap) {
                            var line = [];
                            var obj = result.classesMap[key];
                            if (!obj.parents) {
                                return;
                            }
                            var parents = obj.parents; //;.split("|")
                            maxLevels = Math.max(maxLevels, parents.length);
                            if (!parents.forEach) {
                                return;
                            }
                            parents.forEach(function (parent, index) {
                                if (index == 0) {
                                    return;
                                }

                                var label = labels[parent] || Sparql_common.getLabelFromURI(parent);
                                line.push(label);
                            });
                            line.push(obj.label);
                            matrix.push(line);
                        }
                        callbackSeries();
                    });
                },
                function (_callbackSeries) {
                    var cols = [];
                    for (var i = 1; i <= maxLevels; i++) {
                        cols.push({ title: "Level_" + i, defaultContent: "" });
                    }

                    Export.showDataTable(null, cols, matrix);
                },
            ],
            function (err) {
                if (err) {
                    return UI.message(err, true);
                }
                return UI.message("DONE", true);
            },
        );
    };

    self.createDecapitalizedLabelTriples = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }

        var sourceLabel = sources[0];
        Sparql_generic.createDecapitalizedLabelTriples(sourceLabel, function (err, result) {
            if (err) {
                return UI.message(err, true);
            }
            return UI.message(result + " skos:altLabels created", true);
        });
    };

    self.drawPropsRangeAndDomainMatrix = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }
        var sourceLabel = sources[0];
        Lineage_properties.drawPropsRangeAndDomainMatrix(sourceLabel);
    };

    self.copyGraphToEndPoint = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }
        var source = sources[0];

        var toEndPointUrl = prompt("enter toEndPointUrl");
        if (!toEndPointUrl) {
            return;
        }
        var toEndPointConfig = { sparql_server: { url: toEndPointUrl } };
        var clearEndpointGraph = true;
        var body = {
            source: source,
            toEndPointConfig: toEndPointConfig,
            options: { clearEndpointGraph: clearEndpointGraph },
        };

        var payload = {
            url: Config.sources[source].sparql_server.url,
            body: JSON.stringify(body),
            POST: true,
        };
        UI.message("copying source " + source);
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/copygraph`,
            data: payload,
            dataType: "json",
            success: function (data, _textStatus, _jqXHR) {
                alert(data.result + "triples imported in sparqlEndpoint " + toEndPointUrl + "");
                UI.message("source " + source + " copied", true);
            },
            error: function (err) {
                return alert(err.responseText);
            },
        });
    };

    self.sparqlQuery = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length == 0) {
            return alert("select at least one  source");
        }
        SparqlQueryUI.init(sources);
    };

    self.clearGraph = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }

        var source = sources[0];
        if (!Config.sources[source]) {
            return alert("source does not not exist");
        }
        var graphUri = Config.sources[source].graphUri;
        if (!confirm("Do you really want to clear  source " + source + " , graph " + graphUri)) {
            return;
        }
        if (!confirm("CONFIRM : clear  source " + source + " , graph " + graphUri)) {
            return;
        }
        const payload = { graphUri: graphUri };

        Sparql_OWL.clearGraph(graphUri, function (err, result) {
            if (err) {
                return alert(err);
            }
            return UI.message("graph source " + source + " cleared ", true);
        });
    };

    self.createSkgFromOntology = function () {
        var sources = SourceSelectorWidget.getCheckedSources();
        if (sources.length != 1) {
            return alert("select a single source");
        }

        var source = sources[0];
        if (!Config.sources[source]) {
            return alert("source does not not exist");
        }
        var graphUri = Config.sources[source].graphUri;
        if (!prompt("Do you really want to generate a SKG for ontology " + source + " , graph " + graphUri + "skg/")) {
            return;
        }
        Sparql_OWL.createSkgFromOntology(source, graphUri + "skg/", function (err, result) {
            alert(err ? err.responseText : result);
        });
    };
    return self;
})();

export default Admin;

window.Admin = Admin;
