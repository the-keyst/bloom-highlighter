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

    def pending_titles(self) -> list[str]:
        return [task.title for task in self.tasks if not task.done]


queue = TaskQueue([Task("Review changes"), Task("Publish package")])
if not queue.complete("Review changes"):
    raise LookupError("Task was not found")

print(queue.pending_titles())
