using System.Collections.Generic;
using System.Linq;

public sealed record TaskItem(string Title, bool Done = false);

public sealed class TaskQueue
{
    private readonly List<TaskItem> _tasks;

    public TaskQueue(IEnumerable<TaskItem> tasks) => _tasks = [.. tasks];

    public bool Complete(string title)
    {
        var index = _tasks.FindIndex(task => task.Title == title);
        if (index < 0) return false;

        _tasks[index] = _tasks[index] with { Done = true };
        return true;
    }

    public IReadOnlyList<string> PendingTitles() =>
        _tasks.Where(task => !task.Done).Select(task => task.Title).ToArray();
}
