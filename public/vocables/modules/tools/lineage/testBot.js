

function   listVocabsFn(){
 return ("vocab1", "vocab2")
}
function   listPropertiesFn(){
  return ("prop1", "prop2")
}
function   setPropertyFilterFn(){
  return ("filter1", "filter2")
}
function   listClassesFn(){
  return ("class1", "class2")
}


var property= [
  listVocabsFn,
  listPropertiesFn,
  function(){return ["predicate", "restriction", "source"]} ,
  setPropertyFilterFn
]





var keywordsTree = {
  OR: [
    {
      Property: [
        listVocabsFn,
        listPropertiesFn,
        function(){return ["predicate", "restriction", "source"]} ,
        setPropertyFilterFn
      ]
    },
    {
      Class: [
        listVocabsFn,
        listClassesFn,
        {
          OR: [
            { filterIndivuals: [] },
            { allIndividuals:0}


          ]
        },
        setPropertyFilterFn
      ]
    },
    {
      Selection:
        { OR: ["SelectedNode", "Whiteboard", "source"] }

    }
  ]
}


doNext=function(currentObj,keyword){

  var type= typeof currentObj;

  if(type==="object") {


  }
  if(type==="function"){
   currentResult= currentObj(currentResult)

  }


  if(Array.isArray(currentObj)){

    currentObj.forEach(function(item){
      doNext(item)



    })



  }

  if(type==="object"){
    for(var key in currentObj){
      if( key=="OR"){

      }

    }


  }







}

var currentResult=null;
doNext(property)