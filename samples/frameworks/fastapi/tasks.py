from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()
tasks = [{"id": 1, "title": "Review changes", "done": False}]
next_id = 2


class NewTask(BaseModel):
    title: str


def find_task(task_id: int):
    return next((item for item in tasks if item["id"] == task_id), None)


@app.get("/tasks")
async def list_tasks():
    return [task for task in tasks if not task["done"]]


@app.post("/tasks/{task_id}/complete")
async def complete_task(task_id: int):
    task = find_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task["done"] = True
    return task


@app.post("/tasks", status_code=201)
async def create_task(payload: NewTask):
    global next_id
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="A title is required")
    task = {"id": next_id, "title": title, "done": False}
    next_id += 1
    tasks.append(task)
    return task


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: int):
    task = find_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    tasks.remove(task)
