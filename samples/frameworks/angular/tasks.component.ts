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

    ngOnInit() {
        this.tasks = [{ title: 'Review changes', done: false }];
    }

    completeNext() {
        const task = this.tasks.find(item => !item.done);
        if (task) task.done = true;
    }
}
