var SVGdrawing = (function () {
    self = {};

    /**
     * Draws a rectangular box on the SVG canvas.
     *
     * @function
     * @name drawBox
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {Object} position - The position of the box.
     * @param {number} position.x - The x-coordinate of the box.
     * @param {number} position.y - The y-coordinate of the box.
     * @param {number} size - The size of the box.
     * @returns {SVGRectElement} The created rectangle element.
     */
    self.drawBox = function (svgNS, position, height, width) {
        let element = document.createElementNS(svgNS, "rect");
        element.setAttribute("x", position.x - width / 2);
        element.setAttribute("y", position.y - height / 2);

        element.setAttribute("width", width);
        element.setAttribute("height", height);

        return element;
    };

    /**
     * Draws an ellipse on the SVG canvas.
     *
     * @function
     * @name drawEllipse
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {Object} position - The position of the ellipse.
     * @param {number} position.x - The x-coordinate of the ellipse.
     * @param {number} position.y - The y-coordinate of the ellipse.
     * @param {number} size - The size of the ellipse.
     * @returns {SVGEllipseElement} The created ellipse element.
     */
    self.drawEllipse = function (svgNS, position, size) {
        let element = document.createElementNS(svgNS, "ellipse");
        element.setAttribute("cx", position.x);
        element.setAttribute("cy", position.y);
        element.setAttribute("rx", size * 1.2);
        element.setAttribute("ry", size);

        return element;
    };

    /**
     * Draws a diamond shape on the SVG canvas.
     *
     * @function
     * @name drawDiamond
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {Object} position - The position of the diamond.
     * @param {number} position.x - The x-coordinate of the diamond.
     * @param {number} position.y - The y-coordinate of the diamond.
     * @param {number} size - The size of the diamond.
     * @returns {SVGPolygonElement} The created diamond element.
     */
    self.drawDiamond = function (svgNS, position, size) {
        let element = document.createElementNS(svgNS, "polygon");
        let diamondPoints = [`${position.x},${position.y - size}`, `${position.x + size},${position.y}`, `${position.x},${position.y + size}`, `${position.x - size},${position.y}`].join(" ");
        element.setAttribute("points", diamondPoints);

        return element;
    };

    /**
     * Draws a triangle on the SVG canvas.
     *
     * @function
     * @name drawTriangle
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {Object} position - The position of the triangle.
     * @param {number} position.x - The x-coordinate of the triangle.
     * @param {number} position.y - The y-coordinate of the triangle.
     * @param {number} size - The size of the triangle.
     * @returns {SVGPolygonElement} The created triangle element.
     */
    self.drawTriangle = function (svgNS, position, size) {
        let element = document.createElementNS(svgNS, "polygon");
        let trianglePoints = [`${position.x},${position.y - size}`, `${position.x - size},${position.y + size}`, `${position.x + size},${position.y + size}`].join(" ");
        element.setAttribute("points", trianglePoints);

        return element;
    };

    /**
     * Draws a circle on the SVG canvas.
     *
     * @function
     * @name drawCircle
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {Object} position - The position of the circle.
     * @param {number} position.x - The x-coordinate of the circle.
     * @param {number} position.y - The y-coordinate of the circle.
     * @param {number} size - The radius of the circle.
     * @returns {SVGCircleElement} The created circle element.
     */
    self.drawCircle = function (svgNS, position, size) {
        let element = document.createElementNS(svgNS, "circle");
        element.setAttribute("cx", position.x);
        element.setAttribute("cy", position.y);
        element.setAttribute("r", size);

        return element;
    };

    self.drawShape = function (svgNS, position, node) {
        let element;
        var shape = node.options.shape || "circle";
        var size = node.options.size || 12;

        switch (shape) {
            case "box":
                var height = node.shape.height || node.options.size || 12;
                var width = node.shape.width || node.options.size || 12;
                element = self.drawBox(svgNS, position, height, width);
                break;
            case "ellipse":
                element = self.drawEllipse(svgNS, position, size);
                break;
            case "diamond":
                element = self.drawDiamond(svgNS, position, size);
                break;
            case "triangle":
                element = self.drawTriangle(svgNS, position, size);
                break;
            default:
                element = self.drawCircle(svgNS, position, size);
                break;
        }
        return element;
    };

    /**
     * Draws a text element on the SVG canvas.
     *
     * @function
     * @name drawText
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {Object} position - The position of the text.
     * @param {number} position.x - The x-coordinate of the text.
     * @param {number} position.y - The y-coordinate of the text.
     * @param {string} text - The text content to display.
     * @param {string} fontSize - The font size of the text.
     * @returns {SVGTextElement} The created text element.
     */
    self.drawText = function (svgNS, position, text, fontSize) {
        let element = document.createElementNS(svgNS, "text");
        element.setAttribute("x", position.x);
        element.setAttribute("y", position.y);
        element.setAttribute("font-size", fontSize);
        element.setAttribute("fill", "black");
        element.setAttribute("text-anchor", "middle");
        element.setAttribute("dominant-baseline", "middle");
        element.textContent = text;

        return element;
    };

    /**
     * Draws an edge between two nodes on the SVG canvas.
     *
     * @function
     * @name drawEdgeBetweenNodes
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {SVGElement} svg - The parent SVG element.
     * @param {Object} fromPos - The starting position.
     * @param {Object} toPos - The ending position.
     * @param {number} fromRadius - The radius of the starting node.
     * @param {number} toRadius - The radius of the ending node.
     * @param {string} edgeId - The unique identifier for the edge.
     * @param {boolean} dashes - Whether the edge should be dashed.
     * @param {string} color - The color of the edge.
     * @param {string|number} width - The width of the edge.
     * @param {number} curvature - The curvature degree of the edge.
     * @param {string} label - The text to display on the edge.
     * @param {string} fontSize - The font size of the label.
     * @returns {SVGPathElement} The created path element.
     */
    self.drawEdgeBetweenNodes = function (svgNS, svg, fromPos, toPos, fromRadius, toRadius, edgeId, dashes, color, width, curvature, label, fontSize) {
        var newFromPos = {};
        var newToPos = {};
        var lineX = toPos.x - fromPos.x;
        var lineY = toPos.y - fromPos.y;

        var angle = Math.atan2(lineY, lineX);

        // draw Edge draw line between two circle nodes, so you need to adjust the position with trygonometry to start line from the node border and not from the center of the node
        newFromPos.x = fromPos.x + Math.cos(angle) * fromRadius;
        newFromPos.y = fromPos.y + Math.sin(angle) * fromRadius;
        newToPos.x = toPos.x - Math.cos(angle) * toRadius;
        newToPos.y = toPos.y - Math.sin(angle) * toRadius;

        //edge roundness
        if (!curvature) {
            //* (index % 2 === 0 ? 1 : -1)
            var curvature = 0; // alternate the direction of the curves to space them out
        }
        var midX = (newFromPos.x + newToPos.x) / 2 + curvature * (newToPos.y - newFromPos.y);
        var midY = (newFromPos.y + newToPos.y) / 2 - curvature * (newToPos.x - newFromPos.x);

        var element = document.createElementNS(svgNS, "path");
        if (curvature > 0) {
            // Bezier curve
            element.setAttribute("d", `M ${newFromPos.x},${newFromPos.y} Q ${midX},${midY} ${newToPos.x},${newToPos.y}`);
        } else {
            // Straight line
            element.setAttribute("d", `M ${newFromPos.x},${newFromPos.y} L ${newToPos.x},${newToPos.y}`);
        }
        //element.setAttribute("d", `M ${newFromPos.x},${newFromPos.y} Q ${midX},${midY} ${newToPos.x},${newToPos.y}`);
        element.setAttribute("stroke", color || "black");
        element.setAttribute("fill", "none");
        element.setAttribute("stroke-width", width || "2");
        element.setAttribute("stroke-dasharray", dashes ? "5,5" : "");
        svg.appendChild(element);

        self.drawArrowhead(svgNS, svg, element, edgeId, color); // Add arrowhead to the path

        if (label) {
            var text = document.createElementNS(svgNS, "text");
            //(index % 2 === 0 ? -10 : 10);
            var labelOffset = 10; // Alterne la position pour éviter chevauchement
            var text = SVGdrawing.drawText(svgNS, { x: midX, y: midY + labelOffset }, label, fontSize || "12px");
            svg.appendChild(text);
        }

        return element;
    };

    /**
     * Draws an arrowhead for an edge on the SVG canvas.
     *
     * @function
     * @name drawArrowhead
     * @memberof svgNSdrawing
     * @param {string} svgNS - The SVG namespace.
     * @param {SVGElement} svg - The parent SVG element.
     * @param {SVGPathElement} line - The path element of the edge.
     * @param {string} edgeId - The unique identifier for the edge.
     * @param {string} color - The color of the arrowhead.
     */
    self.drawArrowhead = function (svgNS, svg, line, edgeId, color) {
        var markerId = "arrow-" + edgeId;

        var defs = svg.querySelector("defs") || document.createElementNS(svgNS, "defs");
        if (!svg.contains(defs)) svg.appendChild(defs);

        var marker = document.createElementNS(svgNS, "marker");
        marker.setAttribute("id", markerId);
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "10");
        marker.setAttribute("refX", "9");
        marker.setAttribute("refY", "3");
        marker.setAttribute("orient", "auto");
        marker.setAttribute("markerUnits", "strokeWidth");

        var arrow = document.createElementNS(svgNS, "path");
        arrow.setAttribute("d", "M0,0 L9,3 L0,6 Z");
        arrow.setAttribute("fill", color || "black");
        marker.appendChild(arrow);
        defs.appendChild(marker);
        line.setAttribute("marker-end", `url(#${markerId})`);
    };
    return self;
})();

export default SVGdrawing;

window.SVGdrawing = SVGdrawing;
