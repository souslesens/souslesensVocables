var Idcp = (function () {
    var self = {};

    // source & rights
    self.loadedGraphDisplay = false;
    self.source = "IDCP_V2";
    self.BO_source = "GIDEA-RAW-2";
    self.isDataOwner = null;

    // units
    self.units_available = {};

    //URI required
    self.datacontainerUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/DataContainer";
    self.datablockURI = "http://datalenergies.total.com/resource/tsf/idcp_v2/DataBloc";
    self.parameterUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/Parameter";
    self.proprieteUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/Propriete";
    self.studyscenarioUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/Template";
    self.disciplineUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/Discipline";
    self.viewpointuri = "http://datalenergies.total.com/resource/tsf/idcp_v2/bag/IDCP";
    self.boURI = "http://datalenergies.total.com/resource/tsf/gidea-raw/BusinessObject";
    self.logicalentityURI = "http://datalenergies.total.com/resource/tsf/gidea-raw/LogicalEntity";
    self.attributeBoURI = "http://datalenergies.total.com/resource/tsf/gidea-raw/Attribute-BO";
    self.attributeLEURI = "http://datalenergies.total.com/resource/tsf/gidea-raw/Attribute-LE";
    self.enumerationBOURI = "http://datalenergies.total.com/resource/tsf/gidea-raw/Enumeration_BO";
    self.enumerationLEURI = "http://datalenergies.total.com/resource/tsf/gidea-raw/Enumeration_LE";

    //buttons
    self.buttonIDCPClearAll = '<button id="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Idcp.idcpClearAll()">Clear all</button>';

    //Available buttons for differents clicks
    //["NodeInfos","GraphContainerDescendantAndLeaves" ,"AddParameter" ,"DeleteContainer" ,"copy" ,"paste" ,"delete from bag","Create Object"]
    self.keys_DataContainercaseForDataOwners = [];
    self.keys_viewpointcaseForDataOwners = [];
    self.keys_DatacontainersForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "Create Object", "DeleteContainer", "copy", "delete from bag"];
    self.keys_DatacontainersForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "copy", "delete from bag"];
    self.keys_DatablockForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "copy", "AddParameter", "DeleteContainer"];
    self.keys_DatablockForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "copy"];
    self.keys_ParameterForDataUsers = ["NodeInfos", "delete from bag", "AddParameter"];
    self.keys_ParameterForDataOwners = ["NodeInfos", "delete from bag", "AddParameter"];
    self.keys_viewpointForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object"];
    self.keys_viewpointForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object"];
    self.keys_studyscenarioForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object", "DeleteContainer"];
    self.keys_studyscenarioForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object"];
    self.keys_disciplineForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object", "DeleteContainer", "Delete"];
    self.keys_disciplineForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object"];
    self.keys_BOForDataOwners = ["NodeInfos", "Link to ..."];
    self.keys_BOForDataUsers = ["NodeInfos", "Link to ..."];
    self.keys_attributeBoForDataOwners = ["NodeInfos", "Link to ..."];
    self.keys_attributeBoForDataUsers = ["NodeInfos", "Link to ..."];

    // all buttons availables in a dict with their linked function
    self.all_IDCPitemscontextmenu = {
        NodeInfos: {
            label: "Modify name or informations",
            action: function (_e) {
                self.IDCP_restrainednodeinfo_andmodification(_e);
            },
        },
        GraphContainerDescendantAndLeaves: {
            label: "display graphically",
            action: function (_e) {
                self.IDCPDisplayGraphContainersLeaves(_e);
            },
        },

        AddParameter: {
            label: "Add a new parameter",
            action: function (_e) {
                self.IDCPAddNode(_e);
            },
        },
        DeleteContainer: {
            label: "Delete ",
            action: function (_e) {
                var source = self.identify_source(_e);
                Lineage_containers.deleteContainer(source, Lineage_containers.currentContainer);
                //self.IDCP_fillJstreeTypes();
            },
        },
        copy: {
            label: "Copy ",
            action: function (_e) {
                self.IDCP_copy_container(_e);
            },
        },
        paste: {
            label: "Paste ",
            action: function (_e) {
                self.IDCP_paste_container(_e);
            },
        },

        "delete from bag": {
            label: "delete from bag ",
            action: function (_e) {
                self.IDCP_delete_from_bag();
            },
        },
        "Create Object": {
            label: "Create New DataContainer ",
            action: function (_e) {
                self.idcp_addDataContainer(_e);
            },
        },
        "Link to ...": {
            label: "Link to ... ",
            action: function (_e) {
                self.LinkingIDCPtoBO(_e);
            },
        },
    };

    self.nocorresponding = function (step) {
        //if step=0 Manually create the node
        //if step=1--> alert search for a business object instead, Destroy parameter field,
        //apply field BOsearch on BO and destroy onchange function on Name parameter
        //change none button parameter at step 0

        $("#parameter_uri").val();
        $("#bo_uri").val();
        $("#parameter_uri").val();
        //1st click
        if (step == 1) {
            //IS a property
            if ($("#property_uri").val()) {
                // Not filled property
                if ($("#property_uri").val() == "fill it with the tree") {
                    if ($("#LineageBlend_creatingNodeNewClassLabel").val() == "") {
                        var parameter_answer = prompt("You didn't enter a property name, enter one and try to search one on tree corresponding to your object and link it");
                        $("#LineageBlend_creatingNodeNewClassLabel").val(parameter_answer);
                        self.fieldBOsearch(parameter_answer, "prop");
                    } else {
                        alert("You have not found property associed so we will create you it, but we need you to select a adapted parameter");
                        $("#property_uri").val("None");
                        $("#parameter_uri").val("fill it to search");
                        $("#parameter_uri").attr("readonly", false);
                        $("#parameter_uri").attr("onchange", "Idcp.fieldBOsearch(this,'param');");

                        $("#None_are_relevant").attr("onclick", "Idcp.nocorresponding(2);");
                    }

                    // Parameter search tree on parameter
                    // decoch read only
                    //enelver fill it with tree
                    //step = 2
                }
                // Filled property--> Parameter or BO probably not filled
                else {
                    if ($("#parameter_uri").val() != "fill it with the tree" && $("#bo_uri").val() != "fill it with the tree") {
                        alert("You filled everything click on ok to create your parameter");
                    } else {
                        alert("Unidentified case");
                    }
                }
            } else {
                // Is parameter

                if ($("#parameter_uri").val() == "fill it with the tree") {
                    if ($("#LineageBlend_creatingNodeNewClassLabel").val() == "") {
                        var parameter_answer = prompt("You didn't enter a parameter name, enter one and try to search a parameter on tree corresponding to your object and link it");
                        $("#LineageBlend_creatingNodeNewClassLabel").val(parameter_answer);
                        self.fieldBOsearch(parameter_answer, "param");
                    } else {
                        $("#parameter_uri").val("None");
                        $("#bo_uri").val("fill it to search");
                        $("#bo_uri").attr("readonly", false);
                        $("#bo_uri").attr("onchange", "Idcp.fieldBOsearch(this,'param');");
                        $("#None_are_relevant").attr("onclick", "Idcp.nocorresponding(2);");
                    }
                } else {
                    alert("You filled everything click on ok to create your parameter");
                }
            }
        }
        if (step == 2) {
            if ($("#property_uri").val()) {
                if ($("#parameter_uri").val() == "fill it to search" || $("#parameter_uri").val() == "") {
                    var parameter_answer = prompt("You didn't enter a parameter name, enter one and try to search a parameter on tree corresponding to your object and link it");
                    $("#parameter_uri").val(parameter_answer);
                } else {
                    if ($("#bo_uri").val() == "fill it with the tree") {
                        var parameter_answer = prompt("You didn't enter a Business object  name, enter one here and try to search on tree a corresponding one  and link it to your object");
                        $("#bo_uri").val(parameter_answer);
                        $("#bo_uri").attr("readonly", false);
                        $("#bo_uri").attr("onchange", "Idcp.fieldBOsearch(this,'bo');");
                    } else {
                        alert("Sorry, we have not your business object in our database, Click on Ok and it will be created with your new parameter");
                    }
                }
            } else {
                if ($("#bo_uri").val() == "fill it to search" || $("#bo_uri").val() == "") {
                    var parameter_answer = prompt("You didn't enter a Business object  name, enter one here and try to search on tree a corresponding one  and link it to your object");
                    $("#bo_uri").val(parameter_answer);
                } else {
                    alert("Sorry, we have not your business object in our database, Click on Ok and it will be created with your new parameter");
                }
            }
        }
    };

    self.fieldBOsearch = function (text, param) {
        //property,BO,parameter
        //BO = self.boURI self.logicalentityURI
        //param = (self.attributeBoURI + self.attributeLEURI)--> bags
        //prop = self.enumerationBOURI + self.enumerationLEURI (self.attributeBoURI + self.attributeLEURI)-> classes
        if (param == "bo") {
            var filtertype = [self.boURI, self.logicalentityURI];
        }
        if (param == "param") {
            var filtertype = [self.attributeBoURI, self.attributeLEURI];
        }
        if (param == "prop") {
            var filtertype = [self.enumerationBOURI, self.enumerationLEURI, self.attributeBoURI, self.attributeLEURI];
        }
        if (filtertype) {
            filtertype = filtertype.reduce((accumulator, currentValue) => accumulator + '","' + currentValue);
            filtertype += '"';
            filtertype = '"' + filtertype;
        }
        self.IDCPBOsearch(text.value, filtertype);
    };

    self.LinkingIDCPtoBO = function (e) {
        var key_id = e.reference.prevObject.selector.replace("#", "");
        var source = self.identify_source(e);
        if (source == self.source) {
            var jstreeDiv = "#lineage_containers_containersJstree";
        } else {
            var jstreeDiv = "#lineage_containers_containersJstree_BO";
        }
        var data = $(jstreeDiv).jstree()._model.data[key_id].data;
        if (data.currentParent) {
            var parent = $(jstreeDiv).jstree()._model.data[data.currentParent].data;
        } else {
            var key_id_parent = $(jstreeDiv).jstree()._model.data[key_id].parent;
            var parent = $(jstreeDiv).jstree()._model.data[key_id_parent].data;
        }

        var types = data["rdf:types"];
        var subclass = data["rdf:subclass"];
        if (subclass) {
            //BOS
            if (subclass.includes(self.boURI) | subclass.includes(self.logicalentityURI)) {
                $("#bo_uri").val(data.id);
            }
            //Properties
            if (subclass.includes(self.attributeBoURI) | subclass.includes(self.attributeLEURI)) {
                if (types.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag")) {
                    $("#parameter_uri").val(data.id);
                    $("#bo_uri").val(parent.id);
                } else {
                    // Les attributs de BO et LE qui correspondent à des properties
                    if ($("#property_uri").val()) {
                        $("#property_uri").val(data.id);
                        $("#bo_uri").val(parent.id);
                        $("#parameter_uri").val("None");
                        //Destroy button No relevant items
                    } else {
                        alert("This is a property not a parameter , you cannnot choose it here");
                    }
                }
            }
        }
        if (types) {
            //Properties
            if (types.includes(self.enumerationBOURI) | types.includes(self.enumerationLEURI)) {
                if ($("#property_uri").val()) {
                    $("#property_uri").val(data.id);
                    $("#parameter_uri").val(parent.id);
                    if (parent.currentParent) {
                        var ancestor = $(jstreeDiv).jstree()._model.data[parent.currentParent].data;
                    } else {
                        var key_id_ancestor = $(jstreeDiv).jstree()._model.data[key_id_parent].parent;
                        var ancestor = $(jstreeDiv).jstree()._model.data[key_id_ancestor].data;
                    }
                    $("#bo_uri").val(ancestor.id);
                } else {
                    alert("You are linking a parameter to a property");
                }
            }
        }
    };

    self.listRessource_BO = function (source, containerNode, options, callback) {
        var existingChildren = [];

        if (containerNode.children.length > 0) return;

        Lineage_containers.sparql_queries.getContainerDescendants(source, containerNode ? containerNode.data.id : null, options, function (err, result) {
            if (err) {
                return alert(err.responseText);
            }

            var existingNodes = {};
            if (containerNode) {
                // existingNodes=$("#lineage_containers_containersJstree").jstree().get_node(containerNode.id).children;
                var jstreeChildren = common.jstree.getNodeDescendants("lineage_containers_containersJstree_BO", containerNode.id, 2);
                jstreeChildren.forEach(function (item) {
                    existingNodes[item.data.id] = 1;
                });
            }

            var jstreeData = [];
            var nodesMap = {};

            result.results.bindings.forEach(function (item) {
                //  var nodeId=item.parent+"_"+item.member.value
                item.jstreeId = "_" + common.getRandomHexaId(5);
                nodesMap[item.member.value] = item;
            });

            for (var key in nodesMap) {
                var item = nodesMap[key];

                var containerJstreeId = "#";
                var continerDataId = null;
                if (containerNode) {
                    containerJstreeId = containerNode.id;
                    continerDataId = containerNode.data.id;
                }

                var parent = item.parent.value == continerDataId ? containerJstreeId : nodesMap[item.parent.value] ? nodesMap[item.parent.value].jstreeId : "#";
                if (!existingNodes[item.member.value]) {
                    existingNodes[item.member.value] = 1;
                    var type = "class";
                    if (item.memberTypes.value.indexOf("Bag") > -1 || item.memberTypes.value.indexOf("List") > -1) {
                        type = "container";
                    }
                    jstreeData.push({
                        id: item.jstreeId,
                        text: item.memberLabel.value,
                        parent: parent,
                        type: type,
                        data: {
                            type: type,
                            source: source,
                            id: item.member.value,
                            label: item.memberLabel.value,
                        },
                    });
                }
            }

            common.jstree.addNodesToJstree("lineage_containers_containersJstree_BO", containerJstreeId, jstreeData);
            if (err) {
                return alert(err.responseText);
                if (callback) {
                    return callback(err);
                }
            }
            if (callback) {
                return callback(jstreeData);
            }
        });
    };

    // Functions writed for IDCP use case
    self.onSelectedNodeTreeclick = function (event, obj) {
        Lineage_containers.currentContainer = obj.node;
        //! from right click
        if (obj.event.button != 2) {
            if (Lineage_containers.currentContainer.data.source == self.source) {
                Lineage_containers.listContainerResources(Lineage_sources.activeSource, Lineage_containers.currentContainer, { onlyOneLevel: true, leaves: true }, function (nodes_added) {
                    self.IDCP_fillJstreeTypes(nodes_added);
                });
            } else {
                self.listRessource_BO(self.BO_source, Lineage_containers.currentContainer, { onlyOneLevel: true, leaves: true }, function (nodes_added) {
                    self.IDCP_fillJstreeTypes(nodes_added, "#lineage_containers_containersJstree_BO");
                });
            }
        }
        // Arborescence construction specific nodes

        var uri = obj.node.data.id;
        // Datacontainer case
        if (uri == self.datacontainerUri) {
            if (self.isDataOwner) {
                var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DataContainercaseForDataOwners);
                //filtred_contextmenu["Create Object"].label="Create new DataContainer"
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
            } else {
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = {};
            }
        }
        // ViewPoint case
        else if (uri == self.viewpointuri) {
            if (self.isDataOwner) {
                var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_viewpointcaseForDataOwners);
                //filtred_contextmenu["Create Object"].label="Create new viewpoint"
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
            } else {
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = {};
            }
        }

        // Verification on JS Tree
        // types
        else {
            //get type on Js tree
            var types = obj.node.data["rdf:types"];
            var subclass = obj.node.data["rdf:subclass"];
            if (types) {
                if (types.includes(self.datacontainerUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DatacontainersForDataOwners);
                        filtred_contextmenu["Create Object"].label = "Create new DataBlock";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DatacontainersForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataBlock";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.datablockURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DatablockForDataOwners);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DatablockForDataUsers);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.proprieteUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_ParameterForDataOwners);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_ParameterForDataUsers);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.viewpointuri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_viewpointForDataOwners);
                        filtred_contextmenu["Create Object"].label = "Create new " + obj.node.data.label;
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_viewpointForDataUsers);
                        filtred_contextmenu["Create Object"].label = "Create new " + obj.node.data.label;
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.studyscenarioUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_studyscenarioForDataOwners);
                        filtred_contextmenu["Create Object"].label = "Create new Element";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_studyscenarioForDataUsers);
                        filtred_contextmenu["Create Object"].label = "Create new Element";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.disciplineUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_disciplineForDataOwners);
                        filtred_contextmenu["Create Object"].label = "Create new DataContainer";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_disciplineForDataUsers);
                        filtred_contextmenu["Create Object"].label = "Create new DataContainer";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.enumerationBOURI) | types.includes(self.enumerationLEURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else {
                    var filtred_contextmenu = self.IDCP_filtredkeysmenu(["GraphContainerDescendantAndLeaves"]);
                    $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items = filtred_contextmenu;
                }
            }
            if (subclass) {
                if (subclass.includes(self.boURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_BOForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new Parameter";
                        $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_BOForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new Parameter";
                        $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (subclass.includes(self.attributeBoURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else {
                    var filtred_contextmenu = self.IDCP_filtredkeysmenu(["GraphContainerDescendantAndLeaves"]);
                    $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
                }
            }
            if (!filtred_contextmenu) {
                var filtred_contextmenu = self.IDCP_filtredkeysmenu(["GraphContainerDescendantAndLeaves"]);
                $("#lineage_containers_containersJstree_BO").jstree().settings.contextmenu.items = filtred_contextmenu;
            }
        }
    };

    self.IDCP_fillJstreeTypes = function (nodetoaddtypes, JstreeDiv) {
        if (!JstreeDiv) {
            var JstreeDiv = "#lineage_containers_containersJstree";
        }

        if (!nodetoaddtypes) {
            var all_jskeys = $(JstreeDiv).jstree()._model.data;
        } else {
            if (Array.isArray(nodetoaddtypes)) {
                var all_jskeys = nodetoaddtypes;
            } else {
                var all_jskeys = [nodetoaddtypes];
            }
        }
        if (Array.isArray(all_jskeys)) {
            var dictjskeys = {};
            all_jskeys.forEach((element) => {
                dictjskeys[element.id] = element;
            });
            all_jskeys = dictjskeys;
        }

        if (JstreeDiv == "#lineage_containers_containersJstree") {
            var source = self.source;
        } else {
            var source = self.BO_source;
        }
        var source_uri = Config.sources[source].graphUri;
        var url = Config.sources[source].sparql_server.url;

        var all_uris_to_found = [];
        var uri_key_mapping = {};
        Object.entries(all_jskeys).forEach(([key, value]) => {
            var key_id = value.id;
            if (key_id != "#") {
                var uri = value.data.id;
                all_uris_to_found.push(uri);
                uri_key_mapping[uri] = key_id;
            }
        });
        var initialValue = "";
        var filter_text = all_uris_to_found.reduce((accumulator, currentValue) => accumulator + '","' + currentValue, initialValue);
        var query = `
            PREFIX http: <http://www.w3.org/2011/http#>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX owl: <http://www.w3.org/2002/07/owl#>
            select * 
            FROM NAMED <${source_uri}>
            where
            {GRAPH ?g
            {   ?URI rdfs:label ?label.
    			OPTIONAL{
                    ?URI rdf:type ?type.
                    
                   
                }
    			OPTIONAL{
                    ?URI rdfs:subClassOf ?class.
                    
                    
                }
                
                filter(str(?URI) in ("${filter_text}")).
            }}`;

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return err;
            }

            result.results.bindings.forEach((element) => {
                var key_id = uri_key_mapping[element.URI.value];
                var jstree_data = $(JstreeDiv).jstree()._model.data[key_id].data;
                if (element.type) {
                    if (jstree_data["rdf:types"]) {
                        jstree_data["rdf:types"].push(element.type.value);
                    } else {
                        jstree_data["rdf:types"] = [element.type.value];
                    }
                }
                if (element.class) {
                    if (jstree_data["rdf:subclass"]) {
                        jstree_data["rdf:subclass"].push(element.class.value);
                    } else {
                        jstree_data["rdf:subclass"] = [element.class.value];
                    }
                }
            });
        });
    };

    self.IDCP_filtredkeysmenu = function (list_of_keys) {
        return Object.fromEntries(Object.entries(self.all_IDCPitemscontextmenu).filter(([key]) => list_of_keys.includes(key)));
    };
    // delete from bag
    //This function is called uniquely where we have the rights
    self.IDCPBOsearch = function (textfilter, typefilter, callback) {
        var filter = "";

        if (textfilter) {
            filter += `filter(contains(lcase(?memberLabel),lcase('${textfilter}'))).`;
        }
        if (typefilter) {
            filter += `filter(str(?memberType) in (${typefilter})||str(?subclasstype) in (${typefilter})).`;
        }
        /*var query =`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
       select distinct *  FROM   <http://datalenergies.total.com/resource/tsf/gidea-raw/>
       where {?member rdfs:label ?memberLabel.
       ?member rdf:type ?memberType.
       OPTIONAL{?member rdfs:subClassOf ?subclasstype.}
       ?member ^rdfs:member*  ?o.

       filter(?o in(<http://datalenergies.total.com/resource/tsf/gidea-raw/bag/SABOATTR-GIDEA>,<http://datalenergies.total.com/resource/tsf/gidea-raw/bag/SAAPPLEATTR-GIDEA>)).
       filter(?memberType in (rdf:Bag,rdf:List)).
       
       ${filter}
       OPTIONAL {?member ^rdfs:member ?parentContainer.?parentContainer rdf:type ?type.filter (?type in (rdf:Bag,rdf:List)).?parentContainer rdfs:label ?parentContainerLabel} }
       ` 
       filter (?type in (rdf:Bag,rdf:List)).
       */

        var query = `
       PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
       PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
       select distinct *  FROM   <http://datalenergies.total.com/resource/tsf/gidea-raw/>
	   
       where {
  		VALUES (?o) {
    	(<http://datalenergies.total.com/resource/tsf/gidea-raw/bag/SABOATTR-GIDEA>)
    	(<http://datalenergies.total.com/resource/tsf/gidea-raw/bag/SAAPPLEATTR-GIDEA>)
         
  		}
  	    ?member rdfs:label ?memberLabel.
        ?member rdf:type ?memberType.
       
        ?member ^rdfs:member*  ?o.
  		?member ^rdfs:member ?parentContainer.
        ?parentContainer rdf:type ?type.
        filter (?type in (rdf:Bag,rdf:List)).
        ?parentContainer rdfs:label ?parentContainerLabel

       
        
        OPTIONAL{?member rdfs:subClassOf ?subclasstype.}
       
       ${filter}
      }
       
       
       
       
       
       
       
       `;
        var sparql_url = Config.sources[self.BO_source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        var options = {};

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: self.BO_source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var nodesMap = {};

            result.results.bindings.forEach(function (item) {
                //  var nodeId=item.parent+"_"+item.member.value

                item.jstreeId = "_" + common.getRandomHexaId(5);
                nodesMap[item.member.value] = item;
            });
            var uniqueNodes = {};

            var jstreeData = [];

            for (var nodeId in nodesMap) {
                var item = nodesMap[nodeId];
                var parent = "#";

                var memberType = "container";

                parent = item.parentContainer && nodesMap[item.parentContainer.value] ? nodesMap[item.parentContainer.value].jstreeId : "#";
                if (!uniqueNodes[item.jstreeId]) {
                    uniqueNodes[item.jstreeId] = 1;
                    var node = {
                        id: item.jstreeId,
                        text: item.memberLabel.value,
                        parent: parent,

                        data: {
                            source: self.BO_source,
                            id: item.member.value,
                            label: item.memberLabel.value,
                            currentParent: parent,
                            tabId: options.tabId,
                        },
                    };
                    jstreeData.push(node);
                }
            }

            var jstreeOptions;
            if (options.jstreeOptions) {
                jstreeOptions = options.jstreeOptions;
            } else {
                jstreeOptions = {
                    openAll: false,
                    contextMenu: Lineage_containers.getContextJstreeMenu(),
                    selectTreeNodeFn: Lineage_containers.onSelectedNodeTreeclick,
                    dnd: {
                        drag_stop: function (data, element, helper, event) {
                            self.onMoveContainer(data, element, helper, event);
                        },
                        drag_start: function (data, element, helper, event) {
                            var sourceNodeId = element.data.nodes[0];
                            self.currenDraggingNodeSourceParent = $("#lineage_containers_containersJstree_BO").jstree().get_node(sourceNodeId).parent;
                        },
                    },
                };
            }

            common.jstree.loadJsTree("lineage_containers_containersJstree_BO", jstreeData, jstreeOptions, function () {
                $("#" + "lineage_containers_containersJstree_BO")
                    .jstree()
                    .open_node("#");
                self.IDCP_fillJstreeTypes(null, "#lineage_containers_containersJstree_BO");
            });
        });
    };
    self.IDCPsearch = function () {
        Lineage_containers.search(self.IDCP_fillJstreeTypes);
    };
    self.IDCP_delete_from_bag = function () {
        var uri = Lineage_containers.currentContainer.data.id;
        var parent_uri = $("#lineage_containers_containersJstree").jstree()._model.data[Lineage_containers.currentContainer.parent].data.id;
        Sparql_generic.deleteTriples(self.source, parent_uri, "http://www.w3.org/2000/01/rdf-schema#member", uri, function (err, _result) {
            $("#lineage_containers_containersJstree").jstree().delete_node(Lineage_containers.currentContainer.id);
        });
    };

    //copy
    self.IDCP_copy_container = function (e) {
        var source = self.identify_source(e);
        if (source == self.source) {
            var jstreeDiv = "#lineage_containers_containersJstree";
        } else {
            var jstreeDiv = "#lineage_containers_containersJstree_BO";
        }
        SourceBrowser.copyNode(e);
        var selectedNodes = $(jstreeDiv).jstree().get_selected(true);
        Lineage_common.copyNodeToClipboard(selectedNodes);
    };
    //paste
    self.IDCP_paste_container = function (e) {
        var source = self.identify_source(e);
        //Controller la valeur avant de la coller
        common.pasteTextFromClipboard(function (text) {
            // debugger
            if (!text) {
                return MainController.UI.message("no node copied");
            }
            try {
                var nodes = JSON.parse(text);
                var nodesData = [];
                nodes.forEach(function (node) {
                    if (node.data) {
                        nodesData.push(node.data);
                    }
                });

                self.addResourcesToContainer(source, Lineage_containers.currentContainer, nodesData);
            } catch (e) {
                console.log("wrong clipboard content");
            }
            return;
        });
    };

    self.identify_source = function (e) {
        var jstreeid = e.reference.prevObject.selector.replace("#", "");
        var jstree_DC = $("#lineage_containers_containersJstree").jstree()._model.data;

        if (jstree_DC[jstreeid]) {
            var source = self.source;
        } else {
            var source = self.BO_source;
        }
        return source;
    };
    self.IDCP_restrainednodeinfo_andmodification = function (e) {
        var source = self.identify_source(e);
        SourceBrowser.showNodeInfos(source, Lineage_containers.currentContainer, "mainDialogDiv");
        /*
        if(!(Lineage_sources.isSourceEditable(self.source))){
            
            $(document).ready(function () {
                console.log($(".infosTable").children());
            }
        }
        */
    };

    self.IDCPAddNode = function (e) {
        $("<div>").dialog({
            modal: true,
            open: function () {
                var dialog = $(this);
                var key_id = e.reference.prevObject.selector.replace("#", "");
                var source = self.identify_source(e);
                $(this).load("snippets/lineage/lineageAddNodeDialog.html #LineageBlend_creatingNodeSingleTab", function () {
                    self.adding_parameter_hide();
                    $("#LineageBlend_creatingNodeClassDiv").load("snippets/commonUIwidgets/editPredicateDialog.html", function () {
                        CommonUIwidgets.predicatesSelectorWidget.init(source, function () {
                            CommonUIwidgets.predicatesSelectorWidget.setVocabulariesSelect(source, "_curentSourceAndImports");
                            self.widget_preselection_and_hide(dialog, e);

                            $("#unit_of_mesure").append(`<option id='blank_unit'></option>`);
                            self.units_available.forEach((unit) => {
                                var unit_uri = unit[0];
                                var unit_name = unit[1];
                                $("#unit_of_mesure").append(`<option id=${unit_uri}>${unit_name}</option>`);
                            });
                        });
                    });
                });
            },
            height: 1200,
            width: 1500,
            title: "Renseign your parameter",
            close: function () {
                $("#rightPanelDiv").empty();
                $("#centralPanelDiv").parent().append($("#rightPanelDiv"));
                $(this).dialog("close");
                $(this).remove();
            },
        });
    };
    self.IDCPDisplayGraphContainersLeaves = function (e) {
        var source = self.identify_source(e);
        Lineage_containers.graphResources(source, Lineage_containers.currentContainer.data, { leaves: true }, function () {
            $(".vis-manipulation").remove();
            $(".vis-close").remove();
            if (!self.loadedGraphDisplay) {
                $("#graphDiv").prepend(self.buttonIDCPClearAll);
                self.loadedGraphDisplay = true;
            }
        });
    };

    self.idcp_addDataContainer = function (e) {
        var key_id = e.reference.prevObject.selector.replace("#", "");
        var source = self.identify_source(e);
        if (source == self.source) {
            var jstreeDiv = "#lineage_containers_containersJstree";
        } else {
            var jstreeDiv = "#lineage_containers_containersJstree_BO";
        }
        var uri = $(jstreeDiv).jstree()._model.data[key_id].data.id;
        var label = $(jstreeDiv).jstree()._model.data[key_id].data.label;
        var types = $(jstreeDiv).jstree()._model.data[key_id].data["rdf:types"];
        var subclass = $(jstreeDiv).jstree()._model.data[key_id].data["rdf:subclass"];
        if (types) {
            if (types.includes(self.datacontainerUri)) {
                label = "Datablock";
                uri = self.datablockURI;
            }
            if (types.includes(self.disciplineUri)) {
                label = "DataContainer";
                uri = self.datacontainerUri;
            }
        }

        // change by enter the type of the object instead container
        var newContainerLabel = prompt(`enter new ${label} label`);
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
        if (subclass) {
            if (subclass.includes(self.boURI)) {
                uri = self.parameterUri;
                triples.push({
                    subject: "<" + containerUri + ">",
                    predicate: "rdfs:subClassOf",
                    object: "http://datalenergies.total.com/resource/tsf/gidea-raw/Attribute-BO",
                });
            }
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
        // to change with type of triple selected
        triples.push({
            subject: containerUri,
            predicate: "rdf:type",
            object: uri,
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

            if (!$(jstreeDiv).jstree) {
                // initialize jstree
                self.search(function (err, result) {
                    $(jstreeDiv)
                        .jstree()
                        .create_node(parent, newNode, "first", function (err, result) {
                            $(jstreeDiv).jstree().open_node(parent);
                        });
                });
            } else {
                $(jstreeDiv)
                    .jstree()
                    .create_node(parent, newNode, "first", function (err, result) {
                        $(jstreeDiv).jstree().open_node(parent);
                    });
                self.IDCP_fillJstreeTypes(newNode, jstreeDiv);
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

    self.widget_preselection_and_hide = function (dialog, e) {
        // Preselect widget options and hide
        var key_id = e.reference.prevObject.selector.replace("#", "");
        var source = self.identify_source(e);
        if (source == self.source) {
            var jstreeDiv = "#lineage_containers_containersJstree";
        } else {
            var jstreeDiv = "#lineage_containers_containersJstree_BO";
        }
        var data = $(jstreeDiv).jstree()._model.data[key_id].data;

        var parameter_menu = $("#editPredicate_objectSelect");
        parameter_menu.append(`<option value="${self.parameterUri}">Parameter</option>`);
        parameter_menu.val(self.parameterUri);
        $("#button_Class_to_creatingNodeMenu").removeAttr("onclick");

        $("#button_Class_to_creatingNodeMenu").attr("onclick", `Idcp.idcp_addParameter('${dialog.get(0).id}','${source}');`);
        $("#LineageBlend_creatingNodeClassDiv").css("display", "none");

        var label_parent = $("#LineageBlend_creatingNodeNewClassLabel").parent();

        $("#LineageBlend_creatingNodeSingleTab").append($("#rightPanelDiv"));
        self.loadBOtree();
        $("#Lineage_containers_searchInput_BO").remove();

        label_parent.append('<br><br>Unit of mesure <select name="unit" id="unit_of_mesure" ></select>');
        label_parent.append('<br><br>Definition : <br><textarea style="width: 528px" style="margin: 10px" id="LineageBlend_creatingNodeNewClassDefinition"></textarea><br>');

        if (data["rdf:types"].includes(self.datablockURI)) {
            label_parent.append('<br><br>Business Object : <input id="bo_uri" value="fill it with the tree"  readonly>');
            label_parent.append('<br><br>Parameter : <input id="parameter_uri" value="fill it with the tree"  readonly><br><br>');
            label_parent.html(label_parent.html().replace("rdfs:label", "Name of the new Parameter"));
            $("#LineageBlend_creatingNodeNewClassLabel").attr("onchange", "Idcp.fieldBOsearch(this,'param');");
        }

        $("#LineageBlend_creatingNodeSingleTab").css({
            display: "flex",
            "align-content": "center",
            "align-items": "stretch",
            "flex-direction": "row",
        });

        if (data["rdf:types"].includes(self.proprieteUri)) {
            var balise_id = dialog.context.id;
            var split = balise_id.split("-");
            var title_number = parseInt(split[split.length - 1]) + 1;
            var title_id = split[0] + "-" + split[1] + "-" + title_number;
            $("#" + title_id).text("Reseign your property");

            label_parent.append('<br><br>Business Object : <input id="bo_uri" value="fill it with the tree"  readonly>');
            label_parent.append('<br><br>Parameter : <input id="parameter_uri" value="fill it with the tree"   readonly>');
            label_parent.append('<br><br>Property : <input id="property_uri" value="fill it with the tree"  readonly><br><br>');
            label_parent.html(label_parent.html().replace("rdfs:label", "Name of the new Property"));
            $("#LineageBlend_creatingNodeNewClassLabel").attr("onchange", "Idcp.fieldBOsearch(this,'prop');");
        }
        label_parent.append('<br><br><button id="None_are_relevant" class="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Idcp.nocorresponding(1)">None items are relevant</button><br><br>');
        $("#button_Class_to_creatingNodeMenu").appendTo($("#LineageBlend_creatingNodeNewClassLabel").parent());
    };
    self.idcp_addParameter = function (dialogdiv, source) {
        //get source of clicked node

        Lineage_sources.activeSource = source;

        //take the label and initiate triples
        Lineage_blend.graphModification.currentCreatingNodeType = "Class";
        Lineage_blend.graphModification.creatingsourceUri = undefined;
        Lineage_blend.graphModification.addClassOrIndividualTriples();

        //recreate node object
        var uri = Lineage_blend.graphModification.creatingNodeTriples[0]["subject"];
        var label_node = Lineage_blend.graphModification.creatingNodeTriples[0]["object"];
        var node = { source: self.source, label: label_node, id: uri };

        // Add the definition as triple to the new node
        var definition = $("#LineageBlend_creatingNodeNewClassDefinition").val();
        var definition_triple = {};
        definition_triple["subject"] = uri;
        definition_triple["predicate"] = "rdfs:isDefinedBy";
        definition_triple["object"] = definition;
        Lineage_blend.graphModification.creatingNodeTriples.push(definition_triple);

        Lineage_blend.graphModification.createNode();
        //Add new node to the desired container
        Lineage_containers.addResourcesToContainer(Lineage_sources.activeSource, Lineage_containers.currentContainer, node);

        //Display new parameter and the button clear all
        $(document).ready(function () {
            Lineage_containers.graphResources(Lineage_sources.activeSource, Lineage_containers.currentContainer.data, { leaves: true }, function () {
                $(".vis-manipulation").remove();
                $(".vis-close").remove();
                if (!self.loadedGraphDisplay) {
                    $("#graphDiv").prepend(self.buttonIDCPClearAll);
                    self.loadedGraphDisplay = true;
                }
            });
        });
    };
    self.loadBOtree = function () {
        $("#rightPanelDiv").load("/vocables/snippets/lineage/lineageRightPanel.html #LineageContainersTab", function () {
            var all_right_pannel_descendants = $("#rightPanelDiv").find("*");
            console.log(all_right_pannel_descendants);
            for (let i = 0; i < all_right_pannel_descendants.length; i++) {
                all_right_pannel_descendants[i].id += "_BO";
            }

            $("#Lineage_containers_searchWhatInput_BO").hide();
            $("#Lineage_addContainer_button_BO").remove();
            $("#Lineage_containers_searchInput_BO").parent().append($("#search_button_container_BO"));

            $("#search_button_container_BO").removeAttr("onclick");
            $("#search_button_container_BO").attr("onclick", "Idcp.IDCPBOsearch();");

            $("#search_button_container_BO").remove();
            $("#Lineage_containers_searchInput_BO").remove();
            self.IDCPBOsearch();
        });
    };

    self.onLoaded = function () {
        Lineage_blend.graphModification.creatingNodeTriples = [];

        Lineage_sources.activeSource = self.source;
        $("#rightPanelDiv").empty();
        var width = MainController.UI.initialGraphDivWitdh * 0.8;
        $("#graphDiv").css("width", width);

        $("#actionDivContolPanelDiv").remove();
        $("#actionDiv").remove();

        var search_pannel = $("#toolPanelDiv").append("<div id='IDCP search pannel'>Search Datacontainers</div>");
        var html_content = search_pannel.append("<div id='IDCP right pannel'></div>");

        // Load DataContainer Search part
        html_content.load("/vocables/snippets/lineage/lineageRightPanel.html #LineageContainersTab", function () {
            //interface modfis
            $("#Lineage_containers_searchWhatInput").hide();
            $("#toolPanelLabel").text("IDCP DataConainers Search");
            //$("#Lineage_addContainer_button").text("Create New DataConainer ");
            $("#Lineage_addContainer_button").remove();

            //Search button modifs
            $("#Lineage_containers_searchInput").parent().append($("#search_button_container"));

            $("#search_button_container").removeAttr("onclick");
            $("#search_button_container").attr("onclick", "Idcp.IDCPsearch();");

            //Initialize Jstree
            //Lineage_containers.search(self.IDCP_fillJstreeTypes);
            self.IDCPsearch();
            //self.IDCP_fillJstreeTypes();

            $("#graphDiv").text("");

            $("#graphDiv").prepend(self.buttonIDCPClearAll);
            Lineage_containers.onSelectedNodeTreeclick = self.onSelectedNodeTreeclick;

            //var sourceVariables = Sparql_generic.getSourceVariables(self.source);
            var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";
            var query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            SELECT * FROM NAMED <http://datalenergies.total.com/resource/tsf/idcp_v2/> WHERE {
              GRAPH  ?g {
              ?sub rdfs:subClassOf <http://datalenergies.total.com/resource/tsf/idcp_v2/unit_of_measure> .
              ?sub rdfs:label ?o.
              }
            } 
            `;

            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: self.source }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                var units = result.results.bindings;
                units = units.map((result) => [result.sub.value, result.o.value]);
                //result.o.value}
                self.units_available = units;
            });

            if (Lineage_sources.isSourceEditableForUser(self.source)) {
                $("#Lineage_addContainer_button").removeAttr("onclick");

                $("#Lineage_addContainer_button").attr("onclick", "Idcp.idcp_addDataContainer();");
                //Lineage_containers.getContextJstreeMenu = self.buttonForIDCPDataOwner;
                self.isDataOwner = true;
            } else {
                $("#Lineage_addContainer_button").remove();
                Lineage_containers.getContextJstreeMenu = self.buttonForIDCPDataReader;
                self.isDataOwner = false;
            }
        });

        // Load BO Search part
        // TO remove
        //self.loadBOtree();
    };

    return self;
})();
