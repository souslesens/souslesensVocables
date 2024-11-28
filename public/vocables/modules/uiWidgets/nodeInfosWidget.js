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

import Lineage_sources from "../../modules/tools/lineage/lineage_sources.js";
import authentication from "../../modules/shared/authentification.js";
import UI from "../../modules/shared/UI.js";
import NodeInfosAxioms from "../tools/axioms/nodeInfosAxioms.js";
import Axioms_manager from "../tools/axioms/axioms_manager.js";
import CreateRestriction_bot from "../bots/createRestriction_bot.js";
import OntologyModels from "../shared/ontologyModels.js";

var NodeInfosWidget = (function () {
    var self = {};

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

        if (typeof node == "object") {
            self.currentNode = node;
            if (node.data) {
                if (node.data.type && node.data.type.indexOf("literal") > -1) {
                    return;
                }

                if (node.data.propertyId && !node.data.id) {
                    //when  a property in a restriction
                    //  node.data.id = node.data.propertyId;

                    return self.showRestrictionInfos(node, null, true);
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
            //  self.initDialog(sourceLabel, divId, options, function () {
            if (true || !options.showAxioms) {
                self.drawAllInfos(sourceLabel, nodeId, options, function (err, result) {
                    if (callback) {
                        callback(err);
                    }
                    if (err) {
                        UI.message(err, true);
                    }
                    self.showNodeInfosToolbar(options);

                    $("#deleteButton").insertAfter($("#mainDialogDiv").parent().find(".ui-dialog-title"));
                    //  $("#addRestrictionButton").insertAfter($("#mainDialogDiv").parent().find(".ui-dialog-title"));
                    $("#addPredicateButton").insertAfter($("#mainDialogDiv").parent().find(".ui-dialog-title"));
                    $("#addPredicateButton").css("margin-left", "25px !important");
                    //  $("#addRestrictionButton").css("margin-left", "25px !important");
                });
            }
        });
    };

    self.initDialog = function (sourceLabel, divId, options, callback) {
        self.divId = divId;
        self.currentSource = sourceLabel;
        if (!options.noDialog) {
            $("#" + divId).dialog("option", "title", " Node infos :"); // source " + sourceLabel);
        }
        $("#" + divId).load("modules/uiWidgets/html/nodeInfosWidget.html", function () {
            $("#addPredicateButton").remove();
            // $("#addRestrictionButton").remove();
            $("#deleteButton").remove();
            $("#" + divId).dialog("close");
            $("#" + divId).dialog({
                open: function (event, ui) {
                    $("#nodeInfosWidget_tabsDiv").tabs({
                        //  active: options.showAxioms ? 1 : 0,

                        load: function (event, ui) {},
                        activate: function (event, ui) {
                            $(".nodeInfosWidget_tabDiv").removeClass("nodesInfos-selectedTab");

                            setTimeout(function () {
                                /*if (NodeInfosAxioms.nodeInfosAxiomsLoaded) {
                                    //reset nodeInfos

                                    self.showNodeInfos(Lineage_sources.activeSource, NodeInfosAxioms.nodeBeforeNodeInfos, "mainDialogDiv", null, null);
                                }*/

                                $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
                                if (ui.newPanel.selector == "#nodeInfosWidget_AxiomsTabDiv") {
                                    var source = self.currentSource;
                                    // source = Lineage_sources.mainSource;
                                    NodeInfosAxioms.init(source, self.currentNode, "nodeInfosWidget_AxiomsTabDiv");
                                }
                                0;
                            }, 100);
                        },
                    });
                },
                close: function (event, ui) {
                    $("#addPredicateButton").remove();
                    //  $("#addRestrictionButton").remove();
                    $("#deleteButton").remove();
                },
            });
            $("#" + divId).dialog("open");
            $(".nodeInfosWidget_tabDiv").css("margin", "0px");
            $("[aria-selected='true']").addClass("nodesInfos-selectedTab");
            callback();
        });
    };

    self.drawAllInfos = function (sourceLabel, nodeId, options, callback) {
        var types;
        async.series(
            [
                function (callbackSeries) {
                    if (self.currentNode) {
                        return callbackSeries();
                    }
                    Sparql_generic.getNodeParents(sourceLabel, null, nodeId, 0, null, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var item = result[0];
                        self.currentNode = {
                            id: item.subject.value,
                            label: item.subjectLabel.value,
                            data: {
                                id: item.subject.value,
                                label: item.subjectLabel.value,
                                source: sourceLabel,
                                type: "",
                            },
                        };

                        return callbackSeries();
                    });
                },
                function (callbackSeries) {
                    self.drawCommonInfos(sourceLabel, nodeId, "nodeInfosWidget_InfosTabDiv", options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        types = result.types;
                        callbackSeries();
                    });
                },

                function (callbackSeries) {
                    if (types.indexOf("http://www.w3.org/2002/07/owl#Class") < 0) {
                        //$("#nodeInfos_individualsDiv").hide();
                        return callbackSeries();
                    }
                    $("#nodeInfos_individualsDiv").show();
                    var html = "<button  class='w3-button slsv-right-top-bar-button nodeInfos-button' onclick='NodeInfosWidget.showClassIndividuals()'>Individuals</button>";
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
                        //$("#nodeInfos_restrictionsDiv").hide();
                        return callbackSeries();
                    }

                    self.showPropertyRestrictions(self.currentNodeRealSource, nodeId, "nodeInfos_restrictionsDiv", function (_err, _result) {
                        callbackSeries(_err);
                    });
                },
                function (callbackSeries) {
                    if (types.indexOf("http://www.w3.org/2002/07/owl#Class") < 0) {
                        $("#nodeInfos_associatedPropertiesDiv").hide();
                        return callbackSeries();
                    }
                    self.showAssociatedProperties(self.currentNodeRealSource, nodeId, "nodeInfos_associatedPropertiesDiv", function (err) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    if (types.indexOf("http://www.w3.org/2002/07/owl#Class") < 0) {
                        return callbackSeries();
                    }
                    self.showClassesBreakDown(self.currentNodeRealSource, nodeId, "nodeInfos_classHierarchyDiv", function (err) {
                        callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    if (types.indexOf("http://www.w3.org/2002/07/owl#ObjectProperty") < 0) {
                        return callbackSeries();
                    }
                    self.showPropBreakdown(self.currentNodeRealSource, nodeId, "nodeInfos_classHierarchyDiv", function (err) {
                        callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (callback) {
                    callback(err);
                }
                if (err) {
                    return UI.message(err.responseText || err, true);
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
                "<button id='addPredicateButton' class='w3-button slsv-right-top-bar-button nodeInfos-button' " +
                "onclick='PredicatesSelectorWidget.init(Lineage_sources.activeSource, NodeInfosWidget.configureEditPredicateWidget)'>  Add Predicate </button>";
            /* str +=
                 "<button id='addRestriction' class='w3-button slsv-right-top-bar-button nodeInfos-button' " +
                 "onclick='NodeInfosWidget.showAddRestrictionWidget()'>  Add restriction </button>";*/

            str += "<button id='deleteButton' class='w3-button slsv-right-top-bar-button nodeInfos-button' onclick='NodeInfosWidget.deleteNode()'> Delete </button>";
            str += "<div id='sourceBrowser_addPropertyDiv' style=''>";
        }

        if (authentication.currentUser.groupes.indexOf("Annotator") > -1) {
            str +=
                "<button id='addPredicateButton' class='w3-button slsv-right-top-bar-button nodeInfos-button' " +
                "onclick='PredicatesSelectorWidget.init(Lineage_sources.activeSource, NodeInfosWidget.configureEditPredicateWidget)'>  Add Predicate </button>";
            str += "<div id='sourceBrowser_addPropertyDiv' style=''>";
        }

        str += "</div>";

        $("#" + self.currentNodeIdInfosDivId).prepend(str);

        if (Lineage_sources.isSourceEditableForUser(self.currentSource) && !options.hideModifyButtons) {
            PredicatesSelectorWidget.load("sourceBrowser_addPropertyDiv", self.currentSource, {}, function () {
                //$("#editPredicate_controlsDiv").css("display", "block");
                $("#sourceBrowser_addPropertyDiv").css("display", "none");
            });
        }
    };

    self.configureEditPredicateWidget = function () {
        self.showHidePropertiesDiv("show");
        $("#editPredicate_savePredicateButton").off("click");
        $("#editPredicate_savePredicateButton").click(function () {
            PredicatesSelectorWidget.storeRecentPredicates();
            self.addPredicate(null, null, null, null, function () {
                PredicatesSelectorWidget.fillSelectRecentEditPredicate();
            });
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
                noRestrictions: true,
            },
            function (err, data) {
                if (err) {
                    UI.message(err.responseText);
                    if (callback) {
                        return callback(err);
                    }
                }
                if (data.length == 0) {
                    if (callback) {
                        return callback("no data found");
                    }
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
                    if (item.prop.value.indexOf("label") > -1) {
                        $("#ui-id-1").append(" " + item.value.value);
                    }
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
                    if (item.value.value.startsWith("_:")) {
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
                        self.propertiesMap.properties[propName].langValues[item.value["xml:lang"]].push({
                            value: value,
                            predicateId: predicateId,
                        });
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

                var str = "<div class='NodesInfos_tableDiv'>" + "<table class='infosTable'>";
                str +=
                    "<tr><td class='NodesInfos_CardId'>UUID</td><td><a target='" +
                    self.getUriTarget(nodeId) +
                    "' href='" +
                    nodeId +
                    "'>" +
                    nodeId +
                    "</a>" +
                    "&nbsp;<button class='w3-button nodesInfos-iconsButtons ' style='font-size: 10px;margin-left:7px;' onclick=' NodeInfosWidget.copyUri(\"" +
                    nodeId +
                    "\",$(this))'><input type='image' src='./icons/CommonIcons/CopyIcon.png' ></button>";
                ("</td></tr>");
                str +=
                    "<tr><td class='NodesInfos_CardId'>GRAPH</td><td>" +
                    graphUri +
                    "&nbsp;<button class='w3-button nodesInfos-iconsButtons ' style='font-size: 10px;' onclick=' NodeInfosWidget.copyUri(\"" +
                    graphUri +
                    "\",$(this))'><input type='image' src='./icons/CommonIcons/CopyIcon.png' ></button>";
                ("</td></tr>");
                str += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";

                function getOptionalStr(key, predicateId) {
                    var optionalStr = "";
                    if (Lineage_sources.isSourceEditableForUser(sourceLabel) && !_options.hideModifyButtons) {
                        //  if (authentication.currentUser.groupes.indexOf("admin") > -1 && Config.sources[sourceLabel].editable > -1 && !_options.hideModifyButtons) {
                        var propUri = self.propertiesMap.properties[key].propUri;

                        optionalStr +=
                            "&nbsp;<button class='w3-button nodesInfos-iconsButtons' style='font-size: 10px;margin-left:7px;' onclick=' NodeInfosWidget.showModifyPredicateDialog(\"" +
                            predicateId +
                            "\")'><input type='image' src='./icons/CommonIcons/EditIcon.png' ></button>";
                        optionalStr +=
                            "&nbsp;<button class='w3-button nodesInfos-iconsButtons' style='font-size: 10px;'" +
                            " onclick='NodeInfosWidget.deletePredicate(\"" +
                            predicateId +
                            "\")'><input type='image' src='./icons/CommonIcons/Erase.png' ></button>";
                    }
                    return optionalStr;
                }

                var metaDataStr = str;
                var metaDataProps = Object.values(Config.dictionaryMetaDataPropertiesMap);
                defaultProps.forEach(function (key) {
                    var strGeneratedByProp = "";
                    if (!self.propertiesMap.properties[key]) {
                        return;
                    }

                    strGeneratedByProp += "<tr class='infos_table'>";

                    if (self.propertiesMap.properties[key].value) {
                        var values = self.propertiesMap.properties[key].value;
                        strGeneratedByProp +=
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
                        strGeneratedByProp += "<td class='detailsCellValue'><div class='detailsCellValueContent'>" + valuesStr + "</div></td>";
                        strGeneratedByProp += "</tr>";
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

                        strGeneratedByProp +=
                            "<td class='detailsCellName'>" +
                            "<a target ='" +
                            self.getUriTarget(self.propertiesMap.properties[key].propUri) +
                            "' href='" +
                            self.propertiesMap.properties[key].propUri +
                            "'>" +
                            self.propertiesMap.properties[key].name +
                            "</a> " +
                            propNameSelect +
                            "</td>";
                        strGeneratedByProp += "<td class='detailsCellValue'>" + langDivs + "</td>";

                        if (self.propertiesMap.properties[key].langValues[defaultLang]) {
                            strGeneratedByProp += "<script>NodeInfosWidget.onNodeDetailsLangChange('" + keyName + "','" + defaultLang + "') </script>";
                        }

                        strGeneratedByProp += "</tr>";
                    }
                    if (metaDataProps.includes(self.propertiesMap.properties[key].propUri)) {
                        metaDataStr += strGeneratedByProp;
                    } else {
                        str += strGeneratedByProp;
                    }
                });
                str += "</table></div>";
                metaDataStr += "</table></div>";
                str +=
                    " <div id='nodeInfos_listsDiv' >" +
                    "<div id='nodeInfos_classHierarchyDiv' class='nodeInfos_rigthDiv' ></div><br>" +
                    "<div id='nodeInfos_restrictionsDiv' class='nodeInfos_rigthDiv'  style='display:table-caption;'></div>" +
                    //  " <div id='nodeInfos_associatedPropertiesDiv' className='nodeInfos_rigthDiv'></div>" +
                    "<div id='nodeInfos_individualsDiv' class='nodeInfos_rigthDiv' style=' display:flex;flex-direction: ></div></div>";

                $("#" + divId).html(str);
                $("#nodeInfosWidget_metaDataTabDiv").html(metaDataStr);
                if (callback) {
                    return callback(null, { types: types, blankNodes: blankNodes });
                }
            }
        );
    };

    self.showClassRestrictions = function (sourceLabel, nodeId, _options, callback) {
        return self.showRestrictionInfos(self.currentNode, "nodeInfos_restrictionsDiv", false, function (err, result) {
            if (err) {
                return callback(err);
            }
            return callback();
        });
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
                $("#nodeInfos_individualsDiv").text("No result");
                if (callback) {
                    callback();
                }
                return;
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
            if (callback) {
                callback();
            }
        });
    };

    self.showPropertyRestrictions = function (sourceLabel, nodeId, divId, _callback) {
        Sparql_OWL.getPropertiesRestrictionsDescription(sourceLabel, nodeId, {}, function (err, result) {
            if (err) {
                //  alert(err.responseText);
                return UI.message(err.responseText || err, true);
            }

            var str = "<b>Property restrictions</b><table>";
            result.forEach(function (item) {
                str += "<tr class='infos_table'>";
                if (item.sourceClass) {
                    var sourceLabel = item.sourceClassLabel ? item.sourceClassLabel.value : Sparql_common.getLabelFromURI(item.sourceClass.value);
                    str += "<td class='detailsCellValue' onclick=' NodeInfosWidget.onClickLink(\"" + item.sourceClass.value + "\")'>" + sourceLabel + "</td>";
                }
                str += "<td class='detailsCellValue' onclick=' NodeInfosWidget.onClickLink(\"" + item.restriction.value + "\")'>" + item.restriction.value + "</td>";
                if (item.targetClass) {
                    var targetLabel = item.targetClassLabel ? item.targetClassLabel.value : Sparql_common.getLabelFromURI(item.targetClass.value);
                    str += "<td class='detailsCellValue' onclick=' NodeInfosWidget.onClickLink(\"" + item.targetClass.value + "\")'>" + targetLabel + "</td>";
                }

                str += "</tr>";
            });
            if (result.length > 0) {
                $("#" + divId).show();
                $("#" + divId).append(str);
            } else {
                $("#" + divId).hide();
            }

            return _callback();
        });
    };

    self.showAssociatedProperties = function (sourceLabel, nodeId, divId, callback) {
        var sources = [sourceLabel];
        var imports = Config.sources[sourceLabel].imports;
        sources = sources.concat(imports);
        var ancestors = OntologyModels.getClassHierarchyTreeData(sourceLabel, nodeId, "ancestors");
        var ancestorsIds = ancestors.map(function (x) {
            return x.id;
        });
        var domainOfProperties = [];
        var rangeOfProperties = [];
        sources.forEach(function (source) {
            var ontologySourceModel = Config.ontologiesVocabularyModels[source];

            if (ontologySourceModel) {
                for (var prop in ontologySourceModel.constraints) {
                    var constraint = ontologySourceModel.constraints[prop];
                    if (ancestorsIds.includes(constraint.domain)) {
                        domainOfProperties.push({
                            id: prop,
                            label: constraint.label,
                            rangeId: constraint.range,
                            rangeLabel: constraint.rangeLabel,
                            domainId: constraint.domain,
                            domainLabel: constraint.domainLabel,
                        });
                    }
                    if (ancestorsIds.includes(constraint.range)) {
                        rangeOfProperties.push({
                            id: prop,
                            label: constraint.label,
                            rangeId:constraint.range,
                            rangeLabel:constraint.rangeLabel,
                            domainId: constraint.domain,
                            domainLabel: constraint.domainLabel,
                        });
                    }
                }
            }
        });

        var html = "<div style='display:flex;flex-direction:row'>";
        html += "<div><b><div class='nodesInfos_titles'>Ranges Authorized </div></b>";
        html += `<table> <tbody> 
                <tr>
                    <td class="detailsCellName"><span class="title">ancestorConcerned</span></td>
                    <td class="detailsCellName"> <span class="title">onProperty </span></td>
                    <td class="detailsCellName"><span class="title">Range on</span></td>
                 </tr>`;
        
        if (domainOfProperties.length > 0) {
            domainOfProperties.forEach(function (property) {
                html+='<tr> '
                
                html += "<td class='detailsCellValue'><a style='color: #aaa' target='" + NodeInfosWidget.getUriTarget(property.domainId) + "' href='" + property.domainId + "'>" + property.domainLabel + "</a></td>";
                
                html +=  "<td class='detailsCellValue'><a target='" + NodeInfosWidget.getUriTarget(property.id) + "' href='" + property.id + "'>" + property.label||property.id + "</a></td>";
                if (property.rangeId) {
                    html += "<td class='detailsCellValue'><a style='color: #aaa' target='" + NodeInfosWidget.getUriTarget(property.rangeId) + "' href='" + property.rangeId + "'>" + property.rangeLabel + "</a></td>";
                }
                else{
                    html += "<td class='detailsCellValue'><a style='color: #aaa' >" + 'any' + "</a></td>";
                }
                html += "</tr> ";
            });
        }
        html += "</table> </tbody> </div>";
        html += "<div style='margin-left:25px;'><b><div class='nodesInfos_titles'>Domain Authorized </div></b>";
        html += `<table> <tbody> 
                <tr>
                    <td class="detailsCellName"><span class="title">Domain on</span></td>
                    <td class="detailsCellName"> <span class="title">onProperty </span></td>
                    <td class="detailsCellName"><span class="title"> ancestorConcerned</span></td>
                 </tr>`;
        
        if (rangeOfProperties.length > 0) {
            rangeOfProperties.forEach(function (property) {
                html+='<tr> '
                if (property.domainId) {
                    html += "<td class='detailsCellValue'><a style='color: #aaa' target='" + NodeInfosWidget.getUriTarget(property.domainId) + "' href='" + property.domainId + "'>" + property.domainLabel + "</a></td>";
                }
                else{
                    html += "<td class='detailsCellValue'><a style='color: #aaa' >" + 'any' + "</a></td>";
                }
                html +=  "<td class='detailsCellValue'><a target='" + NodeInfosWidget.getUriTarget(property.id) + "' href='" + property.id + "'>" + property.label||property.id + "</a></td>";
                html += "<td class='detailsCellValue'><a style='color: #aaa' target='" + NodeInfosWidget.getUriTarget(property.rangeId) + "' href='" + property.rangeId + "'>" + property.rangeLabel + "</a></td>";
                
                
                
                html += "</tr> ";
            });
        }
        html += "</table> </tbody> </div>";
        html += "</div>";
        /*
        html += "<div><b><div  class='nodesInfos_titles'>Range of</div></b>";
        if (rangeOfProperties.length > 0) {
            rangeOfProperties.forEach(function (property) {
                html += "  <div class='XdetailsCellValue'>";
                if (property.domainId) {
                    html += "&nbsp; <i><a style='color: #aaa' target='" + NodeInfosWidget.getUriTarget(property.domainId) + "' href='" + property.domainId + "'>" + property.domainLabel + "</a></i>";
                }
                html += " <a target='" + NodeInfosWidget.getUriTarget(property.id) + "' href='" + property.id + "'>" + property.label + "</a> </div>";
            });
        }
       
        html += "</div>";*/
        if (html) {
            $("#" + divId).show();
            $("#" + divId).append(html);
            $("#" + divId).css("display", "table-caption");
        } else {
            $("#" + divId).hide();
        }

        if (callback) {
            callback();
        }
    };

    self.showClassesBreakDown = function (sourceLabel, nodeId, divId, callback) {
        var jstreeData = [];
        var ancestors = OntologyModels.getClassHierarchyTreeData(sourceLabel, nodeId, "ancestors");

        if (ancestors.length == 0) return callback();
        var uniqueIds = {};
        if (ancestors.length > 0) {
            ancestors.forEach(function (item) {
                if (!uniqueIds[item.id]) {
                    var parent = item.superClass || "#";
                    uniqueIds[item.id] = 1;
                    jstreeData.push({
                        id: item.id,
                        text: item.label,
                        parent: parent,
                        type: "Class",
                        data: {
                            id: item.id,
                            source: sourceLabel,
                        },
                    });
                }
            });
            jstreeData.forEach(function (item) {
                if (!uniqueIds[item.parent]) {
                    item.parent = "#";
                }
            });
        }

        var html = "<b><div  class='nodesInfos_titles'>Class hierarchy</div></b>" + "<div id='classHierarchyTreeDiv' style='max-width:800px;max-height: 330px;overflow: auto;font-size: 12px'></div>";

        $("#" + divId).html(html);

        var options = {
            openAll: true,
            selectTreeNodeFn: function (event, obj) {
                if (!obj.event.ctrlKey) {
                    var descendants = OntologyModels.getClassHierarchyTreeData(sourceLabel, obj.node.id, "descendants");
                    var jstreeData = [];
                    var uniqueIds = JstreeWidget.getNodeDescendants("classHierarchyTreeDiv", "#", null, true);
                    if (descendants.length > 0) {
                        descendants.forEach(function (item) {
                            if (!uniqueIds[item.id]) {
                                uniqueIds[item.id] = 1;
                                jstreeData.push({
                                    id: item.id,
                                    text: item.label,
                                    parent: item.superClass,
                                    type: "Class",
                                    data: {
                                        id: item.id,
                                        source: sourceLabel,
                                    },
                                });
                            }
                        });
                        jstreeData.forEach(function (item) {
                            if (!uniqueIds[item.parent]) {
                                item.parent = "#";
                            }
                        });
                        JstreeWidget.addNodesToJstree("classHierarchyTreeDiv", null, jstreeData);
                    }
                } else {
                    NodeInfosWidget.showNodeInfos(sourceLabel, obj.node, "mainDialogDiv");
                }
            },
        };
        if (jstreeData.length == 0) {
            $("#nodeInfos_classHierarchyDiv").hide();
            return;
        } else {
            $("#classHierarchyTreeDiv").show();
        }

        JstreeWidget.loadJsTree("classHierarchyTreeDiv", jstreeData, options);

        callback();
    };
    self.showPropBreakdown = function (sourceLabel, nodeId, divId, callback) {
        var jstreeData = [];
        var ancestors = OntologyModels.getPropHierarchyTreeData(sourceLabel, nodeId, "ancestors");
        var uniqueIds = {};
        if (ancestors.length > 0) {
            ancestors.forEach(function (item) {
                if (!uniqueIds[item.id]) {
                    var parent = item.superProp || "#";
                    uniqueIds[item.id] = 1;
                    jstreeData.push({
                        id: item.id,
                        text: item.label,
                        parent: parent,
                        type: "Property",
                        data: {
                            id: item.id,
                            source: sourceLabel,
                        },
                    });
                }
            });
            jstreeData.forEach(function (item) {
                if (!uniqueIds[item.parent]) {
                    item.parent = "#";
                }
            });
        }
        var html = "<b><div  class='nodesInfos_titles'>Properties hierarchy</div></b>" + "<div id='classHierarchyTreeDiv' style='width:300px;height: 330px;overflow: auto;font-size: 12px'></div>";

        $("#" + divId).html(html);

        var options = {
            openAll: true,
            selectTreeNodeFn: function (event, obj) {
                if (!obj.event.ctrlKey) {
                    var descendants = OntologyModels.getPropHierarchyTreeData(sourceLabel, obj.node.id, "descendants");
                    var jstreeData = [];
                    var uniqueIds = JstreeWidget.getNodeDescendants("classHierarchyTreeDiv", "#", null, true);
                    if (descendants.length > 0) {
                        descendants.forEach(function (item) {
                            if (!uniqueIds[item.id]) {
                                uniqueIds[item.id] = 1;
                                jstreeData.push({
                                    id: item.id,
                                    text: item.label,
                                    parent: item.superProp,
                                    type: "Property",
                                    data: {
                                        id: item.id,
                                        source: sourceLabel,
                                    },
                                });
                            }
                        });
                        jstreeData.forEach(function (item) {
                            if (!uniqueIds[item.parent]) {
                                item.parent = "#";
                            }
                        });

                        JstreeWidget.addNodesToJstree("classHierarchyTreeDiv", null, jstreeData);
                    }
                } else {
                    NodeInfosWidget.showNodeInfos(sourceLabel, obj.node, "mainDialogDiv");
                }
            },
        };
        if (jstreeData.length == 0) {
            $("#nodeInfos_classHierarchyDiv").hide();
            return;
        } else {
            $("#classHierarchyTreeDiv").show();
        }

        JstreeWidget.loadJsTree("classHierarchyTreeDiv", jstreeData, options);

        callback();
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
                self.drawAllInfos(self.currentSource, self.currentNode.data.id, {}, function (err, result) {
                    // manage particular cases
                    if (property == "<http://www.w3.org/2000/01/rdf-schema#subClassOf>" || property == "rdfs:subClassOf") {
                        // update Ontology model cache parent class
                        if (Config.ontologiesVocabularyModels[self.currentSource]["classes"][self.currentNode.data.id]) {
                            var data = { classes: {} };
                            data["classes"][self.currentNode.data.id] = Config.ontologiesVocabularyModels[self.currentSource]["classes"][self.currentNode.data.id];
                            var valueCleaned = value.replaceAll("<", "").replaceAll(">", "");
                            data["classes"][self.currentNode.data.id].superClass = valueCleaned;
                            data["classes"][self.currentNode.data.id].superClassLabel = Sparql_common.getLabelFromURI(valueCleaned);
                            OntologyModels.updateModel(self.currentSource, data, {}, function (err, result) {
                                Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(self.currentNode.data.id);
                                Lineage_whiteboard.drawNodesAndParents(self.currentNode, null, {}, function () {});
                            });
                        }
                    }
                    // update cache after change subPropertyOf but properties not available in Add Predicates selector
                    /*
                    if (property == "<http://www.w3.org/2000/01/rdf-schema#subPropertyOf>" || property=='rdfs:subPropertyOf') {
                        // update Ontology model cache parent property
                        if(Config.ontologiesVocabularyModels[self.currentSource]["properties"][self.currentNode.data.id]){
                            var data={'properties':{}};
                            data['properties'][self.currentNode.data.id]=Config.ontologiesVocabularyModels[self.currentSource]["properties"][self.currentNode.data.id];
                            var valueCleaned=value.replaceAll('<','').replaceAll('>','');
                            data['properties'][self.currentNode.data.id].superProp=valueCleaned;
                            
                            OntologyModels.updateModel(self.currentSource,data,{},function(err,result){
                                //Lineage_whiteboard.lineageVisjsGraph.data.nodes.remove(self.currentNode.data.id);
                                //Lineage_whiteboard.drawNodesAndParents(self.currentNode,null,{},function(){});
                            });
                        }
                        
                       
                    }*/

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

    self.deletePredicate = function (predicateId, prompt, callback) {
        var currentEditingItem = PredicatesSelectorWidget.predicatesIdsMap[predicateId];
        var property = currentEditingItem.item.prop.value;
        if (!prompt || confirm("delete predicate")) {
            var result = "";

            async.series(
                [
                    function (callbackSeries) {
                        var object = currentEditingItem.item.value.value;
                        if (currentEditingItem.item.value.type == "literal") {
                            object = {
                                isString: true,
                                value: currentEditingItem.item.value.value,
                                lang: currentEditingItem.item.value["xml:lang"],
                            };
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
                    if (callback) {
                        callback();
                    }
                }
            );
        }
    };

    self.deleteNode = function () {
        if (confirm("delete node " + self.currentNodeId)) {
            var concernedRestrictions = [];
            async.series(
                [
                    // Update OntologyModel cache (except restrictions,other callbackSeries for it)
                    function (callbackSeries) {
                        if (Config.ontologiesVocabularyModels[self.currentNode.data.source]["properties"][self.currentNodeId]) {
                            var data = {};
                            data["constraints"] = [self.currentNodeId];
                            data["properties"] = [self.currentNodeId];
                            OntologyModels.updateModel(self.currentNode.data.source, data, { remove: true }, function (err, result2) {
                                callbackSeries(err);
                            });
                        } else if (Config.ontologiesVocabularyModels[self.currentNode.data.source]["classes"][self.currentNodeId]) {
                            var data = {};
                            data["classes"] = [self.currentNodeId];
                            OntologyModels.updateModel(self.currentNode.data.source, data, { remove: true }, function (err, result2) {
                                callbackSeries(err);
                            });
                        } else {
                            callbackSeries();
                        }
                    },
                    // Get related restrictions
                    function (callbackSeries) {
                        Sparql_OWL.getObjectRestrictions(Lineage_sources.activeSource, null, { withoutImports: 1 }, function (err, result) {
                            /*Object.values(Config.ontologiesVocabularyModels[self.currentNode.data.source]["restrictions"]).filter(function(restriction){
                                return restriction[0].range==self.currentNodeId || restriction[0].domain==self.currentNodeId ;
                            });*/
                            result.forEach(function (item) {
                                if (item.subject.value == self.currentNodeId || item.value.value == self.currentNodeId || item.prop.value == self.currentNodeId) {
                                    concernedRestrictions.push(item);
                                }
                            });
                            callbackSeries();
                        });
                    },

                    // delete restrictions triples
                    function (callbackSeries) {
                        if (concernedRestrictions.length > 0) {
                            var blankNodesIds = concernedRestrictions.map(function (restriction) {
                                return restriction.node.value;
                            });

                            // Delete restrictions in Lineage_whiteboard edges cache
                            Lineage_createRelation.deleteRestrictionsByUri(self.currentSource, blankNodesIds, function (err) {
                                callbackSeries();
                            });
                            /*Sparql_generic.deleteTriples(self.currentSource, blankNodesIds, null, null, function (err, _result) {
                                Lineage_whiteboard.lineageVisjsGraph.data.edges.remove(blankNodesIds);
                                return callbackSeries(err);
                            });*/
                        } else {
                            callbackSeries();
                        }
                    },
                    //delete triples where id is subject
                    function (callbackSeries) {
                        //Sparql_generic.deleteRestriction()
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
                    UI.message("node deleted");
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

    self.getUriTarget = function (nodeId) {
        /* var target = "_blank";
        if (self.isSLSVvisibleUri(nodeId)) {
            target = "_slsvCallback";
        }*/
        return "_slsvCallback";
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
                            Lineage_whiteboard.lineageVisjsGraph.data.edges.update({
                                id: self.currentNodeId,
                                label: newValue,
                            });
                        }
                    } else {
                        if (Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                            Lineage_whiteboard.lineageVisjsGraph.data.nodes.update({
                                id: self.currentNodeId,
                                label: newValue,
                            });
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

    self.showHidePropertiesDiv = function (hide) {
        if (hide == "hide") {
            $("#editPredicate_propertyDiv").hide();
            $("#editPredicate_recentSelect").hide();
        } else {
            $("#editPredicate_propertyDiv").show();
            $("#editPredicate_recentSelect").show();
        }
    };
    self.showModifyPredicateDialog = function (predicateId) {
        PredicatesSelectorWidget.currentEditingItem = PredicatesSelectorWidget.predicatesIdsMap[predicateId];
        if (!PredicatesSelectorWidget.currentEditingItem) {
            return alert("error");
        }

        PredicatesSelectorWidget.init(Lineage_sources.activeSource, function () {
            self.showHidePropertiesDiv("hide");

            if (PredicatesSelectorWidget.currentEditingItem.item.value.type != "uri") {
                //hide both
                self.setLargerObjectTextArea();
                $("#editPredicate_objectSelectDiv").hide();
                $("#editPredicate_largerTextButton").hide();
            } else {
                $("#editPredicate_objectSelectDiv").show();
                $("#editPredicate_largerTextButton").show();
                $("#editPredicate_objectValue").hide();
                var vocab = common.getVocabularyFromURI(PredicatesSelectorWidget.currentEditingItem.item.value.value);
                if (vocab) {
                    $("#editPredicate_vocabularySelect").val(vocab[0]);
                    PredicatesSelectorWidget.setCurrentVocabPropertiesSelect(vocab[0], "editPredicate_currentVocabPredicateSelect", function () {
                        $("#editPredicate_currentVocabPredicateSelect").val(PredicatesSelectorWidget.currentEditingItem.item.prop.value);
                        $("#editPredicate_propertyValue").val(PredicatesSelectorWidget.currentEditingItem.item.prop.value);
                        //PredicatesSelectorWidget.onSelectPredicateProperty($('#editPredicate_currentVocabPredicateSelect').val());
                    });

                    $("#editPredicate_vocabularySelect2").val(vocab[0]);
                    PredicatesSelectorWidget.setCurrentVocabClassesSelect(vocab[0], "editPredicate_objectSelect", function () {
                        $("#editPredicate_objectSelect").val(PredicatesSelectorWidget.currentEditingItem.item.value.value);
                        PredicatesSelectorWidget.onSelectCurrentVocabObject(PredicatesSelectorWidget.currentEditingItem.item.value.value);
                    });
                }
            }

            $("#editPredicate_objectValue").val(PredicatesSelectorWidget.currentEditingItem.item.value.value);
            $("#editPredicate_propertyValue").val(PredicatesSelectorWidget.currentEditingItem.item.prop.value);
            $("#editPredicate_objectValue").focus();
            $("#editPredicate_savePredicateButton").click(function () {
                PredicatesSelectorWidget.storeRecentPredicates();

                self.deletePredicate(predicateId, false, function () {
                    self.addPredicate(null, null, null, null, function () {
                        self.showNodeInfos(MainController.currentSource, self.currentNode, "mainDialogDiv", { resetVisited: 1 });
                    });
                });
            });
        });
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
        $("#" + divId).dialog("option", "title", " Node infos :"); // source " + sourceLabel);
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
                UI.message("node Created and Indexed");
            });
        });
    };

    self.setLargerObjectTextArea = function () {
        $("#editPredicate_objectValue").show();
        $("#editPredicate_objectValue").focus();
        $("#editPredicate_largerTextButton").hide();
        //  $("#editPredicate_objectValue").hide();
        $("#editPredicate_objectValue").css("width", "700px");
        $("#editPredicate_objectValue").css("height", "130px");
    };

    self.showRestrictionInfos = function (node, targetDiv, filterProp, callback) {
        var filter = "";
        var subClassId = node.data.id;
        if (node.from) {
            filter = "FILTER (?prop=<" + node.data.propertyId + ">)";
            subClassId = node.from;
        }
        Sparql_OWL.getObjectRestrictions(node.data.source, subClassId, { filter: filter }, function (err, result) {
            if (err) {
                return callback(err.responseText || err);
            }

            result.sort(function (a, b) {
                if (a.prop.value > b.prop.value) {
                    return 1;
                }
                if (a.prop.value < b.prop.value) {
                    return -1;
                }
                return 0;
            });

            self.currentRestrictionsMap = {};

            var html = "<div style='display:flex;align-items:center;'> <b class='nodesInfos_titles'>Restrictions </b> ";
            
            if (!node.from) html += " <div class='addEdgeButtonColor' style='padding: 2px 4px;margin-left:10px;' onclick='NodeInfosWidget.showAddRestrictionWidget()'><button  class='slsv-invisible-button add-icon' style='margin-right: 2px; height: 26px; width: 27px;border-radius:14px;' ></button></div>";
            html+='</div>'
            html += '<div style="max-width:800px;max-height:400px">' + " <table>\n" + "        <tr>\n";
            if (filterProp) {
                html += "     <td class='detailsCellName'> <span class=\"title\">subClass</span></td>\n";
            }
            html +=
                " <td class='detailsCellName' ><span class=\"title\">onProperty</span></td>\n" +
                " <td class='detailsCellName'> <span class=\"title\">constraint </span></td>\n" +
                " <td class='detailsCellName'  ><span class=\"title\">targetClass</span></td>\n" +
                " </tr>";

            result.forEach(function (restriction) {
                var fieldsMap = {};
                for (var key in restriction) {
                    fieldsMap[key] = restriction[key].value;
                }

                self.currentRestrictionsMap[fieldsMap.value] = {
                    id: fieldsMap.node,
                    data: {
                        bNodeId: fieldsMap.node,
                        propertyId: fieldsMap.prop,
                    },
                };

                html += "<tr>";
                if (filterProp) {
                    html += "<td class='detailsCellValue'><a target='_slsvCallback' href='" + fieldsMap.subject + "'>" + fieldsMap.subjectLabel + "</a></td>";
                }
                html += "<td class='detailsCellValue'><a target='_slsvCallback' href='" + fieldsMap.prop + "'>" + fieldsMap.propLabel + "</a></td>";

                if (fieldsMap.cardinalityType) {
                    var str = common.getRestrictionCardinalityLabel(fieldsMap.cardinalityType, fieldsMap.cardinalityValue);
                    html += "<td class='detailsCellValue'>" + str + "</td>";
                } else {
                    html += "<td class='detailsCellValue'><a target='_slsvCallback' href='" + fieldsMap.constraintType + "'>" + Sparql_common.getLabelFromURI(fieldsMap.constraintType) + "</a></td>";
                }

                html += "<td class='detailsCellValue'><a target='_slsvCallback' href='" + fieldsMap.value + "'>" + fieldsMap.valueLabel + "</a></td>";

                var modifyButton = "";
                if (Lineage_sources.isSourceEditableForUser(self.currentSource)) {
                    modifyButton = "<button class='  KGquery_smallButton  deleteIcon' onclick='NodeInfosWidget.deleteRestriction(\"" + fieldsMap.value + "\")' style='margin:unset !important;background-color:unset!important;'></button>";
                    html += "<td class='detailsCellValue'>" + modifyButton + "</td>";
                }

                html += "</tr>";
            });

            html += "</table></div>";

            if (!targetDiv) {
                targetDiv = "smallDialogDiv";
                $("#" + targetDiv).dialog("open");
                $("#addPredicateButton").remove();

                $("#deleteButton").remove();
            }
            $("#" + targetDiv).html(html);

            if (callback) {
                callback();
            }
        });
    };

    self.showAddRestrictionWidget = function () {
        var params = {
            source: self.currentSource,
            currentNode: self.currentNode,
        };
        CreateRestriction_bot.start(CreateRestriction_bot.workflow, params, function (err, result) {
            self.showRestrictionInfos(self.currentNode, "nodeInfos_restrictionsDiv", false);
        });
    };
    self.deleteRestriction = function (restrictionUri) {
        //return alert ("in progress...use edge popup menu in whiteboard")
        var restrictionNode = self.currentRestrictionsMap[restrictionUri];
        if (Lineage_whiteboard.lineageVisjsGraph.data) {
            var edges = Lineage_whiteboard.lineageVisjsGraph.data.edges.get();
            edges.forEach(function (edge) {});
        }

        Lineage_createRelation.deleteRestriction(self.currentSource, restrictionNode, function (err, result) {
            if (err) {
                return alert(err.responseText || err);
            }
            self.showRestrictionInfos(self.currentNode, "nodeInfos_restrictionsDiv", false);
        });
    };

    return self;
})();

export default NodeInfosWidget;
window.NodeInfosWidget = NodeInfosWidget;
