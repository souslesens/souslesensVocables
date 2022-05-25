// eslint-disable-next-line @typescript-eslint/no-unused-vars
var Admin = (function () {
    var self = {};

    self.onLoaded = function () {
        var html =
            " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.showTSFdictionary()'>TSF Dictionary</button>" +
            "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.refreshIndexes()'>refreshIndexes </button>&nbsp;<input type='checkbox'  id='admin_refreshIndexWithImportCBX' > Imports also<br>" +
            " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.exportTaxonomyToCsv()'>export Taxonomy To Csv </button>" +
            " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.exportNT()'>export NT </button>" +
            " <button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.getClassesLineage()'>getLineage </button>" +
            " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.showUserSources()'>showUserSources </button>" +
            " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.generateInverseRestrictionsDialog()'>generateInverseRestrictions </button>" +
            " <br><button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Admin.createDecapitalizedLabelTriples()'>createDecapitalizedLabelTriples </button>";
        $("#sourceDivControlPanelDiv").html(html);
    };

    self.onSourceSelect = function () {
        // Pass
    };

    self.showTSFdictionary = function () {
        Lineage_dictionary.showTSFdictionaryDialog("Lineage_dictionary");
    };
    self.refreshIndexes = function () {
        var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        if (!sources || sources.length == 0) return alert(" no source selected");
        if (!confirm("refresh selected indexes")) return;

        async.eachSeries(
            sources,
            function (source, callbackEach) {
                if (!Config.sources[source] || !Config.sources[source].schemaType) return callbackEach();
                $("#waitImg").css("display", "block");
                SearchUtil.generateElasticIndex(source, function (err, _result) {
                    MainController.UI.message("DONE " + source, true);
                    callbackEach(err);
                });
            },
            function (err) {
                if (err) return MainController.UI.message(err, true);
                MainController.UI.message("ALL DONE", true);
            }
        );
    };

    self.exportNT = function () {
        //   var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        if (sources.length != 1) return alert("select a single source");

        $("#waitImg").css("display", "block");
        MainController.UI.message(sources[0] + " processing...");
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
                MainController.UI.message(sources[0] + " downloaded");
            },
        });
    };
    self.getClassesLineage = function () {
        //   var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        if (sources.length != 1) return alert("select a single source");

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
                if (sourcesSelection && sourcesSelection.indexOf(sourceLabel) < 0) return;
                if (Config.sources[sourceLabel].isDraft) return;
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0) return;
                if (
                    (Config.currentProfile.allowedSources != "ALL" && Config.currentProfile.allowedSources.indexOf(sourceLabel) < 0) ||
                    Config.currentProfile.forbiddenSources.indexOf(sourceLabel) > -1
                )
                    return;
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
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0) return;
                if (
                    (Config.currentProfile.allowedSources != "ALL" && Config.currentProfile.allowedSources.indexOf(sourceLabel) < 0) ||
                    Config.currentProfile.forbiddenSources.indexOf(sourceLabel) > -1
                )
                    return;
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

        if (callback) return callback(sources);
        var html = "<div style='width: 800px;height: 800px ; overflow: auto'><table>" + str + "</table></div>";
        $("#graphDiv").html(html);
    };

    self.generateInverseRestrictionsDialog = function () {
        var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        if (sources.length != 1) return alert("select a single source");
        var html = "<table>";
        html += "<tr><td>propId</td><td><input id='admin_propId' style='width:400px'></td></tr>";
        html += "<tr><td>inverse propId</td><td><input id='admin_inversePropId'  style='width:400px'></td></tr>";
        html += "</table>";
        html += "<button onclick='Admin.generateInverseRestrictions()'>Generate</button>";

        $("#mainDialogDiv").html(html);
        $("#mainDialogDiv").dialog("open");
    };

    self.generateInverseRestrictions = function () {
        var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        if (sources.length != 1) return alert("select a single source");
        var source = sources[0];
        var propId = $("#admin_propId").val();
        var inversePropId = $("#admin_inversePropId").val();
        if (propId && inversePropId) {
            Sparql_OWL.generateInverseRestrictions(source, propId, inversePropId, function (err, result) {
                if (err) return alert(err);
                MainController.UI.message(result + " restrictions created");
            });
        } else alert("missing propId or inversePropId");
    };

    self.exportTaxonomyToCsv = function (_rootUri) {
        var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        if (sources.length != 1) return alert("select a single source");

        var sourceLabel = sources[0];
        var matrix = [];

        var maxLevels = 0;
        async.series(
            [
                function (callbackSeries) {
                    var options = {};
                    Sparql_generic.getSourceTaxonomy(sourceLabel, options, function (err, result) {
                        if (err) {
                            return MainController.UI.message(err, true);
                        }

                        var labels = result.labels;
                        for (var key in result.classesMap) {
                            var line = [];
                            var obj = result.classesMap[key];
                            if (!obj.parents) return;
                            var parents = obj.parents; //;.split("|")
                            maxLevels = Math.max(maxLevels, parents.length);
                            if (!parents.forEach) return;
                            parents.forEach(function (parent, index) {
                                if (index == 0) return;

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
                    return MainController.UI.message(err, true);
                }
                return MainController.UI.message("DONE", true);
            }
        );
    };

    self.createDecapitalizedLabelTriples = function () {
        var sources = $("#sourcesTreeDiv").jstree(true).get_checked();
        if (sources.length != 1) return alert("select a single source");

        var sourceLabel = sources[0];
        Sparql_generic.createDecapitalizedLabelTriples(sourceLabel, function (err, result) {
            if (err) {
                return MainController.UI.message(err, true);
            }
            return MainController.UI.message(result + " skos:altLabels created", true);
        });
    };

    return self;
})();
