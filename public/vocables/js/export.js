var Export = (function () {


    var self = {}
    self.context = null;
    self.currentOptions = {};
    self.currentSource = null


    self.exportGraphToDataTable = function () {
        var nodes = visjsGraph.data.nodes.get()
        var edges = visjsGraph.data.edges.get();

        var root = {}

        var nodesToMap = {}
        var nodesFromMap = {}
        edges.forEach(function (edge) {
            if (!nodesToMap[edge.to])
                nodesToMap[edge.to] = []
            nodesToMap[edge.to].push(edge)

            /*  if (!nodesFromMap[edge.from])
                  nodesFromMap[edge.from] = []
              nodesFromMap[edge.from].push(edge)*/


        })


        var topNodes = []
        var leafNodes = []
        var nodesMap = {}
        nodes.forEach(function (node) {

            nodesMap[node.id] = node
            if (!nodesToMap[node.id]) {
                if (!node.label)
                    var x = 3
                leafNodes.push(node)
            }
        })
        var uniqueNodes = {}

        function recurse(node, ancestors, level) {

            if (!node.id)
                return


            edges.forEach(function (edge) {

                if (edge.from == node.id) {
                    var ok = true;
                    for (var key in ancestors)
                        if (ancestors[key].indexOf(edge.to) > -1) {
                            ok = false
                        }
                    if (ok) {
                        if (!ancestors["_" + level])
                            ancestors["_" + level] = []

                        ancestors["_" + level].push(edge.to)
                        console.log(nodesMap[edge.to].label)
                        recurse(nodesMap[edge.to], ancestors, ++level)
                    }
                }

            })
            return ancestors
        }


        //  var tree = {id: "#", children: []}
        leafNodes.forEach(function (node) {
            var leafAncestors = recurse(node, {}, 1);
            node.ancestors = leafAncestors


        })

        var dataSet = []
        var colsCount = 0
        leafNodes.forEach(function (leafNode) {
            var lineLabels = [];
            var lineIds = [];
            var leafLabel = leafNode.id
            if (leafLabel.indexOf("?_") == 0)//datatype property
                leafLabel = leafLabel.substring(leafLabel.lastIndexOf("/") + 1)
            else
                leafLabel = leafNode.label || leafNode.id
            lineLabels.push(leafLabel)
            lineIds.push(leafNode.id)
            for (var ancestorLevel in leafNode.ancestors) {
                var labels = ""
                var ids = ""
                leafNode.ancestors[ancestorLevel].forEach(function (item, index) {
                    if (index > 0) {
                        labels += " , "
                        ids += " , "
                    }
                    var label = item;
                    if (nodesMap[item].data) {
                        label = nodesMap[item].data.label || item

                    }

                    labels += label
                    ids += item
                })


                lineLabels.push(labels)
                lineIds.push(ids)

            }
            var row = lineLabels;//.concat(lineIds)
            colsCount = Math.max(colsCount, row.length)
            dataSet.push(row)

        })

        dataSet.sort(function (a, b) {
            return a.length - b.length
        })
        var cols = []
        for (var i = 1; i <= colsCount; i++) {
            cols.push({title: "Label_" + i, defaultContent: ""})
        }
        /*   for (var i = 1; i <= colsCount; i++) {
               cols.push({title: "Uri_" + i, defaultContent: ""})
           }*/
        self.showDataTable(null, cols, dataSet)


    }


    self.exportGraphToDataTableX = function () {
        var nodes = visjsGraph.data.nodes.get()
        var edges = visjsGraph.data.edges.get();

        var root = {}

        var nodesFromMap = {}
        edges.forEach(function (edge) {
            if (!nodesFromMap[edge.from])
                nodesFromMap[edge.from] = []
            nodesFromMap[edge.from].push(edge)

        })

        var topNodes = []
        var nodesMap = {}
        nodes.forEach(function (node) {
            if (node.id.indexOf("_cluster") > -1) {
                node.data.cluster.forEach(function (item, index) {

                    nodesFromMap[item.child] = [{from: item.child, to: item.concept}]
                    var toClusterParent = nodesFromMap[node.id]
                    nodesFromMap[item.concept].push(toClusterParent)
                    delete nodesFromMap[node.id]
                })

            }
            nodesMap[node.id] = node
            if (!nodesFromMap[node.id])
                topNodes.push(node)
        })
        var uniqueNodes = {}

        function recurse(node) {

            if (!node.id)
                return
            edges.forEach(function (edge) {

                if (edge.to == node.id) {
                    if (!node.children)
                        node.children = []
                    if (!uniqueNodes[edge.from]) {
                        uniqueNodes[edge.from] = 1
                        node.children.push(nodesMap[edge.from])
                        recurse(nodesMap[edge.from], node.children)

                    }
                }
            })


        }


        var tree = {id: "#", children: []}
        topNodes.forEach(function (node) {
            recurse(node);
            tree.children.push(node)


        })

        var result = []

        function flat(data, prev = '') {
            if (Array.isArray(data)) {
                data.forEach(e => flat(e, prev))
            } else {
                prev = prev + (prev.length ? '|' : '') + data.id;
                if (!data.children || !data.children.length) {
                    // result.push(prev)
                    result.push(prev.split('|'))//.map(Number))
                } else
                    flat(data.children, prev)
            }
        }

        flat(tree)
        var data = self.prepareDataSet(result, nodesMap);
        self.showDataTable(null, data.cols, data.dataSet)


    }


    self.exportTeeToDataTable = function (jstreeDiv, nodeId) {
        if (!jstreeDiv)
            jstreeDiv = SourceBrowser.currentTargetDiv
        if (!nodeId)
            nodeId = SourceBrowser.currentTreeNode ? SourceBrowser.currentTreeNode.id : "#"
        if (!nodeId)
            nodeId = "#"
        //  var data = common.jstree.toTableData(jstreeDiv,nodeId)

        var tree = $('#' + jstreeDiv).jstree(true).get_json(nodeId, {flat: false});
        var nodesMap = {}
        var nodes = $('#' + jstreeDiv).jstree(true).get_json(nodeId, {flat: true});
        nodes.forEach(function (node) {
            nodesMap[node.id] = node;
        })


        var depth = 0;
        const result = []


        function flat(data, prev = '') {
            if (Array.isArray(data)) {
                data.forEach(e => flat(e, prev))
            } else {
                prev = prev + (prev.length ? '|' : '') + data.id;
                if (!data.children.length) {
                    // result.push(prev)
                    result.push(prev.split('|'))//.map(Number))
                } else
                    flat(data.children, prev)
            }
        }

        flat(tree)
        //  var nodesArray = result;

        var data = self.prepareDataSet(result, nodesMap);
        self.showDataTable(null, data.cols, data.dataSet)

        return

        var cols = [];
        var dataSet = [];
        var colsMax = 0
        nodesArray.forEach(function (item) {
            var line = []
            item.forEach(function (id) {
                var obj = nodesMap[id]
                line.push(obj.data.id)
                line.push(obj.data.label)

            })
            colsMax = Math.max(colsMax, line.length)
            dataSet.push(line)
        })

        for (var i = 0; i < colsMax / 2; i++) {
            cols.push({title: "Uri_" + i, defaultContent: ""})
            cols.push({title: "Label_" + i, defaultContent: ""})
        }


        self.showDataTable(null, cols, dataSet)


    }

    self.prepareDataSet = function (flatNodesArray, nodesMap) {


        var cols = [];
        var dataSet = [];
        var colsMax = 0
        flatNodesArray.forEach(function (item) {
            var line = []
            var line2 = []
            item.forEach(function (id) {
                var obj = nodesMap[id]
                if (obj && obj.data) {
                    var label = obj.data.label
                    if (label == 'any') {
                        label = obj.data.id
                    }
                    line.push(label)
                    line2.push(obj.data.id)
                }
            })
            colsMax = Math.max(colsMax, line.length)
            line = line.concat(line2)

            dataSet.push(line)

        })

        for (var i = 1; i <= colsMax; i++) {
            cols.push({title: "Label_" + i, defaultContent: "", "width": "20%" })
        }
        for (var i = 1; i <= colsMax; i++) {
            cols.push({title: "Uri_" + i, defaultContent: ""})
        }
        return {cols: cols, dataSet: dataSet}
    }


    self.showDataTable = function (div, cols, dataSet,buttons) {
        if (!div) {

            $('#mainDialogDiv').dialog("open")
            $('#mainDialogDiv').html("<table id='dataTableDiv'></table>");
            div = 'dataTableDiv'
        }else{
            $('#'+div).html("<table id='dataTableDiv'></table>");
        }
        setTimeout(function () {

            if(!buttons)
                buttons='Bfrtip'
            $('#dataTableDiv' ).DataTable({
                data: dataSet,
                columns: cols,

                // async: false,
                "pageLength": 10,
                dom: buttons,
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
                ],
               /* 'columnDefs': [
                    {'max-width': '20%', 'targets': 0}
                ],*/
                order: []


            })


        }, 200)
    }


    return self;


})
()