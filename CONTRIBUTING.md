# Welcome to souslesensVocable contributing guide

## Create a new issue

The first step before starting coding is to create an issue describing the feature/bugfix. Assign yourself to the issue. Set also the kanban project and a sprint milestone. When you start to work n the issue, move it to the `In progress` column of the [kanban](https://github.com/souslesens/souslesensVocables/projects/1).

## Create a development branch from master

Create a branch from the master branch. Don't forget to pull the latest commit before create your branch.

```bash
# Go to master branch
git checkout master
# Fetch and merge the latest changes
git pull
# Create a dev branch
git checkout -b feature/my-new-feature
```

the commit tree should look like this:

```
A---B---C master
         \
          feature/my-new-feature
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

The commits will be added to your branch like this:

```
A---B---C master
         \
          D---E feature/my-new-feature
```

## Rebase your branch to the master head

If the `master` branch have new commits, you will need to rebase your branch to the new master HEAD. The first things to do is fetching the latest commits on the master branch.

```bash
# Fetch the latest commits
git fetch origin
# Merge into master
git merge origin/master master
```

The latest commits will be added to the master branch like this:

```
A---B---C---F master
         \
          D---E feature/my-new-feature
```

Then, rebase your branch to the master HEAD

```bash
git rebase master
```

The tree is now like this:

```
A---B---C---F master
             \
              D---E feature/my-new-feature
```

## Pull request

Once your feature is stable, make a [pull request again the master branch](https://github.com/souslesens/souslesensVocables/pulls).

## Review

Wait for another member on the team to review the change on case you break something.

## Merge

Finally, merge the PR to the master branch. Use `Rebase and merge` to have a linear history on the master branch.

```
A---B---C---F---D---E master
```
