type Task = { id: number; title: string };

async function loadTasks(): Promise<Task[]> {
    const response = await fetch('https://example.test/api/tasks', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load tasks');
    return response.json();
}

export default async function TasksPage() {
    const tasks = await loadTasks();

    return (
        <main>
            <h1>Tasks</h1>
            <ul>{tasks.map(task => <li key={task.id}>{task.title}</li>)}</ul>
        </main>
    );
}
