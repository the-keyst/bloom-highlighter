defmodule TaskQueue do
  def new do
    [%{id: 1, title: "Review changes", done: false},
     %{id: 2, title: "Publish package", done: false}]
  end

  def add(tasks, title) do
    clean_title = String.trim(title)
    if clean_title == "" do
      tasks
    else
      next_id = Enum.max(Enum.map(tasks, & &1.id), fn -> 0 end) + 1
      tasks ++ [%{id: next_id, title: clean_title, done: false}]
    end
  end

  def complete(tasks, id) do
    {updated, found} = Enum.map_reduce(tasks, false, fn task, found ->
      if task.id == id do
        {%{task | done: true}, true}
      else
        {task, found}
      end
    end)
    if found, do: {:ok, updated}, else: {:error, :not_found}
  end

  def pending(tasks), do: Enum.filter(tasks, fn task -> not task.done end)
  def completed_count(tasks), do: Enum.count(tasks, fn task -> task.done end)

  def summary(tasks) do
    "#{length(pending(tasks))} pending, #{completed_count(tasks)} complete"
  end
end

tasks = TaskQueue.new()
{:ok, tasks} = TaskQueue.complete(tasks, 1)
tasks = TaskQueue.add(tasks, "Write documentation")
IO.puts(TaskQueue.summary(tasks))
Enum.each(TaskQueue.pending(tasks), fn task -> IO.puts("- #{task.title}") end)
