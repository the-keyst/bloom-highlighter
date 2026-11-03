import java.util.ArrayList;
import java.util.List;

record Task(String title, boolean done) {
    Task complete() {
        return new Task(title, true);
    }
}

class TaskQueue {
    private final List<Task> tasks;

    TaskQueue(List<Task> tasks) {
        this.tasks = new ArrayList<>(tasks);
    }

    boolean complete(String title) {
        for (int index = 0; index < tasks.size(); index++) {
            Task task = tasks.get(index);
            if (task.title().equals(title)) {
                tasks.set(index, task.complete());
                return true;
            }
        }
        return false;
    }

    List<String> pendingTitles() {
        return tasks.stream().filter(task -> !task.done()).map(Task::title).toList();
    }

    int completedCount() {
        return (int) tasks.stream().filter(Task::done).count();
    }

    boolean remove(String title) {
        return tasks.removeIf(task -> task.title().equals(title));
    }

    List<Task> snapshot() {
        return List.copyOf(tasks);
    }
}
