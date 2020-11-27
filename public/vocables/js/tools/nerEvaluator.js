var NerEvaluator = (function () {
    var self = {}

    self.maxGraphConceptLength = 1000
    var sourceGraphsUriMap = {}

    self.selectedSources = []
    self.categoriesTreeId = "nerEvaluator_treeDiv"
    self.onSourceSelect = function () {
        var html = "<button onclick='NerEvaluator.showActionPanel()'>OK</button>"
        $("#sourceDivControlPanelDiv").html(html)

    }

    self.onLoaded = function () {

    }


    self.showActionPanel = function () {
        self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked()
        $("#actionDiv").html("")
        $("#actionDivContolPanelDiv").load("snippets/nerEvaluator_left.html")
        $("#graphDiv").load("snippets/nerEvaluator_right.html")
        $("#accordion").accordion("option", {active: 2});
        setTimeout(function () {
            $("#NerEvaluator_tabs").tabs({
                activate: self.onTabActivate

                });

            common.fillSelectOptions("nerEvaluator_graphUrisSelect", self.selectedSources, true)
            self.showWikiCategoriesTree();


        }, 200)


    }
    self.onTreeClickNode = function (evt, obj) {
        $("#messageDiv").html("");
        self.currentTreeNode = obj.node





        if (obj.node.data && obj.node.data.type == "wikiPage") {

            var activeTab = $('ul.tabs li a.active');

            if(true || (activeTab && activeTab.data('id')=="OntologyBrowser_tabs_wikiPageContent")) {
                self.loadWikiPage()
            }
            return self.getWikipageMissingWords(obj.node)
        }
        self.addTreeChildrenNodes(obj.node.id);
        if (obj.node.parents.length > 3 || obj.event.ctrlKey) {
            self.showNodeConceptsGraph(obj.node, function (err, result) {
                self.addWikiPagesToTree(obj.node)
            })

        }



    }

    self.onTabActivate=function(e,ui){
       var divId=ui.newPanel.attr('id');
       if( divId=="OntologyBrowser_tabs_wikiPageContent"){
           self.loadWikiPage()
       }
    }

    self.loadWikiPage=function(){
        var selectedNode = $("#" + NerEvaluator.categoriesTreeId).jstree(true).get_selected(true);
        if (!selectedNode || !selectedNode[0].data)
            return MainController.UI.message("select a page ")
        var type = selectedNode[0].data.type
        if (type != "wikiPage")
            return MainController.UI.message("select a page ")
        var page = selectedNode[0].id
        $("#OntologyBrowser_wikiPageContent_iframe").attr('src', page)
    }


    self.showWikiCategoriesTree = function () {

        var query = "PREFIX schema: <http://schema.org/>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
            "prefix foaf: <http://xmlns.com/foaf/0.1/>" +
            "prefix shema: <http://schema.org/>" +
            "SELECT distinct * from <http://souslesens.org/data/total/ep/> WHERE {" +
            "  ?concept skos:topConceptOf <http://souslesens.org/vocab/scheme/mediawiki-ep> ." +

            "} LIMIT 1000"

        Sparql_proxy.querySPARQL_GET_proxy(Config.default_sparql_url, query, {}, {}, function (err, result) {
            if (err) {
                return console.log(err);
            }
            var nodes = [];
            result.results.bindings.forEach(function (item) {

                var id = item.concept.value;
                // var prefLabel = item.conceptLabel.value;
                var prefLabel = id.substring(id.lastIndexOf("/") + 1)

                var node = {
                    data: {
                        altLabels: [],
                        broaders: [],
                        definitions: [],
                        id: id,
                        notes: [],
                        prefLabels: [{lang: "en", value: prefLabel}],

                        relateds: [],
                    },
                    treeDivId: "categoriesTreeId",
                    type: "TopConcept",
                    id: id,
                    parent: "#",
                    text: prefLabel,
                }
                nodes.push(node);

            })

            var types = {

                /*    "default": {
                        "icon": "glyphicon glyphicon-flash"
                    },
                    "TopConcept": {
                        "icon": 'icons/wiki.png'


                    },
                    "Concept": {
                        "icon": 'icons/concept.png'


                    },
                    "Page": {
                        "icon": 'icons/page.png'


                    }*/
            }

            common.loadJsTree(self.categoriesTreeId, nodes, {selectNodeFn: NerEvaluator.onTreeClickNode, types: types});

        })


    }

    self.addTreeChildrenNodes = function (broaderId) {


        var query = "PREFIX schema: <http://schema.org/>" +
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "prefix skos: <http://www.w3.org/2004/02/skos/core#>" +
            "prefix foaf: <http://xmlns.com/foaf/0.1/>" +
            "prefix shema: <http://schema.org/>" +
            "SELECT distinct * from <http://souslesens.org/data/total/ep/> WHERE {" +
            "" +
            "  ?concept skos:broader ?broader .  filter (?broader=<" + broaderId + ">)" +
            //  "  ?concept skos:prefLabel ?conceptLabel" +
            "  " +
            " " +
            "} LIMIT 1000"

        Sparql_proxy.querySPARQL_GET_proxy(Config.default_sparql_url, query, {}, {}, function (err, result) {

            if (err) {
                return console.log(err);
            }
            var nodes = [];
            result.results.bindings.forEach(function (item) {

                var id = item.concept.value;
                // var prefLabel = item.conceptLabel.value;
                var prefLabel = id.substring(id.lastIndexOf("/") + 1)
                var node = {
                    data: {
                        altLabels: [],
                        broaders: [broaderId],
                        definitions: [],
                        id: id,
                        notes: [],
                        prefLabels: [{lang: "en", value: prefLabel}],

                        relateds: [],
                    },
                    treeDivId: "treeDiv1",
                    type: "Concept",
                    id: id,
                    parent: broaderId,
                    text: prefLabel,
                }
                nodes.push(node);

            })

            common.addNodesToJstree("nerEvaluator_treeDiv", broaderId, nodes);

        })
    }


    self.showNodeConceptsGraph = function (node, callback) {
        if (!node)
            node = self.currentTreeNode;
        if (!node)
            return;


        var countPagesMaxFilter = ""
        /*  var countPagesMax = $("#countPagesMax").val();
          var countAllPages = $("#countAllPages").prop("checked")

          if (!countAllPages) countPagesMaxFilter = " filter(?countPages<" + countPagesMax + ")"*/
        self.selectedSources.forEach(function (sourceLabel) {
            var source = Config.sources[sourceLabel]
            sourceGraphsUriMap[source.graphUri] = {
                color: source.color,
                label: sourceLabel
            }
        })

        var parentCategoriesFilter = " filter (?category not in("
        node.parents.forEach(function (parent, index) {

            if (parent != "#") {
                if (index > 0)
                    parentCategoriesFilter += ","
                parentCategoriesFilter += "<" + parent + ">";
            }
        })
        parentCategoriesFilter += "))"

        var fromStr = "from <" + Config.wikiCategoriesGraphUri + "> "
        self.selectedSources.forEach(function (item) {
            fromStr += " from <" + Config.sources[item].graphUri + "> "
        })


        $("#messageDiv").html("Searching...");
        var query = "prefix skos: <http://www.w3.org/2004/02/skos/core#>prefix foaf: <http://xmlns.com/foaf/0.1/>prefix schema: <http://schema.org/>" +
            "SELECT distinct  * " + fromStr + " WHERE{ " +
            " ?concept  <http://souslesens.org/vocab#wikimedia-category>  ?category." + parentCategoriesFilter +
            "  ?category  <http://souslesens.org/vocab/countPages> ?countPages . " + countPagesMaxFilter +
            "  ?category foaf:topic ?subject.  filter ( ?subject=<" + node.id + ">)" +
            "  " +
            "  ?concept skos:prefLabel ?conceptLabel. filter(lang(?conceptLabel)='en')    " +
            "  BIND (LCASE(?conceptLabel) as ?conceptLabelLower)  " +
            " optional {?concept skos:member ?member }" +
            "  optional{ ?concept skos:broader ?broader1. ?broader1 skos:prefLabel ?broader1Label  filter(lang(?broader1Label)='en')      optional{ ?broader1 skos:broader ?broader2. ?broader2 skos:prefLabel ?broader2Label  filter(lang(?broader2Label)='en')      optional{ ?broader2 skos:broader ?broader3. ?broader3 skos:prefLabel ?broader3Label  filter(lang(?broader3Label)='en')         optional{ ?broader3 skos:broader ?broader4. ?broader4 skos:prefLabel ?broader4Label  filter(lang(?broader4Label)='en') }    }    }  }     " +
            " GRAPH ?g{?concept skos:prefLabel ?x}" +
            "} order by ?concept limit 10000"
        Sparql_proxy.querySPARQL_GET_proxy(Config.default_sparql_url, query, {}, {}, function (err, result) {

            if (err) {
                return console.log(err);
            }

            var allnodes = [];
            var allEdges = [];
            var visjsData = {nodes: [], edges: []}
            var similarNodes = {}
            var offsetY = -leftPanelWidth


            var maxPages = 0;
            var minPages = 1000000;
            self.currentConceptsLabels = []

            if (result.results.bindings.length == 0)
                return $("#messageDiv").html("no concepts matching");

            if (result.results.bindings.length > self.maxGraphConceptLength) {
                self.tooManyNodes = true;
                result.results.bindings.forEach(function (item) {
                    var conceptLabel = item.conceptLabelLower.value;
                    if (self.currentConceptsLabels.indexOf(conceptLabel) < 0)
                        self.currentConceptsLabels.push(conceptLabel);
                })
                $("#NerEvaluator_graphDiv").html("too many concepts to show :" + result.results.bindings.length);
                return callback(null)


            }
            self.tooManyNodes = false;
            result.results.bindings.forEach(function (item) {
                $("#messageDiv").html(node.text + " concepts :" + result.results.bindings.length);

                var subject = item.subject.value;
                var conceptId = item.concept.value;
                var countPages = parseInt(item.countPages.value);
                var member = null;
                if (item.member)
                    member = item.member.value;

                maxPages = Math.max(maxPages, countPages)
                minPages = Math.min(minPages, countPages)


                var graphLabel = "";
                var color = "#ddd";

                var conceptGraph = item.g.value
                if (!sourceGraphsUriMap[conceptGraph])
                    return;
                color = sourceGraphsUriMap[conceptGraph].color;
                graphLabel = sourceGraphsUriMap[conceptGraph].label


                if (graphLabel == "")
                    var x = 3


                var conceptLabel = item.conceptLabelLower.value;
                if (self.currentConceptsLabels.indexOf(conceptLabel) < 0)
                    self.currentConceptsLabels.push(conceptLabel);

                if (!similarNodes[conceptLabel])
                    similarNodes[conceptLabel] = [];
                if (similarNodes[conceptLabel].indexOf(conceptId) < 0)
                    similarNodes[conceptLabel].push(conceptId)


                if (allnodes.indexOf(graphLabel) < 0) {
                    allnodes.push(graphLabel)
                    visjsData.nodes.push({id: graphLabel, label: graphLabel, shape: "ellipse", color: color, fixed: {x: true}, x: 500, y: offsetY, data: {type: "graph",source:graphLabel}})

                }
                if (allnodes.indexOf(conceptId) < 0) {
                    allnodes.push(conceptId)
                    if (member)
                        color = "#dac"
                    // visjsData.nodes.push({id: conceptId, label: conceptLabel, shape: "text", color: color,size:Math.round(20/countPages), fixed: {x: true, y: true}, x: -500, y: offsetY})
                    visjsData.nodes.push({id: conceptId, label: conceptLabel, shape: "box", color: color, fixed: {x: true, y: true}, x: -500, y: offsetY, data: {type: "leafConcept",source:graphLabel}})

                    offsetY += 30 + (20 / countPages);
                    //  visjsData.edges.push({id: nodeId + "_" + conceptId, from: nodeId, to: conceptId, color: color})
                }
                for (var i = 1; i < 5; i++) {
                    var broaderId = item["broader" + i]
                    if (broaderId) {
                        broaderId = broaderId.value;
                        if (allnodes.indexOf(broaderId) < 0) {
                            allnodes.push(broaderId)
                            var broaderLabel = item["broader" + i + "Label"].value
                            visjsData.nodes.push({id: broaderId, label: broaderLabel, shape: "box", color: color, data: {type: "broaderConcept",source:graphLabel}})
                        }
                        if (i == 1) {
                            var edgeId = conceptId + "_" + broaderId
                            if (allEdges.indexOf(edgeId) < 0) {
                                allEdges.push(edgeId);
                                visjsData.edges.push({id: edgeId, from: conceptId, to: broaderId, arrows: "to"})
                            }

                        } else {

                            var previousBroaderId = item["broader" + (i - 1)].value
                            var edgeId = previousBroaderId + "_" + broaderId
                            if (allEdges.indexOf(edgeId) < 0) {
                                allEdges.push(edgeId);
                                visjsData.edges.push({id: edgeId, from: previousBroaderId, to: broaderId, arrows: "to"})
                            }

                        }
                        var nextBroaderId = item["broader" + (i + 1)]
                        if (!nextBroaderId) {
                            //  var previousBroaderId = item["broader" + (i - 1)].value
                            var edgeId = graphLabel + "_" + broaderId
                            if (allEdges.indexOf(edgeId) < 0) {
                                allEdges.push(edgeId);
                                visjsData.edges.push({id: edgeId, from: broaderId, to: graphLabel, arrows: "to"})
                            }


                        }
                    }


                }


            })

            for (var key in similarNodes) {
                var length = similarNodes[key].length;
                if (length > 1) {
                    visjsData.nodes.push({id: key, label: key, shape: "box", color: "#ddd", fixed: {x: false}, x: -650})
                    for (var i = 0; i < length; i++) {
                        var edgeId = key + "_" + similarNodes[key][i]
                        if (allEdges.indexOf(edgeId) < 0) {
                            allEdges.push(edgeId)
                            visjsData.edges.push({id: edgeId, from: key, to: similarNodes[key][i], arrows: "to"})
                        }
                    }
                }
            }
            $("#NerEvaluator_graphDiv").width($(window).width() - 20)
            $("#NerEvaluator_graphDiv").height($(window).height() - 20)
            visjsGraph.draw("NerEvaluator_graphDiv", visjsData, {onclickFn: NerEvaluator.onGraphNodeClick})
            return callback(null)
            /* $("#sliderCountPagesMax").slider("option", "max", maxPages);
             $("#sliderCountPagesMax").slider("option", "mmin", minPages);
             $("#minPages").html(minPages)
             $("#maxPages").html(maxPages)*/
            //  $( "#sliderCountPagesMax" ).slider( "option", "value", maxPages );
        })
    }


    self.onGraphNodeClick = function ( node, point,event) {
        if(event && event.ctrlKey){
            Clipboard.copy({type: "node", source: node.data.source, id: node.id, label:node.label}, "_visjsNode", event)
        }

    }

    self.filterGraphCategories = function () {
        var graphUri = $("#graphUrisSelect").val()
        var query =
            "SELECT distinct * " +
            "from <" + graphUri + ">" +
            "from <http://souslesens.org/data/total/ep/>" +
            "WHERE {" +
            "  ?concept <http://souslesens.org/vocab#wikimedia-category> ?cat ." +
            "  ?concept <http://souslesens.org/vocab#wikimedia-category> ?cat ." +
            "  ?concept skos:prefLabel ?conceptLabel." +
            "  ?cat   foaf:topic ?subject. " +
            "      optional{" +
            "      ?subject skos:broader ?subjectBroader1" +
            "       optional{" +
            "      ?subjectBroader1 skos:broader ?subjectBroader2" +
            "       optional{" +
            "      ?subjectBroader2 skos:broader ?subjectBroader3" +
            "          optional{" +
            "      ?subjectBroader3 skos:broader ?subjectBroader4" +
            "        }}}}" +

            "} order by ?conceptLabel LIMIT 1000"

        self.querySPARQL_proxy(query, self.sparqlServerUrl, {}, {}, function (err, result) {

            if (err) {
                return console.log(err);
            }
            var treeData = [];
            var nodes = {};
            result.results.bindings.forEach(function (item) {
                var conceptId = item.concept.value
                var conceptLabel = item.conceptLabel.value;
                var subject = item.subject.value;
                var subjectLabel = subject.substring(subject.lastIndexOf("/"));

                for (var i = 1; i < 4; i++) {
                    if (!nodes[conceptId]) {
                        nodes[conceptId] = {id: item.concept.value, text: item.conceptLabel.value, parent: "#"};
                        if (typeof (item["subjectBroader" + i]) != "undefined") {
                            var broaderId = item["subjectBroader" + i].value
                            if (i == 1) {
                                nodes[conceptId].parent = broaderId;
                            }

                            if (!nodes[broaderId]) {
                                var broaderLabel = broaderId.substring(broaderLabel.lastIndexOf("/"));
                                nodes[broaderId] = {id: broaderId, text: broaderLabel, parent: "#"};

                            }
                        }
                    }
                }


            })


        })


    }




    self.addWikiPagesToTree = function (subject) {
        var query = "prefix skos: <http://www.w3.org/2004/02/skos/core#>  prefix foaf: <http://xmlns.com/foaf/0.1/>" +
            "SELECT  * WHERE {" +
            "  ?category foaf:page ?page. ?category foaf:topic ?subject  " +
            "  filter(?subject=<" + subject.id + ">)" +
            "} limit 1000"
        Sparql_proxy.querySPARQL_GET_proxy(Config.default_sparql_url, query, {}, {}, function (err, result) {

            if (err) {
                return console.log(err);
            }
            var nodes = []
            result.results.bindings.forEach(function (item) {
                var page = item.page.value;
                // var prefLabel = item.conceptLabel.value;
                var pageLabel = "Page :" + page.substring(page.lastIndexOf("/") + 1)
                var node = {
                    data: {
                        type: "wikiPage",
                    },
                    treeDivId: "treeDiv1",
                    type: "Page",
                    id: page,
                    parent: subject.id,
                    text: pageLabel,
                }
                nodes.push(node);

            })

            common.addNodesToJstree(self.categoriesTreeId, subject.id, nodes);


        })
    }

    self.getWikipageMissingWords = function (page) {
        MainController.UI.message("")
        $("#nerEvaluator_missingWordsDiv").html("")
        $("#nerEvaluator_copiedWords").html("")

        $( "#NerEvaluator_tabs" ).tabs("option", 'active', 1)
        if (!page) {
            var selectedNode = $("#" + NerEvaluator.categoriesTreeId).jstree(true).get_selected(true);
            if (!selectedNode || !selectedNode[0].data)
                return MainController.UI.message("select a page ")
            var type = selectedNode[0].data.type
            if (type != "wikiPage")
                return MainController.UI.message("select a page ")
            page = {text:selectedNode[0].id}
        }


        var graphUri = $("#nerEvaluator_graphUrisSelect").val();
        if (!graphUri || graphUri == "")
            return $("#messageDiv").html("select a source");
        graphUri = Config.sources[graphUri].graphUri
        $("#waitImg").css("display", "block")
        $("#commentDiv").html("searching new concepts in selected wiki page")
        // getWimimediaPageSpecificWords:function(elasticUrl,indexName,pageName,pageCategories, callback){

        if (!self.currentConceptsLabels)
            self.currentConceptsLabels = ["x"]
        var pageName = page.text
        var p = pageName.indexOf(":")
        if (p > -1)
            pageName = pageName.substring(p)
        var payload = {


            getWikimediaPageNonThesaurusWords: 1,
            elasticUrl: "http://vps254642.ovh.net:2009/",
            indexName: "mediawiki-pages-*",
            pageName: pageName,
            graphUri: graphUri,
            pageCategoryThesaurusWords: JSON.stringify(self.currentConceptsLabels)


        }

        $("#messageDiv").html("Searching missing Words");
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",

            success: function (data, textStatus, jqXHR) {
                var xx = data;
                var html = "";
                /*  if(self.tooManyNodes)
                      html="<b>All words in page:</b><br><ul>";
                  else*/
                html = "<b>Page words not in thesaurus:</b><br><div style='display: flex;flex-wrap: wrap;'>";
                data.forEach(function (word) {
                    html += "<div draggable='true' class='newWord' id='newWord_" + word + "'>" + word + "</div>";
                })
                html += "</div>";
                html += "<script>" +
                    "$('.newWord').bind('click',NerEvaluator.onMissingWordClick);" +

                    "" +
                    "</script>"
                $("#nerEvaluator_missingWordsDiv").html(html)
                $("#waitImg").css("display", "none")
                $("#messageDiv").html("")

            }
            , error: function (err) {
                $("#messageDiv").html(err.responseText);
                $("#waitImg").css("display", "none")
            }
        })
    }

    self.onMissingWordClick = function (event) {


        var word = event.currentTarget.id.substring(8)
        if(event && event.ctrlKey){
            return Clipboard.copy({type:"word",text:word},event.currentTarget.id,event)

        }

        var id = event.currentTarget.id;
        self.currentSelectedPageNewWord = word;
        var classes = $('#' + id).attr('class').split(/\s+/);
        var text = $("#nerEvaluator_copiedWords").val()
        if (classes.indexOf('selectedNewWord') > -1) {
            $('#' + id).removeClass('selectedNewWord')

            text = text.replace(word, "")
            text = text.replace(",,", "")

        } else {
            $('#' + id).addClass('selectedNewWord')
            text = text + "," + word;
        }
        $("#nerEvaluator_copiedWords").val(text)

    }


    return self;


})()
