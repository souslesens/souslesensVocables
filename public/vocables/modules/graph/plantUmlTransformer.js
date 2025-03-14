var PlantUmlTransformer=(function(){

    var self={ }

    self.visjsDataToClassDiagram=function(visjsData){
        if(!visjsData){
            visjsData={nodes:Lineage_whiteboard.lineageVisjsGraph.data.nodes.get(),
                edges:Lineage_whiteboard.lineageVisjsGraph.data.edges.get()}


        }
        var nodesMap={}
        visjsData.nodes.forEach(function(node){
            nodesMap[node.id]=node

        })


var str="@startuml\r\n"

        visjsData.edges.forEach(function(edge){
          var nodeTo=nodesMap[edge.to].label.replace(/[ -\(\)]/g,"_")
            var nodeFrom=nodesMap[edge.from].label.replace(/[ -\(\)]/g,"_")
           str+=nodeTo+" <|-- "+nodeFrom+"\r\n"


        })
         str+="@enduml"

        console.log(str)
    }

    return self;

})()

export default PlantUmlTransformer

window.PlantUmlTransformer=PlantUmlTransformer