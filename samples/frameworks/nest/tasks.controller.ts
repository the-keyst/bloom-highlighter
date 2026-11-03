import { Body, Controller, Get, Param, Post } from '@nestjs/common';

type CreateTask = { title: string };
type Task = { id: number; title: string; done: boolean };

@Controller('tasks')
export class TasksController {
    private readonly tasks: Task[] = [];
    private nextId = 1;

    @Get()
    list() {
        return this.tasks;
    }

    @Get('summary')
    summary() {
        const completed = this.tasks.filter(task => task.done).length;
        return { total: this.tasks.length, completed };
    }

    @Post()
    create(@Body() body: CreateTask) {
        if (!body.title.trim()) return { error: 'A title is required' };
        const task = { id: this.nextId++, title: body.title.trim(), done: false };
        this.tasks.push(task);
        return task;
    }

    @Post(':id/complete')
    complete(@Param('id') rawId: string) {
        const id = Number(rawId);
        if (!Number.isInteger(id)) return { error: 'Task id must be an integer' };
        const task = this.tasks.find(item => item.id === id);
        if (!task) return { error: 'Task was not found' };
        task.done = true;
        return task;
    }
}
