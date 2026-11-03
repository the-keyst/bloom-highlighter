const std = @import("std");

const Task = struct {
    id: usize,
    title: []const u8,
    done: bool = false,
};

const TaskQueue = struct {
    allocator: std.mem.Allocator,
    tasks: std.ArrayList(Task) = .empty,
    next_id: usize = 1,

    fn init(allocator: std.mem.Allocator) TaskQueue {
        return .{ .allocator = allocator };
    }

    fn deinit(self: *TaskQueue) void {
        self.tasks.deinit(self.allocator);
    }

    fn add(self: *TaskQueue, title: []const u8) !void {
        if (title.len == 0) return;
        try self.tasks.append(self.allocator, .{ .id = self.next_id, .title = title });
        self.next_id += 1;
    }

    fn complete(self: *TaskQueue, id: usize) bool {
        for (self.tasks.items) |*task| {
            if (task.id == id) {
                task.done = true;
                return true;
            }
        }
        return false;
    }

    fn printPending(self: *TaskQueue) void {
        for (self.tasks.items) |task| {
            if (!task.done) std.debug.print("- {s}\n", .{task.title});
        }
    }
};

pub fn main() !void {
    var queue = TaskQueue.init(std.heap.page_allocator);
    defer queue.deinit();
    try queue.add("Review changes");
    try queue.add("Publish package");
    if (!queue.complete(1)) return error.TaskNotFound;
    try queue.add("Write documentation");
    queue.printPending();
}
