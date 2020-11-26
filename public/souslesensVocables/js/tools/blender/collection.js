var Collection = (function () {

    var self = {}
    self.currentTreeNode;
    self.currentCollectionFilter
    self.broaderProperty = "http://www.w3.org/2004/02/skos/core#member"

    self.getJstreeContextMenu = function () {
        var menuItems = {}
        var clipboard = Clipboard.getContent()
        if (clipboard.length > 0 && clipboard[0].type == "node") {


            menuItems.assignConcepts = {
                label: "Assign selected Concepts",
                action: function (obj, sss, cc) {
                    Collection.assignConcepts()
                },


            }
        }
        if (Collection.currentTreeNode && Collection.currentTreeNode.data.type == "http://www.w3.org/2004/02/skos/core#Concept") {
            menuItems.editNode = {
                label: "Edit node",
                action: function (obj, sss, cc) {
                    Blender.nodeEdition.editNode("collection")
                }
            }

            return menuItems;

        }
        menuItems.editNode = {
            label: "Edit node",
            action: function (obj, sss, cc) {
                Blender.nodeEdition.editNode("collection")
            }
        }
        if (Blender.displayMode == "leftPanel") {
            menuItems.filterConcepts = {
                label: "Filter Concepts",
                action: function (obj, sss, cc) {
                    Collection.filterConcepts()
                }
            }
        }


        menuItems.unAssignConcepts = {
            label: "Unassign Concepts",
            action: function (obj, sss, cc) {
                Collection.unAssignConcepts()
                ;
            },
        }


        menuItems.deleteNode = {
            label: "Delete node",
            action: function (obj, sss, cc) {
                Blender.menuActions.deleteNode();
            },


        }
        menuItems.addChildNodeNode = {
            label: "Create child",
            action: function (obj, sss, cc) {
                Blender.nodeEdition.createChildNode();
                ;
            },
        },

            menuItems.importChildren = {
                label: "Import child nodes",
                action: function (obj, sss, cc) {
                    Import.showImportNodesDialog();
                    ;
                },
            }
        return menuItems;
    }


    self.selectNodeFn = function (event, propertiesMap) {
        if (propertiesMap)
            self.currentTreeNode = propertiesMap.node

        $("#Blender_collectionTreeDiv").jstree(true).settings.contextmenu.items = Collection.getJstreeContextMenu()
        if (Blender.displayMode == "centralPanel") {
            if(!propertiesMap.event.ctrlKey) {
                self.filterConcepts()
            }
        }
        self.openTreeNode("Blender_collectionTreeDiv", Blender.currentSource, self.currentTreeNode)
    }


    self.openTreeNode = function (divId, thesaurusLabel, node, callback) {
        var existingNodes = common.getjsTreeNodes(divId, true)
        if (node.children.length > 0)
            return;

        self.Sparql.getNodeChildren(thesaurusLabel, node.id, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
            TreeController.drawOrUpdateTree(divId, result, node.id, "child1")

        })

    }


    self.assignConcepts = function () {
        var nodes = Clipboard.getContent();
        var conceptIds = [];
        var newTreeNodes = []
        nodes.forEach(function (item) {
            conceptIds.push(item.id)
            newTreeNodes.push({
                text: "<span class='searched_concept'>" + item.label + "</span>",
                id: item.id,
                parent: Collection.currentTreeNode.id,
                data: {type: "treeType_concept"}
            })
        })
        Collection.Sparql.setConceptsCollectionMembership(Blender.currentSource, conceptIds, Collection.currentTreeNode.id, function (err, result) {
            if (err)
                return MainController.UI.message(err)
            return MainController.UI.message(result)
            common.addNodesToJstree("Blender_collectionTreeDiv", Collection.currentTreeNode.id, newTreeNodes)
        })

    }
    self.unAssignConcepts = function () {

    }
    self.filterConcepts = function () {
        $(".blender_collectionFilter").remove();
        var collection = Collection.currentTreeNode;
        var options = {
            filterCollections: collection.id,
        }
        if (true || !self.currentCollectionFilter)
            self.currentCollectionFilter = [];
        //  self.currentCollectionFilter.push(collection.id)
        self.currentCollectionFilter = collection.id;

        var html = ("<div  class='blender_collectionFilter' onclick='Collection.removeTaxonomyFilter()'>" + collection.text + "</div>")
        $("#Blender_currentFilterDiv").append(html)

        Sparql_generic.getTopConcepts(Blender.currentSource, options, function (err, result) {
            //   ThesaurusBrowser.getFilteredNodesJstreeData(Blender.currentSource, options, function (err, jstreeData) {
            if (err) {
                return MainController.UI.message(err)
            }
            if (Blender.displayMode == "leftPanel")
                $("#Blender_tabs").tabs("option", "active", 0);
            $('#Blender_conceptTreeDiv').empty();
            $("#Blender_conceptTreeDiv").html("");
            if (result.length == 0)
                return $("#Blender_conceptTreeDiv").html("No concept for collection :" + collection.text)

            var jsTreeOptions = Blender.getConceptJstreeOptions()

            TreeController.drawOrUpdateTree("Blender_conceptTreeDiv", result, "#", "topConcept", jsTreeOptions)

            setTimeout(function () {
                if( $("#Blender_conceptTreeDiv").jstree(true)) {
                    var firstNodeId = $("#Blender_conceptTreeDiv").jstree(true).get_node("#").children[0];
                    var firstNode = $("#Blender_conceptTreeDiv").jstree(true).get_node(firstNodeId);
                    var options = {filterCollections: Collection.currentCollectionFilter};
                    ThesaurusBrowser.openTreeNode("Blender_conceptTreeDiv", Blender.currentSource, firstNode, options);
                }

                if (Blender.currentTreeNode && Blender.currentTreeNode.children.length == 0)
                    ExternalReferences.openNarrowMatchNodes(Blender.currentSource, Blender.currentTreeNode)
                if (Collection.currentTreeNode) {
                    var html = "<div  class='blender_collectionFilter'  onclick='Collection.removeTaxonomyFilter()'>" + Collection.currentTreeNode.text + "</div>"
                    $('#Blender_collectionFilterContainerDiv').html( html);
                }
            }, 200)

        })
    }


    self.removeTaxonomyFilter = function (collectionId) {
        self.currentCollectionFilter = null;

        $(".blender_collectionFilter").remove();

        Blender.showTopConcepts(null, function (err,) {


        })


    }
    self.dropNode = function () {
        if (!Blender.menuActions.movingNode)
            return
        var newParent = Blender.menuActions.movingNode.newParent
        var oldParent = Blender.menuActions.movingNode.oldParent
        var id = Blender.menuActions.movingNode.id
        if (Blender.menuActions.lastDroppedNodeId == id)
            return
        Blender.menuActions.lastDroppedNodeId = id;
        var broaderPredicate = self.broaderProperty

        Sparql_generic.deleteTriples(Blender.currentSource, oldParent, "http://www.w3.org/2004/02/skos/core#member", id, function (err, result) {

            if (err) {
                return MainController.UI.message(err)
            }
            var triple = {subject: newParent, predicate: "http://www.w3.org/2004/02/skos/core#member", object: id, valueType: "uri"}
            Sparql_generic.insertTriples(Blender.currentSource, [triple], function (err, result) {
                if (err) {
                    return MainController.UI.message(err)
                }
            })
        })

    }


    self.Sparql = {

        getVariables: function (sourceLabel) {
            var source = Config.sources[sourceLabel]
            var vars = {
                serverUrl: source.sparql_url + "?query=&format=json",
                graphUri: source.graphUri,
                lang: source.predicates.lang,
                limit: 1000
            }
            return vars;
        },

        getCollections: function (sourceLabel, options, callback) {
            if (!options)
                options = {}
            var variables = self.Sparql.getVariables(sourceLabel);
            var query = "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX  skos:<http://www.w3.org/2004/02/skos/core#>" +
                " select    distinct * from  <" + variables.graphUri + ">  WHERE {" +
                "?collection rdf:type  ?collectionType. filter( ?collectionType =skos:Collection). " +
                "?collection skos:prefLabel ?collectionLabel."
            if (variables.lang)
                query += "filter( lang(?collectionLabel)=\"" + variables.lang + "\")"
            if (true)
                query += "FILTER (  NOT EXISTS {?child skos:member ?collection})"

            query += "} ORDER BY ?collectionLabel limit " + variables.limit;


            Sparql_proxy.querySPARQL_GET_proxy(variables.serverUrl, query, null, null, function (err, result) {
                if (err)
                    return callback(err);

                return callback(null, result.results.bindings)
            })
        }
        ,

        setConceptsCollectionMembership(sourceLabel, conceptIds, collectionId, callback) {

            var triples = []
            conceptIds.forEach(function (item) {
                triples.push({subject: collectionId, predicate: Collection.broaderProperty, object: item, valueType: "uri"})
            })

            Sparql_generic.insertTriples(sourceLabel, triples, function (err, result) {

                return callback(err, result)
            })


        }
        ,
        getNodeChildren: function (sourceLabel, collectionId, callback) {
            var variables = self.Sparql.getVariables(sourceLabel);

            var query = "PREFIX skos:<http://www.w3.org/2004/02/skos/core#>";

            query += " select distinct * from <" + variables.graphUri + ">  WHERE {"

            query += "<" + collectionId + "> skos:member ?child1." +

                "OPTIONAL{ ?child1  skos:prefLabel ?child1Label. ";
            if (variables.lang)
                query += "filter( lang(?child1Label)=\"" + variables.lang + "\")"
            query += "}"

            query += "OPTIONAL{?child1 rdf:type ?child1Type.}" +
                "}" +
                "limit " + variables.limit;

            Sparql_proxy.querySPARQL_GET_proxy(variables.serverUrl, query, {}, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }


        ,
        getSingleNodeAllDescendants: function (sourceLabel, id, callback) {
            var variables = self.Sparql.getVariables(sourceLabel);
            var query = "";
            query += "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#>"
            query += " select distinct * FROM <" + variables.graphUri + ">  WHERE {"
            query += "  ?collection   skos:member*  ?narrower." +
                "filter (?collection=<" + id + ">) " +
                "?narrower skos:prefLabel ?narrowerLabel." +
                "?narrower rdf:type ?narrowerType."

            query += "  }";
            query += "limit " + variables.limit + " ";


            Sparql_proxy.querySPARQL_GET_proxy(variables.serverUrl, query, {}, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })

        }


    }


    return self;
})()
