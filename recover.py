import json

with open('recovered_replacements.json', 'r', encoding='utf-8') as f:
    replacements = json.load(f)

with open('scenes/GameScene.js', 'r', encoding='utf-8') as f:
    content = f.read()

for i, rep in enumerate(replacements):
    chunks = rep.get('ReplacementChunks')
    if chunks:
        for chunk in chunks:
            target = chunk.get('TargetContent')
            replacement = chunk.get('ReplacementContent', '')
            if target and target in content:
                content = content.replace(target, replacement, 1)
                print(f"Applied multi_replace chunk at {chunk.get('StartLine')}")
            else:
                print(f"Skipped multi_replace chunk at {chunk.get('StartLine')}")
    else:
        target = rep.get('TargetContent')
        replacement = rep.get('ReplacementContent', '')
        if target and target in content:
            content = content.replace(target, replacement, 1)
            print(f"Applied replacement at {rep.get('StartLine')} (index {i})")
        else:
            print(f"Skipped replacement at {rep.get('StartLine')} (index {i})")

with open('scenes/GameScene.js', 'w', encoding='utf-8') as f:
    f.write(content)
