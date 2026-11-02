import { Body, Controller, Get, Post } from '@nestjs/common';

type CreateTask = { title: string };

@Controller('tasks')
export class TasksController {
    private readonly tasks: string[] = [];

    @Get()
    list() {
        return this.tasks;
    }

    @Post()
    create(@Body() body: CreateTask) {
        if (!body.title.trim()) return { error: 'A title is required' };
        this.tasks.push(body.title);
        return { title: body.title };
    }
}
