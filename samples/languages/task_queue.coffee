class TaskQueue
  constructor: (tasks = []) ->
    @tasks = tasks
    @nextId = tasks.length + 1

  add: (title) ->
    cleanTitle = title.trim()
    return false unless cleanTitle
    id = @nextId
    @nextId += 1
    @tasks.push id: id, title: cleanTitle, done: false
    true

  complete: (id) ->
    task = @tasks.find (item) -> item.id is id
    return false unless task?
    task.done = true
    true

  remove: (id) ->
    index = @tasks.findIndex (task) -> task.id is id
    return false if index < 0
    @tasks.splice index, 1
    true

  pending: -> @tasks.filter (task) -> not task.done
  completedCount: -> @tasks.filter((task) -> task.done).length

  summary: ->
    "#{@pending().length} pending, #{@completedCount()} complete"

queue = new TaskQueue [
  { id: 1, title: 'Review changes', done: false }
  { id: 2, title: 'Publish package', done: false }
]
throw new Error('Task was not found') unless queue.complete(1)
queue.add 'Write documentation'
console.log queue.summary()
queue.pending().forEach (task) -> console.log "- #{task.title}"
