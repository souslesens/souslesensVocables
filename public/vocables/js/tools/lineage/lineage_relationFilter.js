var Lineage_relationFilter = (function () {
    var self = {};
    var restrictions = null;
    var constraints = null;
    self.showAddFilterDiv = function () {
        $("#Lineage_relation_constraints").html("");
      //  $("#lineage_relation_filterRoleSelect").val("");
        $("#Lineage_relation_filterTypeSelect").val("");
        $("#Lineage_relation_filterVocabularySelect").val("");
        $("#lineageQuery_uriValueDiv").css("display", "none");
        $("#lineageQuery_literalValueDiv").css("display", "none");


        var propStr = "";""
        if (self.currentProperty) {
            propStr = self.currentProperty.vocabulary + "." + self.currentProperty.label + "<br>";
        }

        $("#lineageRelations_filterDiv").css("display", "flex");

        /* $("#mainDialogDiv").dialog("open");
         $("#mainDialogDiv").load("snippets/lineage/relationsDialogFilter.html", function() {*/



        self.domainValue = "";
        self.rangeValue = "";
        self.domain = null;
        self.range = null;

        self.ObjectsTypesMap = {
            any: ["String", "Date", "Number", "owl:Class", "rdf:Bag", "owl:NamedIndividual", "owl:ObjectProperty", "owl:DataTypeProperty"],
            Literal: ["String", "Date", "Number"],
            Resource: ["owl:Class", "rdf:Bag", "owl:NamedIndividual"],
            Class: ["owl:Class"],
            Property: ["owl:ObjectProperty", "owl:DataTypeProperty"],
        };

        self.operators = {
            String: ["contains", "not contains", "="],
            Number: ["=", "!=", "<", "<=", ">", ">="],
        };

        function getHtmlLink(label, uri) {
            if (label == "any") return label;
            var target = "";
            if (!Config.basicVocabularies[self.currentProperty.vocabulary]) target = "_slsvCallback";
            return "<a href='" + uri + "' target='" + target + "'>" + label + "</a>";
        }

        if (self.currentProperty && Config.ontologiesVocabularyModels[self.currentProperty.vocabulary]) {
            restrictions = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].restrictions;
            constraints = Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].constraints;

            var suffix = "";
            var domainLabel = "any";
            var rangeLabel = "any";

            if (restrictions[self.currentProperty.id]) {
                suffix = " Restr.";
                var str = "<table><tr><td>Domain</td><td>range</td></tr>";
                self.domain = [];
                self.range = [];
                restrictions[self.currentProperty.id].forEach(function (restriction) {
                    self.domain.push({ id: restriction.domain, label: restriction.domainLabel });
                    self.range.push({ id: restriction.range, label: restriction.rangeLabel });
                    domainLabel = restriction.domainLabel;
                    rangeLabel = restriction.rangeLabel;
                    str += "<tr><td>" + domainLabel + "</td><td>" + rangeLabel + "</td></tr>";
                });
                str += "</table>";

                $("#Lineage_relation_constraints").html("<b>" + self.currentProperty.label + "</b>" + str);
            } else if (constraints[self.currentProperty.id]) {
                self.domain = constraints[self.currentProperty.id].domain;
                self.range = constraints[self.currentProperty.id].range;

                if (self.domain) {
                    if (Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.domain]) {
                        domainLabel = self.currentProperty.vocabulary + ":" + Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.domain].label;
                    } else {
                        domainLabel = self.domain;
                    }
                }

                if (self.range) {
                    if (Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.range]) {
                        var rangeLabel = self.currentProperty.vocabulary + ":" + Config.ontologiesVocabularyModels[self.currentProperty.vocabulary].classes[self.range].label;
                    } else {
                        rangeLabel = self.range;
                    }
                }
                $("#Lineage_relation_constraints").html(
                    "<b>" + self.currentProperty.label + "</b>" + "<br> Domain :" + getHtmlLink(domainLabel, self.domain) + "<br> Range :" + getHtmlLink(rangeLabel, self.range)
                );
            }
        }
        $("#Lineage_relation_property").html(propStr);
    };

    self.onSelectRoleType = function (role) {
        self.currentFilterRole = role;
        $("#lineage_relation_filterRole").html(role);



        if(!self.currentProperty)
           return common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap["any"], true);


        var types = Object.keys(self.ObjectsTypesMap);

        var ok = false;

        if (restrictions[self.currentProperty.id]) {
            type = "Resource";
            common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap[type], true);
        } else {
            for (var type in self.ObjectsTypesMap) {
                if ((role == "subject" && self.domain && self.domain.indexOf(type) > -1) || (role == "object" && self.range && self.range.indexOf(type) > -1)) {
                    ok = true;
                    common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap[type], true);
                }
            }
            if (!ok) {
                common.fillSelectOptions("Lineage_relation_filterTypeSelect", self.ObjectsTypesMap["any"], true);
            }
        }
    };

    self.onSelectResourceType = function (type) {
        var role = self.currentFilterRole;
        $("#lineageQuery_value" ).datepicker( "destroy" )
        $("#lineageQuery_value").val("")

        if (type == "String") {
            $("#lineageQuery_literalValueDiv").css("display", "block");
            common.fillSelectOptions("lineageQuery_operator", self.operators["String"]);
            $("#lineageQuery_operator").val("contains")
        }
        else if (type == "Date") {
            $("#lineageQuery_literalValueDiv").css("display", "block");
            common.fillSelectOptions("lineageQuery_operator", self.operators["Number"]);
            common.setDatePickerOnInput("lineageQuery_value");
            $("#lineageQuery_operator").val(">=")
        }
        else if (type == "Number") {
            $("#lineageQuery_literalValueDiv").css("display", "block");
            common.fillSelectOptions("lineageQuery_operator", self.operators["Number"]);
            $("#lineageQuery_operator").val(">=")
        } else if (self.currentProperty && restrictions[self.currentProperty.id]) {
            $("#lineageQuery_uriValueDiv").css("display", "block");
            common.fillSelectOptions("Lineage_relation_filterVocabularySelect", [], false);
            if (role == "subject") {
                common.fillSelectOptions("Lineage_relation_filterResourcesSelect", self.domain, true, "label", "id");
            } else if (role == "object") {
                common.fillSelectOptions("Lineage_relation_filterResourcesSelect", self.range, true, "label", "id");
            }
        } else {
            $("#lineageQuery_uriValueDiv").css("display", "block");
            var scopes = [];
            if (visjsGraph.isGraphNotEmpty) {
                scopes.push("whiteBoardNodes");
            }
            scopes.push(Lineage_sources.activeSource);
            var imports = Config.sources[Lineage_sources.activeSource].imports;
            if (imports) {
                scopes = scopes.concat(imports);
            }
            if (role == "subject") {
                common.fillSelectOptions("Lineage_relation_filterVocabularySelect", scopes, true);
            } else if (role == "object") {
                common.fillSelectOptions("Lineage_relation_rangesVocabularySelect", scopes, true);
            }
        }
    };

    self.onSelectResource = function (type) {
        var role = self.currentFilterRole;
        var resourceType = $("#Lineage_relation_filterTypeSelect").val();
        if (type == "whiteBoardNodes") {
        } else {
            //  if (resourceType == "owl:Class") {
            CommonUIwidgets.fillObjectTypeOptionsOnPromptFilter("owl:Class", "Lineage_relation_filterResourcesSelect", type);
            //  }
        }
    };

    self.onCommonUIWidgetSelectObjectValue = function (value) {
        if (value.indexOf("xsd") == 0) {
            if (value == "xsd:dateTime") {
                common.setDatePickerOnInput("editPredicate_objectValue");
            } else {
                $("#editPredicate_objectValue").val(value);
            }
        } else {
        }
    };

    self.attachFilterToProperty = function () {
        function getLiteralValueFilter() {
            var filterIndex = "";
            var operator = $("#lineageQuery_operator").val();
            var value = $("#lineageQuery_value").val();
            var type = $("#Lineage_relation_filterTypeSelect").val();
            var objectFilterStr = "";
            if (type == "String") {
                if (operator == "contains") {
                    objectFilterStr += " Filter(regex(str(?object" + filterIndex + "),'" + value + "','i')).";
                } else if (operator == "not contains") {
                    objectFilterStr += "Filter( ! regex(str(?object" + filterIndex + "),'" + value + "','i')).";
                } else {
                    objectFilterStr += " Filter(?object" + filterIndex + "" + operator + "'" + value + "').";
                }
            } else if (type == "Number") {
                objectFilterStr += "  Filter(?object" + filterIndex + operator + "'" + value + "'^^xsd:float).";
            } else if (type == "Date") {
                objectFilterStr += " bind (?object as ?date) Filter( ?date " + filterIndex + operator + "'" + value + "'^^xsd:dateTime).";
            }

            return objectFilterStr;
        }

        var role = self.currentFilterRole;
        var resourceType = $("#Lineage_relation_filterTypeSelect").val();
        var resource = $("#Lineage_relation_filterResourcesSelect").val();

        var filter = {};
        if (!resourceType) {
            return alert("no filter defined");
        }
        if (resourceType == "whiteBoardNodes") {
            var nodeIds = visjsGraph.data.nodes.getIds();
            if (role == "subject") {
                filter.filterStr = " ?subject rdf:type " + resourceType + ". ";
                filter.subjectIds = nodeIds;
            } else if (role == "object") {
                filter.filterStr = " ?object rdf:type " + resourceType + ". ";
                filter.objectIds = nodeIds;
            }
        } else {
            if (resourceType == "String") {
                filter.filterStr = getLiteralValueFilter();
            }
            else if (resourceType == "Date") {
                filter.filterStr = getLiteralValueFilter();
            }
            else if (resourceType == "Number") {
                filter.filterStr = getLiteralValueFilter();
            }
            else {
                if (role == "subject") {
                    filter.filterStr = " ?subject rdf:type " + resourceType + ". ";
                    if (resource) {
                        filter.filterStr += " VALUES ?subject {<" + resource + ">} ";
                    }
                } else if (role == "object") {
                    filter.filterStr = " ?object rdf:type " + resourceType + ". ";
                    if (resource) {
                        filter.filterStr += " VALUES ?object {<" + resource + ">} ";
                    }
                }
            }
        }

        Lineage_relations.filter = filter.filterStr;
        var text=  $("#Lineage_relation_filterText").val()
        $("#Lineage_relation_filterText").val(text+"\n"+filter.filterStr);
    };

    return self;
})();
