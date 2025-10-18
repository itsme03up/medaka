const canvas = document.getElementById("tank") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const hud = document.getElementById("hud")!;
const DPR = Math.min(2, window.devicePixelRatio || 1);

// ---- Config from API (fallbackあり) ----
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
let CFG = { fish_count: 120, max_speed: 1.4, min_speed: 0.3, separation_radius: 20 };
try {
  const r = await fetch(`${API_BASE}/config`);
  if (r.ok) CFG = await r.json();
} catch { /* ローカル単体でも動く */ }

type Fish = { x:number;y:number;vx:number;vy:number;size:number;hue:number;rot:number; };

let W=0, H=0;
function resize(){
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width = Math.floor(W*DPR);
  canvas.height = Math.floor(H*DPR);
  canvas.style.width = W+"px";
  canvas.style.height = H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener("resize", resize); resize();

function rand(n=1){ return Math.random()*n; }
function randsym(n=1){ return (Math.random()*2-1)*n; }

const FISH_COUNT = CFG.fish_count;
const fishes: Fish[] = Array.from({length:FISH_COUNT}, () => ({
  x: rand(W), y: rand(H),
  vx: randsym(0.8), vy: randsym(0.8),
  size: 6 + rand(8), hue: 180 + randsym(40), rot: rand(Math.PI*2),
}));

// --- 餌 ----------
type Bait = { x:number; y:number; strength:number; decay:number };
const baits: Bait[] = [];
const BAIT_RADIUS = 140; //効き目の範囲
const BAIT_PULL = 0.018; //吸引の強さ係数
const BAIT_DECAY = 0.995; //毎フレームで少しずつ弱る
type Ripple = { x:number; y:number; r:number; max:number; alpha:number; grow:number; fade:number };
const ripples: Ripple[] = [];


// クリックで餌を落とす
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);
  baits.push({ x, y, strength: 1.0, decay: BAIT_DECAY });

  // 波紋
  ripples.push({ x, y, r: 2, max: 80, alpha: 0.8, grow: 1.6, fade: 0.015 });

  //APIに記録
  fetch(`${API_BASE}/events/observation`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ fps: 0, fish_count: FISH_COUNT, notes: `bait@${x.toFixed(0)},${y.toFixed(0)}` })
  }).catch(()=>{});
});

function step(dt:number){
  // 簡易分離（近すぎると反発）
  for (let i = 0; i < fishes.length; i++) {
    const a = fishes[i];
    for (let j = i + 1; j < fishes.length; j++) {
      const b = fishes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < CFG.separation_radius ** 2 && d2 > 0.1) {
        const d = Math.sqrt(d2), push = (CFG.separation_radius - d) * 0.002;
        const ux = dx / d, uy = dy / d;
        a.vx -= ux * push; a.vy -= uy * push;
        b.vx += ux * push; b.vy += uy * push;
        // 波紋を広げて薄くする
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i];
          rp.r += rp.grow * (dt * 0.06);   // dt を軽くスケール
          rp.alpha -= rp.fade * (dt * 0.06);
          if (rp.r > rp.max || rp.alpha <= 0.02) ripples.splice(i, 1);
        }
      }
    }
  }
  // (魚ごとに、近い餌に少しだけ引っ張る)
  for (const f of fishes) {
    let ax = 0, ay = 0;
    for (const b of baits) {
      const dx = b.x - f.x, dy = b.y -f.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < BAIT_RADIUS*BAIT_RADIUS) {
        const d = Math.max(8, Math.sqrt(d2));
        const w = (1 - d/BAIT_RADIUS) * b.strength; // 近い＆エサが強いほど効果抜群
        ax += (dx/d) * BAIT_PULL * w;
        ay += (dy/d) * BAIT_PULL * w;
      }
    }
    f.vx += ax;
    f.vy += ay;
  }

  // 餌を減衰＆寿命で消す
  for (let i=baits.length-1; i>=0; i--) {
    baits[i].strength *= baits[i].decay;
    if (baits[i].strength < 0.15) baits.splice(i,1);
  }


  // 速度ゆらぎ＋制限＆移動＋壁反射
  for (const f of fishes){
    f.vx += randsym(0.05); f.vy += randsym(0.05);
    const sp = Math.hypot(f.vx, f.vy);
    if (sp > CFG.max_speed){ f.vx *= CFG.max_speed/sp; f.vy *= CFG.max_speed/sp; }
    if (sp < CFG.min_speed){ f.vx *= (CFG.min_speed/sp); f.vy *= (CFG.min_speed/sp); }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < 0){ f.x = 0; f.vx = Math.abs(f.vx); }
    if (f.x > W){ f.x = W; f.vx = -Math.abs(f.vx); }
    if (f.y < 0){ f.y = 0; f.vy = Math.abs(f.vy); }
    if (f.y > H){ f.y = H; f.vy = -Math.abs(f.vy); }
    f.rot = Math.atan2(f.vy, f.vx);
  }
}

function render(){
  // 背景
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#0b1724"); g.addColorStop(1,"#0e2440");
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  for (const f of fishes){
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = `hsl(${f.hue} 70% 60%)`;
    const s = f.size;
    ctx.fillRect(-s*0.6, -s*0.5, s, s);      // 体
    ctx.fillRect(-s*0.8, -s*0.2, s*0.3, s*0.4); // 尾
    ctx.restore();
  }
  // 餌の描画（発光ドット）
  for (const b of baits) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.2, b.strength);
    const r = 6 + 10 * (b.strength);
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 3);
    grad.addColorStop(0, "rgba(255,230,150,0.9)");
    grad.addColorStop(1, "rgba(255,230,150,0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 波紋（線のみ・ぼかし）
  ctx.save();
  ctx.lineWidth = 2;
  for (const rp of ripples) {
    ctx.beginPath();
    ctx.globalAlpha = rp.alpha;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

let last = performance.now(), accFps = 0, frames = 0, lastHud = 0;
async function report(now:number, fps:number){
  if (now - lastHud < 1500) return;
  try {
    await fetch(`${API_BASE}/events/observation`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ fps, fish_count: FISH_COUNT, notes:"frontend" })
    });
  } catch {}
}

function loop(now:number){
  const dt = Math.min(32, now - last);
  last = now;
  step(dt*0.06);
  render();
  accFps += 1000/dt; frames++;
  if (now - lastHud > 500){
    const fps = accFps/frames;
    hud!.textContent = `fish:${FISH_COUNT}  fps:${fps.toFixed(1)}`;
    report(now, fps);
    accFps = 0; frames = 0; lastHud = now;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
