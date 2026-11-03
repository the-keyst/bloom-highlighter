import std.stdio : writeln;
import std.array : appender;
import std.algorithm : count;
import std.string : strip;

struct Task {
    string title;
    bool done;
}

class TaskQueue {
    private Task[] tasks;

    this(Task[] initial) { tasks = initial.dup; }

    bool add(string title) {
        if (title.strip.length == 0) return false;
        tasks ~= Task(title, false);
        return true;
    }

    bool complete(string title) {
        foreach (ref task; tasks) {
            if (task.title == title) { task.done = true; return true; }
        }
        return false;
    }

    string[] pendingTitles() {
        auto output = appender!(string[])();
        foreach (task; tasks) if (!task.done) output.put(task.title);
        return output.data;
    }

    size_t completedCount() { return tasks.count!(task => task.done); }
}

void main() {
    auto queue = new TaskQueue([Task("Review changes"), Task("Publish package")]);
    if (!queue.complete("Review changes")) throw new Exception("Task was not found");
    queue.add("Write documentation");
    writeln(queue.pendingTitles());
}
