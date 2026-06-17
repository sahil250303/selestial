# Purge server/database.sqlite (which contained customer PII + password hashes)
# from git. Run from the repo root in PowerShell:  ./scripts/scrub-db-from-git.ps1
#
# This script does the SAFE local part automatically. The history rewrite +
# force-push is DESTRUCTIVE and irreversible, so it is printed for you to run
# deliberately (and after backing up / coordinating with collaborators).

$ErrorActionPreference = 'Stop'

Write-Host "1/2  Untracking server/database.sqlite (the file stays on your disk)..." -ForegroundColor Cyan
git rm --cached server/database.sqlite 2>$null
if (-not (Select-String -Path .gitignore -Pattern 'server/database.sqlite' -Quiet)) {
  Add-Content .gitignore "`nserver/database.sqlite`n*.sqlite"
}
git add .gitignore
git commit -m "Stop tracking local database (contained PII)" 2>$null
Write-Host "    Done — future commits no longer include the database." -ForegroundColor Green

Write-Host ""
Write-Host "2/2  HISTORY PURGE (destructive — run these yourself when ready):" -ForegroundColor Yellow
Write-Host "     # back up first:  git clone --mirror . ../selestial-backup.git"
Write-Host "     pip install git-filter-repo"
Write-Host "     git filter-repo --invert-paths --path server/database.sqlite --force"
Write-Host "     git remote add origin <YOUR_REMOTE_URL>   # filter-repo drops the remote"
Write-Host "     git push origin --force-with-lease --all"
Write-Host "     git push origin --force-with-lease --tags"
Write-Host ""
Write-Host "After pushing: rotate any other exposed secrets and have customers reset passwords." -ForegroundColor Yellow
