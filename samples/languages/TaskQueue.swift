struct Task {
    let title: String
    var done = false
}

struct TaskQueue {
    private(set) var tasks: [Task]

    mutating func add(_ title: String) -> Bool {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty else { return false }
        tasks.append(Task(title: cleanTitle))
        return true
    }

    mutating func complete(_ title: String) -> Bool {
        guard let index = tasks.firstIndex(where: { $0.title == title }) else {
            return false
        }
        tasks[index].done = true
        return true
    }

    mutating func remove(_ title: String) -> Bool {
        guard let index = tasks.firstIndex(where: { $0.title == title }) else {
            return false
        }
        tasks.remove(at: index)
        return true
    }

    var pendingTitles: [String] {
        tasks.filter { !$0.done }.map(\.title)
    }

    var completedCount: Int {
        tasks.filter(\.done).count
    }

    var summary: String {
        "\(pendingTitles.count) pending, \(completedCount) complete"
    }
}

var queue = TaskQueue(tasks: [Task(title: "Review changes"), Task(title: "Publish package")])
if !queue.complete("Review changes") { fatalError("Task was not found") }
queue.add("Write documentation")
print(queue.summary)
queue.pendingTitles.forEach { print("- \($0)") }
