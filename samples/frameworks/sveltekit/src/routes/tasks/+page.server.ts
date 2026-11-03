import type { Actions, PageServerLoad } from '@sveltejs/kit';
import { error, fail } from '@sveltejs/kit';

type Task = { id: number; title: string; done: boolean };

async function readTasks(fetcher: typeof fetch): Promise<Task[]> {
    const response = await fetcher('/api/tasks');
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    return Array.isArray(payload) ? payload as Task[] : [];
}

export const load: PageServerLoad = async ({ fetch }) => {
    const tasks = await readTasks(fetch);
    const pendingCount = tasks.filter(task => !task.done).length;
    const completedCount = tasks.length - pendingCount;
    const hasTasks = tasks.length > 0;
    return { tasks, pendingCount, completedCount, hasTasks };
};

export const actions = {
    create: async ({ request, fetch }) => {
        const form = await request.formData();
        const title = String(form.get('title') ?? '').trim();
        if (!title) return fail(400, { message: 'A title is required' });
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ title }),
        });
        if (!response.ok) error(response.status, 'Could not create task');
        return { created: true };
    },
} satisfies Actions;
