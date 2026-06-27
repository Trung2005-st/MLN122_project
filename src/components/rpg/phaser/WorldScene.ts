import Phaser from "phaser";
import { avatarPosition } from "@/lib/map-zones";
import {
  FRAME,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUB_POS,
  PLAYER_TINTS,
  WORLD_ZONES,
} from "@/lib/phaser-config";
import type {
  Allocation,
  AllocationBucket,
  CharacterClass,
  Player,
} from "@/lib/types";

export interface WorldSyncPayload {
  allocation: Allocation;
  players: Record<string, Player>;
  currentPlayerId: string;
  phase: string;
  disabled?: boolean;
  showAll?: boolean;
  onAllocate?: (zone: AllocationBucket, amount: number) => void;
}

export class WorldScene extends Phaser.Scene {
  private syncData: WorldSyncPayload | null = null;
  private playerSprites = new Map<
    string,
    Phaser.Physics.Arcade.Sprite & { label?: Phaser.GameObjects.Text }
  >();
  private zoneGraphics: Phaser.GameObjects.Graphics[] = [];
  private zoneBadges = new Map<AllocationBucket, Phaser.GameObjects.Text>();
  private walletText?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super({ key: "WorldScene" });
  }

  preload() {
    this.load.spritesheet("dude", "/rpg/dude.png", {
      frameWidth: FRAME.w,
      frameHeight: FRAME.h,
    });
    this.load.image("tiles", "/rpg/tiles.png");
  }

  create() {
    this.drawTilemap();
    this.drawPaths();
    this.createAnimations();
    this.createZones();
    this.createWalletUI();

    this.cursors = this.input.keyboard?.createCursorKeys();
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey("W"),
        A: this.input.keyboard.addKey("A"),
        S: this.input.keyboard.addKey("S"),
        D: this.input.keyboard.addKey("D"),
      };
    }

    this.game.events.on("sync-world", this.applySync, this);
    if (this.syncData) this.applySync(this.syncData);
  }

  setSyncData(data: WorldSyncPayload) {
    this.syncData = data;
    if (this.scene.isActive()) this.applySync(data);
  }

  private drawTilemap() {
    const tileSize = 32;
    const cols = Math.ceil(GAME_WIDTH / tileSize);
    const rows = Math.ceil(GAME_HEIGHT / tileSize);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const frame = ((x + y) % 3) + 28;
        const tile = this.add.image(
          x * tileSize + tileSize / 2,
          y * tileSize + tileSize / 2,
          "tiles",
          frame
        );
        tile.setDisplaySize(tileSize, tileSize);
        tile.setDepth(0);
        tile.setAlpha(0.85);
      }
    }
    const plaza = this.add.rectangle(
      HUB_POS.x,
      HUB_POS.y,
      140,
      100,
      0x222233,
      0.5
    );
    plaza.setStrokeStyle(2, 0xffffff, 0.15);
    plaza.setDepth(1);
  }

  private drawPaths() {
    const g = this.add.graphics();
    g.lineStyle(3, 0xffffff, 0.12);
    for (const z of WORLD_ZONES) {
      g.lineBetween(HUB_POS.x, HUB_POS.y, z.x, z.y);
    }
    g.setDepth(2);
  }

  private createAnimations() {
    if (this.anims.exists("walk-down")) return;
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("dude", { start: 4, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("dude", { start: 8, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("dude", { start: 12, end: 15 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "idle",
      frames: [{ key: "dude", frame: 0 }],
      frameRate: 1,
    });
  }

  private createZones() {
    for (const zone of WORLD_ZONES) {
      const ring = this.add.graphics();
      ring.setDepth(5);
      this.zoneGraphics.push(ring);

      const hit = this.add.circle(zone.x, zone.y, 52, zone.color, 0.15);
      hit.setStrokeStyle(2, zone.color, 0.6);
      hit.setDepth(6);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => hit.setAlpha(0.35));
      hit.on("pointerout", () => hit.setAlpha(0.15));
      hit.on("pointerdown", () => {
        const data = this.syncData;
        if (!data?.onAllocate || data.disabled || data.phase !== "allocating")
          return;
        const total = Object.values(data.allocation).reduce((a, b) => a + b, 0);
        if (total >= 100) return;
        data.onAllocate(zone.id, Math.min(10, 100 - total));
      });

      this.add
        .text(zone.x, zone.y + 62, zone.label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(7);

      const badge = this.add
        .text(zone.x, zone.y - 58, "", {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#000000",
          backgroundColor: "#ffffff",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(8)
        .setVisible(false);
      this.zoneBadges.set(zone.id, badge);
    }
  }

  private createWalletUI() {
    this.walletText = this.add
      .text(16, 16, "", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#f0b429",
        backgroundColor: "#000000cc",
        padding: { x: 12, y: 8 },
      })
      .setDepth(20)
      .setScrollFactor(0);
  }

  private applySync(data: WorldSyncPayload) {
    this.syncData = data;
    const isAllocating = data.phase === "allocating" && !data.disabled;
    const hideOthers =
      data.phase === "allocating" || data.phase === "briefing";

    for (const zone of WORLD_ZONES) {
      const badge = this.zoneBadges.get(zone.id)!;
      const amount = data.allocation[zone.id];
      if (amount > 0 && (isAllocating || data.showAll)) {
        badge.setText(String(amount)).setVisible(true);
      } else if (!isAllocating && !data.showAll) {
        badge.setVisible(false);
      } else {
        badge.setText(amount > 0 ? String(amount) : "").setVisible(amount > 0);
      }

      const g = this.zoneGraphics[WORLD_ZONES.indexOf(zone)];
      g.clear();
      if (amount > 0 && isAllocating) {
        g.lineStyle(3, zone.color, 0.8);
        g.strokeCircle(zone.x, zone.y, 56 + Math.sin(this.time.now / 300) * 4);
      }
    }

    if (this.walletText) {
      const total = Object.values(data.allocation).reduce((a, b) => a + b, 0);
      this.walletText.setVisible(isAllocating);
      if (isAllocating) {
        this.walletText.setText(`💰 Vốn còn: ${100 - total} / 100`);
      }
    }

    const playerIds = Object.keys(data.players);
    for (const id of playerIds) {
      const p = data.players[id];
      const isSelf = id === data.currentPlayerId;
      const hidden = hideOthers && !isSelf;

      let posPct: { x: number; y: number };
      if (hidden) {
        posPct = { x: 50, y: 50 };
      } else if (isSelf) {
        posPct = avatarPosition(data.allocation);
      } else if (p.allocation) {
        posPct = avatarPosition(p.allocation);
      } else {
        posPct = { x: 50, y: 50 };
      }

      const idx = playerIds.indexOf(id);
      const wx = (posPct.x / 100) * GAME_WIDTH + ((idx % 3) - 1) * 28;
      const wy = (posPct.y / 100) * GAME_HEIGHT + (Math.floor(idx / 3) - 1) * 20;

      this.upsertPlayer(id, p.name, p.characterClass, wx, wy, isSelf, hidden, idx);
    }

    for (const id of Array.from(this.playerSprites.keys())) {
      if (!data.players[id]) {
        const spr = this.playerSprites.get(id);
        spr?.label?.destroy();
        spr?.destroy();
        this.playerSprites.delete(id);
      }
    }
  }

  private upsertPlayer(
    id: string,
    name: string,
    _cls: CharacterClass | undefined,
    tx: number,
    ty: number,
    isSelf: boolean,
    hidden: boolean,
    tintIdx: number
  ) {
    let sprite = this.playerSprites.get(id);
    if (!sprite) {
      sprite = this.physics.add.sprite(HUB_POS.x, HUB_POS.y, "dude", 0);
      sprite.setDepth(10 + tintIdx);
      sprite.setCollideWorldBounds(true);
      sprite.setTint(PLAYER_TINTS[tintIdx % PLAYER_TINTS.length]);
      const label = this.add
        .text(0, 0, name.slice(0, 10), {
          fontSize: "11px",
          color: isSelf ? "#000" : "#fff",
          backgroundColor: isSelf ? "#ffffff" : "#000000aa",
          padding: { x: 4, y: 2 },
        })
        .setDepth(15 + tintIdx);
      (sprite as typeof sprite & { label: Phaser.GameObjects.Text }).label =
        label;
      this.playerSprites.set(id, sprite);
    }

    const lbl = sprite.label!;
    lbl.setText(hidden ? "???" : name.slice(0, 10));
    lbl.setPosition(sprite.x - lbl.width / 2, sprite.y - 38);

    const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, tx, ty);
    if (dist > 8) {
      this.moveSpriteTo(sprite, tx, ty);
    } else if (!sprite.body?.velocity.length()) {
      sprite.anims.play("idle", true);
    }

    sprite.setAlpha(hidden ? 0.35 : 1);
    sprite.setScale(isSelf ? 1.15 : 1);
  }

  private moveSpriteTo(
    sprite: Phaser.Physics.Arcade.Sprite & { label?: Phaser.GameObjects.Text },
    tx: number,
    ty: number
  ) {
    const dx = tx - sprite.x;
    const dy = ty - sprite.y;
    let anim = "walk-down";
    if (Math.abs(dx) > Math.abs(dy)) {
      anim = dx > 0 ? "walk-right" : "walk-left";
    } else {
      anim = dy > 0 ? "walk-down" : "walk-up";
    }
    sprite.anims.play(anim, true);
    this.tweens.killTweensOf(sprite);

    this.tweens.add({
      targets: sprite,
      x: tx,
      y: ty,
      duration: Math.min(
        900,
        300 + Phaser.Math.Distance.Between(sprite.x, sprite.y, tx, ty)
      ),
      ease: "Sine.easeInOut",
      onUpdate: () => {
        if (sprite.label) {
          sprite.label.setPosition(
            sprite.x - sprite.label.width / 2,
            sprite.y - 38
          );
        }
      },
      onComplete: () => {
        sprite.setVelocity(0);
        sprite.anims.play("idle", true);
      },
    });
  }

  update() {
    const data = this.syncData;
    if (!data || data.phase !== "allocating" || data.disabled) return;

    const self = this.playerSprites.get(data.currentPlayerId);
    if (!self?.body) return;

    const speed = 160;
    let vx = 0;
    let vy = 0;
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) vx = -speed;
    else if (this.cursors?.right.isDown || this.wasd?.D.isDown) vx = speed;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) vy = -speed;
    else if (this.cursors?.down.isDown || this.wasd?.S.isDown) vy = speed;

    if (vx !== 0 || vy !== 0) {
      this.tweens.killTweensOf(self);
      self.setVelocity(vx, vy);
      if (Math.abs(vx) > Math.abs(vy)) {
        self.anims.play(vx > 0 ? "walk-right" : "walk-left", true);
      } else {
        self.anims.play(vy > 0 ? "walk-down" : "walk-up", true);
      }
    } else if (self.body.velocity.length() < 1) {
      self.setVelocity(0);
    }

    if (self.label) {
      self.label.setPosition(self.x - self.label.width / 2, self.y - 38);
    }
  }
}

export function createPhaserGame(
  parent: HTMLElement,
  initialData: WorldSyncPayload
): Phaser.Game {
  const scene = new WorldScene();
  scene.setSyncData(initialData);

  return new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#1a1a2e",
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 } },
    },
    scene: [scene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { pixelArt: true, antialias: false },
  });
}

export function syncPhaserWorld(
  game: Phaser.Game | null,
  data: WorldSyncPayload
) {
  if (!game) return;
  game.events.emit("sync-world", data);
}
