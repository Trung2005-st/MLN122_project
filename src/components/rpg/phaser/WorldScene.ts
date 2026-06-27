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

function assetUrl(path: string): string {
  if (typeof window !== "undefined") {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return `${base}${path}`;
  }
  return path;
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
  private assetsOk = { tiles: false, dude: false };

  constructor() {
    super({ key: "WorldScene" });
  }

  preload() {
    this.load.on("loaderror", (file: { key: string; url?: string }) => {
      console.warn("[WorldScene] Load failed:", file.key, file.url);
    });

    this.load.spritesheet("dude", assetUrl("/rpg/dude.png"), {
      frameWidth: FRAME.w,
      frameHeight: FRAME.h,
    });
    this.load.image("tiles", assetUrl("/rpg/tiles.png"));
  }

  create() {
    this.assetsOk.tiles = this.textures.exists("tiles");
    this.assetsOk.dude = this.textures.exists("dude");

    if (!this.assetsOk.dude) {
      const g = this.make.graphics({});
      g.fillStyle(0xffffff, 1);
      g.fillCircle(16, 16, 14);
      g.generateTexture("player-dot", 32, 32);
      g.destroy();
    }

    this.drawTerrain();
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

  /** Nền map — tiles.png là 1 ảnh, KHÔNG dùng frame index */
  private drawTerrain() {
    if (this.assetsOk.tiles) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "tiles");
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      bg.setDepth(0);
      bg.setAlpha(0.92);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x2d5016, 0x2d5016, 0x1a3a0a, 0x1a3a0a, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      g.setDepth(0);
    }

    const plaza = this.add.rectangle(
      HUB_POS.x,
      HUB_POS.y,
      160,
      110,
      0x333344,
      0.65
    );
    plaza.setStrokeStyle(3, 0xffffff, 0.2);
    plaza.setDepth(1);

    this.add
      .text(HUB_POS.x, HUB_POS.y - 8, "⚖️", { fontSize: "32px" })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(HUB_POS.x, HUB_POS.y + 28, "Quảng trường", {
        fontSize: "12px",
        color: "#cccccc",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private drawPaths() {
    const g = this.add.graphics();
    g.lineStyle(4, 0xffffff, 0.15);
    for (const z of WORLD_ZONES) {
      g.lineBetween(HUB_POS.x, HUB_POS.y, z.x, z.y);
    }
    g.setDepth(3);
  }

  /** dude.png = 288×48 → 9 frame (32×48). Chỉ dùng frame 0–8 */
  private createAnimations() {
    if (!this.assetsOk.dude) return;
    if (this.anims.exists("walk-down")) return;

    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("dude", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
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

      const hit = this.add.circle(zone.x, zone.y, 56, zone.color, 0.2);
      hit.setStrokeStyle(3, zone.color, 0.75);
      hit.setDepth(6);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => hit.setFillStyle(zone.color, 0.35));
      hit.on("pointerout", () => hit.setFillStyle(zone.color, 0.2));
      hit.on("pointerdown", () => {
        const data = this.syncData;
        if (!data?.onAllocate || data.disabled || data.phase !== "allocating")
          return;
        const total = Object.values(data.allocation).reduce((a, b) => a + b, 0);
        if (total >= 100) return;
        data.onAllocate(zone.id, Math.min(10, 100 - total));
      });

      this.add
        .text(zone.x, zone.y - 12, zone.label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(7);

      const badge = this.add
        .text(zone.x, zone.y + 42, "", {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#000000",
          backgroundColor: "#ffffff",
          padding: { x: 8, y: 4 },
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
        g.lineStyle(3, zone.color, 0.9);
        g.strokeCircle(zone.x, zone.y, 60 + Math.sin(this.time.now / 300) * 5);
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
      const wx = (posPct.x / 100) * GAME_WIDTH + ((idx % 3) - 1) * 32;
      const wy = (posPct.y / 100) * GAME_HEIGHT + (Math.floor(idx / 3) - 1) * 24;

      this.upsertPlayer(id, p.name, wx, wy, isSelf, hidden, idx);
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
    tx: number,
    ty: number,
    isSelf: boolean,
    hidden: boolean,
    tintIdx: number
  ) {
    let sprite = this.playerSprites.get(id);

    if (!sprite) {
      const tex = this.assetsOk.dude ? "dude" : "player-dot";
      sprite = this.physics.add.sprite(HUB_POS.x, HUB_POS.y, tex, 0);
      sprite.setDepth(10 + tintIdx);
      sprite.setCollideWorldBounds(true);
      sprite.setTint(PLAYER_TINTS[tintIdx % PLAYER_TINTS.length]);

      const label = this.add
        .text(0, 0, name.slice(0, 10), {
          fontSize: "12px",
          color: isSelf ? "#000" : "#fff",
          backgroundColor: isSelf ? "#ffffff" : "#000000cc",
          padding: { x: 5, y: 2 },
        })
        .setDepth(15 + tintIdx);
      (sprite as typeof sprite & { label: Phaser.GameObjects.Text }).label = label;
      this.playerSprites.set(id, sprite);
    }

    const lbl = sprite.label!;
    lbl.setText(hidden ? "???" : name.slice(0, 10));

    const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, tx, ty);
    if (dist > 10) {
      this.moveSpriteTo(sprite, tx, ty);
    } else if (this.assetsOk.dude) {
      sprite.anims.play("idle", true);
    }

    sprite.setAlpha(hidden ? 0.4 : 1);
    sprite.setScale(isSelf ? 1.2 : 1);
    lbl.setPosition(sprite.x - lbl.width / 2, sprite.y - 42);
  }

  private moveSpriteTo(
    sprite: Phaser.Physics.Arcade.Sprite & {
      label?: Phaser.GameObjects.Text;
    },
    tx: number,
    ty: number
  ) {
    const dx = tx - sprite.x;
    const dy = ty - sprite.y;
    let anim = "walk-down";
    let flipX = false;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        anim = "walk-right";
      } else {
        anim = "walk-left";
        flipX = true;
      }
    } else {
      anim = dy > 0 ? "walk-down" : "walk-up";
    }

    if (this.assetsOk.dude) {
      sprite.anims.play(anim, true);
      sprite.setFlipX(flipX);
    }

    this.tweens.killTweensOf(sprite);

    this.tweens.add({
      targets: sprite,
      x: tx,
      y: ty,
      duration: Math.min(
        1000,
        350 + Phaser.Math.Distance.Between(sprite.x, sprite.y, tx, ty)
      ),
      ease: "Sine.easeInOut",
      onUpdate: () => {
        if (sprite.label) {
          sprite.label.setPosition(
            sprite.x - sprite.label.width / 2,
            sprite.y - 42
          );
        }
      },
      onComplete: () => {
        sprite.setVelocity(0);
        if (this.assetsOk.dude) sprite.anims.play("idle", true);
      },
    });
  }

  update() {
    const data = this.syncData;
    if (!data || data.phase !== "allocating" || data.disabled) return;

    const self = this.playerSprites.get(data.currentPlayerId);
    if (!self?.body) return;

    const speed = 180;
    let vx = 0;
    let vy = 0;
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) vx = -speed;
    else if (this.cursors?.right.isDown || this.wasd?.D.isDown) vx = speed;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) vy = -speed;
    else if (this.cursors?.down.isDown || this.wasd?.S.isDown) vy = speed;

    if (vx !== 0 || vy !== 0) {
      this.tweens.killTweensOf(self);
      self.setVelocity(vx, vy);
      if (this.assetsOk.dude) {
        if (Math.abs(vx) > Math.abs(vy)) {
          self.anims.play(vx > 0 ? "walk-right" : "walk-left", true);
          self.setFlipX(vx < 0);
        } else {
          self.anims.play(vy > 0 ? "walk-down" : "walk-up", true);
        }
      }
    } else {
      self.setVelocity(0);
      if (this.assetsOk.dude) self.anims.play("idle", true);
    }

    if (self.label) {
      self.label.setPosition(self.x - self.label.width / 2, self.y - 42);
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
    type: Phaser.WEBGL,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#1a1a2e",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [scene],
    scale: {
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    audio: { noAudio: true },
    banner: false,
  });
}

export function syncPhaserWorld(
  game: Phaser.Game | null,
  data: WorldSyncPayload
) {
  if (!game) return;
  game.events.emit("sync-world", data);
}
