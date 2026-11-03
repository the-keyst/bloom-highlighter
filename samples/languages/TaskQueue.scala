final case class Task(title: String, done: Boolean = false)

final class TaskQueue(initial: List[Task]) {
  private var tasks = initial

  def add(title: String): Boolean = {
    val cleanTitle = title.trim
    if (cleanTitle.isEmpty) return false
    tasks = tasks :+ Task(cleanTitle)
    true
  }

  def complete(title: String): Boolean = {
    val found = tasks.exists(task => task.title == title)
    if (!found) return false
    tasks = tasks.map(task => if (task.title == title) task.copy(done = true) else task)
    true
  }

  def remove(title: String): Boolean = {
    val remaining = tasks.filterNot(task => task.title == title)
    val changed = remaining.size != tasks.size
    tasks = remaining
    changed
  }

  def pendingTitles: List[String] = tasks.filterNot(_.done).map(_.title)
  def completedCount: Int = tasks.count(_.done)
  def summary: String = s"${pendingTitles.size} pending, $completedCount complete"
}

object TaskQueueApp {
  def main(args: Array[String]): Unit = {
    val queue = new TaskQueue(List(Task("Review changes"), Task("Publish package")))
    if (!queue.complete("Review changes")) throw new NoSuchElementException("Task was not found")
    queue.add("Write documentation")
    println(queue.summary)
    queue.pendingTitles.foreach(title => println(s"- $title"))
  }
}
