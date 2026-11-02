import 'package:flutter/material.dart';

class Counter extends StatefulWidget {
  const Counter({super.key});

  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;
  bool _loading = false;
  static const _resetDelay = Duration(milliseconds: 250);

  Future<void> _reset() async {
    setState(() => _loading = true);
    try {
      await Future<void>.delayed(_resetDelay);
      if (!mounted) return;
      setState(() => _count = 0);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bloom counter')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Count: $_count'),
            Text(_count >= 5 ? 'Goal reached' : 'Keep going'),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _loading ? null : () => setState(() => _count++),
              child: const Text('Increment'),
            ),
            TextButton(
              onPressed: _loading ? null : _reset,
              child: Text(_loading ? 'Resetting…' : 'Reset'),
            ),
          ],
        ),
      ),
    );
  }
}
