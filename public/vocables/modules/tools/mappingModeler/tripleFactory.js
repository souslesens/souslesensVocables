import KGcreator_run from "../KGcreator/KGcreator_run.js";
import KGcreator from "../KGcreator/KGcreator.js";
import MappingTransform from "./mappingTransform.js";

var TripleFactory=(function(){

    var self={}


    self.checkCurrentTable=function(){
        if(!MappingModeler.currentTable)
            return alert ("select a table or a csv source")
    }
    self.showTripleSample=function(){
     if(!self.checkCurrentTable)
         return;

        var options={table:MappingModeler.currentTable.name}
        self.createTriples(true,MappingModeler.currentTable.name,options, function (err, result){
        } )
    }

    self.writeTriples=function(){
        if(!self.checkCurrentTable)
            return;
        var options={table:MappingModeler.currentTable.name}
        self.createTriples(false,MappingModeler.currentTable.name,options, function (err, result){
        } )

    }

    self.createAllMappingsTriples=function(){
        KGcreator_run.createAllMappingsTriples()
    }

    self.indexGraph=function(){
        KGcreator_run.indexGraph()
    }

    self.deleteTriples=function(all,callback){

        var tables = [];
        if (!all) {
            if(!self.checkCurrentTable)
                return;
            if (!confirm("Do you really want to delete  triples created with KGCreator in datasource " + KGcreator.currentConfig.currentDataSource.name)) {
                return;
            }

            tables.push(MappingModeler.currentTable.name);
        }

        var payload = {
            source: KGcreator.currentSlsvSource,
            tables: JSON.stringify(tables),
        };
        UI.message("deleting KGcreator  triples...");
        $.ajax({
            type: "DELETE",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (callback) {
                    return callback();
                }
                UI.message(result.result);
            },
            error: function (err) {
                if (callback) {
                    return callback(err);
                }
                UI.message(err.responseText);
            },
        });
    };

    self.createTriples = function (sampleData, table, options, callback) {
       var mappingsFilterOption = MappingTransform.getSLSmappingsFromVisjsGraph(table);// self.getSelectedMappingTriplesOption();



        if (!options) {
            options = {};
        }
        if (!sampleData && table!=="*") {
            if (!confirm("create triples for " + KGcreator.currentConfig.currentDataSource.name + " " + table || "")) {
                return;
            }
        }

        if (sampleData) {
            options.deleteOldGraph = false;
            options.sampleSize = 500;
        } else {
            options.deleteOldGraph = false;
        }

        if (Config.clientSocketId) {
            options.clientSocketId = Config.clientSocketId;
        }
        if ( table==="*") {
            options = {};
            table = null;
        }


        if (mappingsFilterOption) {
            options.mappingsFilter = mappingsFilterOption;
        }

        var payload = {
            source: KGcreator.currentSlsvSource,
            datasource: KGcreator.currentConfig.currentDataSource.name,
            table: table,
            options: JSON.stringify(options),
        };

        UI.message("creating triples...");
        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/kg/triples`,
            data: payload,
            dataType: "json",
            success: function (result, _textStatus, _jqXHR) {
                if (sampleData) {
                    KGcreator_run.showTriplesInDataTable(result);
                    UI.message("", true);
                } else {
                    if (options.deleteTriples) {
                        $("#KGcreator_infosDiv").val(result.result);
                        UI.message(result.result, true);
                    } else {
                        var message = result.result + " triples created in graph " + KGcreator.currentConfig.graphUri;
                        alert(message);
                        //  $("#KGcreator_infosDiv").val(result.result + " triples created in graph " + KGcreator.currentConfig.graphUri);
                        UI.message(message, true);
                    }
                }
                if (callback) {
                    return callback();
                }
            },
            error(err) {
                if (callback) {
                    return callback(err.responseText);
                }
                return alert(err.responseText);
            },
        });
    };

    self.createAllMappingsTriples = function () {

        if (!confirm("generate KGcreator triples of datasource " + KGcreator.currentConfig.currentDataSource.name + ". this  will delete all triples created with KGcreator  ")) {
            return;
        }
        //UI.openTab("lineage-tab", "KGcreator_source_tab", KGcreator.initRunTab, "#RunButton");
        $("#KGcreator_infosDiv").val("generating KGcreator triples form all mappings ");
        async.series(
            [
                //delete previous KG creator triples
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("deleting previous KGcreator triples ");
                    self.deleteTriples(true, function (err, result) {
                        return callbackSeries(err);
                    });
                },
                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("creating new triples (can take long...)");
                    self.createTriples(false, null, function (err, result) {
                        return callbackSeries(err);
                    });
                },

                function (callbackSeries) {
                    $("#KGcreator_infosDiv").val("reindexing graph)");
                    self.indexGraph(function (err, result) {
                        return callbackSeries(err);
                    });
                },
            ],
            function (err) {
                if (err) {
                    $("#KGcreator_infosDiv").val("\nALL DONE");
                }
            }
        );
    };








    return self;



})()

export default  TripleFactory
window.TripleFactory=TripleFactory