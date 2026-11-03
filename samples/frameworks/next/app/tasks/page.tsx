type Task = { id: number; title: string };
type TaskSummary = { total: number; titles: string[] };

async function loadTasks(): Promise<Task[]> {
    const response = await fetch('https://example.test/api/tasks', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load tasks');
    return response.json();
}

function summarize(tasks: Task[]): TaskSummary {
    return {
        total: tasks.length,
        titles: tasks.map(task => task.title.trim()).filter(Boolean),
    };
}

function TaskList({ tasks }: { tasks: Task[] }) {
    if (tasks.length === 0) return <p>No tasks are waiting.</p>;
    return <ul>{tasks.map(task => <li key={task.id}>{task.title}</li>)}</ul>;
}

export default async function TasksPage() {
    const tasks = await loadTasks();
    const summary = summarize(tasks);

    return (
        <main>
            <h1>Tasks</h1>
            <p>{summary.total} tasks in this list</p>
            <TaskList tasks={tasks} />
            <footer aria-label="Task summary">
                Loaded {summary.titles.length} valid task titles.
            </footer>
        </main>
    );
}
