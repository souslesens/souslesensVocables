#! /bin/bash

source .env

if [[ ! -d ${DATA_ROOT_DIR}/souslesens/elasticsearch ]];then
  sudo mkdir -p ${DATA_ROOT_DIR}/souslesens/elasticsearch/data
  sudo chmod -R  g+rwx ${DATA_ROOT_DIR}/souslesens/elasticsearch
  sudo chown -R 0:0 ${DATA_ROOT_DIR}/souslesens/elasticsearch
  echo "${DATA_ROOT_DIR}/souslesens/elasticsearch created!"
else
  echo "${DATA_ROOT_DIR}/souslesens/elasticsearch already exists"
fi

if [[ ! -d ${DATA_ROOT_DIR}/souslesens/sqlserver ]];then
  sudo mkdir -p ${DATA_ROOT_DIR}/souslesens/sqlserver
  sudo chmod -R  g+rwx ${DATA_ROOT_DIR}/souslesens/sqlserver
  sudo chown -R 10001:10001 ${DATA_ROOT_DIR}/souslesens/sqlserver
  echo "${DATA_ROOT_DIR}/souslesens/sqlserver created!"
else
  echo "${DATA_ROOT_DIR}/souslesens/sqlserver already exists"
fi
