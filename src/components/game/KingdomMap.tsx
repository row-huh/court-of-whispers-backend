import { useEffect, useMemo, useRef } from "react";
import { AGENT_META } from "@/lib/game/agents";
import type { AgentId, GameState } from "@/lib/game/types";

type Npc = {
  id: AgentId;
  r: number;
  c: number;
  home: string;
  color: string;
  accent: string;
  px: number;
  py: number;
  tx: number;
  ty: number;
  dir: number;
  frame: number;
};

const TS = 20;
const COLS = 34;
const ROWS = 34;
const VW = 20;
const VH = 20;

const TILE = {
  WALL: 0,
  GRASS: 1,
  ROAD: 2,
  PLAZA: 3,
  WATER: 4,
  COBBLE: 5,
  FLOWER: 6,
  TREE: 7,
  BRIDGE: 8,
  DIRT: 9,
  FLOOR: 10,
} as const;

const RAW = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WGGGGGGGGGGGGGGGGGGGGGGGGGGGGGttW",
  "WGGGGGGGGGGGGGGGGGGGGGGGGGGGGGttW",
  "WGRRRRRRRGGGGGGGGGGGGGGGGGRRRRGGW",
  "WGRFFFFFRGGGGGGGGGGGGGGGGGRCCCRtW",
  "WGRFFFFFRGGGGGGRRRRRGGGGGGRCCCRtW",
  "WGRFFFFFRGGGGGGRDDDRGGGGGGRRRRRGW",
  "WGRRRRRRRGGGGGGRDDDRGGGGGGGGRRRGW",
  "WGGGGGGGGGGGGGGRDDDRGGGGGGGGRGGGW",
  "WtGGGRRRRRRRRRRRRRRRRRRRRRRRRGGGW",
  "WtGGGRGGGGGGGGGGGGGGGGGGGGGGRGGGW",
  "WGGGGRGGGGGGGGGGGGGGGGGGGGGGRGGGW",
  "WGRRRRGGGGGGGCCCCCCGGGGGGGGGRttGW",
  "WGRGGGGGGGGGGCCCCCCGGGGGGGGGGttGW",
  "WGRGGGGGGGGGGCCCCCCGGGGGGRRRRRGGW",
  "WGRRRRGGGGGGGGGGGGGGGGGGGRDDDRGGW",
  "WGGGGRGGGGGGGGGGGGGGGGGGGRDDDRGGW",
  "WGGGGRGGGGGGGFGFGFGGGGGGGRRRRRGGW",
  "WGGGGRRRRRRRRRRRRRRRRRRRRRGGGGGGW",
  "WtGGGGGGGGGGGFGFGFGGGGGGGGGGRRRGW",
  "WtGGGGGGGGGGGGGGGGGGGGGGGGGGRCCRW",
  "WGGGGGGGGGGGGGGGGGGGGGGGGGGGRCCRW",
  "WGGGRRRRGGGGGGGGGGGGGGGGRRRRRRRGW",
  "WGGGRDDRGGGGGGGWWWWWGGGGRGGGGGGGW",
  "WGGGRDDRGGGGGGGWBBBWGGGGRGGGGGGGW",
  "WGGGRRRRGGGGGGGWBBBWGGGGRRRRGGGGW",
  "WGGGGGGGGGGGGGGWWWWWGGGGGGGRGGGGW",
  "WGGGGGGGGGGGGGGGGGGGGGGGGGGRGGGGW",
  "WGGGGRRRRRRRRRRRGGGGGGGGGGGRRRRGW",
  "WtGGGRGGGGGGGGGGRGGGGGGGGGGGGGGGW",
  "WtGGGRGGFGFGGGGGRGGGGFGFGGGGGGttW",
  "WGGGGRGGGGGGGGGGRGGGGGGGGGGGGGttW",
  "WGGGGRRRRRRRRRRRRGGGGGGGGGGGGGGGW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];

const MAP = RAW.map((row) =>
  row.split("").map((c) => {
    if (c === "W") return TILE.WALL;
    if (c === "R") return TILE.ROAD;
    if (c === "P") return TILE.PLAZA;
    if (c === "C") return TILE.COBBLE;
    if (c === "D") return TILE.DIRT;
    if (c === "F") return TILE.FLOWER;
    if (c === "t") return TILE.TREE;
    if (c === "B") return TILE.BRIDGE;
    return TILE.GRASS;
  }),
);

