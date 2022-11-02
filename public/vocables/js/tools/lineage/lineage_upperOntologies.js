var Lineage_upperOntologies=(function(){
  
  var self={}
self.objectPropertiesMap = {};
  self.getAuthorizedProperties = function(sourceLabel, upperOntologyDomains, upperOntologyRanges, callback) {

    self.getUpperOntologyObjectPropertiesDescription(sourceLabel, false, function(err, allProps) {
      if (err) return alert(err);

      let props = {};

      var subProposMap = {};

      for (var propId in allProps) {


        var prop = allProps[propId];
        var subProps = [prop.prop].concat(prop.subProps);
        subProps.forEach(function(subPropId) {
          var item = allProps[subPropId];

          let type = "";
          let ok = false;
          if (!item.range && item.domain && (upperOntologyDomains[item.domain])) {
            type = "D";
            ok = true;
          } else if (!item.domain && item.range && (upperOntologyRanges[item.range])) {
            type = "R";
            ok = true;
          } else if (item.domain && item.range && upperOntologyDomains[item.domain] && upperOntologyRanges[item.range]) {
            type = "DR";
            ok = true;
          }else{

          }
          if (ok) {
            props[item.prop] = {
              prop: item.prop,
              label: item.propLabel,
              type: type,
              upperDomainLabel: upperOntologyDomains[item.domain],
              upperRangeLabel: upperOntologyRanges[item.range],
              upperDomain:item.domain,
              upperRange: item.range
            };
          }
        });


        if (prop.inverseProp) {
          var inverseProp = allProps[prop.inverseProp];
          if (inverseProp) {
            var subProps = [inverseProp.prop].concat(inverseProp.subProps);
            subProps.forEach(function(subPropId) {
              var inverseItem = allProps[subPropId];
              let type = "";
              let ok = false;
              if (inverseItem.range && !inverseItem.domain && (upperOntologyDomains[inverseItem.range])) {
                type = "D";
                ok = true;
              } else if (inverseItem.domain && !inverseItem.range && (upperOntologyRanges[inverseItem.domain])) {
                type = "R";
                ok = true;
              } else if (inverseItem.domain && inverseItem.range && upperOntologyDomains[inverseItem.range] && upperOntologyRanges[inverseItem.domain]) {
                type = "DR";
                ok = true;
              }
              if (ok) {
                props[inverseItem.prop] = {
                  prop: inverseItem.inverseProp,
                  label: inverseItem.inversePropLabel,
                  type: type,
                  upperDomainLabel: upperOntologyDomains[inverseItem.range],
                  upperRangeLabel: upperOntologyRanges[inverseItem.domain],
                  upperDomain:inverseItem.range,
                  upperRange: inverseItem.domain

                };

              }
            });
          }
        }


      }
      ;


      return callback(null, props);
    });
  };

  self.getUpperOntologyObjectPropertiesDescription = function(sourceLabel, reload, callback) {
    if (! Lineage_upperOntologies.objectPropertiesMap)
      Lineage_upperOntologies.objectPropertiesMap = {};

    if ( Lineage_upperOntologies.objectPropertiesMap [sourceLabel] && !reload && callback)
      return callback(null,  Lineage_upperOntologies.objectPropertiesMap [sourceLabel]);

          Sparql_OWL.getInferredPropertiesDomainsAndRanges(sourceLabel, {}, function(err, result) {
            if (err) return callback(err);








        Lineage_upperOntologies.objectPropertiesMap[sourceLabel] =result;
        if (callback)
          return callback(err, result);
      }
    );
  };

  self.getSourcePossiblePredicatesAndObject = function(source, callback) {
    var predicates = [];
    KGcreator.usualProperties.forEach(function(item) {
      predicates.push({ label: item, id: item });
    });

    Sparql_OWL.getDictionary(source, { selectGraph: true,lang :Config.default_lang }, null, function(err, result) {
      if (err) callback(err);

      var sourceObjects = [];
      var TopLevelOntologyObjects = [];
      result.forEach(function(item) {
        if (item.id.type == "bnode") return;

        if (!item.label) item.label = { value: Sparql_common.getLabelFromURI(item.id.value) };
        var prefix = "";
        if (item.g.value.indexOf(Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern) > -1) {
          prefix = Config.topLevelOntologies[Config.currentTopLevelOntology].prefix + ":";
          TopLevelOntologyObjects.push({ label: prefix + item.label.value, id: item.id.value, type: "Class" });
        } else {
          if (item.label) sourceObjects.push({ label: prefix + item.label.value, id: item.id.value, type: "Class" });
        }
      });
      sourceObjects.sort(function(a, b) {
        if (!a.label || !b.label) return 0;
        if (a.label > b.label) return 1;
        if (a.label < b.label) return -1;
        return 0;
      });

      var usualObjects = [];
      KGcreator.usualObjectClasses.forEach(function(item) {
        if (item.indexOf("_") < 0) usualObjects.push({ label: item, id: item });
      });

      var basicTypeClasses = [];
      KGcreator.basicTypeClasses.forEach(function(item) {
        basicTypeClasses.push({ label: item, id: item });
      });

      // var allObjects=usualObjects.concat(sourceObjects);
      return callback(null, {
        predicates: predicates,
        usualObjects: usualObjects,
        sourceObjects: sourceObjects,
        TopLevelOntologyObjects: TopLevelOntologyObjects,
        basicTypeClasses: basicTypeClasses
      });
    });
  };


  self.flattenPropertiesMap = function(propsMap) {
    var flatPropsMap = {};
    for (var prop in propsMap) {
      flatPropsMap[prop] = propsMap[prop];
      var propObj = propsMap[prop];

      if (propObj.inverseProp)
        flatPropsMap[propObj.inverseProp] = {
          "prop": propObj.inverseProp,
          "propLabel": propObj.inversePropLabel,
          "subProps": [],
          "domain": propObj.range,
          "domainLabel": propObj.rangeLabel,
          "range": propObj.domain,
          "rangeLabel": propObj.domainLabel,
          "inverseProp": prop,
          "inversePropLabel": propObj.propLabel
        };


    }
    return flatPropsMap;


  };
  
  return self;
})()