var mysql = require('./mySQLproxy..js')

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

