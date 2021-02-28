/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var mysql = require('./mySQLproxy..js')
const async=require('async')



//"C:\Program Files\MariaDB 10.2\bin\mysqld"
var ADLSqlConnector = {

    connection: {
        host: "localhost",
        user: "root",
        password: "vi0lon",
        database: 'turbogenerator'
    },

    queries: {
        tag: "select * from tag,tag_attribute where tag.ID=tag_attribute.TagId ",
        model: "select * from model,model_attribute where model.ID=model_attribute.ModelId "
    },



    views:[
        "create view view_adl_TagModelAttribute as select " +
        " tag.ID tag_ID, tag.TagNumber tag_TagNumber, tag.FunctionalClassID tag_FunctionalClassID, tag.ServiceDescription tag_ServiceDescription, tag.ValidationStatus tag_ValidationStatus, tag.Status tag_Status, tag.CMMSRequired tag_CMMSRequired," +
        " tag_attribute.ID tag_attribute_ID, tag_attribute.TagId tag_attribute_TagId, tag_attribute.AttributeID tag_attribute_AttributeID, tag_attribute.FromValue tag_attribute_FromValue, tag_attribute.ToValue tag_attribute_ToValue, " +
        " tag_attribute.UnitOfMeasureID tag_attribute_UnitOfMeasureID, tag_attribute.Status tag_attribute_Status, tag_attribute.Source tag_attribute_Source," +
        " model.ID model_ID, model.OEMID model_OEMID, model.ModelNumber model_ModelNumber, model.PhysicalClassID model_PhysicalClassID," +
        " model_attribute.ID model_attribute_ID, model_attribute.ModelID model_attribute_ModelID, model_attribute.AttributeID model_attribute_AttributeID, model_attribute.FromValue model_attribute_FromValue, model_attribute.ToValue model_attribute_ToValue, model_attribute.UnitOfMeasureID model_attribute_UnitOfMeasureID, model_attribute.Status model_attribute_Status, model_attribute.Source model_attribute_Source\n" +

        " from tag left join tag_attribute on tag.id=tag_attribute.TagId left join tag2model on tag.ID=tag2model.TagID" +
        " left join model on tag2model.id=model.ID  left join model_attribute on  model_attribute.ModelID=tag2model.ModelID"


    ],

    getFromSparql: function (objectName,quantumArray,callback){

        var  ADLqueryMap={}
        var QuantumTypesMap={
            F:"FunctionalClassID",
            A:"AttributeID"
        }

        quantumArray.forEach(function(item) {
            var quantumId = item.id
            var p = quantumId.indexOf("TOTAL-")
            var quantumTypeLetter = quantumId.substring(p+ 6, p + 7)
            var quantumTotalId=quantumId.substring(p)
            var quantumType = QuantumTypesMap[quantumTypeLetter]
            if (quantumType) {
                if (!ADLqueryMap[quantumType])
                    ADLqueryMap[quantumType] = []
                ADLqueryMap[quantumType].push(quantumTotalId)
            }
        })





        var query=ADLSqlConnector.queries[objectName];

        for(var key in ADLqueryMap){
            query+=" and "

            if(true){
                ""+key+" is not null"
            }
            if(Array.isArray(ADLqueryMap[key])){
                query+=""+key+" in ("
                ADLqueryMap[key].forEach(function(quantumTotalId,indexId){
                    if(indexId>0){
                        query+=","
                    }
                    query+="'"+quantumTotalId+"'"
                })
                query+=" )"
            }
            else{
                query+=""+key+"='"+paramsMap[key].id+"'"
            }


        }
        query+=" limit 1000"
        console.log(query)
        mysql.exec(ADLSqlConnector.connection,query,function(err, result){
          return callback(err,result);

        })

    },

    getData:function(dbName,query,callback) {
        mysql.exec(ADLSqlConnector.connection, query, function (err, result) {
            return callback(err, result)

        })
    },



    processFetchedData:function(dbName,query,fetchSize,startOffset, processor,callback){

        var offset = startOffset
        var length = 1
        var allResults = []
        async.whilst(
            function test(cb) {
                return cb(null, length > 0);
            },
            function iter(callbackWhilst) {


                //  query=query+" offset "+(""+offset);
           var query2 =query +" limit "+fetchSize+ " offset " + offset
                offset += fetchSize;
                console.log("processed lines: "+offset)
                ADLSqlConnector.getData(dbName,query2,function (err, result) {
                    if (err) {
                        console.log(params.query)
                        return callbackWhilst(err);
                    }
                    length = result.length
                    if(processor) {
                        processor(result, function (err, resultProcessor) {
                            if (err)  {

                                return callbackWhilst(err);
                            }
                            return callbackWhilst();
                        })
                    }
                    else{
                        allResults=allResults.concat(result);
                        return callbackWhilst();
                    }


                })
            },
            function (err, n) {
                if (err)
                    return callback(err);
                callback(null, allResults);

            }
        )





    },

    getADLmodel:function(dbName,callback){

        var query="SELECT TABLE_NAME ,COLUMN_NAME\n" +
            "  FROM INFORMATION_SCHEMA.COLUMNS\n" +
            "  WHERE TABLE_SCHEMA = '"+dbName+"'"
        mysql.exec(ADLSqlConnector.connection,query,function(err, result){
            if(err)
                return callback(err)

            var model={}
            result.forEach(function(item){
                if(!model[item.TABLE_NAME]){
                    model[item.TABLE_NAME]=[]
                }
                model[item.TABLE_NAME].push(item.COLUMN_NAME)

            })
            return callback(err,model);


        })

    },




}
module.exports=ADLSqlConnector;


if(false){
    ADLSqlConnector.get("tag",
        {
            AttributeID:"XXXX",
            FunctionalClassID:"YYYYY"

        }


        )
}

if(false){
    ADLSqlConnector.getADLmodel("clov")
}
