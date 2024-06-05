#! /bin/sh

release=$(node -p "require('./package.json').version")

# move migration_NEXT*.js with release name
files=$(find scripts/migrations -name "migration_NEXT_*.js")
for file in $files;do
    new_file=$(echo $file | sed "s/NEXT/${release}/g")
    echo "Moving $file to $new_file…"
    git mv "${file}" "${new_file}"
done

git add package* CHANGELOG.md
git commit -m "chore: release ${release}"
git tag ${release}

echo "Release ${release} created. Push with:"
echo ""
echo "git push --tags"
