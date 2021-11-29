/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Collection = (function () {

    var self = {}
    self.currentTreeNode;
    self.currentCollectionFilter = null;
    self.currentCandidateNode = null;

    self.broaderProperty = "http://www.w3.org/2004/02/skos/core#member"

    self.getJstreeContextMenu = function () {
        if (!self.currentTreeNode || !self.currentTreeNode.data)
            return {};
        var allowedLevels=0;//Config.currentProfile.contextMenuActionStartLevel
        var currentNodeLevel=self.currentTreeNode.parents.length
        var menuItems = {}


        if(currentNodeLevel<allowedLevels) {
            menuItems.forbidden = {
                label: "!!",
                action: function (obj, sss, cc) {
                   alert("Modifications not allowed at this level")
                },
            }
            menuItems.nodeInfos = {
                label: "Show Node infos",
                action: function (obj, sss, cc) {
                    SourceBrowser.showNodeInfos(self.currentTreeNode.data.source, self.currentTreeNode.id, "mainDialogDiv")
                },


            }

        }
        else{
            if (self.currentCandidateNode) {


                menuItems.assignConcepts = {
                    label: "<span class='blender_assignCollection'>Assign selected Concepts</span>",
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
                menuItems.filterTaxonomy = {
                    label: "<span class='blender_assignCollection'>Filter Taxonomy</span>",
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
            }
        }

         /*   menuItems.importChildren = {
                label: "Import child nodes",
                action: function (obj, sss, cc) {
                    Import.showImportNodesDialog("collection");
                    ;
                },
            }*/
        return menuItems;
    }


    self.selectTreeNodeFn = function (event, propertiesMap) {
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


    self.openTreeNode = function (divId, sourceLabel, node, callback) {
        var existingNodes = common.jstree.getjsTreeNodes(divId, true)
        if (!node.children || node.children.length > 0)
            return;

        self.Sparql.getNodeChildren(sourceLabel, node.data.id, {onlyCollectionType: true}, function (err, result) {
            if (err) {
                return MainController.UI.message(err);
            }
           var options={source:node.data.source,type:"collection"}
            TreeController.drawOrUpdateTree(divId, result, node.id, "child1",options)

        })

    }


    self.assignConcepts = function () {

        var nodes = [self.currentCandidateNode];
        var conceptIds = [];
        var newTreeNodes = []
        nodes.forEach(function (item) {
            conceptIds.push(item.data.id)
            newTreeNodes.push({
                text: "<span class='searched_concept'>" + item.label + "</span>",
                id: item.data.id,
                parent: Collection.currentTreeNode.data.id,
                data: {type: "treeType_concept"}
            })
        })
        Collection.Sparql.setConceptsCollectionMembership(Blender.currentSource, conceptIds, Collection.currentTreeNode.data.id, function (err, result) {
            $("#waitImg").css("display", "none");
            if (err)
                return MainController.UI.message(err)


          //  common.jstree.addNodesToJstree("Blender_collectionTreeDiv", Collection.currentTreeNode.data.id, newTreeNodes)
            MainController.UI.message("node " + self.currentCandidateNode.data.label + " assigned to collection " + Collection.currentTreeNode.data.label)
            return self.currentCandidateNode = null;
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

        var html = ("<div  class='blender_collectionFilter' >" + collection.text + "<button class='btn btn-sm my-1 py-0 btn-outline-primary' onclick='Collection.removeTaxonomyFilter()'>-</button></div>")
        $("#Blender_currentFilterDiv").append(html)

        if(Config.Blender.openTaxonomyTreeOnLoad){
            Blender.showFilteredTaxonomyTree(-1)

        }
        else {
            Sparql_generic.getTopConcepts(Blender.currentSource, options, function (err, result) {
                //   SourceBrowser.getFilteredNodesJstreeData(Blender.currentSource, options, function (err, jstreeData) {
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



            })
        }
    }


    self.removeTaxonomyFilter = function (collectionId) {
        self.currentCollectionFilter = null;

        $(".blender_collectionFilter").remove();
        if (Blender.currentSource)
            if(Config.Blender.openTaxonomyTreeOnLoad)
            Blender.showFilteredTaxonomyTree(-1)
        else {
                Blender.showTopConcepts()
            }


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
                sparql_server: source.sparql_server, //+ "?format=json&query=",
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

                fromStr = Sparql_common.getFromStr(sourceLabel);

            var query = "PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX  skos:<http://www.w3.org/2004/02/skos/core#>" +
                " select    distinct * " + fromStr + " WHERE {" +
                "?collection rdf:type  ?collectionType. filter( ?collectionType =skos:Collection). " +
                "?collection skos:prefLabel ?collectionLabel."
            if (false && variables.lang)
                query += "filter( lang(?collectionLabel)=\"" + variables.lang + "\")"
            if (!options.all)
                query += "FILTER (  NOT EXISTS {?child skos:member ?collection})"


            query += "} ORDER BY ?collectionLabel limit " + variables.limit;

            var options = {
                source: sourceLabel
            }

            Sparql_proxy.querySPARQL_GET_proxy(variables.sparql_server.url, query, null, options, function (err, result) {
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

            Sparql_generic.insertTriples(sourceLabel, triples, null,function (err, result) {

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

            var options = {
                source: sourceLabel
            }
            Sparql_proxy.querySPARQL_GET_proxy(variables.sparql_server.url, query, "", options, function (err, result) {
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
            var    fromStr = Sparql_common.getFromStr(sourceLabel);
            query += "PREFIX  skos:<http://www.w3.org/2004/02/skos/core#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>"
            query += " select distinct * " + fromStr + "  WHERE {"
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


            Sparql_proxy.querySPARQL_GET_proxy(variables.sparql_server.url, query, "", null, function (err, result) {
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
                $("#SourceBrowser_collectionDiv").css("display", "none")
                return;//MainController.UI.message("no collections for this source")

            }

            var array = []
            result.forEach(function (item) {
                MainController.currentSourceAllcollections[item.collectionLabel.value] = item.collection.value;
                array.push({id: item.collection.value, label: item.collectionLabel.value})

            })
            $("#SourceBrowser_collectionDiv").css("display", "block")
            common.fillSelectOptions("SourceBrowser_collectionSelect", array, true, "label", "id")

        })
    }

    self.filterBrowserCollection = function () {
        var collection = $("#SourceBrowser_collectionSelect").val();
        if (!collection || collection == "") {
            return Collection.currentCollectionFilter = null;
            ;
        }
        Collection.currentCollectionFilter = collection;
        SourceBrowser.showThesaurusTopConcepts(MainController.currentSource, {filterCollections: collection})


    }

    return self;

})()
