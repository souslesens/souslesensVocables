import BotEngine from "./botEngine.js";
import KGcreator from "../tools/KGcreator/KGcreator.js";
import OntologyModels from "../shared/ontologyModels.js";

var CommonBotFunctions=(function(){
  var self={}


  self.sortList=function(list){

    list.sort(function(a,b){
      if(a.label>b.label)
        return 1;
      if(a.label<b.label)
        return -1;
      return 0;
    })



  }
  self.listVocabsFn=function(sourceLabel,varToFill,includBasicVocabs) {
    var vocabs = [{ id: sourceLabel, label: sourceLabel }];
    var imports = Config.sources[sourceLabel].imports;
    imports.forEach(function(importSource) {
      vocabs.push({ id: importSource, label: importSource });
    });
    if(includBasicVocabs) {
      for (var key in Config.basicVocabularies) {
        vocabs.push({ id: key, label: key });
      }
    }
    BotEngine.showList(vocabs, varToFill);
  }



  self.listVocabClasses=function(vocab,varToFill,includeOwlThing) {
    OntologyModels.registerSourcesModel(vocab, function(err, result) {
      if(err)
        return alert(err.responseText)
      var classes = [];

      for (var key in Config.ontologiesVocabularyModels[vocab].classes) {
        var classId = Config.ontologiesVocabularyModels[vocab].classes[key];
        classes.push({ id: classId.id, label: classId.label });
      }
      self.sortList(classes);
      if (includeOwlThing)
        classes.splice(0,0,{ id: "owl:Thing", label: "owl:Thing" });

      BotEngine.showList(classes, varToFill);
    })
  }

  self.listVocabPropertiesFn=function(vocab,varToFill) {
    OntologyModels.registerSourcesModel(vocab, function(err, result) {
      var props = [];
      for (var key in Config.ontologiesVocabularyModels[vocab].properties) {
        var prop = Config.ontologiesVocabularyModels[vocab].properties[key];
        props.push({ id: prop.id, label: prop.label });
      }
      self.sortList(props);
      BotEngine.showList(props, varToFill);
    })
  }



  return self;


})()
export default CommonBotFunctions;
