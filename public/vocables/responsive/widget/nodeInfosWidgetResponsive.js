import Sparql_generic from "../../modules/sparqlProxies/sparql_generic.js";
import Sparql_common from "../../modules/sparqlProxies/sparql_common.js";
import common from "../../modules/shared/common.js";
import Sparql_OWL from "../../modules/sparqlProxies/sparql_OWL.js";
import Sparql_proxy from "../../modules/sparqlProxies/sparql_proxy.js";
import Lineage_whiteboard from "../../modules/tools/lineage/lineage_whiteboard.js";
import ElasticSearchProxy from "../../modules/search/elasticSearchProxy.js";
import SearchUtil from "../../modules/search/searchUtil.js";
import MainController from "../../modules/shared/mainController.js";
import PredicatesSelectorWidget from "../../modules/uiWidgets/predicatesSelectorWidget.js";
import Lineage_axioms_draw from "../../modules/tools/lineage/lineage_axioms_draw.js";
import Lineage_axioms_create from "../../modules/tools/lineage/lineage_axioms_create.js";
import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import authentication from "../../modules/shared/authentification.js";

var NodeInfosWidgetResponsive = (function () {
    var self = {};
    self.initDialog = function (sourceLabel, divId, options, callback) {
        ResponsiveUI.openDialogDiv(divId);
        $("#mainDialogDiv").parent().css("top", "5%");
        $("#mainDialogDiv").parent().css("left", "35%");
        $("#" + divId)
            .parent()
            .show("fast", function () {
                self.oldNodeInfosInit(sourceLabel, divId, options, callback);
            });
    };
    self.oldNodeInfosInit = function (sourceLabel, divId, options, callback) {
        self.currentSource = sourceLabel;
        if (!options.noDialog) {
            $("#" + divId).dialog("option", "title", " Node infos : source " + sourceLabel);
            $("#" + divId).dialog("open");
        }
        $("#" + divId).load("snippets/nodeInfosWidget.html", function () {
            $("#nodeInfosWidget_tabsDiv").tabs({
                //  active: options.showAxioms ? 1 : 0,

                load: function( event, ui ) {

                },
                activate: function (event, ui) {
                    
                        $('.nodeInfosWidget_tabDiv').removeClass('nodesInfos-selectedTab');
                        
                        setTimeout(function () {
                            $("[aria-selected='true']").addClass('nodesInfos-selectedTab');
                            if (ui.newPanel.selector == "#nodeInfosWidget_AxiomsTabDiv") {
                                var source = self.currentSource;
                                source = Lineage_sources.mainSource;
                                Lineage_axioms_draw.drawNodeAxioms(source, self.currentNodeId, "axiomsDrawGraphDiv");
                            }
                        }, 100);
                    
                },
            });
            $("#axiomsDrawGraphDiv").dialog({
                    autoOpen: false,
                height: 800,
                width: 1000,
                modal: false,
            });
            $("#axioms_dialogDiv").dialog({
                autoOpen: false,
                height: 800,
                width: 1000,
                modal: false,
            });
            $('.nodeInfosWidget_tabDiv').css('margin','0px');
            $("[aria-selected='true']").addClass('nodesInfos-selectedTab');
            callback();
        });
    };

   
    self.showNodeInfos = function (sourceLabel, node, divId, options, callback) {
        self.currentNodeIdInfosSource = sourceLabel;
        self.currentNodeIdInfosDivId = divId;

        self.newProperties = null;
        self.currentNodeId = null;
        self.currentNode = null;
        self.visitedNodes = [];

        if (!sourceLabel) {
            sourceLabel = self.currentSource;
        } else {
            self.currentSource = sourceLabel;
        }
        Lineage_axioms_draw.currentSource = sourceLabel;

        if (typeof node == "object") {
            self.currentNode = node;
            if (node.data) {
                if (node.data.type && node.data.type.indexOf("literal") > -1) {
                    return;
                }

                if (node.data.propertyId && !node.data.id) {
                    //when  a property in a restriction
                    node.data.id = node.data.propertyId;
                }
                if (node.data.from && !node.data.id) {
                    //when  a property in a restriction
                    node.data.id = node.data.from;
                }

                if (node.data.id) {
                    self.currentNodeId = node.data.id;
                }
            } else {
                if (node.id) {
                    self.currentNodeId = node;
                }
            }
        } else {
            self.currentNodeId = node;
        }
        var nodeId = self.currentNodeId;

        self.currentNodeRealSource = self.currentSource;
        self.divId = divId;
        if (!options) {
            options = {};
        }

        if (!self.visitedNodes || options.resetVisited) {
            self.visitedNodes = [];
            self.visitedNodes.currentIndex = 0;
        }

        var index = self.visitedNodes.indexOf(nodeId);
        if (index < 0) {
            self.visitedNodes.push(nodeId);
            self.visitedNodes.currentIndex = self.visitedNodes.length - 1;
        } else {
            self.visitedNodes.currentIndex = index;
        }

        self.initDialog(sourceLabel, divId, options, function () {
            if (true || !options.showAxioms) {
                self.drawAllInfos(sourceLabel, nodeId, options, function (err, result) {
                    if (callback) {
                        callback(err);
                    }
                    if (err) {
                        return alert(err);
                    }
                    self.showNodeInfosToolbar(options);
                });
            }
        });
    };

    self.drawAllInfos = function (sourceLabel, nodeId, options, callback) {
        var types;
        async.series(
            [
                function (callbackSeries) {
                    self.drawCommonInfos(sourceLabel, nodeId, "nodeInfosWidget_InfosTabDiv", options, function (_err, result) {
                        types = result.types;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    if (types.indexOf("http://www.w3.org/2002/07/owl#Class") < 0) {
                        return callbackSeries();
                    }
                    var html = "<button id='nodesInfos_individual_button' onclick='NodeInfosWidget.showClassIndividuals()'>Individuals</button>";
                    $("#nodeInfos_individualsDiv").html(html);
                    callbackSeries();
                },
                function (callbackSeries) {
                    if (types.indexOf("http://www.w3.org/2002/07/owl#Class") < 0) {
                        return callbackSeries();
                    }
                    self.showClassRestrictions(self.currentNodeRealSource, [nodeId], options, function (err) {
                        callbackSeries(err);
                    });
                },

                function (callbackSeries) {
                    if (types.indexOf("http://www.w3.org/2002/07/owl#ObjectProperty") < 0) {
                        return callbackSeries();
                    }
                    self.showPropertyRestrictions(self.currentNodeRealSource, nodeId, "nodeInfosWidget_InfosTabDiv", function (_err, _result) {
                        callbackSeries();
                    });
                },
            ],
            function (err) {
                if (callback) {
                    callback(err);
                }
                if (err) {
                    return alert(err);
                }
            }
        );
    };

    self.showNodeInfosToolbar = function (options) {
        if (!options) {
            options = {};
        }
        var str = "<div>";
        if (Lineage_sources.isSourceEditableForUser(self.currentSource) && !options.hideModifyButtons) {
            str +=
                "<button class='w3-button slsv-right-top-bar-button nodeInfos-button' " +
                "onclick='PredicatesSelectorWidget.init(Lineage_sources.activeSource, NodeInfosWidget.configureEditPredicateWidget)'>  Add Predicate </button>";

            str += "<button class='w3-button slsv-right-top-bar-button nodeInfos-button' onclick='NodeInfosWidget.deleteNode()'> Delete </button>";
        }

        if (authentication.currentUser.groupes.indexOf("Annotator") > -1) {
            str +=
                "<button class='w3-button slsv-right-top-bar-button nodeInfos-button' " +
                "onclick='PredicatesSelectorWidget.init(Lineage_sources.activeSource, NodeInfosWidget.configureEditPredicateWidget)'>  Add Predicate </button>";
        }

        str += "<div id='sourceBrowser_addPropertyDiv' style=''>";

        if (self.visitedNodes.length > 1) {
            str +=
                "<button class='w3-button slsv-right-top-bar-button nodeInfos-button' onclick='NodeInfosWidget.showVisitedNode(-1)'> previous </button>" +
                "<button class='w3-button slsv-right-top-bar-button nodeInfos-button' onclick='NodeInfosWidget.showVisitedNode(+1)'>  next </button>";
        }

        str += "</div>";

        $("#" + self.currentNodeIdInfosDivId).prepend(str);

        if (Lineage_sources.isSourceEditableForUser(self.currentSource) && !options.hideModifyButtons) {
            PredicatesSelectorWidget.load("sourceBrowser_addPropertyDiv", self.currentSource, {}, function () {
                $("#editPredicate_controlsDiv").css("display", "block");
                $("#sourceBrowser_addPropertyDiv").css("display", "none");
            });
        }
    };

    self.configureEditPredicateWidget = function () {
        $("#editPredicate_savePredicateButton").click(function () {
            self.addPredicate();
        });
    };

    self.drawCommonInfos = function (sourceLabel, nodeId, divId, _options, callback) {
        if (!_options) {
            _options = {};
        }
        var valueLabelsMap = {};
        $(".infosTable").html("");
        self.propertiesMap = { label: "", id: "", properties: {} };
        var blankNodes = [];
        Sparql_generic.getNodeInfos(
            sourceLabel,
            nodeId,
            {
                getValuesLabels: true,
                selectGraph: true,
            },
            function (err, data) {
                if (err) {
                    return MainController.UI.message(err);
                }
                if (divId.indexOf("Dialog") > -1) {
                    $("#" + divId).on("dialogbeforeclose", function (_event, _ui) {
                        self.indexObjectIfNew();
                    });
                }

                var types = [];
                var graphUri = "";
                var uniqueTriples = {};
                data.forEach(function (item) {
                    var key;
                    if (item.objectValue) {
                        var value = item.objectValue.value.replace(/T[\d:]*Z/, "");
                        item.value.value = value;
                        var key = item.prop.value + "_" + value;
                    } else {
                        var key = item.prop.value + "_" + item.value.value + item.value["xml:lang"];
                    }
                    if (uniqueTriples[key]) {
                        return;
                    }
                    uniqueTriples[key] = 1;

                    if (item.g) {
                        graphUri = item.g.value;
                        var realSource = Sparql_common.getSourceFromGraphUri(graphUri, sourceLabel);
                        if (realSource) {
                            self.currentNodeRealSource = realSource;
                        }
                    }

                    if (item.value.type == "bnode") {
                        return blankNodes.push(item.value.value);
                    }

                    if (item.prop.value == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                        types.push(item.value.value);
                    }

                    var propName = item.prop.value;
                    if (item.propLabel) {
                        propName = item.propLabel.value;
                    } else {
                        propName = Sparql_common.getLabelFromURI(item.prop.value);
                    }

                    var value = item.value.value;

                    if (item.valueLabel) {
                        if (!item["xml:lang"]) {
                            valueLabelsMap[value] = item.valueLabel.value;
                        }
                    }
                    /*   if (item.valueLabel)
value = item.valueLabel.value;*/

                    if (!self.propertiesMap.properties[propName]) {
                        self.propertiesMap.properties[propName] = {
                            name: propName,
                            propUri: item.prop.value,
                            langValues: {},
                        };
                    }
                    var predicateId = common.getRandomHexaId(5);
                    PredicatesSelectorWidget.predicatesIdsMap[predicateId] = { item: item };

                    // dont manage lang clustering when source is editable

                    if (!Lineage_sources.isSourceEditableForUser(sourceLabel) && item.value && item.value["xml:lang"]) {
                        if (!self.propertiesMap.properties[propName].langValues[item.value["xml:lang"]]) {
                            self.propertiesMap.properties[propName].langValues[item.value["xml:lang"]] = [];
                        }
                        self.propertiesMap.properties[propName].langValues[item.value["xml:lang"]].push({ value: value, predicateId: predicateId });
                    } else {
                        if (!self.propertiesMap.properties[propName].value) {
                            self.propertiesMap.properties[propName].value = [];
                        }
                        if (Lineage_sources.isSourceEditableForUser(sourceLabel) && item.value && item.value["xml:lang"]) {
                            value += "@" + item.value["xml:lang"];
                        }
                        self.propertiesMap.properties[propName].value.push({ value: value, predicateId: predicateId });
                    }
                });

                var defaultProps = [
                    "UUID",
                    "http://www.w3.org/2004/02/skos/core#prefLabel",
                    "http://www.w3.org/2004/02/skos/core#definition",
                    "" + "http://www.w3.org/2004/02/skos/core#altLabel",
                    "http://www.w3.org/2004/02/skos/core#broader",
                    "http://www.w3.org/2004/02/skos/core#narrower",
                    "http://www.w3.org/2004/02/skos/core#related",
                    "http://www.w3.org/2004/02/skos/core#exactMatch",
                    "http://www.w3.org/2004/02/skos/core#closeMatch",
                    //  "http://www.w3.org/2004/02/skos/core#sameAs"
                ];

                var defaultLang = Config.default_lang;
                /* if (!defaultLang)
defaultLang = 'en';*/

                for (var key in self.propertiesMap.properties) {
                    if (defaultProps.indexOf(key) < 0) {
                        defaultProps.push(key);
                    }
                }

                var str = "<div class='NodesInfos_tableDiv' style='max-height:800px;overflow: auto'>" + "<table class='infosTable'>";
                str +=
                    "<tr><td class='NodesInfos_CardId'>UUID</td><td><a target='" +
                    self.getUriTarget(nodeId) +
                    "' href='" +
                    nodeId +
                    "'>" +
                    nodeId +
                    "</a>" +
                    "&nbsp;<button class='w3-button slsv-right-top-bar-button nodesInfos-jquerybuttons ' style='font-size: 10px' onclick=' NodeInfosWidget.copyUri(\"" +
                    nodeId +
                    "\",$(this))'>copy</button>";
                ("</td></tr>");
                str +=
                    "<tr><td class='NodesInfos_CardId'>GRAPH</td><td>" +
                    graphUri +
                    "&nbsp;<button class='w3-button slsv-right-top-bar-button nodesInfos-jquerybuttons ' style='font-size: 10px' onclick=' NodeInfosWidget.copyUri(\"" +
                    graphUri +
                    "\",$(this))'>copy</button>";
                ("</td></tr>");
                str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";

                function getOptionalStr(key, predicateId) {
                    var optionalStr = "";
                    if (Lineage_sources.isSourceEditableForUser(sourceLabel) && !_options.hideModifyButtons) {
                        //  if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[sourceLabel].editable > -1 && !_options.hideModifyButtons) {
                        var propUri = self.propertiesMap.properties[key].propUri;

                        optionalStr +=
                            "&nbsp;<button class='w3-button slsv-right-top-bar-button nodesInfos-jquerybuttons' style='font-size: 10px' onclick=' NodeInfosWidget.showModifyPredicateDialog(\"" +
                            predicateId +
                            "\")'>edit</button>";
                        optionalStr +=
                            "&nbsp;<button class='w3-button slsv-right-top-bar-button nodesInfos-jquerybuttons' style='font-size: 10px'" + " onclick='NodeInfosWidget.deletePredicate(\"" + predicateId + "\")'>X</button>";
                    }
                    return optionalStr;
                }

                defaultProps.forEach(function (key) {
                    if (!self.propertiesMap.properties[key]) {
                        return;
                    }

                    str += "<tr class='infos_table'>";

                    if (self.propertiesMap.properties[key].value) {
                        var values = self.propertiesMap.properties[key].value;
                        str +=
                            "<td class='detailsCellName'>" +
                            "<a target='" +
                            self.getUriTarget(self.propertiesMap.properties[key].propUri) +
                            "' href='" +
                            self.propertiesMap.properties[key].propUri +
                            "'>" +
                            self.propertiesMap.properties[key].name +
                            "</a>" +
                            "</td>";
                        var valuesStr = "";

                        values.forEach(function (valueObj, index) {
                            var value = valueObj.value;

                            var predicateId = valueObj.predicateId;
                            var optionalStr = getOptionalStr(key, predicateId);

                            if (value.indexOf("http") == 0) {
                                if (valueLabelsMap[value]) {
                                    value = "<a target='" + self.getUriTarget(nodeId) + "' href='" + value + "'>" + valueLabelsMap[value] + "</a>";
                                } else {
                                    value = "<a target='" + self.getUriTarget(value) + "' href='" + value + "'>" + value + "</a>";
                                }
                            }
                            if (index > 0) {
                                valuesStr += "<br>";
                            }
                            valuesStr += value + optionalStr;
                        });
                        str += "<td class='detailsCellValue'>" + valuesStr + "</td>";
                        str += "</tr>";
                    } else {
                        // manage lang
                        var keyName = self.propertiesMap.properties[key].name;
                        var selectId = "detailsLangSelect_" + keyName;
                        var propNameSelect = "<select id='" + selectId + "' onchange=NodeInfosWidget.onNodeDetailsLangChange('" + keyName + "') >";
                        var langDivs = "";

                        for (var lang in self.propertiesMap.properties[key].langValues) {
                            values = self.propertiesMap.properties[key].langValues[lang];
                            var selected = "";
                            if (lang == defaultLang) {
                                selected = "selected";
                            }
                            propNameSelect += "<option " + selected + ">" + lang + "</option> ";
                            var valuesStr = "";
                            values.forEach(function (valueObject, index) {
                                var optionalStr = getOptionalStr(key, valueObject.predicateId);
                                var value = valueObject.value;
                                if (value.indexOf("http") == 0) {
                                    if (valueLabelsMap[value]) {
                                        value = "<a target='" + NodeInfosWidget.getUriTarget(nodeId) + "' href='" + value + "'>" + valueLabelsMap[value] + "</a>";
                                    } else {
                                        value += "<a target='" + NodeInfosWidget.getUriTarget(value) + "' href='" + value + "'>" + value + "</a>";
                                    }
                                }
                                var optionalStr = ""; //  complcated to manage lang together with edit and delete
                                // var optionalStr = getOptionalStr(key,valueObject.predicateId);
                                if (index > 0) {
                                    valuesStr += "<br>";
                                }
                                valuesStr += value + optionalStr;
                            });

                            langDivs += "<div class='detailsLangDiv_" + keyName + "' id='detailsLangDiv_" + keyName + "_" + lang + "'>" + valuesStr + "</div>";
                        }

                        propNameSelect += "</select>";

                        str +=
                            "<td class='detailsCellName'>" +
                            "<a target='" +
                            self.getUriTarget(self.propertiesMap.properties[key].propUri) +
                            "' href='" +
                            self.propertiesMap.properties[key].propUri +
                            "'>" +
                            self.propertiesMap.properties[key].name +
                            "</a> " +
                            propNameSelect +
                            "</td>";
                        str += "<td class='detailsCellValue'>" + langDivs + "</td>";

                        if (self.propertiesMap.properties[key].langValues[defaultLang]) {
                            str += "<script>NodeInfosWidget.onNodeDetailsLangChange('" + keyName + "','" + defaultLang + "') </script>";
                        }

                        str += "</tr>";
                    }
                });
                str += "</table></div>";

                str +=
                    " <br><div id='nodeInfos_listsDiv' style='display:flex;flex-direction: row;justify-content: space-evenly';>" +
                    "<div id='nodeInfos_restrictionsDiv'  style='display:flex;flex-direction: column;min-width: 300px;width:45%;background-color: #ddd;padding:5px'></div>" +
                    "<div id='nodeInfos_individualsDiv'  style='display:flex;flex-direction: column;min-width: 300px;width:45%;background-color: #ddd;padding:5px'></div>" +
                    "</div>";

                $("#" + divId).html(str);
                if (callback) {
                    return callback(null, { types: types, blankNodes: blankNodes });
                }
            }
        );
    };

    self.showClassRestrictions = function (sourceLabel, nodeId, _options, callback) {
        // blankNodes.
        var str = "";
        async.series(
            [
                //direct restrictions
                function (callbackSeries) {
                    Sparql_OWL.getObjectRestrictions(sourceLabel, nodeId, { withoutBlankNodes: 1 }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        str += "<b style='font-size:15px;'>Restrictions </b> <div style=''> <table>";
                        result.forEach(function (item) {
                            str += "<tr class='infos_table'>";

                            var propStr = "<span class='' onclick=' NodeInfosWidget.onClickLink(\"" + item.prop.value + "\")'>" + item.propLabel.value + "</span>";

                            str += "<td class=''>" + propStr + "</td>";

                            var targetClassStr = "any";
                            if (item.value) {
                                targetClassStr = "<span class='' onclick=' NodeInfosWidget.onClickLink(\"" + item.value.value + "\")'>" + item.valueLabel.value + "</span>";
                            }
                            str += "<td class=''>" + targetClassStr + "</td>";

                            str += "</tr>";
                        });

                        str += "</table> </div>" + "</div>";

                        callbackSeries();
                    });
                },
                //inverse restrictions
                function (callbackSeries) {
                    Sparql_OWL.getObjectRestrictions(
                        sourceLabel,
                        nodeId,
                        {
                            withoutBlankNodes: 1,
                            inverseRestriction: 1,
                        },
                        function (err, result) {
                            if (err) {
                                return callbackSeries(err);
                            }
                            str += "<br><b style='font-size:15px;'>Inverse Restrictions </b> <div style='font-size:15px;'> <table>";
                            result.forEach(function (item) {
                                str += "<tr class='infos_table'>";

                                var propStr = "<span class='' onclick=' NodeInfosWidget.onClickLink(\"" + item.prop.value + "\")'>" + item.propLabel.value + "</span>";

                                str += "<td class=''>" + propStr + "</td>";

                                var targetClassStr = "any";
                                if (item.value) {
                                    targetClassStr = "<span class='' onclick=' NodeInfosWidget.onClickLink(\"" + item.subject.value + "\")'>" + item.subjectLabel.value + "</span>";
                                }
                                str += "<td class=''>" + targetClassStr + "</td>";

                                str += "</tr>";
                            });

                            str += "</table> </div>" + "</div>";

                            callbackSeries();
                        }
                    );
                },
            ],
            function (err) {
                if (!err) {
                    $("#nodeInfos_restrictionsDiv").html(str);
                }
                return callback(err);
            }
        );
    };

    self.showClassIndividuals = function (sourceLabel, nodeId, callback) {
        if (!sourceLabel) {
            sourceLabel = self.currentNodeRealSource;
        }
        if (!nodeId) {
            nodeId = self.currentNodeId;
        }

        var sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var query = " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> " + "select distinct * " + fromStr + " where {";

        query += "?value ?type <" + nodeId + ">" + " FILTER (?type in (<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>,<http://rds.posccaesar.org/ontology/lis14/rdl/partOf>))";
        query += "  Optional {?value rdfs:label ?valueLabel}  ";
        query += "} order by ?valueLabel limit 1000 ";
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: sourceLabel }, function (err, result) {
            if (err) {
                return callback(err);
            }

            var data = result.results.bindings;

            if (data.length == 0) {
                return callback();
            } else {
                var str = "<b>TypeOf </b><br><table>";

                data.forEach(function (item) {
                    var label = item.valueLabel ? item.valueLabel.value : Sparql_common.getLabelFromURI(item.value.value);
                    var targetClassStr = "<span class='detailsCellValue' onclick=' NodeInfosWidget.onClickLink(\"" + item.value.value + "\")'>" + label + "</span>";
                    str += "<tr><td>" + targetClassStr + "</td></tr>";
                });
                str += "</table>";
                $("#nodeInfos_individualsDiv").html(str);
            }
            if (callback) callback();
        });
    };

    self.showPropertyRestrictions = function (sourceLabel, nodeId, divId, _callback) {
        Sparql_OWL.getPropertiesRestrictionsDescription(sourceLabel, nodeId, {}, function (err, result) {
            if (err) {
                alert(err.responseText);
                return MainController.UI.message(err.responseText, true);
            }

            var str = "<b>Property restrictions</b><table>";
            result.forEach(function (item) {
                var sourceLabel = item.sourceClassLabel ? item.sourceClassLabel.value : Sparql_common.getLabelFromURI(item.sourceClass.value);
                var targetLabel = item.targetClassLabel ? item.targetClassLabel.value : Sparql_common.getLabelFromURI(item.targetClass.value);

                str += "<tr class='infos_table'>";

                str += "<td class='detailsCellValue' onclick=' NodeInfosWidget.onClickLink(\"" + item.sourceClass.value + "\")'>" + sourceLabel + "</td>";

                str += "<td class='detailsCellValue' onclick=' NodeInfosWidget.onClickLink(\"" + item.restriction.value + "\")'>" + item.restriction.value + "</td>";

                str += "<td class='detailsCellValue' onclick=' NodeInfosWidget.onClickLink(\"" + item.targetClass.value + "\")'>" + targetLabel + "</td>";

                str += "</tr>";
            });
            $("#" + divId).append(str);

            return _callback();
        });
    };

    self.onClickLink = function (nodeId) {
        /*  var filter=Sparql_common.setFilter("subject",[nodeId])
Sparql_generic.getItems(self.currentNodeIdInfosSource,{filter:filter,function(err, result){

}})*/
        var node = {
            data: {
                id: nodeId,
                source: self.currentNodeIdInfosSource,
            },
        };

        self.showNodeInfos(self.currentNodeIdInfosSource, node, self.currentNodeIdInfosDivId, { previousNode: true });
    };

    self.showVisitedNode = function (direction) {
        if (direction > 0 && self.visitedNodes.currentIndex < self.visitedNodes.length - 1) {
            self.visitedNodes.currentIndex += 1;
            self.showNodeInfos(self.currentNodeIdInfosSource, self.visitedNodes[self.visitedNodes.currentIndex], self.currentNodeIdInfosDivId);
        } else if (direction < 0 && self.visitedNodes.currentIndex > 0) {
            self.visitedNodes.currentIndex -= 1;
            self.showNodeInfos(self.currentNodeIdInfosSource, self.visitedNodes[self.visitedNodes.currentIndex], self.currentNodeIdInfosDivId);
        }
    };
    self.addPredicate = function (property, value, source, createNewNode, callback) {
        if (!property) {
            property = PredicatesSelectorWidget.getSelectedProperty();
        }
        if (!value) {
            // value = $("#editPredicate_objectValue").val().trim();
            value = PredicatesSelectorWidget.getSelectedObjectValue();
        }

        if (!property || !value) {
            return alert("enter property and value");
        }

        $("#sourceBrowser_addPropertyDiv").css("display", "none");
        if (source) {
            self.currentSource = source;
        }
        if (createNewNode || true) {
            var triples = [];
            if (createNewNode) {
                self.currentNodeId = Config.sources[self.currentSource].graphUri + common.getRandomHexaId(10);

                triples.push({
                    subject: self.currentNodeId,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "http://www.w3.org/2002/07/owl#Class",
                });
            }

            triples.push({
                subject: self.currentNodeId,
                predicate: property,
                object: value,
            });

            Sparql_generic.insertTriples(self.currentSource, triples, {}, function (err, _result) {
                if (err) {
                    return alert(err);
                }
                // store Annotator infos in source/userGraph
                if (authentication.currentUser.groupes.indexOf("Annotator") > -1) {
                    var userGraphUri = Config.sources[self.currentSource].graphUri + authentication.currentUser.login;
                    Sparql_generic.insertTriples(null, triples, { graphUri: userGraphUri }, function (err, _result) {});
                }

                self.isModified = true;
                if (!self.newProperties) {
                    self.newProperties = {};
                }
                self.newProperties[property] = value;

                // self.showNodeInfos((self.currentSource, self.currentNode, null, {  }, function (err, result) {
                self.drawCommonInfos(self.currentSource, self.currentNode.data.id, "nodeInfosWidget_InfosTabDiv", {}, function (err, result) {
                    //  self.showNodeInfosToolbar();
                    if (property == "http://www.w3.org/2000/01/rdf-schema#subClassOf") {
                        Lineage_whiteboard.lineageVisjsGraph.data.nodes.push({
                            id: self.currentNodeId,
                            label: value,
                            shape: Lineage_whiteboard.defaultShape,
                            size: Lineage_whiteboard.defaultShapeSize,
                            color: Lineage_whiteboard.getSourceColor(self.currentSource),
                            data: {
                                id: self.currentNodeId,
                                label: value,
                                source: self.currentSource,
                            },
                        });
                    }
                    if (callback) {
                        return callback(null, self.currentNodeId);
                    }
                });
                if (property.indexOf("subClassOf") > -1 || property.indexOf("type") > -1) {
                    Lineage_whiteboard.addEdge(self.currentSource, self.currentNodeId, value, property);
                }
            });
        }
    };

    self.deletePredicate = function (predicateId) {
        var currentEditingItem = PredicatesSelectorWidget.predicatesIdsMap[predicateId];
        var property = currentEditingItem.item.prop.value;
        if (confirm("delete predicate")) {
            var result = "";

            async.series(
                [
                    function (callbackSeries) {
                        var object = currentEditingItem.item.value.value;
                        if (currentEditingItem.item.value.type == "literal") {
                            object = { isString: true, value: currentEditingItem.item.value.value, lang: currentEditingItem.item.value["xml:lang"] };
                            /*   if(currentEditingItem.item.value["xml:lang"])
object+="@"+currentEditingItem.item.value["xml:lang"]*/
                        }
                        Sparql_generic.deleteTriples(self.currentSource, self.currentNodeId, currentEditingItem.item.prop.value, object, function (err, _result) {
                            if (err) {
                                return alert(err);
                            }
                            result = _result;
                            return callbackSeries();
                        });
                    },

                    // when date cannot set the correct value in the triple filter
                    function (callbackSeries) {
                        if (result[0]["callret-0"].value.indexOf(" 0 triples -- nothing to do") > -1) {
                            if (confirm("delete all predicates having  this subject with property " + property + "?")) {
                                Sparql_generic.deleteTriples(self.currentSource, self.currentNodeId, property, null, function (err, _result) {
                                    return callbackSeries(err);
                                });
                            } else {
                                return callbackSeries("Property not deleted");
                            }
                        } else {
                            return callbackSeries();
                        }
                    },
                ],
                function (err) {
                    if (err) {
                        return alert(err);
                    }

                    self.showNodeInfos(self.currentSource, self.currentNode, "mainDialogDiv");

                    var property = currentEditingItem.item.prop.value;
                    var value = currentEditingItem.item.value.value;
                    if (property.indexOf("subClassOf") > -1 || property.indexOf("type") > -1) {
                        Lineage_whiteboard.deleteEdge(self.currentNodeId, value, property);
                    }
                }
            );
        }
    };

    self.deleteNode = function () {
        if (confirm("delete node " + self.currentNodeId)) {
            async.series(
                [
                    // Update cache when it's a property
                    function (callbackSeries) {
                        if (Config.ontologiesVocabularyModels[self.currentNode.data.source]["properties"][self.currentNodeId]) {
                            var data = {};
                            data["constraints"] = [self.currentNodeId];
                            data["properties"] = [self.currentNodeId];
                            OntologyModels.updateModel(self.currentNode.data.source, data, { remove: true }, function (err, result2) {
                                callbackSeries(err);
                            });
                        } else {
                            callbackSeries();
                        }
                    },
                    //delete triples where id is subject
                    function (callbackSeries) {
                        Sparql_generic.deleteTriples(self.currentSource, self.currentNodeId, null, null, function (err, _result) {
                            return callbackSeries(err);
                        });
                    },
                    //delete triples where id is object
                    function (callbackSeries) {
                        Sparql_generic.deleteTriples(self.currentSource, null, null, self.currentNodeId, function (err, _result) {
                            return callbackSeries(err);
                        });
                    },
                    //delete index entry
                    function (callbackSeries) {
                        ElasticSearchProxy.deleteDocuments(self.currentNode.data.source, [self.currentNodeId], {}, function (err, result) {
                            return callbackSeries(err);
                        });
                    },

                    //update trees
                    function (callbackSeries) {
                        if (self.currentNode.from || self.currentNode.data.type == "http://www.w3.org/2002/07/owl#ObjectProperty") {
                            var jstreeNode = JstreeWidget.getNodeByDataField("Lineage_propertiesTree", "id", self.currentNodeId);
                            if (jstreeNode) {
                                $("#Lineage_propertiesTree").jstree().delete_node(jstreeNode);
                            }
                        } else {
                            var jstreeNode = JstreeWidget.getNodeByDataField("LineageNodesJsTreeDiv", "id", self.currentNodeId);
                            if (jstreeNode) {
                                $("#LineageNodesJsTreeDiv").jstree().delete_node(jstreeNode);
                            }
                        }
                        return callbackSeries();
                    },
                    //update graph
                    function (callbackSeries) {
                        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                            Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(self.currentNodeId);
                        }
                        return callbackSeries();
                    },
                    //synchronize OntologyModels
                    function (callbackSeries) {
                        //  OntologyModels.
                        return callbackSeries(); // TO DO
                    },
                ],
                function (err) {
                    if (err) {
                        return alert(err);
                    }
                    $("#" + self.divId).dialog("close");
                    MainController.UI.message("node deleted");
                }
            );
        }
    };

    self.indexObjectIfNew = function () {
        if (self.newProperties && (self.newProperties["http://www.w3.org/2000/01/rdf-schema#label"] || self.newProperties["rdfs:label"])) {
            if (self.currentNode && self.currentNode.from) {
                var data = [];
                for (var id in self.newProperties) {
                    data.push({ id: id, label: self.newProperties[id], type: "property", owltype: "ObjectProperty" });
                }

                SearchUtil.addPropertiesToIndex(self.currentSource, data, function (err, _result) {
                    if (err) {
                        return alert(err);
                    }
                });
            }

            SearchUtil.addObjectsToIndex(self.currentSource, self.currentNodeId, function (err, _result) {
                if (err) {
                    return alert(err);
                }
            });
        }
    };

    self.isSLSVvisibleUri = function (uri) {
        if (!uri || !uri.indexOf) {
            return false;
        }
        for (var source in Config.sources) {
            var graphUri = Config.sources[source].graphUri;
            if (graphUri && uri.indexOf(graphUri) == 0) {
                return true;
            }
        }
        return false;
    };
    self.getUriTarget = function (nodeId) {
        var target = "_blank";
        if (self.isSLSVvisibleUri(nodeId)) {
            target = "_slsvCallback";
        }
        return target;
    };

    self.updatePredicateValue = function () {
        if (!self.currentEditingItem) {
            return;
        }

        //  var newValue = $("#editPredicate_objectValue").val();

        var newValue = PredicatesSelectorWidget.getSelectedObjectValue();

        var oldValue = self.currentEditingItem.item.value.value;
        if (self.currentEditingItem.item.value.type == "literal") {
            oldValue = { isString: true, value: oldValue };
        }
        Sparql_generic.deleteTriples(self.currentSource, self.currentNodeId, self.currentEditingItem.item.prop.value, oldValue, function (err, _result) {
            if (err) {
                return alert(err);
            }
            self.addPredicate(self.currentEditingItem.item.prop.value, newValue, self.currentSource, false, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                if (self.currentEditingItem.item.prop.value.indexOf("label") > -1) {
                    if (self.currentNodeId.from) {
                        var jstreeNode = JstreeWidget.getNodeByDataField("#Lineage_propertiesTree", "id", self.currentNode.data.id);
                        if (jstreeNode) {
                            $("#Lineage_propertiesTree").jstree().rename_node(jstreeNode, newValue);
                        }
                        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                            Lineage_whiteboard.lineageVisjsGraph.data.edges.update({ id: self.currentNodeId, label: newValue });
                        }
                    } else {
                        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update({ id: self.currentNodeId, label: newValue });
                        }
                        var jstreeNode = JstreeWidget.getNodeByDataField("LineageNodesJsTreeDiv", "id", self.currentNode.data.id);
                        if (jstreeNode) {
                            $("#LineageNodesJsTreeDiv").jstree().rename_node(jstreeNode, newValue);
                        }
                    }
                }
            });
        });
    };
    self.showModifyPredicateDialog = function (predicateId) {
        PredicatesSelectorWidget.currentEditingItem = PredicatesSelectorWidget.predicatesIdsMap[predicateId];
        if (!PredicatesSelectorWidget.currentEditingItem) {
            return alert("error");
        }
        PredicatesSelectorWidget.init(Lineage_sources.activeSource, function () {
            $("#editPredicate_savePredicateButton").click(function () {
                self.addPredicate(null, null, null, null, function () {
                    self.deletePredicate(predicateId);
                });
            });
        });

        $("#editPredicate_propertyValue").val(PredicatesSelectorWidget.currentEditingItem.item.prop.value);
        $("#editPredicate_objectValue").val(PredicatesSelectorWidget.currentEditingItem.item.value.value);
        var h = Math.max((PredicatesSelectorWidget.currentEditingItem.item.value.value.length / 80) * 30, 50);
        $("#editPredicate_objectValue").css("height", h + "px");

        $("#editPredicate_objectValue").focus();
    };

    self.hideAddPredicateDiv = function () {
        $("#sourceBrowser_addPropertyDiv").css("display", "none");
    };

    self.copyUri = function (text, caller) {
        common.copyTextToClipboard(text, function () {
            caller.css("border-width", "3px");
        });
    };

    self.onNodeDetailsLangChange = function (property, lang) {
        try {
            $(".detailsLangDiv_" + property).css("display", "none");
            if (!lang) {
                lang = $("#detailsLangSelect_" + property).val();
            }
            if ($("#detailsLangDiv_" + property + "_" + lang).html()) {
                $("#detailsLangDiv_" + property + "_" + lang).css("display", "block");
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(err);
        }
    };

    self.showCreateEntityDialog = function () {
        var divId = "smallDialogDiv";
        var sourceLabel = Lineage_sources.activeSource;
        $("#" + divId).dialog("option", "title", " Node infos : source " + sourceLabel);
        $("#" + divId).dialog("open");
        self.getCreateEntityDialog(sourceLabel, divId);
    };

    self.getCreateEntityDialog = function (source, divId) {
        self.currentSource = source;
        $("#" + divId).dialog("open");
        var html =
            "rdfs:label <input style='width:200px' id='nodeInfosWidget_newEntityLabel'/>" +
            "<br></br>" +
            "rdf:type <select id='nodeInfosWidget_entityTypeSelect'></select>" +
            "<button onclick='NodeInfosWidget.createSingleEntity(\"" +
            divId +
            '","' +
            source +
            '",' +
            '$("#nodeInfosWidget_newEntityLabel").val(),$("#nodeInfosWidget_entityTypeSelect").val())\'>OK</button>';

        $("#" + divId).html(html);
        var declarations = Lineage_axioms_create.owl2Vocabulary.Declarations;
        common.fillSelectOptions("nodeInfosWidget_entityTypeSelect", declarations, true);
    };

    self.createSingleEntity = function (divId, source, label, type) {
        if (!type) {
            return alert(" rdf:type missing");
        }
        var id = label;
        if (!id) {
            id = common.getRandomHexaId(5);
        }
        var proposedUri = Config.sources[source].graphUri + id;
        proposedUri = prompt("Confirm or modify node uri and create entity", proposedUri);
        if (!proposedUri) {
            return;
        }
        var triples = [];
        triples.push({
            subject: proposedUri,
            predicate: "rdf:type",
            object: type,
        });
        if (label) {
            triples.push({
                subject: proposedUri,
                predicate: "rdfs:label",
                object: label,
            });
        }

        Sparql_generic.insertTriples(source, triples, {}, function (err, result) {
            if (err) {
                alert(err.responseText);
            }

            var node = {
                id: proposedUri,
                label: label,
                data: {
                    id: proposedUri,
                    label: label,
                    type: type,
                    source: source,
                },
            };
            NodeInfosWidget.showNodeInfos(source, node, "mainDialogDiv");
            setTimeout(function () {
                $("#nodeInfosWidget_tabsDiv").tabs("option", "active", 2), 500;
            });
            SearchUtil.generateElasticIndex(source, { ids: [proposedUri] }, function (err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                MainController.UI.message("node Created and Indexed");
            });
        });
    };

    return self;
})();

export default NodeInfosWidgetResponsive;
window.NodeInfosWidgetResponsive = NodeInfosWidgetResponsive;
