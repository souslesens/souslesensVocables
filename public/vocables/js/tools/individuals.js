var Individuals = (function () {

        var self = {}
        self.currentSource = null;


        self.onLoaded = function () {
            $("#graphDiv").load("./snippets/individuals.html");

        }
        self.onSourceSelect = function (source) {
            self.currentSource = source;
            OwlSchema.currentSourceSchema = null;


            setTimeout(function () {
                self.loadOntology();
            }, 200)


        }


        self.jstreeContextMenu = function (type) {
            function getSelectedNode(e){
                var treeId=e.reference.context.id
              return $("#"+treeId).jstree(true).get_selected(true)[0]
            }
            var items = {};
            if(!type)
                return;
            if(type=="Column" || type=="Class") {
                items.tripleSubject = {
                    label: "tripleSubject",
                    action: function (e) {// pb avec source
                       var ss= getSelectedNode(e)
                        self.setTripleObject("Subject", getSelectedNode(e).data)
                    }

                }
                items.newTripleSubject = {
                    label: "newTripleSubject",
                    action: function (e) {
                        var x=e.reference.prevObject[0]
                        self.setTripleObject("Subject", getSelectedNode(e).data,true)
                    }

                }
                items.tripleObject = {
                    label: "tripleObject",
                    action: function (e) {
                        var x=e.reference.prevObject[0]
                        var text=x.innerText
                        self.setTripleObject("Object", getSelectedNode(e).data)
                    }
                }
            }else  if(type=="Property"){
                items.triplePredicate= {
                    label: "triplePredicate",
                    action: function (e) {
                        var x=e.reference.prevObject[0]
                        var text=x.innerText
                        self.setTripleObject("Predicate", getSelectedNode(e).data)
                    }
                }

            }
            return items
        }


            self.setTripleObject = function (type,nodeData,newTripleDiv) {


                if (newTripleDiv)
                    self.newTripleMapping()
                setTimeout(function () {
                    var div = $("#" + self.currentMappingTripleDiv + " .mapping" + type);
                    $(div).html(nodeData.id)

                }, 200)
            }




        self.newTripleMapping = function () {
            var index=common.getNewId("mappingTripleCell")
            var id="mappingTriple_"+index
            self.currentMappingTripleDiv=id;
            var html = "<div class=mappingTriple id='"+id+"' onclick='Individuals.selectMappingTriple($(this))'>" +
                "<div class='mappingTripleCell mappingSubject'></div>" +
                "<div class='mappingTripleCell mappingPredicate'></div>" +
                "<div class='mappingTripleCell mappingObject'></div>" +
                "<div class='mappingTripleButton mappingTripleCell'  onclick='Individuals.deleteTripleDiv($(this))'>X</div> " +

                "</div>"
            $("#Individuals_mappingsTriplesDiv").append(html)
            self.selectMappingTriple($("#"+id))

        }

        self.deleteTripleDiv=function(div){
            $(div).parent().remove()
        }

        self.selectMappingTriple=function(div){
            $(".mappingTriple").removeClass("mappingTripleSelected")
            $(div).addClass("mappingTripleSelected")
            self.currentMappingTripleDiv=$(div).attr("id")
        }

        self.saveMappings = function () {
            var data=[];
            $(".mappingTriple").each(function(){
                var subject=$(this).find(".mappingSubject").html()
                var predicate=$(this).find(".mappingPredicate").html()
                var object=$(this).find(".mappingObject").html()
                data.push({
                    subject:subject,
                    predicate:predicate,
                    object:object

                })

            })

            $("#Individuals_mappingsTriplesTA").val(JSON.stringify(data,null,2))

        }


        self.loadOntology = function () {
            var filter = "filter (regex(str(?concept),'http://data.total.com/resource/one-model/ontology#','i')) "


            Sparql_OWL.getItems(self.currentSource, {filter: filter}, function (err, result) {
                if (err)
                    return MainController.UI.message(message)
                var classJstreeData = []
                var propertyJstreeData = [{
                    id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    text: "type",
                    parent: "#",
                    data: {type: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", label: "type", source: self.currentSource}
                },
                    {
                        id: "http://www.w3.org/2000/01/rdf-schema#label",
                        text: "label",
                        parent: "#",
                        data: {type: "http://www.w3.org/2000/01/rdf-schema#label", id: "http://www.w3.org/2000/01/rdf-schema#label", label: "label", source: self.currentSource}
                    }]
                var existingNodes = {}
                result.forEach(function (item) {
                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1

                        var obj = {
                            id: item.concept.value,
                            text: item.conceptLabel.value,
                            parent: "#",
                            data: {type: item.conceptType.value, id: item.concept.value, label: item.conceptLabel.value, source: self.currentSource}

                        }
                        if (item.conceptType.value == "http://www.w3.org/2002/07/owl#Class") {
                            classJstreeData.push(obj)

                        } else if (item.conceptType.value == "http://www.w3.org/2002/07/owl#ObjectProperty") {
                            propertyJstreeData.push(obj)
                        }
                    }


                })
                var optionsClass = {
                    selectTreeNodeFn: function (event, obj) {
                        self.currentClassJstreeNode=obj.node
                        self.currentJstreeNode=obj.node

                    },
                    contextMenu: self.jstreeContextMenu("Class")
                }
                var optionsProperty = {
                    selectTreeNodeFn: function (event, obj) {
                        self.currentPropertyJstreeNode=obj.node
                        self.currentJstreeNode=obj.node

                    },
                    contextMenu: self.jstreeContextMenu("Property")
                }

                common.loadJsTree("Individuals_ontologyClassesTree", classJstreeData,optionsClass)
                common.loadJsTree("Individuals_ontologyPropertiesTree", propertyJstreeData,optionsProperty)

            })
        }

        self.loadXlsModel = function (path) {
            var path = "D:\\NLP\\ontologies\\assets\\turbogenerator\\TO-G-6010A FJ-BCmodel.json"
            var payload = {
                xlsxProxy: 1,
                getJsonModel: path
            }


            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",

                success: function (data, textStatus, jqXHR) {
                    var modelJstreeData = []
                    var existingNodes = {}
                    for (var key in data) {
                        modelJstreeData.push({
                            id: key,
                            text: key,
                            parent: "#",
                            data: {type: "table", id: key, label: key, source: path}
                        })

                        data[key].forEach(function (item) {

                            modelJstreeData.push({
                                id: key + "." + item,
                                text: item,
                                parent: key,
                                data: {type: "column", id: key + "." + item, label: item, source: path}

                            })
                        })
                    }

                    var options = {
                        selectTreeNodeFn: function (event, obj) {
                            self.currentModelJstreeNode=obj.node
                            self.currentJstreeNode=obj.node

                        },
                        contextMenu: self.jstreeContextMenu("Column")
                    }
                    common.loadJsTree("Individuals_dataModelTree", modelJstreeData,options)
                    $("#waitImg").css("display", "none");
                }
                , error: function (err) {


                    $("#waitImg").css("display", "none");
                    console.log(JSON.stringify(err))
                    console.log(JSON.stringify(query))
                    MainController.UI.message(err.responseText);
                }
            })


        }


        return self;
    }
)()
