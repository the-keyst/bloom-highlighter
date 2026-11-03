mutable struct Task
    title::String
    done::Bool
end

mutable struct TaskQueue
    tasks::Vector{Task}
end

function add_task!(queue::TaskQueue, title::String)
    clean_title = strip(title)
    isempty(clean_title) && return false
    push!(queue.tasks, Task(clean_title, false))
    return true
end

function complete_task!(queue::TaskQueue, title::String)
    task = findfirst(item -> item.title == title, queue.tasks)
    isnothing(task) && return false
    queue.tasks[task].done = true
    return true
end

function pending_titles(queue::TaskQueue)
    return [task.title for task in queue.tasks if !task.done]
end

function completed_count(queue::TaskQueue)
    return count(task -> task.done, queue.tasks)
end

function summary(queue::TaskQueue)
    return "$(length(pending_titles(queue))) pending, $(completed_count(queue)) complete"
end

function main()
    queue = TaskQueue([Task("Review changes", false), Task("Publish package", false)])
    complete_task!(queue, "Review changes") || error("Task was not found")
    add_task!(queue, "Write documentation")
    println(summary(queue))
    foreach(title -> println("- $title"), pending_titles(queue))
end

main()
