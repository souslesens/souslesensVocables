import JstreeWidget from "../../uiWidgets/jstreeWidget.js";
import KGquery from "./KGquery.js";
import jstreeWidget from "../../uiWidgets/jstreeWidget.js";
import KGquery_filter_bot from "../../bots/KGquery_filter_bot.js";


var KGquery_filter = (function() {
    var self = {};

    self.containersFilterMap={}

    self.filterQueryNonObjectProperties = function(querySets, callback) {
        var queryNonObjectProperties = [];
        var uniqueProps = {};
        var labelProperty = {
            datatype: "http://www.w3.org/2001/XMLSchema#string",
            id: "rdf:label",
            label: "label"
        };
        querySets.sets.forEach(function(querySet) {
            querySet.elements.forEach(function(queryElement, queryElementIndex) {
                queryElement.paths.forEach(function(pathItem, pathIndex) {
                    if (queryElement.fromNode) {


                        if (!queryElement.fromNode.data.nonObjectProperties) {
                            queryElement.fromNode.data.nonObjectProperties = [{
                                "label": "label",
                                "id": "rdfs:label",
                                "datatype": "http://www.w3.org/2001/XMLSchema#string"
                            }];
                        }
                        var subjectVarName = KGquery.getVarName(queryElement.fromNode, true);
                        var addLabel = true;

                        queryElement.fromNode.data.nonObjectProperties.forEach(function(property) {
                            if (property.label.indexOf("label") > -1) {
                                addLabel = false;
                            }

                            if (!uniqueProps[subjectVarName + "_" + property.label]) {
                                uniqueProps[subjectVarName + "_" + property.label] = 1;
                                queryNonObjectProperties.push({ varName: subjectVarName, property: property, nodeDivId: queryElement.fromNode.data.nodeDivId });
                            }
                        });
                        if (addLabel) {
                            if (!uniqueProps[subjectVarName + "_" + "rdfs:label"]) {
                                uniqueProps[subjectVarName + "_" + "rdfs:label"] = 1;
                            }
                            queryNonObjectProperties.push({ varName: subjectVarName, property: labelProperty, nodeDivId: queryElement.fromNode.data.nodeDivId });
                        }


                    }
                    if (queryElement.toNode) {

                        if (!queryElement.toNode.data.nonObjectProperties) {
                            queryElement.toNode.data.nonObjectProperties = [{
                                "label": "label",
                                "id": "rdfs:label",
                                "datatype": "http://www.w3.org/2001/XMLSchema#string"
                            }];
                        }
                        var objectVarName = KGquery.getVarName(queryElement.toNode, true);
                        var addLabel = true;
                        queryElement.toNode.data.nonObjectProperties.forEach(function(property) {
                            if (property.label.indexOf("label") > -1) {
                                addLabel = false;
                            }
                            if (!uniqueProps[objectVarName + "_" + property.label]) {
                                uniqueProps[objectVarName + "_" + property.label] = 1;
                                queryNonObjectProperties.push({ varName: objectVarName, property: property, nodeDivId: queryElement.toNode.data.nodeDivId });
                            }
                        });
                        if (addLabel) {
                            if (!uniqueProps[objectVarName + "_" + "rdfs:label"]) {
                                uniqueProps[objectVarName + "_" + "rdfs:label"] = 1;
                                queryNonObjectProperties.push({ varName: objectVarName, property: labelProperty, nodeDivId: queryElement.toNode.data.nodeDivId });
                            }
                        }

                    }

                });
            });
        });

        var jstreeData = [];
        jstreeData.push({
            id: "root",
            text: "Properties",
            parent: "#",
        })
        queryNonObjectProperties.forEach(function(item) {
            var label = item.varName + "_" + item.property.label;
            var nodeDivId = item.nodeDivId;


            jstreeData.push({
                id: label,
                text: label + "<button style='vertical-align:middle' class=\"slsv-invisible-button filterIcon\" " +
                    "about=\"add filter\" " +
                    "onclick=\"KGquery_filter.addNodeFilter('" + nodeDivId + "','" + label + "','" + item.property.id + "')\"></button>",
                parent: "root",
                data: { property: item.property },
                type: "Property"
            });
        });

        var options = {
            withCheckboxes: true,


            validateFn: function(checkedNodes) {

                queryNonObjectProperties = [];
                if (!checkedNodes || checkedNodes.length == 0) {
                    alert("no properties selected");
                    return callback("no properties selected");
                }
                checkedNodes.forEach(function(node) {
                    if (node.parents.length == 2) {
                        queryNonObjectProperties.push(node);
                    }
                });


                if (queryNonObjectProperties.length > self.maxOptionalPredicatesInQuery) {
                    if (confirm("many properties have been selected. Query may take time or abort, Continue anyway?")) {
                        return callback(null, queryNonObjectProperties);
                    } else {
                        $("#smallDialogDiv").dialog("open")
                        return callback("query aborted");
                    }
                }

                return callback(null, queryNonObjectProperties);
            }
        };
        JstreeWidget.loadJsTree(null, jstreeData, options, function() {
            JstreeWidget.openNodeDescendants(null,"root")
            if ( queryNonObjectProperties.length < self.maxOptionalPredicatesInQuery) {
                JstreeWidget.checkAll();


            }

        });


    };


    self.getAggregatePredicates = function(groupByPredicates) {
        var str = "";
        for (var key in groupByPredicates) {
            var obj = groupByPredicates[key];
            str += " ?" + obj.classLabel + " <" + obj.prop.id + "> ?" + obj.label + ". ";
        }

        return str;
    };
    self.getOtherPredicates = function(queryElement, filterClassLabels) {
        function getOptionalClause(varName) {
            var optionalStr = " OPTIONAL ";
            var filterType = filterClassLabels[varName];
            if (filterType && filterType != "uri") {
                optionalStr = "";
            }

            return optionalStr;
        }

        function addToStringIfNotExists(str, text) {
            if (text.indexOf(str) > -1) {
                return text;
            } else {
                return text + str;
            }
        }

        var otherPredicatesStr = "";
        var subjectVarName = KGquery.getVarName(queryElement.fromNode);
        var objectVarName = KGquery.getVarName(queryElement.toNode);
        if (queryElement.fromNode.data.nonObjectProperties) {
            var addLabelPredicate = true;
            queryElement.fromNode.data.nonObjectProperties.forEach(function(property) {
                if (property.label.indexOf("label") > -1) {
                    addLabelPredicate = false;
                }
                var optionalStr = getOptionalClause(subjectVarName);

                otherPredicatesStr = addToStringIfNotExists(optionalStr + " {" + subjectVarName + " <" + property.id + "> " + subjectVarName + "_" + property.label + "}\n", otherPredicatesStr);
            });

            if (addLabelPredicate) {
                var optionalStr = getOptionalClause(subjectVarName);
                otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + subjectVarName + " rdfs:label " + subjectVarName + "_label}\n", otherPredicatesStr);
            }
        } else {
            var optionalStr = getOptionalClause(subjectVarName);
            otherPredicatesStr = addToStringIfNotExists(optionalStr + " {" + subjectVarName + " rdfs:label " + subjectVarName + "_label}\n", otherPredicatesStr);
        }
        if (queryElement.toNode) {
            if (queryElement.toNode.data.nonObjectProperties) {
                var addLabelPredicate = true;
                queryElement.toNode.data.nonObjectProperties.forEach(function(property) {
                    if (property.label.indexOf("label") > -1) {
                        addLabelPredicate = false;
                    }
                    var optionalStr = getOptionalClause(objectVarName);
                    otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + objectVarName + " <" + property.id + "> " + objectVarName + "_" + property.label + "}\n", otherPredicatesStr);
                });
                if (addLabelPredicate) {
                    var optionalStr = getOptionalClause(objectVarName);
                    otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + objectVarName + " rdfs:label " + objectVarName + "_label}\n", otherPredicatesStr);
                }
            } else {
                var optionalStr = getOptionalClause(objectVarName);
                otherPredicatesStr = addToStringIfNotExists(optionalStr + "  {" + objectVarName + " rdfs:label " + objectVarName + "_label}\n", otherPredicatesStr);
            }
        }
        return otherPredicatesStr;
    };


    self.addNodeFilter = function(classDivId, addTojsTreeNode,propertyId) {
        var aClass = KGquery.divsMap[classDivId];
        var classSetIndex = aClass.data.setIndex;
        if (KGquery.querySets.sets[classSetIndex].classFiltersMap[classDivId]) {
            delete KGquery.querySets.sets[classSetIndex].classFiltersMap[classDivId];
            $("#" + classDivId + "_filter").html("");
            if (addTojsTreeNode) {
                jstreeWidget.deleteNode(null, classDivId + "_filter");
            }
            return;
        }

        var varName = KGquery.getVarName(aClass, true);
        if(false && varName.endsWith("_parent") && !self.setMemberFilter(classDivId)){

          return  self.setMemberFilter(classDivId)

        }else {
          //  var varName = [KGquery.getVarName(aClass, true)];
          //  var datatype = aClass.data.datatype;
            var currentFilterQuery = {
                source: KGquery.currentSource,
                currentClass: aClass.id,
                property: propertyId,
                varName: KGquery.getVarName(aClass, true)
            };

            KGquery_filter_bot.start(aClass.data, currentFilterQuery, function(err, result) {
                if (err) {
                    return alert(err.responseText);
                }
                KGquery.querySets.sets[classSetIndex].classFiltersMap[classDivId] = { class: aClass, filter: result.filter };
                $("#" + classDivId + "_filter").text(result.filterLabel || result.filter);


                if (addTojsTreeNode) {
                    var jstreeData = [{
                        id: classDivId + "_filter",
                        text: result.filterLabel || result.filter,
                        parent: addTojsTreeNode
                    }];
                    jstreeWidget.addNodesToJstree(null, addTojsTreeNode, jstreeData);
                }

            });
        }
    };


    self.setMemberFilter=function(classDivId){
        var aClass = KGquery.divsMap[classDivId];
         var options={memberClass:aClass.data.id};
         self.currentContainerVarName=KGquery.getVarName(aClass)
        $("#smallDialogDiv").dialog("close")

               Containers_widget.showDialog(self.currentSource,options,function(err, result){
                   $("#smallDialogDiv").dialog("open")
                    if(err)
                        return alert(err)

                   self.containersFilterMap[self.currentContainerVarName]={
                       classId:aClass.id,
                       depth:result.depth
                   }




                })
    }


    return self;


})();

export default KGquery_filter;
window.KGquery_filter = KGquery_filter;