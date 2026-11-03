#!/usr/bin/env bash
set -euo pipefail

tasks=("1|Review changes|false" "2|Publish package|false")
next_id=3

add_task() {
    local title="${1//|/}"
    [[ -n "${title//[[:space:]]/}" ]] || return 1
    tasks+=("$next_id|$title|false")
    ((next_id += 1))
}

complete_task() {
    local wanted="$1"
    local index
    for index in "${!tasks[@]}"; do
        IFS='|' read -r id title done <<< "${tasks[$index]}"
        if [[ "$id" == "$wanted" ]]; then
            tasks[$index]="$id|$title|true"
            return 0
        fi
    done
    return 1
}

print_pending() {
    local row id title done
    for row in "${tasks[@]}"; do
        IFS='|' read -r id title done <<< "$row"
        [[ "$done" == true ]] || printf '%s\n' "- $title"
    done
}

complete_task 1 || { printf '%s\n' 'Task was not found' >&2; exit 1; }
add_task 'Write documentation'
print_pending