for (const [r, c] of [
  [23, 16],
  [23, 17],
  [23, 18],
  [23, 19],
  [23, 20],
  [24, 16],
  [24, 18],
  [24, 20],
  [25, 16],
  [25, 17],
  [25, 18],
  [25, 19],
  [25, 20],
]) {
  MAP[r][c] = TILE.WATER;
}
for (const [r, c] of [
  [24, 17],
  [24, 19],
]) {
  MAP[r][c] = TILE.BRIDGE;
}

const NPCS: Omit<Npc, "px" | "py" | "tx" | "ty" | "dir" | "frame">[] = [
  { id: "commander", r: 5, c: 5, home: "Barracks", color: "#b2362d", accent: "#c7c7d6" },
  { id: "bishop", r: 6, c: 28, home: "Cathedral", color: "#3152b8", accent: "#e6e2d8" },
  { id: "citizen", r: 25, c: 9, home: "Market", color: "#3b7a3b", accent: "#d45632" },
  { id: "priest", r: 20, c: 27, home: "Chapel", color: "#d8d8d8", accent: "#d5a42d" },
];

const spriteName = (id: AgentId) =>
  id === "commander" ? "Alaric" : AGENT_META[id].name.split(" ")[0];

function makeNpcs(): Npc[] {
  return NPCS.map((npc) => ({
    ...npc,
    px: npc.c * TS + TS / 2,
    py: npc.r * TS + TS / 2,
    tx: npc.c * TS + TS / 2,
    ty: npc.r * TS + TS / 2,
    dir: 2,
    frame: 0,
  }));
}

function seeded(r: number, c: number) {
  const x = Math.sin(r * 97.17 + c * 31.73) * 10000;
  return x - Math.floor(x);
}

function isWalkable(r: number, c: number) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  const t = MAP[r][c];
  return t !== TILE.WALL && t !== TILE.WATER && t !== TILE.TREE;
}

function isNear(a: { r: number; c: number }, b: { r: number; c: number }) {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && (a.r !== b.r || a.c !== b.c);
}

type KingdomMapProps = {
  active: AgentId;
  state: GameState;
  disabled?: boolean;
  onApproach: (id: AgentId) => void;
  onTalk: (id: AgentId) => void;
};

