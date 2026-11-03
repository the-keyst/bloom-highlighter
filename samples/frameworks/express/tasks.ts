import { Router } from 'express';

type Task = { id: number; title: string; done: boolean };

const tasks: Task[] = [
    { id: 1, title: 'Review changes', done: false },
    { id: 2, title: 'Publish package', done: false },
];

export const taskRoutes = Router();

function taskIdFrom(value: string): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

taskRoutes.get('/tasks', (_request, response) => {
    response.json(tasks.filter(task => !task.done));
});

taskRoutes.post('/tasks/:id/complete', (request, response) => {
    const id = taskIdFrom(request.params.id);
    if (id === null) return response.sendStatus(400);
    const task = tasks.find(item => item.id === id);
    if (!task) return response.sendStatus(404);

    task.done = true;
    return response.sendStatus(204);
});

taskRoutes.post('/tasks', (request, response) => {
    const title = String(request.body?.title ?? '').trim();
    if (!title) return response.status(400).json({ error: 'A title is required' });
    const nextId = Math.max(0, ...tasks.map(task => task.id)) + 1;
    const task: Task = { id: nextId, title, done: false };
    tasks.push(task);
    return response.status(201).json(task);
});

taskRoutes.delete('/tasks/:id', (request, response) => {
    const id = taskIdFrom(request.params.id);
    const index = tasks.findIndex(task => task.id === id);
    if (index < 0) return response.sendStatus(404);
    tasks.splice(index, 1);
    return response.sendStatus(204);
});
