import codecs

with codecs.open('scenes/GameScene.js', 'r', 'utf-8') as f:
    lines = f.readlines()

head = lines[:1144]
tail = lines[1811:]

pluto_code = """function showDeathSelectionScreen(scene) {
    // ?????????
    if (scene.physics) {
        scene.physics.pause();
    }
    scene.scene.pause();

    // ?????????? DOM ??,???????
    const selectContainer = document.createElement('div');
    selectContainer.className = 'death-select-container';
    
    // ???? inline style ?????/?????????????????
    Object.assign(selectContainer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000', // ????
        color: '#ffd700', // ?????
        fontFamily: "'Courier New', Courier, monospace, 'Microsoft JhengHei', sans-serif",
        overflowY: 'scroll', // ??????,?????????????
        zIndex: '10005', // ???? Dom ??
        boxSizing: 'border-box',
        scrollBehavior: 'smooth'
    });

    // ???????? (12000px),?????????????? 10 ?
    const scrollContent = document.createElement('div');
    Object.assign(scrollContent.style, {
        width: '100%',
        height: '12000px', // ????
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    });
    selectContainer.appendChild(scrollContent);

    // === ???? (0px - 100vh):???????/???? ===
    const firstPage = document.createElement('div');
    Object.assign(firstPage.style, {
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: '0px',
        left: '0px',
        padding: '40px',
        boxSizing: 'border-box'
    });
    scrollContent.appendChild(firstPage);

    // ???????? (???????)
    const textElement = document.createElement('div');
    Object.assign(textElement.style, {
        fontSize: '28px',
        lineHeight: '1.6',
        maxWidth: '800px',
        textAlign: 'center',
        marginBottom: '50px',
        minHeight: '150px', // ??????,???????????
        textShadow: '0 0 10px rgba(255, 215, 0, 0.5)', // ??????
        fontWeight: 'bold'
    });
    firstPage.appendChild(textElement);

    // ?????? (???????)
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex',
        gap: '40px',
        opacity: '0',
        transition: 'opacity 0.5s ease'
    });

    // ????
    const crashBtn = document.createElement('button');
    crashBtn.innerText = '??';
    Object.assign(crashBtn.style, {
        padding: '12px 36px',
        fontSize: '22px',
        backgroundColor: 'transparent',
        color: '#ff4d4d', // ????
        border: '3px solid #ff4d4d',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 8px rgba(255, 77, 77, 0.3)'
    });
    // ??????
    crashBtn.onmouseover = () => {
        crashBtn.style.backgroundColor = '#ff4d4d';
        crashBtn.style.color = '#000000';
        crashBtn.style.boxShadow = '0 0 20px #ff4d4d';
    };
    crashBtn.onmouseout = () => {
        crashBtn.style.backgroundColor = 'transparent';
        crashBtn.style.color = '#ff4d4d';
        crashBtn.style.boxShadow = '0 0 8px rgba(255, 77, 77, 0.3)';
    };

    // ????
    const deathBtn = document.createElement('button');
    deathBtn.innerText = '??';
    Object.assign(deathBtn.style, {
        padding: '12px 36px',
        fontSize: '22px',
        backgroundColor: 'transparent',
        color: '#ffd700', // ????
        border: '3px solid #ffd700',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 8px rgba(255, 215, 0, 0.3)'
    });
    // ??????
    deathBtn.onmouseover = () => {
        deathBtn.style.backgroundColor = '#ffd700';
        deathBtn.style.color = '#000000';
        deathBtn.style.boxShadow = '0 0 20px #ffd700';
    };
    deathBtn.onmouseout = () => {
        deathBtn.style.backgroundColor = 'transparent';
        deathBtn.style.color = '#ffd700';
        deathBtn.style.boxShadow = '0 0 8px rgba(255, 215, 0, 0.3)';
    };

    btnContainer.appendChild(crashBtn);
    btnContainer.appendChild(deathBtn);
    firstPage.appendChild(btnContainer);
    document.body.appendChild(selectContainer);

    // === ????:????????? ===
    const addScrollPrompt = (text, topY) => {
        const prompt = document.createElement('div');
        prompt.innerText = text;
        Object.assign(prompt.style, {
            position: 'absolute',
            top: topY + 'px',
            fontSize: '24px',
            color: '#444444', // ???,????????
            textShadow: '0 0 5px rgba(255, 215, 0, 0.1)',
            textAlign: 'center',
            width: '100%',
            fontWeight: 'bold'
        });
        scrollContent.appendChild(prompt);
    };

    addScrollPrompt("? ????...", 900);
    addScrollPrompt("(??????????????...)", 2000);
    addScrollPrompt("(???,????????????...)", 4000);
    addScrollPrompt("(??????... ?????????????...)", 6000);
    addScrollPrompt("(???????,?????????????...)", 8000);
    addScrollPrompt("(????!?????????!)", 10000);

    // === ????? (11000px - 12000px):????????????? ===
    const lastPage = document.createElement('div');
    Object.assign(lastPage.style, {
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: '11000px',
        left: '0px',
        boxSizing: 'border-box'
    });
    scrollContent.appendChild(lastPage);

    // ???????
    const plutoBtn = document.createElement('button');
    plutoBtn.innerText = '?????';
    Object.assign(plutoBtn.style, {
        padding: '20px 60px',
        fontSize: '32px',
        backgroundColor: 'transparent',
        color: '#9400d3', // ?????????
        border: '4px solid #9400d3',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 15px rgba(148, 0, 211, 0.4)',
        textShadow: '0 0 5px rgba(148, 0, 211, 0.5)'
    });
    // ??????
    plutoBtn.onmouseover = () => {
        plutoBtn.style.backgroundColor = '#9400d3';
        plutoBtn.style.color = '#ffffff';
        plutoBtn.style.boxShadow = '0 0 35px #9400d3';
    };
    plutoBtn.onmouseout = () => {
        plutoBtn.style.backgroundColor = 'transparent';
        plutoBtn.style.color = '#9400d3';
        plutoBtn.style.boxShadow = '0 0 15px rgba(148, 0, 211, 0.4)';
    };
    lastPage.appendChild(plutoBtn);

    // ??????
    const fullText = "?????,???????????????,???????(??????),????????????????,??????";
    let index = 0;
    
    const typeWriter = () => {
        if (index < fullText.length) {
            textElement.textContent += fullText.charAt(index);
            index++;
            setTimeout(typeWriter, 50); // ? 50 ??????
        } else {
            // ???????????
            btnContainer.style.opacity = '1';
        }
    };

    // ??????
    typeWriter();

    // ??????
    crashBtn.onclick = () => {
        const result = 1 / 0;
        console.log("Division by zero result: " + result);
        
        setTimeout(() => {
            throw new Error("DivByZeroCrash: " + result);
        }, 0);

        while(true) {}
    };

    // ??????
    deathBtn.onclick = () => {
        selectContainer.remove();
        if (scene.triggerCrash) {
            scene.triggerCrash(true);
        }
    };

    // ??:???????!(?????????? + ???????)
    plutoBtn.onclick = () => {
        // 1. ????????????????
        selectContainer.style.overflowY = 'hidden';
        selectContainer.scrollTop = 0;
        
        // 2. ?? scrollContent ??????,??????????
        scrollContent.innerHTML = '';
        scrollContent.style.height = '100vh'; // ????????????

        // 3. ???????????? CSS ?? (???/????)
        if (!document.getElementById('pluto-burning-styles')) {
            const styles = document.createElement('style');
            styles.id = 'pluto-burning-styles';
            styles.innerText = 
                @keyframes purple-fire {
                    0% { text-shadow: 0 0 8px #ba55d3, 0 -3px 10px #9400d3, 0 -6px 18px #8a2be2, 0 -10px 30px #4b0082; }
                    50% { text-shadow: 0 0 12px #ba55d3, 0 -5px 15px #9400d3, 0 -10px 25px #8a2be2, 0 -15px 40px #4b0082; }
                    100% { text-shadow: 0 0 8px #ba55d3, 0 -3px 10px #9400d3, 0 -6px 18px #8a2be2, 0 -10px 30px #4b0082; }
                }
                .burning-line {
                    color: #ffffff;
                    font-weight: bold;
                    font-size: 38px;
                    text-align: center;
                    opacity: 0;
                    transform: scale(0.8);
                    transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    margin: 25px 0;
                    letter-spacing: 5px;
                    font-family: 'Microsoft JhengHei', sans-serif;
                }
                .burning-line.active {
                    opacity: 1;
                    transform: scale(1.0);
                    animation: purple-fire 0.8s infinite alternate;
                }
                .burning-line.highlight {
                    font-size: 56px;
                    color: #ffb3ff;
                    letter-spacing: 8px;
                    margin-top: 40px;
                }
                @keyframes purple-fire-strong {
                    0% { text-shadow: 0 0 12px #ff00ff, 0 -5px 18px #9400d3, 0 -10px 28px #8a2be2, 0 -15px 45px #4b0082; }
                    50% { text-shadow: 0 0 20px #ff00ff, 0 -8px 25px #9400d3, 0 -15px 35px #8a2be2, 0 -22px 60px #4b0082; }
                    100% { text-shadow: 0 0 12px #ff00ff, 0 -5px 18px #9400d3, 0 -10px 28px #8a2be2, 0 -15px 45px #4b0082; }
                }
                .burning-line.highlight.active {
                    animation: purple-fire-strong 0.6s infinite alternate;
                }
            ;
            document.head.appendChild(styles);
        }

        // 4. ???????????
        const textContainer = document.createElement('div');
        Object.assign(textContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100vh',
            boxSizing: 'border-box'
        });
        scrollContent.appendChild(textContainer);

        // ????????
        const lyrics = [
            { text: "??????", delay: 800, highlight: false },
            { text: "?????????", delay: 2000, highlight: false },
            { text: "?????????", delay: 3200, highlight: false },
            { text: "!!??????!!", delay: 4500, highlight: true }
        ];

        lyrics.forEach(item => {
            scene.time.delayedCall(item.delay, () => {
                const lineDiv = document.createElement('div');
                lineDiv.innerText = item.text;
                lineDiv.className = 'burning-line' + (item.highlight ? ' highlight' : '');
                textContainer.appendChild(lineDiv);
                
                // ????????? CSS ??????
                setTimeout(() => {
                    lineDiv.classList.add('active');
                }, 50);
            });
        });

        // 5. ??????? (6.5?),??????????????
        scene.time.delayedCall(6500, () => {
            // ?? DOM ??
            selectContainer.remove();

            // ???????
            if (scene.physics) {
                scene.physics.resume();
            }
            scene.scene.resume();
            scene.isCinematicActive = false;

            // ?????????
            if (player && player.body) {
                player.body.allowGravity = true;
            }
            playerState.isInvincible = true;
            scene.time.delayedCall(4000, () => {
                playerState.isInvincible = false;
            });

            // ?????????????????? UI
            if (ground) ground.setVisible(true);
            if (platforms) platforms.setVisible(true);
            if (typeof setWeaponUIVisible === 'function') {
                setWeaponUIVisible(true);
            }

            // ??????????
            triggerSuperPlutoExplosion(scene);
        });
    };
}

/**
 * ????????? -- ???????Yeah???
 * ????:?????????????????????????????????
 */
function triggerSuperPlutoExplosion(scene) {
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;

    // ???????????? (????? Yeah)
    const beamGfx = scene.add.graphics();
    beamGfx.setDepth(10001);

    // ????????? (???)
    const flashRect = scene.add.graphics();
    flashRect.setDepth(10002);
    flashRect.fillStyle(0x9400d3, 0.95);
    flashRect.fillRect(0, 0, width, height);

    // ????????
    if (!scene.textures.exists('plutoParticle')) {
        const pGfx = scene.make.graphics({ x: 0, y: 0, add: false });
        pGfx.fillStyle(0xffffff, 1.0);
        pGfx.fillCircle(4, 4, 4);
        pGfx.generateTexture('plutoParticle', 8, 8);
    }
    const particles = scene.add.particles('plutoParticle');
    particles.setDepth(10003);

    // ????? 1:Yeah ????? (?????????)
    const emitter1 = particles.createEmitter({
        x: 150, // ??Yeah ???????????? 150
        y: height - 110,
        speed: { min: 200, max: 950 },
        angle: { min: 0, max: 360 },
        scale: { start: 5.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1500,
        quantity: 150,
        frequency: -1, // ?????
        tint: 0x9400d3
    });

    // ????? 2:Yeah ????? (??????)
    const emitter2 = particles.createEmitter({
        x: 150,
        y: height - 110,
        speed: { min: 100, max: 750 },
        angle: { min: 0, max: 360 },
        scale: { start: 4.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1300,
        quantity: 100,
        frequency: -1,
        tint: 0xff00ff
    });

    // ????? 3:??????????????
    const emitter3 = particles.createEmitter({
        x: width / 2, // ?????
        y: height - 110,
        speed: { min: 300, max: 1000 },
        angle: { min: 160, max: 200 }, // ?????
        scale: { start: 3.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 1100,
        quantity: 80,
        frequency: -1,
        tint: 0x00ffff
    });

    // ??????
    emitter1.explode();
    emitter2.explode();
    emitter3.explode();

    // ??????????? ( cameras.main.shake )
    scene.cameras.main.flash(450, 148, 0, 211); // ????
    scene.cameras.main.shake(1800, 0.05); // ???? 1.8 ?

    // ??????????,??????????
    scene.time.delayedCall(300, () => {
        scene.cameras.main.flash(300, 255, 0, 255); // ????
    });
    scene.time.delayedCall(600, () => {
        scene.cameras.main.flash(300, 0, 255, 255); // ????
    });

    // ?????????????
    let beamWidth = 20;
    const updateBeam = () => {
        if (!beamGfx.active) return;
        beamGfx.clear();
        // ???????
        beamGfx.fillStyle(0x4b0082, 0.35);
        beamGfx.fillRect(150, height - 110 - beamWidth - 25, width / 2 - 150, beamWidth * 2 + 50);
        // ???
        beamGfx.fillStyle(0x9400d3, 0.85);
        beamGfx.fillRect(150, height - 110 - beamWidth, width / 2 - 150, beamWidth * 2);
        // ???? (?????)
        beamGfx.fillStyle(0xffffff, 0.95);
        beamGfx.fillRect(150, height - 110 - beamWidth / 2, width / 2 - 150, beamWidth);
    };
    scene.events.on('update', updateBeam);

    // ????????
    scene.tweens.add({
        targets: { w: 20 },
        w: 120, // ??? 120px ??
        duration: 400,
        onUpdate: (tween, target) => {
            beamWidth = target.w;
        }
    });

    // ????????
    scene.tweens.add({
        targets: flashRect,
        alpha: 0,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => {
            flashRect.destroy();
        }
    });

    // ????????
    scene.tweens.add({
        targets: beamGfx,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
            scene.events.off('update', updateBeam);
            beamGfx.destroy();
            particles.destroy();
        }
    });

    // ????Yeah????
    handleYeahHit(scene, null, 0, 0, 99999, null, null);
}
"""

with codecs.open('scenes/GameScene.js', 'w', 'utf-8') as f:
    f.writelines(head)
    f.write(pluto_code + "\n")
    f.writelines(tail)

print("GameScene.js repaired successfully!")
