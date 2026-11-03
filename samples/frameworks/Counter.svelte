<script lang="ts">
  import { onMount as mounted } from 'svelte';

  let count = $state(0);
  const doubled = $derived(count * 2);
  const status = $derived(count === 0 ? 'Ready' : `${count} clicks`);
  const isEven = $derived(count % 2 === 0);
  const canIncrement = $derived(count < 1000);
  const countLabel = $derived(`${count} total clicks`);
  const increment = () => { count += 1; };
  const decrement = () => { if (count > 0) count -= 1; };
  const reset = () => { count = 0; };
  const addFive = () => { count += 5; };
  mounted(() => { console.log('Counter mounted'); });
</script>

<main aria-live="polite">
  <h1>{status}</h1>
  <p>Count: {count}; double: {doubled}</p>
  <p>{countLabel}; {isEven ? 'even' : 'odd'}</p>
  {#if count >= 0}
    <button onclick={increment} disabled={!canIncrement}>Add one</button>
    <button onclick={decrement} disabled={count === 0}>Remove one</button>
    <button onclick={reset}>Reset</button>
    <button onclick={addFive}>Add five</button>
  {/if}
</main>

<!-- if throw return { are plain comment text -->
<style>
  main { display: grid; gap: 0.75rem; }
  button { color: #246b45; width: fit-content; }
</style>
