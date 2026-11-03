type task = { id : int; title : string; done_ : bool }
type queue = task list

let add_task title tasks =
  let clean_title = String.trim title in
  if clean_title = "" then tasks
  else { id = List.length tasks + 1; title = clean_title; done_ = false } :: tasks

let complete_task id tasks =
  if not (List.exists (fun task -> task.id = id) tasks) then None
  else Some (List.map (fun task ->
    if task.id = id then { task with done_ = true } else task) tasks)

let remove_task id tasks =
  let remaining = List.filter (fun task -> task.id <> id) tasks in
  if List.length remaining = List.length tasks then None else Some remaining

let pending tasks = List.filter (fun task -> not task.done_) tasks
let completed_count tasks = List.length (List.filter (fun task -> task.done_) tasks)

let summary tasks =
  Printf.sprintf "%d pending, %d complete"
    (List.length (pending tasks)) (completed_count tasks)

let () =
  let initial = [
    { id = 1; title = "Review changes"; done_ = false };
    { id = 2; title = "Publish package"; done_ = false };
  ] in
  match complete_task 1 initial with
  | None -> failwith "Task was not found"
  | Some tasks ->
      let expanded = add_task "Write documentation" tasks in
      print_endline (summary expanded);
      List.iter (fun task -> print_endline ("- " ^ task.title)) (pending expanded);
      Printf.printf "Snapshot contains %d records\n" (List.length expanded)
