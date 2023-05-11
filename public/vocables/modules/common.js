/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var common = (function () {
    var self = {};
    /**
     *
     *
     *
     * @type {{loadJsTree: self.jstree.loadJsTree, deleteBranch: self.jstree.deleteBranch, types: {"owl:ObjectProperty": {icon: string}, OWL: {icon: string}, concept: {icon: string}, "owl:Restriction": {icon: string}, collection: {icon: string}, importedProperty: {li_attr: {style: string}, icon: string}, tool: {icon: string}, importedRestriction: {li_attr: {style: string}, icon: string}, importedClass: {li_attr: {style: string}, icon: string}, default: {icon: string}, "owl:Class": {li_attr: {style: string}, icon: string}, SKOS: {icon: string}, "owl:table": {icon: string}, Class: {li_attr: {style: string}, icon: string}, class: {icon: string}, Property: {li_attr: {style: string}, icon: string}}, getNodeDescendants: (function(*, *, *, *): *[]), checkAll: self.jstree.checkAll, setTreeAppearance: self.jstree.setTreeAppearance, openNode: self.jstree.openNode, deleteNode: self.jstree.deleteNode, clear: self.jstree.clear, getNodeByDataField: ((function(*, *, *): (null|null))|*), setTreeParentDivDimensions: self.jstree.setTreeParentDivDimensions, getjsTreeNodes: ((function(*, *, *): (*[]))|*), onAllTreeCbxChange: self.jstree.onAllTreeCbxChange, addNodesToJstree: self.jstree.addNodesToJstree, openNodeDescendants: self.jstree.openNodeDescendants, getjsTreeNodeObj: (function(*, *): Object|jQuery|jQuery|*)}}
     */
    self.jstree = {
        types: {
            tool: {
                icon: "../icons/tool.png",
            },
            SKOS: {
                icon: "../icons/thesaurus.png",
            },
            OWL: {
                icon: "../icons/ontology.png",
            },

            class: {
                icon: "../icons/class.png",
            },
            concept: {
                icon: "../icons/concept.png",
            },
            collection: {
                icon: "../icons/collection.png",
            },
            default: {
                icon: "../icons/default.png",
            },
            "owl:Class": {
                li_attr: { style: "color:black" },
                icon: "../icons/class.png",
            },
            "owl:ObjectProperty": {
                icon: "../icons/property.png",
            },
            "owl:Restriction": {
                icon: "../icons/restriction.png",
            },
            "owl:table": {
                icon: "../icons/table.png",
            },
            importedClass: {
                li_attr: { style: "color:#ccc" },
                icon: "../icons/externalObject.png",
            },
            importedProperty: {
                li_attr: { style: "color:#ccc" },
                icon: "../icons/externalObject.png",
            },
            importedRestriction: {
                li_attr: { style: "color:#ccc" },
                icon: "../icons/externalObject.png",
            },
            Class: {
                li_attr: { style: "color:black" },
                icon: "../icons/class.png",
            },
            Property: {
                li_attr: { style: "color:black" },
                icon: "../icons/property.png",
            },
        },
        loadJsTree: function (jstreeDiv, jstreeData, options, callback) {
            var jstreeData2 = [];
            jstreeData.forEach(function (item) {
                if (item.parent != item.id) {
                    jstreeData2.push(item);
                }
            });
            jstreeData = jstreeData2;

            if (!options) {
                options = {};
            }

            var plugins = [];
            if (!options.cascade) {
                options.cascade = "xxx";
            }
            if (options.selectDescendants) {
                options.cascade = "down";
            }
            if (options.withCheckboxes) {
                plugins.push("checkbox");
            }
            if (options.searchPlugin) {
                plugins.push("search");
            }

            if (options.contextMenu) {
                // $(".jstree-contextmenu").css("z-index",100)
                plugins.push("contextmenu");
            }
            if (options.dnd) {
                plugins.push("dnd");
            }
            plugins.push("types");

            var check_callbackFn = function (op, node, parent, position, more) {
                if (op == "move_node" && options.dropAllowedFn) {
                    return options.dropAllowedFn(op, node, parent, position, more);
                } else {
                    return true;
                }
            };

            if ($("#" + jstreeDiv).jstree) {
                $("#" + jstreeDiv).jstree("destroy");
            }
            $("#" + jstreeDiv)
                .jstree({
                    /* "checkbox": {
"keep_selected_style": false
},*/
                    plugins: plugins,
                    core: {
                        data: jstreeData,
                        check_callback: check_callbackFn,
                    },
                    dnd: options.dnd,
                    search: options.searchPlugin,
                    checkbox: {
                        tie_selection: options.tie_selection,
                        whole_node: false,
                    },
                    types: common.jstree.types,

                    contextmenu: { items: options.contextMenu },
                })
                .on("loaded.jstree", function () {
                    //  setTimeout(function () {
                    if (options.openAll) {
                        $("#" + jstreeDiv)
                            .jstree(true)
                            .open_all();
                    }

                    self.jstree.setTreeAppearance();
                    if (!options.doNotAdjustDimensions) {
                        common.jstree.setTreeParentDivDimensions(jstreeDiv);
                    }
                    if (callback) {
                        callback();
                    }
                    //   }, 500)
                })
                .on("select_node.jstree", function (evt, obj) {
                    if (options.selectTreeNodeFn) {
                        options.selectTreeNodeFn(evt, obj);
                    }
                })
                .on("open_node.jstree", function (evt, obj) {
                    self.jstree.setTreeAppearance();
                    if (options.onOpenNodeFn) {
                        options.onOpenNodeFn(evt, obj);
                    }
                })
                .on(" after_open.jstree", function (evt, obj) {
                    self.jstree.setTreeAppearance();
                    if (options.onAfterOpenNodeFn) {
                        options.onAfterOpenNodeFn(evt, obj);
                    }
                })

                .on("enable_checkbox.jstree", function (evt, obj) {
                    if (options.onCheckNodeFn) {
                        options.onCheckNodeFn(evt, obj);
                    }
                })
                .on("check_node.jstree", function (evt, obj) {
                    if (options.onCheckNodeFn) {
                        options.onCheckNodeFn(evt, obj);
                    }
                })
                .on("uncheck_node.jstree", function (evt, obj) {
                    if (options.onUncheckNodeFn) {
                        options.onUncheckNodeFn(evt, obj);
                    }
                })
                .on("create_node.jstree", function (parent, node, position) {
                    if (options.onCreateNodeFn) {
                        options.onCreateNodeFn(parent, node, position);
                        self.jstree.setTreeAppearance();
                    }
                })
                .on("delete_node.jstree", function (node, parent) {
                    if (options.deleteNodeFn) {
                        options.deleteNodeFn(node, parent);
                        self.jstree.setTreeAppearance();
                    }
                })
                .on("move_node.jstree", function (node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance) {
                    if (options.onMoveNodeFn) {
                        options.onMoveNodeFn(node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance);
                        self.jstree.setTreeAppearance();
                    }
                })
                .on("show_contextmenu", function (node, x, y) {
                    if (options.onShowContextMenu) {
                        options.onShowContextMenu(node, x, y);
                    }
                });

            if (options.dnd) {
                if (options.dnd.drag_start) {
                    $(document).on("dnd_start.vakata", function (data, element, helper, event) {
                        options.dnd.drag_start(data, element, helper, event);
                    });
                }
                if (options.dnd.drag_move) {
                    $(document).on("dnd_move.vakata Event", function (data, element, helper, event) {
                        options.dnd.drag_move(data, element, helper, event);
                    });
                }
                if (options.dnd.drag_stop) {
                    $(document).on("dnd_stop.vakata Event", function (data, element, helper, event) {
                        options.dnd.drag_stop(data, element, helper, event);
                    });
                }
            }

            if (options.onHoverNode) {
                $("#" + jstreeDiv).on("hover_node.jstree", function (node) {
                    options.onHoverNode(node);
                });
            }
        },
        clear: function (jstreeDiv) {
            $("#" + jstreeDiv)
                .jstree("destroy")
                .empty();
        },

        addNodesToJstree: function (jstreeDiv, parentNodeId_, jstreeData, options) {
            if (!options) {
                options = {};
            }
            var position = "first";
            if (options.positionLast) {
                position = "last";
            }
            self.orderJstreeDataForCreation(jstreeDiv,jstreeData);           
            jstreeData.forEach(function (node) {
                var Jstree_id=$("#" + jstreeDiv).jstree(true).get_node(node.id);
                if(Jstree_id==false){


                    var parentNodeId = parentNodeId_;

                    if (!parentNodeId_) {
                        parentNodeId = node.parent;
                    }
    
                    if (!parentNodeId) {
                        return;
                    }
    
                    if (parentNodeId == node.id) {
                        return console.error("  Error jstree parent == childNode : " + parentNodeId);
                    }
    
                    var parentNodeObj = $("#" + jstreeDiv).jstree(true).get_node(parentNodeId);
                     if (parentNodeObj.children.indexOf(node) > -1) {
                            return;
                     }
    
                    
                   
                    // parent exists and have children
                    
                    //Create node
                    $("#" + jstreeDiv).jstree(true).create_node(parentNodeId, node, position, function () {
                            self.jstree.setTreeAppearance();
                            $("#" + jstreeDiv).jstree(true).open_node(parentNodeId, null, 500);
                    });

                }
               
            });
            /*    setTimeout(function() {
        $("#" + jstreeDiv)
          .jstree(true)
          .open_node(parentNodeId, null, 500);
      }, 500);*/
        },

        deleteNode: function (jstreeDiv, nodeId) {
            $("#" + jstreeDiv)
                .jstree(true)
                .delete_node(nodeId);
            self.jstree.setTreeAppearance();
        },
        deleteBranch: function (jstreeDiv, nodeId, deleteNodeItself) {
            var descendants = self.jstree.getNodeDescendants(jstreeDiv, nodeId, null, true);
            if (deleteNodeItself) {
                if (descendants.indexOf(nodeId) < 0) {
                    descendants.push(nodeId);
                }
            } else {
                var index = descendants.indexOf(nodeId);
                if (index > -1) {
                    descendants.splice(index, 1);
                }
            }
            /* descendants.forEach(function(item){
$("#" + jstreeDiv).jstree(true).delete_node(item)
})*/
            try {
                $("#" + jstreeDiv)
                    .jstree(true)
                    .delete_node(descendants);
            } catch (e) {
                console.error(e);
            }
        },
        getjsTreeNodes: function (jstreeDiv, IdsOnly, parentNodeId) {
            if (!parentNodeId) {
                parentNodeId = "#";
            }
            var idList = [];
            var jsonNodes = $("#" + jstreeDiv)
                .jstree()
                .get_json(parentNodeId, { flat: true });

            if (IdsOnly) {
                jsonNodes.forEach(function (item) {
                    idList.push(item.id);
                });
                return idList;
            } else {
                return jsonNodes;
            }
        },

        
        getjsTreeNodeObj: function (jstreeDiv, id) {
            return $("#" + jstreeDiv)
                .jstree(true)
                .get_node(id);
        },
        // get node from node.data field
        getNodeByDataField: function (jstreeDiv, property, value) {
            if (!$("#" + jstreeDiv).jstree(true)) {
                return null;
            }
            var jsonNodes = $("#" + jstreeDiv)
                .jstree(true)
                .get_json("#", { flat: true });
            var matchingNode = null;
            jsonNodes.forEach(function (node) {
                if (node.data && node.data[property] == value) {
                    return (matchingNode = node);
                }
            });
            return matchingNode;
        },

        getNodeDescendants: function (jstreeDiv, nodeId, depth, onlyIds) {
            var nodes = [];
            var nodeIdsMap = {};
            var currentLevel = 0;
            var recurse = function (nodeId) {
                if (depth && currentLevel++ > depth) {
                    return;
                }

                var node = $("#" + jstreeDiv)
                    .jstree(true)
                    .get_node(nodeId);
                if (!nodeIdsMap[nodeId]) {
                    nodeIdsMap[nodeId] = 1;
                    if (onlyIds) {
                        nodes.push(node.id);
                    } else {
                        nodes.push(node);
                    }

                    // Attempt to traverse if the node has children
                    if (node.children) {
                        node.children.forEach(function (child) {
                            recurse(child);
                        });
                    }
                }
            };
            recurse(nodeId);

            return nodes;
        },
        openNodeDescendants: function (jstreeDiv, nodeId, depth) {
            var descendants = common.jstree.getNodeDescendants(jstreeDiv, nodeId, depth);
            $("#" + jstreeDiv)
                .jstree()
                .open_node(descendants);
        },

        setTreeParentDivDimensions: function (jstreeDiv) {
            var parentDiv = $("#" + jstreeDiv).parent();
            if (!parentDiv) {
                // || parentDiv.width)
                return;
            }

            var p = $("#" + jstreeDiv).offset();
            if (p.top > 200) {
                //in case jstreeDiv in inactive tab
                p.top = 200;
            }
            var h = $(window).height() - p.top - 50;
            var w;
            if (p.left < 600) {
                w = 380;
            } else {
                w = 340;
            }
            // parentDiv.width(w);

            if (jstreeDiv == "LineageNodesJsTreeDiv") {
                // cannot do it generic !!!!!
                parentDiv.height(h);
            }
            if (jstreeDiv == "Lineage_propertiesTree") {
                parentDiv.height(h);
            }
            if (jstreeDiv == "Blender_conceptTreeDiv") {
                parentDiv.height(h);
            }

            parentDiv.css("overflow", "auto");
            parentDiv.css("margin-top", "5px");
        },

        setTreeAppearance: function () {
            return;
        },
        onAllTreeCbxChange: function (allCBX, jstreeDiv) {
            var checked = $(allCBX).prop("checked");
            if (checked) {
                $("#" + jstreeDiv)
                    .jstree(true)
                    .check_all();
            } else {
                $("#" + jstreeDiv)
                    .jstree(true)
                    .uncheck_all();
            }
        },
        checkAll: function (jstreeDiv) {
            $("#" + jstreeDiv)
                .jstree()
                .check_all();
        },
        openNode: function (jstreeDiv, nodeId) {
            $("#" + jstreeDiv)
                .jstree()
                .open_node(nodeId);
        },
    };
    self.getNodeByURI=function (jstreeDiv, id) {
        var data=$("#" + jstreeDiv).jstree()._model.data;
        var node_finded= false;
        for (var key in data) {
            var node=data[key];
            if(key!='#'){
                if(node.data.id==id){
                    node_finded=node;
                }
            }
            
        };
        return node_finded;


    },
    self.orderJstreeDataForCreation=function(jstreeDiv,JstreeData){
        var length=JstreeData.length
        var n=0;
        while (n < length) {
            
          var node= JstreeData[n];
          var parentNodeId=node.parent;
          var parentNodeObj = $("#" + jstreeDiv).jstree(true).get_node(parentNodeId);
          n++;
          // parent not exist in tree
          if (parentNodeObj==false){
                var indexfinded=self.checkinJstreeData(JstreeData,parentNodeId);
                if(indexfinded>n-1){
                    //pass jstreeData[i] to jstreeData[0]
                    var node_finded=JstreeData[indexfinded];
                    JstreeData.splice(indexfinded, 1);
                    JstreeData.splice(0, 0, node_finded);
        
                    n=0;
                }

                
           }  

          
        }
          
        
       
                
            
    },
    
    self.checkinJstreeData=function(jstreeData,id){
        var node_finded=null;
        var i=0;
        var index_finded=null;
        
        jstreeData.forEach(function (node) {

            if(node.id==id){
                node_finded= node;
                index_finded=i;
                
            }
            i++;
        });
        
        

        return(index_finded);

    },
    
    self.fillSelectOptions = function (selectId, data, withBlanckOption, textfield, valueField, selectedValue) {
        $("#" + selectId)
            .find("option")
            .remove()
            .end();
        if (withBlanckOption) {
            $("#" + selectId).append(
                $("<option>", {
                    text: "",
                    value: "",
                })
            );
        }

        if (Array.isArray(data)) {
            data.forEach(function (item, _index) {
                var text, value;
                if (textfield) {
                    if (item[textfield] && item[textfield].value && item[valueField].value) {
                        text = item[textfield].value;
                        value = item[valueField].value;
                    } else {
                        text = item[textfield];
                        value = item[valueField];
                    }
                } else {
                    text = item;
                    value = item;
                }
                var selected;
                if (selectedValue && value == selectedValue) {
                    selected = "selected";
                }
                $("#" + selectId).append(
                    $("<option>", {
                        text: text,
                        value: value,
                        selected: selected,
                    })
                );
            });
        } else {
            for (var key in data) {
                var item = data[key];
                $("#" + selectId).append(
                    $("<option>", {
                        text: item[textfield] || item,
                        value: item[valueField] || item,
                    })
                );
            }
        }
    };

    self.fillSelectWithColorPalette = function (selectId, colors) {
        if (!colors) colors = common.paletteIntense;
        var array = [];
        colors.forEach(function (color) {
            array.push();
        });
        common.fillSelectOptions(selectId, colors, true);

        $("#" + selectId + " option").each(function () {
            $(this).css("background-color", $(this).val());
        });
    };

    self.getAllsourcesWithType = function (type) {
        var sources = [];
        Object.keys(Config.sources)
            .sort()
            .forEach(function (item) {
                if (!type || Config.sources[item].schemaType.indexOf(type) > -1) {
                    sources.push(item);
                }
            });
        return sources;
    };

    self.array = {
        slice: function (array, sliceSize) {
            var slices = [];
            var slice = [];
            array.forEach(function (item) {
                if (slice.length >= sliceSize) {
                    slices.push(slice);
                    slice = [];
                }
                slice.push(item);
            });
            slices.push(slice);
            return slices;
        },

        distinctValues: function (array, key) {
            var distinctValues = {};
            var array2 = [];
            var value = "";
            array.forEach(function (item) {
                if (!key) {
                    value = item;
                } else {
                    value = item[key];
                    if (value && value.value) {
                        value = value.value;
                    }
                }
                if (!distinctValues[value]) {
                    distinctValues[value] = 1;
                    array2.push(item);
                }
            });
            return array2;
        },

        sort: function (array, key, order) {
            var x = order == "desc" ? -1 : 1;
            array.sort(function (a, b) {
                var valueA;
                var valueB;
                if (!key) {
                    valueA = a;
                    valueB = b;
                } else {
                    valueA = a[key];
                    if (valueA && valueA.value) {
                        valueA = valueA.value;
                    }
                    valueB = b[key];
                    if (valueB && valueB.value) {
                        valueB = valueB.value;
                    }
                }
                if (valueA > valueB) {
                    return x;
                }
                if (valueA < valueB) {
                    return -x;
                }
                return 0;
            });
            return array;
        },

        moveItem: function (arr, fromIndex, toIndex) {
            var element = arr[fromIndex];
            arr.splice(fromIndex, 1);
            arr.splice(toIndex, 0, element);
        },
        sortObjectArray: function (array, field, _options) {
            array.sort(function (a, b) {
                var aValue = a[field] ? a[field] : "";
                var bValue = b[field] ? b[field] : "";
                if (aValue > bValue) {
                    return 1;
                }
                if (aValue < bValue) {
                    return -1;
                }
                return 0;
            });
            return array;
        },

        unduplicateArray: function (array, key) {
            var uniqueItems = [];
            var uniqueIds = {};
            array.forEach(function (item) {
                if (!uniqueIds[item[key]]) {
                    uniqueIds[item[key]] = 1;
                    uniqueItems.push(item);
                }
            });
            return uniqueItems;
        },
        //to be finished ???
        pivotTable: function (array) {
            var matrix = [];
            var countCols = 0;
            var countLines = array.length;
            array.forEach(function (line, _lineIndex) {
                var mLine = [];
                countCols = Math.max(countCols, line.length);
                line.forEach(function (cell, _lineIndex) {
                    mLine.push(cell);
                });
                matrix.push(mLine);
            });

            var x = matrix;
            var matrix2 = [];
            for (var i = 0; i < countCols; i++) {
                var col = [];
                for (var j = 0; j < countLines; j++) {
                    col.push(matrix[j][i]);
                }
                matrix2.push(col);
            }

            return matrix2;
        },
    };

    self.concatArraysWithoutDuplicate = function (array, addedArray, key) {
        var filteredArray = JSON.parse(JSON.stringify(array));
        addedArray.forEach(function (addedItem) {
            var refuse = false;
            array.forEach(function (item) {
                if (key) {
                    refuse = item[key] == addedItem[key];
                } else {
                    refuse = item == addedItem;
                }
            });
            if (!refuse) {
                filteredArray.push(addedItem);
            }
        });
        return filteredArray;
    };

    self.removeDuplicatesFromArray = function (array, key, uniques) {
        if (!uniques) {
            uniques = [];
        }
        var cleanedArray = [];
        array.forEach(function (item) {
            var value;
            if (key) {
                value = item[key];
            } else {
                value = item;
            }
            if (!uniques[value]) {
                uniques[value] = 1;
                cleanedArray.push(item);
            }
        });
        return cleanedArray;
    };
    self.formatStringForTriple = function (str, forUri) {
        if (!str) {
            return str;
        }
        str = str.trim();
        if (str.indexOf("http://") == 0) {
            return str;
        }
        if (!str || !str.replace) {
            return null;
        }
        str = str.trim();
        str = str.replace(/\\/gm, "");
        str = str.replace(/"/gm, '\\"');
        // str = str.replace(/;/gm, "\\\;")
        //  str = str.replace(/\n/gm, "\\\\n")
        str = str.replace(/\n/gm, "\\\\n");
        //  str = str.replace(/\r/gm, "\\\\r")
        str = str.replace(/\r/gm, "");
        str = str.replace(/\t/gm, "\\\\t");
        str = str.replace(/\\xa0/gm, " ");
        str = str.replace(/'/gm, "");
        str = str.replace(/\\/gm, "");
        str = str.replace(/—/gm, " ");
        str = str.replace(/:/gm, "");
        str = str.replace(/\:/gm, "");

        if (forUri) {
            str = str.replace(/ /gm, "_");
            //  str = str.replace(/\-/gm, "_");
            str = str.replace(/:/gm, "_");
            str = str.replace(/\(/gm, "_");
            str = str.replace(/\)/gm, "_");

            str = str.replace(/[^a-zA-Z0-9-_]/g, "");
            /*  str = encodeURIComponent(str);
str = str.replace(/%2F/gm, "/");*/
        }

        return str;
    };

    self.escapeNonASCIIstring = function (string) {
        function padWithLeadingZeros(string) {
            return new Array(5 - string.length).join("0") + string;
        }

        function unicodeCharEscape(charCode) {
            return "\\u" + padWithLeadingZeros(charCode.toString(16));
        }

        function unicodeEscape(string) {
            return string
                .split("")
                .map(function (char) {
                    var charCode = char.charCodeAt(0);
                    return charCode > 127 ? unicodeCharEscape(charCode) : char;
                })
                .join("");
        }

        return unicodeEscape(string);
    };

    self.formatUriToJqueryId = function (uri) {
        var str = uri.toLowerCase().replace("http://", "_");
        return str.replace(/\//g, "_").replace(/\./g, "_");
    };
    self.encodeToJqueryId = function (myId) {
        return myId.replace(/\./g, "__e__");
    };
    self.decodeFromJqueryId = function (jqueryId) {
        var str = jqueryId.toLowerCase().replace(/__e__/g, ".");
        return str;
    };

    self.decapitalizeLabel = function (label) {
        if (!label.match(/[a-z]/)) {
            return label;
        }
        var altLabel = label.replace(/[A-Z]/g, function (maj) {
            if (label.indexOf(" ") > -1) {
                return "" + maj;
            }
            return " " + maj;
        });
        return altLabel.trim();
    };

    /**
     * https://stackoverflow.com/questions/58325771/how-to-generate-random-hex-string-in-javascript
     *
     * @param length
     * @return {string}
     */
    self.getRandomHexaId = function (length) {
        const str = Math.floor(Math.random() * Math.pow(16, length)).toString(16);
        return "0".repeat(length - str.length) + str;
    };

    self.getItemLabel = function (item, varName, _lang) {
        if (item[varName + "Label"]) {
            return item[varName + "Label"].value;
        } else {
            var p = item[varName].value.lastIndexOf("#");
            if (p < 0) {
                p = item[varName].value.lastIndexOf("/");
            }
            return item[varName].value.substring(p + 1);
        }
    };
    self.getUriLabel = function (uri) {
        var p = uri.lastIndexOf("#");
        if (p < 0) {
            p = uri.lastIndexOf("/");
        }
        if (p > -1) {
            return uri.substring(p + 1);
        } else {
            return uri;
        }
    };
    self.getNewUri = function (sourceLabel, length) {
        if (!length) {
            length = 10;
        }
        var sourceUri = Config.sources[sourceLabel].graphUri;
        if (sourceUri.lastIndexOf("/") != sourceUri.length - 1) {
            sourceUri += "/";
        }
        var nodeId = sourceUri + common.getRandomHexaId(length);
        return nodeId;
    };
    self.getNewId = function (prefix, length) {
        if (!length) {
            length = 10;
        }
        return prefix + common.getRandomHexaId(length);
    };

    self.copyTextToClipboard = function (text, callback) {
        async function copy() {
            if (navigator.clipboard && window.isSecureContext) {
                // navigator clipboard api method'
                try {
                    navigator.clipboard.writeText(text);
                    if (callback) {
                        return callback(null, "graph copied in clipboard");
                    } else {
                        return alert("graph copied in clipboard");
                    }
                } catch (err) {
                    MainController.UI.message("graph copy failed");
                    if (callback) {
                        return callback(err);
                    }
                }
            } else {
                // text area method
                let textArea = document.createElement("textarea");
                textArea.value = text;
                // make the textarea out of viewport
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                return new Promise((res, rej) => {
                    // here the magic happens
                    var ok = document.execCommand("copy");
                    if (ok) {
                        if (callback) {
                            return callback(null, "graph copied in clipboard");
                        } else {
                            return alert("graph copied in clipboard");
                        }
                    } else {
                        MainController.UI.message("graph copy failed");
                        if (callback) {
                            return callback(err);
                        }
                    }
                    textArea.remove();
                });
            }

            /*  try {
await navigator.clipboard.writeText(text);

if (callback) {
return callback(null, "graph copied in clipboard");
} else return alert("graph copied in clipboard");
} catch (err) {
MainController.UI.message("graph copy failed");
if (callback) return callback(err);
}*/
        }

        copy();
        return;

        // var textArea = document.createElement("textarea");
        // textArea.style.position = "fixed";
        // textArea.style.top = 0;
        // textArea.style.left = 0;

        // // Ensure it has a small width and height. Setting to 1px / 1em
        // // doesn't work as this gives a negative w/h on some browsers.
        // textArea.style.width = "2em";
        // textArea.style.height = "2em";

        // // We don't need padding, reducing the size if it does flash render.
        // textArea.style.padding = 0;

        // // Clean up any borders.
        // textArea.style.border = "none";
        // textArea.style.outline = "none";
        // textArea.style.boxShadow = "none";

        // // Avoid flash of the white box if rendered for any reason.
        // textArea.style.background = "transparent";

        // textArea.value = text;
        // document.body.appendChild(textArea);
        // textArea.focus();
        // textArea.select();

        // try {
        //     var successful = document.execCommand("copy");
        //     var msg = successful ? "successful" : "unsuccessful";
        //     document.body.removeChild(textArea);
        //     if (successful) return "graph copied in clipboard";
        //     else return "graph copy failed";
        // } catch (err) {
        //     console.log(err);
        //     return "graph copy faild";
        // }
    };

    self.pasteTextFromClipboard = function (callback) {
        async function paste() {
            if (navigator.clipboard) {
                const text = await navigator.clipboard.readText();
                callback(text);
                //  alert('Pasted text: ', text);
            } else {
                let textArea = document.createElement("textarea");

                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                try {
                    var successful = document.execCommand("paste");
                    var text = textArea.value;
                    callback(text);
                } catch (e) {
                    console.log(e);
                    return callback(null);
                }
            }
        }

        paste();
    };

    self.createBGColorCssClasses = function (classPrefix, values, palette) {
        values.forEach(function (item, index) {
            var html = classPrefix + item + " :  { background-color:" + palette[index] + "}";

            $("<style>").prop("type", "text/css").html(html).appendTo("head");
        });
    };

    self.deconcatSQLTableColumn = function (str, removeSchema) {
        if (str.indexOf(":") > -1) {
            return null;
        }
        var array = str.split(".");
        if (array.length < 2) {
            return null;
        }
        if (array.length == 2) {
            return { table: array[0], column: array[1] };
        } else if (array.length == 3) {
            if (!removeSchema) {
                return { table: array[0] + "." + array[1], column: array[2] };
            } else {
                return { table: array[1], column: array[2] };
            }
        } else {
            return null;
        }
    };

    (self.convertNumStringToNumber = function (value) {
        if (value.match && value.match(/.*[a-zA-Z/\\$].*/)) {
            return value;
        }
        if (self.isInt(value)) {
            return parseInt(value);
        }
        if (self.isFloat(value)) {
            return parseFloat(value);
        }
        if (value == "true") {
            return true;
        }
        if (value == "false") {
            return false;
        }
        return value;
    }),
        (self.dateToSQlserverString = function (date) {
            var str = "";
            var dateArray = date.toLocaleString("en-US").split(" ");
            if (date instanceof Date && isFinite(date)) {
                var month = "" + (date.getMonth() + 1);
                if (month.length == 1) {
                    month = "0" + month;
                }
                var day = "" + date.getDate();
                if (day.length == 1) {
                    day = "0" + day;
                }
                str = date.getFullYear() + "" + month + "" + day + " " + dateArray[1] + " " + dateArray[2];
            } else {
                str = "";
            }
            return str;
        });

    // var dateTime='2000-01-15T00:00:00'

    self.dateToRDFString = function (date) {
        var str = "";
        if (date instanceof Date && isFinite(date)) {
            var month = "" + (date.getMonth() + 1);
            if (month.length == 1) {
                month = "0" + month;
            }
            var day = "" + date.getDate();
            if (day.length == 1) {
                day = "0" + day;
            }
            var hour = "" + date.getHours();
            if (day.hour == 1) {
                hour = "0" + hour;
            }
            var min = "" + date.getMinutes();
            if (min.length == 1) {
                min = "0" + min;
            }
            var sec = "" + date.getSeconds();
            if (sec.length == 1) {
                sec = "0" + sec;
            }
            str = date.getFullYear() + "-" + month + "-" + day + "T" + hour + ":" + min + ":" + sec;
        } else {
            str = "";
        }
        return str;
    };

    self.isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    (self.isInt = function (value) {
        return /-?[0-9]+/.test("" + value);
    }),
        (self.isFloat = function (value) {
            return /-?[0-9]+[.,]+[0-9]?/.test("" + value);
        }),
        (self.palette = [
            "#9edae5",
            "#17becf",
            "#dbdb8d",
            "#bcbd22",
            "#c7c7c7",
            "#7f7f7f",
            "#f7b6d2",
            "#e377c2",
            "#c49c94",
            "#c5b0d5",
            "#ff9896",
            "#98df8a",
            "#ffbb78",
            "#ff7f0e",
            "#aec7e8",
            "#1f77b4",
            "#9467bd",
            "#8c564b",
            "#d62728",
            "#2ca02c",
        ]);

    self.paletteIntense = [
        "#0072d5",
        "#FF7D07",
        "#c00000",
        "#FFD900",
        "#B354B3",
        "#a6f1ff",
        "#007aa4",
        "#584f99",
        "#cd4850",
        "#005d96",
        "#ffc6ff",
        "#007DFF",
        "#ffc36f",
        "#ff6983",
        "#7fef11",
        "#B3B005",
    ];

    self.quantumModelmappingSources = {
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalQuantity": "ISO_15926-part-14",
        "http://data.posccaesar.org/dm/ClassOfQuantity": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/D101001516": "CFIHOS_READI",
        "http://data.posccaesar.org/rdl/RDS2216440288": "ISO_15926-PCA",
        "http://data.15926.org/rdl/RDS2216440288": "CFIHOS-ISO",
        "http://data.posccaesar.org/rdl/Discipline": "ISO_15926-PCA",
        "http://w3id.org/readi/z018-rdl/Discipline": "CFIHOS_READI",
        "http://data.posccaesar.org/rdl/RDS1138994": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/D101001188": "CFIHOS_READI",
        "http://data.15926.org/rdl/RDS1138994": "CFIHOS-ISO",
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/FunctionalObject": "ISO_15926-part-14",
        "http://data.posccaesar.org/rdl/RDS11984375": "ISO_15926-PCA",
        "http://data.15926.org/rdl/RDS11984375": "CFIHOS-ISO",
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/PhysicalObject": "ISO_15926-part-14",
        "http://w3id.org/readi/rdl/CFIHOS-60001285": "CFIHOS_READI",
        "http://data.15926.org/cfihos/60001285": "CFIHOS-ISO",
        "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/UnitOfMeasure": "ISO_15926-part-14",
        "http://data.posccaesar.org/dm/PhysicalQuantity": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/CFIHOS-50000112": "CFIHOS_READI",
        "http://data.posccaesar.org/dm/DocumentType": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/D101001447": "CFIHOS_READI",
        "http://data.posccaesar.org/rdl/RDS332864": "ISO_15926-PCA",
        "http://w3id.org/readi/rdl/CFIHOS-70000406": "CFIHOS_READI",
        "http://standards.iso.org/iso/15926/part14#purchase_order": "ISO_15926-part-4",
        "http://standards.iso.org/iso/15926/part14#document": "ISO_15926-part-4",
        "http://w3id.org/readi/rdl/D101001535": "CFIHOS_READI",
        "http://data.15926.org/cfihos/Picklist": "CFIHOS-ISO",
    };

    self.colorToRgba = function (hex, alpha) {
        if (!alpha) {
            alpha = 1;
        }

        if (alpha > 1) {
            alpha = 1;
        }
        if (alpha < 0) {
            alpha = 0;
        }
        var c;
        if (!hex) {
            return;
        }
        if (hex.indexOf("rgba") == 0) {
            return hex.replace(/,\d(\.\d)*\)/, "," + alpha + ")");
        }
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split("");
            if (c.length == 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = "0x" + c.join("");
            return "rgba(" + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",") + "," + alpha + ")";
        }
        return hex;
    };

    self.getInputSelection = function () {
        var userSelection;
        if (window.getSelection) {
            userSelection = window.getSelection();
        } else if (document.selection) {
            // Opera
            userSelection = document.selection.createRange();
        }
        return userSelection;
    };

    self.getStackTrace = function (title) {
        return;
        var callback = function (stackframes) {
            var stringifiedStack = stackframes
                .map(function (sf) {
                    return sf.toString();
                })
                .join("\n");
            console.log(stringifiedStack);
        };

        var errback = function (err) {
            console.log(err.message);
        };

        StackTrace.get().then(callback).catch(errback);
        return;
        console.debug();
        var xx = console.trace();
        var stack = new Error().stack;
    };

    self.getUrlParamsMap = function () {
        var paramsMap = {};
        var paramsStr = window.location.search.substring(1);
        var params = paramsStr.split("&");
        params.forEach(function (param) {
            var array = param.split("=");

            paramsMap[array[0]] = array[1];
        });
        return paramsMap;
    };

    self.setDatePickerOnInput = function (inputId, options) {
        $("#" + inputId).datepicker({});
        $("#" + inputId).datepicker("option", "dateFormat", "yy-mm-dd");
    };

    return self;
})();

export default common;

window.common = common;
window.common = common;
