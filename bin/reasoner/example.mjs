import { run } from './owl-consistency.mjs';
import request from "request";


// This callback owns the endpoint, authentication and HTTP request.
async function request(query) {
  const username = process.env.SPARQL_USERNAME;
  const password = process.env.SPARQL_PASSWORD;
  if (username === undefined || password === undefined) {
    throw new Error('Set SPARQL_USERNAME and SPARQL_PASSWORD before running this example.');
  }
  if (username.includes(':')) {
    throw new Error('A Basic authentication username cannot contain a colon.');
  }
  const credentials = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');


  var url= 'http://51.178.139.80:8890/sparql?format=json&query=';
      var headers={
    "Accept": "application/sparql-results+json",
    "Content-Type": "application/x-www-form-urlencoded"
  }
  var params={
    "query": query,
    "useProxy": true,
    "auth": {
      "user":  process.env.SPARQL_USERNAME,
      "pass":  process.env.SPARQL_PASSWORD,
      "sendImmediately": false
    }
  }




  var options = {
    method: "POST",

    url: url,
  };

  if (params.GET) {
    options.method = "GET";
  }

  if (params.auth) {
    options.auth = params.auth;
  }

  if (headers) {
    options.headers = headers;
    if (headers["Content-Type"] && headers["Content-Type"].indexOf("json") > -1) {
      options.json = params;
    }

    // if (headers["content-type"] && headers["content-type"].indexOf("json") > -1) options.json = params;
    else {
      options.form = params;
    }
  } else {
    options.headers = {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    };
    options.form = params;
  }


  options={
    "method": "POST",
    "url": "http://51.178.139.80:8890/sparql?format=json&query=",
    "auth": {
      "user": "dba",
      "pass": "sls#209",
      "sendImmediately": false
    },
    "headers": {
      "Accept": "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    "form": {
      "query": "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX owl: <http://www.w3.org/2002/07/owl#>  select distinct  ?subject ?subjectLabel (GROUP_CONCAT(DISTINCT ?subjectType;SEPARATOR=\",\") AS ?subjectTypes) (GROUP_CONCAT(DISTINCT ?subjectSuperClass;SEPARATOR=\",\") AS ?subjectSuperClasses)(GROUP_CONCAT(DISTINCT ?broaderGraph1;SEPARATOR=\",\") AS ?broaderGraphs1 ) ?broader1 ?broader1Label FROM   <https://jip36-cfihos/rdl-iof/>  FROM   <https://spec.industrialontologies.org/ontology/core/Core/>  FROM   <http://purl.obolibrary.org/obo/bfo.owl>  FROM   <http://souslesens/ontology/unspsc/>   WHERE {{GRAPH ?subjectGraph2{?subject rdf:type  ?subjectType. filter (?subjectType not in(owl:Restriction))  OPTIONAL { ?subject rdfs:label ?subjectLabel.} }}\n filter( ?subjectGraph2 in ( <https://jip36-cfihos/rdl-iof/> , <https://spec.industrialontologies.org/ontology/core/Core/> , <http://purl.obolibrary.org/obo/bfo.owl> , <http://souslesens/ontology/unspsc/> ) ).\n OPTIONAL {?subject rdfs:subClassOf ?subjectSuperClass.FILTER(!isBlank(?subjectSuperClass))}\n  ?subject rdfs:subClassOf|rdf:type ?broader1.{GRAPH ?broaderGraph1{  ?broader1 rdf:type ?broaderType. filter(?broaderType !=owl:Restriction)} filter (?broader1 !=owl:Class) OPTIONAL {?broader1 rdfs:label ?broader1Label. filter(regex( lang(?broader1Label), 'en') || !lang(?broader1Label))} }\n filter( ?broaderGraph1 in ( <https://jip36-cfihos/rdl-iof/> , <https://spec.industrialontologies.org/ontology/core/Core/> , <http://purl.obolibrary.org/obo/bfo.owl> , <http://souslesens/ontology/unspsc/> ) ).\n FILTER (!isBlank(?subject)) FILTER( ?subject =<https://jip36-cfihos/rdl-iof/physical_property>)  } GROUP BY ?subject ?subjectLabel ?broader1 ?broader1Label limit 10000",
      "useProxy": true,
      "auth": {
        "user": "dba",
        "pass": "sls#209",
        "sendImmediately": false
      }
    }
  }

try {
  request( options, async function (error, response, body) {
    if (error) {

    }
    return body;
  })
}catch(e){
    var x=e
}






 /* return requestSparql(query, {

    // Omit graphs to use the store's default dataset.

    endpoint: 'http://localhost:3030/my-dataset/sparql',
    headers: { Authorization: `Basic ${credentials}` },
  });*/
}

///try {
  const report = await run({
    request,
    // Omit graphs to use the store's default dataset.
    graphs: [
      'https://spec.industrialontologies.org/ontology/core/Core/'
    ],
    limit: 20,
  });

  console.log('Status:', report.status);

  for (const check of report.checks) {
    if (check.violationDetected) {
      console.log(`Violation: ${check.description}`);
      console.dir(check.examples, { depth: null });
    }
  }
/*} catch (error) {
  console.error('Check failed:', error.message);
  if (error.cause) console.error('Details:', error.cause.message);
  process.exitCode = 2;
}*/



