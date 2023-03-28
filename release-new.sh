#! /bin/bash


if [[ ${1} != "patch" && ${1} != "minor" && ${1} != "major" ]];then
  echo "Ugage: bash release-new.sh patch|minor|major"
  exit 1
fi

npm run $1
release=$(npm version --json | jq .souslesensvocables | sed 's/"//g')

git commit package* -m "release ${release}"
git tag ${release}
echo "Release ${release} created. Push with \`git push && git push --tags\`"
