import type { PageServerLoad } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch }) => {
    const response = await fetch('/api/tasks');
    if (!response.ok) return { tasks: [] };

    const tasks = await response.json();
    return { tasks };
};
