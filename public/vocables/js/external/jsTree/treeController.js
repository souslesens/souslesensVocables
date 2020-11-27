/**
 * Created by claud on 08/06/2017.
 */
var treeController = (function () {
    var self = {};
    var selectedNodes = {};
    var hierarchyModel = [];
    var hierarchyModelObj = {}
    var data = [];
    var createdNodes = []
    var rootId = "root"
    var callback = function () {
    };


    self.test = function (jsTreeDivId) {

        $('#' + jsTreeDivId).jstree({
            'core': {
                'data': [
                    {"id": "ajson1", "parent": "#", "text": "Simple root node"},
                    {"id": "ajson2", "parent": "#", "text": "Root node 2"},
                    {"id": "ajson3", "parent": "ajson2", "text": "Child 1"},
                    {"id": "ajson4", "parent": "ajson2", "text": "Child 2"},
                ]
            }
        });
    }

// hierarchyModel [{id,text},{id,text},...]


    self.getTreeSelectedData = function () {
        var objs = [];
        for (var key in  selectedNodes) {
            var str = key;
            var ids = str.split("_");
            ids.splice(0, 1);
            var obj = {}
            for (var i = 0; i < ids.length; i++) {
                obj[hierarchyModel[i].id] = ids[i];
                var dataObj = util.find(data, hierarchyModel[i].id, ids[i], true)
                obj[hierarchyModel[i].text] = dataObj[hierarchyModel[i].text];
                obj[hierarchyModel[i].id] = common.convertNumStringToNumber(obj[hierarchyModel[i].id])
                //  obj[hierarchyModel[i].text] = ids[i];
            }
            objs.push(obj);
        }
        callback("checkedNodes", objs);

    }

    self.onSelect = function (jstreeNode) {
        if (jstreeNode.id) {//update
            var ids = jstreeNode.id.split("_");
            ids.splice(0, 1);
            var level = ids.length - 1;
            var model = hierarchyModelObj[jstreeNode.type];
            var obj = {}
            obj.id = ids[level];
            obj.type = jstreeNode.type;
            obj.idField = model.id;
            obj.parent = jstreeNode.parent;
            obj.jTreeId=jstreeNode.id;
            if(jstreeNode.data)
                obj.data = jstreeNode.data;
            callback("infos", obj);
        }
    }

    self.onRename = function (jstreeNode) {// on cree ou renomme les noeuds lors de l'évenement rename (after)
        var parent = jstreeNode.parent;

        if (jstreeNode.original) {// when created from list
            jstreeNode = jstreeNode.original;
            jstreeNode.parent = parent;
        }

        if (jstreeNode.id) {//update
            var ids = jstreeNode.id.split("_");
            ids.splice(0, 1);
            var level = ids.length - 1
            var id = ids[level];
            id = common.convertNumStringToNumber(id);

            var model = hierarchyModelObj[jstreeNode.type];
            var dataObj = util.find(data, model.id, id, false,true);

            var objs = [];
            for (var i = 0; i < dataObj.length; i++) {
                dataObj[i][model.text] = jstreeNode.text;
                objs.push(dataObj[i]);
            }

            callback("update", objs);
        } else {//new
            var ids = jstreeNode.parent.split("_");
            ids.splice(0, 1);
            var level = ids.length - 1;
            var dataObj;
            if (level > -1) {
                var id = ids[level];
                id = common.convertNumStringToNumber(id);
                var obj = {}
                var parentModel = hierarchyModel[level];
                var dataObj = util.find(data, parentModel.id, id, true,true);
                var childModel = hierarchyModel[level + 1];
                if(jstreeNode.listId){// if chooseInList
                    dataObj[childModel.id]=common.convertNumStringToNumber(jstreeNode.listId);
                }else{
                    delete dataObj[childModel.id];
                }
                dataObj[childModel.text] = jstreeNode.text;

                delete dataObj._id;
            } else {//root

                dataObj = {}
                dataObj[hierarchyModel[0].text] = jstreeNode.text;
            }
            callback("create", {
                node: dataObj,
                type: jstreeNode.type
            });

        }
    }
    self.onDelete = function (jstreeNode) {
        var ids = jstreeNode.id.split("_");
        ids.splice(0, 1);
        var level = ids.length - 1;

        if (level < hierarchyModel.length - 1) {
            alert("Cannot delete nodes whith children")
            return;
        }

        var id = ids[level];
        var obj = {}
        var model = hierarchyModelObj[jstreeNode.type];
        var dataObj = util.find(data, model.id, id, true);
        obj = {
            type: jstreeNode.type,
            node: dataObj
        }
        callback("delete", obj);


    }


    self.getModifiedNodes = function (jsTreeDivId) {
        var created = []
        for (var i = 0; i < createdNodes.length; i++) {

            var nodInfo = $("#" + createdNodes[i]);

            var parent_id_value = nodInfo.attr("parent_id");
            var title_value = nodInfo.attr("title");
            var version_value = nodInfo.attr("version");
            var node_name = nodInfo.children("a").text();

            /*   var node = $('#' + jsTreeDivId).jstree(true).get_node(createdNodes[i],true)[0];
             var obj={
             id:node.id,
             text:node.text,
             type:node.type,

             }
             created.push(obj);*/
        }
    }

    /*   self.getAllTreeData = function (jsTreeDivId) {
     var treeJson = $('#' + jsTreeDivId).jstree().get_json($('#' + jsTreeDivId), {
     flat: true
     });

     for (var i = 0; i < treeJson.length; i++) {
     var id = treeJson[i].id;
     var text = treeJson[i].text;
     if (id.indexOf("_") == 0) {//old node
     treeJson[i].id = treeJson[i].parent
     ";

     } else {// newNode

     }
     var ids = str.split("_");
     ids.splice(0, 1);
     for (var i = 0; i < ids.length; i++) {
     obj[hierarchyModel[i].id] = ids[i];
     var dataObj = util.find(data, hierarchyModel[i].id, ids[i], true)
     obj[hierarchyModel[i].text] = dataObj[hierarchyModel[i].text];
     //  obj[hierarchyModel[i].text] = ids[i];
     }

     }
     }*/


    var processCheckedNodes = function (checkedNodes) {
        var checkedNodeIds = [];
        if (!checkedNodes)
            return null;

        for (var i = 0; i < checkedNodes.length; i++) {
            var id = "";
            for (var k = 0; k < hierarchyModel.length; k++) {
                id += "_" + checkedNodes[i][hierarchyModel[k].id]

                if (checkedNodeIds.indexOf(id) < 0 && k == hierarchyModel.length - 1) {
                    checkedNodeIds.push(id)


                }
            }
        }
        return checkedNodeIds


    }
    self.load = function (jsTreeDivId, _data, _hierarchyModel, unfoldAll, _callback, checkedNodes,disableContextMenus) {
        $('#' + jsTreeDivId).jstree("destroy").empty();
        hierarchyModel = _hierarchyModel;


        for (var i = 0; i < hierarchyModel.length; i++) {
            hierarchyModelObj[hierarchyModel[i].type] = hierarchyModel[i]
        }
        data = _data;
        callback = _callback;
        selectedNodes = {};
        checkedNodes = processCheckedNodes(checkedNodes);

        var leaves = [];
        var treeJson = [];
        if (checkedNodes ){//|| !_callback) {
            treeJson.push({
                type: "root",
                text: hierarchyModel.name,
                parent: "#",
                id: rootId,

            });
        }


        for (var j = 0; j < hierarchyModel.length; j++) {

            for (var i = 0; i < data.length; i++) {

                var id = "";
                var parent = "";
                var text = data[i][hierarchyModel[j].text];
                if(!text)
                    continue;
                for (var k = 0; k <= j; k++) {
                    id += "_" + data[i][hierarchyModel[k].id]
                    if (j == 0) {
                        if (checkedNodes ){//|| !_callback) {
                            parent = rootId;
                        }
                        else {
                            parent = "#";
                        }
                    }
                    else {
                        if (k > 0) {
                            parent += "_" + data[i][hierarchyModel[k - 1].id];
                        }


                    }
                }

                if (leaves.indexOf(id + "_" + j) < 0) {
                    leaves.push(id + "_" + j);

                    /*   if (hierarchyModel[j].cbx) {
                     text="<input type=checkbox class='treeCbx' value='"+id+"'>"+text
                     }*/
                    var treeObj =
                        {
                            id: id,
                            parent: parent,
                            text: text,
                            //fields: hierarchyModel[j],
                            type: hierarchyModel[j].type
                        }
                    /*  if (hierarchyModel[j].icon) {
                     treeObj.icon = hierarchyModel[j].icon
                     }*/
                    if (data[i].data) {
                        treeObj.data = data[i].data;
                    }

                    treeJson.push(treeObj);
                }
            }
        }

        var plugins = [];
        plugins.push("search");
        plugins.push("sort");
        plugins.push("types");
        if (checkedNodes)
            plugins.push("checkbox");
        if (callback)
            plugins.push("contextmenu");


        var types = {};
        for (var j = 0; j < hierarchyModel.length; j++) {

            types[hierarchyModel[j].type] = {icon: hierarchyModel[j].icon}
        }


        var jsTree = $('#' + jsTreeDivId)
            .on('loaded.jstree', function (e, data) {
                $(".jstree-themeicon").css("background-size", "16px");
                if (checkedNodes) {
                    $('#' + jsTreeDivId).jstree('check_node', checkedNodes);
                    $('#' + jsTreeDivId).jstree('open_node', checkedNodes);
                }
                else if (unfoldAll)
                    $('#' + jsTreeDivId).jstree('open_all');
                else
                    $('#' + jsTreeDivId).jstree('open_node', "#" + rootId);
            })
            .on('after_open.jstree', function (e, data) {
                $(".jstree-themeicon").css("background-size", "16px");
            })
            .on('changed.jstree', function (e, data) {
                $(".jstree-themeicon").css("background-size", "16px");
                if (data && data.node && data.node.id) {
                    if (data.selected.indexOf(data.node.id) > -1) {
                        selectedNodes[data.node.id] = {parents: data.node.parents}
                    } else {
                        if (selectedNodes[data.node.id])
                            delete selectedNodes[data.node.id];
                    }
                }

            })
            .on("select_node.jstree",
                function (evt, obj) {
                    self.onSelect(obj.node);
                })
            .on('rename_node.jstree', function (xx, obj, old) {
                var node = obj.node.original;
                node.parent = obj.node.parent;
                node.text = obj.text;
                self.onRename(node);
                $(".jstree-themeicon").css("background-size", "16px");

            })
            .on('delete_node.jstree', function (xxx, obj) {
                self.onDelete(obj.node);
                $(".jstree-themeicon").css("background-size", "16px");
            })
            .jstree({
                    'core': {
                        data: treeJson,
                        // so that create works
                        check_callback: true

                    },
                    "types": types,
                    "contextmenu": {
                        "items": function () {
                            if(disableContextMenus)
                                return {};
                            return {
                                "Create": {
                                    "label": "Create",
                                    "action": function (data) {
                                        var ref = $.jstree.reference(data.reference);
                                        var sel = ref.get_selected();


                                        if (!sel.length) {
                                            return false;
                                        }
                                        sel = sel[0];
                                        var newNodeType = getType(sel);

                                        var level = getLevel(sel);
                                        if (level < hierarchyModel.length) {
                                            var mode = hierarchyModel[level].chooseInList;
                                            if (mode) {
                                                var obj = {
                                                    type: hierarchyModel[level].type,
                                                    parent: sel,
                                                };

                                                var listId = callback("chooseInList", obj);
                                                return;
                                            }

                                            sel = ref.create_node(sel, {"type": newNodeType});
                                            if (sel) {
                                                ref.edit(sel);
                                                createdNodes.push(sel);
                                            }
                                        }

                                    }
                                },

                                "CreateBrother": {
                                "label": "Create brother",
                                    "action": function (data,xxx,sss) {

                                    var ref = $.jstree.reference(data.reference);
                                    var sel = ref.get_selected();
                                    if (!sel.length) {
                                        return false;
                                    }
                                    var parent=getParent(sel,jsTreeDivId);
                                    sel = sel[0];
                                    var newNodeType = getType(sel-1);

                                    var level = getLevel(sel-1);
                                    sel = ref.create_node(parent, {"type": newNodeType});
                                    if (sel) {
                                        ref.edit(sel);
                                        createdNodes.push(sel);
                                    }

                                }
                            },
                                /*  "Rename": {
                                 "label": "Rename",
                                 "action": function (data) {
                                 var inst = $.jstree.reference(data.reference);
                                 obj = inst.get_node(data.reference);
                                 inst.edit(obj);
                                 }
                                 },*/
                                "Delete": {
                                    "label": "Delete",
                                    "action": function (data) {
                                        var ref = $.jstree.reference(data.reference),
                                            sel = ref.get_selected();
                                        if (!sel.length) {
                                            return false;
                                        }
                                        ref.delete_node(sel);

                                    }
                                }

                            }
                        }
                    },
                    "plugins": plugins
                }
            );


    }


    function getType(strId) {
        var count = 0;
        for (var i = 0; i < strId.length; i++) {
            if (strId[i] == '_')
                count++;
        }
        return hierarchyModel[count].type

    }

    function getLevel(strId) {
        var count = 0;
        for (var i = 0; i < strId.length; i++) {
            if (strId[i] == '_')
                count++;
        }
        return count;

    }

    function getParent(id,jsTreeDivId){
        var data=$('#' + jsTreeDivId).jstree(true).get_json('#', {flat:true});
        for(var i=0;i<data.length;i++){
            if(data[i].id==id){
                return data[i].parent
            }
        }
        return null;
    }


    self.openAll = function (jsTreeDivId) {
        $('#' + jsTreeDivId).jstree('open_all');
    }
    self.closeAll = function (jsTreeDivId) {
        $('#' + jsTreeDivId).jstree('close_all');
    }


    self.getTreeJson = function (jsTreeDivId) {
        var xxx = $('#' + jsTreeDivId).jstree().get_json($('#' + jsTreeDivId), {
            flat: true
        });
        /*.each(function(index, value) {
         var node = $("#tree").jstree().get_node(this.id);
         var lvl = node.parents.length;
         var idx = index;
         console.log('node index = ' + idx + ' level = ' + lvl);
         });*/
    }

    return self;
})
()
