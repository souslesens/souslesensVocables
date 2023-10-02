#! /bin/sh

release=$(node -p "require('./package.json').version")

git add package* CHANGELOG.md
git commit -m "chore: release ${release}"
git tag ${release}

echo "Release ${release} created. Push with:"
echo ""
echo "git push --tags"
