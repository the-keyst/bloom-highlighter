<script setup lang="ts">
const { data: tasks, pending, error, refresh } = await useFetch('/api/tasks');

async function reloadTasks() {
    await refresh();
}
</script>

<template>
  <main>
    <button @click="reloadTasks">Refresh</button>
    <p v-if="pending">Loading tasks…</p>
    <p v-else-if="error">Could not load tasks.</p>
    <ul v-else>
      <li v-for="task in tasks" :key="task.id">{{ task.title }}</li>
    </ul>
  </main>
</template>
