import Lineage_whiteboard from "../tools/lineage/lineage_whiteboard.js";

var GraphDisplayLegend = (function () {
    var self = {};
    self.isRetractedLegend = {};
    self.currentListenerDiv = null;
    self.lastDraw = { type: null, legendDIv: null };
    self.legendsMap = {
        Lineage: {
            "owl:Class": {
                type: "node",
                attrs: {
                    shape: "dot",
                    color: "green",
                },
            },
            "owl:NamedIndividual": {
                type: "node",
                attrs: {
                    shape: "triangle",
                    color: "green",
                },
            },
            "rdf:blankNode": {
                type: "node",
                attrs: {
                    shape: "hexagon",
                    color: "#aaa",
                },
            },
            "rdf:container": {
                type: "node",
                attrs: {
                    shape: "square",
                    color: "green",
                },
            },
            "rdfs:subClassOf": {
                type: "edge",
                attrs: {
                    color: "#aaa",
                    arrows: { to: { enabled: true, type: "triangle", scaleFactor: 0.5 } },
                },
            },
            "owl:Restriction": {
                type: "edge",
                attrs: {
                    color: "#fdbf01",
                    arrows: { to: { enabled: true, type: "triangle", scaleFactor: 0.5 } },
                    dashes: [3, 2],
                },
            },

            "owl:ObjectProperty": {
                type: "edge",
                attrs: {
                    color: "#266264",
                    arrows: { to: { enabled: true, type: "triangle", scaleFactor: 0.5 } },
                },
            },

            "owl:annotationProperty": {
                type: "edge",
                attrs: {
                    color: "#3c8fe1",
                    arrows: { to: {} },
                    dashes: [5, 2, 3, 2],
                },
            },
        },

        RangesAndDomains: {
            "owl:Class": {
                type: "node",
                attrs: {
                    shape: "dot",
                    color: "#70309f",
                },
            },
            "owl:ObjectProperty": {
                type: "node",
                attrs: {
                    label: "an object property",
                    shape: "box",
                    fill: "#ddd",
                    color: "blue",
                },
            },
            "rdfs:domain": {
                type: "edge",
                attrs: {
                    color: "#cb6601",
                    arrows: { to: {} },
                },
            },
            "rdfs:range": {
                type: "edge",
                attrs: {
                    color: "#008000",
                    arrows: { to: {} },
                },
            },
            "owl:inversePropertyOf": {
                type: "edge",
                attrs: {
                    type: "node",
                    color: "#0067bb",
                    arrows: { to: {} },
                    dashes: [3, 3],
                },
            },
        },

        KGcreatorMappings: {
            "rdf:blankNode": {
                type: "node",
                attrs: {
                    shape: "square",
                    color: "#b0f5f5",
                },
            },
            "owl:NamedIndividual": {
                type: "node",
                attrs: {
                    shape: "triangle",
                    color: "#00afef",
                },
            },
            "owl:Class": {
                type: "node",
                attrs: {
                    shape: "dot",
                    color: "#70ac47",
                },
            },
            "Row index": {
                type: "node",
                attrs: {
                    shape: "star",
                    color: "#f90edd",
                },
            },
            Column: {
                type: "node",
                attrs: {
                    shape: "box",
                    color: "black",
                    fill: "#00afef",
                    label: "a column",
                },
            },
            Table: {
                type: "node",
                attrs: {
                    shape: "ellipse",
                    fill: "#ddd",
                    color: "black",
                    label: "a table",
                },
            },
        },
        KGcreator_classes: {
            "owl:Class": {
                type: "node",
                attrs: {
                    shape: "dot",
                    color: "#799b79",
                },
            },

            Table: {
                type: "node",
                attrs: {
                    shape: "box",
                    fill: "#ddd",
                    color: "black",
                    label: "a table",
                },
            },
            Column: {
                type: "node",
                attrs: {
                    shape: "box",
                    color: "black",
                    fill: "#00afef",
                    label: "a column",
                },
            },

            "owl:Restriction": {
                type: "edge",
                attrs: {
                    color: "#fdbf01",
                    arrows: { to: { enabled: true, type: "triangle", scaleFactor: 0.5 } },
                    dashes: [3, 2],
                },
            },

            "Tables join": {
                type: "edge",
                attrs: {
                    color: "#70ac47",
                    arrows: "to",
                },
            },

            "Column to Class mapping": {
                type: "edge",
                attrs: {
                    color: "#70ac47",
                    arrows: "to",
                },
            },
            "Inter columns ObjectProperty": {
                type: "edge",
                attrs: {
                    color: "#ec56da",
                    arrows: "to",
                },
            },
            "Column to class mapping": {
                type: "edge",
                attrs: {
                    color: "#aed",
                    arrows: "to",
                },
            },
        },
    };
    self.showHideLegend = function (legendCanvas, type, height, width, hide) {
        if (self.isRetractedLegend[legendCanvas]) {
            $("#" + legendCanvas).css("height", height);
            $("#" + legendCanvas).css("width", width);
            self.isRetractedLegend[legendCanvas] = false;
            self.drawLegend(self.lastDraw.type, self.lastDraw.legendDIv);
        } else {
            if (hide) {
                $("#" + legendCanvas).css("height", 30);
                $("#" + legendCanvas).css("width", 50);
                self.drawLegend(null, legendCanvas);
                self.isRetractedLegend[legendCanvas] = true;
                self.lastDraw = { type: type, legendDIv: legendCanvas };
                return;
            }
            if (event.offsetX > 200) {
                if (event.offsetY < 30) {
                    $("#" + legendCanvas).css("height", 30);
                    $("#" + legendCanvas).css("width", 50);
                    self.drawLegend(null, legendCanvas);
                    self.isRetractedLegend[legendCanvas] = true;
                    self.lastDraw = { type: type, legendDIv: legendCanvas };
                }
            }
        }
    };
    self.drawLegend = function (type, legendCanvas, expand) {
        return;
        //  type="KGcreator_classes"
        if (!legendCanvas) {
            legendCanvas = "visjsLegendCanvas";
        }
        self.lastDraw = { type: type, legendDIv: legendCanvas };

        $("#" + legendCanvas).css("display", "block");
        $("#" + legendCanvas).draggable();
        if (self.isRetractedLegend[legendCanvas] == undefined) {
            $("#" + legendCanvas)[0].addEventListener(
                "click",
                function (event) {
                    self.showHideLegend(legendCanvas, type, height, width);
                },
                false,
            );
            self.isRetractedLegend[legendCanvas] = expand;
        }

        /*  if(!expand)
            self.showHideLegend(legendCanvas)*/
        //  self.isRetractedLegend[legendCanvas]=expand
        if (self.isRetractedLegend[legendCanvas] == undefined) {
            self.isRetractedLegend[legendCanvas] = false;
        }
        var legendObj = self.legendsMap[type];

        if (!legendObj) {
            var width = 50;
            var height = 30;
            $("#" + legendCanvas).attr("width", width);
            var yOffset = 0;
        } else {
            var height = Object.keys(legendObj).length * 30 + 30;
            var width = 290;
            $("#" + legendCanvas).attr("width", width);
            var yOffset = 30;
        }

        $("#" + legendCanvas).attr("height", height);
        var c = document.getElementById(legendCanvas);
        var ctx = c.getContext("2d");
        ctx.clearRect(0, 0, width, height);
        var xOffset = 130;
        if (!legendObj) {
            ctx.font = "18px arial";
            ctx.fillText("Legend", 0, 20, width);
            return;
        } else {
            ctx.font = "18px arial";
            ctx.fillText("Legend", 120, 20);
            self.drawX(ctx, 280, 10, 5);
        }

        for (var key in legendObj) {
            yOffset += 25;
            var element = legendObj[key];

            ctx.font = "12px arial";
            ctx.strokeStyle = "black";
            ctx.fillStyle = "black";
            ctx.fillText(key, xOffset, yOffset);

            if (element.type == "node") {
                var color = element.attrs.color || "green";

                ctx.strokeStyle = color;
                ctx.fillStyle = color;
                self.drawShape(ctx, element.attrs.shape, xOffset, yOffset, element.attrs);
            }

            if (element.type == "edge") {
                ctx.beginPath();
                ctx.strokeStyle = element.attrs.color;
                ctx.fillStyle = element.attrs.color;
                if (element.attrs.dashes) {
                    ctx.setLineDash(element.attrs.dashes);
                }
                ctx.moveTo(10, yOffset);
                ctx.lineTo(xOffset - 15, yOffset);
                ctx.stroke();
                ctx.setLineDash([]);

                self.drawArrow(ctx, 10, yOffset, xOffset - 15, yOffset, 8);
            }
        }
        if (!expand && expand != undefined) {
            self.showHideLegend(legendCanvas, type, height, width, true);
        }
    };

    self.drawShape = function (ctx, shape, xOffset, yOffset, attrs) {
        if (shape == "dot") {
            ctx.beginPath();
            ctx.arc(xOffset / 2, yOffset - 5, 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
        }
        if (shape == "square") {
            ctx.fillRect(xOffset / 2 - 5, yOffset - 10, 15, 15);
        }
        if (shape == "triangle") {
            self.drawPolygon(ctx, xOffset / 2, yOffset - 5, 3, 10);
        }
        if (shape == "hexagon") {
            self.drawPolygon(ctx, xOffset / 2, yOffset - 5, 6, 10);
        }
        if (shape == "box") {
            ctx.beginPath();
            ctx.fillStyle = attrs.fill || "#ddd";
            ctx.roundRect(xOffset / 2 - 60, yOffset - 10, xOffset - 20, 18, 4);
            ctx.fill();
            if (attrs.label) {
                ctx.stroke();
                ctx.font = "10px arial";
                ctx.strokeStyle = attrs.color || "blue";
                ctx.fillStyle = attrs.color || "blue";
                ctx.fillText(attrs.label, xOffset / 2 - 30, yOffset);
            }
        }

        if (shape == "ellipse") {
            ctx.beginPath();
            ctx.fillStyle = attrs.fill || "#ddd";
            self.drawEllipseByCenter(ctx, xOffset / 2, yOffset - 5, xOffset - 20, 18);
            if (attrs.label) {
                ctx.font = "10px arial";
                ctx.strokeStyle = attrs.color || "blue";
                ctx.fillStyle = attrs.color || "blue";
                ctx.fillText(attrs.label, xOffset / 2 - 20, yOffset);
            }
        }

        if (shape == "star") {
            ctx.strokeStyle = attrs.color || "blue";
            ctx.fillStyle = attrs.color || "blue";
            self.drawStar(ctx, xOffset / 2, yOffset - 5, 5, 9, 4);
        }
    };

    self.drawPolygon = function (ctx, x, y, N, r) {
        //x&y are positions, N is side number, r is size, color is to fill

        ctx.beginPath();
        ctx.moveTo(x + r * Math.cos(0), y + r * Math.sin(0));

        for (var i = 1; i <= N; i += 1) {
            ctx.lineTo(x + r * Math.cos((i * 2 * Math.PI) / N), y + r * Math.sin((i * 2 * Math.PI) / N));
        }
        //Below draws the shape

        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.save();
        //Below fills the shape

        ctx.fill();
        ctx.restore();
    };

    self.drawEllipseByCenter = function (ctx, cx, cy, w, h) {
        function drawEllipse(ctx, x, y, w, h) {
            var kappa = 0.5522848,
                ox = (w / 2) * kappa, // control point offset horizontal
                oy = (h / 2) * kappa, // control point offset vertical
                xe = x + w, // x-end
                ye = y + h, // y-end
                xm = x + w / 2, // x-middle
                ym = y + h / 2; // y-middle

            ctx.beginPath();
            ctx.moveTo(x, ym);
            ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
            ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
            ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
            ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
            //ctx.closePath(); // not used correctly, see comments (use to close off open path)
            ctx.stroke();
        }
        drawEllipse(ctx, cx - w / 2.0, cy - h / 2.0, w, h);
    };
    self.drawArrow = function (context, fromx, fromy, tox, toy, r) {
        var x_center = tox;
        var y_center = toy;

        var angle;
        var x;
        var y;

        context.beginPath();

        angle = Math.atan2(toy - fromy, tox - fromx);
        x = r * Math.cos(angle) + x_center;
        y = r * Math.sin(angle) + y_center;

        context.moveTo(x, y);

        angle += (1 / 3) * (2 * Math.PI);
        x = r * Math.cos(angle) + x_center;
        y = r * Math.sin(angle) + y_center;

        context.lineTo(x, y);

        angle += (1 / 3) * (2 * Math.PI);
        x = r * Math.cos(angle) + x_center;
        y = r * Math.sin(angle) + y_center;

        context.lineTo(x, y);

        context.closePath();

        context.fill();
    };

    self.drawStar = function (ctx, cx, cy, spikes, outerRadius, innerRadius) {
        var rot = (Math.PI / 2) * 3;
        var x = cx;
        var y = cy;
        var step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (var i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    };
    self.drawX = function (ctx, x, y, length) {
        ctx.beginPath();

        ctx.moveTo(x - length, y - length);
        ctx.lineTo(x + length, y + length);

        ctx.moveTo(x + length, y - length);
        ctx.lineTo(x - length, y + length);
        ctx.stroke();
    };

    return self;
})();
export default GraphDisplayLegend;
window.GraphDisplayLegend = GraphDisplayLegend;
