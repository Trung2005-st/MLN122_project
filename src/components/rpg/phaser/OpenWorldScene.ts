import Phaser from "phaser";
import {
  FRAME,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUB_POS,
  PLAYER_TINTS,
  TILE_SIZE,
} from "@/lib/phaser-config";
import type { GameRoom, GiftBox, Monster, Player } from "@/lib/types";

export interface OpenWorldSync {
  room: GameRoom;
  currentPlayerId: string;
  onMove?: (x: number, y: number) => void;
  onAttackMonster?: (id: string, x: number, y: number) => void;
  onCollectGift?: (id: string, x: number, y: number) => void;
  onReady?: () => void;
}

function assetUrl(path: string) {
  const base =
    typeof window !== "undefined" ? process.env.NEXT_PUBLIC_BASE_PATH ?? "" : "";
  return `${base}${path}`;
}

/** 8×6 tile grid in tiles.png (32×32) — rows 4–5 are sand */
const SAND = [32, 33, 34, 35, 36, 37, 38, 39, 40, 41];
const DECOR: { frame: number; x: number; y: number }[] = [
  { frame: 2, x: 120, y: 100 },
  { frame: 3, x: 280, y: 180 },
  { frame: 4, x: 720, y: 140 },
  { frame: 5, x: 860, y: 220 },
  { frame: 10, x: 200, y: 480 },
  { frame: 11, x: 640, y: 520 },
  { frame: 12, x: 400, y: 560 },
  { frame: 13, x: 800, y: 480 },
  { frame: 14, x: 100, y: 300 },
  { frame: 15, x: 900, y: 380 },
];

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
  private readySent = false;

  constructor() {
    super({ key: "OpenWorldScene" });
  }

  preload() {
    this.load.spritesheet("tiles", assetUrl("/rpg/tiles.png"), {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    this.load.spritesheet("dude", assetUrl("/rpg/dude.png"), {
      frameWidth: FRAME.w,
      frameHeight: FRAME.h,
    });
  }

  create() {
    this.input.setTopOnly(false);
    this.input.mouse?.disableContextMenu();

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
    this.input.on("pointerdown", () => this.focusCanvas());

    this.assetsOk = this.textures.exists("dude");
    this.game.events.on("sync-open-world", this.applySync, this);
    if (this.sync) this.applySync(this.sync);

    this.focusCanvas();
    this.notifyReady();
  }

  setSync(data: OpenWorldSync) {
    this.sync = data;
    if (this.sys?.isActive()) this.applySync(data);
  }

  private focusCanvas() {
    const canvas = this.game.canvas;
    if (!canvas.hasAttribute("tabindex")) {
      canvas.setAttribute("tabindex", "0");
      canvas.style.outline = "none";
    }
    canvas.focus();
  }

  private notifyReady() {
    if (this.readySent) return;
    this.readySent = true;
    this.sync?.onReady?.();
    this.game.events.emit("open-world-ready");
  }

  private getSelfPos(): { x: number; y: number } | null {
    const id = this.sync?.currentPlayerId;
    if (!id) return null;
    const spr = this.playerSprites.get(id);
    if (spr) return { x: spr.x, y: spr.y };
    const me = this.sync?.room.players[id];
    return me ? { x: me.pos.x, y: me.pos.y } : null;
  }

  private drawWorld() {
    const cols = Math.ceil(GAME_WIDTH / TILE_SIZE);
    const rows = Math.ceil(GAME_HEIGHT / TILE_SIZE);
    const hasTiles = this.textures.exists("tiles");

    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const x = tx * TILE_SIZE + TILE_SIZE / 2;
        const y = ty * TILE_SIZE + TILE_SIZE / 2;
        if (hasTiles) {
          const frame = SAND[(tx + ty * 3) % SAND.length];
          this.add.image(x, y, "tiles", frame).setDepth(0);
        } else {
          const g = this.add.graphics();
          g.fillStyle(0xc4a574, 1);
          g.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          g.setDepth(0);
        }
      }
    }

    if (hasTiles) {
      for (const d of DECOR) {
        if (this.textures.get("tiles").frameTotal > d.frame) {
          this.add.image(d.x, d.y, "tiles", d.frame).setDepth(1).setScale(1);
        }
      }
    }

    // Hub plaza
    const hub = this.add.graphics();
    hub.fillStyle(0x8a9aaa, 0.25);
    hub.fillRoundedRect(HUB_POS.x - 80, HUB_POS.y - 60, 160, 120, 8);
    hub.setDepth(2);

    const landmarks = [
      { x: 160, y: 120, t: "🏦 Ngân hàng" },
      { x: 800, y: 120, t: "📈 Sàn CK" },
      { x: 160, y: 520, t: "🌾 Đồng ruộng" },
      { x: 800, y: 520, t: "🏭 Nhà máy" },
    ];
    for (const lm of landmarks) {
      this.add
        .text(lm.x, lm.y, lm.t, {
          fontSize: "12px",
          color: "#fff",
          stroke: "#000",
          strokeThickness: 3,
          backgroundColor: "#00000088",
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(3);
    }

    this.add
      .text(HUB_POS.x, HUB_POS.y, "Quảng trường MLN122", {
        fontSize: "13px",
        color: "#fff",
        stroke: "#000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setAlpha(0.85);
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
    this.anims.create({
      key: "idle",
      frames: [{ key: "dude", frame: 0 }],
      frameRate: 1,
    });
  }

  private applySync(data: OpenWorldSync) {
    this.sync = data;
    const room = data.room;

    for (const m of room.monsters) {
      this.upsertMonster(m);
    }
    for (const id of Array.from(this.monsterSprites.keys())) {
      if (!room.monsters.find((m) => m.id === id)) {
        this.monsterSprites.get(id)?.destroy();
        this.monsterSprites.delete(id);
      }
    }

    for (const g of room.gifts) {
      if (!g.collected) this.upsertGift(g);
      else {
        this.giftSprites.get(g.id)?.destroy();
        this.giftSprites.delete(g.id);
      }
    }

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
      c.setSize(72, 72);

      const hit = this.add.circle(0, 0, 40, 0xffffff, 0.001);
      c.add(hit);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        const pos = this.getSelfPos();
        if (pos) this.sync?.onAttackMonster?.(m.id, pos.x, pos.y);
      });

      const glow = this.add.circle(0, 0, 38, 0xf0b429, 0.2);
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
    const giftId = g.id;
    let c = this.giftSprites.get(giftId);
    const landed = !!g.landedAt;
    const startY = landed ? g.y : -40;

    if (!c) {
      c = this.add.container(g.x, startY);
      c.setDepth(9);

      const hit = this.add.rectangle(0, 0, 48, 48, 0xffffff, 0.001);
      c.add(hit);
      hit.setInteractive({ useHandCursor: true });
      hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        const pos = this.getSelfPos();
        const live = this.sync?.room.gifts.find((x) => x.id === giftId);
        if (pos && live?.landedAt && !live.collected) {
          this.sync?.onCollectGift?.(giftId, pos.x, pos.y);
        }
      });

      const box = this.add.text(0, 0, "🎁", { fontSize: "36px" }).setOrigin(0.5);
      c.add(box);

      if (!landed) {
        this.tweens.add({
          targets: c,
          y: g.y,
          duration: 1800,
          ease: "Bounce.easeOut",
        });
      }
      this.giftSprites.set(giftId, c);
    } else if (landed && c.y !== g.y) {
      c.setPosition(g.x, g.y);
    }
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
      label.setDepth(11);
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
    const pos = this.getSelfPos();
    if (!me || !pos || me.status === "in_combat") return;

    let nearest: Monster | null = null;
    let minD = 999;
    for (const m of data.room.monsters) {
      if (!m.alive) continue;
      const d = Phaser.Math.Distance.Between(pos.x, pos.y, m.x, m.y);
      if (d < 100 && d < minD) {
        minD = d;
        nearest = m;
      }
    }
    if (nearest) {
      data.onAttackMonster?.(nearest.id, pos.x, pos.y);
      return;
    }

    let nearestGift: GiftBox | null = null;
    minD = 999;
    for (const g of data.room.gifts) {
      if (g.collected || !g.landedAt) continue;
      const d = Phaser.Math.Distance.Between(pos.x, pos.y, g.x, g.y);
      if (d < 80 && d < minD) {
        minD = d;
        nearestGift = g;
      }
    }
    if (nearestGift) {
      data.onCollectGift?.(nearestGift.id, pos.x, pos.y);
    }
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
          selfSpr.anims.play("walk-right", true);
          selfSpr.setFlipX(vx < 0);
        } else {
          selfSpr.anims.play(vy > 0 ? "walk-down" : "walk-up", true);
        }
      }
      const now = Date.now();
      if (now - this.lastMoveSend > 150) {
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

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: "#c4a574",
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

  const canvas = game.canvas;
  canvas.setAttribute("tabindex", "0");
  canvas.style.outline = "none";
  canvas.style.cursor = "crosshair";

  return game;
}

export function syncOpenWorld(game: Phaser.Game | null, data: OpenWorldSync) {
  if (!game) return;
  game.events.emit("sync-open-world", data);
}
