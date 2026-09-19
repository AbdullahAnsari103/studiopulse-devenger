/**
 * Pure Canvas Confetti & Celebration Particle Engine
 * Lightweight, zero-dependency celebration micro-animation for key creator milestones.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  decay: number;
}

const PALETTE = [
  "#a855f7", // purple
  "#8b5cf6", // violet
  "#6366f1", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ffffff", // white
];

class ConfettiEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animationId: number | null = null;

  private init() {
    if (typeof window === "undefined") return;
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.style.position = "fixed";
      this.canvas.style.top = "0";
      this.canvas.style.left = "0";
      this.canvas.style.width = "100vw";
      this.canvas.style.height = "100vh";
      this.canvas.style.pointerEvents = "none";
      this.canvas.style.zIndex = "99999";
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.resize();
      window.addEventListener("resize", () => this.resize());
    }
  }

  private resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
  }

  public burst(options: { count?: number; originX?: number; originY?: number } = {}) {
    this.init();
    if (!this.canvas || !this.ctx) return;

    const count = options.count ?? 70;
    const originX = (options.originX ?? window.innerWidth / 2) * window.devicePixelRatio;
    const originY = (options.originY ?? window.innerHeight * 0.45) * window.devicePixelRatio;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 8 + 4) * window.devicePixelRatio;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3 * window.devicePixelRatio,
        size: (Math.random() * 6 + 4) * window.devicePixelRatio,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.012,
      });
    }

    if (!this.animationId) {
      this.loop();
    }
  }

  public sparkles(options: { originX?: number; originY?: number } = {}) {
    this.burst({ count: 40, ...options });
  }

  private loop = () => {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2 * window.devicePixelRatio; // gravity
      p.vx *= 0.98; // air drag
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.loop);
    } else {
      this.animationId = null;
    }
  };
}

const engine = new ConfettiEngine();

export const celebrate = {
  burst: (opts?: { count?: number; originX?: number; originY?: number }) => engine.burst(opts),
  sparkles: (opts?: { originX?: number; originY?: number }) => engine.sparkles(opts),
};
