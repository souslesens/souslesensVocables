
var ADLbrowserCustom=(function(){

    var self= {}


        self.setAdditionalGraphPopupMenuDiv=function(){
        // set readi properties
        if(ADLbrowserGraph.currentGraphNode.data.type=="http://w3id.org/readi/rdl/D101001053"){
            var html=  "    <span  class=\"popupMenuItem\"onclick=\"ADLbrowserCustom.showREADIrestrictionsOnGraph();\">show READI restrictions </span>"
            $("#ADLbrowser_customGraphPopupMenuDiv").addClass('popupMenuItem')
            $("#ADLbrowser_customGraphPopupMenuDiv").html(html)

        }



    }

    self.showREADIrestrictionsOnGraph=function(){
        var  id=ADLbrowserGraph.currentGraphNode.data.id
var source="CFIHOS_READI"
        Sparql_OWL.getObjectRestrictions(source,id,{},function(err, result){
            if(err)
              return  MainController.UI.message(err,true)
            var visjsData = {nodes: [], edges: []}
            var existingNodes = visjsGraph.getExistingIdsMap()
            var color=Lineage_classes.restrictionColor
            result.forEach(function (item) {

                if (!item.value) {
                    item.value = {value: "?_" + item.prop.value}
                    item.valueLabel = {value: "?"}
                }
                if (!item.valueLabel) {
                    item.valueLabel = {value: "?"}
                }
                if (!existingNodes[item.value.value]) {
                    existingNodes[item.value.value] = 1;
                    visjsData.nodes.push({
                        id: item.value.value,
                        label: item.valueLabel.value,
                        shape: "square",
                        size: Lineage_classes.defaultShapeSize,
                        color: color,
                        data: {source: source,
                            id: item.value.value,
                            label: item.valueLabel.value,
                            varName:"value"
                        }
                    })

                }
                var edgeId = item.concept.value + "_" + item.value.value + "_" + item.prop.value
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.concept.value,
                        to: item.value.value,
                        label: "<i>" + item.propLabel.value + "</i>",
                        data: {propertyId: item.prop.value, source: source},
                        font: {multi: true, size: 10},
                        // font: {align: "middle", ital: {color:Lineage_classes.objectPropertyColor, mod: "italic", size: 10}},
                        //   physics:false,
                        arrows: {
                            to: {
                                enabled: true,
                                type: "bar",
                                scaleFactor: 0.5
                            },
                        },
                        dashes: true,
                        color: Lineage_classes.restrictionColor

                    })
                }

            })

            visjsGraph.data.nodes.add(visjsData.nodes)
            visjsGraph.data.edges.add(visjsData.edges)
            visjsGraph.network.fit()
            $("#waitImg").css("display", "none");

        })


    }



    return self;





})()