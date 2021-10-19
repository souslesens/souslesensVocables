# Welcome to souslesensVocable contributing guide

## Create a new issue

The first step before starting coding is to create an issue describing the feature/bugfix. Assign yourself to the issue. Set also the kanban project and a sprint milestone. When you start to work n the issue, move it to the `In progress` column of the [kanban](https://github.com/souslesens/souslesensVocables/projects/1).

## Create a development branch from master

Create a branch from the master branch. Don't forget to pull the latest commit before create your branch.


```bash
# Go to master branch
git checkout master
# get the latest commits
git pull
# Create a dev branch
git checkout -b feature/my-new-feature
```

## git add git commit git push

Start to implement your changes. Make small commits with relevant commit message.

```bash
# write code, add and commit
git add .
git commit -m "this is a commit message that describe my changes"
# Push
git push
```

## Pull request

Once your feature is stable, make a [pull request again the master branch](https://github.com/souslesens/souslesensVocables/pulls).


## Review

Is good to wait for another member on the team to review the change on case you break something.

## Merge

Finally, merge the PR to the master branch.
