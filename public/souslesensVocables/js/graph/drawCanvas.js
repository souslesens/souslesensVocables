var drawCanvas = (function () {

        self.canvasData = null;
        self.magasins = [];

        self.highlighted = null;
        var contextRotation = 0;
        var angle90 = -Math.PI / 2
        var onclickFn = null;
        var onMouseOverFn = null;

        var totalWidth;
        var totalHeight;

        var canvas;
        var context;

        var currentZoomTransform = {x: 0, y: 0, k: 1};
        var zoom = null;


        var drawEpis = true;
        var drawTravees = true;
        var drawTablettes = true;
        var drawBoites = true;
        var drawTraveeNumber = true;
        var drawTabletteNumber = true;
        var tabletteTextSpacing = 8;
        var nBoitesTablette = 13;
        var oldNumVersement = "";
        var nMagByLine = 10;

        var zoomExtent = [0.5, 10]


        var highlightAttrs = {
            alpha: 0.1,
            strokeColor: "#c00000",
            lineWidth: 2

        }

        var palette = [
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


        function onClick(point, obj, event) {

            if (onclickFn)
                onclickFn(point, obj, event)
            event.stopPropagation();
            /*  if (obj.data) {
                  $("#graphInfos").html(obj.data.name);
              }*/
        }

        function onMouseOver(point, obj) {
            if (onMouseOverFn) {
                onMouseOverFn(point, obj)
                event.stopPropagation();
            }
        }

        var zoomed = function (transform) {
            if (!transform)
                transform = d3.event.transform;
            context.save();
            context.clearRect(0, 0, mapWidth + 200, mapHeight + 200);
            context.translate(transform.x, transform.y);
            context.scale(transform.k, transform.k);
            currentZoomTransform = transform
            self.draw();
            context.fill();
            context.restore();
            event.stopPropagation();
        }

        function clicked() {
            var point = d3.mouse(this);
            var x = d3.event.pageX;
            var y = d3.event.pageY;
            var realPoint = [x, y];
            point[0] = (point[0] - currentZoomTransform.x) / currentZoomTransform.k
            point[1] = (point[1] - currentZoomTransform.y) / currentZoomTransform.k
            var node;
            drawCanvas.canvasData.forEach(function (rect) {


                if (rect.x < point[0] && (rect.x + rect.w) > point[0]) {
                    if (rect.y < point[1] && (rect.y + rect.h) > point[1]) {
                        return node = rect;
                    }
                }
            })
            onClick(realPoint, node, d3.event)
        }

        function moved() {

            var point = d3.mouse(this);
            var x = d3.event.pageX;
            var y = d3.event.pageY;
            var realPoint = [x, y];
            point[0] = (point[0] - currentZoomTransform.x) / currentZoomTransform.k
            point[1] = (point[1] - currentZoomTransform.y) / currentZoomTransform.k
            var node;
            drawCanvas.canvasData.forEach(function (rect) {

                if (rect.x < point[0] && (rect.x + rect.w) > point[0]) {
                    if (rect.y < point[1] && (rect.y + rect.h) > point[1]) {
                        return node = rect;
                    }
                }
            })
            if (node) {
                onMouseOver(realPoint, node)
                //   $(this).css('cursor','pointer');
            } else
            //  $(this).css('cursor','default');
                $("#mouseOverDiv").css("visibility", "hidden")
        }


        function initCanvas(graphDiv) {
            var totalWidth = $(graphDiv).width()// - 50;
            var totalHeight = $(graphDiv).height()// - 50;
            $(graphDiv).html("");
            currentZoomTransform = {x: 0, y: 0, k: 1};
            canvas = d3.select(graphDiv)
                .append('canvas')
                .attr('width', totalWidth)
                .attr('height', totalHeight);
            canvas.on('mousedown', clicked).on('mousemove', moved);

            context = canvas.node().getContext('2d');
            var customBase = document.createElement('custom');
            var custom = d3.select(customBase); // this is our svg replacement
            zoom = d3.zoom().scaleExtent(zoomExtent).on("zoom", zoomed);
            d3.select(context.canvas).call(zoom);

        }


        function clearCanvas() {
            context.clearRect(0, 0, totalWidth, totalHeight);
        }


        self.draw = function (data, options, callback) {
            clearCanvas();
            if (!data)
                data = drawCanvas.canvasData;
            if (!options)
                options = {};


            data.forEach(function (d, index) {
                var lineWidth;
                var color;


                context.globalAlpha = 1.0;
                if (self.highlighted) {//opacity
                    if (self.highlighted.indexOf(index) < 0)
                        context.globalAlpha = highlightAttrs.alpha;
                    else {
                        lineWidth = highlightAttrs.lineWidth;
                        color = highlightAttrs.strokeColor
                    }

                }
                if (lineWidth)
                    context.lineWidth = lineWidth;
                else if (d.lineWidth)
                    context.lineWidth = d.lineWidth;
                else
                    context.lineWidth = 0;
                if (d.type == "line") {
                    context.strokeStyle = "#888";
                    context.beginPath();
                    context.moveTo(d.x1, d.y1);
                    context.lineTo(d.x2, d.y2);
                    context.stroke();
                } else if (d.type == "rect") {
                    if (d.bgColor) {
                        context.fillStyle = d.bgColor
                        context.fillRect(d.x, d.y, d.w, d.h)
                    }
                    if (lineWidth || (d.lineWidth && d.lineWidth != 0)) {
                        if (color)
                            context.strokeStyle = color;
                        else if (d.color)
                            context.strokeStyle = d.color;

                        context.strokeRect(d.x, d.y, d.w, d.h);
                    }
                } else if (d.type = "text") {
                    if (d.color)
                        context.fillStyle = d.color;
                    context.font = d.font;
                    context.textAlign = d.textAlign || "center"
                    if (d.vertical) {
                        context.save();
                        context.translate(d.x, d.y);
                        context.rotate(angle90);
                        context.fillText(d.text, 0, 0);
                    } else {
                        context.fillText(d.text, d.x, d.y);
                    }

                    if (d.vertical) {
                        context.restore()

                    }
                }


            });
            if (callback)
                return callback(null)
        }


        self.drawData = function (canvasData, options, callback) {
            self.highlighted = null;
            self.canvasData = canvasData;
            if (options.onclickFn)
                onclickFn = options.onclickFn;
            if (options.onMouseOverFn)
                onMouseOverFn = options.onMouseOverFn;
            var graphDiv = "graphDiv"
            if (options.graphDiv)
                graphDiv = options.graphDiv;


            //  self.rawData = data;
            initCanvas("#" + graphDiv);


            self.draw(canvasData, options, function (err, result) {
                if (callback)
                    return callback(err)
            });

        }


        return self;
    }

)()

