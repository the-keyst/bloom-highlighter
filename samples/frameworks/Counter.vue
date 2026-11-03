<script setup lang="ts">
import { computed, ref as signal } from 'vue';

const props = defineProps<{ initial?: number }>();
const count = signal(props.initial ?? 0);
const doubled = computed(() => count.value * 2);
const status = computed(() => count.value === 0 ? 'Ready' : `${count.value} clicks`);
const canDecrement = computed(() => count.value > 0);
const isEven = computed(() => count.value % 2 === 0);
const countLabel = computed(() => `${count.value} total clicks`);
function increment() { count.value += 1; }
function decrement() { if (canDecrement.value) count.value -= 1; }
function reset() { count.value = props.initial ?? 0; }
function addFive() { count.value += 5; }
</script>

<template>
  <main class="counter" aria-live="polite">
    <h1>{{ status }}</h1>
    <p>Count: {{ count }}; double: {{ doubled }}</p>
    <p>{{ countLabel }}; {{ isEven ? 'even' : 'odd' }}</p>
    <button type="button" @click="increment">Add one</button>
    <button type="button" :disabled="!canDecrement" @click="decrement">Remove one</button>
    <button type="button" @click="reset">Reset</button>
    <button type="button" @click="addFive">Add five</button>
  </main>
  <!-- if throw return { are plain comment text -->
</template>

<style scoped>
.counter { color: #246b45; display: grid; gap: 0.75rem; }
button { width: fit-content; padding: 0.4rem 0.75rem; }
</style>
