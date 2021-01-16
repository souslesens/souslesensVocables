var Collection = (function () {

    var self = {}
    self.currentTreeNode;
    self.currentCollectionFilter = null;

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
                Blender.menuActions.deleteNode("collection");
            },


        }
        menuItems.addChildNodeNode = {
            label: "Create child",
            action: function (obj, sss, cc) {
                Blender.nodeEdition.createChildNode(null, "collection",);
                ;
            },
        },

            menuItems.importChildren = {
                label: "Import child nodes",
                action: function (obj, sss, cc) {
                    Import.showImportNodesDialog("collection");
                    ;
                },
            }
        return menuItems;
    }


    self.selectNodeFn = function (event, propertiesMap) {
        if (propertiesMap)
            self.currentTreeNode = propertiesMap.node

        $("#Blender_collectionTreeDiv").jstree(true).settings.contextmenu.items = Collection.getJstreeContextMenu()
        if (Blender.displayMode == "centralPanelDiv") {

        }
        if (propertiesMap.event.ctrlKey) {
            self.filterConcepts()
        }
        self.openTreeNode("Blender_collectionTreeDiv", Blender.currentSource, self.currentTreeNode)
    }


    self.openTreeNode = function (divId, thesaurusLabel, node, callback) {
        var existingNodes = common.getjsTreeNodes(divId, true)
        if (node.children.length > 0)
            return;

        self.Sparql.getNodeChildren(thesaurusLabel, node.data.id, {onlyCollectionType: true}, function (err, result) {
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
                parent: Collection.currentTreeNode.data.id,
                data: {type: "treeType_concept"}
            })
        })
        Collection.Sparql.setConceptsCollectionMembership(Blender.currentSource, conceptIds, Collection.currentTreeNode.data.id, function (err, result) {
            if (err)
                return MainController.UI.message(err)
            return MainController.UI.message(result)
            common.addNodesToJstree("Blender_collectionTreeDiv", Collection.currentTreeNode.data.id, newTreeNodes)
        })

    }
    self.unAssignConcepts = function () {

    }
    self.filterConcepts = function () {
        $(".blender_collectionFilter").remove();
        var collection = Collection.currentTreeNode;
        if (collection.data.type != "http://www.w3.org/2004/02/skos/core#Collection")
            return
        var options = {
            filterCollections: collection.data.id,
        }
        if (true || !self.currentCollectionFilter)
            self.currentCollectionFilter = [];
        //  self.currentCollectionFilter.push(collection.id)
        self.currentCollectionFilter = collection.data.id;

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

            /*   setTimeout(function () {
                   if ($("#Blender_conceptTreeDiv").jstree(true)) {
                       var firstNodeId = $("#Blender_conceptTreeDiv").jstree(true).get_node("#").children[0];
                       var firstNode = $("#Blender_conceptTreeDiv").jstree(true).get_node(firstNodeId);
                       var options = {filterCollections: Collection.currentCollectionFilter};
                       ThesaurusBrowser.openTreeNode("Blender_conceptTreeDiv", Blender.currentSource, firstNode, options);
                   }

                   if (Blender.currentTreeNode && Blender.currentTreeNode.children.length == 0)
                       ExternalReferences.openNarrowMatchNodes(Blender.currentSource, Blender.currentTreeNode)
                   if (Collection.currentTreeNode) {
                       var html = "<div  class='blender_collectionFilter'  onclick='Collection.removeTaxonomyFilter()'>" + Collection.currentTreeNode.text + "</div>"
                       $('#Blender_collectionFilterContainerDiv').html(html);
                   }
               }, 200)
               */


        })
    }


    self.removeTaxonomyFilter = function (collectionId) {
        self.currentCollectionFilter = null;

        $(".blender_collectionFilter").remove();
        if (Blender.currentSource)
            Blender.showTopConcepts(null, function (err,) {


            })


    }
    /*  self.dropNode = function () {
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

      }*/


    self.Sparql = {

        getVariables: function (sourceLabel) {
            var source = Config.sources[sourceLabel]
            var lang = null;
            if (source.predicates && source.predicates.lang)
                lang = source.predicates.lang
            var vars = {
                serverUrl: source.sparql_server.url + "?format=json&query=",
                graphUri: source.graphUri,
                lang: lang,
                limit: 1000
            }
            return vars;
        },

        getCollections: function (sourceLabel, options, callback) {
            if (!options)
                options = {}

            var variables = self.Sparql.getVariables(sourceLabel);
            var fromStr = ""
            if (variables.graphUri && variables.graphUri != "")
                fromStr = " FROM <" + variables.graphUri + ">"

            var query = "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX  skos:<http://www.w3.org/2004/02/skos/core#>" +
                " select    distinct * "+fromStr+" WHERE {" +
                "?collection rdf:type  ?collectionType. filter( ?collectionType =skos:Collection). " +
                "?collection skos:prefLabel ?collectionLabel."
            if (variables.lang)
                query += "filter( lang(?collectionLabel)=\"" + variables.lang + "\")"
            if (!options.all)
                query += "FILTER (  NOT EXISTS {?child skos:member ?collection})"


            query += "} ORDER BY ?collectionLabel limit " + variables.limit;

            var options={
               source:sourceLabel
            }

            Sparql_proxy.querySPARQL_GET_proxy(variables.serverUrl, query, null, options, function (err, result) {
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
        getNodeChildren: function (sourceLabel, collectionId, options, callback) {
            if (!options)
                options = {}
            var variables = self.Sparql.getVariables(sourceLabel);

            var query = "PREFIX skos:<http://www.w3.org/2004/02/skos/core#>";

            query += " select distinct * from <" + variables.graphUri + ">  WHERE {"

            query += "<" + collectionId + "> skos:member ?child1." +

                "OPTIONAL{ ?child1  skos:prefLabel ?child1Label. ";
            if (variables.lang)
                query += "filter( lang(?child1Label)=\"" + variables.lang + "\")"
            query += "}"

            query += "?child1 rdf:type ?child1Type."
            if (options.onlyCollectionType)
                query += "filter (?child1Type=<http://www.w3.org/2004/02/skos/core#Collection>)"
            else if (options.excludeCollectionType)
                query += " filter(?child1Type!=<http://www.w3.org/2004/02/skos/core#Collection>)"


            query += "}" +
                "limit " + variables.limit;

            Sparql_proxy.querySPARQL_GET_proxy(variables.serverUrl, query, {}, null, function (err, result) {
                if (err) {
                    return callback(err)
                }
                return callback(null, result.results.bindings);
            })
        }


        ,
        getSingleNodeAllDescendants: function (sourceLabel, id, options, callback) {
            if (!options)
                options = {}
            var variables = self.Sparql.getVariables(sourceLabel);
            var query = "";
            query += "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>"
            query += " select distinct * FROM <" + variables.graphUri + ">  WHERE {"
            query += "  ?collection   skos:member*  ?narrower." +
                "filter (?collection=<" + id + ">) " +
                "?narrower skos:prefLabel|rdfs:label ?narrowerLabel." +
                "?narrower rdf:type ?narrowerType."
            if (options.withBroaders)
                query += "?narrower   rdfs:subClassOf*  ?broader."
            if (options.onlyCollectionType)
                query += "filter (?narrower=<http://www.w3.org/2004/02/skos/core#Collection>)"
            else if (options.excludeCollectionType)
                query += " filter(?narrower!=<http://www.w3.org/2004/02/skos/core#Collection>)"

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

    self.initBrowserCollectionSelect = function () {
        var source = MainController.currentSource
        MainController.currentSourceAllcollections = {}
        self.Sparql.getCollections(source, {all: true}, function (err, result) {
            if (err)
                return MainController.UI.message(err)
            if (result.length == 0) {
                Collection.currentCollectionFilter = null;
                $("#waitImg").css("display", "none");
                $("#ThesaurusBrowser_collectionDiv").css("display", "none")
                return ;//MainController.UI.message("no collections for this source")

            }

            var array = []
            result.forEach(function (item) {
                MainController.currentSourceAllcollections[item.collectionLabel.value] = item.collection.value;
                array.push({id: item.collection.value, label: item.collectionLabel.value})

            })
            $("#ThesaurusBrowser_collectionDiv").css("display", "block")
            common.fillSelectOptions("ThesaurusBrowser_collectionSelect", array, true, "label", "id")

        })
    }

    self.filterBrowserCollection = function () {
        var collection = $("#ThesaurusBrowser_collectionSelect").val();
        if (!collection || collection == "") {
            return Collection.currentCollectionFilter = null;
            ;
        }
        Collection.currentCollectionFilter = collection;
        ThesaurusBrowser.showThesaurusTopConcepts(MainController.currentSource, {filterCollections: collection})


    }

    return self;

})()
