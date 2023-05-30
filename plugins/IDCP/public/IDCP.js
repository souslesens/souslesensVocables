//import Lineage_classes from "../../../public/vocables/modules/tools/lineage/lineage_classes. $("#bo_uri").js";

//import Sparql_generic from "../../../public/vocables/modules/sparqlProxies/sparql_generic";

//import JstreeWidget from "../../../public/vocables/modules/uiWidgets/jstreeWidget";

//import Lineage_containers from "../../../public/vocables/modules/tools/lineage/lineage_containers";

var Idcp = (function () {
    var self = {};

    // source & rights
    self.loadedGraphDisplay = false;
    self.source = "IDCP_V2";
    self.BO_source = "GIDEA-RAW-2";
    self.isDataOwner = null;
    self.isAssociating = false;
    // units
    self.units_available = {};

    //Last clicked of tree IDCP keep in memory when it's ecrased on self.current container trough the second tree

    self.last_IDCP_container = null;

    //URI required
    self.datacontainerUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/DataContainer";
    self.datablockURI = "http://datalenergies.total.com/resource/tsf/idcp_v2/DataBloc";
    self.parameterUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/Parameter";
    self.proprieteUri = "http://datalenergies.total.com/resource/tsf/idcp_v2/properties";
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
    //["NodeInfos","GraphContainerDescendantAndLeaves" ,"AddParameter" ,"DeleteContainer" ,"copy" ,"paste" ,"delete from bag","Create Object","Link to ..."]
    self.keys_DataContainercaseForDataOwners = [];
    self.keys_viewpointcaseForDataOwners = [];
    self.keys_DatacontainersForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "Create Object", "DeleteContainer", "copy", "delete from bag"];
    self.keys_DatacontainersForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "copy", "delete from bag"];
    self.keys_DatablockForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "copy", "AddParameter", "DeleteContainer", "delete from bag"];
    self.keys_DatablockForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "copy"];
    self.keys_ParameterForDataUsers = ["NodeInfos", "AddParameter", "GraphContainerDescendantAndLeaves", "copy", "Associate"];
    self.keys_ParameterForDataOwners = ["NodeInfos", "delete from bag", "AddParameter", "GraphContainerDescendantAndLeaves", "DeleteContainer", "copy", "Associate"];
    self.keys_PropertiesForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "Associate"];
    self.keys_PropertiesForDataOwners = ["NodeInfos", "delete from bag", "copy", "GraphContainerDescendantAndLeaves", "DeleteContainer", "Associate"];
    self.keys_viewpointForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object"];
    self.keys_viewpointForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object"];
    self.keys_studyscenarioForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object", "DeleteContainer"];
    self.keys_studyscenarioForDataUsers = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object"];
    self.keys_disciplineForDataOwners = ["NodeInfos", "GraphContainerDescendantAndLeaves", "paste", "Create Object", "DeleteContainer"];
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
                var confirmation = confirm("Are you sure to suppress definitely this element?");
                if (confirmation) {
                    var source = self.identify_source(_e);
                    Lineage_containers.deleteContainer(source, Lineage_containers.currentContainer);
                    //self.IDCP_fillJstreeTypes();
                }
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
        Associate: {
            label: "Associate",
            action: function (_e) {
                self.associate(_e);
            },
        },
    };
    self.validateAssociation = function (dialog, source) {
        var input_available = $("#bo_uri").parent().parent().find("input");
        var Field_completed = false;
        var nb_fields_completed = 0;
        input_available.each(function (index, element) {
            if (element.value != "" && element.value != "fill it to search" && element.value != "fill it with the tree") {
                nb_fields_completed += 1;
            }
        });
        if (nb_fields_completed == input_available.length) {
            Field_completed = true;
        }
        if ($("#unit_of_mesure").length > 0) {
            if (!$("#unit_of_mesure").val()) {
                Field_completed = false;
            }
        }
        if ($("#LineageBlend_creatingNodeNewClassDefinition").length > 0) {
            if (!$("#LineageBlend_creatingNodeNewClassDefinition").val()) {
                Field_completed = false;
            }
        }

        if (!Field_completed) {
            alert("You need to complete all fields before validating,use the tree by linking an item for the last fields, use none items are relevants if you don't find a good one");
        } else {
            var triples = [];

            if ($("#unit_of_mesure").length > 0) {
                triples.push({
                    subject: self.last_IDCP_container.data.id,
                    predicate: "http://rds.posccaesar.org/ontology/lis14/rdl/representedIn",
                    object: $("#unit_of_mesure").val(),
                });
            }
            if ($("#LineageBlend_creatingNodeNewClassDefinition").length > 0) {
                triples.push({
                    subject: self.last_IDCP_container.data.id,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
                    object: $("#LineageBlend_creatingNodeNewClassDefinition").val(),
                });
            }

            triples.push({
                subject: self.last_IDCP_container.data.id,
                predicate: "http://datalenergies.total.com/resource/tsf/idcp_v2/hasBO",
                object: $("#bo_uri").val(),
            });
            // if parameter equivclass with parameter.val
            // if property equivclass between parent and equivclass bewteen property

            if ($("#property_uri").val()) {
                //property
                triples.push({
                    subject: $("#lineage_containers_containersJstree").jstree()._model.data[self.last_IDCP_container.parent].data.id,
                    predicate: "http://www.w3.org/2002/07/owl#equivalentClass",
                    object: $("#parameter_uri").val(),
                });
                triples.push({
                    subject: self.last_IDCP_container.data.id,
                    predicate: "http://www.w3.org/2002/07/owl#equivalentClass",
                    object: $("#property_uri").val(),
                });
            } else {
                triples.push({
                    subject: self.last_IDCP_container.data.id,
                    predicate: "http://www.w3.org/2002/07/owl#equivalentClass",
                    object: $("#parameter_uri").val(),
                });
            }

            Sparql_generic.insertTriples(source, triples, null, function (err, result) {});
        }
    };

    self.associate = function (e) {
        self.isAssociating = true;

        var key_id = e.reference.prevObject.selector.replace("#", "");
        var source = self.identify_source(e);
        var nodeId = $("#lineage_containers_containersJstree").jstree()._model.data[key_id].data.id;
        Sparql_generic.getNodeInfos(
            source,
            nodeId,
            {
                getValuesLabels: true,
                selectGraph: true,
            },
            function (err, data) {
                var hasDefinition = false;
                data.forEach((result) => {
                    if (result.prop.value == "http://www.w3.org/2000/01/rdf-schema#isDefinedBy") {
                        hasDefinition = true;
                    }
                });
                var hasUnit = false;
                data.forEach((result) => {
                    if (result.prop.value == "http://rds.posccaesar.org/ontology/lis14/rdl/representedIn") {
                        hasUnit = true;
                    }
                });
                $("<div>").dialog({
                    modal: true,
                    open: function () {
                        var dialog = $(this);
                        var key_id = e.reference.prevObject.selector.replace("#", "");
                        var source = self.identify_source(e);
                        $(this).load("snippets/lineage/lineageAddNodeDialog.html #LineageBlend_creatingNodeSingleTab", function () {
                            self.adding_parameter_hide();
                            $("#LineageBlend_creatingNodeClassDiv").load("snippets/commonUIwidgets/editPredicateDialog.html", function () {
                                PredicatesSelectorWidget.init(source, function () {
                                    PredicatesSelectorWidget.setVocabulariesSelect(source, "_curentSourceAndImports");
                                    self.widget_preselection_and_hide(dialog, e);
                                    if(!hasUnit){
                                        $("#unit_of_mesure").append(`<option id='blank_unit'></option>`);
                                        self.units_available.forEach((unit) => {
                                            var unit_uri = unit[0];
                                            var unit_name = unit[1];
                                            $("#unit_of_mesure").append(`<option id=${unit_uri}>${unit_name}</option>`);
                                        });
                                    }else{
                                        $("#unit_of_mesure").remove();
                                        $("#LineageBlend_creatingNodeNewClassDefinition").remove();

                                    }
                                   
                                    $("#button_Class_to_creatingNodeMenu").removeAttr("onclick");
                                    $("#button_Class_to_creatingNodeMenu").attr("onclick", `Idcp.validateAssociation('${dialog.get(0).id}','${source}');`);
                                    // Hide to do the process step by step
                                    $("#button_Class_to_creatingNodeMenu").hide();
                                    $("#bo_uri").hide();
                                    if(!hasUnit){
                                        $("#unit_of_mesure").hide();
                                    }
                                    if(!hasDefinition){
                                        $("#LineageBlend_creatingNodeNewClassDefinition").hide();
                                    }
                                   
                                    $("#parameter_uri").hide();
                                    $("#property_uri").hide();
                                    /*
                                    if($("#property_uri").val()){
                                        $("#property_uri").parent().html('<br><br>Property :'+$("#parameter_uri").parent().html());
                                    }else{
                                        $("#parameter_uri").parent().html('<br><br>Parameter :'+$("#parameter_uri").parent().html());
                                    }
                                    */
        
                                });
                            });
                        });
                    },
                    height: 800,
                    width: 1500,
                    title: "Renseign your parameter",
                    close: function () {
                        $("#rightPanelDiv").empty();
                        $("#centralPanelDiv").parent().append($("#rightPanelDiv"));
                        $(this).dialog("close");
                        $(this).remove();
                    },
                });

                /*
                $("<div>").dialog({
                    modal: true,
                    open: function () {
                        var dialog = $(this);
                        $(this).load("snippets/lineage/lineageAddNodeDialog.html #LineageBlend_creatingNodeSingleTab", function () {
                            self.adding_parameter_hide();
                            $("#LineageBlend_creatingNodeClassDiv").load("snippets/commonUIwidgets/editPredicateDialog.html", function () {
                                PredicatesSelectorWidget.init(source, function () {
                                    PredicatesSelectorWidget.setVocabulariesSelect(source, "_curentSourceAndImports");
                                    self.widget_preselection_and_hide(dialog, e, hasDefinition, hasUnit);

                                    $("#button_Class_to_creatingNodeMenu").removeAttr("onclick");
                                    $("#button_Class_to_creatingNodeMenu").attr("onclick", `Idcp.validateAssociation('${dialog.get(0).id}','${source}');`);
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
                    height: 800,
                    width: 1500,
                    title: "Renseign your parameter",
                    close: function () {
                        $("#rightPanelDiv").empty();
                        $("#centralPanelDiv").parent().append($("#rightPanelDiv"));
                        $(this).dialog("close");
                        $(this).remove();
                        self.isAssociating = false;
                    },
                });
                */
            }
        );
    };

    self.add_supplementary_layer_for_types_icon = function (types) {
        //property>parameter>Datablock> disciplines>datacontainer
        var type = null;
        if (types.includes(self.datacontainerUri)) {
            type = "datacontainer";
        }
        if (types.includes(self.disciplineUri)) {
            type = "disciplines";
        }
        if (types.includes(self.datablockURI)) {
            type = "datablock";
        }
        if (types.includes(self.parameterUri)) {
            type = "parameter";
        }
        if (types.includes(self.proprieteUri)) {
            type = "properties";
        }
        
        if (types.includes(self.boURI)|| types.includes(self.logicalentityURI)) {
            type = "bo";
        }
        if (types.includes(self.attributeBoURI)|| types.includes(self.attributeLEURI)) {
            type = "attribute";
        }
        if (types.includes(self.enumerationBOURI)|| types.includes(self.enumerationLEURI)) {
            type = "enumeration";
        }
        

        return type;
    };
    self.checkfieldsAddParamOrProp = function () {
        if ($("#property_uri").val()) {
            //IS Property

            var prop_name = $("#LineageBlend_creatingNodeNewClassLabel").val() != "";
            var unit = $("#unit_of_mesure").val() != "";
            var def = $("#LineageBlend_creatingNodeNewClassDefinition").val() != "";
            var param = $("#parameter_uri").val() != "fill it with the tree" || $("#parameter_uri").val() != "fill it to search" || $("#parameter_uri").val() != "";
            var bo = $("#bo_uri").val() != "fill it with the tree" || $("#bo_uri").val() != "fill it to search" || $("#bo_uri").val() != "";
            var prop = $("#property_uri").val() != "fill it with the tree" || $("#property_uri").val() != "fill it to search" || $("#property_uri").val() != "";

            var cond = prop_name && unit && def && param && bo && prop;
        } else {
            var param_name = $("#LineageBlend_creatingNodeNewClassLabel").val() != "";
            var unit = $("#unit_of_mesure").val() != "";
            var def = $("#LineageBlend_creatingNodeNewClassDefinition").val() != "";
            var param = $("#parameter_uri").val() != "fill it with the tree" || $("#parameter_uri").val() != "fill it to search" || $("#parameter_uri").val() != "";
            var bo = $("#bo_uri").val() != "fill it with the tree" || $("#bo_uri").val() != "fill it to search" || $("#bo_uri").val() != "";

            var cond = param_name && unit && def && param && bo;
        }

        return cond;
    };

    self.nocorresponding = function (step) {
        var process_step=self.determine_process_step();
        if(process_step.paramOrProp=='param'){
            if(process_step.step==0){
                if($("#LineageBlend_creatingNodeNewClassLabel").val()==''){
                    alert("You didn't enter a value for your parameter, Try to enter a name some results will apears and you can link it to your parameter" );
                    
                }
                else{
                    self.adding_parameter_processus({id:'None'},process_step);
                }
                   
                
                
                
            }
            if(process_step.step==1){
                
                if($("#bo_uri").val()=='' || $("#bo_uri").val()=='fill it with the tree'){
                    alert("You didn't enter a value for your business object, Try to enter a name some results will apears and you can link it to your parameter" );
                    
                }
                else{
                    self.adding_parameter_processus({id:$("#bo_uri").val()},process_step);
                }
            }
        }else{
            if(process_step.step==0){
                if($("#LineageBlend_creatingNodeNewClassLabel").val()==''){
                    alert("You didn't enter a value for your property, Try to enter a name some results will apears and you can link it to your property" );
                    
                }
                else{
                    self.adding_parameter_processus({id:'None'},process_step);
                }
                   
                
                
                
            }
            if(process_step.step==1){
                
                if($("#parameter_uri").val()=='' || $("#parameter_uri").val()=='fill it with the tree'){
                    alert("You didn't enter a value for your property, Try to enter a name some results will apears and you can link it to your property" );
                    
                }
                else{
                    self.adding_parameter_processus({id:$("#parameter_uri").val()},process_step);
                }
            }
            if(process_step.step==2){
                
                if($("#bo_uri").val()=='' || $("#bo_uri").val()=='fill it with the tree'){
                    alert("You didn't enter a value for your business object, Try to enter a name some results will apears and you can link it to your property" );
                    
                }
                else{
                    self.adding_parameter_processus({id:$("#bo_uri").val()},process_step);
                }
            }

        }

        /*
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
                        $("#bo_uri").attr("onchange", "Idcp.fieldBOsearch(this,'bo');");
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
                    self.fieldBOsearch(parameter_answer, "param");
                } else {
                    if ($("#bo_uri").val() == "fill it with the tree") {
                        var parameter_answer = prompt("You didn't enter a Business object  name, enter one here and try to search on tree a corresponding one  and link it to your object");
                        $("#bo_uri").attr("readonly", false);
                        $("#bo_uri").attr("onchange", "Idcp.fieldBOsearch(this,'bo');");
                        $("#bo_uri").val(parameter_answer);
                        self.fieldBOsearch(parameter_answer, "bo");
                    } else {
                        alert("Sorry, we have not your business object in our database, Click on Ok and it will be created with your new parameter");
                    }
                }
            } else {
                if ($("#bo_uri").val() == "fill it to search" || $("#bo_uri").val() == "") {
                    var parameter_answer = prompt("You didn't enter a Business object  name, enter one here and try to search on tree a corresponding one  and link it to your object");
                    $("#bo_uri").attr("readonly", false);
                    $("#bo_uri").attr("onchange", "Idcp.fieldBOsearch(this,'bo');");
                    $("#bo_uri").val(parameter_answer);
                    self.fieldBOsearch(parameter_answer, "bo");
                } else {
                    alert("Sorry, we have not your business object in our database, Click on Ok and it will be created with your new parameter");
                }
            }
        }
        */
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
        var input_text = text;
        if (text.value) {
            input_text = text.value;
        }
        self.IDCPBOsearch(input_text, filtertype);
    };
    self.adding_parameter_processus=function(data,process_step){
        if(process_step.paramOrProp=='param'){
            if(process_step.step==0){
                
                $("#parameter_uri").show();
                $("#parameter_uri").parent().html('<br><br>Parameter :'+$("#parameter_uri").parent().html());
                $("#bo_uri").show();
                $("#bo_uri").parent().html('<br><br>Search a Business object to associate :'+$("#bo_uri").parent().html());
                var param=$("#parameter_uri").parent()[0];
                $("#bo_uri").parent().before(param);
                $("#parameter_uri").val(data.id);
                $("#bo_uri").attr("readonly", false);
                $("#bo_uri").attr("onchange", "Idcp.fieldBOsearch(this,'param');");
                alert('you now need to link your Parameter to a Business Object');
                
            }
            if(process_step.step==1){
                
                $("#unit_of_mesure").show();
                $("#LineageBlend_creatingNodeNewClassDefinition").show();
                $("#unit_of_mesure").parent().html('<br><br> Add a unit of mesure :   '+$("#unit_of_mesure").parent().html());
                $("#LineageBlend_creatingNodeNewClassDefinition").parent().html('<br><br> Add a definition :   <br> '+$("#LineageBlend_creatingNodeNewClassDefinition").parent().html());
                $("#button_Class_to_creatingNodeMenu").show();
                var bo=$("#bo_uri").parent()[0];
                $("#unit_of_mesure").parent().before(bo);
                var param=$("#parameter_uri").parent()[0];
                $("#unit_of_mesure").parent().before(param);
                $("#None_are_relevant").hide();
                $("#bo_uri").val(data.id); 
                
            }
        }else{
            if(process_step.step==0){
                
                $("#property_uri").show();
                $("#property_uri").parent().html('<br><br>Property :'+$("#property_uri").parent().html());
                $("#parameter_uri").show();
                $("#parameter_uri").parent().html('<br><br>Search a Parameter to associate :'+$("#parameter_uri").parent().html());
                var param=$("#property_uri").parent()[0];
                $("#parameter_uri").parent().before(param);
                $("#property_uri").val(data.id);
                $("#parameter_uri").attr("readonly", false);
                $("#parameter_uri").attr("onchange", "Idcp.fieldBOsearch(this,'param');");
                alert('you now need to link your Property to a Parameter');
                
            }
            if(process_step.step==1){
                
                
                $("#bo_uri").show();
                $("#bo_uri").parent().html('<br><br>Search a Business object to associate :'+$("#bo_uri").parent().html());
                var property=$("#property_uri").parent()[0];
                $("#bo_uri").parent().before(property);
                var param=$("#parameter_uri").parent()[0];
                $("#bo_uri").parent().before(param);
            
                $("#parameter_uri").parent().html($("#parameter_uri").parent().html().replace(/>[^<]+</,'> Parameter : <'));
                $("#parameter_uri").val(data.id);
                $("#bo_uri").attr("readonly", false);
                $("#bo_uri").attr("onchange", "Idcp.fieldBOsearch(this,'bo');");
                alert('you now need to link your Property to a Business Object');
                
            }
            if(process_step.step==2){
                
                $("#unit_of_mesure").show();
                $("#LineageBlend_creatingNodeNewClassDefinition").show();
                $("#unit_of_mesure").parent().html('<br><br> Add a unit of mesure :   '+$("#unit_of_mesure").parent().html());
                $("#LineageBlend_creatingNodeNewClassDefinition").parent().html('<br><br> Add a definition :   <br> '+$("#LineageBlend_creatingNodeNewClassDefinition").parent().html());
                $("#button_Class_to_creatingNodeMenu").show();
                var bo=$("#bo_uri").parent()[0];
                $("#unit_of_mesure").parent().before(bo);
                var param=$("#parameter_uri").parent()[0];
                $("#unit_of_mesure").parent().before(param);
                var property=$("#property_uri").parent()[0];
                $("#unit_of_mesure").parent().before(property);
                $("#None_are_relevant").hide();
                $("#bo_uri").val(data.id); 
                
            }



        }
    }
    self.determine_process_step=function(){
        var process_step=null;
        if($("#property_uri").val()){
            var process_step={'paramOrProp':'prop'}
            if($("#property_uri").is(":visible")){
                if($("#bo_uri").is(":visible")){
                    process_step['step']=2
                }else{
                    process_step['step']=1
                }
                
            }
            else{
                process_step['step']=0
            }
        }
        else{
            var process_step={'paramOrProp':'param'}
            if($("#parameter_uri").is(":visible")){
                process_step['step']=1
                
            }
            else{
                process_step['step']=0
            }
        }
        return process_step;
    }
    self.LinkingIDCPtoBO = function (e) {
        var key_id = e.reference.prevObject.selector.replace("#", "");
        var source = self.identify_source(e);
        if (source == self.source) {
            var jstreeDiv = "#lineage_containers_containersJstree";
        } else {
            var jstreeDiv = "#lineage_containers_containersJstree_BO";
        }
        var data = $(jstreeDiv).jstree()._model.data[key_id].data;
        var process_step=self.determine_process_step();
        
        self.adding_parameter_processus(data,process_step);
        
        /*
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
        */
    };

    self.listRessource_BO = function (source, containerNode, options, callback) {
        Lineage_containers.listContainerResources(source, containerNode, options, callback, "lineage_containers_containersJstree_BO");
    };

    // Functions writed for IDCP use case
    self.onSelectedNodeTreeclick = function (event, obj) {
        Lineage_containers.currentContainer = obj.node;
        //! from right click
        if (Lineage_containers.currentContainer.data.source == self.source) {
            self.last_IDCP_container = Lineage_containers.currentContainer;
        }

        if (obj.event.button != 2) {
            if (Lineage_containers.currentContainer.data.source == self.source) {
                Lineage_containers.listContainerResources(Lineage_sources.activeSource, Lineage_containers.currentContainer, { onlyOneLevel: true, leaves: true }, function (nodes_added) {
                    self.IDCP_fillJstreeTypes(nodes_added, "#lineage_containers_containersJstree");
                });
            } else {
                self.listRessource_BO(self.BO_source, Lineage_containers.currentContainer, { onlyOneLevel: true, leaves: true }, function (nodes_added) {
                    self.IDCP_fillJstreeTypes(nodes_added, "#lineage_containers_containersJstree_BO");
                });
            }
        }
        // Arborescence construction specific nodes

        var uri = obj.node.data.id;
        if (obj.node.data.source == self.BO_source) {
            var JstreeDiv = "#lineage_containers_containersJstree_BO";
        } else {
            var JstreeDiv = "#lineage_containers_containersJstree";
        }

        // Datacontainer case
        if (uri == self.datacontainerUri) {
            if (self.isDataOwner) {
                var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DataContainercaseForDataOwners);
                //filtred_contextmenu["Create Object"].label="Create new DataContainer"
                $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
            } else {
                $(JstreeDiv).jstree().settings.contextmenu.items = {};
            }
        }
        // ViewPoint case
        else if (uri == self.viewpointuri) {
            if (self.isDataOwner) {
                var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_viewpointcaseForDataOwners);
                //filtred_contextmenu["Create Object"].label="Create new viewpoint"
                $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
            } else {
                $(JstreeDiv).jstree().settings.contextmenu.items = {};
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
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DatacontainersForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataBlock";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.datablockURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DatablockForDataOwners);
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_DatablockForDataUsers);
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.parameterUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_ParameterForDataOwners);
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_ParameterForDataUsers);
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.viewpointuri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_viewpointForDataOwners);
                        filtred_contextmenu["Create Object"].label = "Create new " + obj.node.data.label;
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_viewpointForDataUsers);
                        filtred_contextmenu["Create Object"].label = "Create new " + obj.node.data.label;
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.studyscenarioUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_studyscenarioForDataOwners);
                        filtred_contextmenu["Create Object"].label = "Create new Element";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_studyscenarioForDataUsers);
                        filtred_contextmenu["Create Object"].label = "Create new Element";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.disciplineUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_disciplineForDataOwners);
                        filtred_contextmenu["Create Object"].label = "Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_disciplineForDataUsers);
                        filtred_contextmenu["Create Object"].label = "Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.enumerationBOURI) | types.includes(self.enumerationLEURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (types.includes(self.proprieteUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_PropertiesForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_PropertiesForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                }
            }
            if (subclass) {
                if (subclass.includes(self.boURI) | subclass.includes(self.logicalentityURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_BOForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new Parameter";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_BOForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new Parameter";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (subclass.includes(self.attributeBoURI) | subclass.includes(self.attributeLEURI)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_attributeBoForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (subclass.includes(self.parameterUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_ParameterForDataOwners);
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_ParameterForDataUsers);
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                } else if (subclass.includes(self.proprieteUri)) {
                    if (self.isDataOwner) {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_PropertiesForDataOwners);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    } else {
                        var filtred_contextmenu = self.IDCP_filtredkeysmenu(self.keys_PropertiesForDataUsers);
                        //filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
                    }
                }
            }
            if (!filtred_contextmenu) {
                var filtred_contextmenu = self.IDCP_filtredkeysmenu(["GraphContainerDescendantAndLeaves"]);
                $(JstreeDiv).jstree().settings.contextmenu.items = filtred_contextmenu;
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
        var jstree_data = $(JstreeDiv).jstree()._model.data;
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

            // Actualize icons
            

            for (var key in jstree_data) {
                if (jstree_data[key].data) {
                    var node = jstree_data[key].data;

                    var types = node["rdf:types"];
                    if (node["type"]) {
                        var types_2 = node["type"];
                        if(!types){
                            types=[];
                            
                        }
                        
                    } else {
                        var types_2 = [];
                    }
                    if(!types){
                        types=[];
                    }
                    if (node["rdf:subclass"]) {
                        var subclass = node["rdf:subclass"];
                    } else {
                        var subclass = [];
                    }
                    
                    var types = types.concat(subclass);
                    var types = types.concat(types_2);
                    var type_icon = JstreeWidget.selectTypeForIconsJstree(types, self.add_supplementary_layer_for_types_icon);
                    if (JstreeWidget.types[type_icon]) {
                        var img = JstreeWidget.types[type_icon].icon;
                        $(JstreeDiv).jstree().set_icon(key, img);
                    }
                }
            }
        });
    };

    self.IDCP_filtredkeysmenu = function (list_of_keys) {
        return Object.fromEntries(Object.entries(self.all_IDCPitemscontextmenu).filter(([key]) => list_of_keys.includes(key)));
    };
    // delete from bag
    //This function is called uniquely where we have the rights
    self.IDCPBOsearch = function (textfilter, typefilter, callback) {
        if (!callback) {
            callback = function () {};
        }

        var term = textfilter;

        var filter = "";
        if (term) {
            filter = "FILTER (" + Sparql_common.setFilter("member", null, term) + ")";
        }

        var search_on_container = "";

        if (typefilter) {
            typefilter = " in (" + typefilter + ")||str(?subclasstype) in (" + typefilter + ")";
        }

        //annulation du type filter
        typefilter=null;

        Lineage_containers.drawContainerJstree(self.BO_source, filter, "lineage_containers_containersJstree_BO", search_on_container, typefilter, {}, function () {
            
            if (filter != "") {
                
                    self.IDCP_fillJstreeTypes(null, "#lineage_containers_containersJstree_BO");
                
                
            }
        });
    };
    self.IDCPsearch = function () {
        var type_filter=null;
        var type_selected=$("#Lineage_containers_searchWhatInput").val();
        if(type_selected=='datacontainer'){
            type_filter=` in ("${self.datacontainerUri}")`
        }
        if(type_selected=='datablock'){
            type_filter=` in ("${self.datablockURI}")`
        }
        if(type_selected=='properties'){
            type_filter=` in ("${self.proprieteUri}")`
        }
        if(type_selected=='parameter'){
            type_filter=` in ("${self.parameterUri}")`
        }
        if(type_selected=='disciplines'){
            type_filter=` in ("${self.disciplineUri}")`
        }

       
        Lineage_containers.search(type_filter, self.IDCP_fillJstreeTypes);
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
        Lineage_classes.copyNode(e);
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

                Lineage_containers.addResourcesToContainer(source, Lineage_containers.currentContainer, nodesData, null, self.IDCP_fillJstreeTypes);
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
        if (self.isDataOwner) {
            NodeInfosWidget.showNodeInfos(source, Lineage_containers.currentContainer, "mainDialogDiv");
        } else {
            NodeInfosWidget.showNodeInfos(source, Lineage_containers.currentContainer, "mainDialogDiv", { hideModifyButtons: true });
        }

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
                        PredicatesSelectorWidget.init(source, function () {
                            PredicatesSelectorWidget.setVocabulariesSelect(source, "_curentSourceAndImports");
                            self.widget_preselection_and_hide(dialog, e);
                            
                            $("#unit_of_mesure").append(`<option id='blank_unit'></option>`);
                            self.units_available.forEach((unit) => {
                                var unit_uri = unit[0];
                                var unit_name = unit[1];
                                $("#unit_of_mesure").append(`<option id=${unit_uri}>${unit_name}</option>`);
                            });

                            // Hide to do the process step by step
                            $("#button_Class_to_creatingNodeMenu").hide();
                            $("#bo_uri").hide();
                            
                            $("#unit_of_mesure").hide();
                            $("#LineageBlend_creatingNodeNewClassDefinition").hide();
                            $("#parameter_uri").hide();
                            $("#property_uri").hide();
                            /*
                            if($("#property_uri").val()){
                                $("#property_uri").parent().html('<br><br>Property :'+$("#parameter_uri").parent().html());
                            }else{
                                $("#parameter_uri").parent().html('<br><br>Parameter :'+$("#parameter_uri").parent().html());
                            }
                            */

                        });
                    });
                });
            },
            height: 800,
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

    self.widget_preselection_and_hide = function (dialog, e, hasDefinition, hasUnit) {
        var balise_unit='<div><select name="unit" id="unit_of_mesure" ></select></div>'
        var balise_def='<div><textarea style="width: 528px" style="margin: 10px" id="LineageBlend_creatingNodeNewClassDefinition"></textarea></div>'
        var balise_bo=' <div> <input id="bo_uri" value="fill it with the tree"  readonly> </div>'
        var balise_parameter=' <div> <input id="parameter_uri" value="fill it with the tree"  readonly> </div>'
        var balise_property='<div><input id="property_uri" value="fill it with the tree"  readonly> </div>'
        if (!hasDefinition) {
            hasDefinition = false;
        }
        if (!hasUnit) {
            hasUnit = false;
        }
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
        if (!hasUnit) {
            label_parent.append(balise_unit);
        }

        if (!hasDefinition) {
            label_parent.append(balise_def);
        }

        if (data["rdf:subclass"]) {
            var types = data["rdf:types"].concat(data["rdf:subclass"]);
        } else {
            var types = data["rdf:types"];
        }

        if (types.includes(self.datablockURI) && self.isAssociating == false) {
            label_parent.append(balise_bo);
            label_parent.append(balise_parameter);
            label_parent.html(label_parent.html().replace("rdfs:label", "Name of the new Parameter"));
            $("#LineageBlend_creatingNodeNewClassLabel").attr("onchange", "Idcp.fieldBOsearch(this,'param');");
        }
        if (types.includes(self.parameterUri) && self.isAssociating) {
            label_parent.append(balise_bo);
            label_parent.append(balise_parameter);
            label_parent.html(label_parent.html().replace("rdfs:label", "Name of associating  Parameter"));
            $("#LineageBlend_creatingNodeNewClassLabel").attr("onchange", "Idcp.fieldBOsearch(this,'param');");
        }

        $("#LineageBlend_creatingNodeSingleTab").css({
            display: "flex",
            "align-content": "center",
            "align-items": "stretch",
            "flex-direction": "row",
        });

        if (types.includes(self.parameterUri) && self.isAssociating == false) {
            var balise_id = dialog.context.id;
            var split = balise_id.split("-");
            var title_number = parseInt(split[split.length - 1]) + 1;
            var title_id = split[0] + "-" + split[1] + "-" + title_number;
            $("#" + title_id).text("Reseign your property");

            label_parent.append(balise_bo);
            label_parent.append(balise_parameter);
            label_parent.append(balise_property);
            label_parent.html(label_parent.html().replace("rdfs:label", "Name of the new Property"));
            $("#LineageBlend_creatingNodeNewClassLabel").attr("onchange", "Idcp.fieldBOsearch(this,'prop');");
        }
        if (types.includes(self.proprieteUri) && self.isAssociating) {
            var balise_id = dialog.context.id;
            var split = balise_id.split("-");
            var title_number = parseInt(split[split.length - 1]) + 1;
            var title_id = split[0] + "-" + split[1] + "-" + title_number;
            $("#" + title_id).text("Reseign your property");

            label_parent.append(balise_bo);
            label_parent.append(balise_parameter);
            label_parent.append(balise_property);
            label_parent.html(label_parent.html().replace("rdfs:label", "Name of associating Property"));
            $("#LineageBlend_creatingNodeNewClassLabel").attr("onchange", "Idcp.fieldBOsearch(this,'prop');");
        }
        label_parent.append('<br><br><button id="None_are_relevant" class="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Idcp.nocorresponding(1)">None items are relevant</button><br><br>');
        $("#button_Class_to_creatingNodeMenu").appendTo($("#LineageBlend_creatingNodeNewClassLabel").parent());
    };
    self.idcp_addParameter = function (dialogdiv, source) {
        var Field_completed = self.checkfieldsAddParamOrProp();

        if (!Field_completed) {
            alert("You need to complete all fields before validating,use the tree by linking an item for the last fields, use none items are relevants if you don't find a good one");
        } else {
            //get source of clicked node

            Lineage_sources.activeSource = source;

            //take the label and initiate triples

            Lineage_blend.graphModification.creatingsourceUri = undefined;
            Lineage_blend.graphModification.addClassOrIndividualTriples();
            Lineage_blend.graphModification.currentCreatingNodeType = "IDCP";

            //recreate node object
            var uri = Lineage_blend.graphModification.creatingNodeTriples[0]["subject"];

            //verify if uri already exists
            Sparql_generic.getNodeInfos( source,
                uri,
                {
                    getValuesLabels: true,
                    selectGraph: true,
                },
                function (err, data) {
                if(result.results.bindings.length>0){
                    
                }
                    

                var label_node = Lineage_blend.graphModification.creatingNodeTriples[0]["object"];
                var node = { source: self.source, label: label_node, id: uri };

                // Def
                var definition = $("#LineageBlend_creatingNodeNewClassDefinition").val();
                var definition_triple = {};
                definition_triple["subject"] = uri;
                definition_triple["predicate"] = "rdfs:isDefinedBy";
                definition_triple["object"] = definition;
                Lineage_blend.graphModification.creatingNodeTriples.push(definition_triple);
                // Unity

                var unit = $("#unit_of_mesure").val();
                var unit_triple = {};
                unit_triple["subject"] = uri;
                unit_triple["predicate"] = "http://rds.posccaesar.org/ontology/lis14/rdl/representedIn";
                unit_triple["object"] = unit;
                Lineage_blend.graphModification.creatingNodeTriples.push(unit_triple);

                //is a class

                var class_triple = {};
                class_triple["subject"] = uri;
                class_triple["predicate"] = "rdf:type";
                class_triple["object"] = "owl:Class";
                Lineage_blend.graphModification.creatingNodeTriples.push(class_triple);

                // is member of
                var member_triple = {};
                member_triple["subject"] = self.last_IDCP_container.data.id;
                member_triple["predicate"] = "rdfs:member";
                member_triple["object"] = uri;
                Lineage_blend.graphModification.creatingNodeTriples.push(member_triple);

                //check if is not none --> if is it create it

                var prop = $("#property_uri").val();
                if (prop) {
                    //check if is not none --> if is it create it

                    //is a property
                    var subclass_triple = {};
                    subclass_triple["subject"] = uri;
                    subclass_triple["predicate"] = "rdfs:subClassOf";
                    subclass_triple["object"] = self.proprieteUri;
                    Lineage_blend.graphModification.creatingNodeTriples.push(subclass_triple);

                    // Parameter describes property
                    var link_pp_triple = {};
                    link_pp_triple["subject"] = self.last_IDCP_container.data.id;
                    link_pp_triple["predicate"] = "http://datalenergies.total.com/resource/tsf/idcp_v2/describes";
                    link_pp_triple["object"] = uri;
                    Lineage_blend.graphModification.creatingNodeTriples.push(link_pp_triple);

                    if (prop.startsWith("http://datalenergies.total.com/resource/tsf/gidea-raw/")) {
                        //Is uri
                        //  Similar in gidea

                        var parameter_triple = {};
                        parameter_triple["subject"] = uri;
                        parameter_triple["predicate"] = "http://www.w3.org/2002/07/owl#equivalentClass";
                        parameter_triple["object"] = prop;
                        Lineage_blend.graphModification.creatingNodeTriples.push(parameter_triple);
                    }
                    var parameter = $("#parameter_uri").val();

                    if (parameter.startsWith("http://datalenergies.total.com/resource/tsf/gidea-raw/")) {
                        //Is uri
                        //  Similar in gidea between parameter IDCP (container clicked )

                        var parameter_triple = {};
                        parameter_triple["subject"] = self.last_IDCP_container.data.id;
                        parameter_triple["predicate"] = "http://www.w3.org/2002/07/owl#equivalentClass";
                        parameter_triple["object"] = parameter;
                        Lineage_blend.graphModification.creatingNodeTriples.push(parameter_triple);
                    }

                    var bo = $("#bo_uri").val();

                    if (bo.startsWith("http://datalenergies.total.com/resource/tsf/")) {
                        // Association with BO

                        var bo_triple = {};
                        bo_triple["subject"] = uri;
                        bo_triple["predicate"] = "http://datalenergies.total.com/resource/tsf/idcp_v2/hasBO";
                        bo_triple["object"] = bo;
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_triple);
                    } else {
                        // get uri
                        var bo_uri = Lineage_blend.graphModification.getURI(bo);

                        //checkpoint
                        /*
                var current_cretaing_triples=Lineage_blend.graphModification.creatingNodeTriples;

                
                
                Lineage_blend.graphModification.creatingNodeTriples=[];
                */

                        // Create IDCP BO
                        var triple_creator_bo = Lineage_blend.graphModification.creatingNodeTriples[1];
                        triple_creator_bo.subject = bo_uri;
                        Lineage_blend.graphModification.creatingNodeTriples.push(triple_creator_bo);

                        var bo_label = {};
                        bo_label["subject"] = bo_uri;
                        bo_label["predicate"] = "rdfs:label";
                        bo_label["object"] = bo;
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_label);

                        var bo_class_triple = {};
                        bo_class_triple["subject"] = bo_uri;
                        bo_class_triple["predicate"] = "rdf:type";
                        bo_class_triple["object"] = "owl:Class";
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_class_triple);

                        var subclass_triple = {};
                        subclass_triple["subject"] = bo_uri;
                        subclass_triple["predicate"] = "rdfs:subClassOf";
                        subclass_triple["object"] = "http://datalenergies.total.com/resource/tsf/idcp_v2/Business_Objects";
                        Lineage_blend.graphModification.creatingNodeTriples.push(subclass_triple);

                        Lineage_blend.graphModification.createNode();

                        /*
                // resume checkpoint

                Lineage_blend.graphModification.creatingNodeTriples=current_cretaing_triples;
                    */

                        //Associate with it

                        var bo_triple = {};
                        bo_triple["subject"] = uri;
                        bo_triple["predicate"] = "http://datalenergies.total.com/resource/tsf/idcp_v2/hasBO";
                        bo_triple["object"] = bo_uri;
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_triple);
                    }
                } else {
                    // Is a parameter
                    //Classics
                    //is a bag

                    var bag_triple = {};
                    bag_triple["subject"] = uri;
                    bag_triple["predicate"] = "rdf:type";
                    bag_triple["object"] = "rdf:Bag";
                    Lineage_blend.graphModification.creatingNodeTriples.push(bag_triple);

                    //is a parameter
                    var subclass_triple = {};
                    subclass_triple["subject"] = uri;
                    subclass_triple["predicate"] = "rdfs:subClassOf";
                    subclass_triple["object"] = self.parameterUri;
                    Lineage_blend.graphModification.creatingNodeTriples.push(subclass_triple);

                    //BO value

                    var bo = $("#bo_uri").val();

                    if (bo.startsWith("http://datalenergies.total.com/resource/tsf/")) {
                        // Association with BO

                        var bo_triple = {};
                        bo_triple["subject"] = uri;
                        bo_triple["predicate"] = "http://datalenergies.total.com/resource/tsf/idcp_v2/hasBO";
                        bo_triple["object"] = bo;
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_triple);
                    } else {
                        // get uri
                        var bo_uri = Lineage_blend.graphModification.getURI(bo);

                        //checkpoint
                        /*
                var current_cretaing_triples=Lineage_blend.graphModification.creatingNodeTriples;

                
                
                Lineage_blend.graphModification.creatingNodeTriples=[];
                */

                        // Create IDCP BO
                        var triple_creator_bo = Lineage_blend.graphModification.creatingNodeTriples[1];
                        triple_creator_bo.subject = bo_uri;
                        Lineage_blend.graphModification.creatingNodeTriples.push(triple_creator_bo);

                        var bo_label = {};
                        bo_label["subject"] = bo_uri;
                        bo_label["predicate"] = "rdfs:label";
                        bo_label["object"] = bo;
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_label);

                        var bo_class_triple = {};
                        bo_class_triple["subject"] = bo_uri;
                        bo_class_triple["predicate"] = "rdf:type";
                        bo_class_triple["object"] = "owl:Class";
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_class_triple);

                        var subclass_triple = {};
                        subclass_triple["subject"] = bo_uri;
                        subclass_triple["predicate"] = "rdfs:subClassOf";
                        subclass_triple["object"] = "http://datalenergies.total.com/resource/tsf/idcp_v2/Business_Objects";
                        Lineage_blend.graphModification.creatingNodeTriples.push(subclass_triple);

                        Lineage_blend.graphModification.createNode();

                        /*
                // resume checkpoint

                Lineage_blend.graphModification.creatingNodeTriples=current_cretaing_triples;
                    */

                        //Associate with it

                        var bo_triple = {};
                        bo_triple["subject"] = uri;
                        bo_triple["predicate"] = "http://datalenergies.total.com/resource/tsf/idcp_v2/hasBO";
                        bo_triple["object"] = bo_uri;
                        Lineage_blend.graphModification.creatingNodeTriples.push(bo_triple);
                    }

                    //Parameter value
                    var parameter = $("#parameter_uri").val();

                    if (parameter.startsWith("http://datalenergies.total.com/resource/tsf/gidea-raw/")) {
                        //Is uri
                        //  Similar in gidea

                        var parameter_triple = {};
                        parameter_triple["subject"] = uri;
                        parameter_triple["predicate"] = "http://www.w3.org/2002/07/owl#equivalentClass";
                        parameter_triple["object"] = parameter;
                        Lineage_blend.graphModification.creatingNodeTriples.push(parameter_triple);
                    } else {
                        //Is == None
                        //Do nothing more
                    }
                }

                Lineage_blend.graphModification.createNode();
                //Add new node to the desired container
                Lineage_containers.addResourcesToContainer(Lineage_sources.activeSource, self.last_IDCP_container, node, null, self.IDCP_fillJstreeTypes);

                //Display new parameter and the button clear all
                $(document).ready(function () {
                    Lineage_containers.graphResources(Lineage_sources.activeSource, self.last_IDCP_container.data, { leaves: true }, function () {
                        $(".vis-manipulation").remove();
                        $(".vis-close").remove();
                        if (!self.loadedGraphDisplay) {
                            $("#graphDiv").prepend(self.buttonIDCPClearAll);
                            self.loadedGraphDisplay = true;
                        }
                    });
                });

            


            });

        }   



    };
    self.loadBOtree = function () {
        $("#rightPanelDiv").load("/vocables/snippets/lineage/lineageRightPanel.html #LineageContainersTab", function () {
            var all_right_pannel_descendants = $("#rightPanelDiv").find("*");

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
            var menu=$("#Lineage_containers_searchWhatInput").html();
            menu=menu+'\n<option value="datacontainer">Datacontainer</option>\n<option value="datablock">Datablock</option>\n<option value="parameter">Parameter</option>\n<option value="properties">Properties</option>\n<option value="disciplines">Disciplines</option>\n'
            $("#Lineage_containers_searchWhatInput").html(menu);
            $("#toolPanelLabel").text("IDCP DataConainers Search");
            //$("#Lineage_addContainer_button").text("Create New DataConainer ");
            $("#Lineage_addContainer_button").remove();

            //Search button modifs
            $("#Lineage_containers_searchInput").parent().append($("#search_button_container"));

            $("#search_button_container").removeAttr("onclick");
            $("#search_button_container").attr("onclick", "Idcp.IDCPsearch();");

            // Load images
            JstreeWidget.types["datacontainer"] = {
                icon: "../icons/datacontainer.png",
            };
            JstreeWidget.types["datablock"] = {
                icon: "../icons/datablock.png",
            };
            JstreeWidget.types["parameter"] = {
                icon: "../icons/Parameter.png",
            };
            JstreeWidget.types["properties"] = {
                icon: "../icons/properties.png",
            };
            JstreeWidget.types["disciplines"] = {
                icon: "../icons/disciplines.png",
            };
            JstreeWidget.types["bo"] = {
                icon: "../icons/bo.png",
            };
            JstreeWidget.types["enumeration"] = {
                icon: "../icons/enumeration.png",
            };
            JstreeWidget.types["attribute"] = {
                icon: "../icons/attribute.png",
            };
            

            //Initialize Jstree

            Lineage_containers.add_supplementary_layer_for_types_icon = self.add_supplementary_layer_for_types_icon;
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
            const groups = authentication.currentUser.groupes;
            if (groups.includes("IDCPDataowner")||groups.includes("admin")) {
                $("#Lineage_addContainer_button").removeAttr("onclick");

                $("#Lineage_addContainer_button").attr("onclick", "Idcp.idcp_addDataContainer();");
                //Lineage_containers.getContextJstreeMenu = self.buttonForIDCPDataOwner;
                self.isDataOwner = true;
            } else {
                $("#Lineage_addContainer_button").remove();
                self.isDataOwner = false;
            }
        });

        // Load BO Search part
        // TO remove
        //self.loadBOtree();
    };

    return self;
})();

export default Idcp;
window.Idcp = Idcp;
