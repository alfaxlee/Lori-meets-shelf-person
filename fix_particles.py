import codecs

with codecs.open('scenes/GameScene.js', 'r', 'utf-8') as f:
    lines = f.readlines()

del lines[993:1024]

with codecs.open('scenes/GameScene.js', 'w', 'utf-8') as f:
    f.writelines(lines)

print("GameScene.js fixed!")
