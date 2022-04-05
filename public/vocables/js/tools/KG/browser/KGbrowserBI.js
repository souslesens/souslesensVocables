var KGbrowserBI = (function () {
    var self = {};

    self.drawClasses = function () {
        var continousProp = true;
        var property = $("#KGbrowserQueryParams_property").val();
        var type = KGbrowser.currentJstreeNode.id;
        var existingNodes = visjsGraph.data.nodes.get();
        var typeIds = [];
        existingNodes.forEach(function (item) {
            if (item.data.type == type) {
                typeIds.push(item.id);
            }
        });

        if (continousProp) {
            var fromStr = Sparql_common.getFromStr(KGbrowser.currentSource);
            var filterStr = Sparql_common.setFilter("sub", typeIds);
            var query =
                " PREFIX  rdfs:<http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl:<http://www.w3.org/2002/07/owl#> Select  distinct ?sub ?obj  " +
                fromStr +
                "where { ?sub <" +
                property +
                "> ?obj . ?sub rdf:type <" +
                type +
                ">. " +
                filterStr +
                "} limit 10000";
            var url = Config.sources[KGbrowser.currentSource].sparql_server.url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, {}, { source: KGbrowser.currentSource }, function (err, result) {
                if (err) return MainController.UI.message(err);
                if (result.results.bindings.length > Config.KG.queryLimit) alert("Too many values found : > " + result.results.bindings.length);
                var data = [];
                result.results.bindings.forEach(function (item) {
                    //if (true) {
                    try {
                        data.push({ id: item.sub.value, val: parseFloat(item.obj.value) });
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.log(item.obj.value);
                    }
                    //}
                    // else if (item.datatype && item.datatype == "http://www.w3.org/2001/XMLSchema#float") data.push({ id: item.sub.value, val: parseFloat(item.obj.value) });
                    // else if (item.datatype && item.datatype == "http://www.w3.org/2001/XMLSchema#integer") data.push({ id: item.sub.value, val: parseInt(item.obj.value) });
                    // else return;
                });
                var nClasses = 4;

                var values = [];
                data.forEach(function (item) {
                    values.push(item.val);
                });
                var d3Scale = self.getD3Scale(values, nClasses);

                data.forEach(function (item) {
                    var color;
                    if (self.scaleType == "ordinal") {
                        color = d3Scale(item.val);
                        color = self.rgb2hex(color);
                    } else {
                        var index = Math.round(domain(data[i].highlightedProperty));
                        color = d3Scale(item.val);
                        color = self.rgb2hex(color);
                    }
                    item.color = color;
                });
                visjsGraph.data.nodes.update(data);

                // self.drawPaletteColorLegend(scale, domain, palette, nClasses,ordinalLegendMap);
            });
        }

        self.getD3Scale = function (data, nClasses) {
            var min = d3.min(data, function (d) {
                return d.value;
            });
            var max = d3.max(data, function (d) {
                return d.value;
            });

            var palette = palettes[nClasses];

            if (common.isNumber(data[0].val)) {
                self.scaleType = "linear";
                self.domain = d3.scale.linear().domain([min, max]).nice().range([0, nClasses]);
                self.scale = d3.scale.quantize().domain([min, max]).range(palette);
            } else {
                self.domain = d3.scale.ordinal().domain(data).range([0, palette.length]);
                //domain = d3.scaleOrdinal().domain(data).range([0, palette.length]);
                self.scaleType = "ordinal";
                self.scale = d3.scale.ordinal().domain(data).range(palette);
                //  scale = d3.scaleOrdinal().domain(data).range(palette);
            }
            return self.scale;
        };

        var palettes = [
            [],
            [],
            [],
            ["#fc8d59", "#ffffbf", "#91cf60"],
            ["#d7191c", "#fdae61", "#a6d96a", "#1a9641"],
            ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
            ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9850"],
            ["#d73027", "#fc8d59", "#fee08b", "#ffffbf", "#d9ef8b", "#91cf60", "#1a9850"],
            ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"],
            ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"],
            ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
            ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],
        ];
    };
    self.rgb2hex = function (rgb) {
        if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

        rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);

        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }

        return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
    };

    return self;
})();
