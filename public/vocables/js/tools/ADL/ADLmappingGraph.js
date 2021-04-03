var ADLmappingGraph = (function () {


    var self = {}
    self.mappedProperties = {mappings: {}, model: {}}

    self.attrs = {
        table: {shape: "ellipse", color: "grey"},
        column: {shape: "box", color: "#9edae5"},


    },

        self.drawNode = function (columnName) {

            var columnObj = ADLmappings.currentMappedColumns[columnName]

            var existingNodes = visjsGraph.getExistingIdsMap()
            var visjsData = {nodes: [], edges: []}


            if (!existingNodes[columnName]) {
                visjsData.nodes.push({
                        id: columnName,
                        label: columnName + "\n" + columnObj.type_label + "",
                        data: columnObj,
                        shape: ADLmappingGraph.attrs["column"].shape,
                        color: ADLmappingGraph.attrs["column"].color,
                    }
                )
            }


            if (!visjsGraph.data || !visjsGraph.data.nodes) {
                var options = {
                    selectNodeFn: function (node, event) {
                        if (node)
                            self.currentNode = node;
                    },
                    onRightClickFn: self.graphActions.showGraphPopupMenu
                }
                visjsGraph.draw("ADLmappings_graph", visjsData, options)
            } else {
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)
            }
            visjsGraph.network.fit()


        }


    self.graphActions = {

        showGraphPopupMenu: function (node, point, e) {
            var top = $("#ADLmappings_graph").position().top
            point.y += top
            self.currentNode = node;
            if (!node)
                MainController.UI.hidePopup("graphPopupDiv")

            var html = "    <span class=\"popupMenuItem\" onclick=\"ADLmappingGraph.graphActions.isPropertySubject();\"> is property subject</span>" +
                "<span class=\"popupMenuItem\" onclick=\"ADLmappingGraph.graphActions.isPropertyObject();\"> is property object</span>"

            $("#graphPopupDiv").html(html);
            MainController.UI.showPopup(point, "graphPopupDiv")
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

            var html = "MAPPING ASSOCIATION<br>" +
                "<table>" +
                "<tr><td class='td_title'>Subject</td><td class='td_value>" + self.currentAssociation.subject.data.columnId + "</td><td class='td_value'>" + self.currentAssociation.subject.data.type_label + "</td></tr>" +
                "<tr><td class='td_title'>Object</td><td class='td_value>" + self.currentAssociation.object.data.columnId + "</td><td class='td_value>" + self.currentAssociation.object.data.type_label + "</td></tr>" +

                "</table>" +
                "<div style='border: brown solid 1px;margin: 5px'>" + "property<br>" +
                "<div id='ADLmappingPropertiesTree' style='width:400px;height: 400px;overflow: auto;'></div>" +
                "</div>" +
                "<button onclick='ADLmappingGraph.graphActions.validateAssociation()'>OK</button>" +
                "<button onclick='ADLmappingGraph.graphActions.cancelAssociation()'>Cancel</button>"

            $("#mainDialogDiv").html(html);
            $("#mainDialogDiv").dialog("open")
            setTimeout(function () {
                Lineage_properties.getPropertiesjsTreeData(Config.ADL.OneModelSource, null, null, function (err, jsTreeData) {
                    if (err)
                        return MainController.UI.message(err)

                    jsTreeData.forEach(function(item){
                        if(item.parent=="#")
                            item.parent=Config.ADL.OneModelSource
                    })
                    jsTreeData.push({id:Config.ADL.OneModelSource,text:Config.ADL.OneModelSource,parent:"#"})
                    var options = {
                        selectTreeNodeFn: ADLmappingGraph.graphActions.onPropertiesTreeNodeClick,
                        openAll: true

                    }
                    common.loadJsTree("ADLmappingPropertiesTree", jsTreeData, options);
                })


            })

        },


        cancelAssociation: function () {
            $("#mainDialogDiv").dialog("close")

        }, onPropertiesTreeNodeClick: function () {

        },

        validateAssociation: function () {
            var property = $("#ADLmappingPropertiesTree").jstree(true).get_selected(true)
            if (!property || property.length == 0)
                return alert("select a property")
            property = property[0]
            var existingNodes = visjsGraph.getExistingIdsMap()
            var visjsData = {nodes: [], edges: []}


            var edgeId = self.currentAssociation.subject.data.columnId + "_" + property.data.id + "_" + self.currentAssociation.object.data.columnId
            self.mappedProperties.mappings[edgeId] = {
                subject: self.currentAssociation.subject.data.columnId,
                predicate: property.data.id,
                object: self.currentAssociation.object.data.columnId,

            }
            self.mappedProperties.model[property.data.id] = property.parents
            if (!existingNodes[edgeId]) {
                visjsData.edges.push({
                    id: edgeId,
                    from: self.currentAssociation.subject.data.columnId,
                    to: self.currentAssociation.object.data.columnId,
                    label: property.data.id,
                    arrow: {to: 1}

                })
                visjsGraph.data.nodes.add(visjsData.nodes)
                visjsGraph.data.edges.add(visjsData.edges)

                visjsGraph.network.fit()

            }
            $("#mainDialogDiv").dialog("close")


        }
    }


    return self;
})()




