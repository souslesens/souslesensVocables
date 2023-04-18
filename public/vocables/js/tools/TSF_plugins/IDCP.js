var Idcp = (function () {
    var self = {};
    
    // source & rights
    self.loadedGraphDisplay = false;
    self.source = "IDCP_V2";
    self.isDataOwner=null;
    
    // units
    self.units_available = {};

    //URI required
    self.datacontainerUri='http://datalenergies.total.com/resource/tsf/idcp_v2/DataContainer';
    self.datablockURI='http://datalenergies.total.com/resource/tsf/idcp_v2/DataBloc';
    self.parameterUri="http://datalenergies.total.com/resource/tsf/idcp_v2/Parameter";
    self.proprieteUri="http://datalenergies.total.com/resource/tsf/idcp_v2/Propriete";
    self.studyscenarioUri="http://datalenergies.total.com/resource/tsf/idcp_v2/Template"
    self.disciplineUri='http://datalenergies.total.com/resource/tsf/idcp_v2/Discipline';
    self.buttonIDCPClearAll='<button id="btn btn-sm my-1 py-0 btn-outline-primary" onclick="Idcp.idcpClearAll()">Clear all</button>';
    self.viewpointuri="http://datalenergies.total.com/resource/tsf/idcp_v2/bag/IDCP";

    
    
    
    //Available buttons for differents clicks
    //["NodeInfos","GraphContainerDescendantAndLeaves" ,"AddParameter" ,"DeleteContainer" ,"copy" ,"paste" ,"delete from bag","Create Object"]
    self.keys_DataContainercaseForDataOwners=[];
    self.keys_viewpointcaseForDataOwners=[];
    self.keys_DatacontainersForDataOwners=["NodeInfos","GraphContainerDescendantAndLeaves" ,"Create Object" ,"DeleteContainer" ,"copy", "delete from bag"];
    self.keys_DatacontainersForDataUsers=["NodeInfos","GraphContainerDescendantAndLeaves" ,"copy","delete from bag"];
    self.keys_DatablockForDataOwners=["NodeInfos","GraphContainerDescendantAndLeaves" ,"copy","AddParameter","DeleteContainer"];
    self.keys_DatablockForDataUsers=["NodeInfos","GraphContainerDescendantAndLeaves" ,"copy" ];
    self.keys_ParameterForDataUsers=["NodeInfos","delete from bag"];
    self.keys_ParameterForDataOwners=["NodeInfos","delete from bag"];
    self.keys_viewpointForDataUsers=["NodeInfos","GraphContainerDescendantAndLeaves" ,"paste","Create Object"];
    self.keys_viewpointForDataOwners=["NodeInfos","GraphContainerDescendantAndLeaves" ,"paste","Create Object"];
    self.keys_studyscenarioForDataOwners=["NodeInfos","GraphContainerDescendantAndLeaves" ,"paste","Create Object","DeleteContainer"];
    self.keys_studyscenarioForDataUsers=["NodeInfos","GraphContainerDescendantAndLeaves" ,"paste","Create Object"];
    self.keys_disciplineForDataOwners=["NodeInfos","GraphContainerDescendantAndLeaves" ,"paste","Create Object","DeleteContainer" ];
    self.keys_disciplineForDataUsers=["NodeInfos","GraphContainerDescendantAndLeaves" ,"paste","Create Object" ];
    
    // all buttons availables in a dict with their linked function
    self.all_IDCPitemscontextmenu={
        "NodeInfos" : {
            label: "Modify name or informations",
            action: function (_e) {
                self.IDCP_restrainednodeinfo_andmodification();
            },
        },
        "GraphContainerDescendantAndLeaves" :{
            label: "Show DataContainers and his parameters",
            action: function (_e) {
                self.IDCPDisplayGraphContainersLeaves();
            },
        },
        
        "AddParameter" :{
            label: "Add a new parameter to this DataContainer ",
            action: function (_e) {
                
                self.IDCPAddNode();
 
                 
            },
        },
        "DeleteContainer" :{
            label: "Delete a DataContainer or a parameter",
            action: function (_e) {
                Lineage_containers.deleteContainer(Lineage_sources.activeSource, Lineage_containers.currentContainer);
                self.IDCP_fillJstreeTypes();
            },
        },
        "copy" :{
            label: "Copy ",
            action: function (_e) {
                self.IDCP_copy_container(_e);
            },
        },
        "paste" :{
            label: "Paste ",
            action: function (_e) {
                self.IDCP_paste_container();
            },
        },

        "delete from bag":{
            label: "delete from bag ",
            action: function (_e) {
                self.IDCP_delete_from_bag();
            },
        },
        "Create Object":{
            label: "Create New DataContainer ",
            action: function (_e) {
                self.idcp_addDataContainer(_e);
            },
        }


    }
    



    // Functions writed for IDCP use case
    self.onSelectedNodeTreeclick=function (event, obj) {
        Lineage_containers.currentContainer = obj.node;
        //double click
        if (obj.event.button != 2) {
            Lineage_containers.listContainerResources(Lineage_sources.activeSource, Lineage_containers.currentContainer, { onlyOneLevel: true, leaves: true },function(nodes_added){
                self.IDCP_fillJstreeTypes(nodes_added);
            });
            
        }
        // Arborescence construction specific nodes
        
        var uri=obj.node.data.id;
        // Datacontainer case
        if(uri==self.datacontainerUri){
            if(self.isDataOwner){
                var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_DataContainercaseForDataOwners);
                //filtred_contextmenu["Create Object"].label="Create new DataContainer"
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
            }
            else{
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items={};
            }
  
        }
        // ViewPoint case

        else if(uri==self.viewpointuri){
            if(self.isDataOwner){
                var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_viewpointcaseForDataOwners);
                filtred_contextmenu["Create Object"].label="Create new viewpoint"
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;

            }
            else{
                $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items={};
            }
  
        }


        // Verification on JS Tree
        // types
        else{
             
            //get type on Js tree
            var types=obj.node.data['rdf:types']
            if(types){
                if (types.includes(self.datacontainerUri)){
                
                    if(self.isDataOwner){
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_DatacontainersForDataOwners);
                        filtred_contextmenu["Create Object"].label="Create new DataBlock";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
        
                    }
                    else{
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_DatacontainersForDataUsers);
                        filtred_contextmenu["Create Object"].label="Create new DataBlock";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
                    }
                }
                
                if (types.includes(self.datablockURI)){
                    if(self.isDataOwner){
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_DatablockForDataOwners);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
        
                    }
                    else{
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_DatablockForDataUsers);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
                    }
    
                }
                if (types.includes(self.proprieteUri)){
                    if(self.isDataOwner){
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_ParameterForDataOwners);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
        
                    }
                    else{
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_ParameterForDataUsers);
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
                    }
    
                }
                if (types.includes(self.viewpointuri)){
                    if(self.isDataOwner){
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_viewpointForDataOwners);
                        filtred_contextmenu["Create Object"].label="Create new "+obj.node.data.label;
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
        
                    }
                    else{
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_viewpointForDataUsers);
                        filtred_contextmenu["Create Object"].label="Create new "+obj.node.data.label;
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
                    }
    
                }


                if(types.includes(self.studyscenarioUri)){
                    if(self.isDataOwner){
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_studyscenarioForDataOwners);
                        filtred_contextmenu["Create Object"].label="Create new Element";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
                        
        
                    }
                    else{
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_studyscenarioForDataUsers);
                        filtred_contextmenu["Create Object"].label="Create new Element";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
                    }
    
    
                }
                if(types.includes(self.disciplineUri)){
                    if(self.isDataOwner){
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_disciplineForDataOwners);
                        filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
        
                    }
                    else{
                        var filtred_contextmenu=self.IDCP_filtredkeysmenu(self.keys_disciplineForDataUsers);
                        filtred_contextmenu["Create Object"].label="Create new DataContainer";
                        $("#lineage_containers_containersJstree").jstree().settings.contextmenu.items=filtred_contextmenu;
                    }
                }
            

            }
            
            
        }
        
        
    };

    self.IDCP_fillJstreeTypes= function(nodetoaddtypes){
        
          if(!nodetoaddtypes){
            var all_jskeys=$("#lineage_containers_containersJstree").jstree()._model.data;
          }
          else{
            var all_jskeys=nodetoaddtypes;
          } 
          
           
           Object.entries(all_jskeys).forEach(([key,value]) => {
                
                var key_id=value.id
                if(key_id!='#'){
                    
                    var uri=value.data.id;
                   
                    Sparql_generic.getNodeInfos(self.source,uri, null, function (err, result) {
                        
                        if (err) {
                        return MainController.UI.message(err);
                        }
                       
                        var types=result.filter(triple => triple.prop.value =='http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
                        var types=types.filter(triple => (triple.value.value !='http://www.w3.org/2002/07/owl#Class')&&(triple.value.value !='http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag')&&(triple.value.value !='http://www.w3.org/2002/07/owl#NamedIndividual'));
                        var types=types.map(type => type.value.value);
                        $("#lineage_containers_containersJstree").jstree()._model.data[key_id].data["rdf:types"]=types;
                        
                        
                        
                    })
                    
                }

            });



    }

    self.IDCP_filtredkeysmenu=function(list_of_keys){

        return(Object.fromEntries(Object.entries(self.all_IDCPitemscontextmenu).filter(([key]) => list_of_keys.includes(key))));
    }
    // delete from bag
    //This function is called uniquely where we have the rights

    self.IDCPsearch=function(){
        Lineage_containers.search(self.IDCP_fillJstreeTypes);


    }
    self.IDCP_delete_from_bag=function(){
        var uri=Lineage_containers.currentContainer.data.id
        var parent_uri =$("#lineage_containers_containersJstree").jstree()._model.data[Lineage_containers.currentContainer.parent].data.id
        Sparql_generic.deleteTriples(self.source, parent_uri, "http://www.w3.org/2000/01/rdf-schema#member", uri, function (err, _result) {
           

           $("#lineage_containers_containersJstree").jstree().delete_node(Lineage_containers.currentContainer.id);
        });
        

    }
       
    
    //copy 
    self.IDCP_copy_container=function(e){

        SourceBrowser.copyNode(e);
        var selectedNodes = $("#lineage_containers_containersJstree").jstree().get_selected(true);
        Lineage_common.copyNodeToClipboard(selectedNodes);
    }
    //paste
    self.IDCP_paste_container=function(){

        Lineage_containers.pasteNodesInContainer(self.source, Lineage_containers.currentContainer);
        
    }


    
    self.IDCP_restrainednodeinfo_andmodification=function(){
        SourceBrowser.showNodeInfos(Lineage_sources.activeSource, Lineage_containers.currentContainer, "mainDialogDiv");
        /*
        if(!(Lineage_sources.isSourceEditable(self.source))){
            
            $(document).ready(function () {
                console.log($(".infosTable").children());
            }
        }
        */

    };

    self.IDCPAddNode=function(){
        // demande d'ajout sur les unités
        $("<div>").dialog({
            modal: true,
            open: function () {
                var dialog = $(this);
                $(this).load("snippets/lineage/lineageAddNodeDialog.html #LineageBlend_creatingNodeSingleTab", function () {
                    self.adding_parameter_hide();
                    $("#LineageBlend_creatingNodeClassDiv").load("snippets/commonUIwidgets/editPredicateDialog.html", function () {
                        CommonUIwidgets.predicatesSelectorWidget.init(self.source, function () {
                            CommonUIwidgets.predicatesSelectorWidget.setVocabulariesSelect(self.source, "_curentSourceAndImports");
                            self.widget_preselection_and_hide(dialog);
                            //$('#unit of mesure').
                            self.units_available.forEach(unit => {
                                var unit_uri=unit[0];
                                var unit_name=unit[1];
                                $('#unit_of_mesure').append(`<option id=${unit_uri}>${unit_name}</option>`);
                            })
                            console.log($('#unit_of_mesure'));

                        });
                    });
                });
            },
            height: 300,
            width: 800,
            title: "Renseign your parameter",
            close: function () {
                $(this).dialog("close");
                $(this).remove();
            },
        });

    };
    self.IDCPDisplayGraphContainersLeaves=function(){
        Lineage_containers.graphResources(Lineage_sources.activeSource, Lineage_containers.currentContainer.data, { leaves: true }, function () {
            $(".vis-manipulation").remove();
            $(".vis-close").remove();
            if (!self.loadedGraphDisplay) {
                $("#graphDiv").prepend(self.buttonIDCPClearAll);
                self.loadedGraphDisplay = true;
            }
        });

    };
    
   
   
    self.idcp_addDataContainer = function (e) {
        
        var key_id=e.reference.prevObject.selector.replace('#',"");
        var uri=$("#lineage_containers_containersJstree").jstree()._model.data[key_id].data.id;
        var label=$("#lineage_containers_containersJstree").jstree()._model.data[key_id].data.label;
        var types=$("#lineage_containers_containersJstree").jstree()._model.data[key_id].data['rdf:types'];
        if(types.includes(self.datacontainerUri)){
            label='Datablock';
            uri=self.datablockURI;
        }
        if(types.includes(self.disciplineUri)){
            label='DataContainer';
            uri=self.datacontainerUri;
        }

        var source = self.source;
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

            if (!$("#lineage_containers_containersJstree").jstree) {
                // initialize jstree
                self.search(function (err, result) {
                    $("#lineage_containers_containersJstree")
                        .jstree()
                        .create_node(parent, newNode, "first", function (err, result) {
                            $("#lineage_containers_containersJstree").jstree().open_node(parent);
                        });
                });
            } else {
                $("#lineage_containers_containersJstree")
                    .jstree()
                    .create_node(parent, newNode, "first", function (err, result) {
                        $("#lineage_containers_containersJstree").jstree().open_node(parent);
                    });
                    self.IDCP_fillJstreeTypes(newNode);
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

    self.widget_preselection_and_hide = function (dialog) {
        // Preselect widget options and hide
        var parameter_menu = $("#editPredicate_objectSelect");
        parameter_menu.append(`<option value="${self.parameterUri}">Parameter</option>`);
        parameter_menu.val(self.parameterUri);
        $("#button_Class_to_creatingNodeMenu").removeAttr("onclick");
        

        $("#button_Class_to_creatingNodeMenu").attr("onclick", `Idcp.idcp_addParameter('${dialog.get(0).id}');`);
        $("#LineageBlend_creatingNodeClassDiv").css("display", "none");
        
        var label_parent=$("#LineageBlend_creatingNodeNewClassLabel").parent();
        label_parent.html(label_parent.html().replace('rdfs:label','Name of the new Parameter'));
        label_parent.append('<br>unit of mesure <select name="unit" id="unit_of_mesure" ></select>');
        label_parent.append('<br>Definition : <br><textarea style="width: 350px" style="margin: 10px" id="LineageBlend_creatingNodeNewClassDefinition"></textarea>');
        
    };
    self.idcp_addParameter = function (dialogdiv) {

        //take the label and initiate triples
        Lineage_blend.graphModification.currentCreatingNodeType = "Class";
        Lineage_blend.graphModification.creatingsourceUri = undefined;
        Lineage_blend.graphModification.addClassOrIndividualTriples();
        

        //recreate node object
        var uri = Lineage_blend.graphModification.creatingNodeTriples[0]["subject"];
        var label_node = Lineage_blend.graphModification.creatingNodeTriples[0]["object"];
        var node = { source: self.source, label: label_node, id: uri };
       
        // Add the definition as triple to the new node
        var definition=$("#LineageBlend_creatingNodeNewClassDefinition").val();
        var definition_triple={}
        definition_triple['subject']=uri;
        definition_triple['predicate']='rdfs:isDefinedBy';
        definition_triple['object']=definition;
        Lineage_blend.graphModification.creatingNodeTriples.push(definition_triple);



        Lineage_blend.graphModification.createNode();
        //Add new node to the desired container
        Lineage_containers.addResourcesToContainer(self.source, Lineage_containers.currentContainer, node);

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

    self.onLoaded = function () {
        Lineage_blend.graphModification.creatingNodeTriples = [];

        


        Lineage_sources.activeSource = self.source;
        $("#rightPanelDiv").remove();
        $("#actionDivContolPanelDiv").remove();
        $("#actionDiv").remove();

        var search_pannel = $("#toolPanelDiv").append("<div id='IDCP search pannel'>Search Datacontainers</div>");
        var html_content = search_pannel.append("<div id='IDCP right pannel'></div>");

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
            
            

            $("#graphDiv").text('');
            
            $("#graphDiv").prepend(self.buttonIDCPClearAll);
            Lineage_containers.onSelectedNodeTreeclick=self.onSelectedNodeTreeclick;

            //var sourceVariables = Sparql_generic.getSourceVariables(self.source);
            var url = Config.sources[self.source].sparql_server.url + "?format=json&query=";
            var query=`PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            SELECT * WHERE {
              GRAPH  <http://datalenergies.total.com/resource/tsf/idcp_v2/> {
              ?sub rdfs:subClassOf <http://datalenergies.total.com/resource/tsf/idcp_v2/unit_of_measure> .
              ?sub rdfs:label ?o.
              }
            } LIMIT 10
            `

            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: self.source }, function (err, result) {
                if (err) {
                    return callback(err);
                }
                var units=result.results.bindings;
                units=units.map(result=>[result.sub.value,result.o.value]);
                //result.o.value}
                self.units_available=units;
                
            });



            if(Lineage_sources.isSourceEditable(self.source)){

                $("#Lineage_addContainer_button").removeAttr("onclick");

                $("#Lineage_addContainer_button").attr("onclick", "Idcp.idcp_addDataContainer();");
                //Lineage_containers.getContextJstreeMenu = self.buttonForIDCPDataOwner;
                self.isDataOwner=true;
            }
            else{
                $("#Lineage_addContainer_button").remove();
                Lineage_containers.getContextJstreeMenu = self.buttonForIDCPDataReader;
                self.isDataOwner=false;
            }
            
        });
        
        
    };

    return self;
})();
