import logging
import subprocess
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


def evaluate_preview(expression: str):
    return eval(expression, {"__builtins__": {}})


@dataclass
class Task:
    command: str
    done: bool = False
    attempts: int = 0


@dataclass
class TaskQueue:
    tasks: list[Task] = field(default_factory=list)

    def run_next(self, confirmed: bool = False) -> bool:
        for task in self.tasks:
            if task.done:
                continue
            if not confirmed:
                return False
            task.attempts += 1
            result = subprocess.run(task.command, shell=True, capture_output=True)
            if result.returncode:
                logger.warning("Task failed: %s", task.command)
                return False
            task.done = True
            return True
        return False
