var KGcreator = (function () {

    var self = {}
    self.usualProperties = [
        "rdf:type",
        "rdfs:subClassOf",
        "rdfs:label",
        "slsv:hasCode",
        "skos:definition",
        "skos:altLabel",
        "skos:prefLabel",
        "",
        "_function",
        "_restriction",
        ""


    ]

    self.usualObjectClasses = [
        "owl:Class",
        "rdfs:subClassOf",
        "rdfs:label",
        "slsv:TopConcept",
        "",
        "_function",
        "",


    ]
    self.usualSubjectTypes = [
        "_function",
        "",

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

        self.currentCsvDir = $("#KGcreator_csvDirsSelect").val()
        var payload = {
            listDirFiles: 1,
            dir: "CSV/" + self.currentCsvDir
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                var jstreeData = []

                result.forEach(function (file) {
                    if (file.indexOf(".json") > 0)
                        return;
                    var label = file
                    if (result.indexOf(file + ".json") > -1)
                        label = "<span class='KGcreator_fileWithMappings'>" + file + "</span>"
                    jstreeData.push({
                        id: file,
                        text: label,
                        parent: "#"

                    })
                })

                var options = {
                    openAll: true,
                    selectTreeNodeFn: function (event, obj) {
                        $("#KGcreator_dataSampleDiv").val("")
                        self.currentTreeNode = obj.node
                        if (obj.node.parents.length == 0)
                            return;
                        if (obj.node.parents.length == 2) {
                            $("#KGcreator_dataSampleDiv").val("")
                            var str = "Sample data for column " + obj.node.id + "\n"
                            str += ""
                            obj.node.data.sample.forEach(function (item) {
                                str += item[obj.node.id] + "\n"
                            })

                            $("#KGcreator_dataSampleDiv").val(str)
                            return
                        }


                        self.currentJsonObject = {
                            fileName: obj.node.id,
                            tripleModels: [],
                            transform: {},
                            lookups: [],
                            graphUri: ""
                        }
                        self.loadMappings()
                        if (obj.node.children.length > 0)
                            return;
                        var payload = {
                            readCsv: 1,
                            dir: "CSV/CFIHOS_V1.5_RDL",
                            fileName: obj.node.id,
                            options: JSON.stringify({lines: 100})
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
                                        data: {sample: result.data[0]}

                                    })
                                })
                                common.jstree.addNodesToJstree("KGcreator_csvTreeDiv", obj.node.id, jstreeData)
                            }, error: function (err) {
                                alert(err.responseText)
                            }
                        })
                    },
                    contextMenu: KGcreator.getSystemsTreeContextMenu(),

                }

                common.jstree.loadJsTree("KGcreator_csvTreeDiv", jstreeData, options)


            }, error: function (err) {
                alert(err.responseText)
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

        items.copy = {
            label: "Copy",
            action: function (e) {// pb avec source
                navigator.clipboard.writeText(self.currentTreeNode.id);
            }
        }

        items.showLookupDialog = {
            label: "Add lookup",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length < 1)
                    return;
                $("#KGcreator_dialogDiv").load("snippets/KGcreator/lookupdialog.html")
                $("#KGcreator_dialogDiv").dialog("open")

            }
        }
        items.showTransformDialog = {
            label: "Add Transform",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length !=2)
                    return;
                $("#KGcreator_dialogDiv").load("snippets/KGcreator/transformDialog.html",)
                $("#KGcreator_dialogDiv").dialog("open")

            }
        }

        items.loadMappings = {
            label: "load",
            action: function (e) {// pb avec source
                if (self.currentTreeNode.parents.length != 1)
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
                return alert(err.responseText)
        })


    }

    self.addTripleToTA = function () {
        $("#KGcreator_tripleMessageDiv").html("")
        var subject = $("#KGcreator_subjectInput").val()
        var predicate = $("#KGcreator_predicateInput").val()
        var object = $("#KGcreator_objectInput").val()
        var isObjectString = $("#KGcreator_isStringCBX").prop("checked")
        var isSubjectString = $("#KGcreator_isStringCBX").prop("checked")

        var subjectLookupName= $("#KGcreator_subjectLookupName").val()
        var objectLookupName= $("#KGcreator_objectLookupName").val()

        if (!subject)
            return $("#KGcreator_tripleMessageDiv").html("missing subject")
        if (!predicate)
            return $("#KGcreator_tripleMessageDiv").html("missing predicate")
        if (!object)
            return $("#KGcreator_tripleMessageDiv").html("missing object")


        if (subject.indexOf("_function") == 0) {
            subject = {[subject]: "..."}

        }
        if (object.indexOf("_function") == 0) {
            object = {[object]: "..."}
        }

        var tripleObj =
            {s: subject, p: predicate, o: object}

        if (isObjectString)
            tripleObj.isString = true
        if(subjectLookupName)
            tripleObj.lookup_s = subjectLookupName
        if(objectLookupName)
            tripleObj.lookup_o = objectLookupName

        self.currentJsonObject.tripleModels.push(tripleObj)

        self.mainJsonEditor.load(self.currentJsonObject)

        $("#KGcreator_objectInput").val("")
        $("#KGcreator_objectSelect").val("")
        $("#KGcreator_predicateInput").val("")
        $("#KGcreator_predicateSelect").val("")

        //   $("#KGcreator_tripleTA").val(JSON.stringify(tripleObj))

    }

    self.onTripleModelSelect=function(role,value){
self.currentTripleModelRole=role
        if(value=="_function"){
           return self.showFunctionDialog(role)
        }
        if(role=="s")
        $('#KGcreator_subjectInput').val(value)
        else if(role=="p")
            $('#KGcreator_predicateInput').val(value)
        else if(role=="o")
            $('#KGcreator_objectInput').val(value)

    }

    self.addLookup = function () {
        var lookup = {
            name: $("#KGCreator_lookupName").val(),
            fileName: $("#KGCreator_lookupFileName").val(),
            sourceColumn: $("#KGCreator_lookupSourceColumn").val(),
            targetColumn: $("#KGCreator_lookuptargetColumn").val(),
        }
        self.currentJsonObject = self.mainJsonEditor.get()
        self.currentJsonObject.lookups.push(lookup)
        self.mainJsonEditor.load(self.currentJsonObject)
        $("#KGcreator_dialogDiv").dialog("close")

    }
    self.showFunctionDialog=function(role){

        $("#KGcreator_dialogDiv").load("snippets/KGcreator/functionDialog.html",)
        $("#KGcreator_dialogDiv").dialog("open")

    }
    self.testFunction=function(){
        var fnBody=$("#KGcreator_fnBody").val()
        try {
            var fn = new Function("row","mapping",fnBody)
            $("#KGcreator_testFnResult").html("function OK")
        }
        catch(err){
            $("#KGcreator_testFnResult").html("error in function code "+err.message)

        }
    }
    self.addFunction = function () {

        var fnBody=$("#KGcreator_fnBody").val()

        try {
            var fn = new Function("row","mapping",fnBody)

        }
        catch(err){
           return alert("error in function code "+err.message)

        }
     var fnObject="function{"+fnBody+"}"
        //  var fnObject=JSON.stringify({"_function":fnBody})
        var role=self.currentTripleModelRole
        if(role=="s")
            $('#KGcreator_subjectInput').val(fnObject)
        else if(role=="p")
            $('#KGcreator_predicateInput').val(fnObject)
        else if(role=="o")
            $('#KGcreator_objectInput').val(fnObject)
        $("#KGcreator_dialogDiv").dialog("close")

    }

    self.addTransformFunction = function () {
        var column=$("#KGcreator_transformColumn").val()
        var fnBody=$("#KGcreator_fnBody").val()

        try {
            var fn = new Function("value", "role", "prop", "row",fnBody)

        }
        catch(err){
            return alert("error in function code "+err.message)

        }
        var fnObject="function{"+fnBody+"}"
        self.currentJsonObject = self.mainJsonEditor.get()
        self.currentJsonObject.transform[column]=fnObject;
        self.mainJsonEditor.load( self.currentJsonObject)

        $("#KGcreator_dialogDiv").dialog("close")

    }




    self.saveMappings = function (callback) {
        try {
            var data = self.mainJsonEditor.get()
        } catch (err) {
            var p = err.message.substring(err.message.indexOf("position") + 9)
            var x = $("#KGcreator_mainJsonDisplay").val()
            var y = $("#KGcreator_mainJsonDisplay")
            alert(err.responseText)
        }
        self.currentJsonObject = data;
        var payload = {
            saveData: 1,
            dir: "CSV/" + self.currentCsvDir,
            fileName: self.currentJsonObject.fileName + ".json",
            data: JSON.stringify(self.currentJsonObject)
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                MainController.UI.message("json saved")
                if (callback)
                    return callback()
            }, error(err) {
                if (callback)
                    return callback(err)
                return alert(err.responseText)
            }
        })

    }
    self.copyMappings = function () {
        try {
            var data = self.mainJsonEditor.get()

            data.tripleModels.forEach(function (item) {
                if (item.o["_function(line, mapping)_"]) {
                    var expression = item.o["_function(line, mapping)_"]
                    try {
                        var fn = new Function("line", "mapping", expression)
                        var x = fn({x: 1})
                    } catch (err) {
                        $("#KGcreator_dataSampleDiv").val(err)
                    }
                    item.o = fn
                }


            })

        } catch (err) {
            alert(err.responseText)
        }
    }
    self.clearMappings = function () {
        var data = self.mainJsonEditor.load({})
    }
    self.loadMappings = function () {
        if (self.currentJsonObject && self.currentJsonObject.tripleModels && self.currentJsonObject.tripleModels.length > 0) {
            if (confirm(" save current json before opening new file"))
                self.saveMappings(function (err, result) {
                })

        }
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
                ;// return alert(err.responseText)
            }
        })

    }
    self.createTriples = function (test) {
        if (!self.currentJsonObject)
            return;
        if (!self.currentJsonObject.graphUri) {
            var graphUri = prompt("enter graphUri")
            if (!graphUri)
                return;
            self.currentJsonObject.graphUri = graphUri
        }
        var options = {};
        if (test) {
            var options = {
                deleteOldGraph: false,
                sampleSize: 500
            }
        } else {
            var options = {
                deleteOldGraph: false,
            }
        }

        self.saveMappings(function (err, result) {
            $("#KGcreator_dataSampleDiv").val("")
            var payload = {
                createTriplesFromCsv: 1,
                dir: "CSV/" + self.currentCsvDir,
                fileName: self.currentJsonObject.fileName + ".json",
                options: JSON.stringify(options)

            }
            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (result, textStatus, jqXHR) {

                    if (test) {
                        var str = JSON.stringify(result, null, 2)

                        $("#KGcreator_dataSampleDiv").val(str)
                    } else {
                        $("#KGcreator_dataSampleDiv").val(result.countCreatedTriples + " triples created in graph " + self.currentJsonObject.graphUri)
                    }


                }, error(err) {
                    return alert(err.responseText)
                }
            })
        })


    }

    self.clearGraph = function () {
        if (!self.currentJsonObject)
            return alert("no file mappings selected");
        if (!self.currentJsonObject.graphUri)
            return alert("no graphUri");

        if (!confirm("clear graph " + self.currentJsonObject.graphUri))
            return;
        var payload = {
            clearGraph: self.currentJsonObject.graphUri,
        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
                return MainController.UI.message("graph deleted " + self.currentJsonObject.graphUri)
            }, error(err) {
                return MainController.UI.message(err)
            }
        })
    }

    return self;


})
()