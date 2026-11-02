from fastapi import FastAPI, HTTPException

app = FastAPI()
tasks = [{"id": 1, "title": "Review changes", "done": False}]


@app.get("/tasks")
async def list_tasks():
    return [task for task in tasks if not task["done"]]


@app.post("/tasks/{task_id}/complete")
async def complete_task(task_id: int):
    task = next((item for item in tasks if item["id"] == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task["done"] = True
    return task
