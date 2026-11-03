class Task {
    final String title
    boolean done = false
    Task(String title) { this.title = title }
}

class TaskQueue {
    private final List<Task> tasks = []

    boolean add(String title) {
        String cleanTitle = title.trim()
        if (!cleanTitle) return false
        tasks << new Task(cleanTitle)
        return true
    }

    boolean complete(String title) {
        Task task = tasks.find { item -> item.title == title }
        if (task == null) return false
        task.done = true
        return true
    }

    boolean remove(String title) {
        return tasks.removeAll { item -> item.title == title }
    }

    List<Task> pending() { tasks.findAll { item -> !item.done } }
    int completedCount() { tasks.count { item -> item.done } }

    String summary() {
        return "${pending().size()} pending, ${completedCount()} complete"
    }
}

def queue = new TaskQueue()
queue.add('Review changes')
queue.add('Publish package')
assert queue.complete('Review changes')
queue.add('Write documentation')
println queue.summary()
queue.pending().each { task -> println "- ${task.title}" }
