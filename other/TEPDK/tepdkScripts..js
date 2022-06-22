function createStringFromTemplate(template, variables) {
  return template.replace(new RegExp("\{([^\{]+)\}", "g"), function(_unused, varName) {
    return variables[varName];
  });
}

function renameIdCol(table, fromCol, toCol) {
  var str = createStringFromTemplate(
    "EXEC sp_rename '{field}', '{toCol}', 'COLUMN'; ",
    {
      field: table + "." + fromCol,
      toCol: toCol
    })

  return str;
}

function addFields(table, colName) {
  var str = createStringFromTemplate(
    "ALTER TABLE {table} ADD {colName} nvarchar(100)",
    {
      table: table,
      colName: colName
    })

  return str;
}

function updateId(table,sourceCol,targetCol ) {
  var str = createStringFromTemplate(
    "update [dbo].{table} set {targetCol}= trim(LEFT({sourceCol}, CHARINDEX ( ' | ', {sourceCol}) ))",
    {
      table: table,
      sourceCol: sourceCol,
      targetCol:targetCol
    })

  return str;
}

function updateLabel(table,sourceCol,targetCol ) {
  var str = createStringFromTemplate(
    "update {table} set {targetCol}=" +
    " trim(RIGHT({sourceCol},(LEN({sourceCol})- CHARINDEX ( ' | ',{sourceCol})-1 ) ))",
    {
      table: table,
      sourceCol: sourceCol,
      targetCol:targetCol
    })

  return str;
}


/*
var str="EXEC sp_rename {field}, {TagID_number}, 'COLUMN;   ‘
ALTER TABLE [dbo].[TEPDK_ADL_tblTagAttribute] ADD TagLabel nvarchar(100);


update [TEPDK_ADL_tblTag] set FunctionalClassLabel=
  trim(RIGHT([FunctionalClassID_label],(LEN([FunctionalClassID_label])- CHARINDEX ( ' | ',[FunctionalClassID_label])-1 ) ))


update [dbo].[TEPDK_ADL_tblTagAttribute] set [TagID]= trim(LEFT([TagID_number], CHARINDEX ( ' | ', [TagID_number]) ))


update [TEPDK_ADL_tblTag] set FunctionalClassID= trim(LEFT([FunctionalClassID_label], CHARINDEX ( ' | ',[FunctionalClassID_label] ) ))
*/

var table="TEPDK_RDL_tblFunctionalClassToAttribute"
var table="TEPDK_RDL_tblFunctionalClass"
var table="TEPDK_ADL_tblModelAttribute"



var fromCol="AttributeID"


var mixedCol=fromCol+"_"+"label"
var idCol=fromCol
var labelCol=fromCol.replace("ID","Label")








var str=renameIdCol(table,fromCol, mixedCol)+"\n\n"
str+=addFields(table, idCol)+";\n\n"

str+=addFields(table, labelCol)+";\n\n"
str+=updateId(table,mixedCol,idCol )+";\n"
str+=updateLabel(table,mixedCol,labelCol )+";\n"

console.log(str);