import BotEngineClass from "./_botEngineClass.js";
import MappingColumnsGraph from "../tools/mappingModeler/mappingColumnsGraph.js";

var Lookups_bot = (function () {
    var self = {};
    var self = {};
    self.myBotEngine = new BotEngineClass();

    self.start = function (workflow, _params, callbackFn) {
        self.title = _params.title || "LookUps Bot";
        var startParams = self.myBotEngine.fillStartParams(arguments);
        self.callbackFn = callbackFn;
        if (!workflow) {
            workflow = self.workflow;
        }
        self.myBotEngine.init(Lookups_bot, workflow, null, function () {
            self.myBotEngine.startParams = startParams;
            self.params = {};
            if (_params) {
                for (var key in _params) {
                    self.params[key] = _params[key];
                }
            }
            self.myBotEngine.nextStep();
        });
    };

    self.lookUpWorkflow = {
        startFn: {
            SetLookupName: {
                SetDataSource: {
                    SetDataTable: {
                        SetLookUpSourceColumn: {
                            SetLookUpTargetColumn: {
                                SetLookUpTargetMapping: {
                                    SetLookUpTransform: {
                                        SaveLookUp: {},
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    self.functionTitles = {
        startFn: "Start LookUp bot ",
        //SetLookupName: "Type a Name for the LookUp",
        //SetFileName: "Select File ",
        //SetLookUpSourceColumn: "Select Source Column ",
        SetDataSource: "Select DataSource",
        SetDataTable: "Select DataTable",
        SetLookUpSourceColumn: "Select Source Column for the LookUp",
        SetLookUpTargetColumn: "Select Target Column for the LookUp",
        SetLookUpTransform: "Add Transform For the lookUp",
    };
    self.getChoosenTableColumns = function () {
        if (self.myBotEngine.currentBot.params.fileName && DataSourceManager.currentConfig.currentDataSource.tables) {
            return DataSourceManager.currentConfig.currentDataSource.tables[self.myBotEngine.currentBot.params.fileName];
        } else {
            return null;
        }
    };
    self.getAllDataSources = function () {
        var dataSources = [];
        // mapped Tables only because too much tables and need to open all databases

        var csvSources = Object.keys(DataSourceManager.currentConfig.csvSources);
        var databasesSources = Object.keys(DataSourceManager.currentConfig.databaseSources);
        for (var i = 0; i < csvSources.length; i++) {
            dataSources.push({ id: csvSources[i], label: csvSources[i], type: "csvSource" });
        }
        for (var i = 0; i < databasesSources.length; i++) {
            dataSources.push({ id: databasesSources[i], label: DataSourceManager.currentConfig.databaseSources[databasesSources[i]]?.name, type: "databaseSource" });
        }
        self.dataSources = dataSources.reduce((acc, item) => {
            acc[item.label] = item;
            return acc;
        }, {});
        return dataSources;
    };
    self.functions = {
        startFn: function () {
            self.myBotEngine.nextStep();
        },
        SetLookupName: function () {
            // remplir avec le nom du mapping
            self.myBotEngine.currentBot.params["name"] = DataSourceManager.currentConfig.currentDataSource.currentTable + "|" + MappingColumnsGraph.currentGraphNode.label;

            //_botEngine.promptValue("Set up lookupName" , "resourceLabel");

            self.myBotEngine.nextStep();
        },
        /*
        SetFileName: function () {
            // 

            //self.myBotEngine.currentBot.params['fileName']=DataSourceManager.currentConfig.currentDataSource.currentTable;
            self.myBotEngine.currentBot.params['type']=DataSourceManager.currentConfig.currentDataSource.type;
            //can be in other file/dataTable 
            var tables = self.getAllDataSources();
            _botEngine.showList(tables, "fileName");
            //_botEngine.nextStep();
            
        },*/
        SetDataSource: function () {
            //_botEngine.currentBot.params['type']=DataSourceManager.currentConfig.currentDataSource.type;
            //store currentDataSource because changed to get columns
            self.currentDataSource = JSON.parse(JSON.stringify(DataSourceManager.currentConfig.currentDataSource));
            //can be in other file/dataTable
            var tables = self.getAllDataSources();
            self.myBotEngine.showList(tables, "dataSource");
        },
        SetDataTable: function () {
            if (self.dataSources[self.myBotEngine.currentBot.params?.dataSource].type == "csvSource") {
                self.myBotEngine.currentBot.params["fileName"] = self.myBotEngine.currentBot.params.dataSource;
                // initCsvSource
                DataSourceManager.loadCsvSource(DataSourceManager.currentSlsvSource, self.myBotEngine.currentBot.params.dataSource, false, function (err, columns) {
                    if (err) {
                        return err;
                    } else {
                        self.myBotEngine.nextStep();
                    }
                });
            } else {
                // InitDatabaseSource
                DataSourceManager.loadDatabaseSource(DataSourceManager.currentDatabaseSource, self.myBotEngine.currentBot.params.dataSource, false, function (err, tables) {
                    self.myBotEngine.showList(tables, "fileName");
                });
            }
        },
        SetLookUpSourceColumn: function () {
            // the source column is the source that we used to launch lookup bot
            var columns = Lookups_bot.getChoosenTableColumns();
            self.myBotEngine.showList(columns, "sourceColumn");
            /*if(MappingColumnsGraph?.currentGraphNode?.label){
                self.myBotEngine.currentBot.params['sourceColumn']=MappingColumnsGraph.currentGraphNode.label;
                self.myBotEngine.nextStep();
            }*/
        },
        SetLookUpTargetColumn: function () {
            // to choose
            var columns = Lookups_bot.getChoosenTableColumns();
            self.myBotEngine.showList(columns, "targetColumn");
        },
        SetLookUpTransform: function () {
            // see after
            self.myBotEngine.nextStep();
        },
        SetLookUpTargetMapping: function () {
            var choices = ["subject", "object", "both"];
            self.myBotEngine.showList(choices, "targetMapping");
        },
        SaveLookUp: function () {
            var lookup = {
                name: self.myBotEngine.currentBot.params.name,
                fileName: self.myBotEngine.currentBot.params.fileName,
                sourceColumn: self.myBotEngine.currentBot.params.sourceColumn,
                targetColumn: self.myBotEngine.currentBot.params.targetColumn,
                transformFn: self.myBotEngine.currentBot.params.transformFn,
                targetMapping: self.myBotEngine.currentBot.params.targetMapping,
                dataSource: self.myBotEngine.currentBot.params.dataSource,
                type: self.dataSources[self.myBotEngine.currentBot.params.dataSource].type,
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
            DataSourceManager.rawConfig.lookups[lookup.name] = lookup;
            // restore currentDataSource
            DataSourceManager.currentConfig.currentDataSource = self.currentDataSource;
            MappingColumnsGraph.saveVisjsGraph(function (err, result) {
                if (err) {
                    return MainController.errorAlert(err);
                }
                self.myBotEngine.nextStep();
                if (MappingsDetails.afterSaveColumnTechnicalMappingsDialog) {
                    MappingsDetails.afterSaveColumnTechnicalMappingsDialog();
                }
            });
        },
    };

    return self;
})();

export default Lookups_bot;
window.Lookups_bot = Lookups_bot;
