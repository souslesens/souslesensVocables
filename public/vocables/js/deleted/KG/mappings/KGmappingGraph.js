var KGmappingGraph = (function () {
    var self = {};

    self.initMappedProperties = function () {
        self.mappedProperties = { mappings: {}, model: {} };
    };

    (self.attrs = {
        table: { shape: "ellipse", color: "grey" },
        column: { shape: "box", color: "#9edae5" },
        literal: { shape: "ellipse", color: "#c2f8f3" },
    }),
        (self.drawNode = function (columnName, color, position) {
            var columnObj = KGmappings.currentMappedColumns[columnName];

            var existingNodes = visjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };

            var typeStr = "";
            if (Array.isArray(columnObj.types)) {
                columnObj.types.forEach(function (item, index) {
                    if (index > 0) typeStr += "\n";
                    typeStr += item.type_label;
                });
            } else typeStr = typeObj.data.label;

            if (!existingNodes[columnName]) {
                var node = {
                    id: columnName,
                    label: columnName + "\n" + typeStr + "",
                    data: columnObj,
                    shape: KGmappingGraph.attrs["column"].shape,
                    color: color,
                };
                if (position) {
                    node.x = position.x;
                    node.y = position.y;
                    node.fixed = { x: true, y: true };
                }
                visjsData.nodes.push(node);
            }

            if (!visjsGraph.isGraphNotEmpty()) {
                var options = {
                    selectNodeFn: function (node, _event) {
                        MainController.UI.hidePopup("graphPopupDiv");
                        if (node) self.currentNode = node;
                    },
                    onRightClickFn: self.graphActions.showGraphPopupMenu,
                    keepNodePositionOnDrag: 1,
                };
                visjsGraph.draw("KGmappings_graph", visjsData, options);
            } else {
                visjsGraph.data.nodes.add(visjsData.nodes);
                visjsGraph.data.edges.add(visjsData.edges);
            }
            setTimeout(function () {
                visjsGraph.network.fit();
            }, 300);
        });

    self.graphActions = {
        showGraphPopupMenu: function (node, point, _e) {
            var top = $("#KGmappings_graph").position().top;
            point.y += top;
            var html = "";
            if (node.from) {
                //edge
                self.currentEdge = node;
                html = '    <span class="popupMenuItem" onclick="KGmappingGraph.graphActions.deleteProperty();"> delete Property</span>';
            } else {
                self.currentNode = node;
                if (!node) MainController.UI.hidePopup("graphPopupDiv");

                html =
                    '    <span class="popupMenuItem" onclick="KGmappingGraph.graphActions.isPropertySubject();"> is property subject</span>' +
                    '<span class="popupMenuItem" onclick="KGmappingGraph.graphActions.isPropertyObject();"> is property object</span>' +
                    '<span class="popupMenuItem" onclick="KGmappingGraph.graphActions.setLabelAssociation();"> is label</span>' +
                    '<span class="popupMenuItem" onclick="KGmappingGraph.graphActions.removeMapping();"> remove Mapping</span>';
            }
            $("#graphPopupDiv").html(html);
            MainController.UI.showPopup(point, "graphPopupDiv");
        },
        deleteProperty: function () {
            delete self.mappedProperties.mappings[self.currentEdge.id];
            visjsGraph.data.edges.remove(self.currentEdge.id);
        },

        isPropertySubject: function () {
            self.currentAssociation = {
                subject: self.currentNode,
            };
        },
        setLabelAssociation: function () {
            if (!self.currentAssociation.subject) return alert("select a subject first");
            self.currentAssociation.object = self.currentNode;
            var property = { data: { id: "http://www.w3.org/2000/01/rdf-schema#label", label: "rdfs:label" } };
            self.graphActions.setAssociation(property, self.currentAssociation);
        },
        removeMapping: function () {
            var columnId = self.currentNode.data.columnId;
            KGmappings.unAssignOntologyTypeToColumn(columnId);
        },

        isPropertyObject: function () {
            if (!self.currentAssociation) return;
            self.currentAssociation.object = self.currentNode;
            if (!self.currentAssociation.subject || !self.currentAssociation.object) return alert("select subject and object Nodes");

            var subjectLabel = "";
            self.currentAssociation.subject.data.types.forEach(function (item, index) {
                if (index > 0) subjectLabel += " / ";
                subjectLabel += item.type_label;
            });
            var objectLabel = "";
            self.currentAssociation.object.data.types.forEach(function (item, index) {
                if (index > 0) objectLabel += " / ";
                objectLabel += item.type_label;
            });

            $("#mainDialogDiv").load("snippets/KG/KGPropertyassocationDialog.html", function () {
                $("#mainDialogDiv").dialog("open");
                $("#KGMapping_graphAssociationSubjectSpan").html(self.currentAssociation.subject.data.columnId + "->" + subjectLabel);
                $("#KGMapping_graphAssociationObjectSpan").html(self.currentAssociation.object.data.columnId + "->" + objectLabel);
                KGmappings.displayPropertiesTree("KGmappingPropertiesTree");
                var to2 = false;
                $("#KGmappings_propertiesSearchTree").keyup(function () {
                    if (to2) {
                        clearTimeout(to2);
                    }

                    to2 = setTimeout(function () {
                        var searchString = $("#KGmappings_propertiesSearchTree").val();

                        $("#KGmappingPropertiesTree").jstree(true).search(searchString);
                    }, 250);
                });
            });

            KGmappingGraph.isAssigningProperty = true;
            setTimeout(function () {
                // Pass
            });
        },

        cancelAssociation: function () {
            $("#mainDialogDiv").dialog("close");
        },

        setAssociation: function (property, association) {
            if (!property) {
                property = $("#KGmappingPropertiesTree").jstree(true).get_selected(true);
                if (property && property.length > 0) property = property[0];
            }
            if (!property) return alert("select a property");
            if (!association) association = self.currentAssociation;
            var existingNodes = visjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };

            var edgeId = association.subject.data.columnId + "_" + property.data.id + "_" + association.object.data.columnId;
            self.mappedProperties.mappings[edgeId] = {
                subject: association.subject.data.columnId,
                predicate: property.data.id,
                object: association.object.data.columnId,
            };
            self.mappedProperties.model[property.data.id] = { parents: property.parents, label: property.data.label };
            if (!existingNodes[edgeId]) {
                visjsData.edges.push({
                    id: edgeId,
                    from: association.subject.data.columnId,
                    to: association.object.data.columnId,
                    label: property.data.label,
                    length: 300,
                    arrows: {
                        to: {
                            enabled: true,
                            type: "arrow",
                            scaleFactor: 0.5,
                        },
                    },
                });

                if (!existingNodes[association.object.data.columnId]) {
                    visjsData.nodes.push({
                        id: association.object.data.columnId,
                        label: association.object.data.columnId,
                        data: association.object.data.columnId,
                        shape: KGmappingGraph.attrs["literal"].shape,
                        color: KGmappingGraph.attrs["literal"].color,
                    });
                }

                if (!visjsGraph.isGraphNotEmpty()) {
                    var options = {
                        onclickFn: function (_node, _event) {
                            return;
                        },
                        onRightClickFn: self.graphActions.showGraphPopupMenu,
                        keepNodePositionOnDrag: 1,
                    };
                    visjsGraph.draw("KGmappings_graph", visjsData, options);
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes);
                    visjsGraph.data.edges.add(visjsData.edges);
                }
                visjsGraph.network.fit();
            }
            KGmappingGraph.isAssigningProperty = false;
            $("#mainDialogDiv").dialog("close");
        },
        removeNode: function (column) {
            visjsGraph.data.nodes.remove(column);
        },
    };

    return self;
})();
