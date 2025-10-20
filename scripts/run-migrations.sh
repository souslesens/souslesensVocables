#!/bin/env sh

for FILE in $(find scripts/migrations/ -type f -name "migration_*.js" | sort -V); do
    echo "Run the migration $(basename $FILE)"
    node $FILE -c config -w && echo "🎉 DONE"
done
