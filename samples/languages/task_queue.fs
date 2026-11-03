type Task = { Title: string; Done: bool }

let addTask title tasks =
    let cleanTitle = title.Trim()
    if System.String.IsNullOrWhiteSpace(cleanTitle) then tasks
    else tasks @ [ { Title = cleanTitle; Done = false } ]

let completeTask title tasks =
    let found = tasks |> List.exists (fun task -> task.Title = title)
    if not found then None
    else
        tasks
        |> List.map (fun task ->
            if task.Title = title then { task with Done = true }
            else task)
        |> Some

let removeTask title tasks =
    let remaining = tasks |> List.filter (fun task -> task.Title <> title)
    if remaining.Length = tasks.Length then None else Some remaining

let pending tasks = tasks |> List.filter (fun task -> not task.Done)
let completedCount tasks = tasks |> List.filter (fun task -> task.Done) |> List.length

let summary tasks =
    sprintf "%d pending, %d complete" (List.length (pending tasks)) (completedCount tasks)

[<EntryPoint>]
let main _ =
    let initial = [ { Title = "Review changes"; Done = false }; { Title = "Publish package"; Done = false } ]
    let completed = completeTask "Review changes" initial
    match completed with
    | None -> failwith "Task was not found"
    | Some tasks ->
        let expanded = addTask "Write documentation" tasks
        printfn "%s" (summary expanded)
        pending expanded |> List.iter (fun task -> printfn "- %s" task.Title)
    0
