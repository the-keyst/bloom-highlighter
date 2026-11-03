local Queue = {}
Queue.__index = Queue

function Queue.new()
    return setmetatable({ tasks = {}, nextId = 1 }, Queue)
end

function Queue:add(title)
    local cleanTitle = title:match('^%s*(.-)%s*$')
    if cleanTitle == '' then return false end
    table.insert(self.tasks, { id = self.nextId, title = cleanTitle, done = false })
    self.nextId = self.nextId + 1
    return true
end

function Queue:complete(id)
    for _, task in ipairs(self.tasks) do
        if task.id == id then
            task.done = true
            return true
        end
    end
    return false
end

function Queue:pendingTitles()
    local titles = {}
    for _, task in ipairs(self.tasks) do
        if not task.done then table.insert(titles, task.title) end
    end
    return titles
end

function Queue:summary()
    local completeCount = #self.tasks - #self:pendingTitles()
    return string.format('%d pending, %d complete', #self:pendingTitles(), completeCount)
end

local queue = Queue.new()
queue:add('Review changes')
queue:add('Publish package')
assert(queue:complete(1), 'Task was not found')
queue:add('Write documentation')
print(queue:summary())
for _, title in ipairs(queue:pendingTitles()) do print('- ' .. title) end
