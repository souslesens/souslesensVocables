/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var mysql = require('./mySQLproxy..js')



//"C:\Program Files\MariaDB 10.2\bin\mysqld"
var ADLSqlConnector = {

    connection: {
        host: "localhost",
        user: "root",
        password: "vi0lon",
        database: 'clov'
    },

    queries: {
        tag: "select * from tag,tag_attribute where tag.ID=tag_attribute.TagId ",
        model: "select * from model,model_attribute where model.ID=model_attribute.ModelId "
    },

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
