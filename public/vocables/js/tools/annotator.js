var Annotator = (function () {

        var self = {}
        self.selectedSources;

        self.onLoaded = function () {
            var html = "<button onclick='Annotator.showActionPanel()'>OK</button>"
            $("#sourceDivControlPanelDiv").html(html)

        }

        self.onSourceSelect = function () {

        }


        self.showActionPanel = function () {
            self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked()
            $("#actionDiv").html("")
            $("#graphDiv").load("snippets/annotator.html")
            $("#accordion").accordion("option", {active: 2});

        }


        self.annotate = function () {
            var text = $("#Annotator_textArea").val();
            var sourcesLabels = self.selectedSources;
            var sources = [];
            sourcesLabels.forEach(function (label) {
                var source = Config.sources[label]
                source.name = label;
                sources.push(source)
            })
            var payload = {
                annotateLive: 1,
                text: text,
                sources: JSON.stringify(sources)
            }


            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                /* beforeSend: function(request) {
                     request.setRequestHeader('Age', '10000');
                 },*/

                success: function (data, textStatus, jqXHR) {
                    var x = data
                    self.showAnnotationResult(data)
                }

                , error: function (err) {
                    MainController.UI.message(err)
                }
            })

        }
        self.showAnnotationResult = function (data) {

            if (Object.keys(data.entities).length == 0 && data.missingNouns.length == 0) {
                $("#Annotator_AnnotationResultDiv").html("")
                return alert("no matching concepts")
            }


            var html = "<table  class='center' >"
            html += "<tr><td>&nbsp;</td>"
            var sourcesLabels = self.selectedSources;
            sourcesLabels.forEach(function (source) {
                html += "<td>" + source + "</td>"
            })


            html += "</tr>"
            for (var word in data.entities) {
                html += "<tr><td>" + word + "</td>"

                sourcesLabels.forEach(function (source) {
                    var value = "";
                    if (data.entities[word][source]) {
                        data.entities[word][source].forEach(function (entity) {

                            if (entity.source == source)

                                var id = ("AnnotatorEntity|" + source + "|" + entity.id)
                       //     console.log(id)
                            value += "<span class='Annotator_entitySpan' data-source='" + source + "' data-label='" + word + "'  data-id='" + entity.id + "' id='" + id + "'>" + "+" + "</span>"
                        })
                    }
                    html += "<td>" + value + "</td>"

                })
                html += "</tr>"
            }
            html += "</table>"

            $("#Annotator_AnnotationResultDiv").html(html)
            $(".Annotator_entitySpan").bind("click", Annotator.onNodeClick)


            var html = ""
            data.missingNouns.forEach(function (item) {
                html += "<span class='Annotator_orphanNouns' id='Annotator_noun|" + "orphan" + "|" + item + "'>" + item + "</span>"

            })
            $("#Annotator_orphanNounsDiv").html(html)
            $(".Annotator_orphanNouns").bind("click", function () {
                Clipboard.copy({type: "word", source: "none", label: $(this).html()}, $(this).attr("id"))
            })

        }

        self.onNodeClick = function (e) {
            var source = $(this).data("source")
            var label = $(this).data("label")
            var id = $(this).data("id")
            if (e.ctrlKey) {
                Clipboard.copy({type: "node", source: source, id: id, label: label}, $(this).attr("id"), e)

            } else
                self.getEntityInfo(e)
        }


        self.getEntityInfo = function (e) {

            var id = e.target.id;
            var array = id.split("|")
            var source = array[1]
            id = array[2]
            Sparql_generic.getNodeInfos(source, id, null, function (err, result) {
                if (err)
                    return MainController.UI.message(err)
                SourceEditor.showNodeInfos("Annotator_EntityDetailsDiv", "en", id, result);
            })
            Sparql_generic.getSingleNodeAllAncestors(source, id, function (err, result) {
                if (err)
                    return MainController.UI.message(err)

                var html = "Ancestors : "
                result.forEach(function (item) {
                    html += "<span class='Annotator_entityAncestorsSpan'  data-source='" + source + "' data-id='" + item.broader.value + "'  data-label='" + item.broaderLabel.value + "' id='Annotator_entity|" + source + "|" + item.broader.value + "'>" + item.broaderLabel.value + "</span>"

                })

                $("#Annotator_EntityAncestorsDiv").html(html)
                $(".Annotator_entityAncestorsSpan").bind("click", Annotator.onNodeClick)

            })

        }

        self.setTestText = function () {
            var text = "Compaction drives characteristically exhibit elevated rock compressibilities, often 10 to 50 times greater than normal. Rock compressibility is called pore volume (PV), or pore, compressibility and is expressed in units of PV change per unit PV per unit pressure change. Rock compressibility is a function of pressure. Normal compressibilities range from 3 to 8 × 10–6 psi–1 at pressures greater than approximately 1,000 psia. In contrast, elevated rock compressibilities can reach as high as 150 × 10–6 psi–1 or higher at comparable pressures. [1]\n"
                           $("#Annotator_textArea").val(text);
        }


        return self;

    }
    ()
)
