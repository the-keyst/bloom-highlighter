function task_queue()
tasks = struct('id', {1, 2}, ...
    'title', {'Review changes', 'Publish package'}, ...
    'done', {false, false});
tasks = add_task(tasks, 'Write documentation');
[tasks, found] = complete_task(tasks, 1);
if ~found
    error('Task was not found');
end
labels = pending_titles(tasks);
fprintf('%d pending tasks\n', numel(labels));
for index = 1:numel(labels)
    fprintf('- %s\n', labels{index});
end
fprintf('%d completed tasks\n', completed_count(tasks));
end

function tasks = add_task(tasks, title)
clean_title = strtrim(title);
if isempty(clean_title)
    return;
end
next_id = max([tasks.id]) + 1;
tasks(end + 1) = struct('id', next_id, ...
    'title', clean_title, 'done', false);
end

function [tasks, found] = complete_task(tasks, id)
found = false;
for index = 1:numel(tasks)
    if tasks(index).id == id
        tasks(index).done = true;
        found = true;
        return;
    end
end
end

function labels = pending_titles(tasks)
pending = tasks(~[tasks.done]);
labels = {pending.title};
end

function count = completed_count(tasks)
count = sum([tasks.done]);
end
