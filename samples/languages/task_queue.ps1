$ErrorActionPreference = 'Stop'
$script:Tasks = [System.Collections.Generic.List[object]]::new()
$script:NextId = 1

function Add-Task {
    param([Parameter(Mandatory)][string]$Title)
    $cleanTitle = $Title.Trim()
    if ([string]::IsNullOrWhiteSpace($cleanTitle)) { return $null }
    $task = [pscustomobject]@{ Id = $script:NextId; Title = $cleanTitle; Done = $false }
    $script:NextId += 1
    $script:Tasks.Add($task)
    return $task
}

function Complete-Task {
    param([int]$Id)
    $task = $script:Tasks | Where-Object { $_.Id -eq $Id } | Select-Object -First 1
    if ($null -eq $task) { return $false }
    $task.Done = $true
    return $true
}

function Get-PendingTask {
    return @($script:Tasks | Where-Object { -not $_.Done })
}

function Get-TaskSummary {
    $completed = @($script:Tasks | Where-Object { $_.Done }).Count
    return "$(Get-PendingTask | Measure-Object | Select-Object -ExpandProperty Count) pending, $completed complete"
}

Add-Task 'Review changes' | Out-Null
Add-Task 'Publish package' | Out-Null
if (-not (Complete-Task -Id 1)) { throw 'Task was not found' }
Add-Task 'Write documentation' | Out-Null
Get-PendingTask | ForEach-Object { Write-Output "- $($_.Title)" }
Write-Output (Get-TaskSummary)
