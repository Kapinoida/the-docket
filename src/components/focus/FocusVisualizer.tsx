'use client';

import React, { useRef, useEffect } from 'react';
import { TimerState } from '@/hooks/usePomodoroTimer';
import { useTheme } from 'next-themes';

export type VisualizationMode = 'rays' | 'particles' | 'waves' | 'stream' | 'flame' | 'hex' | 'ascent' | 'orbit' | 'rain' | 'snow' | 'constellation';

// ... (existing imports and interfaces)

// ...
interface FocusVisualizerProps {
  state: TimerState;
  timeLeft: number;
  totalDuration: number;
  mode: VisualizationMode;
}
export default function FocusVisualizer({ state, timeLeft, totalDuration, mode }: FocusVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { resolvedTheme } = useTheme();
  
  // Use refs to hold current state for the animation loop
  const stateRef = useRef(state);
  const timeLeftRef = useRef(timeLeft);
  const totalDurationRef = useRef(totalDuration);
  const modeRef = useRef(mode);
  const themeRef = useRef(resolvedTheme);

  // Update refs when props change
  useEffect(() => {
    stateRef.current = state;
    timeLeftRef.current = timeLeft;
    totalDurationRef.current = totalDuration;
    modeRef.current = mode;
    themeRef.current = resolvedTheme;
  }, [state, timeLeft, totalDuration, mode, resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Entity Arrays
    let rays: Ray[] = [];
    let particles: Particle[] = [];
    let waves: Wave[] = [];
    let streams: Stream[] = [];
    let embers: Ember[] = [];
    let hexagons: Hexagon[] = [];

    // --- Classes ---

    class Ray {
      x: number;
      y: number;
      angle: number;
      length: number;
      speed: number;
      alpha: number;
      maxAlpha: number;
      
      constructor(w: number, h: number) {
        this.x = w / 2;
        this.y = h; 
        this.angle = Math.PI + Math.random() * Math.PI; // Upward arc (PI to 2PI)
        this.length = Math.random() * (h * 0.8) + (h * 0.4); 
        this.speed = Math.random() * 0.0001 + 0.0005; 
        this.alpha = 0;
        this.maxAlpha = Math.random() * 0.3 + 0.1;
      }
      
      update(progress: number, w: number, h: number) {
        this.alpha += (Math.sin(Date.now() * this.speed * 2) * 0.01);
        if (this.alpha > this.maxAlpha) this.alpha = this.maxAlpha;
        if (this.alpha < 0) this.alpha = 0;
        
        const targetLength = (h * 0.5) + ((h * 0.8) * (1 - progress));
        this.length += (targetLength - this.length) * 0.05;
      }
    }

    class Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      alpha: number;
      
      constructor(w: number, h: number, initial: boolean = false) {
        // Start from center-ish (timer width approx 300px, so vary by +- 150px)
        this.x = (w / 2) + ((Math.random() - 0.5) * 300); 
        this.y = initial ? Math.random() * h : h + Math.random() * 50; // Distributed if initial
        this.size = Math.random() * 4 + 1;
        this.speedY = Math.random() * 1 + 0.5;
        this.speedX = (Math.random() - 0.5) * 1.5; // Slight horizontal drift
        this.alpha = Math.random() * 0.5 + 0.1;
      }

      update(w: number, h: number, intensity: number) {
        this.y -= this.speedY * (1 + intensity); // Move faster with intensity
        this.x += this.speedX;
        
        // When reset, put back at bottom center
        if (this.y < -10) {
          this.y = h + 10;
          this.x = (w / 2) + ((Math.random() - 0.5) * 300);
        }
      }
    }

    class Wave {
      radius: number;
      alpha: number;
      speed: number;
      
      constructor() {
        this.radius = 170; // Start matching the semicircle radius
        this.alpha = 0.8;
        this.speed = 1.0; // Slightly faster to cover distance
      }

      update() {
        this.radius += this.speed;
        this.alpha -= 0.001; // Slower fade out to travel further
      }

      isDead() {
        return this.alpha <= 0;
      }
    }

    class Stream {
      x: number;
      y: number;
      speed: number;
      offset: number;
      points: {x: number, y: number}[];
      width: number;
      wavelength: number;
      
      constructor(w: number, h: number) {
        this.x = (w / 2) + ((Math.random() - 0.5) * 200);
        this.y = h;
        this.speed = Math.random() * 1 + 0.5;
        this.offset = Math.random() * Math.PI * 2;
        this.width = Math.random() * 4 + 1;
        this.wavelength = Math.random() * 0.01 + 0.005;
        this.points = [];
        
        // Initialize points
        for(let i = 0; i < h/5; i++) {
           this.points.push({x: this.x, y: h + i*10});
        }
      }

      update(h: number) {
        // Move points up
        this.points.forEach(p => {
            p.y -= this.speed;
        });

        // Add new points at bottom if needed
        if (this.points[this.points.length - 1].y < h) {
             this.points.push({x: this.x, y: h});
        }

        // Remove top points
        if (this.points[0].y < -100) {
            this.points.shift();
        }
      }
      
      draw(ctx: CanvasRenderingContext2D, r: number, g: number, b: number, time: number) {
         ctx.beginPath();
         let started = false;
         
         this.points.forEach((p, i) => {
             // Calculate sine wave offset
             const waveX = Math.sin(p.y * this.wavelength + time * 0.002 + this.offset) * 20;
             const x = p.x + waveX;
             const y = p.y;
             
             if (!started) {
                 ctx.moveTo(x, y);
                 started = true;
             } else {
                 ctx.lineTo(x, y);
             }
         });
         
         ctx.lineWidth = this.width;
         ctx.lineCap = 'round';
         
         // Fade transparency towards top
         const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
         gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
         gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.2)`);
         gradient.addColorStop(1, `rgba(${r},${g},${b},0.4)`);
         
         ctx.strokeStyle = gradient;
         ctx.stroke();
      }
    }

    class Ember {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      life: number;
      maxLife: number;
      color: string;
      
      constructor(w: number, h: number, initial: boolean = false) {
        this.x = (w / 2) + ((Math.random() - 0.5) * 150); 
        this.y = initial ? Math.random() * h : h + Math.random() * 20;
        this.size = Math.random() * 20 + 10;
        this.speedY = Math.random() * 2 + 3; // Even Faster (3-5)
        this.speedX = (Math.random() - 0.5) * 1;
        this.life = 1.0;
        this.maxLife = Math.random() * 2.0 + 2.5; // Very Long life (2.5s to 4.5s)
        
        const colors = ['#f59e0b', '#ef4444', '#dc2626', '#fbbf24'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(intensity: number) {
        this.y -= this.speedY * (1 + intensity * 0.5);
        this.x += this.speedX + Math.sin(Date.now() * 0.005 + this.y * 0.02) * 1; 
        this.life -= 0.005 * (1 + intensity); // Very slow decay
        this.size *= 0.98; 
      }

      isDead() {
        return this.life <= 0 || this.size < 0.5;
      }
    }

    class GridSpot {
      x: number;
      y: number;
      occupied: boolean;
      trailLife: number; // For Ascent mode trails
      
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.occupied = false;
        this.trailLife = 0;
      }
    }

    class Hexagon {
      x: number;
      y: number;
      startX: number;
      startY: number;
      targetSpot: GridSpot;
      size: number;
      progress: number;
      speed: number;
      life: number;
      state: 'traveling' | 'holding' | 'fading';
      rotation: number;
      
      constructor(w: number, h: number, spot: GridSpot) {
        this.size = 25;
        this.targetSpot = spot;
        this.targetSpot.occupied = true;
        
        // Start at bottom center
        this.startX = w / 2;
        this.startY = h + 50;
        
        this.x = this.startX;
        this.y = this.startY;
        
        // Much slower speed for calmer effect
        this.speed = Math.random() * 0.003 + 0.002; 
        this.progress = 0;
        this.life = 1.0;
        this.state = 'traveling';
        // Fixed orientation
        // 0 rad = Vertex at right (0), Top side is horizontal (Flat Top).
        this.rotation = 0; 
      }
      
      update() {
         if (this.state === 'traveling') {
             this.progress += this.speed;
             
             // Smoother ease out
             const t = 1 - Math.pow(1 - this.progress, 2); // Quad vs Cubic for slightly more linear feel? or stick to cubic but slower
             
             this.x = this.startX + (this.targetSpot.x - this.startX) * t;
             this.y = this.startY + (this.targetSpot.y - this.startY) * t;
             
             if (this.progress >= 1) {
                 this.progress = 1;
                 this.x = this.targetSpot.x;
                 this.y = this.targetSpot.y;
                 this.state = 'holding';
                 this.life = 300 + Math.random() * 300; // Hold longer (was 200+200)
             }
         } else if (this.state === 'holding') {
             this.life--;
             if (this.life <= 0) {
                 this.state = 'fading';
                 this.life = 1.0; // Reset for alpha fade
             }
         } else if (this.state === 'fading') {
             this.life -= 0.01; // Slower fade (was 0.02)
             if (this.life <= 0) {
                 this.life = 0;
                 // Dead
                 this.targetSpot.occupied = false;
             }
         }
      }

      draw(ctx: CanvasRenderingContext2D, r: number, g: number, b: number) {
         ctx.save();
         ctx.translate(this.x, this.y);
         ctx.rotate(this.rotation);
         
         ctx.beginPath();
         for (let i = 0; i < 6; i++) {
           ctx.lineTo(this.size * Math.cos(i * Math.PI / 3), this.size * Math.sin(i * Math.PI / 3));
         }
         ctx.closePath();
         
         // Opacity depends on state
         let alpha = 0.5;
         if (this.state === 'traveling') alpha = Math.min(this.progress * 2, 0.5);
         if (this.state === 'fading') alpha = this.life * 0.5;
         
         ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
         ctx.lineWidth = 1;
         ctx.stroke();
         
         ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.2})`;
         ctx.fill();
         
         ctx.restore();
      }
    }

    // --- Init ---
    class HexWalker {
      currentSpot: GridSpot;
      targetSpot: GridSpot | null;
      x: number;
      y: number;
      progress: number;
      speed: number;
      scaleX: number; // For flip effect
      life: number;
      moveAngle: number; // Direction of movement for flip axis
      
      constructor(spot: GridSpot) {
        this.currentSpot = spot;
        this.targetSpot = null;
        this.x = spot.x;
        this.y = spot.y;
        this.progress = 0;
        this.speed = 0.015; // Slightly faster (was 0.01, orig 0.02)
        this.scaleX = 1;
        this.life = 1.0;
        this.moveAngle = 0;
      }
      
      update(spots: GridSpot[]) {
         if (!this.targetSpot) {
             const candidates = spots.filter(s => {
                 const dx = s.x - this.currentSpot.x;
                 const dy = s.y - this.currentSpot.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 return dist > 10 && dist < 60 && s.y <= this.currentSpot.y + 10;
             });
             
             if (candidates.length > 0) {
                 this.targetSpot = candidates[Math.floor(Math.random() * candidates.length)];
                 // Calculate angle for flip
                 this.moveAngle = Math.atan2(this.targetSpot.y - this.currentSpot.y, this.targetSpot.x - this.currentSpot.x);
             } else {
                 this.life = 0; // Stuck/Top
             }
         }
         
         if (this.targetSpot) {
             this.progress += this.speed;
             this.x = this.currentSpot.x + (this.targetSpot.x - this.currentSpot.x) * this.progress;
             this.y = this.currentSpot.y + (this.targetSpot.y - this.currentSpot.y) * this.progress;
             
             // Flip effect: Squashing along the movement axis
             this.scaleX = Math.abs(Math.cos(this.progress * Math.PI));
             
             if (this.progress >= 1) {
                 // Leave trail on previous spot
                 this.currentSpot.trailLife = 1.0;
                 // Also trail on new spot? User said "when aligned... leave a mark"
                 // Let's light up the target as we land.
                 this.targetSpot.trailLife = 1.0;

                 this.currentSpot = this.targetSpot;
                 this.targetSpot = null;
                 this.progress = 0;
                 this.scaleX = 1;
                 
                 if (this.y < 100) this.life -= 0.1;
             }
         }
         
         if (this.life < 1.0) this.life -= 0.05;
      }
      
      draw(ctx: CanvasRenderingContext2D, r: number, g: number, b: number) {
          ctx.save();
          ctx.translate(this.x, this.y);
          
          // Rotate to align X axis with movement
          ctx.rotate(this.moveAngle);
          // Squash X (flip over the edge perpendicular to movement)
          ctx.scale(this.scaleX, 1);
          // Rotate back to draw hex upright
          ctx.rotate(-this.moveAngle);
          
          ctx.beginPath();
          const size = 25;
           for (let i = 0; i < 6; i++) {
             ctx.lineTo(size * Math.cos(i * Math.PI / 3), size * Math.sin(i * Math.PI / 3));
           }
          ctx.closePath();
          
          // Softer, less vibrant look (matching Hex mode)
          // Rounded corners effect via lineJoin
          ctx.lineJoin = 'round';
          ctx.lineWidth = 1;

          ctx.fillStyle = `rgba(${r},${g},${b},${this.life * 0.2})`; // Reduced opacity (was 0.4)
          ctx.fill();
          ctx.strokeStyle = `rgba(${r},${g},${b},${this.life * 0.6})`; // Reduced opacity (was 1.0)
          ctx.stroke();
          
          ctx.restore();
      }
    }

    // --- Init ---
    let gridSpots: GridSpot[] = [];
    let walkers: HexWalker[] = [];
    let orbiters: Orbiter[] = [];
    let raindrops: RainDrop[] = [];
    let snowflakes: SnowFlake[] = [];
    let stars: StarNode[] = [];

    class Orbiter {
      angle: number;
      radius: number;
      speed: number;
      size: number;
      alpha: number;
      
      constructor(w: number, h: number) {
        this.angle = Math.random() * Math.PI * 2;
        // Radius between 200 (near semicircle) and max screen dimension
        this.radius = 200 + Math.random() * Math.max(w, h);
        this.size = Math.random() * 2 + 1;
        // Kepler-ish: closer is faster. 
        // Base speed / sqrt(radius) or similar.
        // Let's create a pleasing visual speed rather than strict physics.
        // Closer (200) -> Faster (0.01), Farther (1000) -> Slower (0.002)
        this.speed = (500 / this.radius) * 0.002 * (Math.random() > 0.5 ? 1 : -1); 
        this.alpha = Math.random() * 0.5 + 0.2;
      }

      update() {
         this.angle += this.speed;
      }
      
      draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, g: number, b: number) {
          const x = cx + Math.cos(this.angle) * this.radius;
          const y = cy + Math.sin(this.angle) * this.radius; // Using full circle, but centered at bottom
          
          ctx.beginPath();
          ctx.arc(x, y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${this.alpha})`;
          ctx.fill();
      }
    }

    class RainDrop {
        x: number;
        y: number;
        speed: number;
        length: number;
        z: number; // depth
        dead: boolean;

        constructor(w: number, h: number) {
            this.x = Math.random() * w;
            this.y = Math.random() * -h; // Start above screen
            this.z = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
            this.speed = Math.random() * 10 + 10; // Fast!
            this.length = Math.random() * 20 + 10;
            this.dead = false;
        }
        
        update(h: number, cx: number, cy: number) {
            this.y += this.speed * this.z;
            
            // Interaction with semicircle (approx radius 180)
            const dx = this.x - cx;
            const dy = this.y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // "Splash" or disappear if hits the force field (semicircle)
            if (dist < 180 && this.y < cy) { 
                this.dead = true;
                // Ideally spawn splash particles here, but simple disappearance is "force field" enough for now
            }
            
            if (this.y > h) {
                this.dead = true;
            }
        }
        
        draw(ctx: CanvasRenderingContext2D, r: number, g: number, b: number) {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y - this.length * this.z);
            ctx.strokeStyle = `rgba(${r},${g},${b},${this.z * 0.5})`;
            ctx.lineWidth = 1 * this.z;
            ctx.stroke();
        }
    }

    class SnowFlake {
        x: number;
        y: number;
        size: number;
        speedY: number;
        drift: number;
        driftOffset: number;
        opacity: number;

        constructor(w: number, h: number) {
            this.x = Math.random() * w;
            this.y = Math.random() * -h;
            this.size = Math.random() * 2 + 1; // Small dots
            this.speedY = Math.random() * 0.5 + 0.2; // Slow fall
            this.drift = Math.random() * 0.5 + 0.1;
            this.driftOffset = Math.random() * Math.PI * 2;
            this.opacity = Math.random() * 0.5 + 0.3;
        }

        update(h: number, cx: number, cy: number) {
            this.y += this.speedY;
            this.x += Math.sin(this.y * 0.01 + this.driftOffset) * this.drift;

            // Reset
            if (this.y > h) {
                this.y = -10;
                this.x = Math.random() * cx * 2; 
            }
        }

        draw(ctx: CanvasRenderingContext2D, r: number, g: number, b: number) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${this.opacity})`;
            ctx.fill();
        }
    }

    class StarNode {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        
        constructor(w: number, h: number) {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.5; // Very slow drift
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
        }
        
        update(w: number, h: number) {
            this.x += this.vx;
            this.y += this.vy;
            
            // Bounce off edges
            if (this.x < 0 || this.x > w) this.vx *= -1;
            if (this.y < 0 || this.y > h) this.vy *= -1;
        }
        
        draw(ctx: CanvasRenderingContext2D, r: number, g: number, b: number) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
            ctx.fill();
        }
    }

    const init = () => {
       const w = canvas.width;
       const h = canvas.height;
       
       rays = Array.from({ length: 100 }, () => new Ray(w, h));
       particles = Array.from({ length: 200 }, () => new Particle(w, h, true));
       waves = [];
       streams = Array.from({ length: 15 }, () => new Stream(w, h));
       embers = Array.from({ length: 50 }, () => new Ember(w, h, true));
       hexagons = [];
       
       // Generate Grid Spots
       gridSpots = [];
       const hexSize = 25;
       const vertDist = Math.sqrt(3) * hexSize;
       const horizDist = 1.5 * hexSize;
       
       const cols = Math.ceil(w / horizDist) + 2;
       const rows = Math.ceil(h / vertDist) + 2;
       
       for (let col = -1; col < cols; col++) {
           for (let row = -1; row < rows; row++) {
               // Offset odd columns
               const x = col * horizDist;
               const y = row * vertDist + (col % 2 !== 0 ? vertDist / 2 : 0);
               
                gridSpots.push(new GridSpot(x, y));
           }
       }
        
        // Init Hexagons (Pre-fill)
        hexagons = [];
        const cx = w / 2;
        const cy = h;
        const timerSafeRadiusSq = 250*250;
        
        // Identify valid spots (not occupied, outside timer area)
        const validHexSpots = gridSpots.filter(s => {
             const dx = s.x - cx; 
             const dy = s.y - cy;
             return dx*dx + dy*dy > timerSafeRadiusSq;
        });

        // Add initial hexagons
        for(let i=0; i<30; i++) {
             if (validHexSpots.length === 0) break;
             const idx = Math.floor(Math.random() * validHexSpots.length);
             const spot = validHexSpots[idx];
             
             if (!spot.occupied) {
                  const hex = new Hexagon(w, h, spot);
                  // Randomize state for "lived-in" feel
                  const rand = Math.random();
                  if (rand > 0.4) {
                      hex.state = 'holding';
                      hex.life = Math.random() * 600;
                      hex.progress = 1;
                      hex.x = spot.x;
                      hex.y = spot.y;
                  } else {
                      hex.state = 'traveling';
                      hex.progress = Math.random();
                      // Update pos
                      const t = 1 - Math.pow(1 - hex.progress, 2);
                      hex.x = hex.startX + (hex.targetSpot.x - hex.startX) * t;
                      hex.y = hex.startY + (hex.targetSpot.y - hex.startY) * t;
                  }
                  hexagons.push(hex);
             }
        }

        // Init Walkers (Pre-fill)
        walkers = [];
        const walkerSpots = gridSpots.filter(s => s.y > h * 0.5); // Lower half
        for(let i=0; i<3; i++) {
            if (walkerSpots.length === 0) break;
            const idx = Math.floor(Math.random() * walkerSpots.length);
            walkers.push(new HexWalker(walkerSpots[idx]));
        }

       orbiters = Array.from({ length: 150 }, () => new Orbiter(w, h));
       raindrops = Array.from({ length: 100 }, () => new RainDrop(w, h));
       snowflakes = Array.from({ length: 100 }, () => new SnowFlake(w, h));
       stars = Array.from({ length: 80 }, () => new StarNode(w, h));
    };

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      init(); 
    };
    
    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // --- Render Loop ---
    let lastWaveTime = 0;

    const render = () => {
      if (!ctx || !canvas) return;
      
      const currentState = stateRef.current;
      const currentTimeLeft = timeLeftRef.current;
      const currentTotalDuration = totalDurationRef.current;
      const currentMode = modeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const progress = currentTimeLeft / currentTotalDuration;
      
      const cx = canvas.width / 2;
      const cy = canvas.height;
      
      // Determine Color Params
      // ... (rest of render loop)
      const isDark = themeRef.current === 'dark';

      let r=255, g=255, b=255;
      
      if (currentState === 'work') { 
          // Blue: Darker for light mode, lighter for dark mode
          if (isDark) { r=96; g=165; b=250; } else { r=37; g=99; b=235; } 
      } 
      else if (currentState === 'shortBreak') { 
          // Green
          if (isDark) { r=52; g=211; b=153; } else { r=5; g=150; b=105; }
      } 
      else if (currentState === 'longBreak') { 
          // Indigo
          if (isDark) { r=129; g=140; b=248; } else { r=79; g=70; b=229; }
      }
      else {
          // Idle / Default
           if (isDark) { r=209; g=213; b=219; } else { r=75; g=85; b=99; }
      }

      // --- Mode: RAYS ---
      if (currentMode === 'rays') {
         // Sun Glow
         const sunRadius = 250;
         const sunGlow = ctx.createRadialGradient(cx, cy, 150, cx, cy, sunRadius);
         sunGlow.addColorStop(0, `rgba(${r},${g},${b},${isDark ? 0.15 : 0.1})`); // More subtle (was 0.3)
         sunGlow.addColorStop(1, `rgba(${r},${g},${b},0)`);
         
         ctx.beginPath();
         ctx.arc(cx, cy, sunRadius, Math.PI, 2 * Math.PI);
         ctx.fillStyle = sunGlow;
         ctx.fill();

         rays.forEach(ray => {
            ray.update(progress, canvas.width, canvas.height);
            
            ctx.save();
            ctx.translate(ray.x, ray.y);
            ctx.rotate(ray.angle);
            
            const gradient = ctx.createLinearGradient(0, 0, ray.length, 0);
            gradient.addColorStop(0, `rgba(${r},${g},${b},${ray.alpha})`);
            gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, -1, ray.length, 2 + (1-progress) * 2);
            ctx.restore();
         });
      }
      
      // --- Mode: PARTICLES ---
      if (currentMode === 'particles') {
        const intensity = (1 - progress); 
        ctx.fillStyle = `rgba(${r},${g},${b},${isDark ? 0.6 : 0.8})`;
        particles.forEach(p => {
          p.update(canvas.width, canvas.height, intensity);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;
      }

      // --- Mode: WAVES ---
      if (currentMode === 'waves') {
          const now = Date.now();
          if (now - lastWaveTime > 4000) {
              waves.push(new Wave());
              lastWaveTime = now;
          }

          const cx = canvas.width / 2;
          const cy = canvas.height;

          // Remove dead waves
          waves = waves.filter(w => !w.isDead());

          waves.forEach(w => {
              w.update();
              ctx.beginPath();
              ctx.arc(cx, cy, w.radius, Math.PI, 0); 
              ctx.strokeStyle = `rgba(${r},${g},${b},${w.alpha})`;
              ctx.lineWidth = 2;
              ctx.stroke();
          });
      }

      // --- Mode: STREAM ---
      if (currentMode === 'stream') {
          const now = Date.now();
          streams.forEach(s => {
              s.update(canvas.height);
              s.draw(ctx, r, g, b, now);
          });
      }

      // --- Mode: FLAME ---
      if (currentMode === 'flame') {
         // Glow Effect
         // cx, cy already defined top scope
         const glowRadius = 220 + Math.sin(Date.now() * 0.002) * 5; // Tighter radius (was 300)
         
         const glow = ctx.createRadialGradient(cx, cy, 160, cx, cy, glowRadius); // Start closer to edge (160 vs 170 radius)
         glow.addColorStop(0, 'rgba(245, 158, 11, 0.3)'); // Slightly more intense center
         glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
         
         ctx.beginPath();
         ctx.arc(cx, cy, glowRadius, Math.PI, 2 * Math.PI);
         ctx.fillStyle = glow;
         ctx.fill();

         // Keep spawning embers
         if (embers.length < 60) {
             embers.push(new Ember(canvas.width, canvas.height));
         }

         // DEBUG: Check if we have embers
         // if (Math.random() < 0.01) console.log('Embers count:', embers.length, 'First ember y:', embers[0]?.y);

         const intensity = (1 - progress);
         
         embers.forEach((e, i) => {
             e.update(intensity);
             if (e.isDead()) {
                 embers[i] = new Ember(canvas.width, canvas.height);
             } else {
                 ctx.beginPath();
                 ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                 const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size);
                 gradient.addColorStop(0, hexToRgba(e.color, 1)); 
                 gradient.addColorStop(0.5, hexToRgba(e.color, 0.5)); 
                 gradient.addColorStop(1, hexToRgba(e.color, 0));
                 ctx.fillStyle = gradient;
                 ctx.globalAlpha = Math.max(0, e.life); // Ensure non-negative
                 ctx.fill();
             }
         });
         ctx.globalAlpha = 1.0;
      }

      // --- Mode: HEX ---
      if (currentMode === 'hex') {
         // Draw faint background grid lines
         ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`;
         ctx.lineWidth = 1;
         const size = 25;
         
         gridSpots.forEach(s => {
             const dx = s.x - cx; 
             const dy = s.y - cy;
             // Avoid timer area for visual grid
             if (dx*dx + dy*dy > 250*250) {
                 ctx.beginPath();
                 for (let i = 0; i < 6; i++) {
                    ctx.lineTo(s.x + size * Math.cos(i * Math.PI / 3), s.y + size * Math.sin(i * Math.PI / 3));
                 }
                 ctx.closePath();
                 ctx.stroke();
             }
         });

         // Spawn new hexes
         if (hexagons.length < 50) { // Max active pieces
             // Find unoccupied spots outside timer
             const available = gridSpots.filter(s => {
                 if (s.occupied) return false;
                 const dx = s.x - cx; 
                 const dy = s.y - cy;
                 return dx*dx + dy*dy > 250*250;
             });
             if (available.length > 0) {
                 // Just random for now
                 const idx = Math.floor(Math.random() * available.length);
                 hexagons.push(new Hexagon(canvas.width, canvas.height, available[idx]));
             }
         }
         
         // Filter dead
         hexagons = hexagons.filter(h => !(h.state === 'fading' && h.life <= 0));

         hexagons.forEach(h => {
             h.update();
             h.draw(ctx, r, g, b);
         });
      }

      // --- Mode: ASCENT ---
      if (currentMode === 'ascent') {
         // 1. Draw Grid (Vertices) + Update Trails
         ctx.fillStyle = `rgba(${r},${g},${b},0.15)`; // Grid dots
         const size = 25;
         
         gridSpots.forEach(s => {
             const dx = s.x - cx; 
             const dy = s.y - cy;
             
             // Draw Grid Lattice (Dots)
             if (dx*dx+dy*dy > 200*200) { 
                 // Vertices
                 ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
                 ctx.beginPath();
                 for(let i=0; i<6; i++) {
                   const vx = s.x + size * Math.cos(i * Math.PI / 3);
                   const vy = s.y + size * Math.sin(i * Math.PI / 3);
                   ctx.rect(vx - 1, vy - 1, 2, 2);
                 }
                 ctx.fill();
                 
                 // Draw Trail (if active)
                 if (s.trailLife > 0) {
                     s.trailLife -= 0.002; // Linger longer (was 0.005)
                     ctx.beginPath();
                     for (let i = 0; i < 6; i++) {
                        ctx.lineTo(s.x + size * Math.cos(i * Math.PI / 3), s.y + size * Math.sin(i * Math.PI / 3));
                     }
                     ctx.closePath();
                     ctx.fillStyle = `rgba(${r},${g},${b},${s.trailLife * 0.2})`; // Softer trail fill (was 0.3)
                     ctx.fill();
                     
                     // Optional: Trail outline? Maybe just fill is enough for "mark"
                     // ctx.strokeStyle = `rgba(${r},${g},${b},${s.trailLife * 0.3})`;
                     // ctx.stroke();
                 }
             }
         });
         
         // 2. Spawn Walkers (Fewer!)
         // Ensure active walkers count is low (e.g., 5)
         if (walkers.length < 5 && Math.random() < 0.02) {
             const startSpots = gridSpots.filter(s => {
                 return Math.abs(s.x - canvas.width/2) < 50 && s.y > canvas.height - 100 && s.y < canvas.height;
             });
             
             if (startSpots.length > 0) {
                 const s = startSpots[Math.floor(Math.random() * startSpots.length)];
                 walkers.push(new HexWalker(s));
             }
         }
         
         // 3. Update/Draw Walkers
         walkers = walkers.filter(w => w.life > 0);
         walkers.forEach(w => {
             w.update(gridSpots);
             w.draw(ctx, r, g, b);
         });
      }

       // --- Mode: ORBIT ---
       if (currentMode === 'orbit') {
           // Clear with trail for motion blur? Or just pure movement.
           // Let's add slight trails for Orbit mode specifically by using partial clear?
           // Actually, standard clear is fine for clean dots.
           
           orbiters.forEach(o => {
               o.update();
               o.draw(ctx, cx, cy, r, g, b);
           });
       }

       // --- Mode: RAIN ---
       if (currentMode === 'rain') {
           // Spawn new drops
           if (raindrops.length < 200) {
               raindrops.push(new RainDrop(canvas.width, canvas.height));
           }

           // Update & Draw
           raindrops = raindrops.filter(d => !d.dead);
           raindrops.forEach(d => {
               d.update(canvas.height, cx, cy);
               d.draw(ctx, r, g, b);
           });
       }

       // --- Mode: SNOW ---
       if (currentMode === 'snow') {
           if (snowflakes.length < 150) {
               snowflakes.push(new SnowFlake(canvas.width, canvas.height));
           }
           
           snowflakes.forEach(s => {
               s.update(canvas.height, cx, cy);
               s.draw(ctx, r, g, b);
           });
       }

       // --- Mode: CONSTELLATION ---
       if (currentMode === 'constellation') {
           // Update stars
           stars.forEach(star => star.update(canvas.width, canvas.height));
           
           // Draw connections first (behind stars)
           ctx.lineWidth = 0.5;
           for (let i = 0; i < stars.length; i++) {
               for (let j = i + 1; j < stars.length; j++) {
                   const dx = stars[i].x - stars[j].x;
                   const dy = stars[i].y - stars[j].y;
                   const dist = Math.sqrt(dx*dx + dy*dy);
                   
                   if (dist < 150) { // Connection threshold
                       const opacity = 1 - (dist / 150);
                       ctx.beginPath();
                       ctx.moveTo(stars[i].x, stars[i].y);
                       ctx.lineTo(stars[j].x, stars[j].y);
                       ctx.strokeStyle = `rgba(${r},${g},${b},${opacity * 0.4})`;
                       ctx.stroke();
                   }
               }
           }
           
           // Draw stars
           stars.forEach(star => star.draw(ctx, r, g, b));
       }

       // --- Common Elements (Fog Overlay) ---
       // Draw a radial gradient fog to obscure elements near text/semicircle
       if (currentMode === 'hex' || currentMode === 'ascent' || currentMode === 'orbit' || currentMode === 'rain' || currentMode === 'snow' || currentMode === 'constellation') {
           const fogRadius = 300;
           const fog = ctx.createRadialGradient(cx, cy, 180, cx, cy, fogRadius);
           
           if (isDark) {
               // Dark Mode: Matches bg-gray-900 (#111827)
               fog.addColorStop(0, 'rgba(17, 24, 39, 1)'); // Opaque at center
               fog.addColorStop(0.2, 'rgba(17, 24, 39, 0.8)');
               fog.addColorStop(1, 'rgba(17, 24, 39, 0)'); // Transparent at edge
           } else {
               // Light Mode: Matches bg-gray-50 (#f9fafb) or white
               // Using the exact background color from globals.css or tailwind config usually bg-gray-50 or white
               // Assuming bg-primary is often white in light mode or very light gray.
               // Let's use 255,255,255 for safety or match the typical light bg.
               // If bg-primary is var(--bg-primary), we can't easily access it in canvas without getComputedStyle.
               // For now, assuming white (255,255,255) effectively masks.
               fog.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
               fog.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
               fog.addColorStop(1, 'rgba(255, 255, 255, 0)'); 
           }
           
           ctx.fillStyle = fog;
           ctx.fillRect(0, 0, canvas.width, canvas.height);
       }

      // --- Common Elements (Progress Arc) ---
      // cx, cy reused
      const radius = 170; 
      
      const endAngle = Math.PI + (Math.PI * (1 - progress)); 
      
      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, Math.PI, endAngle);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
      ctx.lineWidth = 4;
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
