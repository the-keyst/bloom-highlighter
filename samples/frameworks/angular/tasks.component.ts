import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

type Task = { title: string; done: boolean };

@Component({
    selector: 'app-tasks',
    standalone: true,
    imports: [CommonModule],
    template: `
        <button (click)="completeNext()">Complete next task</button>
        <p *ngFor="let task of tasks">{{ task.title }}</p>
    `,
})
export class TasksComponent implements OnInit {
    tasks: Task[] = [];
    filter = '';

    get pendingTasks() {
        return this.tasks.filter(task => !task.done);
    }

    get completedCount() {
        return this.tasks.length - this.pendingTasks.length;
    }

    ngOnInit() {
        this.tasks = [{ title: 'Review changes', done: false }];
    }

    completeNext() {
        const task = this.tasks.find(item => !item.done);
        if (task) task.done = true;
    }

    addTask(title: string) {
        const cleanTitle = title.trim();
        if (!cleanTitle) return;
        this.tasks = [...this.tasks, { title: cleanTitle, done: false }];
    }

    clearCompleted() {
        this.tasks = this.pendingTasks;
    }

    setFilter(value: string) {
        this.filter = value.trim().toLowerCase();
    }
}
