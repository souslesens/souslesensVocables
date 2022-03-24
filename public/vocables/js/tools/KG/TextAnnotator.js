var TextAnnotator = (function () {
    var self = {};

    self.currentTextSelection = null;
    self.Selector = {};

    self.init = function () {
        self.Selector.getSelected = function () {
            var t = "";
            if (window.getSelection) {
                t = window.getSelection();
            } else if (document.getSelection) {
                t = document.getSelection();
            } else if (document.selection) {
                t = document.selection.createRange().text;
            }
            return t;
        };

        var html = "<div id='KGmappings_annotatorDiv'style='width: 100%; height:300px;overflow: auto'></div>";
        $("#KGmappings_dataSampleDiv").html(html);

        setTimeout(function () {
            var text =
                "Over-range protection shall be provided for pressure instruments, pilots, gauges, etc. that may be subject to pressures that could damage or change the calibration of the instrument.\n" +
                "    Instruments shall be equipped with pulsation dampeners when required by process conditions (e.g. pulsating service), capable of being adjusted while instruments are pressurized.\n" +
                "    All pressure instruments connections shall be installed with a block and bleed valve assembly.\n" +
                "    This assembly complements the process isolation valve (block, block & bleed or double block & bleed) installed by Piping discipline (refer to GS EP PVV 102).\n" +
                "    It shall be of AISI 316 or 316L stainless steel material at the minimum, including the trim.\n" +
                "    Where capillaries are not used, differential pressure transmitters shall be provided with a 316 or 316L stainless steel close coupled 5-valve manifold.\n" +
                "    This requirement also applies to differential pressure transmitters used in flow or level measurement applications.";

            $("#KGmappings_annotatorDiv").html(text);
            $("#KGmappings_annotatorDiv").bind("mouseup", function (event) {
                //if()
                self.currentTextSelection = self.Selector.getSelected();
                TextAnnotator.isAnnotatingText = true;
                if (event.ctrlKey) {
                    var text = self.currentTextSelection.toString();
                    $("#GenericTools_searchAllSourcesTermInput").val(text);
                    $("#GenericTools_allExactMatchSearchCBX").removeAttr("checked");
                    SourceBrowser.searchAllSourcesTerm();
                }

                //   alert(mytext);
            });
        }, 500);
    };

    self.setAnnotation = function (ontologyNode) {
        var color;
        if (ontologyNode.jstreeDiv == "KGmappings_OneModelTree") color = "lightgreen";
        else if (ontologyNode.jstreeDiv == "KGmappingsjsOtherOntologiesTreeDiv") color = "lightblue";
        else if (ontologyNode.jstreeDiv == "KGmappingPropertiesTree") color = "orange";

        var uri = ontologyNode.data.id;
        var label = ontologyNode.data.label;
        var range = document.createRange();
        const newParent = document.createElement("a");
        newParent.setAttribute("href", uri);
        newParent.setAttribute("style", "font-weight:bold;background-color:" + color + "");
        newParent.setAttribute("title", label);

        newParent.setAttribute("id", "xxxx");
        var xx = self.Selector.getSelected();
        var range = xx.getRangeAt(0);

        range.surroundContents(newParent);
        self.Selector.getSelected().empty();
        TextAnnotator.isAnnotatingText = false;
    };

    return self;
})();
