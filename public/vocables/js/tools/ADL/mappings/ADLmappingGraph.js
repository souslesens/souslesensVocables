var ADLmappingGraph = (function () {


    var self = {}

    self.initMappedProperties = function () {
        self.mappedProperties = {mappings: {}, model: {}}
    }

    self.attrs = {
        table: {shape: "ellipse", color: "grey"},
        column: {shape: "box", color: "#9edae5"},
        literal: {shape: "ellipse", color: "#c2f8f3"},


    },

        self.drawNode = function (columnName, color, position) {

            var columnObj = ADLmappings.currentMappedColumns[columnName]

            var existingNodes = visjsGraph.getExistingIdsMap()
            var visjsData = {nodes: [], edges: []}


            var typeStr = "";
            if (Array.isArray(columnObj.types)) {

                columnObj.types.forEach(function (item, index) {
                    if (index > 0)
                        typeStr += "\n"
                    typeStr += item.type_label
                })
            } else
                typeStr = typeObj.data.label

            if (!existingNodes[columnName]) {
                var node = {
                    id: columnName,
                    label: columnName + "\n" + typeStr + "",
                    data: columnObj,
                    shape: ADLmappingGraph.attrs["column"].shape,
                    color: color,
                }
                if (position) {
                    node.x = position.x;
                    node.y = position.y;
                    node.fixed = {x: true, y: true};
                }
                visjsData.nodes.push(node);

            }


            if (!visjsGraph.data || !visjsGraph.data.nodes) {
                var options = {
                    selectNodeFn: function (node, event) {
                        MainController.UI.hidePopup("graphPopupDiv")
                        if (node)
                            self.currentNode = node;
                    },
                    onRightClickFn: self.graphActions.showGraphPopupMenu,
                    keepNodePositionOnDrag: 1
                }
                visjsGraph.draw("ADLmappings_graph", visjsData, options)
            } else {
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
            }
            setTimeout(function () {
                visjsGraph.network.fit()
            }, 300)


        }


    self.graphActions = {

        showGraphPopupMenu: function (node, point, e) {
            var top = $("#ADLmappings_graph").position().top
            point.y += top
            var html="";
            if(node.from){//edge
                self.currentEdge = node;
                html = "    <span class=\"popupMenuItem\" onclick=\"ADLmappingGraph.graphActions.deleteProperty();\"> delete Property</span>"



            }else {

                self.currentNode = node;
                if (!node)
                    MainController.UI.hidePopup("graphPopupDiv")

                 html = "    <span class=\"popupMenuItem\" onclick=\"ADLmappingGraph.graphActions.isPropertySubject();\"> is property subject</span>" +
                    "<span class=\"popupMenuItem\" onclick=\"ADLmappingGraph.graphActions.isPropertyObject();\"> is property object</span>"
            }
            $("#graphPopupDiv").html(html);
            MainController.UI.showPopup(point, "graphPopupDiv")
        },
        deleteProperty: function () {
            delete self.mappedProperties.mappings[self.currentEdge.id]
           visjsGraph.data.edges.remove(self.currentEdge.id)


        },

        isPropertySubject: function () {
            self.currentAssociation = {
                subject: self.currentNode
            }

        },

        isPropertyObject: function () {
            if (!self.currentAssociation)
                return;
            self.currentAssociation.object = self.currentNode;
            if (!self.currentAssociation.subject || !self.currentAssociation.object)
                return alert("select subject and object Nodes")


            var subjectLabel = "";
            self.currentAssociation.subject.data.types.forEach(function (item, index) {
                if (index > 0)
                    subjectLabel += " / "
                subjectLabel += item.type_label
            })
            var objectLabel = "";
            self.currentAssociation.object.data.types.forEach(function (item, index) {
                if (index > 0)
                    objectLabel += " / "
                objectLabel += item.type_label
            })


            /* var html = "MAPPING ASSOCIATION<br>" +
                  "<table>" +
                  "<tr><td class='td_title'>Subject</td><td class='td_value>" + self.currentAssociation.subject.data.columnId + "</td><td class='td_value'>" + subjectLabel + "</td></tr>" +
                  "<tr><td class='td_title'>Object</td><td class='td_value>" + self.currentAssociation.object.data.columnId + "</td><td class='td_value>" + objectLabel + "</td></tr>" +
                  "<tr><td class='td_title'>Property</td><td colspan='2' class='td_value></td><td class='td_value> <span id='ADLMapping_graphPropertySpan' style='font-weight:bold'>select  a property...</span></td></tr>" +

                  "</table>" +

                  "</div>" +
                  "<button onclick='ADLmappingGraph.graphActions.setAssociation()'>OK</button>" +
                  "<button onclick='ADLmappingGraph.graphActions.cancelAssociation()'>Cancel</button>"
  $("#ADLmappings_Tabs").tabs("option", "active", 3);
              $("#mainDialogDiv").html(html);*/
            $("#mainDialogDiv").load("snippets/ADL/ADLPropertyassocationDialog.html");
            setTimeout(function () {
                $("#ADLMapping_graphAssociationSubjectSpan").html(self.currentAssociation.subject.data.columnId + "->" + subjectLabel)
                $("#ADLMapping_graphAssociationObjectSpan").html(self.currentAssociation.object.data.columnId + "->" + objectLabel)
                ADLmappings.displayPropertiesTree("ADLmappingPropertiesTree")
                var to2 = false;
                $('#ADLmappings_propertiesSearchTree').keyup(function () {
                    if (to2) {
                        clearTimeout(to2);
                    }

                    to2 = setTimeout(function () {
                        var searchString = $("#ADLmappings_propertiesSearchTree").val();

                        var xx = $('#ADLmappingPropertiesTree').jstree(true)
                        $('#ADLmappingPropertiesTree').jstree(true).search(searchString);
                    }, 250);
                });

            })
            $("#mainDialogDiv").dialog("open")
            ADLmappingGraph.isAssigningProperty = true
            setTimeout(function () {


            })

        },


        cancelAssociation: function () {
            $("#mainDialogDiv").dialog("close")

        },

        setAssociation: function (property, association) {
            if (!property) {
                property = $("#ADLmappingPropertiesTree").jstree(true).get_selected(true)
                if (property && property.length > 0)
                    property = property[0]
            }
            if (!property)
                return alert("select a property")
            if (!association)
                association = self.currentAssociation
            var existingNodes = visjsGraph.getExistingIdsMap()
            var visjsData = {nodes: [], edges: []}


            var edgeId = association.subject.data.columnId + "_" + property.data.id + "_" + association.object.data.columnId
            self.mappedProperties.mappings[edgeId] = {
                subject: association.subject.data.columnId,
                predicate: property.data.id,
                object: association.object.data.columnId,

            }
            self.mappedProperties.model[property.data.id] = {parents: property.parents, label: property.data.label}
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
                            scaleFactor: 0.5
                        },
                    },

                })

                if (!existingNodes[association.object.data.columnId]) {
                    visjsData.nodes.push({
                        id: association.object.data.columnId,
                        label: association.object.data.columnId,
                        data: association.object.data.columnId,
                        shape: ADLmappingGraph.attrs["literal"].shape,
                        color: ADLmappingGraph.attrs["literal"].color,


                    })
                }

                if (!visjsGraph.data || !visjsGraph.data.nodes) {
                    var options = {
                        onclickFn: function (node, event) {
                            return;
                            if (node)
                                self.currentNode = node;
                        },
                        onRightClickFn: self.graphActions.showGraphPopupMenu,
                        keepNodePositionOnDrag: 1,


                    }
                    visjsGraph.draw("ADLmappings_graph", visjsData, options)
                } else {
                    visjsGraph.data.nodes.add(visjsData.nodes)
                    visjsGraph.data.edges.add(visjsData.edges)
                }
                visjsGraph.network.fit()

                /*   setTimeout(function(){
                       visjsGraph.network.moveTo({
                           position: {x:-500, y:-500}
                       });
                       },200)
                       visjsGraph.network.fit()*/

            }
            ADLmappingGraph.isAssigningProperty = false;
            $("#mainDialogDiv").dialog("close")


        }
        ,
        removeNode: function (column) {
            visjsGraph.data.nodes.remove(column)
        }
    }


    return self;
})()




