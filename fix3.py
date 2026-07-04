import codecs

with codecs.open('scenes/GameScene.js', 'r', 'utf-8') as f:
    lines = f.readlines()

head = lines[:51]
tail = lines[59:]

with codecs.open('fix_create.js', 'r', 'utf-8') as f:
    fix_code = f.read()

with codecs.open('scenes/GameScene.js', 'w', 'utf-8') as f:
    f.writelines(head)
    f.write(fix_code + "\n")
    f.writelines(tail)

print("GameScene.js repaired correctly!")
