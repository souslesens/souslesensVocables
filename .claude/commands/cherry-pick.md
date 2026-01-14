---
description: Cherry-pick commits to a new branch based on origin/master
---

# Cherry-pick Commits to New Branch

This command helps you cherry-pick specific commits to a new branch based on origin/master.

## Instructions

You will perform the following Git workflow:

1. **Parse Parameters**:
   - Extract the list of commit SHA IDs and the new branch name from the user's command
   - If not provided, ask the user for:
     - Commit SHA IDs (space-separated or comma-separated)
     - New branch name

2. **Save Current Branch**:
   - Run `git branch --show-current` to get the current branch name
   - Store this to return to it later

3. **Fetch Latest Changes**:
   - Run `git fetch` to update remote references

4. **Create New Branch**:
   - Run `git checkout -b <new-branch-name> origin/master` to create and switch to a new branch based on origin/master

5. **Cherry-pick Commits**:
   - For each commit SHA in the list:
     - Run `git cherry-pick <commit-sha>`
     - If there are conflicts, inform the user and ask how to proceed (skip, abort, or resolve manually)

6. **Push New Branch**:
   - Run `git push -u origin <new-branch-name>` to push the new branch to remote

7. **npm run prettier:write**:
   - Run `npm run prettier:write` to clean and add a prettier commit with message prettier

8. **Return to Original Branch**:
   - Run `git checkout <original-branch>` to switch back to the original branch

9. **Summary**:
   - Display a summary of the operations performed
   - Show the new branch name and the commits that were cherry-picked

## Example Usage

```
/cherry-pick abc123 def456 ghi789 my-feature-branch
```

Or simply:
```
/cherry-pick
```
Then provide the commits and branch name when prompted.

## Important Notes

- Always run these commands sequentially, not in parallel
- Handle errors gracefully (especially cherry-pick conflicts)
- Confirm with the user before pushing to remote
- Make sure to return to the original branch even if errors occur
