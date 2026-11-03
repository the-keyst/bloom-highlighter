#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>

typedef struct {
    char title[48];
    bool done;
} Task;

typedef struct {
    Task items[16];
    size_t length;
} TaskQueue;

bool add_task(TaskQueue *queue, const char *title) {
    if (queue->length == 16 || title[0] == '\0') return false;
    Task *task = &queue->items[queue->length++];
    snprintf(task->title, sizeof task->title, "%s", title);
    task->done = false;
    return true;
}

bool complete_task(TaskQueue *queue, const char *title) {
    for (size_t index = 0; index < queue->length; index++) {
        Task *task = &queue->items[index];
        if (strcmp(task->title, title) == 0) {
            task->done = true;
            return true;
        }
    }
    return false;
}

void print_pending(const TaskQueue *queue) {
    for (size_t index = 0; index < queue->length; index++) {
        const Task *task = &queue->items[index];
        if (!task->done) printf("- %s\n", task->title);
    }
}

int main(void) {
    TaskQueue queue = { .length = 0 };
    add_task(&queue, "Review changes");
    add_task(&queue, "Publish package");
    if (!complete_task(&queue, "Review changes")) return 1;
    print_pending(&queue);
    return 0;
}
