import Phaser from "phaser";
import {
  FRAME,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUB_POS,
  PLAYER_TINTS,
} from "@/lib/phaser-config";
import type {
  CharacterClass,
  GameRoom,
  GiftBox,
  Monster,
  Player,
} from "@/lib/types";

export interface OpenWorldSync {
  room: GameRoom;
  currentPlayerId: string;
  onMove?: (x: number, y: number) => void;
  onAttackMonster?: (id: string) => void;
  onCollectGift?: (id: string) => void;
}

function assetUrl(path: string) {
  const base = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_BASE_PATH ?? "" : "";
  return `${base}${path}`;
}

export class OpenWorldScene extends Phaser.Scene {
  private sync: OpenWorldSync | null = null;
  private playerSprites = new Map<
    string,
    Phaser.Physics.Arcade.Sprite & { label?: Phaser.GameObjects.Text }
  >();
  private monsterSprites = new Map<string, Phaser.GameObjects.Container>();
  private giftSprites = new Map<string, Phaser.GameObjects.Container>();
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
  private lastMoveSend = 0;
  private assetsOk = false;

  constructor() {
    super({ key: "OpenWorldScene" });
  }

  preload() {
    this.load.spritesheet("dude", assetUrl("/rpg/dude.png"), {
      frameWidth: FRAME.w,
      frameHeight: FRAME.h,
    });
  }

