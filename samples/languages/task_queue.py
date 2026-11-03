from dataclasses import dataclass


@dataclass
class Task:
    title: str
    done: bool = False


class TaskQueue:
    def __init__(self, tasks: list[Task]) -> None:
        self.tasks = tasks

    def complete(self, title: str) -> bool:
        for task in self.tasks:
            if task.title == title:
                task.done = True
                return True
        return False

    def add(self, title: str) -> None:
        clean_title = title.strip()
        if not clean_title:
            raise ValueError("A task needs a title")
        self.tasks.append(Task(clean_title))

    def remove(self, title: str) -> bool:
        for index, task in enumerate(self.tasks):
            if task.title == title:
                del self.tasks[index]
                return True
        return False

    def completed_count(self) -> int:
        return sum(task.done for task in self.tasks)

    def summary(self) -> str:
        remaining = len(self.pending_titles())
        return f"{remaining} tasks remain; {self.completed_count()} are done"

    def pending_titles(self) -> list[str]:
        return [task.title for task in self.tasks if not task.done]


queue = TaskQueue([Task("Review changes"), Task("Publish package")])
if not queue.complete("Review changes"):
    raise LookupError("Task was not found")

print(queue.pending_titles())
queue.add("Write documentation")
queue.remove("Publish package")
print(queue.summary())
