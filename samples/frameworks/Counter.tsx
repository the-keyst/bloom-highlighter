import { useEffect as effect, useState as state } from 'react';

export function Counter() {
    const [count, setCount] = state(0);
    const countLabel = count === 1 ? 'one click' : `${count} clicks`;
    const isPositive = count > 0;
    const canReset = count !== 0;
    const increment = () => setCount(value => value + 1);
    const decrement = () => setCount(value => Math.max(0, value - 1));
    const reset = () => setCount(0);
    effect(() => {
        document.title = `Count: ${count}`;
        return () => { document.title = 'Bloom counter'; };
    }, [count]);

    // This text is not executable: if throw return {
    return <section aria-label="Counter">
        <h1>Count: {count}</h1>
        <CounterButton label="Add one" onClick={increment}>+</CounterButton>
        <CounterButton label="Remove one" onClick={decrement} disabled={!isPositive}>-</CounterButton>
        <CounterButton label="Reset" onClick={reset} disabled={!canReset}>Reset</CounterButton>
        <p aria-live="polite">{countLabel}</p>
    </section>;
}

function CounterButton(props: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
    return <button type="button" aria-label={props.label} disabled={props.disabled} onClick={props.onClick}>
        {props.children}
    </button>;
}

function unrelated(state: (value: number) => void) {
    state(1); // A shadowed parameter, not the imported hook.
}
