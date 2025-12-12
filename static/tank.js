(function() {
    const canvas = document.getElementById("tank");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const hud = document.getElementById("hud");
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    // Config
    let CFG = { fish_count: 120, max_speed: 1.4, min_speed: 0.3, separation_radius: 20 };

    let W=0, H=0;
    function resize(){
        const rect = canvas.parentElement.getBoundingClientRect();
        W = Math.floor(rect.width);
        H = Math.floor(rect.height);
        canvas.width = Math.floor(W*DPR);
        canvas.height = Math.floor(H*DPR);
        canvas.style.width = W+"px";
        canvas.style.height = H+"px";
        ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    window.addEventListener("resize", resize);
    // Call resize initially after a short delay to ensure layout is settled
    setTimeout(resize, 100);

    function rand(n=1){ return Math.random()*n; }
    function randsym(n=1){ return (Math.random()*2-1)*n; }

    const FISH_COUNT = CFG.fish_count;
    const fishes = Array.from({length:FISH_COUNT}, () => ({
        x: rand(W), y: rand(H),
        vx: randsym(0.8), vy: randsym(0.8),
        size: 6 + rand(8), hue: 180 + randsym(40), rot: rand(Math.PI*2),
    }));


    // Baits
    const baits = [];
    const BAIT_RADIUS = 140;
    const BAIT_PULL = 0.018;
    const BAIT_DECAY = 0.995;
    const ripples = [];

    // Bubbles - with more variation
    const bubbles = [];
    function createBubble() {
        const size = Math.random();
        return {
            x: rand(W),
            y: H + 10,
            r: size < 0.6 ? 1.5 + rand(3) : size < 0.9 ? 4 + rand(4) : 6 + rand(6), // Small, medium, or large
            vy: -0.3 - rand(1.2),
            wobble: rand(Math.PI * 2),
            wobbleSpeed: 0.015 + rand(0.04),
            opacity: 0.4 + rand(0.4)
        };
    }
    // Initial bubbles - more bubbles!
    for (let i = 0; i < 25; i++) {
        const b = createBubble();
        b.y = rand(H);
        bubbles.push(b);
    }

    // Seaweed - lush aquarium plants
    const seaweeds = [];
    // Background layer - taller plants
    for (let i = 0; i < 8; i++) {
        seaweeds.push({
            x: (W / 9) * i + rand(30),
            height: 60 + rand(80),
            sway: rand(Math.PI * 2),
            swaySpeed: 0.012 + rand(0.008),
            segments: 10,
            width: 2.5,
            color: 'rgba(46, 125, 50, 0.4)', // Darker, background
            type: 'tall'
        });
    }
    // Mid layer - medium plants with leaves
    for (let i = 0; i < 12; i++) {
        seaweeds.push({
            x: rand(W),
            height: 40 + rand(50),
            sway: rand(Math.PI * 2),
            swaySpeed: 0.015 + rand(0.01),
            segments: 8,
            width: 2,
            color: 'rgba(56, 142, 60, 0.7)', // Mid green
            type: Math.random() < 0.5 ? 'wavy' : 'feathery'
        });
    }
    // Foreground - short bushy plants
    for (let i = 0; i < 6; i++) {
        seaweeds.push({
            x: 30 + (W / 7) * i + rand(20),
            height: 20 + rand(35),
            sway: rand(Math.PI * 2),
            swaySpeed: 0.02 + rand(0.015),
            segments: 6,
            width: 3,
            color: 'rgba(102, 187, 106, 0.85)', // Bright green, foreground
            type: 'bushy'
        });
    }


    // Click to drop bait and trigger metrics
    canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        const y = (e.clientY - rect.top);
        baits.push({ x, y, strength: 1.0, decay: BAIT_DECAY });
        ripples.push({ x, y, r: 2, max: 80, alpha: 0.8, grow: 1.6, fade: 0.015 });

        // Dispatch event for charts to react
        window.dispatchEvent(new CustomEvent('fishFed', {
            detail: { fishCount: FISH_COUNT, baitCount: baits.length }
        }));
    });

    function step(dt){
        // Separation
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
                }
            }
        }

        // Ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.r += rp.grow * (dt * 0.06);
            rp.alpha -= rp.fade * (dt * 0.06);
            if (rp.r > rp.max || rp.alpha <= 0.02) ripples.splice(i, 1);
        }

        // Attraction to bait
        for (const f of fishes) {
            let ax = 0, ay = 0;
            for (const b of baits) {
                const dx = b.x - f.x, dy = b.y -f.y;
                const d2 = dx*dx + dy*dy;
                if (d2 < BAIT_RADIUS*BAIT_RADIUS) {
                    const d = Math.max(8, Math.sqrt(d2));
                    const w = (1 - d/BAIT_RADIUS) * b.strength;
                    ax += (dx/d) * BAIT_PULL * w;
                    ay += (dy/d) * BAIT_PULL * w;
                }
            }
            f.vx += ax;
            f.vy += ay;
        }

        // Decay baits
        for (let i=baits.length-1; i>=0; i--) {
            baits[i].strength *= baits[i].decay;
            if (baits[i].strength < 0.15) baits.splice(i,1);
        }

        // Bubbles
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.wobble += b.wobbleSpeed * dt;
            b.x += Math.sin(b.wobble) * 0.5;
            b.y += b.vy * dt;
            if (b.y + b.r < 0) {
                bubbles.splice(i, 1);
            }
        }
        // Add new bubbles randomly
        if (Math.random() < 0.02) {
            bubbles.push(createBubble());
        }

        // Seaweed sway
        for (const s of seaweeds) {
            s.sway += s.swaySpeed * dt;
        }

        // Movement & Boundaries
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
        // Background - realistic water gradient
        const g = ctx.createLinearGradient(0,0,0,H);
        g.addColorStop(0,"#4FC3F7");  // Light aqua blue (top)
        g.addColorStop(0.5,"#0288D1"); // Deep water blue (middle)
        g.addColorStop(1,"#01579B");  // Dark ocean blue (bottom)
        ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
        ctx.restore();

        // Seaweed - render by type with layered depth
        ctx.save();
        ctx.lineCap = 'round';

        for (const s of seaweeds) {
            const swayAmount = Math.sin(s.sway) * 15;
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.width;

            if (s.type === 'tall' || s.type === 'wavy') {
                // Smooth wavy plants
                ctx.beginPath();
                ctx.moveTo(s.x, H);
                for (let i = 0; i <= s.segments; i++) {
                    const t = i / s.segments;
                    const y = H - (s.height * t);
                    const x = s.x + swayAmount * Math.sin(t * Math.PI) * (1 - t);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            } else if (s.type === 'feathery') {
                // Feathery plants with side leaves
                ctx.beginPath();
                ctx.moveTo(s.x, H);
                for (let i = 0; i <= s.segments; i++) {
                    const t = i / s.segments;
                    const y = H - (s.height * t);
                    const x = s.x + swayAmount * Math.sin(t * Math.PI) * (1 - t);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    // Add small side leaves
                    if (i > 0 && i % 2 === 0) {
                        const leafSize = 5 + (1 - t) * 3;
                        ctx.moveTo(x, y);
                        ctx.lineTo(x - leafSize, y - leafSize / 2);
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + leafSize, y - leafSize / 2);
                    }
                }
                ctx.stroke();
            } else if (s.type === 'bushy') {
                // Bushy foreground plants
                for (let j = 0; j < 3; j++) {
                    ctx.beginPath();
                    const offset = (j - 1) * 8;
                    ctx.moveTo(s.x + offset, H);
                    for (let i = 0; i <= s.segments; i++) {
                        const t = i / s.segments;
                        const y = H - (s.height * t);
                        const x = s.x + offset + swayAmount * 0.5 * Math.sin(t * Math.PI + j) * (1 - t);
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
            }
        }
        ctx.restore();

        // Bubbles - with variable opacity
        ctx.save();
        for (const b of bubbles) {
            ctx.globalAlpha = b.opacity;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();

            // Bubble highlight
            ctx.globalAlpha = b.opacity * 1.2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();


        // Fishes
        for (const f of fishes){
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.rot);
            ctx.fillStyle = `hsl(${f.hue} 70% 60%)`;
            const s = f.size;
            ctx.fillRect(-s*0.6, -s*0.5, s, s);
            ctx.fillRect(-s*0.8, -s*0.2, s*0.3, s*0.4);
            ctx.restore();
        }

        // Baits
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

        // Ripples
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

    let last = performance.now();
    function loop(now){
        const dt = Math.min(32, now - last);
        last = now;
        step(dt*0.06);
        render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();
