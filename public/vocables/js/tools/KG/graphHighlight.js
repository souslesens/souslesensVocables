/**
 * Created by claud on 23/11/2017.
 */
var paintAccordion;
var GraphHighlight = (function () {
    var self = {};
    self.colorsPalette;
    self.currentColor = "";
    self.currentLabel;
    self.currentRelType;
    self.currentNodes;

    self.initialNodesattrs = {};
    self.initialLinksattrs = {};
    self.currentHighlightProperty = null;
    var currentAction = "";

    var clickedLegendItem = false;
    var scale;
    var domain;
    var scaleType;
    var ticksColors = [];
    var currentLabelSize = 18;
    var currentLabelSized = "";
    var currentClusterProperty;
    var palettes = [
        [],
        [],
        [],
        ["#fc8d59", "#ffffbf", "#91cf60"],
        ["#d7191c", "#fdae61", "#a6d96a", "#1a9641"],
        ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
        ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9850"],
        ["#d73027", "#fc8d59", "#fee08b", "#ffffbf", "#d9ef8b", "#91cf60", "#1a9850"],
        ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"],
        ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"],
        ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
        ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
    ];

    var ordinalLegendMap = {};

    self.initDialog = function () {
        if (visjsGraph.legendLabels.length == 1) {
            common.fillSelectOptions("graphHighlight_labelSelect", visjsGraph.legendLabels);
            self.setLabelPropertiesSelect(visjsGraph.legendLabels[0]);
        } else common.fillSelectOptionsWithStringArray("graphHighlight_labelSelect", visjsGraph.legendLabels, true);
    };

    self.validateDialog = function () {
        var property = $("#graphHighlight_propertySelect").val();
        if (property == "") return common.alert("#graphHighlight_alertDiv", "Select a property to highlight");

        self.currentHighlightProperty = property;
        self.currentHighlightLabel = $("#graphHighlight_labelSelect").val();
        self.paintClasses(property);
    };

    self.setLabelPropertiesSelect = function (label) {
        if (label == "") return;
        var properties = Schema.getLabelProperties(label);
        common.fillSelectOptionsWithStringArray("graphHighlight_propertySelect", properties);
    };

    self.initColorsPalette = function (length, divId) {
        $("#" + divId).html("");
        self.colorsPalette = d3.scale
            .linear()
            .domain([1, length])
            .interpolate(d3.interpolateHcl)
            .range([d3.rgb("#007AFF"), d3.rgb("#FFF500")]);
        for (var i = 0; i < length; i++) {
            var color = self.colorsPalette(i);
            $("#" + divId).append("<div style='background-color:" + color + ";' class='colorPaletteSquare'>");
        }
        $(".colorPaletteSquare").on("click", function (e) {
            self.currentColor = $(this).css("background-color");
            self.paintAll();
        });
    };
    self.setColor = function (index) {
        self.currentColor = self.colorsPalette(index);
    };

    self.getD3Scale = function (data, nClasses) {
        var min = d3.min(data, function (d) {
            return d.value;
        });
        var max = d3.max(data, function (d) {
            return d.value;
        });

        var palette = palettes[nClasses];
        // var palette=["#9e0142","#d53e4f","#f46d43","#fdae61","#fee08b","#ffffbf","#e6f598","#abdda4","#66c2a5","#3288bd","#5e4fa2"]
        //  var palette = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];

        if (common.isNumber(data[0].value)) {
            scaleType = "linear";
            domain = d3.scale.linear().domain([min, max]).nice().range([0, nClasses]);
            // domain = d3.scaleLinear().domain([min, max]).nice().range([0, nClasses]);
            // if (false && d3.scaleLinear) scale = d3.scale.linear().domain().interpolator(d3.interpolateRainbow);
            //  scale = d3.scaleLinear().domain().interpolator(d3.interpolateRainbow);
            var xx = d3.scale.quantize().domain([min, max]);
            scale = d3.scale.quantize().domain([min, max]).range(palette);

            // scale = d3.scale.quantize().domain([min, max]).nice().range(palette);
        } else {
            // if (false && d3.scalePoint) domain = d3.scalePoint().domain(data).range([0, palette.length]);
            //  domain = d3.scale.point().domain(data).range([0, palette.length]);
            domain = d3.scale.ordinal().domain(data).range([0, palette.length]);
            //domain = d3.scaleOrdinal().domain(data).range([0, palette.length]);
            scaleType = "ordinal";
            scale = d3.scale.ordinal().domain(data).range(palette);
            //  scale = d3.scaleOrdinal().domain(data).range(palette);
        }
        return scale;
    };

    self.paintClasses = function (property) {
        var nClasses = palettes[palettes.length - 1].length; // parseInt($("#paintDialog_NclassesInput").val());
        var palette = palettes[nClasses];
        var size = Config.visjs.defaultNodeSize; // parseInt($("#paintDialog_circleRadiusInput").val() * 2);
        self.currentHighlightProperty = property;

        if (property == "") {
            $("#GraphHighlight_legendDiv").html("").css("visibility", "hidden");
            var targetNodes = [];
            var nodes = visjsGraph.data.nodes.get();
            nodes.forEach(function (node) {
                (node.color = node.initialColor), (node.shape = node.shape || Config.visjs.defaultNodeShape), (node.hidden = false);
            });
            visjsGraph.data.nodes.update(nodes);
        } else {
            var data = visjsGraph.data.nodes.get({});

            if (data.length == 0) {
                return common.alert("#graphHighlight_alertDiv", "No values  in graph for  property " + property);
            } else $("#GraphHighlightModalMenu").modal("hide");

            data.forEach(function (item) {
                item.highlightedProperty = item.neoAttrs[property];
            });

            var d3Scale = self.getD3Scale(data, nClasses);

            data.forEach(function (item) {
                if (item.highlightedProperty) {
                    var color;
                    if (scaleType == "ordinal") {
                        color = d3Scale(item.highlightedProperty);
                        color = self.rgb2hex(color);
                    } else {
                        var index = Math.round(domain(data[i].highlightedProperty));
                        color = d3Scale(item.highlightedProperty);
                        color = self.rgb2hex(color);
                    }
                    item.color = color;
                    if (!ordinalLegendMap[item.highlightedProperty]) ordinalLegendMap[item.highlightedProperty] = color;
                } else {
                    item.color = Config.visjs.defaultNodeColor;
                }
            });
            visjsGraph.data.nodes.update(data);
        }

        self.drawPaletteColorLegend(scale, domain, palette, nClasses, ordinalLegendMap);
    };

    self.drawPaletteColorLegend = function (scale, domain, palette, nClasses, ordinalLegendMap) {
        $("#GraphHighlight_legendDiv").html("").css("visibility", "visible");

        var ticks;
        var type;
        ticksColors = [];

        if (domain.ticks) {
            type = "linear";
            ticks = domain.ticks(nClasses);
            //  ticks = scale.ticks(nClasses);
            for (var i = 0; i < ticks.length; i++) {
                var color = scale(ticks[i]);
                color = self.rgb2hex(color);
                ticksColors.push({ color: color, tick: ticks[i] });
            }
        }

        if (!ticks) {
            for (var key in ordinalLegendMap) {
                ticksColors.push({ color: ordinalLegendMap[key], tick: key });
            }
        }
        var str = ' <img onClick="GraphHighlight.onCloseLegendDiv()" src="img/trash.png" width="20" alt="Filter"> &nbsp;';
        str += "<b>" + self.currentHighlightProperty + "<b></b><br><table style='font-size: 10px;font-weight: normal'>";
        str += "<hr>";

        color;
        var shapes = ["dot", "diamond", "triangle", "trangleDown", "square", "star"];
        var shapeIndex = 0;
        for (i = 0; i < ticksColors.length; i++) {
            var onClick = " onclick='GraphHighlight.onLegendItemClick(\"" + ticksColors[i].tick + "\")'";

            str +=
                "<tr" +
                onClick +
                "><td><span  class='BIlegendSpan' id='BIlegendSpan_" +
                ticksColors[i].tick +
                "' style='background-color: " +
                ticksColors[i].color +
                ";width:20px;height: 20px'>&nbsp;&nbsp;&nbsp;</span></td><td>" +
                ticksColors[i].tick +
                "</td></tr>";
        }

        $("#GraphHighlight_legendDiv").css("visibility", "visible");
        $("#GraphHighlight_legendDiv").html(str);
    };

    self.onCloseLegendDiv = function () {
        self.clearHighlight();
        $("#GraphHighlight_legendDiv").css("visibility", "hidden");
    };

    self.paintAll = function (option) {
        $("#graphPopup").css("visibility", "hidden");
        var nodeColor = null;
        var nodeR = null;
        var linkStroke = null;
        var linkStrokeWidth = null;
        if (!option);
        else if (option == "outline") {
            nodeColor = "#ddd";
            linkStroke = "#ddd";
        } else if (option == "initial") {
            // null values
        }

        var radius = $("#paintDialog_circleRadiusInput").val();
        var property = $("#propertiesSelectionDialog_propertySelect").val();
        var value = $("#propertiesSelectionDialog_valueInput").val();
        var filterObjectType = $("#propertiesSelectionDialog_ObjectTypeInput").val();
        var operator = $("#propertiesSelectionDialog_operatorSelect").val();
        var type = $("#propertiesSelectionDialog_NodeLabelInput").val();
        // self.currentLabel = $("#paintDialog_labelSelect").val();
        self.currentLabel = $("#propertiesSelectionDialog_NodeLabelInput").val();

        var legendStr = "";

        // eslint-disable-next-line no-constant-condition
        if (true) {
            // eslint-disable-next-line no-constant-condition
            if (true) {
                //($("#propertiesSelectionDialog_ObjectTypeInput").val() == "node") {

                var ids = [];
                for (var key in visjsGraph.nodes._data) {
                    var nodeData = visjsGraph.nodes._data[key];
                    if (value == "" && nodeData.labelNeo == self.currentLabel) {
                        ids.push(key);
                        legendStr = " All " + self.currentLabel;
                    } else if (visJsDataProcessor.isLabelNodeOk(nodeData, property, operator, value, type)) {
                        ids.push(key);
                        legendStr = self.currentLabel + "." + property + "" + operator + "" + value;
                    }
                }
                visjsGraph.paintNodes(ids, self.currentColor, "#eee", radius);
                legendStr = "<span style='background-color: " + self.currentColor + ";'>&nbsp;&nbsp;&nbsp;</span></td><td>" + legendStr + "</td></tr>";
                /* $("#paintDiv").css("height", 100);
                     $("#paintDiv").html(legendStr);*/
            } else {
                // relation
                ids = [];
                var relations = visjsGraph.visjsData.edges;

                for (var i = 0; i < relations.length; i++) {
                    var relData = relations[i];
                    if (property == "" && relData.type == self.currentRelType) {
                        ids.push(relData.neoId);
                        legendStr = " All " + self.currentRelType;
                    } else if (visJsDataProcessor.isLabelNodeOk(relData.neoAttrs, property, operator, value, type)) {
                        ids.push(relData.neoId);
                        legendStr = self.currentRelType + "." + property + "" + operator + "" + value;
                    }
                }
                visjsGraph.paintEdges(ids, self.currentColor, "#eee", radius);
                legendStr =
                    '<button class=\'btn btn-sm my-1 py-0 btn-outline-primary\' onclick=\' $("#GraphHighlight_legendDiv").html("").css("visibility", "hidden");\'>X</button></button><span style=\'background-color: ' +
                    self.currentColor +
                    ";'>&nbsp;&nbsp;&nbsp;</span></td><td>" +
                    legendStr +
                    "</td></tr>";
                /*   $("#paintDiv").css("height", 100);
                       $("#paintDiv").html(legendStr);*/
                $("#GraphHighlight_legendDiv").html(legendStr);
            }
        } else if (self.currentRelType) {
            var strokeWidth = $("#propertiesSelectionDialog_strokeWidthInput").val();
            self.applyInitialGraphObjectAttrs(nodeColor, nodeR, linkStroke, linkStrokeWidth);
            d3.selectAll(".link")
                .select("line")
                .each(function (d) {
                    if (option == "outline" && visJsDataProcessor.isLabelNodeOk(d)) {
                        d3.select(this).style("stroke", self.currentColor);
                        d3.select(this).style("stroke-width", strokeWidth);
                    }
                });
        }
    };
    self.clearHighlight = function () {
        var nodes = visjsGraph.data.nodes.get();
        nodes.forEach(function (item) {
            item.color = item.initialColor;
            item.highlightedProperty = null;
        });

        visjsGraph.data.nodes.update(nodes);
    };

    self.onActionTypeSelect = function (action) {
        currentAction = action;
        if (action == "outline") {
            //outline
            //   $("#paintDialogAction").css("visibility", "visible");
            $("#paintDialogPaletteDiv").css("visibility", "visible");
            $("#paintDialogPropDiv").css("visibility", "visible");
            $("#paintDialog_classesDiv").css("visibility", "hidden");
            //   $("#paintDialog_GraphicAttrsDiv").css("visibility", "visible");
        }
        if (action == "cluster") {
            //cluster
            $("#paintDialogPaletteDiv").css("visibility", "hidden");
            $("#paintDialogPropDiv").css("visibility", "hidden");
            $("#paintDialog_GraphicAttrsDiv").css("visibility", "visible");
            visjsGraph.clusterByLabel();
        }

        if (action == "classes") {
            //classes
            var visibility = "visible";
            if ($("#paintDialog_propertySelect").val() == "") visibility = "hidden";
            $("#paintDialog_classesDiv").css("visibility", visibility);
            $("#paintDialog_operatorSelect").css("visibility", "hidden");

            $("#paintDialogPropDiv").css("visibility", "visible");
            $("#paintDialogPaletteDiv").css("visibility", "hidden");
            $("#paintDialog_GraphicAttrsDiv").css("visibility", "visible");
            // $("#paintDialog_classesDiv").css("visibility", "visible");
        }
    };

    self.rgb2hex = function (rgb) {
        if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }

        return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
    };
    self.onLegendItemClick = function (value) {
        var selectedNodes = [];
        var nodes = visjsGraph.data.nodes.get();
        for (var i = 0; i < nodes.length; i++) {
            if (clickedLegendItem != value) {
                //hide other nodes than value

                if (!nodes[i].neoAttrs[self.currentHighlightProperty]) selectedNodes.push({ id: nodes[i].id, hidden: false });
                else if (nodes[i].neoAttrs[self.currentHighlightProperty] == value) selectedNodes.push({ id: nodes[i].id, hidden: false });
                else selectedNodes.push({ id: nodes[i].id, hidden: true });
            } else {
                //remove hidden on all nodes
                selectedNodes.push({ id: nodes[i].id, hidden: false });
            }
        }
        if (clickedLegendItem != value) clickedLegendItem = value;
        else clickedLegendItem = "";

        visjsGraph.data.nodes.update(selectedNodes);
    };

    self.clusterByClass = function (options) {
        currentClusterProperty = self.currentHighlightProperty;
        if (!options) options = { simple: true };
        if (!self.currentHighlightProperty) {
            return common.alert("#GraphHighlight_alertDiv", "Cluster only performs on color classes ");
        }

        $("#paint_unClusterButton").css("visibility", "visible");
        var clusterOptionsByData;
        var clusterSize = 0;
        for (var i = 1; i < ticksColors.length; i++) {
            ticksColors[i].size = 0;
            var tickColor = ticksColors[i].color;
            var label = ticksColors[i].tick;

            if (scaleType == "linear" && i < ticksColors.length - 1) label += "-" + ticksColors[i + 1].tick;
            if (options.simple) {
                clusterSize = 0;
                clusterOptionsByData = {
                    joinCondition: function (childOptions) {
                        if (childOptions.color.background == tickColor) {
                            clusterSize += 1;
                            ticksColors[i].size += 1;
                            return true;
                        }
                        return false; // the color is fully defined in the node.
                    },
                    processProperties: function (clusterOptions, childNodes, childEdges) {
                        var totalMass = 0;
                        for (var i = 0; i < childNodes.length; i++) {
                            totalMass += childNodes[i].mass;
                        }
                        clusterOptions.mass = totalMass;

                        return clusterOptions;
                    },

                    clusterNodeProperties: {
                        id: "cluster:" + tickColor,
                        // borderWidth: 3,
                        shape: "dot",
                        color: tickColor,
                        label: label + "(" + clusterSize + ")",
                        size: 30,
                    },
                };
                visjsGraph.network.cluster(clusterOptionsByData);
            } else {
                clusterOptionsByData = {
                    processProperties: function (clusterOptions, childNodes) {
                        clusterOptions.label = "[" + childNodes.length + "]";
                        return clusterOptions;
                    },
                    clusterNodeProperties: { borderWidth: 3, shape: "square", font: { size: 30 } },
                };
                visjsGraph.network.clusterByHubsize(undefined, clusterOptionsByData);
            }
        }

        var maxSize = 0;
        var minSize = 10000000;
        for (i = 1; i < ticksColors.length; i++) {
            maxSize = Math.max(maxSize, ticksColors[i].size);
            minSize = Math.min(minSize, ticksColors[i].size);
        }
        var logScale = d3.scale.log().domain([minSize, maxSize]).range([20, 60]);
        for (i = 1; i < ticksColors.length; i++) {
            clusterSize = ticksColors[i].size;
            var size = logScale(ticksColors[i].size);
            // size=size/10
            // eslint-disable-next-line no-console
            console.log(clusterSize + "  " + size);
            visjsGraph.nodesDS.update({
                id: "cluster:" + ticksColors[i].color,
                label: label + "(" + clusterSize + ")",
                size: size,
                color: ticksColors[i].color,
                shape: "ellipse",
            });
        }

        visjsGraph.network.setOptions({
            physics: { enabled: true },
        });
        setTimeout(function () {
            visjsGraph.network.setOptions({
                physics: { enabled: true },
            });
        }, 3000);
        $("#paint_unClusterButton").css("visibility", "visible");
    };

    self.unClusterByClass = function () {
        if (!currentClusterProperty || currentClusterProperty == "") return;
        $("#paint_unClusterButton").css("visibility", "hidden");

        var x = visjsGraph.network;

        for (var i = 1; i < ticksColors.length; i++) {
            var tickColor = ticksColors[i].color;
            visjsGraph.network.openCluster("cluster:" + tickColor, {
                releaseFunction: function (clusterPosition, containedNodesPositions) {
                    return containedNodesPositions;
                },
            });
        }
    };

    self.initHighlight = function () {
        var properties = [];

        var labels = GraphFilter.currentLabels;
        for (var i = 0; i < labels.length; i++) {
            var props = Schema.schema.properties[labels[i]];
            for (var key in props) if (properties.indexOf(key) < 0) properties.push(key);
        }
        properties.sort();
        /*   if (paintDialog_highlightPropertySelect)
                   common.fillSelectOptionsWithStringArray(paintDialog_highlightPropertySelect, properties,true);
               common.fillSelectOptionsWithStringArray(paint_showNodeNamesForLabelSelect, GraphFilter.currentLabels,true);*/
    };

    self.dispatchAction = function (action) {
        $("#graphPopup").css("visibility", "hidden");
        toutlesensController.hidePopupMenu();
        if (!context.currentNode.id && context.currentNode.type != "cluster") return;

        if (action == "openCluster") {
            visjsGraph.network.openCluster(context.currentNode.id, {
                releaseFunction: function (clusterPosition, containedNodesPositions) {
                    return containedNodesPositions;
                },
            });
        } else if (action == "graphClusterNodes") {
            var nodeIds = visjsGraph.network.getNodesInCluster(context.currentNode.id);
            buildPaths.getWhereClauseFromArray("_id", nodeIds, function (err, result) {
                toutlesensController.generateGraph(
                    null,
                    {
                        applyFilters: true,
                        dragConnectedNodes: true,
                    },
                    function () {
                        $("#filtersDiv").html("");
                        $("#graphMessage").html("");
                    }
                );
            });
        } else if (action == "listClusterNodes") {
            nodeIds = visjsGraph.network.getNodesInCluster(context.currentNode.id);

            var query = "match (n) where ID(n) in " + JSON.stringify(nodeIds).replace(/"/g, "") + " return n";

            dialogLarge.dialog({ modal: true });
            dialogLarge.dialog("option", "title", "Graph text");
            dialogLarge.html("<div id='dialogDiv'></div>");
            dataTable.loadNodes(query, { containerDiv: "dialogDiv" });

            dialogLarge.dialog("open");
        }
    };

    self.showNodeNamesForLabel = function (label) {
        currentLabelSized = label;
        var nodes = [];
        for (var key in visjsGraph.nodes._data) {
            if (label != "" && visjsGraph.nodes._data[key].labelNeo == label) {
                nodes.push({
                    id: key,
                    color: "blue",
                    showLabel: true,
                    font: { size: currentLabelSize, color: "blue", background: "white" },
                });
            } else {
                nodes.push({
                    id: key,
                    color: visjsGraph.nodes._data[key].initialColor,
                    showLabel: false,
                    font: { size: 12, color: "black", background: "none" },
                });
            }
        }
        visjsGraph.nodesDS.update(nodes);
        if (GraphHighlight.currentHighlightProperty && GraphHighlight.currentHighlightProperty != "") GraphHighlight.paintClasses(GraphHighlight.currentHighlightProperty);
    };

    self.setLabelSize = function (direction) {
        if (currentLabelSized == "") return;
        currentLabelSize += 3 * direction;
        self.showNodeNamesForLabel(currentLabelSized);
    };

    return self;
})();
