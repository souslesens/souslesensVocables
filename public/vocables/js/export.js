var Export = (function () {


    var self = {}
    self.context = null;
    self.currentOptions = {};
    self.currentSource = null
    self.showExportDatDialog = function (source, context, options, callback) {
        self.currentSource = source
        self.context = context;
        self.currentOptions = options || {}

        $("#mainDialogDiv").load("snippets/exportToTableDialog.html")
        $("#mainDialogDiv").dialog("open")
        setTimeout(function () {
                $("#exportTable_tabs").tabs({});

                if (self.context == "BLENDER") {
                    var jstreeData = [];
                    Sparql_generic.getDistinctPredicates(source, {}, function (err, result) {
                        result.forEach(function (item) {
                            jstreeData.push({
                                id: item.p.value,
                                text: item.pLabel.value,
                                parent: "#"
                            })
                        })
                        var options = {withCheckboxes: true};
                        common.jstree.loadJsTree("exportTable_jstreeDiv", jstreeData, options, function (err, result) {

                            if (Config.sources[source].schemaType == "SKOS") {
                                var ids = ["http://www.w3.org/2004/02/skos/core#broader", "http://www.w3.org/2004/02/skos/core#narrower"]
                                $("#exportTable_jstreeDiv").jstree().check_node(ids)

                            }
                        });

                    })

                } else if (self.context == "GRAPH") {
                } else if (self.context == "SEARCH") {
                } else if (self.context == "TREE") {
                }

            },
            200)

    }


    self.cancelExportDialog = function () {
        $("#mainDialogDiv").dialog("close")
    }

    self.execExport = function () {


        if (self.context == "BLENDER") {
            var selectedProperties = $("#exportTable_jstreeDiv").jstree().get_checked();
            var langs = $("#exportTable_lang").val();
            var propertiesMap = {}
            selectedProperties.forEach(function (nodeId) {
                var node = $("#exportTable_jstreeDiv").jstree().get_node(nodeId)
                propertiesMap[node.id] = node.text
            })

            self.execExport_Blender(propertiesMap, langs)


        } else if (self.context == "GRAPH") {
            self.execExport_Graph(propertiesMap, langs)
            /*   "<button onclick='visjsGraph.toSVG()'>SVG img</button>" +
               "<button onclick='visjsGraph.toGraphMl()'>toGraphMl</button>" +
               "<button onclick='visjsGraph.exportGraph()'>copy Graph</button>" +*/
        } else if (self.context == "SEARCH") {
        } else if (self.context == "TREE") {
        }


    }


    self.execExport_Blender = function (propertiesMap, langs) {
        var query = ""


        options = {}

        var filterSubjectLangsStr = "";
        var filterObjectLangsStr = "";
        if (langs != "") {

            var langsStr = ""
            langs.forEach(function (lang, index) {
                if (index > 0)
                    langsStr += ","
                langsStr += "'" + lang + "'"
            })
            filterSubjectLangsStr = "filter (lang(?subjectLabel)  in(" + langsStr + "))"
            filterObjectLangsStr = "filter (lang(?objectLabel)  in(" + langsStr + "))"
        }

        var propertiesArray = Object.keys(propertiesMap)

        var filterPropertiesStr = Sparql_common.setFilter("property", propertiesArray)

        var fromStr = Sparql_common.getFromStr(self.currentSource)
        var query = "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
            "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> " +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "select distinct * " + fromStr + " WHERE {" +
            "?subject ?property ?object. " +
            "optional{?subject skos:prefLabel ?subjectLabel." + filterSubjectLangsStr + "} " +
            "optional{?object skos:prefLabel ?objectLabel. " + filterObjectLangsStr + "} " +
            filterPropertiesStr;
        query += "} limit " + Config.queryLimit

        var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {source: self.currentSource}, function (err, result) {
            if (err)
                return callback(err)
            result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["subject", "object", "property"])
            var data = result.results.bindings;
            var vars = result.head.vars

            var cols = [];
            var colsMap = {}

            cols.push({title: "subject Uri"})
            cols.push({title: "subjectLabel"})
            for (var prop in propertiesMap) {
                cols.push({title: propertiesMap[prop] + " Uri"})
                cols.push({title: propertiesMap[prop] + " Label"})
                colsMap[prop] = []
            }


            data.forEach(function (item, indexRow) {
                for (var prop in propertiesMap) {
                    if (item.property.value == prop) {
                        colsMap[prop].push({
                            row: indexRow,
                            object: item.object.value,
                            objectLabel: item.objectLabel.value
                        })
                    } else {
                    }
                    colsMap[prop].push({
                        row: indexRow,
                        object: "",
                        objectLabel: ""
                    })
                }

            })


            var dataSet = []
            data.forEach(function (item, indexRow) {
                var line = []
                line.push(item.subject.value);
                line.push(item.subjectLabel.value);
                for (var prop in propertiesMap) {
                    colsMap[prop].forEach(function (item2) {
                        if (item2.row == indexRow) {
                            line.push(item2.object);
                            line.push(item2.objectLabel);
                        }
                    })
                }


                dataSet.push(line)
            })

            self.showDataTable(cols, dataSet)
        })


    }


    self.execExport_Graph = function () {
        var nodes = visjsGraph.data.nodes.get();
        var edges = visjsGraph.data.edges.get();
// set nodesMap
        var nodesMap = {};
        var varNames={}
        nodes.forEach(function (node,index) {
            if (!nodesMap[node.id]) {
                nodesMap[node.id] = {data: node.data, parent: "#", parents: []}
                if(!varNames[node.data.varName]){
                    varNames[node.data.varName]=[]
                }
                varNames[node.data.varName].push(index)
            }
        })
//set each node parent
        //   var treeMap={};
        edges.forEach(function (edge) {

            // nodesMap[edge.from].targets.push(nodesMap[edge.to].data)
            if (edge.from == "http://w3id.org/readi/rdl/Z101013679")
                var x = 3
            nodesMap[edge.from].parent = edge.to


        })

        //set ancestors array
        function recurse(childNodeId, ancestor) {
            if (ancestor == "#")
                return
            if (childNodeId == "http://w3id.org/readi/rdl/Z101013679")
                var x = 3
            if (nodesMap[childNodeId].parents.length > 5)
                var x = 3
            nodesMap[childNodeId].parents.splice(0, 0, ancestor)
            if (true || ancestor != "#") {
                recurse(childNodeId, nodesMap[ancestor].parent)


            }


        }

        for (var nodeId in nodesMap) {
            if (nodeId == "http://w3id.org/readi/rdl/Z101013679")
                var x = 3
            recurse(nodeId, nodesMap[nodeId].parent)
        }


        var maxDepth = 0
        var index=0
        for (var nodeId in nodesMap) {
            var item = nodesMap[nodeId]
            maxDepth = Math.max(maxDepth, item.parents.length)
        }


        var dataSet = []// for children varnames
        var dataSet0 = [] //for others varNames
        for (var nodeId in nodesMap) {

            var item = nodesMap[nodeId];

            //process columns for subclasses
            if (item.data.varName == "child") {
                var line = []
                for (var i = 0; i < maxDepth; i++) {

                    if (i < item.parents.length) {
                        if (true || item.parents[i] != "#") {
                            var parentNode = nodesMap[item.parents[i]]
                            if (parentNode && parentNode.data) {
                                line.push(parentNode.data.label);

                            }
                        }
                    } else {
                        ;//  line.push("");
                    }

                }
                line.push(item.data.label)
                dataSet.push(line)
            }

            // other varNames (not child)
            else{
                var line = []
                for(var varName in varNames){
                   if(item.data.varName==varName)// && varNames[varName].indexOf(index)==0)
                       line.push(item.data.label)
                       else
                           line.push("")
                   }

                dataSet0.push(line)

            }
            index+=1
        }



        var x=dataSet0

        // suppress incomplet lines (doublons)
        dataSet = dataSet.reverse();
        var dataSet2 = []
        var linesStr = ""
        dataSet.forEach(function (line) {
            var lineStr = ""
            line.forEach(function (item) {
                lineStr += item
            })
            if (linesStr.indexOf(lineStr) < 0) {
                linesStr += lineStr

                var voidItems=[]
               for(var i=line.length;i<=maxDepth;i++){
                   voidItems.push("")
               }

              line=line.concat(voidItems)
                dataSet2.push(line)
            }
        })


        var cols = []


        if(dataSet2.length>0){
            for (var i = 0; i <= maxDepth; i++) {
                cols.push({title: "child_" + i})
            }
            self.showDataTable(cols, dataSet2)

        }else{
            for( var varName in varNames){
                cols.push({title:varName})
            }

            self.showDataTable(cols, dataSet0)
        }



    }

    self.showDataTable = function (cols, dataSet) {

        $('#exportTable_tabs_data').html("<table id='exportTable_dataTableDiv'  style=\"width:800px;height: 600px\"></table>");
        setTimeout(function () {
            $("#exportTable_tabs").tabs("option", "active", 1);
            $('#exportTable_dataTableDiv').DataTable({
                data: dataSet,
                columns: cols,

                // async: false,
                "pageLength": 10,
                dom: 'Bfrtip',
                /*buttons: [
                    'copy', 'csv', 'excel', 'pdf', 'print'
                ]*/
                buttons: [
                    {
                        extend: 'csvHtml5',
                        text: 'Export CSV',
                        fieldBoundary: '',
                        fieldSeparator: ';'
                    },
                    'copy'
                ]


            })


        }, 200)
    }


    return self;


})()