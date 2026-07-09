import json

with open('/tmp/qbit_torrents.json') as f:
    data = json.load(f)

total = len(data)
states = {}
problem_torrents = []
problem_states = {'stalledDL', 'stalledUP', 'error', 'missingFiles', 'metaDL', 'importBlocked'}

for t in data:
    state = t.get('state', 'unknown')
    states[state] = states.get(state, 0) + 1
    if state in problem_states:
        problem_torrents.append((t['name'], state, t.get('progress', 0), t.get('size', 0)))

print(f"Total torrents: {total}")
print("--- State breakdown ---")
for s, c in sorted(states.items()):
    print(f"  {s}: {c}")

if problem_torrents:
    print(f"\nPROBLEM TORRENTS: {len(problem_torrents)}")
    for name, state, progress, size in problem_torrents:
        gb = size / (1024**3)
        print(f"  [{state}] {name} ({progress*100:.0f}%, {gb:.1f} GB)")
else:
    print("\nNo problem torrents.")
