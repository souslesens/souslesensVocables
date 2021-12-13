var Lineage_projectedGraphs=(function(){
    var self={}


    self.getJstreeContextMenu = function () {
        // return {}
        var items = {}


        items.openGraph = {
            label: "open graph",
            action: function (e) {
                Lineage_projectedGraphs.openGraph()
            }
        }

        items.openGraph = {
            label: "open graph",
            action: function (e) {// pb avec source
                Lineage_projectedGraphs.openGraph()
            }
        }





    return items
    }


    self.initProjectedGraphs = function (callback) {
        Sparql_OWL.getGraphsByRegex(Config.sources[Lineage_classes.mainSource].graphUri, function (err, result) {
            var projectedGraphs = {}

            result.forEach(function (item) {
                if (!projectedGraphs[item.graph.value]) {
                    projectedGraphs[item.graph.value] = {}
                }
                if (!projectedGraphs[item.graph.value][item.p.value])
                    projectedGraphs[item.graph.value][item.p.value] = ""
                if(  projectedGraphs[item.graph.value][item.p.value]!="" )
                    projectedGraphs[item.graph.value][item.p.value]+=","
                projectedGraphs[item.graph.value][item.p.value]+=(item.value.value)

            })

            var jstreeData = []
            for( var key in projectedGraphs){
                var label=Sparql_common.getLabelFromURI(key.substring(0, key.length-1))
                jstreeData.push({
                    id:key,
                    text:label,
                    parent:"#",
                    data:{
                        id:key,
                        label:label,
                        type:"projectedGraph"
                    }
                })
                for( var key2 in projectedGraphs[key]){
                    var value=Sparql_common.getLabelFromURI(projectedGraphs[key][key2])
                    var label2=Sparql_common.getLabelFromURI(key2)+" : "+ value
                    jstreeData.push({
                        id:key+"_"+key2,
                        text:label2,
                        parent:key,
                        data:{
                            id:key+"_"+key2,
                            label:label2,
                            property:key2,
                            value:projectedGraphs[key][key2]
                        }
                    })
                }
            }

            var options = {}


            // common.fillSelectOptions("LineageRelations_projectedGraphsSelect", Object.keys(self.projectedGraphs), true)
        })
    }



    return self;






})()