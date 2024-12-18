#!/bin/bash

# get config
export DATABASE_HOST=$(cat config/mainConfig.json | jq -r .database.host)
export DATABASE_PORT=$(cat config/mainConfig.json | jq -r .database.port)
export DATABASE_NAME=$(cat config/mainConfig.json | jq -r .database.database)
export DATABASE_PASSWORD=$(cat config/mainConfig.json | jq -r .database.password)
export DATABASE_USER=$(cat config/mainConfig.json | jq -r .database.user)

# Get postgresql admin password
pg_password_envfile=$(cat .env | grep POSTGRES_PASSWORD | cut -d "=" -f 2)
if [[ -z "${pg_password_envfile}" ]];then
    export PGPASSWORD=mysecretpassword
else
    export PGPASSWORD=${pg_password_envfile}
fi

# Postgresql args
ADMIN_ARGS="--host=${DATABASE_HOST} --port=${DATABASE_PORT} --username=postgres"

# Reset server
if [[ ${RESET_DB} == "true" ]];then
    dropdb ${ADMIN_ARGS} ${DATABASE_NAME}
    dropuser ${ADMIN_ARGS} ${DATABASE_USER}
fi

# Create schema
cat ./scripts/sql/000-init.sql.template | envsubst | psql ${ADMIN_ARGS}
psql ${ADMIN_ARGS} < ./scripts/sql/001-profiles.sql
psql ${ADMIN_ARGS} < ./scripts/sql/002-users.sql

psql ${ADMIN_ARGS} -c "alter role ${DATABASE_USER} with password '${DATABASE_PASSWORD}';"

