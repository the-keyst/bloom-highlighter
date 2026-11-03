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

    public void Add(string title)
    {
        var cleanTitle = title.Trim();
        if (cleanTitle.Length == 0) throw new ArgumentException("A title is required", nameof(title));
        _tasks.Add(new TaskItem(cleanTitle));
    }

    public bool Remove(string title)
    {
        var index = _tasks.FindIndex(task => task.Title == title);
        if (index < 0) return false;
        _tasks.RemoveAt(index);
        return true;
    }

    public int CompletedCount() => _tasks.Count(task => task.Done);

    public IReadOnlyList<TaskItem> Snapshot() => _tasks.ToArray();

    public IReadOnlyList<string> PendingTitles() =>
        _tasks.Where(task => !task.Done).Select(task => task.Title).ToArray();
}
