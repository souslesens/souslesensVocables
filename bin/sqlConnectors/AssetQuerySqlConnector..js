/** The MIT License
 Copyright 2020 Claude Fauconnet / SousLesens Claude.fauconnet@gmail.com

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var mysql = require('./mySQLproxy..js')



//"C:\Program Files\MariaDB 10.2\bin\mysqld"
var AssetQuerySqlConnector = {

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

    get: function (objectName,quantumArray,callback){

        var  assetQueryMap={}
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
                if (!assetQueryMap[quantumType])
                    assetQueryMap[quantumType] = []
                assetQueryMap[quantumType].push(quantumTotalId)
            }
        })





        var query=AssetQuerySqlConnector.queries[objectName];

        for(var key in assetQueryMap){
            query+=" and "

            if(true){
                ""+key+" is not null"
            }
            if(Array.isArray(assetQueryMap[key])){
                query+=""+key+" in ("
                assetQueryMap[key].forEach(function(quantumTotalId,indexId){
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
        mysql.exec(AssetQuerySqlConnector.connection,query,function(err, result){
          return callback(err,result);

        })

    }


}
module.exports=AssetQuerySqlConnector;


if(false){
    AssetQuerySqlConnector.get("tag",
        {
            AttributeID:"XXXX",
            FunctionalClassID:"YYYYY"

        }


        )
}

