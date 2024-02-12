var TagsGeometry = (function() {
    var self = {};


    self.showDialog = function() {


        $("#mainDialogDiv").load("modules/fabricjs/tagsGeometry.html", function(x, y) {
            $("#mainDialogDiv").dialog("open");
            self.initCanvas("canvas");
            self.initControls();
        });


    };


    self.deckColors = {
        "Main Deck": "black",
        "Mezzanine Deck": "red",
        "Upper Deck": "blue"

    };
    self.disciplineColors = {
        "Control Systems and PLCs": "#8efd00",
        "Electrical": "#00eafd",
        "Instrumentation ( including Valves and PSV )": "#fdac00",
        "Mechanical Rotating": "#000efd",
        "Mechanical Static equipments": "#8200fd",
        "Piping valves and vessels": "#f500fd",
        "Structure": "#c3c3c3"


    };

    self.initControls = function() {
        var jstreeData = [
            {
                id: "discipline",
                text: "discipline",
                parent: "#"
            },
            {
                id: "deck",
                text: "deck",
                parent: "#"
            }
        ];
        var disciplines = Object.keys(self.disciplineColors);
        disciplines.forEach(function(discipline, index) {
            jstreeData.push({
                id: discipline,
                text: discipline,
                parent: "discipline"
            });
        });
        var decks = Object.keys(self.deckColors);
        decks.forEach(function(deck, index) {
            jstreeData.push({
                id: deck,
                text: deck,
                parent: "deck"
            });
        });
        var options = {
            // selectTreeNodeFn: Lineage_properties.onTreeNodeClick,
            openAll: true,
            withCheckboxes: true
        };
        //  options.contextMenu = self.jstreeContextMenu();
        JstreeWidget.loadJsTree("tagsGeometryTreeDiv", jstreeData, options);

    };

    self.drawTest = function() {
        self.canvas.clear();
        var filterDeck = "";
        var filterDisicipline = "";

        var checkedOptions = $("#tagsGeometryTreeDiv").jstree(true).get_checked(true);

        checkedOptions.forEach(function(item) {
            if (item.parent == "deck") {
                if (filterDeck != "") {
                    filterDeck += ",";
                }
                filterDeck += "'" + item.text + "'";
            }
            if (item.parent == "discipline") {
                if (filterDisicipline != "") {
                    filterDisicipline += ",";
                }
                filterDisicipline += "'" + item.text + "'";
            }
        });
        var allFilter = "";
        if (filterDeck != "") {
            allFilter += "deck in (" + filterDeck + ")";
        }
        if (filterDisicipline != "") {
            if (allFilter != "") {
                allFilter += " and ";
            }
            allFilter += "disciplineName in (" + filterDisicipline + ")";
        }

        if (allFilter != "") {
            allFilter = " where " + allFilter;
        }

        var sqlQuery = "select * from V_JC_tags_coords " + allFilter;
        self.execSql(sqlQuery, function(err, data) {
            if (err) {
                return alert(err.responseText);
            }
            data.forEach(function(item) {
                const rect = new fabric.Rect({
                    //  evented:false,
                    top: item.xMax,
                    left: item.yMin,
                    width: item.yMax - item.yMin,
                    height: item.xMin - item.xMax,
                  //  fill: self.disciplineColors[item.disciplineName],
                    fill: 'rgba(0,0,0,0)',
                   // stroke: self.deckColors[item.deck],
                    stroke:self.disciplineColors[item.disciplineName],
                    strokeWidth:0.2,
                    data:item,
                   // opacity: 0.9

                });
                self.canvas.add(rect);
            });
        });
    };


    self.showObjectInfos = function(object) {
var html=""
       for(var key in  object.data){
           html+=key+":"+object.data[key]+"<br>"
       }



        $("#tagsGeometryInfosDiv").html(html)
    };


    self.execSql = function(sqlQuery, callback) {
        var dbName = "lifex_dalia_db";
        var sqlType = "sql.sqlserver";
        const params = new URLSearchParams({
            type: sqlType,
            dbName: dbName,
            sqlQuery: sqlQuery
        });

        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/kg/data?" + params.toString(),
            dataType: "json",

            success: function(data, _textStatus, _jqXHR) {
                callback(null, data);
            },
            error(err) {
                callback(err);
            }
        });
    };


    self.initCanvas = function(canvasDivId) {

        const canvas = new fabric.Canvas(canvasDivId, {
            // selection :false,
            backgroundColor: "#ddd",// 'rgb(100,100,200)',
            selectionColor: "blue",
            selectionLineWidth: 1,
            width: 800,
            height: 400
        });
        self.canvas = canvas;
        canvas.on("mouse:wheel", function(opt) {
            var delta = opt.e.deltaY;
            var zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 20) {
                zoom = 20;
            }
            if (zoom < 0.01) {
                zoom = 0.01;
            }
            canvas.setZoom(zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });
        /*    canvas.on('mouse:down', function(opt) {

                var evt = opt.e;
                if (evt.altKey === true) {
                    this.isDragging = true;
                    this.selection = false;
                    this.lastPosX = evt.clientX;
                    this.lastPosY = evt.clientY;
                }
            });
            canvas.on('mouse:move', function(opt) {
                if (this.isDragging) {
                    var e = opt.e;
                    var vpt = this.viewportTransform;
                    vpt[4] += e.clientX - this.lastPosX;
                    vpt[5] += e.clientY - this.lastPosY;
                    this.requestRenderAll();
                    this.lastPosX = e.clientX;
                    this.lastPosY = e.clientY;
                }
            });
            canvas.on('mouse:up', function(opt) {
                // on mouse up we want to recalculate new interaction
                // for all objects, so we call setViewportTransform
                this.setViewportTransform(this.viewportTransform);
                this.isDragging = false;
                this.selection = true;
            });
            canvas.on('mouse:wheel', function(opt) {
                var delta = opt.e.deltaY;
                var zoom = canvas.getZoom();
                zoom *= 0.999 ** delta;
                if (zoom > 20) zoom = 20;
                if (zoom < 0.01) zoom = 0.01;
                canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
                opt.e.preventDefault();
                opt.e.stopPropagation();
            })

         */


        canvas.on("mouse:down", function(opt) {
            self.currentObject = canvas.getActiveObject();
            self.showObjectInfos(self.currentObject);
        });
        canvas.on("object:selected", function(obj) {
            var x = obj;
        });

    };


    return self;

})();

export default TagsGeometry;
window.TagsGeometry = TagsGeometry;