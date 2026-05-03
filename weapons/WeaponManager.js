// === 武器系統模組 ===
// 負責三把武器的彈藥管理、射擊與換彈邏輯

// --- 武器狀態 ---
const weapons = {
    mg: { ammo: 72, maxAmmo: 72, reloading: false, lastFired: 0, fireRate: 100, reloadTime: 3000 },
    sg: { ammo: 5,  maxAmmo: 5,  reloading: false, lastFired: 0, fireRate: 500, reloadTime: 1000 },
    sn: { ammo: 5,  maxAmmo: 5,  reloading: false, lastFired: 0, fireRate: 1500, reloadTime: 5000 },
};

// --- UI 文字參考 ---
let mgText, sgText, snText;

/**
 * 取得武器狀態物件（供外部判斷是否可射擊）
 */
export function getWeaponState() { return weapons; }

/**
 * 建立武器 UI 文字（在 create 階段呼叫）
 * @param {Phaser.Scene} scene - 遊戲場景
 */
export function createWeaponUI(scene) {
    const w = weapons;
    const width = scene.cameras.main.width;
    mgText = scene.add.text(20, 20, `Slingshot: ${w.mg.ammo}/${w.mg.maxAmmo}`, { fontSize: '20px', fill: '#ffff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 });
    sgText = scene.add.text(width - 20, 20, `Shotgun: ${w.sg.ammo}/${w.sg.maxAmmo}`, { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(1, 0);
    snText = scene.add.text(width / 2, 20, `Sniper: ${w.sn.ammo}/${w.sn.maxAmmo}`, { fontSize: '20px', fill: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0);
}

/**
 * 換彈邏輯
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {string} [weaponType] - 指定武器類型，不指定則全部換彈
 */
export function triggerReload(scene, weaponType) {
    const w = weapons;
    if ((!weaponType || weaponType === 'mg') && w.mg.ammo < w.mg.maxAmmo && !w.mg.reloading) {
        w.mg.reloading = true; mgText.setText('RELOADING...');
        scene.time.delayedCall(w.mg.reloadTime, () => { w.mg.ammo = w.mg.maxAmmo; w.mg.reloading = false; mgText.setText(`Slingshot: ${w.mg.ammo}/${w.mg.maxAmmo}`); });
    }
    if ((!weaponType || weaponType === 'sg') && w.sg.ammo < w.sg.maxAmmo && !w.sg.reloading) {
        w.sg.reloading = true; sgText.setText('RELOADING...');
        scene.time.delayedCall(w.sg.reloadTime, () => { w.sg.ammo = w.sg.maxAmmo; w.sg.reloading = false; sgText.setText(`Shotgun: ${w.sg.ammo}/${w.sg.maxAmmo}`); });
    }
    if ((!weaponType || weaponType === 'sn') && w.sn.ammo < w.sn.maxAmmo && !w.sn.reloading) {
        w.sn.reloading = true; snText.setText('RELOADING...');
        scene.time.delayedCall(w.sn.reloadTime, () => { w.sn.ammo = w.sn.maxAmmo; w.sn.reloading = false; snText.setText(`Sniper: ${w.sn.ammo}/${w.sn.maxAmmo}`); });
    }
}

/**
 * 發射彈弓（MG）
 * @param {Phaser.Scene} scene - 遊戲場景
 * @param {Phaser.GameObjects.Sprite} player - 玩家 Sprite
 * @param {Phaser.GameObjects.Sprite} loli - 蘿莉 Sprite
 * @param {Phaser.Physics.Arcade.Group} bulletGroup - 子彈群組
 * @param {Phaser.Input.Pointer} pointer - 滑鼠指標
 * @param {boolean} autoAim - 是否自動瞄準
 */
export function fireMG(scene, player, loli, bulletGroup, pointer, autoAim) {
    const w = weapons.mg;
    let angle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = bulletGroup.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.05).setVelocity(Math.cos(angle) * 1200, Math.sin(angle) * 1200).setCollideWorldBounds(true).setBounce(1);
        bullet.body.onWorldBounds = true; w.ammo--; mgText.setText(`Slingshot: ${w.ammo}/${w.maxAmmo}`);
        if (w.ammo <= 0) triggerReload(scene, 'mg');
    }
}

/**
 * 發射霰彈槍（SG）
 */
export function fireSG(scene, player, loli, bulletGroup, pointer, autoAim) {
    const w = weapons.sg;
    let centerAngle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const spread = Phaser.Math.DegToRad(18);
    for (let i = -2; i <= 2; i++) {
        const angle = centerAngle + (i * spread);
        const bullet = bulletGroup.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
        if (bullet) {
            bullet.setScale(0.05).setVelocity(Math.cos(angle) * 700, Math.sin(angle) * 700).body.allowGravity = false;
            bullet.setCollideWorldBounds(true).setBounce(0.9); bullet.body.onWorldBounds = true;
        }
    }
    // 霰彈槍消耗為 1
    w.ammo -= 1; if (w.ammo < 0) w.ammo = 0; sgText.setText(`Shotgun: ${w.ammo}/${w.maxAmmo}`);
    if (w.ammo <= 0) triggerReload(scene, 'sg');
}

/**
 * 發射狙擊槍（SN）
 */
export function fireSN(scene, player, loli, bulletGroup, pointer, autoAim) {
    const w = weapons.sn;
    let angle = autoAim ? Phaser.Math.Angle.Between(player.x, player.y, loli.x, loli.y) : Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
    const bullet = bulletGroup.create(player.x + Math.cos(angle) * 40, player.y + Math.sin(angle) * 40, 'shabi');
    if (bullet) {
        bullet.setScale(0.1, 0.025).setRotation(angle).setVelocity(Math.cos(angle) * 1500, Math.sin(angle) * 1500).body.allowGravity = false;
        bullet.setCollideWorldBounds(true); bullet.body.onWorldBounds = true; w.ammo--; snText.setText(`Sniper: ${w.ammo}/${w.maxAmmo}`);
        if (w.ammo <= 0) triggerReload(scene, 'sn');
    }
}
