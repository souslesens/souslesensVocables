var Ontocommons = (function() {

  var self = {};
  self.init = function() {
    self.apiUrl = "/api/v1";
    var payload = {
      url: "http://data.industryportal.enit.fr/ontologies?apikey=521da659-7f0a-4961-b0d8-5e15b52fd185",
      GET: true

    };
    $.ajax({
      type: "POST",
      url: `${self.apiUrl}/httpProxy`,
      data: payload,
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        var x = data;
        var jsonArray=JSON.parse(data.result)
        self.ontologiesMap={}

        jsonArray.forEach(function(item){
          self.ontologiesMap[item.acronym]=item
        })

        var acronyms=Object.keys(self.ontologiesMap);
        acronyms.sort()
        common.fillSelectOptions("ontocommons_ontologiesSelect",acronyms,true)
      }
      , error(err) {
      }
    });

  };


  self.showOntologyInSLSV=function(ontologyId){
    var sourceUrl="http://data.industryportal.enit.fr/ontologies/"+ontologyId+"/submissions/1/download?apikey=019adb70-1d64-41b7-8f6e-8f7e5eb54942"

    self.apiUrl = "/api/v1";
    var payload = {
      importSourceFromUrl:1,
      sourceUrl:sourceUrl,
      sourceName:ontologyId,
      options: {  }

    };


    $.ajax({
      type: "POST",
      url: `${self.apiUrl}/httpProxy`,
      data: payload,
      dataType: "json",
      success: function(data, _textStatus, _jqXHR) {
        var x = data;
        var jsonArray=JSON.parse(data.result)
        self.ontologiesMap={}

        jsonArray.forEach(function(item){
          self.ontologiesMap[item.acronym]=item
        })

        var acronyms=Object.keys(self.ontologiesMap);
        acronyms.sort()
        common.fillSelectOptions("ontocommons_ontologiesSelect",acronyms,true)
      }
      , error(err) {
      }
    });

  }

  return self;
})();