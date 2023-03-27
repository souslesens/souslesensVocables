var Idcp = (function () {
    var self = {};
    self.loadedGraphDisplay = false;
    self.source = "IDCP";
    self.idcp_addDataContainer = function () {
        source = self.source;
        var newContainerLabel = prompt("enter new container label)");
        if (!newContainerLabel) {
            return;
        }

        var containerUri = Config.sources[source].graphUri + "bag/" + common.formatStringForTriple(newContainerLabel, true);

        var triples = [];

        if (Lineage_containers.currentContainer && Lineage_containers.currentContainer.id != containerUri) {
            triples.push({
                subject: "<" + Lineage_containers.currentContainer.data.id + ">",
                predicate: " rdfs:member",
                object: "<" + containerUri + ">",
            });
        }

        triples.push({
            subject: "<" + containerUri + ">",
            predicate: " rdf:type",
            object: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag>",
        });
        triples.push({
            subject: containerUri,
            predicate: " rdfs:label",
            object: newContainerLabel,
        });
        triples.push({
            subject: containerUri,
            predicate: "owl:subClassOf",
            object: "http://datalenergies.total.com/resource/tsf/idcp/DataContainer",
        });
        triples.push({
            subject: containerUri,
            predicate: " rdf:type",
            object: "http://www.w3.org/2002/07/owl#Class",
        });

        Sparql_generic.insertTriples(source, triples, null, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }
            var parent = Lineage_containers.currentContainer || "#";
            var newNode = {
                id: containerUri,
                text: newContainerLabel,
                parent: parent,
                data: {
                    type: "container",
                    source: source,
                    id: containerUri,
                    label: newContainerLabel,
                },
            };

            if (!$("#lineage_containers_containersJstree").jstree) {
                // initialize jstree
                self.search(function (err, result) {
                    $("#lineage_containers_containersJstree")
                        .jstree()
                        .create_node(parent, newNode, "first", function (err, result) {
                            $("#lineage_containers_containersJstree").jstree().open_node(parent);
                        });
                });
            } else {
                $("#lineage_containers_containersJstree")
                    .jstree()
                    .create_node(parent, newNode, "first", function (err, result) {
                        $("#lineage_containers_containersJstree").jstree().open_node(parent);
                    });
            }

            Lineage_containers.currentContainer = null;
        });
    };

    self.idcpClearAll = function () {
        Lineage_classes.initUI();
        self.loadedGraphDisplay = false;
    };

    self.adding_parameter_hide = function () {
        $("#LineageBlend_creatingNodeNameIndividualDiv").remove();
        $("#LineageBlend_creatingNodeParentTypeSpan").hide();
    };

    self.widget_preselection_and_hide = function (dialog) {
        var parameter_menu = $("#editPredicate_objectSelect");
        parameter_menu.append('<option value="http://datalenergies.total.com/resource/tsf/idcp/Parameter">Parameter</option>');
        parameter_menu.val("http://datalenergies.total.com/resource/tsf/idcp/Parameter");
        $("#button_Class_to_creatingNodeMenu").removeAttr("onclick");

        $("#button_Class_to_creatingNodeMenu").attr("onclick", `Idcp.idcp_addParameter('${dialog.get(0).id}');`);
        $("#LineageBlend_creatingNodeClassDiv").css("display", "none");
    };
    self.idcp_addParameter = function (dialogdiv) {
        Lineage_blend.graphModification.currentCreatingNodeType = "Class";
        Lineage_blend.graphModification.creatingsourceUri = undefined;
        Lineage_blend.graphModification.addClassOrIndividualTriples();

        var uri = Lineage_blend.graphModification.creatingNodeTriples[0]["subject"];
        var label_node = Lineage_blend.graphModification.creatingNodeTriples[0]["object"];
        var node = { source: self.source, label: label_node, id: uri };

        // set data owner in Creating node triples as creator

        Lineage_blend.graphModification.createNode();
        //Add new node to the desired container
        Lineage_containers.addResourcesToContainer(self.source, Lineage_containers.currentContainer, node);

        //$(".vis-manipulation").remove();
        //$(".vis-close").remove();

        $(document).ready(function () {
            Lineage_containers.graphResources(Lineage_sources.activeSource, Lineage_containers.currentContainer.data, { leaves: true }, function () {
                $(".vis-manipulation").remove();
                $(".vis-close").remove();
                if (!self.loadedGraphDisplay) {
                    $("#graphDiv").prepend('<button id="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Idcp.idcpClearAll()">Clear all</button>');
                    self.loadedGraphDisplay = true;
                }
            });
        });
    };

    self.onLoaded = function () {
        Lineage_blend.graphModification.creatingNodeTriples = [];

        Lineage_containers.getContextJstreeMenu = function () {
            var items = {};

            items["GraphContainerDescendantAndLeaves"] = {
                label: "Show DataContainers and his parameters",
                action: function (_e) {
                    Lineage_containers.graphResources(Lineage_sources.activeSource, Lineage_containers.currentContainer.data, { leaves: true }, function () {
                        $(".vis-manipulation").remove();
                        $(".vis-close").remove();
                        if (!self.loadedGraphDisplay) {
                            $("#graphDiv").prepend('<button id="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Idcp.idcpClearAll()">Clear all</button>');
                            self.loadedGraphDisplay = true;
                        }
                    });
                },
            };

            items["AddGraphNode"] = {
                label: "Add a new parameter to this DataContainer ",
                action: function (_e) {
                    //var clicked_container=_e.reference[0].childNodes[1].nodeValue;

                    $("<div>").dialog({
                        modal: true,
                        open: function () {
                            var dialog = $(this);
                            $(this).load("snippets/lineage/lineageAddNodeDialog.html #LineageBlend_creatingNodeSingleTab", function () {
                                self.adding_parameter_hide();
                                $("#LineageBlend_creatingNodeClassDiv").load("snippets/commonUIwidgets/editPredicateDialog.html", function () {
                                    CommonUIwidgets.predicatesSelectorWidget.init(self.source, function () {
                                        CommonUIwidgets.predicatesSelectorWidget.setVocabulariesSelect(self.source, "_curentSourceAndImports");
                                        self.widget_preselection_and_hide(dialog);
                                    });
                                });
                            });
                        },
                        height: 200,
                        width: 800,
                        title: "Renseign your parameter",
                        close: function () {
                            $(this).dialog("close");
                            $(this).remove();
                        },
                    });
                },
            };
            items["DeleteContainer"] = {
                label: "Delete a DataContainer or a parameter",
                action: function (_e) {
                    Lineage_containers.deleteContainer(Lineage_sources.activeSource, Lineage_containers.currentContainer);
                },
            };

            return items;
        };

        Lineage_sources.activeSource = self.source;
        $("#rightPanelDiv").remove();
        $("#actionDivContolPanelDiv").remove();
        $("#actionDiv").remove();

        var search_pannel = $("#toolPanelDiv").append("<div id='IDCP search pannel'>Search Datacontainers</div>");
        var html_content = search_pannel.append("<div id='IDCP right pannel'></div>");

        html_content.load("/vocables/snippets/lineage/lineageRightPanel.html #LineageContainersTab", function () {
            $("#Lineage_containers_searchWhatInput").hide();
            $("#toolPanelLabel").text("IDCP DataConainers Search");
            $("#Lineage_addContainer_button").text("Create New DataConainer ");

            Lineage_containers.search();

            $("#graphDiv").prepend('<button id="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Lineage_classes.initUI()">Clear all</button>');

            $("#Lineage_addContainer_button").removeAttr("onclick");

            $("#Lineage_addContainer_button").attr("onclick", "Idcp.idcp_addDataContainer();");
        });

        Lineage_sources.isSourceEditable(self.source);
    };

    return self;
})();
