var Import=(function(){

 var self={}


 self.showImportNodesDialog=function() {
$("#graphDiv").load("snippets/blender/import.html")

 }

  self.importNodes=function(){
   var parentNode,treeDivId,type,predicate;
   if (Blender.currentTab == 0) {
    parentNode = Blender.currentTreeNode
    type="http://www.w3.org/2004/02/skos/core#Concept"
    predicate="http://www.w3.org/2004/02/skos/core#broader"
    treeDivId = "Blender_conceptTreeDiv"
   }
   else if (Blender.currentTab == 1) {
    parentNode = Collection.currentTreeNode
    treeDivId = "Blender_collectionTreeDiv"
    type="http://www.w3.org/2004/02/skos/core#Collection"
    predicate="http://www.w3.org/2004/02/skos/core#member"
   }

   var lang=$("#import_langInput").val();
   var str=$("#Import_TextArea").val();
   if(str=="")
    return MainController.UI.message("no data to import")
   str=str.replace(/\r/g,"");

   var words=str.split("\n");

   var triples=[]

   var words2=[]
   words.forEach(function(word){
    var newNodeId=common.getNewUri(Blender.currentSource)
    word=Sparql_generic.formatString(word.trim())
    if(!word)
     return;

    words2.push({id:newNodeId,label:word,type:type})
    triples. push({subject:parentNode.id,predicate:predicate,object:newNodeId, valueType:"uri"})
    triples. push({subject:newNodeId,predicate:"http://www.w3.org/1999/02/22-rdf-syntax-ns#type",object:type, valueType:"uri"})
    var labelTriple={subject:newNodeId,predicate:"http://www.w3.org/2004/02/skos/core#prefLabel",object:word, valueType:"literal"}
    if(lang!="")
     labelTriple.lang=lang
    triples. push(labelTriple)

   })

   Sparql_generic.insertTriples(Blender.currentSource,triples,function(err,result){
    if(err)
     return $("#Import_MessageDiv").html(err)
    $("#Import_MessageDiv").html("imported "+words.length+" new nodes")


    var  jsTreeData= [];
    words2.forEach(function(item){

    jsTreeData.push({
     id: item.id,
     text: item.label,
     parent:parentNode,
     data: {type: item.type}
    })
    })

     common.addNodesToJstree(treeDivId, parentNode, jsTreeData, {})

   })
   self.clearImportNodesDialog()







  },

  self.clearImportNodesDialog=function(){
 $("#graphDiv").html("")


  }




 return self;



})()