  create() {
    this.drawWorld();
    this.createAnims();

    this.cursors = this.input.keyboard?.createCursorKeys();
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey("W"),
        A: this.input.keyboard.addKey("A"),
        S: this.input.keyboard.addKey("S"),
        D: this.input.keyboard.addKey("D"),
        E: this.input.keyboard.addKey("E"),
      };
    }

    this.input.keyboard?.on("keydown-E", () => this.tryInteract());

    this.assetsOk = this.textures.exists("dude");
    this.game.events.on("sync-open-world", this.applySync, this);
    if (this.sync) this.applySync(this.sync);
  }

  setSync(data: OpenWorldSync) {
    this.sync = data;
    if (this.sys?.isActive()) this.applySync(data);
  }

  private drawWorld() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0f1419, 0x0f1419, 0x1a2332, 0x1a2332, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid kinh tế
    g.lineStyle(1, 0x2a3544, 0.5);
    for (let x = 0; x < GAME_WIDTH; x += 48) {
      g.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 48) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Landmark labels
    const landmarks = [
      { x: 160, y: 120, t: "🏦 Ngân hàng" },
      { x: 800, y: 120, t: "📈 Sàn CK" },
      { x: 160, y: 520, t: "🌾 Đồng ruộng" },
      { x: 800, y: 520, t: "🏭 Nhà máy" },
    ];
    for (const lm of landmarks) {
      this.add
        .text(lm.x, lm.y, lm.t, {
          fontSize: "11px",
          color: "#8899aa",
          stroke: "#000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setAlpha(0.7);
    }

    this.add
      .text(HUB_POS.x, HUB_POS.y, "MLN122 Open World", {
        fontSize: "14px",
        color: "#667788",
      })
      .setOrigin(0.5)
      .setAlpha(0.4);
  }

  private createAnims() {
    if (!this.textures.exists("dude") || this.anims.exists("walk-down")) return;
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
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("dude", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({ key: "idle", frames: [{ key: "dude", frame: 0 }], frameRate: 1 });
  }

  private applySync(data: OpenWorldSync) {
    this.sync = data;
    const room = data.room;

    // Monsters ($)
    for (const m of room.monsters) {
      this.upsertMonster(m);
    }
    for (const id of Array.from(this.monsterSprites.keys())) {
      if (!room.monsters.find((m) => m.id === id)) {
        this.monsterSprites.get(id)?.destroy();
        this.monsterSprites.delete(id);
      }
    }

    // Gifts
    for (const g of room.gifts) {
      if (!g.collected) this.upsertGift(g);
      else {
        this.giftSprites.get(g.id)?.destroy();
        this.giftSprites.delete(g.id);
      }
    }

    // Players
    for (const p of Object.values(room.players)) {
      this.upsertPlayer(p, p.id === data.currentPlayerId);
    }
    for (const id of Array.from(this.playerSprites.keys())) {
      if (!room.players[id]) {
        const s = this.playerSprites.get(id);
        s?.label?.destroy();
        s?.destroy();
        this.playerSprites.delete(id);
      }
    }
  }

  private upsertMonster(m: Monster) {
    if (!m.alive) {
      this.monsterSprites.get(m.id)?.destroy();
      this.monsterSprites.delete(m.id);
      return;
    }

    let c = this.monsterSprites.get(m.id);
    if (!c) {
      c = this.add.container(m.x, m.y);
      c.setDepth(8);
      c.setSize(60, 60);
      c.setInteractive(
        new Phaser.Geom.Circle(0, 0, 36),
        Phaser.Geom.Circle.Contains
      );
      c.on("pointerdown", () => this.sync?.onAttackMonster?.(m.id));

      const glow = this.add.circle(0, 0, 38, 0xf0b429, 0.15);
      const body = this.add
        .text(0, 0, "$", {
          fontSize: "48px",
          color: "#f0b429",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      const name = this.add
        .text(0, -52, m.name, {
          fontSize: "11px",
          color: "#fff",
          stroke: "#000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      const reward = this.add
        .text(0, 48, `+${m.reward}`, {
          fontSize: "13px",
          color: "#50e3a4",
          fontStyle: "bold",
          stroke: "#000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      c.add([glow, body, name, reward]);
      this.tweens.add({
        targets: body,
        scale: { from: 1, to: 1.08 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
      this.monsterSprites.set(m.id, c);
    }
    c.setPosition(m.x, m.y);
  }

  private upsertGift(g: GiftBox) {
    let c = this.giftSprites.get(g.id);
    const landed = !!g.landedAt;
    const startY = landed ? g.y : -40;

    if (!c) {
      c = this.add.container(g.x, startY);
      c.setDepth(7);
      c.setInteractive(
        new Phaser.Geom.Rectangle(-24, -24, 48, 48),
        Phaser.Geom.Rectangle.Contains
      );
      c.on("pointerdown", () => {
        if (g.landedAt) this.sync?.onCollectGift?.(g.id);
      });

      const box = this.add
        .text(0, 0, "🎁", { fontSize: "36px" })
        .setOrigin(0.5);
      c.add(box);

      if (!landed) {
        this.tweens.add({
          targets: c,
          y: g.y,
          duration: 1800,
          ease: "Bounce.easeOut",
        });
      }
      this.giftSprites.set(g.id, c);
    }
    if (landed) c.setPosition(g.x, g.y);
  }

  private upsertPlayer(p: Player, isSelf: boolean) {
    let spr = this.playerSprites.get(p.id);
    if (!spr) {
      const tex = this.assetsOk ? "dude" : undefined;
      if (tex) {
        spr = this.physics.add.sprite(p.pos.x, p.pos.y, tex, 0);
      } else {
        if (!this.textures.exists("dot")) {
          const g = this.make.graphics({});
          g.fillStyle(0xffffff);
          g.fillCircle(8, 8, 8);
          g.generateTexture("dot", 16, 16);
          g.destroy();
        }
        spr = this.physics.add.sprite(p.pos.x, p.pos.y, "dot");
      }
      spr.setDepth(10);
      spr.setCollideWorldBounds(true);
      const idx = Object.keys(this.sync?.room.players ?? {}).indexOf(p.id);
      spr.setTint(PLAYER_TINTS[idx % PLAYER_TINTS.length]);

      const label = this.add.text(0, 0, p.name, {
        fontSize: "11px",
        color: isSelf ? "#000" : "#fff",
        backgroundColor: isSelf ? "#fff" : "#000000bb",
        padding: { x: 4, y: 2 },
      });
      (spr as typeof spr & { label: Phaser.GameObjects.Text }).label = label;
      this.playerSprites.set(p.id, spr);
    }

    const lbl = spr.label!;
    lbl.setText(
      p.status === "locked"
        ? `${p.name} 🔒`
        : p.status === "challenged"
          ? `${p.name} ⚔️?`
          : p.name
    );

    if (!isSelf) {
      spr.setPosition(p.pos.x, p.pos.y);
      lbl.setPosition(spr.x - lbl.width / 2, spr.y - 42);
    }

    if (p.status === "locked") spr.setAlpha(0.5);
    else if (p.status === "in_combat") spr.setAlpha(0.7);
    else spr.setAlpha(1);
  }

  private tryInteract() {
    const data = this.sync;
    if (!data) return;
    const me = data.room.players[data.currentPlayerId];
    if (!me || me.status === "in_combat") return;

    let nearest: Monster | null = null;
    let minD = 999;
    for (const m of data.room.monsters) {
      if (!m.alive) continue;
      const d = Phaser.Math.Distance.Between(me.pos.x, me.pos.y, m.x, m.y);
      if (d < 90 && d < minD) {
        minD = d;
        nearest = m;
      }
    }
    if (nearest) data.onAttackMonster?.(nearest.id);
  }

  update() {
    const data = this.sync;
    if (!data) return;

    const me = data.room.players[data.currentPlayerId];
    const selfSpr = this.playerSprites.get(data.currentPlayerId);
    if (!me || !selfSpr?.body) return;

    const locked = me.status === "locked" || me.status === "in_combat";
    if (locked) {
      selfSpr.setVelocity(0);
      return;
    }

    const speed = 160;
    let vx = 0;
    let vy = 0;
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) vx = -speed;
    else if (this.cursors?.right.isDown || this.wasd?.D.isDown) vx = speed;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) vy = -speed;
    else if (this.cursors?.down.isDown || this.wasd?.S.isDown) vy = speed;

    selfSpr.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (this.assetsOk) {
        if (Math.abs(vx) > Math.abs(vy)) {
          selfSpr.anims.play(vx > 0 ? "walk-right" : "walk-right", true);
          selfSpr.setFlipX(vx < 0);
        } else {
          selfSpr.anims.play(vy > 0 ? "walk-down" : "walk-up", true);
        }
      }
      const now = Date.now();
      if (now - this.lastMoveSend > 200) {
        this.lastMoveSend = now;
        data.onMove?.(selfSpr.x, selfSpr.y);
      }
    } else {
      selfSpr.setVelocity(0);
      if (this.assetsOk) selfSpr.anims.play("idle", true);
    }

    if (selfSpr.label) {
      selfSpr.label.setPosition(
        selfSpr.x - selfSpr.label.width / 2,
        selfSpr.y - 42
      );
    }
  }
}

export function createOpenWorldGame(
  parent: HTMLElement,
  initial: OpenWorldSync
): Phaser.Game {
  const scene = new OpenWorldScene();
  scene.setSync(initial);

  return new Phaser.Game({
    type: Phaser.WEBGL,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#0f1419",
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 } },
    },
    scene: [scene],
    scale: {
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { pixelArt: true, antialias: false },
    audio: { noAudio: true },
    banner: false,
  });
}

export function syncOpenWorld(game: Phaser.Game | null, data: OpenWorldSync) {
  if (!game) return;
  game.events.emit("sync-open-world", data);
}
