<script setup lang="ts">
const { data: tasks, pending, error, refresh } = await useFetch('/api/tasks');
const newTitle = ref('');
const saving = ref(false);

const visibleTasks = computed(() => (tasks.value ?? []).filter(task => task.title.trim()));

async function reloadTasks() {
    await refresh();
}

async function addTask() {
    const title = newTitle.value.trim();
    if (!title || saving.value) return;
    saving.value = true;
    try {
        await $fetch('/api/tasks', { method: 'POST', body: { title } });
        newTitle.value = '';
        await refresh();
    } finally {
        saving.value = false;
    }
}
</script>

<template>
  <main>
    <button @click="reloadTasks">Refresh</button>
    <form @submit.prevent="addTask">
      <label for="task-title">New task</label>
      <input id="task-title" v-model="newTitle" maxlength="120" />
      <button type="submit" :disabled="saving || !newTitle.trim()">Add task</button>
    </form>
    <p v-if="pending">Loading tasks…</p>
    <p v-else-if="error">Could not load tasks.</p>
    <ul v-else>
      <li v-for="task in visibleTasks" :key="task.id">{{ task.title }}</li>
    </ul>
  </main>
</template>
