var KGpropertyFilter = (function () {
        var self = {}
        self.currentSource = "CFIHOS_1_5_PLUS"
        self.propertyFilteringSource = "TSF-PROPERTY-FILTERING"


        self.onLoaded = function () {

            Config.sources[self.propertyFilteringSource] = {
                "isDictionary": true,
                "editable": true,
                "graphUri": "http://data.total.com/resource/tsf/property-filtering/",
                "imports": [],
                "sparql_server": {
                    "url": "_default"
                },
                "controller": "Sparql_OWL",
                "schemaType": "OWL",

            };
            var graphUri = Config.sources[self.propertyFilteringSource].graphUri
            self.aspectMap = {
                "Discipline": graphUri + "appliesToDiscipline",
                "LifeCycle": graphUri + "appliesToLifeCycleStatus",
                "StakeHolder": graphUri + "appliesToStakeHolderFilter",


            }
            $("#actionDivContolPanelDiv").load("snippets/KGpropertyFilter/leftPanel.html", function () {
                self.loadClassesProperties()
            })

            $("#graphDiv").load("snippets/KGpropertyFilter/centralPanel.html", function () {
                $("#KGcreator_centralPanelTabs").tabs({
                    activate: function (e, ui) {
                        self.currentOwlType = "Class"
                        var divId = ui.newPanel.selector;
                        if (divId == "#LineageTypesTab") {

                        }
                    }
                })
                self.initCentralPanel()

            })

            $("#accordion").accordion("option", {active: 2});
        }


        self.loadClassesProperties = function () {
            var classIds = [
                "http://data.totalenergies.com/resource/ontology/cfihos_1.5/EquipmentClass/CFIHOS-30000521"]
            // classIds = null


            var options = {filter: "  FILTER (?prop=<http://standards.iso.org/iso/15926/part14/hasQuality>)"}
            Sparql_OWL.getObjectRestrictions(self.currentSource, classIds, options, function (err, result) {
                if (err) {
                    return MainController.UI.message(err.responseText)
                }

                var jstreeData = []
                var existingNodes = {}
                result.forEach(function (item) {
                    if (!existingNodes[item.concept.value]) {
                        existingNodes[item.concept.value] = 1
                        jstreeData.push({
                            id: item.concept.value,
                            text: item.conceptLabel.value,
                            parent: "#",
                            data: {
                                type: "class",
                                id: item.concept.value,
                                label: item.conceptLabel.value,
                            }
                        })
                    }

                    var id = item.concept.value + "_" + item.node.value
                    if (!existingNodes[id]) {
                        existingNodes[id] = 1
                        jstreeData.push({
                            id: id,
                            text: item.valueLabel.value,
                            parent: item.concept.value,
                            data: {
                                type: "property",
                                propId: item.value.value,
                                propLabel: item.valueLabel.value,
                                retrictionId: item.node.value
                            }
                        })
                    }


                })
                var options = {
                    openAll: true,
                    selectTreeNodeFn: KGpropertyFilter.onPropertyNodeClicked,
                    contextMenu: KGpropertyFilter.getPropertyTreeContextMenu(),

                }
                common.array.sort(jstreeData, "text")
                common.jstree.loadJsTree("KGpropertyFilter_propertiesTreeDiv", jstreeData, options)


            })

        }

        self.onPropertyNodeClicked = function (event, obj) {
            self.currentPropertyNode = obj.node
            if (self.currentPropertyNode.parents.length > 1)
                self.currentClassId = self.currentPropertyNode.parents[1]
            else
                self.currentClassId = self.currentPropertyNode.id
            $("#KGpropertyFilter_currentPropertyDiv").css("display", "block")
            $("#KGpropertyFilter_currentPropertySpan").html(obj.node.text)
            $("#KGpropertyFilter_currentPropertySpan2").html(obj.node.text)


        }
        self.getPropertyTreeContextMenu = function () {

        }

        self.getAssociatedProperties = function (selectId) {

        }


        self.associateFiltersToPropertyRestriction = function () {

            var existingNodesArray = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", true, "#")
            var existingNodes = {}
            existingNodesArray.forEach(function (item) {
                existingNodes[item] = 1
            })

            var propertyObjs = $("#KGpropertyFilter_propertiesTreeDiv").jstree().get_selected(true)
            propertyObjs.forEach(function (propertyObj) {
                if (!propertyObj || propertyObj.parents.length < 2)
                    return alert(" Select a property")
                var classId = propertyObj.parent

                function execute(filterType, selectId) {
                    var items = $("#" + selectId).val()
                    var jstreedata = []
                    var jstreedata2 = []
                    var aspectId = propertyObj.id + "_" + filterType
                    if (!existingNodes[aspectId]) {
                        existingNodes[aspectId] = 1
                        jstreedata.push({
                            id: aspectId,
                            text: filterType,
                            parent: propertyObj.id,
                            data: {
                                type: "aspect", value: filterType
                            }
                        })
                    }


                    $("#" + selectId + " option:selected").each(function () {
                        var label = $(this).text();
                        var id = $(this).val();
                        var filterId = aspectId + "_" + id
                        if (!existingNodes[filterId]) {
                            existingNodes[filterId] = 1
                            jstreedata2.push({
                                id: filterId,
                                text: label,
                                parent: aspectId,
                                data: {
                                    type: "filterClass",
                                    retrictionId: propertyObj.data.retrictionId,
                                    aspectKey: filterType,
                                    aspectClassId: id
                                }
                            })
                        }

                    })
                    if (jstreedata.length > 0)
                        common.jstree.addNodesToJstree("KGpropertyFilter_propertiesTreeDiv", propertyObj.id, jstreedata)
                    common.jstree.addNodesToJstree("KGpropertyFilter_propertiesTreeDiv", aspectId, jstreedata2)
                }


                execute("LifeCycle", "KGpropertyFilter_lifeCycleSelect")
                execute("Discipline", "KGpropertyFilter_disciplineSelect")
                execute("StakeHolder", "KGpropertyFilter_stakeHolderSelect")
            })


        }

        self.generateRestrictionFilterTriples = function () {
            var existingNodesArray = common.jstree.getjsTreeNodes("KGpropertyFilter_propertiesTreeDiv", false, "#")
            var triples = []
            existingNodesArray.forEach(function (node) {
                if (node.data.type == "filterClass") {


                    triples.push({
                        subject: node.data.retrictionId,
                        predicate: self.aspectMap[node.data.aspectKey],
                        object: node.data.aspectClassId

                    })

                }

            })

            Sparql_generic.insertTriples(self.propertyFilteringSource, triples, {getSparqlOnly: false}, function (err, result) {
                if (err)
                    return alert(err.responseText)
                MainController.UI.message(result+" filters created ")
            })


            //  existingNodesArray.

        }


        self.initCentralPanel = function () {


            self.getLifeCycleItems(function (err, result) {
                common.array.sort(result, "label")
                common.fillSelectOptions("KGpropertyFilter_lifeCycleSelect", result, true, "label", "id")
                common.fillSelectOptions("KGpropertyFilter_lifeCycleSelect2", result, true, "label", "id")
            })

            self.getDisciplines(function (err, result) {
                common.array.sort(result, "label")
                common.fillSelectOptions("KGpropertyFilter_disciplineSelect", result, true, "label", "id")
                common.fillSelectOptions("KGpropertyFilter_disciplineSelect2", result, true, "label", "id")
            })

            self.getStakeHolder(function (err, result) {
                common.array.sort(result, "label")
                common.fillSelectOptions("KGpropertyFilter_stakeHolderSelect", result, true, "label", "id")
                common.fillSelectOptions("KGpropertyFilter_stakeHolderSelect2", result, true, "label", "id")
            })


        }
        self.onSelectFilter = function () {

        }


        self.client = {

            filterProperties: function (allClasses) {
                var classId = null;
                if (!allClasses)
                    classId = self.currentClassId


                var sparql = "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                    "SELECT * from <http://data.total.com/resource/tsf/property-filtering/> from <http://data.totalenergies.com/resource/ontology/cfihos_1.5/> WHERE {\n" +
                    "  ?class rdfs:subClassOf ?restriction .\n" +
                    "  ?class rdfs:label ?classLabel.\n" +
                    "  ?restriction rdf:type owl:Restriction.\n" +
                    "  ?restriction ?aspect ?filterId.\n" +
                    " ?restriction owl:onProperty <http://standards.iso.org/iso/15926/part14/hasQuality>.\n" +
                    " ?restriction owl:someValuesFrom ?property.\n" +
                    "   ?property rdfs:label ?propertyLabel.\n"

                if (classId)
                    sparql += "   filter (?class=<" + classId + ">)"

                function addFilters(aspect, selectId) {
                    var filterId = $("#" + selectId).val();
                    if(!filterId)
                        return;
                    var predicate = self.aspectMap[aspect]
                    sparql += " filter ( ?aspect=<" + predicate + "> &&  ?filterId=<" + filterId + ">  )"


                }

                addFilters("LifeCycle", "KGpropertyFilter_lifeCycleSelect2")
                addFilters("Discipline", "KGpropertyFilter_disciplineSelect2")
                addFilters("StakeHolder", "KGpropertyFilter_stakeHolderSelect2")

                sparql +="} limit 10000"
                var url = Config.sources[self.currentSource].sparql_server.url + "?format=json&query=";
                Sparql_proxy.querySPARQL_GET_proxy(url, sparql, "", {source: self.currentSource}, function (err, result) {


                    if (err) {
                        return callback(err)
                    }

                    var columns=[
                        {title: "Class", defaultContent: ""},
                        {title: "Property", defaultContent: ""},
                        {title: "ClassUri", defaultContent: ""},
                        {title: "PropertyUri", defaultContent: ""},

                    ]
                    var dataset=[]
                    result.results.bindings.forEach(function(item){
                        dataset.push([
                            item.classLabel.value,
                            item.propertyLabel.value,
                            item.class.value,
                            item.property.value,


                        ])


                    })
                    Export.showDataTable("KGpropertyFilter_filteringResult", columns,dataset)
                })
            }


        }


        self.getLifeCycleItems = function (callback) {
            var json = [{
                "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226941"},
                "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                "l": {"type": "literal", "xml:lang": "en", "value": "PERFORMANCE ANALYSIS"}
            },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226942"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "CONSTRUCTION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226943"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "INSPECTION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226944"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PREFABRICATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227509"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "ASSET MANAGEMENT"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227510"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "OPERATIONS"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227511"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "MAINTENANCE"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2229122"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PRODUCT CONFIGURATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2229145"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "DEMOLITION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2229994"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "LOGISTICS MANAGEMENT"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2229995"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PLANT DESIGN"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2229997"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PRODUCT SALES"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS9648872"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PROCESS DESIGN"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS9658412"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PROCUREMENT"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS9658862"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PRECOMMISSIONING"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS9661877"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "MANUFACTURING"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS9686717"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "COMMISSIONING"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS9701927"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PROCESS ENGINEERING"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS9709622"},
                    "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "DETAILED ENGINEERING"}
                }

            ]

            var array = []
            json.forEach(function (item) {
                array.push({id: item.s.value, label: item.l.value})
            })
            return callback(null, array);
        }


        self.getDisciplines = function (callback) {
            var json =

                [
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2223294"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "DISCIPLINE SPECIALTY GROUP"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2224671"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "MAINTENANCE MANAGEMENT DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2224673"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "OCEAN ENGINEERING TEAM"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2224674"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "OCEAN ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2224677"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "COMMISSIONING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2224678"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "COMMISSIONING TEAM"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226357"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "CIVIL ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226712"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "SECURITY SERVICE DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226715"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "SAFETY ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226718"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {
                            "type": "literal",
                            "xml:lang": "en",
                            "value": "HEALTH SAFETY ENVIRONMENT SERVICE DISCIPLINE"
                        }
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226722"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "PIPELINE ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226725"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "HVAC ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226728"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "PIPING ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226732"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "ROTATING EQUIPMENT ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226735"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "STATIC EQUIPMENT ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226738"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "MECHANICAL ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226742"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "MAINTENANCE ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226745"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {
                            "type": "literal",
                            "xml:lang": "en",
                            "value": "MATERIALS AND CORROSION ENGINEERING DISCIPLINE"
                        }
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226758"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "SUBSEA ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226762"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "CONTRACTING AND PROCUREMENT DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226765"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {
                            "type": "literal",
                            "xml:lang": "en",
                            "value": "METOCEAN AND ICE DATA ACQUISITION DISCIPLINE"
                        }
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226768"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {
                            "type": "literal",
                            "xml:lang": "en",
                            "value": "PETROLEUM PRODUCTION ENGINEERING DISCIPLINE"
                        }
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2226772"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "WELL ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227222"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "ARCHITECTURAL ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227225"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "COST AND PLANNING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227228"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "ELECTRICAL ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227232"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "ENVIRONMENTAL ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227235"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "FINANCE DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227238"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "GEOLOGY DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227242"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "GEOMATICS DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227245"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "GEOPHYSICS DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227248"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "GEOTECHNICAL AND FOUNDATION DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227252"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "HEALTH PROTECTION DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227255"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "HUMAN RESOURCES DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227258"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "INFORMATION MANAGEMENT DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227262"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "INFORMATION TECHNOLOGY DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227265"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "CONTROL SYSTEMS ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227268"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "LOGISTICS MANAGEMENT DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227272"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "OPERATIONS MANAGEMENT DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227275"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "PETROPHYSICS DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227278"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "PROCESS ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227282"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "QUALITY ASSURANCE DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227285"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "RESERVOIR ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227288"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "STRUCTURAL ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227292"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {"type": "literal", "xml:lang": "en", "value": "TELECOMMUNICATIONS ENGINEERING DISCIPLINE"}
                    },
                    {
                        "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227295"},
                        "p": {"type": "uri", "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"},
                        "l": {
                            "type": "literal",
                            "xml:lang": "en",
                            "value": "PROJECT MANAGEMENT AND ENGINEERING DISCIPLINE"
                        }
                    }]
            var array = []
            json.forEach(function (item) {
                array.push({id: item.s.value, label: item.l.value})
            })
            return callback(null, array);

        }
        self.getStakeHolder = function (callback) {
            var json = [
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS1041823651"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "DEPARTMENT"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS10418236543"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "ENTERPRISE"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS13314450"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "REGISTRATION AUTHORITY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS13314574"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "DATA COMMISSIONER"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS13652260"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "SHIPYARD ORGANIZATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS13701744"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "CITY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS13701789"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "TOWN"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS14365480"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "COUNTRY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS14671599"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "COUNTY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS16701120"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "CREW"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2216440288"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "COMPANY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2220066"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PLANT OWNER/OPERATOR"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2220900"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "EPC CONTRACTOR"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2221111"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "MANUFACTURING ORGANIZATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2221112"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "TRADING ORGANIZATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2223263"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "MANUFACTURER(role)"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2227220"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "TEAM"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS2229222"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "SUPPLIER ORGANIZATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS283544"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "REGULATORY BODY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS317699"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "OIL COMPANY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS317744"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "ENGINEERING ORGANIZATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS317789"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "STANDARDIZATION ORGANIZATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS418236511"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "COMMERCIAL ENTITY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS481604191"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "PETROLEUM FIELD GROUP"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS6480549"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "ACCREDITED CERTIFICATION BODY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS8015624992"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "STATE(geo)"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS8500594"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "QUALITY SYSTEM APPROVAL AUTHORITY"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS8648100"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "OPERATOR ORGANIZATION"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS8649286"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "INSPECTORATE"}
                },
                {
                    "s": {"type": "uri", "value": "http://data.15926.org/rdl/RDS944438281"},
                    "l": {"type": "literal", "xml:lang": "en", "value": "REGISTRATION AUTHORITY REGISTRAR"}
                }]
            var array = []
            json.forEach(function (item) {
                array.push({id: item.s.value, label: item.l.value})
            })
            return callback(null, array);


        }


        return self;


    }


)
()
