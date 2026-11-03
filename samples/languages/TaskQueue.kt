data class Task(val title: String, var done: Boolean = false)

class TaskQueue(initial: List<Task>) {
    private val tasks = initial.toMutableList()

    fun add(title: String): Boolean {
        val cleanTitle = title.trim()
        if (cleanTitle.isEmpty()) return false
        tasks.add(Task(cleanTitle))
        return true
    }

    fun complete(title: String): Boolean {
        val task = tasks.find { item -> item.title == title }
        if (task == null) return false
        task.done = true
        return true
    }

    fun remove(title: String): Boolean {
        return tasks.removeAll { task -> task.title == title }
    }

    fun pendingTitles(): List<String> {
        return tasks.filter { task -> !task.done }.map { task -> task.title }
    }

    fun completedCount(): Int {
        return tasks.count { task -> task.done }
    }

    fun summary(): String {
        return "${pendingTitles().size} pending, ${completedCount()} complete"
    }
}

fun main() {
    val queue = TaskQueue(listOf(Task("Review changes"), Task("Publish package")))
    if (!queue.complete("Review changes")) error("Task was not found")
    queue.add("Write documentation")
    println(queue.summary())
    queue.pendingTitles().forEach { title -> println("- $title") }
}
