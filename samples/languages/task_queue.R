new_task <- function(id, title, done = FALSE) {
  list(id = id, title = title, done = done)
}

add_task <- function(tasks, title) {
  clean_title <- trimws(title)
  if (!nzchar(clean_title)) return(tasks)
  next_id <- length(tasks) + 1L
  append(tasks, list(new_task(next_id, clean_title)))
}

complete_task <- function(tasks, id) {
  index <- which(vapply(tasks, function(task) task$id == id, logical(1)))
  if (length(index) == 0) return(NULL)
  tasks[[index]]$done <- TRUE
  tasks
}

pending_titles <- function(tasks) {
  values <- Filter(function(task) !task$done, tasks)
  vapply(values, function(task) task$title, character(1))
}

completed_count <- function(tasks) {
  sum(vapply(tasks, function(task) task$done, logical(1)))
}

queue_summary <- function(tasks) {
  paste(length(pending_titles(tasks)), "pending,",
        completed_count(tasks), "complete")
}

tasks <- list(new_task(1, "Review changes"), new_task(2, "Publish package"))
tasks <- complete_task(tasks, 1)
if (is.null(tasks)) stop("Task was not found")
tasks <- add_task(tasks, "Write documentation")
cat(queue_summary(tasks), "\n")
cat(paste0("- ", pending_titles(tasks)), sep = "\n")
