
import _botEngine from "./_botEngine.js";
import MappingColumnsGraph from "../tools/mappingModeler/mappingColumnsGraph.js";


var Lookups_bot = (function () {
    var self = {};
    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "LookUps Bot";
        _botEngine.startParams = _botEngine.fillStartParams(arguments);
        self.callbackFn = callbackFn;
        if (!workflow) {
            workflow = self.workflow;
        }
        _botEngine.init(Lookups_bot, workflow, null, function () {
            self.params = {};
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            _botEngine.nextStep();
        });
    }

    self.lookUpWorkflow = {
        startFn: {
            SetLookupName: {
                SetDataSource:{
                    SetDataTable:{
                        SetLookUpSourceColumn:{
                            SetLookUpTargetColumn:{
                                SetLookUpTargetMapping:{
                                    SetLookUpTransform:{
                                        SaveLookUp:{}
                                    }
                                }
                                
                            }
                        },
                    },
                },
            },
        }
    };

    self.functionTitles = {
        startFn: "Start LookUp bot ",
        //SetLookupName: "Type a Name for the LookUp",
        //SetFileName: "Select File ",
        //SetLookUpSourceColumn: "Select Source Column ",
        SetDataSource: "Select DataSource",
        SetDataTable: "Select DataTable",
        SetLookUpTargetColumn: "Select Target Column for the LookUp",
        SetLookUpTransform: "Add Transform For the lookUp",

    };
    self.getChoosenTableColumns=function(){
            
        if(_botEngine.currentBot.params.fileName && DataSourceManager.currentConfig.currentDataSource.tables){
            return DataSourceManager.currentConfig.currentDataSource.tables[_botEngine.currentBot.params.fileName];
        }
        else{
            return null;
        }
    }
    self.getAllDataSources=function(){
        var dataSources=[];
        // mapped Tables only because too much tables and need to open all databases
        
        var csvSources=Object.keys(DataSourceManager.currentConfig.csvSources);
        var databasesSources=Object.keys(DataSourceManager.currentConfig.databaseSources);
        for(var i=0;i<csvSources.length;i++){
            dataSources.push({id:csvSources[i],label:csvSources[i],type:"csvSource"});
        }
        for(var i=0;i<databasesSources.length;i++){
            dataSources.push({id:databasesSources[i],label:DataSourceManager.currentConfig.databaseSources[databasesSources[i]]?.name,type:"databaseSource"});
        }
        self.dataSources=dataSources.reduce((acc, item) => {
            
            acc[item.label] = item;
            return acc;
        }, {});
        return dataSources;
    };
    self.functions = {
        startFn:function(){
            _botEngine.nextStep();
        },
        SetLookupName: function () {
            // remplir avec le nom du mapping
             _botEngine.currentBot.params['name']=DataSourceManager.currentConfig.currentDataSource.currentTable+'_'+MappingColumnsGraph.currentGraphNode.label;

             //_botEngine.promptValue("Set up lookupName" , "resourceLabel");

             _botEngine.nextStep();
            
        },
        /*
        SetFileName: function () {
            // 

            //_botEngine.currentBot.params['fileName']=DataSourceManager.currentConfig.currentDataSource.currentTable;
            _botEngine.currentBot.params['type']=DataSourceManager.currentConfig.currentDataSource.type;
            //can be in other file/dataTable 
            var tables = self.getAllDataSources();
            _botEngine.showList(tables, "fileName");
            //_botEngine.nextStep();
            
        },*/
        SetDataSource: function () {
            //_botEngine.currentBot.params['type']=DataSourceManager.currentConfig.currentDataSource.type;
            //store currentDataSource because changed to get columns
            self.currentDataSource=JSON.parse(JSON.stringify(DataSourceManager.currentConfig.currentDataSource));
            //can be in other file/dataTable 
            var tables = self.getAllDataSources();
            _botEngine.showList(tables, "dataSource");
        },
        SetDataTable: function () {
            if(self.dataSources[_botEngine.currentBot.params?.dataSource].type=="csvSource"){
                _botEngine.currentBot.params['fileName']=_botEngine.currentBot.params.dataSource;
                // initCsvSource
                DataSourceManager.loadCsvSource(DataSourceManager.currentSlsvSource,_botEngine.currentBot.params.dataSource, false, function (err, columns) {
                    if(err){   return err }
                    else{
                        _botEngine.nextStep();
                    }
                });
            }else{
                // InitDatabaseSource
                DataSourceManager.loadDatabaseSource(DataSourceManager.currentDatabaseSource,_botEngine.currentBot.params.dataSource, false, function (err, tables) {
                    _botEngine.showList(tables, "fileName");
                });
            }

        },
        SetLookUpSourceColumn: function () { 
            // the source column is the source that we used to launch lookup bot
            var columns = Lookups_bot.getChoosenTableColumns();
            _botEngine.showList(columns, "sourceColumn");
            /*if(MappingColumnsGraph?.currentGraphNode?.label){
                _botEngine.currentBot.params['sourceColumn']=MappingColumnsGraph.currentGraphNode.label;
                _botEngine.nextStep();
            }*/
        },
        SetLookUpTargetColumn: function () { 
            // to choose
            var columns = Lookups_bot.getChoosenTableColumns();
            _botEngine.showList(columns, "targetColumn");
        },
        SetLookUpTransform: function () {
            // see after
            _botEngine.nextStep();
        },
        SetLookUpTargetMapping: function () {
            var choices=['subject','object','both'];
            _botEngine.showList(choices, "targetMapping");
        },
        SaveLookUp: function () {
            var lookup = {
                name: _botEngine.currentBot.params.name,
                fileName: _botEngine.currentBot.params.fileName,
                sourceColumn:   _botEngine.currentBot.params.sourceColumn,
                targetColumn:   _botEngine.currentBot.params.targetColumn,
                transformFn:    _botEngine.currentBot.params.transformFn,
                targetMapping:  _botEngine.currentBot.params.targetMapping,
                dataSource:     _botEngine.currentBot.params.dataSource,
                type:  self.dataSources[_botEngine.currentBot.params.dataSource].type
            };
            if (!lookup.name) {
                return alert("name is mandatory");
            }
            if (!lookup.fileName) {
                return alert("fileName is mandatory");
            }
            if (!lookup.sourceColumn) {
                return alert("sourceColumn is mandatory");
            }
            if (!lookup.targetColumn) {
                return alert("targetColumn is mandatory");
            }
            // add lookup in json graph config
            DataSourceManager.rawConfig.lookups[lookup.name]=lookup;
            // restore currentDataSource
            DataSourceManager.currentConfig.currentDataSource=self.currentDataSource;
             MappingColumnsGraph.saveVisjsGraph(function(err,result){
                if(err){
                    return alert(err);
                }
                _botEngine.nextStep();
            });
                   
                
           
         
            
        }
        
        
    }
    return self;
})();

export default Lookups_bot;
window.Lookups_bot = Lookups_bot;
