#! /bin/bash

env=${1:-test}

BFO_DATA_URL="https://raw.githubusercontent.com/BFO-ontology/BFO/v2019-08-26/bfo_classes_only.owl"

# Load test data into Virtuoso
docker-compose -f docker-compose.${env}.yaml exec -T virtuoso isql-v -U dba -P dba  <<EOF
    ld_dir('dumps', 'bfo_classes_only.owl', 'http://purl.obolibrary.org/obo/bfo.owl');
    rdf_loader_run();
    exit;
EOF
echo
echo "data loaded to" ${env}
