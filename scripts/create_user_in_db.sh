#! /bin/bash

if [[ $# -ne 3 ]]; then
  echo "Usage: create_user_in_db.sh <env> <username> <password>"
  echo  "      env:      docker-compose environment (dev|test)"
  echo  "      username: username to insert"
  echo  "      password: password to insert"
  exit 1
fi

env=${1}
user=${2}
password=${3}
password_hash=$(node -e "const bcrypt = require('bcrypt');console.log(bcrypt.hashSync('${password}', 10));" 2>/dev/null)

if [[ ${password_hash} ]];then
    password_to_insert=${password_hash}
else
    echo "bcrypt not found, password will be stored in plain text"
    password_to_insert=${password}
fi

echo "Creating database schema…"
echo "CREATE TABLE IF NOT EXISTS user (login varchar(255), password varchar(255), groups varchar(255));" \
    | docker-compose -f docker-compose.${env}.yaml exec -T mariadb mysql -u slsv -pslsv -D slsv
echo "Creating user $user with password $password"
echo "INSERT INTO user (login, password, groups) VALUES ('${user}', '${password_to_insert}', 'admin')" \
    | docker-compose -f docker-compose.${env}.yaml exec -T mariadb mysql -u slsv -pslsv -D slsv
