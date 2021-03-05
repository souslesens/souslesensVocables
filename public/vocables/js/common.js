/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var common = (function () {
        var self = {};

        self.setTreeAppearance = function () {
            $(".jstree-themeicon").css("display", "none")
            $(".jstree-anchor").css("line-height", "18px")
            $(".jstree-anchor").css("height", "18px")
            $(".jstree-anchor").css("font-size", "14px")

        }
        self.fillSelectOptions = function (selectId, data, withBlanckOption, textfield, valueField) {


            $("#" + selectId).find('option').remove().end()
            if (withBlanckOption) {
                $("#" + selectId).append($('<option>', {
                    text: "",
                    value: ""
                }));
            }
            if (Array.isArray(data)) {
                data.forEach(function (item, index) {
                    var text, value;
                    if (textfield) {
                        if (item[textfield].value && item[valueField].value) {
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
                    $("#" + selectId).append($('<option>', {
                        text: text,
                        value: value
                    }));
                });
            } else {
                for (var key in data) {
                    var item = data[key]
                    $("#" + selectId).append($('<option>', {
                        text: item[textfield] || item,
                        value: item[valueField] || item
                    }));
                }
                ;
            }

        }

        self.getjsTreeNodes = function (jstreeDiv, IdsOnly, parentNodeId) {
            if (!parentNodeId)
                parentNodeId = "#"
            var idList = [];
            var jsonNodes = $('#' + jstreeDiv).jstree(true).get_json(parentNodeId, {flat: true});
            if (IdsOnly) {
                jsonNodes.forEach(function (item) {
                    idList.push(item.id)
                })
                return idList
            } else {
                return jsonNodes;
            }

        }

        self.getjsTreeNodeObj = function (jstreeDiv, id) {
            return $('#' + jstreeDiv).jstree(true).get_node(id);

        }


        self.getAllDescendants = function (jstreeDiv, nodeId) {
            var nodes = [];
            var nodeIdsMap = {};
            var recurse = function (nodeId) {

                var node = $('#' + jstreeDiv).jstree(true).get_node(nodeId);
                if (!nodeIdsMap[nodeId]) {
                    nodeIdsMap[nodeId] = 1
                    nodes.push(node);

                    // Attempt to traverse if the node has children
                    node.children.forEach(function (child) {
                        recurse(child);

                    })
                }
            }


            return nodes
        };


        self.loadJsTree = function (jstreeDiv, jstreeData, options, callback) {

            if (!options)
                options = {}

            var plugins = [];
            if (!options.cascade)
                options.cascade = "xxx"
            if (options.selectDescendants)
                options.cascade = "down"
            if (options.withCheckboxes)
                plugins.push("checkbox")
            if (options.searchPlugin)
                plugins.push("search")
            if (options.types)
                plugins.push("types")
            if (options.contextMenu)
                plugins.push("contextmenu")
            if (options.dnd)
                plugins.push("dnd")
            if (options.types)
                plugins.push("types")


            var check_callbackFn = function (op, node, parent, position, more) {
                if (op == 'move_node' && options.dropAllowedFn) {
                    return options.dropAllowedFn(op, node, parent, position, more)
                } else {
                    return true;
                }
            }


            if ($('#' + jstreeDiv).jstree)
                $('#' + jstreeDiv).jstree("destroy")
            $('#' + jstreeDiv).jstree({

                /* "checkbox": {
                     "keep_selected_style": false
                 },*/
                "plugins": plugins,
                "core": {
                    'data': jstreeData,
                    'check_callback': check_callbackFn
                },
                'dnd': options.dnd,
                types: options.types,

                contextmenu: {items: options.contextMenu}


            }).on('loaded.jstree', function () {

                if (options.openAll)
                    $('#' + jstreeDiv).jstree(true).open_all();
                self.setTreeAppearance()
                if (callback)
                    callback();


            }).on("select_node.jstree",
                function (evt, obj) {

                    if (options.selectTreeNodeFn)
                        options.selectTreeNodeFn(evt, obj);
                }).on('open_node.jstree', function (evt, obj) {
                self.setTreeAppearance()
                if (options.onOpenNodeFn) {
                    options.onOpenNodeFn(evt, obj);
                }

            }).on("check_node.jstree", function (evt, obj) {

                if (options.onCheckNodeFn) {
                    options.onCheckNodeFn(evt, obj);
                }


            }).on("uncheck_node.jstree", function (evt, obj) {


                if (options.onUncheckNodeFn) {
                    options.onUncheckNodeFn(evt, obj);
                }


            }).on("create_node.jstree", function (parent, node, position) {
                if (options.onCreateNodeFn) {
                    options.onCreateNodeFn(parent, node, position)
                    self.setTreeAppearance()
                }
            }).on("delete_node.jstree", function (node, parent) {
                if (options.onDeleteNodeFn) {
                    options.onDeleteNodeFn(node, parent)
                    self.setTreeAppearance()
                }
            })
                .on("move_node.jstree", function (node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance) {
                    if (options.onMoveNodeFn) {
                        options.onMoveNodeFn(node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance);
                        self.setTreeAppearance()
                    }

                })
                .on("show_contextmenu", function (node, x, y) {
                    if (options.onShowContextMenu)
                        options.onShowContextMenu(node, x, y)
                });


            if (options.dnd) {
                if (options.dnd.drag_start) {
                    $(document).on('dnd_start.vakata', function (data, element, helper, event) {
                        options.dnd.drag_start(data, element, helper, event)
                    });
                }
                if (options.dnd.drag_move) {
                    $(document).on('dnd_move.vakata Event', function (data, element, helper, event) {
                        options.dnd.drag_move(data, element, helper, event)
                    });
                }
                if (options.dnd.drag_stop) {
                    $(document).on('dnd_stop.vakata Event', function (data, element, helper, event) {
                        options.dnd.drag_stop(data, element, helper, event)
                    });
                }
            }


        }

        self.addNodesToJstree = function (jstreeDiv, parentNodeId, jstreeData, options) {
            if (!options)
                options = {}
            var position="first"
            if(options.positionLast)
                position="last"
            jstreeData.forEach(function (node) {
                var parentNode = parentNodeId;
                if (node.parent)
                    parentNode = node.parent
                $("#" + jstreeDiv).jstree(true).create_node(parentNode, node, position, function () {
                    $("#" + jstreeDiv).jstree(true).open_node(parentNode, null, 500);

                })

            })
            setTimeout(function () {
                self.setTreeAppearance()
                //   $("#" + jstreeDiv).jstree(true).close_node(parentNodeId);

                var offset = $(document.getElementById(parentNodeId)).offset();
            }, 500)
        }

        self.deleteNode = function (jstreeDiv, nodeId) {
            $("#" + jstreeDiv).jstree(true).delete_node(nodeId)
            self.setTreeAppearance()
        }

        self.onAllTreeCbxChange = function (allCBX, jstreeDiv) {
            var checked = $(allCBX).prop("checked")
            if (checked) {
                $("#" + jstreeDiv).jstree(true).check_all()
            } else {
                $("#" + jstreeDiv).jstree(true).uncheck_all()
            }
        }


        self.getAllsourcesWithType = function (type) {
            var sources = [];
            Object.keys(Config.sources).sort().forEach(function (item) {
                if (!type || Config.sources[item].schemaType == type)
                    sources.push(item)
            })
            return sources;
        }


        self.sliceArray = function (array, sliceSize) {
            var slices = [];
            var slice = []
            array.forEach(function (item) {
                if (slice.length >= sliceSize) {
                    slices.push(slice);
                    slice = [];
                }
                slice.push(item)
            })
            slices.push(slice);
            return slices;


        }


        self.concatArraysWithoutDuplicate = function (array, addedArray, key) {
            addedArray.forEach(function (addedItem) {
                var refuse = false
                array.forEach(function (item) {
                    if (key) {
                        refuse = (item[key] == addedItem[key])
                    } else {
                        refuse = (item == addedItem)
                    }

                })
                if (!refuse)
                    array.push(addedItem)
            })
            return array;
        }


        self.removeDuplicatesFromArray = function (array, key, uniques) {
            if (!uniques)
                uniques = [];
            var cleanedArray = []
            array.forEach(function (item) {
                var value;
                if (key)
                    value = item[key];
                else
                    value = item;
                if (!uniques[value]) {
                    uniques[value] = 1
                    cleanedArray.push(item)
                }

            })
            return cleanedArray;
        }

        self.formatUriToJqueryId = function (uri) {
            var str = uri.toLowerCase().replace("http://", "_");
            return str.replace(/\//g, "_").replace(/\./g, "_");

        }

        /**
         * https://stackoverflow.com/questions/58325771/how-to-generate-random-hex-string-in-javascript
         *
         * @param length
         * @return {string}
         */
        self.getRandomHexaId = function (length) {
            const str = Math.floor(Math.random() * Math.pow(16, length)).toString(16);
            return "0".repeat(length - str.length) + str;

        }

        self.getItemLabel = function (item, varName) {

            if (item[varName + "Label"])
                return item[varName + "Label"].value
            else {
                var p = item[varName].value.lastIndexOf("#")
                if (p < 0)
                    p = item[varName].value.lastIndexOf("/")
                return item[varName].value.substring(p + 1)

            }

        }
        self.getUriLabel = function (uri) {
            var p = uri.lastIndexOf("#")
            if (p < 0)
                p = uri.lastIndexOf("/")
            if (p > -1)
                return uri.substring(p + 1)
            else
                return uri

        }
        self.getNewUri = function (sourceLabel, length) {
            if (!length)
                length = 10
            var sourceUri = Config.sources[sourceLabel].graphUri
            if (sourceUri.lastIndexOf("/") != sourceUri.length - 1)
                sourceUri += "/"
            var nodeId = sourceUri + common.getRandomHexaId(length)
            return nodeId;
        }
        self.getNewId = function (prefix, length) {
            if (!length)
                length = 10
            return prefix + common.getRandomHexaId(length)
        }

        self.copyTextToClipboard = function (text) {
            var textArea = document.createElement("textarea");
            textArea.style.position = 'fixed';
            textArea.style.top = 0;
            textArea.style.left = 0;

            // Ensure it has a small width and height. Setting to 1px / 1em
            // doesn't work as this gives a negative w/h on some browsers.
            textArea.style.width = '2em';
            textArea.style.height = '2em';

            // We don't need padding, reducing the size if it does flash render.
            textArea.style.padding = 0;

            // Clean up any borders.
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';

            // Avoid flash of the white box if rendered for any reason.
            textArea.style.background = 'transparent';


            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                var successful = document.execCommand('copy');
                var msg = successful ? 'successful' : 'unsuccessful';
                document.body.removeChild(textArea);
                if (successful)
                    return "graph copied in clipboard"
                else

                    return "graph copy faild"
            } catch (err) {
                console.log(err);
                return "graph copy faild"
            }


        }
        self.convertNumStringToNumber = function (value) {
            if (value.match && value.match(/.*[a-zA-Z\/\\$].*/))
                return value;
            if (self.isInt(value))
                return parseInt(value)
            if (self.isFloat(value))
                return parseFloat(value)
            if (value == "true")
                return true;
            if (value == "false")
                return false;
            return value;

        },

            self.isNumber = function (n) {
                return !isNaN(parseFloat(n)) && isFinite(n);
            }
        self.isInt = function (value) {
            return /-?[0-9]+/.test("" + value);

        },
            self.isFloat = function (value) {
                return /-?[0-9]+[.,]+[0-9]?/.test("" + value);

            },
            self.palette = [
                '#9edae5',
                '#17becf',
                '#dbdb8d',
                '#bcbd22',
                '#c7c7c7',
                '#7f7f7f',
                '#f7b6d2',
                '#e377c2',
                '#c49c94',
                '#c5b0d5',
                '#ff9896',
                '#98df8a',
                '#ffbb78',
                '#ff7f0e',
                '#aec7e8',
                '#1f77b4',
                '#9467bd',
                '#8c564b',
                '#d62728',
                '#2ca02c',
            ]

        self.paletteIntense = [

            "#0072d5",
            '#FF7D07',
            "#c00000",
            '#FFD900',
            '#B354B3',
            "#a6f1ff",
            "#007aa4",
            "#584f99",
            "#cd4850",
            "#005d96",
            "#ffc6ff",
            '#007DFF',
            "#ffc36f",
            "#ff6983",
            "#7fef11",
            '#B3B005',
        ]

        self.quantumModelmappingSources = {
            'http://standards.iso.org/iso/15926/part14/PhysicalQuantity': 'ISO_15926-part-14',
            'http://data.posccaesar.org/dm/ClassOfQuantity': 'ISO_15926-PCA',
            'http://w3id.org/readi/rdl/D101001516': 'CFIHOS_READI',
            'http://data.posccaesar.org/rdl/RDS2216440288': 'ISO_15926-PCA',
            'http://data.15926.org/rdl/RDS2216440288': 'CFIHOS-ISO',
            'http://data.posccaesar.org/rdl/Discipline': 'ISO_15926-PCA',
            'http://w3id.org/readi/z018-rdl/Discipline': 'CFIHOS_READI',
            'http://data.posccaesar.org/rdl/RDS1138994': 'ISO_15926-PCA',
            'http://w3id.org/readi/rdl/D101001188': 'CFIHOS_READI',
            'http://data.15926.org/rdl/RDS1138994': 'CFIHOS-ISO',
            'http://standards.iso.org/iso/15926/part14/FunctionalObject': 'ISO_15926-part-14',
            'http://w3id.org/readi/rdl/D101001516': 'CFIHOS_READI',
            'http://data.posccaesar.org/rdl/RDS11984375': 'ISO_15926-PCA',
            'http://data.15926.org/rdl/RDS11984375': 'CFIHOS-ISO',
            'http://standards.iso.org/iso/15926/part14/PhysicalObject': 'ISO_15926-part-14',
            'http://w3id.org/readi/rdl/CFIHOS-60001285': 'CFIHOS_READI',
            'http://data.15926.org/cfihos/60001285': 'CFIHOS-ISO',
            'http://standards.iso.org/iso/15926/part14/UnitOfMeasure': 'ISO_15926-part-14',
            'http://data.posccaesar.org/dm/PhysicalQuantity': 'ISO_15926-PCA',
            'http://w3id.org/readi/rdl/CFIHOS-50000112': 'CFIHOS_READI',
            'http://data.posccaesar.org/dm/DocumentType': 'ISO_15926-PCA',
            'http://w3id.org/readi/rdl/D101001447': 'CFIHOS_READI',
            'http://data.posccaesar.org/rdl/RDS332864': 'ISO_15926-PCA',
            'http://w3id.org/readi/rdl/CFIHOS-70000406': 'CFIHOS_READI',
            'http://standards.iso.org/iso/15926/part14#purchase_order': 'ISO_15926-part-4',
            'http://standards.iso.org/iso/15926/part14#document': 'ISO_15926-part-4',
            'http://w3id.org/readi/rdl/D101001535': 'CFIHOS_READI',
            'http://data.15926.org/cfihos/Picklist': 'CFIHOS-ISO',

        }


        return self;


    }
)()
