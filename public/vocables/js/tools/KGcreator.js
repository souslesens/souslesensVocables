var KGcreator = (function () {

    var self = {}
    self.usualProperties = [
        "rdf:type",
        "rdfs:subClassOf",
        "rdfs:label",
        "_function",
        "_lookup",
        "slsv:hasCode",
        "skos:definition",
        "skos:altLabel",
        "skos:prefLabel",


    ]

    self.usualObjectClasses = [
        "owl:Class",
        "rdfs:subClassOf",
        "rdfs:label",
        "_function",
        "_lookup",
        "_restriction",

    ]
    self.usualSubjectTypes = [
        "_function",
        "_lookup",

    ]


    self.onLoaded = function () {


        $("#actionDivContolPanelDiv").load("snippets/KGcreator/leftPanel.html", function () {

        })

        $("#graphDiv").load("snippets/KGcreator/centralPanel.html", function () {


            self.initCentralPanel()
        })
        $("#rightPanelDiv").load("snippets/KGcreator/rightPanel.html", function () {
        })
        $("#accordion").accordion("option", {active: 2});
    }

    self.listFiles = function () {

self.currentCsvDir=$("#KGcreator_csvDirsSelect").val()
        var payload = {
            listDirFiles: 1,
            dir: "CSV/"+self.currentCsvDir
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                var jstreeData = []

                result.forEach(function (file) {
                    jstreeData.push({
                        id: file,
                        text: file,
                        parent: "#"

                    })
                })

                var options = {
                    openAll: true,
                    selectTreeNodeFn: function (event, obj) {
                        self.currentTreeNode = obj.node
                        if (obj.node.parents.length == 0)
                            return;
                        if (obj.node.parents.length == 2) {
                            var html="<ul>"
                            obj.node.data.sample.forEach(function(item){
                                html+="<li>"+item[obj.node.id]+"</li>"
                            })
                             html+="</ul>"
                            $("#KGcreator_dataSampleDiv").html(html)
                            return
                        }
                        if (obj.node.children.length> 0)
                            return;
                        self.currentJsonObject= {fileName:obj.node.id,tripleModels:[],transform:{}, lookups: [],graphUri:""}
                        self.loadMappings()
                        var payload = {
                            readCsv: 1,
                            dir: "CSV/CFIHOS_V1.5_RDL",
                            fileName: obj.node.id,
                            options: JSON.stringify({lines: 10})
                        }
                        $.ajax({
                            type: "POST",
                            url: Config.serverUrl,
                            data: payload,
                            dataType: "json",
                            success: function (result, textStatus, jqXHR) {
                                var jstreeData = []

                                result.headers.forEach(function (col) {
                                    jstreeData.push({
                                        id: col,
                                        text: col,
                                        parent: obj.node.id,
                                        data:{sample:result.data[0]}

                                    })
                                })
                                common.jstree.addNodesToJstree("KGcreator_csvTreeDiv", obj.node.id, jstreeData)
                            }, error: function (err) {
                                alert(err)
                            }
                        })
                    },
                    contextMenu: KGcreator.getSystemsTreeContextMenu(),

                }

                common.jstree.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options)


            }, error: function (err) {
                alert(err)
            }
        })

    }

    self.getSystemsTreeContextMenu = function () {
        var items = {}


        items.setAsSubject = {
            label: "Subject",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length < 2)
                    return;
                $("#KGcreator_subjectInput").val(self.currentTreeNode.id)
            }
        }

        items.setAsObject = {
            label: "Object",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length < 2)
                    return;
                $("#KGcreator_objectInput").val(self.currentTreeNode.id)
            }
        }
        items.setLookup = {
            label: "lookup",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length < 2)
                    return;

                $("#KGcreator_dialogDiv").dialog("open")
                $("#KGcreator_dialogDiv").html(html)
            }
        }
        items.setTransform = {
            label: "transform",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length < 2)
                    return;

                var html= " <button onclick='KGcreator.validateDialog()'>" +
                    "</button> <pre id=\"KGcreator_dialogJsonDisplay\" style=\"width: 100%;height:500px;\"></pre>"
                $("#KGcreator_dialogDiv").dialog("open")
                $("#KGcreator_dialogDiv").html(html)
                self.dialogJsonEditor = new JsonEditor('#KGcreator_dialogJsonDisplay', {});
            }
        }

        items.loadMappings = {
            label: "load",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length !=1)
                    return;
              KGcreator.loadMappings()
            }
        }


        return items

    }

    self.initCentralPanel = function () {
        async.series([
            function (callbackSeries) {
                Sparql_OWL.getDictionary("ISO_15926-part-14_PCA", null, null, function (err, result) {
                    if (err)
                        callbackSeries(err);
                    result.sort(function (a, b) {
                        if (!a.label || !b.label)
                            return 0
                        if (a.label.value > b.label.value)
                            return 1;
                        if (a.label.value < b.label.value)
                            return -1;
                        return 0;
                    })
                    result.forEach(function (item) {
                        if (item.id.type == "bnode")
                            return;
                        self.usualObjectClasses.push("part14:" + item.label.value)
                    })
                    callbackSeries()
                })
            },
            function (callbackSeries) {
                Sparql_OWL.getObjectProperties("ISO_15926-part-14_PCA", null, null, function (err, result) {
                    if (err)
                        callbackSeries(err);
                    result.sort(function (a, b) {
                        if (!a.propLabel || !b.propLabel)
                            return 0
                        if (a.propLabel.value > b.propLabel.value)
                            return 1;
                        if (a.propLabel.value < b.propLabel.value)
                            return -1;
                        return 0;
                    })
                    result.forEach(function (item) {

                        self.usualProperties.push("part14:" + item.propLabel.value)
                    })
                    callbackSeries()
                })
            },
            function (callbackSeries) {
                common.fillSelectOptions("KGcreator_subjectSelect", self.usualSubjectTypes, true)
                common.fillSelectOptions("KGcreator_predicateSelect", self.usualProperties, true)
                common.fillSelectOptions("KGcreator_objectSelect", self.usualObjectClasses, true)
            self.mainJsonEditor = new JsonEditor('#KGcreator_mainJsonDisplay', {});
             /*   tinymce.init({
                    selector: '#KGcreator_tripleTA',
                    menubar: false,
                    plugins: [
                        'advlist autolink lists link image charmap print preview anchor',
                        'searchreplace visualblocks code fullscreen',
                        'insertdatetime media table paste code help wordcount'
                    ],
                    toolbar: 'undo redo | formatselect | ' +
                        'bold italic backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | help',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                });

                tinymce.activeEditor.execCommand('mceCodeEditor');*/

                $("#KGcreator_dialogDiv").dialog({
                    autoOpen: false,
                    height: 400,
                    width: 600,
                    modal: false
                })
                callbackSeries()
            }

        ], function (err) {
            if (err)
                return alert(err)
        })


    }

    self.addTripleToTA = function () {
        $("#KGcreator_tripleMessageDiv").html("")
        var subject = $("#KGcreator_subjectInput").val()
        var predicate = $("#KGcreator_predicateInput").val()
        var object = $("#KGcreator_objectInput").val()
        var isObjectString = $("#KGcreator_isStringCBX").prop("checked")
        var isSubjectString = $("#KGcreator_isStringCBX").prop("checked")

        if (!subject)
            return $("#KGcreator_tripleMessageDiv").html("missing subject")
        if (!predicate)
            return $("#KGcreator_tripleMessageDiv").html("missing predicate")
        if (!object)
            return $("#KGcreator_tripleMessageDiv").html("missing object")




        if (subject == "_function") {
            subject = {function:"..."}

        }
        if (object == "_function") {
            object =  {function:"..."}
        }

        var tripleObj =
            {s: subject, p: predicate, o: object}

        if (isObjectString)
            tripleObj.isString = true

        self.currentJsonObject.tripleModels.push(tripleObj)

        self.mainJsonEditor.load( self.currentJsonObject)

        $("#KGcreator_objectInput").val("")
        $("#KGcreator_objectSelect").val("")
        $("#KGcreator_propertyInput").val("")
        $("#KGcreator_propertySelect").val("")

        //   $("#KGcreator_tripleTA").val(JSON.stringify(tripleObj))

    }
    self.saveMappings=function(callback) {
        var data = self.mainJsonEditor.get()

        var payload = {
            saveData: 1,
            dir: "CSV/"+self.currentCsvDir,
            fileName: self.currentJsonObject.fileName+".json",
            data: JSON.stringify(self.currentJsonObject)
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
              $("#KGcreator_dialogDiv").html("json saved")
                if(callback)
                    return callback()
            }, error(err) {
                if(callback)
                    return callback(err)
                return alert(err)
            }
        })

    }
    self.copyMappings=function(){
        var data=self.mainJsonEditor.get()
    }
    self.clearMappings=function(){
        var data=self.mainJsonEditor.load({})
    }
    self.loadMappings=function() {
        if (self.currentJsonObject && self.currentJsonObject.tripleModels && self.currentJsonObject.tripleModels.length > 0) {
            if (confirm(" save current json before opening new file"))
                self.saveMappings(function (err, result) {
                })


            var payload = {
                readDataFile: 1,
                dir: "CSV/" + self.currentCsvDir,
                fileName: self.currentJsonObject.fileName + ".json",

            }
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (result, textStatus, jqXHR) {
                    self.currentJsonObject = JSON.parse(result.result)
                    self.mainJsonEditor.load(self.currentJsonObject)

                }, error(err) {
                    return alert(err)
                }
            })

        }
        createTriples = function () {
            if (!self.currentJsonObject)
                return;
            if (!self.currentJsonObject.graphUri) {
                var graphUri = prompt("enter graphUri")
                if (!graphUri)
                    return;
                self.currentJsonObject.graphUri = graphUri
            }
            self.saveMappings(function (err, result) {
                var payload = {
                    createTriplesFromCsv: 1,
                    dir: "CSV/" + self.currentCsvDir,
                    fileName: self.currentJsonObject.fileName + ".json",

                }
                $.ajax({
                    type: "POST",
                    url: Config.serverUrl,
                    data: payload,
                    dataType: "json",
                    success: function (result, textStatus, jqXHR) {
                        self.currentJsonObject = JSON.parse(result.result)
                        self.mainJsonEditor.load(self.currentJsonObject)

                    }, error(err) {
                        return alert(err)
                    }
                })
            })

        }
    }


    return self;


})
()