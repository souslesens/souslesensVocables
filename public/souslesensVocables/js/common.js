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
                    $("#" + selectId).append($('<option>', {
                        text: item[textfield] || item,
                        value: item[valueField] || item
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

        self.getjsTreeNodes = function (jstreeDiv, IdsOnly) {
            var idList = [];
            var jsonNodes = $('#' + jstreeDiv).jstree(true).get_json('#', {flat: true});
            $.each(jsonNodes, function (i, val) {
                if (IdsOnly)
                    idList.push($(val).attr('id'));
                else
                    idList.push($(val));
            })
            return idList;
        }


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


            if ($('#' + jstreeDiv).jstree)
                $('#' + jstreeDiv).jstree("destroy")
            $('#' + jstreeDiv).jstree({

                /* "checkbox": {
                     "keep_selected_style": false
                 },*/
                "plugins": plugins,
                "core": {
                    'data': jstreeData,
                    'check_callback': true,
                }, 'checkbox': {
                    /*   three_state: options.three_state,
                      cascade: options.cascade,
                      // tie_selection : false,*/
                    whole_node: false,
                    tie_selection: false,
                    three_state: false,
                },
                'dnd': options.dnd,
                types: options.types,

                contextmenu: {items: options.contextMenu}


            }).on('loaded.jstree', function () {
                if (options.openAll)
                    $('#' + jstreeDiv).jstree(true).open_all();
                self.setTreeAppearance()


            }).on("select_node.jstree",
                function (evt, obj) {

                    if (options.selectNodeFn)
                        options.selectNodeFn(evt, obj);
                }).on('open_node.jstree', function () {
                self.setTreeAppearance()
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
            jstreeData.forEach(function (node) {
                $("#" + jstreeDiv).jstree(true).create_node(parentNodeId, node, "last", function () {


                })

            })
            self.setTreeAppearance()
            $("#" + jstreeDiv).jstree(true).open_node(parentNodeId);
            var offset = $(document.getElementById(parentNodeId)).offset();
        }

        self.deleteNode = function (jstreeDiv, nodeId) {
            $("#" + jstreeDiv).jstree(true).delete_node(nodeId)
            self.setTreeAppearance()
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
            return slices;ormat


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
        self.getNewUri = function (sourceLabel,length) {
            if(!length)
                length=10
            var sourceUri = Config.sources[sourceLabel].graphUri
            if (sourceUri.lastIndexOf("/") != sourceUri.length - 1)
                sourceUri += "/"
            var nodeId = sourceUri + common.getRandomHexaId(length)
            return nodeId;
        }


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

        self.paletteX = [

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


        return self;


    }
)()
