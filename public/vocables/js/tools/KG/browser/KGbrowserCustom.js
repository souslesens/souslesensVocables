var KGbrowserCustom = (function () {
    var self = {};

    self.setAdditionalGraphPopupMenuDiv = function () {
        // set readi properties
        if (KGbrowserGraph.currentGraphNode.data.type == "http://w3id.org/readi/rdl/D101001053") {
            var html = '    <span   onclick="KGbrowserCustom.showREADIrestrictionsOnGraph();">show READI restrictions </span>';
            $("#KGbrowser_customGraphPopupMenuDiv").addClass("popupMenuItem");
            $("#KGbrowser_customGraphPopupMenuDiv").html(html);
        }
    };

    self.initsuperClassesPalette = function () {
        for (var superClass in self.superClassesMap) {
            var group = self.superClassesMap[superClass].group.toLowerCase();
            var color = self.superClassesGroupColors[group];
            self.superClassesMap[superClass].color = color;
            common.jstree.types[group] = { icon: "../icons/custom/OneModel/" + group + ".png" };
        }
    };

    self.showREADIrestrictionsOnGraph = function () {
        var id = KGbrowserGraph.currentGraphNode.data.id;
        var source = "CFIHOS_READI";
        Sparql_OWL.getObjectRestrictions(source, id, {}, function (err, result) {
            if (err) return MainController.UI.message(err, true);
            var visjsData = { nodes: [], edges: [] };
            var existingNodes = visjsGraph.getExistingIdsMap();
            var color = Lineage_classes.restrictionColor;

            visjsData.nodes.push({
                id: source + "_" + KGbrowserGraph.currentGraphNode.data.id,
                label: source + " " + KGbrowserGraph.currentGraphNode.data.label,
                shape: "square",
                size: Lineage_classes.defaultShapeSize,
                color: color,
                data: { source: source, id: source + "_" + KGbrowserGraph.currentGraphNode.data.id, label: source + " " + KGbrowserGraph.currentGraphNode.data.label, varName: "value" },
            });

            result.forEach(function (item) {
                if (!item.value) {
                    item.value = { value: "?_" + item.prop.value };
                    item.valueLabel = { value: "?" };
                }
                if (!item.valueLabel) {
                    item.valueLabel = { value: "?" };
                }
                if (!existingNodes[item.value.value]) {
                    existingNodes[item.value.value] = 1;
                    visjsData.nodes.push({
                        id: item.value.value,
                        label: item.valueLabel.value,
                        shape: "square",
                        size: Lineage_classes.defaultShapeSize,
                        color: color,
                        data: { source: source, id: item.value.value, label: item.valueLabel.value, varName: "value" },
                    });
                }

                /*  var edgeId = item.concept.value + "_" + item.value.value + "_" + item.prop.value
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.concept.value,
                        to: item.value.value,
                      //  label: "<i>" + item.propLabel.value + "</i>",
                        data: {propertyId: item.prop.value, source: source},
                        font: {multi: true, size: 10},
                        // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                        //   physics:false,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "bar",
                                scaleFactor: 0.5
                            },
                        },
                        dashes: true,
                        color: Lineage_classes.restrictionColor

                    })*/

                var sourceId = source + "_" + KGbrowserGraph.currentGraphNode.data.id;
                var edgeId = sourceId + "_" + item.value.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;
                    visjsData.edges.push({
                        id: edgeId,
                        to: sourceId,
                        from: item.value.value,
                        label: "<i>" + item.propLabel.value + "</i>",
                        data: { propertyId: item.prop.value, source: source },
                        font: { multi: true, size: 10 },
                        // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                        //   physics:false,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "bar",
                                scaleFactor: 0.5,
                            },
                        },
                        length: 200,
                        dashes: true,
                        color: Lineage_classes.restrictionColor,
                    });
                }

                //  }
            });

            visjsGraph.data.nodes.add(visjsData.nodes);
            visjsGraph.data.edges.add(visjsData.edges);
            visjsGraph.network.fit();
            $("#waitImg").css("display", "none");
        });
    };

    self.iconsDir = "../icons/custom/OneModel/";
    self.superClassesGroupColors = {
        aspect: "#7fef11",
        information: "#B3B005",
        location: "#ff6983",
        object: "#007DFF",
        function: "#FFD900",
    };

    self.superClassesMap = {
        "http://standards.iso.org/iso/15926/part14/Quality": { group: "Aspect", color: "" },
        "http://w3id.org/readi/rdl/D101001519": { group: "Aspect", color: "" },
        "http://standards.iso.org/iso/15926/part14/System": { group: "Function", color: "" },
        "http://data.total.com/resource/ARDL/System": { group: "Function", color: "" },
        "http://standards.iso.org/iso/15926/part14/QuantityDatum": { group: "Aspect", color: "" },
        "http://w3id.org/readi/rdl/CFIHOS-50000112": { group: "Aspect", color: "" },
        "https://w3id.org/requirement-ontology/rdl/REQ_0008": { group: "Information", color: "" },
        "http://standards.iso.org/iso/15926/part14/Organization": { group: "Object", color: "" },
        "http://w3id.org/readi/z018-rdl/Discipline": { group: "Information", color: "" },
        "http://w3id.org/readi/rdl/D101001495": { group: "Function", color: "" },
        "http://w3id.org/readi/rdl/D101001188": { group: "Information", color: "" },
        "http://data.total.com/resource/ARDL/Area": { group: "Location", color: "" },
        "http://standards.iso.org/iso/15926/part14/Location": { group: "Location", color: "" },
        "http://data.total.com/resource/ARDL/Site": { group: "Location", color: "" },
        "http://data.total.com/resource/ARDL/Asset": { group: "Location", color: "" },
        "http://data.total.com/resource/ARDL/Afiliate": { group: "Location", color: "" },
        "http://data.total.com/resource/ARDL/FacilitySector": { group: "Location", color: "" },
        "http://data.total.com/resource/ARDL/ModuleUnit": { group: "Location", color: "" },
        "http://w3id.org/readi/rdl/D101001053": { group: "Object", color: "" },
        "http://w3id.org/readi/rdl/CFIHOS-00000008": { group: "Object", color: "" },
    };

    return self;
})();
