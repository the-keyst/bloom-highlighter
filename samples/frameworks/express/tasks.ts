import { Router } from 'express';

type Task = { id: number; title: string; done: boolean };

const tasks: Task[] = [
    { id: 1, title: 'Review changes', done: false },
    { id: 2, title: 'Publish package', done: false },
];

export const taskRoutes = Router();

taskRoutes.get('/tasks', (_request, response) => {
    response.json(tasks.filter(task => !task.done));
});

taskRoutes.post('/tasks/:id/complete', (request, response) => {
    const task = tasks.find(item => item.id === Number(request.params.id));
    if (!task) return response.sendStatus(404);

    task.done = true;
    return response.sendStatus(204);
});
