import common from "../shared/common.js";

//https://github.com/justinharrell/vis-svg

var SVGexport2 = (function () {
    var self = {};

    /**
     * Initiates the SVG export process for a vis.js graph.
     *
     * @function
     * @name toSVG
     * @memberof SVGexport2
     * @param {Object} visJsGraphClass - The vis.js graph class instance to export.
     */
    self.toSVG = function (visJsGraphClass) {
        //var CanvasRenderingContext2D = network.canvas.getContext("2d");
        self.exportToSVG(visJsGraphClass);
        return;
    };
    /**
     * Sets up the export process by adding an event listener for afterDrawing.
     *
     * @function
     * @name exportToSVG
     * @memberof SVGexport2
     * @param {Object} visjsGraphClass - The vis.js graph class instance to export.
     */
    self.exportToSVG = function (visjsGraphClass) {
        var network = visjsGraphClass.network;
        network.once("afterDrawing", function (ctx) {
            self.generateSVGFromGraph(ctx, network);
        });
        network.redraw();
    };

    /**
     * Generates an SVG representation of the graph and triggers its download.
     *
     * @function
     * @name generateSVGFromGraph
     * @memberof SVGexport2
     * @param {CanvasRenderingContext2D} ctx - The canvas context.
     * @param {Object} network - The vis.js network instance.
     */
    self.generateSVGFromGraph = function (ctx, network) {
        var svgNS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(svgNS, "svg");

        var scale = network.getScale();

        svg.setAttribute("width", ctx.canvas.width);
        svg.setAttribute("height", ctx.canvas.height);
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        Object.values(network.body.nodes).forEach((node) => {
            if (node.options.id.includes("edge")) return;

            var position = network.canvasToDOM({ x: node.x, y: node.y });
            var shape = node.options.shape || "circle";
            var size = (node.options.size || 10) * scale;
            var fillColor = node.options.color.background || "blue";

            var scaledNode = {};
            scaledNode.options = {};
            scaledNode.options.id = node.options.id;
            scaledNode.options.shape = node.options.shape;
            scaledNode.options.size = size;

            // Add shape properties if they exist
            if (node.shape) {
                scaledNode.shape = {};
                if (node.shape.width) {
                    scaledNode.shape.width = node.shape.width * scale;
                }
                if (node.shape.height) {
                    scaledNode.shape.height = node.shape.height * scale;
                }
            }

            var element = SVGdrawing.drawShape(svgNS, position, scaledNode);
            element.setAttribute("fill", fillColor);
            svg.appendChild(element);

            if (node.options.label) {
                if (shape == "circle") {
                    position.y += 10 * scale;
                }
                var fontSize;
                if (node.options.font && node.options.font.size) {
                    fontSize = parseInt(node.options.font.size) * scale + "px";
                } else {
                    fontSize = 12 * scale + "px";
                }

                var text = SVGdrawing.drawText(svgNS, position, node.options.label, fontSize);
                svg.appendChild(text);
            }
        });

        Object.values(network.body.edges).forEach((edge, index) => {
            var fromNode = network.body.nodes[edge.fromId];
            var toNode = network.body.nodes[edge.toId];

            var fromPos = network.canvasToDOM({ x: fromNode.x, y: fromNode.y });
            var toPos = network.canvasToDOM({ x: toNode.x, y: toNode.y });

            // Apply scale to edge properties
            var fromRadius = (fromNode?.options?.size || 12) * scale;
            var toRadius = (toNode?.options?.size || 12) * scale;
            var dashes = edge?.options?.dashes;
            var color = edge?.options?.color?.color;
            var width = (edge?.options?.width || 1) * scale;

            if (Object.keys(edge.options.smooth).length > 0) {
                var curvature = edge?.options?.smooth?.roundness;
            } else {
                var curvature = 0;
            }
            var label = edge?.options?.label;
            var fontSize = edge?.options?.font?.size ? parseInt(edge?.options?.font?.size) * scale + "px" : 12 * scale + "px";

            SVGdrawing.drawEdgeBetweenNodes(svgNS, svg, fromPos, toPos, fromRadius, toRadius, edge?.id, dashes, color, width, curvature, label, fontSize);
        });

        document.body.appendChild(svg);
        self.adjustSVGViewBox(svg);

        var svgData = new XMLSerializer().serializeToString(svg);
        var blob = new Blob([svgData], { type: "image/svg+xml" });
        var link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "graph.svg";
        link.click();
        //document.body.removeChild(link);
        document.body.removeChild(svg);
    };
    /**
     * Transforms coordinates from network space to canvas space.
     *
     * @function
     * @name transformCoordinates
     * @memberof SVGexport2
     * @param {Object} network - The vis.js network instance.
     * @param {CanvasRenderingContext2D} ctx - The canvas context.
     * @param {number} x - The x coordinate to transform.
     * @param {number} y - The y coordinate to transform.
     * @returns {Object} An object containing the transformed x and y coordinates.
     */
    self.transformCoordinates = function (network, ctx, x, y) {
        var transform = {};
        transform.scale = network.getScale();
        transform.position = network.getViewPosition();
        var newX = (x - transform.position.x) * transform.scale + ctx.canvas.width / 2;
        var newY = (y - transform.position.y) * transform.scale + ctx.canvas.height / 2;

        return { x: newX, y: newY };
    };

    /**
     * Adjusts the SVG viewBox to ensure all elements are visible with proper margins.
     *
     * @function
     * @name adjustSVGViewBox
     * @memberof SVGexport2
     * @param {SVGElement} svg - The SVG element to adjust.
     */
    self.adjustSVGViewBox =function (svg) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        
        svg.childNodes.forEach(el => {
            if (el.tagName === "circle" || el.tagName === "text") {
                let cx = parseFloat(el.getAttribute("cx") || el.getAttribute("x"));
                let cy = parseFloat(el.getAttribute("cy") || el.getAttribute("y"));
                let r = parseFloat(el.getAttribute("r") || 0);
                minX = Math.min(minX, cx - r);
                minY = Math.min(minY, cy - r);
                maxX = Math.max(maxX, cx + r);
                maxY = Math.max(maxY, cy + r);
            } else if (el.tagName === "line") {
                let x1 = parseFloat(el.getAttribute("x1"));
                let y1 = parseFloat(el.getAttribute("y1"));
                let x2 = parseFloat(el.getAttribute("x2"));
                let y2 = parseFloat(el.getAttribute("y2"));
                minX = Math.min(minX, x1, x2);
                minY = Math.min(minY, y1, y2);
                maxX = Math.max(maxX, x1, x2);
                maxY = Math.max(maxY, y1, y2);
            }
        });

        
        let margin = 20;
        minX -= margin;
        minY -= margin;
        maxX += margin;
        maxY += margin;

        
        let width = maxX - minX;
        let height = maxY - minY;
        svg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
    }   

    return self;
})();

export default SVGexport2;

window.SVGexport = SVGexport2;

