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
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        Object.values(network.body.nodes).forEach((node) => {
            if (!node.options || String(node.options.id).includes("edge")) return;
            if (node.x === undefined || node.y === undefined) return;

            // Use canvas coordinates directly for viewport-independent export
            var position = { x: node.x, y: node.y };
            var shape = node.options.shape || "circle";
            var size = node.options.size || 10;
            var fillColor = (node.options.color && node.options.color.background) || "#97C2FC";
            var borderColor = (node.options.color && node.options.color.border) || "#2B7CE9";

            var nodeForDrawing = {
                options: {
                    id: node.options.id,
                    shape: shape,
                    size: size,
                },
            };

            if (node.shape) {
                nodeForDrawing.shape = {};
                if (node.shape.width) nodeForDrawing.shape.width = node.shape.width;
                if (node.shape.height) nodeForDrawing.shape.height = node.shape.height;
            }

            var element = SVGdrawing.drawShape(svgNS, position, nodeForDrawing);
            element.setAttribute("fill", fillColor);
            element.setAttribute("stroke", borderColor);
            element.setAttribute("stroke-width", "1");
            svg.appendChild(element);

            if (node.options.label) {
                var fontSize;
                if (node.options.font && node.options.font.size) {
                    fontSize = parseInt(node.options.font.size) + "px";
                } else {
                    fontSize = "12px";
                }
                // For shapes where text renders outside (dot/circle), put label below
                var textPos = { x: position.x, y: position.y };
                if (shape !== "box" && shape !== "ellipse") {
                    textPos = { x: position.x, y: position.y + size + 5 };
                }
                var text = SVGdrawing.drawText(svgNS, textPos, node.options.label, fontSize);
                svg.appendChild(text);
            }
        });

        Object.values(network.body.edges).forEach((edge) => {
            var fromNode = network.body.nodes[edge.fromId];
            var toNode = network.body.nodes[edge.toId];
            if (!fromNode || !toNode) return;
            if (fromNode.x === undefined || toNode.x === undefined) return;

            var fromPos = { x: fromNode.x, y: fromNode.y };
            var toPos = { x: toNode.x, y: toNode.y };

            // Use box half-width as radius for box-shaped nodes, otherwise use size
            var fromRadius = fromNode.shape && fromNode.shape.width ? fromNode.shape.width / 2 : fromNode?.options?.size || 12;
            var toRadius = toNode.shape && toNode.shape.width ? toNode.shape.width / 2 : toNode?.options?.size || 12;

            var dashes = edge?.options?.dashes;
            var color = edge?.options?.color?.color || edge?.options?.color?.inherit || "black";
            var width = edge?.options?.width || 1;
            var curvature = edge?.options?.smooth && Object.keys(edge.options.smooth).length > 0 ? edge?.options?.smooth?.roundness || 0 : 0;
            var label = edge?.options?.label;
            var fontSize = edge?.options?.font?.size ? parseInt(edge?.options?.font?.size) + "px" : "12px";

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
    self.adjustSVGViewBox = function (svg) {
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        function expand(x, y, padX, padY) {
            padX = padX || 0;
            padY = padY !== undefined ? padY : padX;
            if (isNaN(x) || isNaN(y)) return;
            minX = Math.min(minX, x - padX);
            minY = Math.min(minY, y - padY);
            maxX = Math.max(maxX, x + padX);
            maxY = Math.max(maxY, y + padY);
        }

        svg.childNodes.forEach((el) => {
            switch (el.tagName) {
                case "circle": {
                    let r = parseFloat(el.getAttribute("r") || 0);
                    expand(parseFloat(el.getAttribute("cx")), parseFloat(el.getAttribute("cy")), r);
                    break;
                }
                case "ellipse": {
                    let cx = parseFloat(el.getAttribute("cx"));
                    let cy = parseFloat(el.getAttribute("cy"));
                    let rx = parseFloat(el.getAttribute("rx") || 0);
                    let ry = parseFloat(el.getAttribute("ry") || 0);
                    expand(cx - rx, cy - ry);
                    expand(cx + rx, cy + ry);
                    break;
                }
                case "rect": {
                    let x = parseFloat(el.getAttribute("x"));
                    let y = parseFloat(el.getAttribute("y"));
                    let w = parseFloat(el.getAttribute("width") || 0);
                    let h = parseFloat(el.getAttribute("height") || 0);
                    expand(x, y);
                    expand(x + w, y + h);
                    break;
                }
                case "polygon": {
                    let pts = (el.getAttribute("points") || "").trim().split(/\s+/);
                    pts.forEach((p) => {
                        let parts = p.split(",");
                        if (parts.length === 2) expand(parseFloat(parts[0]), parseFloat(parts[1]));
                    });
                    break;
                }
                case "text": {
                    expand(parseFloat(el.getAttribute("x")), parseFloat(el.getAttribute("y")), 5, 12);
                    break;
                }
                case "path": {
                    let d = el.getAttribute("d") || "";
                    let nums = d.match(/-?\d+\.?\d*/g);
                    if (nums) {
                        for (let i = 0; i + 1 < nums.length; i += 2) {
                            expand(parseFloat(nums[i]), parseFloat(nums[i + 1]));
                        }
                    }
                    break;
                }
            }
        });

        if (minX === Infinity) return;

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
    };

    return self;
})();

export default SVGexport2;

window.SVGexport = SVGexport2;
