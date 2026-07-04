import codecs

with codecs.open('scenes/GameScene.js', 'r', 'utf-8') as f:
    lines = f.readlines()

head = lines[:1140]
tail = lines[1654:]

with codecs.open('pluto.js', 'r', 'utf-8') as f:
    pluto_code = f.read()

with codecs.open('scenes/GameScene.js', 'w', 'utf-8') as f:
    f.writelines(head)
    f.write(pluto_code + "\n")
    f.writelines(tail)

print("GameScene.js repaired with correct backticks and UTF-8!")