export function KingdomMap({ active, state, disabled, onApproach, onTalk }: KingdomMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onApproach, onTalk });
  const activeRef = useRef(active);
  const stateRef = useRef(state);
  const disabledRef = useRef(disabled);

  const npcLegend = useMemo(() => makeNpcs(), []);

  useEffect(() => {
    callbacks.current = { onApproach, onTalk };
    activeRef.current = active;
    stateRef.current = state;
    disabledRef.current = disabled;
  }, [active, disabled, onApproach, onTalk, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const mini = miniRef.current;
    if (!canvas || !mini) return;
    const ctx = canvas.getContext("2d");
    const mctx = mini.getContext("2d");
    if (!ctx || !mctx) return;
    ctx.imageSmoothingEnabled = false;
    mctx.imageSmoothingEnabled = false;

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const size = Math.max(320, Math.min(760, Math.floor(rect.width)));
      canvas.width = size * dpr;
      canvas.height = Math.min(size, Math.max(360, Math.floor(window.innerHeight * 0.7))) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      mini.width = mini.clientWidth * dpr;
      mini.height = mini.clientHeight * dpr;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener("resize", resize);

    const npcs = makeNpcs();
    const player = {
      r: 16,
      c: 16,
      px: 16 * TS + TS / 2,
      py: 16 * TS + TS / 2,
      tx: 16 * TS + TS / 2,
      ty: 16 * TS + TS / 2,
      dir: 2,
      frame: 0,
      moving: false,
      progress: 0,
    };
    const keys: Record<string, boolean> = {};
    const repeat: Record<string, number> = { w: 0, a: 0, s: 0, d: 0 };

    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (
        !["w", "a", "s", "d", "e", "x", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
          key,
        )
      )
        return;
      event.preventDefault();
      const mapped =
        key === "arrowup"
          ? "w"
          : key === "arrowdown"
            ? "s"
            : key === "arrowleft"
              ? "a"
              : key === "arrowright"
                ? "d"
                : key;
      keys[mapped] = true;
      if ((mapped === "e" || mapped === "x") && !disabledRef.current) {
        const near = npcs.find((npc) => isNear(player, npc));
        if (near) callbacks.current.onTalk(near.id);
      }
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keys[key] = false;
      if (key === "arrowup") keys.w = false;
      if (key === "arrowdown") keys.s = false;
      if (key === "arrowleft") keys.a = false;
      if (key === "arrowright") keys.d = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const fill = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    };

    const tryMove = (dr: number, dc: number) => {
      if (disabledRef.current || player.moving) return false;
      const nr = player.r + dr;
      const nc = player.c + dc;
      if (!isWalkable(nr, nc)) return false;
      if (npcs.some((npc) => npc.r === nr && npc.c === nc)) return false;
      player.r = nr;
      player.c = nc;
      player.tx = nc * TS + TS / 2;
      player.ty = nr * TS + TS / 2;
      player.moving = true;
      player.progress = 0;
      player.dir = dr === 1 ? 2 : dr === -1 ? 0 : dc === 1 ? 1 : 3;
      return true;
    };

    const drawTile = (ox: number, oy: number, r: number, c: number, tick: number) => {
      const x = ox + c * TS;
      const y = oy + r * TS;
      const t = MAP[r][c];
      const sd = seeded(r, c);
      switch (t) {
        case TILE.WALL:
          fill(x, y, TS, TS, "#2d1b10");
          fill(x, y, TS, 5, "#5d3720");
          fill(x, y + 12, TS, 3, "#1a0d08");
          fill(x + 3, y + 6, 6, 2, "#6d442a");
          fill(x + 12, y + 15, 5, 2, "#6d442a");
          break;
        case TILE.GRASS:
          fill(x, y, TS, TS, ["#356a27", "#3f742d", "#2f6125"][Math.floor(sd * 3)]);
          if (sd < 0.22) {
            fill(x + 3, y + 11, 2, 4, "#4b8f37");
            fill(x + 12, y + 7, 2, 5, "#4a8532");
          }
          break;
        case TILE.FLOWER:
          fill(x, y, TS, TS, "#3f742d");
          fill(x + 4, y + 6, 2, 2, "#d84561");
          fill(x + 6, y + 8, 2, 2, "#f0d060");
          fill(x + 13, y + 11, 2, 2, "#8c5ee0");
          break;
        case TILE.TREE:
          fill(x, y, TS, TS, "#356a27");
          fill(x + 7, y + 10, 7, 10, "#74421e");
          fill(x + 2, y + 2, 16, 11, "#193f12");
          fill(x + 4, y, 12, 11, "#28641c");
          fill(x + 7, y + 2, 5, 3, "#58a53a");
          break;
        case TILE.ROAD:
          fill(x, y, TS, TS, "#9b8361");
          fill(x, y, TS, 2, "#b9a174");
          fill(x, y + TS - 2, TS, 2, "#796041");
          if ((r + c) % 5 === 0) fill(x + 3, y + 5, 4, 2, "#806849");
          break;
        case TILE.COBBLE:
          fill(x, y, TS, TS, "#766a5b");
          fill(x + 1, y + 1, 8, 8, "#928574");
          fill(x + 11, y + 1, 8, 8, "#877969");
          fill(x + 1, y + 11, 8, 8, "#877969");
          fill(x + 11, y + 11, 8, 8, "#9b8e7d");
          break;
        case TILE.PLAZA:
          fill(x, y, TS, TS, "#c8b78e");
          fill(x + 1, y + 1, TS - 2, TS - 2, "#d5c59b");
          break;
        case TILE.DIRT:
          fill(x, y, TS, TS, "#88653d");
          if (sd > 0.55) fill(x + 5, y + 7, 5, 2, "#6f4e2f");
          break;
        case TILE.WATER:
          fill(x, y, TS, TS, "#173d6c");
          fill(x, y, TS, 2, "#2762a3");
          if ((c + Math.floor(tick / 8)) % 4 === 0) fill(x + 2, y + 7, 7, 2, "#3a78bd");
          break;
        case TILE.BRIDGE:
          fill(x, y, TS, TS, "#b48855");
          fill(x, y, TS, 3, "#80572d");
          fill(x + 4, y + 5, 2, 10, "#8f6134");
          fill(x + 12, y + 5, 2, 10, "#8f6134");
          break;
      }
    };

    const drawBuilding = (
      ox: number,
      oy: number,
      c: number,
      r: number,
      w: number,
      h: number,
      roof: string,
      wall: string,
    ) => {
      const x = ox + c * TS;
      const y = oy + r * TS;
      fill(x, y + 8, w * TS, h * TS - 8, wall);
      fill(x - 4, y + 2, w * TS + 8, 10, roof);
      fill(x + 6, y + h * TS - 16, 12, 16, "#2a160d");
      fill(x + w * TS - 18, y + 18, 8, 8, "#f1ca62");
      fill(x + 10, y + 18, 8, 8, "#f1ca62");
      ctx.strokeStyle = "#1a0c08";
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(x), Math.round(y + 8), w * TS, h * TS - 8);
    };

    const drawSprite = (
      wx: number,
      wy: number,
      colors: { body: string; accent: string },
      dir: number,
      frame: number,
      label?: string,
    ) => {
      const x = Math.round(wx) - 10;
      const y = Math.round(wy) - 18;
      const bob = frame === 1 || frame === 3 ? 1 : 0;
      const stepA = frame === 0 || frame === 2 ? 2 : 0;
      const stepB = frame === 1 || frame === 3 ? 2 : 0;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 36, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      fill(x + 4, y + 15 + bob, 5, 5 + stepA, "#4c2d18");
      fill(x + 11, y + 15 + bob, 5, 5 + stepB, "#4c2d18");
      fill(x + 3, y + 8 + bob, 14, 9, colors.body);
      fill(x + 2, y + 9 + bob, 16, 3, colors.accent);
      fill(x + 1, y + 10 + bob, 3, 6, colors.body);
      fill(x + 16, y + 10 + bob, 3, 6, colors.body);
      fill(x + 5, y + 3 + bob, 10, 8, "#edbf82");
      fill(x + 4, y + 5 + bob, 12, 5, "#edbf82");
      fill(x + 5, y + 1 + bob, 10, 3, dir === 0 ? "#6b4b2c" : "#2f1d10");
      fill(x + 6, y + 6 + bob, 3, 3, dir === 0 ? "#edbf82" : "#1b120b");
      fill(x + 11, y + 6 + bob, 3, 3, dir === 0 ? "#edbf82" : "#1b120b");
      if (dir !== 0) fill(x + 8, y + 9 + bob, 4, 1, "#b46f50");
      ctx.strokeStyle = "#211008";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 3, y + 1 + bob, 14, 10);
      ctx.strokeRect(x + 2, y + 8 + bob, 16, 10);
      if (label) {
        const width = label.length * 6 + 8;
        fill(wx - width / 2, y - 14, width, 11, "rgba(12,8,20,0.72)");
        ctx.fillStyle = "#f2d075";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, Math.round(wx), y - 5);
      }
    };

    const drawMini = (camC: number, camR: number) => {
      const w = mini.clientWidth;
      const h = mini.clientHeight;
      const tw = w / COLS;
      const th = h / ROWS;
      const colors = [
        "#2d1b10",
        "#3b722b",
        "#9b8361",
        "#c8b78e",
        "#173d6c",
        "#766a5b",
        "#477c31",
        "#193f12",
        "#b48855",
        "#88653d",
        "#8d7057",
      ];
      mctx.fillStyle = "#0b0a10";
      mctx.fillRect(0, 0, w, h);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          mctx.fillStyle = colors[MAP[r][c]] || "#3b722b";
          mctx.fillRect(Math.round(c * tw), Math.round(r * th), Math.ceil(tw), Math.ceil(th));
        }
      }
      mctx.fillStyle = "rgba(241, 202, 98, 0.25)";
      mctx.fillRect(
        Math.round(camC * tw),
        Math.round(camR * th),
        Math.round(VW * tw),
        Math.round(VH * th),
      );
      for (const npc of npcs) {
        mctx.fillStyle = npc.color;
        mctx.fillRect(Math.round(npc.c * tw) - 1, Math.round(npc.r * th) - 1, 3, 3);
      }
      mctx.fillStyle = "#f4e765";
      mctx.fillRect(Math.round(player.c * tw) - 1, Math.round(player.r * th) - 1, 3, 3);
    };

    let tick = 0;
    let last = 0;
    let raf = 0;
    let lastNear: AgentId | null = null;

    const loop = (time: number) => {
      const dt = Math.min(time - last, 50) || 16;
      last = time;
      tick += 1;
      if (player.moving) {
        player.progress += 0.17 * (dt / 16);
        if (player.progress >= 1) {
          player.progress = 1;
          player.moving = false;
        }
        player.px += (player.tx - player.px) * 0.36;
        player.py += (player.ty - player.py) * 0.36;
        if (!player.moving) {
          player.px = player.tx;
          player.py = player.ty;
        }
        player.frame = Math.floor(tick / 5) % 4;
      } else {
        let moved = false;
        for (const [key, dr, dc] of [
          ["w", -1, 0],
          ["s", 1, 0],
          ["a", 0, -1],
          ["d", 0, 1],
        ] as const) {
          if (keys[key]) {
            repeat[key] -= dt;
            if (repeat[key] <= 0 && tryMove(dr, dc)) {
              repeat[key] = repeat[key] === 0 ? 170 : 90;
              moved = true;
              break;
            }
          } else {
            repeat[key] = 0;
          }
        }
        if (!moved) player.frame = 0;
      }

      const near = npcs.find((npc) => isNear(player, npc)) ?? null;
      if (near?.id !== lastNear) {
        lastNear = near?.id ?? null;
        if (near) callbacks.current.onApproach(near.id);
      }

      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const camC = Math.max(0, Math.min(COLS - VW, Math.round(player.px / TS - VW / 2)));
      const camR = Math.max(0, Math.min(ROWS - VH, Math.round(player.py / TS - VH / 2)));
      const ox = Math.round(width / 2 - player.px);
      const oy = Math.round(height / 2 - player.py);
      ctx.fillStyle = "#0b0a10";
      ctx.fillRect(0, 0, width, height);
      for (let r = Math.max(0, camR - 2); r < Math.min(ROWS, camR + VH + 3); r++) {
        for (let c = Math.max(0, camC - 2); c < Math.min(COLS, camC + VW + 3); c++)
          drawTile(ox, oy, r, c, tick);
      }
      drawBuilding(ox, oy, 3, 4, 5, 4, "#7e2e27", "#9a8163");
      drawBuilding(ox, oy, 26, 4, 4, 4, "#233f8f", "#a39b8c");
      drawBuilding(ox, oy, 4, 23, 4, 3, "#6c3c23", "#b38c5d");
      drawBuilding(ox, oy, 27, 20, 3, 3, "#543679", "#93816d");

      if (near) {
        const x = ox + near.c * TS;
        const y = oy + near.r * TS;
        ctx.strokeStyle = "#f1ca62";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
        ctx.strokeStyle = "rgba(241, 202, 98, 0.35)";
        ctx.strokeRect(x - 2, y - 2, TS + 4, TS + 4);
      }

      const actors = [
        {
          y: player.py,
          draw: () =>
            drawSprite(
              ox + player.px,
              oy + player.py,
              { body: "#c64b2f", accent: "#f1ca62" },
              player.dir,
              player.frame,
            ),
        },
        ...npcs.map((npc) => ({
          y: npc.py,
          draw: () =>
            drawSprite(
              ox + npc.px,
              oy + npc.py,
              { body: npc.color, accent: npc.accent },
              npc.dir,
              activeRef.current === npc.id ? Math.floor(tick / 12) % 4 : 0,
              spriteName(npc.id),
            ),
        })),
      ].sort((a, b) => a.y - b.y);
      actors.forEach((actor) => actor.draw());

      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.2,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.62,
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(12,8,20,0.34)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      drawMini(camC, camR);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame((time) => {
      last = time;
      loop(time);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return (
    <div className="kingdom-shell">
      <canvas
        ref={canvasRef}
        className="kingdom-canvas"
        aria-label="Top-down pixel kingdom. Move with W A S D and press E near an agent to talk."
        tabIndex={0}
      />
      <div className="kingdom-map-ui kingdom-map-ui-top">
        <div>
          <div className="kingdom-kicker">The False Heir</div>
          <div className="kingdom-title">Day {state.day} in the Court</div>
        </div>
        <div className="kingdom-key-row">
          <span className="kingdom-key">WASD</span>
          <span>move</span>
          <span className="kingdom-key">E</span>
          <span>talk</span>
        </div>
      </div>
      <div className="kingdom-map-ui kingdom-map-ui-bottom">
        <canvas ref={miniRef} className="kingdom-minimap" aria-hidden="true" />
        <div className="kingdom-roster">
          {npcLegend.map((npc) => (
            <div
              key={npc.id}
              className={active === npc.id ? "kingdom-roster-item active" : "kingdom-roster-item"}
            >
              <span className="kingdom-roster-dot" style={{ background: npc.color }} />
              <span>{spriteName(npc.id)}</span>
              <small>{npc.home}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
