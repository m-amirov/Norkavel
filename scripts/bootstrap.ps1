[CmdletBinding()]
param([switch]$ApplySkills)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& git -C $project submodule update --init --recursive
if ($LASTEXITCODE -ne 0) { throw 'Git submodule update failed' }

$ludory = Join-Path $project 'vendor/ludory'
$wfa = Join-Path $project 'vendor/workflow-for-agents'
$required = @(
  (Join-Path $ludory 'packages/core/src/index.mjs'),
  (Join-Path $wfa 'scripts/install.ps1')
)
foreach ($path in $required) { if (-not (Test-Path $path)) { throw "Missing pinned source: $path" } }

$skills = @('task-planning','game-docs','gameplay-design','gameplay-playtesting',
  'game-content-qa','character-design','character-consistency-qa',
  'production-art','visual-qa','browser-qa','git-workflow')
$installer = Join-Path $wfa 'scripts/install.ps1'
& $installer -Scope project -ProjectPath $project -Skills $skills -DryRun
if ($ApplySkills) {
  & $installer -Scope project -ProjectPath $project -Skills $skills
}
& node (Join-Path $project 'scripts/smoke-ludory.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Ludory smoke failed' }
Write-Output 'Norkavel bootstrap complete. Skills are only installed when -ApplySkills is passed.'
