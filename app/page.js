'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import ClaimPassportForm from './ClaimPassportForm';

const SCREEN_DATA = [
  { label: 'NEEoColorphism 7', z: -6,  side: 'left',  color: [0xff2d7b, 0xff6b35], video: '/videos/NEEoColorphism-7.mp4' },
  { label: 'NEEoColorphism 6', z: -14, side: 'right', color: [0x00e5ff, 0x8b5cf6], video: '/videos/NEEoColorphism-6.mp4' },
  { label: 'NEEoColorphism 5', z: -22, side: 'left',  color: [0x8b5cf6, 0x34d399], video: '/videos/NEEoColorphism-5.mp4' },
  { label: 'NEEoColorphism 4', z: -30, side: 'right', color: [0xfbbf24, 0xff2d7b], video: '/videos/NEEoColorphism-4.mp4' },
  { label: 'NEEoColorphism 3', z: -38, side: 'left',  color: [0x34d399, 0x00e5ff], video: '/videos/NEEoColorphism-3.mp4' },
  { label: 'NEEoColorphism 2', z: -46, side: 'right', color: [0xff6b35, 0x8b5cf6], video: '/videos/NEEoColorphism-2.mp4' },
  { label: 'NEEoColorphism 1', z: -76, side: 'back',  color: [0xe6264d, 0x7c3aed], video: '/videos/NEEoColorphism-1.mp4' },
];

const ROOM_NAMES = ['Entrance','NEEoColorphism 7','NEEoColorphism 6','NEEoColorphism 5','NEEoColorphism 4','NEEoColorphism 3','NEEoColorphism 2','NEEoColorphism 1'];

function DpadBtn({ id, dir, className, children }) {
  return (
    <div id={id} className={`dpad-btn ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  const [showClaim, setShowClaim] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState({ three: false, gsap: false, scrollTrigger: false });
  const loaderRef = useRef(null);
  const loaderFillRef = useRef(null);
  const loaderPctRef = useRef(null);
  const initRef = useRef(false);

  const allLoaded = scriptsLoaded.three && scriptsLoaded.gsap && scriptsLoaded.scrollTrigger;

  useEffect(() => {
    if (!allLoaded || initRef.current) return;
    initRef.current = true;

    const THREE = window.THREE;
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!THREE || !gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // ── LOADER ──
    const loader = loaderRef.current;
    const loaderFill = loaderFillRef.current;
    const loaderPct = loaderPctRef.current;
    let pct = 0;

    function startLoader() {
      return new Promise(resolve => {
        const iv = setInterval(() => {
          pct += Math.random() * 12 + 3;
          if (pct >= 100) {
            pct = 100; clearInterval(iv);
            if (loaderFill) loaderFill.style.width = '100%';
            if (loaderPct) loaderPct.textContent = '100';
            setTimeout(() => {
              if (loader) {
                loader.style.transition = 'opacity .8s';
                loader.style.opacity = '0';
                setTimeout(() => { loader.style.display = 'none'; resolve(); }, 800);
              } else resolve();
            }, 300);
          } else {
            if (loaderFill) loaderFill.style.width = pct + '%';
            if (loaderPct) loaderPct.textContent = String(Math.floor(pct)).padStart(3, '0');
          }
        }, 60);
      });
    }

    // ── CURSOR ──
    const curDot = document.getElementById('curDot');
    const curRing = document.getElementById('curRing');
    let mx = 0, my = 0, ddx = 0, ddy = 0, rrx = 0, rry = 0;
    const onMouseMove = e => { mx = e.clientX; my = e.clientY; };
    document.addEventListener('mousemove', onMouseMove);
    function tickCursor() {
      ddx += (mx - ddx) * 0.2; ddy += (my - ddy) * 0.2;
      rrx += (mx - rrx) * 0.08; rry += (my - rry) * 0.08;
      if (curDot) { curDot.style.left = (ddx - 4) + 'px'; curDot.style.top = (ddy - 4) + 'px'; }
      if (curRing) { curRing.style.left = (rrx - 18) + 'px'; curRing.style.top = (rry - 18) + 'px'; }
      requestAnimationFrame(tickCursor);
    }
    tickCursor();

    // ── THREE.JS RENDERER ──
    const canvas = document.getElementById('showroomCanvas');
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf0ede8);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    if (renderer.outputColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf0ede8, 0.008);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 2, 0);

    // ── LIGHTING ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e4e0, 0.5));

    const corridorLength = 80;
    const pointLights = [];
    for (let i = 0; i < 16; i++) {
      const pl = new THREE.PointLight(0xffffff, 0.5, 18);
      pl.position.set(0, 6.8, -i * 5.2);
      scene.add(pl);
      pointLights.push(pl);
    }

    const accentColors = [0xe6264d, 0x00b8d4, 0x7c3aed, 0xf59e0b, 0x10b981, 0xff6b35, 0xe6264d];
    const accentLights = [];
    const screenZPositions = [-6, -14, -22, -30, -38, -46, -corridorLength + 4];
    for (let i = 0; i < 7; i++) {
      const al = new THREE.PointLight(accentColors[i], 0.15, 8);
      const side = i < 6 ? (i % 2 === 0 ? -4 : 4) : 0;
      al.position.set(side, 2.5, screenZPositions[i]);
      scene.add(al);
      accentLights.push(al);
    }

    // ── FLOOR, CEILING, WALLS ──
    const floorGeo = new THREE.PlaneGeometry(12, corridorLength);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd5d0ca, roughness: 0.35, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -corridorLength / 2 + 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9, metalness: 0 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, corridorLength), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 7, -corridorLength / 2 + 2);
    scene.add(ceil);

    for (let i = 0; i < 14; i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      strip.rotation.x = Math.PI / 2;
      strip.position.set(0, 6.98, -i * 6);
      scene.add(strip);
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f3f0, roughness: 0.85, metalness: 0 });
    const wallGeo = new THREE.PlaneGeometry(corridorLength, 7);
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-6, 3.5, -corridorLength / 2 + 2);
    scene.add(leftWall);
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(6, 3.5, -corridorLength / 2 + 2);
    scene.add(rightWall);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), wallMat);
    backWall.position.set(0, 3.5, -corridorLength + 2);
    scene.add(backWall);

    // ── SCREENS ──
    const screens = [];
    SCREEN_DATA.forEach((sd, idx) => {
      const videoEl = document.createElement('video');
      videoEl.src = sd.video;
      videoEl.crossOrigin = 'anonymous';
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.preload = 'auto';
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('webkit-playsinline', '');

      const texCanvas = document.createElement('canvas');
      texCanvas.width = 512; texCanvas.height = 320;
      const ctx = texCanvas.getContext('2d');
      const canvasTex = new THREE.CanvasTexture(texCanvas);
      canvasTex.minFilter = THREE.LinearFilter;

      const videoTex = new THREE.VideoTexture(videoEl);
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      videoTex.format = THREE.RGBAFormat;

      const isBack = sd.side === 'back';
      const screenH = isBack ? 5.5 : 4.16;
      const screenW = isBack ? screenH * (9 / 16) : 6.5;
      const geo = new THREE.PlaneGeometry(screenW, screenH);
      const mat = new THREE.MeshBasicMaterial({ map: canvasTex, color: new THREE.Color(1.15, 1.15, 1.15) });
      const mesh = new THREE.Mesh(geo, mat);

      if (isBack) {
        mesh.position.set(0, 3.2, -corridorLength + 2.05);
      } else {
        const xPos = sd.side === 'left' ? -5.9 : 5.9;
        mesh.position.set(xPos, 3.0, sd.z);
        mesh.rotation.y = sd.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
      }
      scene.add(mesh);

      // Frame
      const frameGeo = new THREE.PlaneGeometry(screenW + 0.15, screenH + 0.15);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.6 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.copy(mesh.position);
      if (isBack) frame.position.z -= 0.01;
      else frame.position.x += sd.side === 'left' ? -0.01 : 0.01;
      frame.rotation.y = mesh.rotation.y;
      scene.add(frame);

      // Spotlight on screen
      const spot = new THREE.SpotLight(0xfff5e8, 0.8, 12, Math.PI / 5);
      if (isBack) spot.position.set(0, 6.5, -corridorLength + 6);
      else spot.position.set(sd.side === 'left' ? -4 : 4, 6.5, sd.z);
      spot.target = mesh;
      scene.add(spot);

      let videoReady = false;
      videoEl.addEventListener('canplay', () => {
        videoEl.play().then(() => { mat.map = videoTex; mat.needsUpdate = true; videoReady = true; }).catch(() => {});
      }, { once: true });
      const tryPlay = () => {
        if (!videoReady) {
          videoEl.play().then(() => { mat.map = videoTex; mat.needsUpdate = true; videoReady = true; }).catch(() => {});
        }
      };
      document.addEventListener('click', tryPlay, { once: true });
      document.addEventListener('touchstart', tryPlay, { once: true });
      document.addEventListener('scroll', tryPlay, { once: true });

      screens.push({ mesh, tex: canvasTex, videoTex, ctx, canvas: texCanvas, data: sd, idx, videoReady: () => videoReady });
    });

    // ── PARTICLES ──
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 12;
      pPositions[i * 3 + 1] = Math.random() * 7;
      pPositions[i * 3 + 2] = -Math.random() * corridorLength;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x888888, size: 0.02, transparent: true, opacity: 0.15, sizeAttenuation: true }));
    scene.add(particles);

    // ── SCREEN TEXTURE FALLBACK ──
    function updateScreenTexture(screen, time) {
      const { ctx: c, canvas: cv, data } = screen;
      const w = cv.width, h = cv.height;
      c.fillStyle = '#0c0c0c';
      c.fillRect(0, 0, w, h);
      const [col1, col2] = data.color;
      const r1 = (col1 >> 16) & 0xff, g1 = (col1 >> 8) & 0xff, b1 = col1 & 0xff;
      const r2 = (col2 >> 16) & 0xff, g2 = (col2 >> 8) & 0xff, b2 = col2 & 0xff;
      for (let i = 0; i < 5; i++) {
        const t = time * 0.4 + i * 1.3;
        const cx = w * 0.5 + Math.sin(t * 0.7 + i) * w * 0.3;
        const cy = h * 0.5 + Math.cos(t * 0.5 + i * 2) * h * 0.3;
        const radius = 80 + Math.sin(t) * 30;
        const grad = c.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(${r1},${g1},${b1},${0.3 + Math.sin(t) * 0.1})`);
        grad.addColorStop(0.5, `rgba(${r2},${g2},${b2},0.15)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = grad;
        c.fillRect(0, 0, w, h);
      }
      c.fillStyle = 'rgba(255,255,255,0.92)';
      c.font = '600 26px "Space Grotesk", sans-serif';
      c.textAlign = 'center';
      c.fillText(data.label, w / 2, h / 2 - 8);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.font = '400 12px "Space Grotesk", sans-serif';
      c.fillText('ColorOut™', w / 2, h / 2 + 20);
      screen.tex.needsUpdate = true;
    }

    // ── MOUSE/TOUCH LOOK ──
    let lookX = 0, lookY = 0, smoothLookX = 0, smoothLookY = 0;
    let isInShowroom = false;
    let touchLookX = 0, touchLookY = 0;
    let isTouchLooking = false, touchStartX = 0, touchStartY = 0;

    const onLookMove = e => {
      if (!isInShowroom) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      lookX = nx * 1.2;
      lookY = ny * 0.3;
    };
    document.addEventListener('mousemove', onLookMove);

    const onTouchStart = e => {
      if (!isInShowroom) return;
      const target = e.target;
      if (target.closest('.nav-mobile') || target.closest('.dpad-btn')) return;
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isTouchLooking = false;
      }
    };
    const onTouchMove = e => {
      if (!isInShowroom || e.touches.length !== 1) return;
      const target = e.target;
      if (target.closest('.nav-mobile') || target.closest('.dpad-btn')) return;
      const rawDx = e.touches[0].clientX - touchStartX;
      const rawDy = e.touches[0].clientY - touchStartY;
      if (!isTouchLooking) {
        if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
        isTouchLooking = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        return;
      }
      const dx = rawDx / window.innerWidth;
      const dy = rawDy / window.innerHeight;
      touchLookX = Math.max(-0.8, Math.min(0.8, touchLookX - dx * 0.8));
      touchLookY = Math.max(-0.3, Math.min(0.3, touchLookY + dy * 0.25));
      lookX = touchLookX;
      lookY = touchLookY * 0.25;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });

    // ── SCROLL-DRIVEN CAMERA ──
    let scrollProgress = 0;
    const showroomEl = document.getElementById('showroomSection');
    const progressBar = document.getElementById('progressBar');
    const scrollHint = document.getElementById('scrollHint');
    const roomLabel = document.getElementById('roomLabel');

    ScrollTrigger.create({
      trigger: '#showroomSection',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5,
      onUpdate: self => {
        scrollProgress = self.progress;
        camera.position.z = 8 - scrollProgress * (corridorLength + 11);
        camera.position.y = 2;
        if (progressBar) progressBar.style.width = (scrollProgress * 40) + '%';
        const roomIdx = Math.min(Math.floor(scrollProgress * ROOM_NAMES.length), ROOM_NAMES.length - 1);
        if (roomLabel) {
          roomLabel.querySelector('.room-name').textContent = ROOM_NAMES[roomIdx];
          roomLabel.querySelector('.room-count').textContent = String(roomIdx + 1).padStart(2, '0') + ' / ' + String(ROOM_NAMES.length).padStart(2, '0');
        }
        if (scrollHint) scrollHint.style.opacity = scrollProgress > 0.02 ? '0' : '1';
        screens.forEach((s, i) => {
          if (i >= accentLights.length) return;
          const dist = Math.abs(camera.position.z - s.mesh.position.z);
          const proximity = Math.max(0, 1 - dist / 10);
          accentLights[i].intensity = 0.1 + proximity * 0.35;
        });
      }
    });

    ScrollTrigger.create({
      trigger: '#showroomSection',
      start: 'top top',
      end: 'bottom bottom',
      onEnter: () => { canvas.style.position = 'fixed'; isInShowroom = true; if (roomLabel) roomLabel.style.opacity = '1'; },
      onLeave: () => { canvas.style.position = 'absolute'; canvas.style.top = 'auto'; canvas.style.bottom = '0'; isInShowroom = false; if (roomLabel) roomLabel.style.opacity = '0'; },
      onEnterBack: () => { canvas.style.position = 'fixed'; canvas.style.top = '0'; canvas.style.bottom = 'auto'; isInShowroom = true; if (roomLabel) roomLabel.style.opacity = '1'; },
      onLeaveBack: () => { canvas.style.position = 'fixed'; isInShowroom = false; }
    });

    // ── NAV CIRCLE DRAG ──
    const navCircle = document.getElementById('navCircle');
    const navLabel = document.getElementById('navCircleLabel');
    let isDragging = false, dragStartY = 0, dragScrollStart = 0;

    const onDragDown = e => {
      if (!isInShowroom) return;
      isDragging = true;
      dragStartY = e.clientY;
      dragScrollStart = window.scrollY;
      navCircle.setPointerCapture(e.pointerId);
      if (navLabel) navLabel.style.opacity = '1';
      e.preventDefault();
    };
    const onDragMove = e => {
      if (!isDragging) return;
      const dy = dragStartY - e.clientY;
      window.scrollTo(0, Math.max(0, dragScrollStart + dy * 4));
      e.preventDefault();
    };
    const onDragUp = () => {
      if (!isDragging) return;
      isDragging = false;
      if (navLabel) navLabel.style.opacity = '0';
    };
    if (navCircle) navCircle.addEventListener('pointerdown', onDragDown);
    document.addEventListener('pointermove', onDragMove, { passive: false });
    document.addEventListener('pointerup', onDragUp);

    // ── D-PAD CONTROLS ──
    let walkSpeed = 0, walkTarget = 0, turnSpeed = 0, turnTarget = 0;
    const WALK_ACCEL = 0.12, WALK_MAX = 16, WALK_DECEL = 0.85;
    const TURN_ACCEL = 0.08, TURN_MAX = 0.012, TURN_DECEL = 0.82;
    let dpadAnimFrame = null;
    const activeBtns = new Set();

    function dpadStart(btn, axis, dir) {
      btn.classList.add('active');
      activeBtns.add(btn);
      if (axis === 'walk') walkTarget = dir;
      if (axis === 'turn') turnTarget = dir;
      if (!dpadAnimFrame) dpadAnimFrame = requestAnimationFrame(dpadLoop);
    }
    function dpadStop(btn, axis) {
      btn.classList.remove('active');
      activeBtns.delete(btn);
      if (axis === 'walk') walkTarget = 0;
      if (axis === 'turn') turnTarget = 0;
    }
    function dpadStopAll() {
      walkTarget = 0; turnTarget = 0;
      activeBtns.forEach(b => b.classList.remove('active'));
      activeBtns.clear();
    }
    function dpadLoop() {
      if (walkTarget !== 0) walkSpeed += (walkTarget * WALK_MAX - walkSpeed) * WALK_ACCEL;
      else { walkSpeed *= WALK_DECEL; if (Math.abs(walkSpeed) < 0.3) walkSpeed = 0; }
      if (walkSpeed !== 0) window.scrollBy(0, walkSpeed);
      if (turnTarget !== 0) turnSpeed += (turnTarget * TURN_MAX - turnSpeed) * TURN_ACCEL;
      else { turnSpeed *= TURN_DECEL; if (Math.abs(turnSpeed) < 0.0003) turnSpeed = 0; }
      if (turnSpeed !== 0) {
        touchLookX = Math.max(-0.8, Math.min(0.8, touchLookX + turnSpeed));
        lookX = touchLookX;
      }
      if (walkSpeed !== 0 || turnSpeed !== 0 || walkTarget !== 0 || turnTarget !== 0) {
        dpadAnimFrame = requestAnimationFrame(dpadLoop);
      } else dpadAnimFrame = null;
    }

    function bindDpad(elId, axis, dir) {
      const el = document.getElementById(elId);
      if (!el) return;
      el.addEventListener('touchstart', e => { e.preventDefault(); dpadStart(el, axis, dir); }, { passive: false });
      el.addEventListener('touchend', e => { e.preventDefault(); dpadStop(el, axis); }, { passive: false });
      el.addEventListener('touchcancel', () => dpadStop(el, axis));
      el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') dpadStart(el, axis, dir); });
      el.addEventListener('pointerup', e => { if (e.pointerType === 'mouse') dpadStop(el, axis); });
    }
    bindDpad('dpadUp', 'walk', 1);
    bindDpad('dpadDown', 'walk', -1);
    bindDpad('dpadLeft', 'turn', -1);
    bindDpad('dpadRight', 'turn', 1);
    document.addEventListener('pointerup', () => { if (activeBtns.size) dpadStopAll(); });

    // ── GALLERY (floating parallax) ──
    const galleryCanvas2 = document.getElementById('galleryCanvas');
    const positions = [
      {x:'5%',y:'0%',w:280,h:360},{x:'55%',y:'3%',w:220,h:300},{x:'30%',y:'8%',w:200,h:250},
      {x:'75%',y:'12%',w:260,h:340},{x:'10%',y:'16%',w:240,h:200},{x:'48%',y:'18%',w:180,h:280},
      {x:'2%',y:'26%',w:300,h:240},{x:'60%',y:'28%',w:200,h:260},{x:'35%',y:'33%',w:220,h:300},
      {x:'78%',y:'36%',w:260,h:200},{x:'8%',y:'42%',w:200,h:320},{x:'52%',y:'44%',w:240,h:280},
      {x:'25%',y:'50%',w:280,h:220},{x:'70%',y:'53%',w:200,h:260},{x:'5%',y:'58%',w:220,h:300},
      {x:'45%',y:'62%',w:260,h:240},{x:'80%',y:'66%',w:180,h:280},{x:'30%',y:'72%',w:240,h:320},
    ];
    const hues = ['rgba(139,92,246,.08)','rgba(0,184,212,.07)','rgba(230,38,77,.07)','rgba(16,185,129,.07)','rgba(245,158,11,.07)','rgba(255,107,53,.07)'];
    const rotations = [-3,2,-1,3,-2,1,-3,2,-1,3,-2,1,0,-1,2,-3,1,-2];
    const speeds = [.2,.5,.8,.3,.6,.9,.4,.7,.15,.55,.85,.35,.65,.45,.75,.25,.95,.5];
    const gItems = [];

    if (galleryCanvas2) {
      for (let i = 0; i < 18; i++) {
        const p = positions[i];
        const el = document.createElement('div');
        el.className = 'gallery-item';
        el.style.cssText = `left:${p.x};top:${p.y};width:${p.w}px;height:${p.h}px;transform:rotate(${rotations[i]}deg)`;
        el.dataset.speed = speeds[i];
        el.innerHTML = `<div class="gi-inner" style="background:${hues[i%hues.length]}"><span class="gi-idx">${String(i+1).padStart(2,'0')}</span><span class="gi-code">CO-${2020+Math.floor(i/5)}-${String(i+1).padStart(3,'0')}</span></div>`;
        galleryCanvas2.appendChild(el);
        gItems.push(el);
      }

      gItems.forEach(item => {
        const spd = parseFloat(item.dataset.speed);
        gsap.to(item, {
          y: () => -200 * spd,
          ease: 'none',
          scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: 1.5 }
        });
      });
      gsap.from(gItems, {
        opacity: 0, y: 80, scale: 0.9,
        stagger: 0.08, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: '#gallery', start: 'top 80%' }
      });
      document.addEventListener('mousemove', e => {
        const normX = (e.clientX / window.innerWidth - 0.5) * 2;
        gItems.forEach(item => {
          const spd = parseFloat(item.dataset.speed);
          gsap.to(item, { x: normX * 15 * spd, duration: 1.2, ease: 'power2.out' });
        });
      });
    }

    // ── RENDER LOOP ──
    const clock = new THREE.Clock();
    let animating = true;
    function animate() {
      if (!animating) return;
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const isMobile = window.innerWidth <= 768;
      const smoothFactor = isMobile ? 0.035 : 0.06;
      smoothLookX += (lookX - smoothLookX) * smoothFactor;
      smoothLookY += (lookY - smoothLookY) * smoothFactor;
      const lookDist = 10;
      const targetX = Math.sin(smoothLookX) * lookDist;
      const targetY = 2 - smoothLookY * 3;
      const targetZ = camera.position.z - Math.cos(smoothLookX) * lookDist;
      camera.lookAt(targetX, targetY, targetZ);
      screens.forEach(s => { if (!s.videoReady()) updateScreenTexture(s, t); });
      const posArr = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.001;
        if (posArr[i * 3 + 1] > 5) posArr[i * 3 + 1] = 0;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      pointLights.forEach((pl, i) => { pl.intensity = 0.45 + Math.sin(t * 0.3 + i * 0.8) * 0.05; });
      accentLights.forEach((al, i) => { al.intensity = 0.12 + Math.sin(t * 0.5 + i * 1.5) * 0.06; });
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Loader
    startLoader();

    // ── CLEANUP ──
    return () => {
      animating = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousemove', onLookMove);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragUp);
      window.removeEventListener('resize', onResize);
      ScrollTrigger.getAll().forEach(t => t.kill());
      renderer.dispose();
    };
  }, [allLoaded]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showClaim ? 'hidden' : '';
  }, [showClaim]);

  return (
    <>
      {/* Scripts */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(s => ({ ...s, three: true }))}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(s => ({ ...s, gsap: true }))}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(s => ({ ...s, scrollTrigger: true }))}
      />

      {/* Loader */}
      <div className="loader" id="loader" ref={loaderRef}>
        <div className="loader-brand">ColorOut&trade;</div>
        <div className="loader-bar"><div className="loader-fill" ref={loaderFillRef}></div></div>
        <div className="loader-pct" ref={loaderPctRef}>000</div>
      </div>

      {/* Cursor */}
      <div className="cur-dot" id="curDot"></div>
      <div className="cur-ring" id="curRing"></div>

      {/* Progress */}
      <div className="progress" id="progressBar"></div>

      {/* Nav */}
      <nav className="nav">
        <a href="#" className="nav-brand">ColorOut&trade;</a>
        <ul className="nav-links">
          <li><a href="#">About</a></li>
          <li><a href="/gallery">Archive</a></li>
          <li><a href="#">Verify</a></li>
        </ul>
      </nav>

      {/* Scroll hint */}
      <div className="scroll-hint" id="scrollHint">
        <div className="arrow"></div>
        Scroll to walk &middot; Move mouse to look around
      </div>

      {/* Room label */}
      <div className="room-label" id="roomLabel">
        <div className="room-name">Entrance</div>
        <div className="room-count">01 / 08</div>
      </div>

      {/* Nav circle (drag to walk) */}
      <div className="nav-circle" id="navCircle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 4 L12 20 M6 9 L12 4 L18 9 M6 15 L12 20 L18 15"/>
        </svg>
      </div>
      <div className="nav-circle-label" id="navCircleLabel">Drag to walk</div>

      {/* Mobile D-pad */}
      <div className="nav-mobile" id="navMobile">
        <div className="dpad">
          <div id="dpadUp" className="dpad-btn dpad-up">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15L12 9L6 15"/></svg>
          </div>
          <div id="dpadDown" className="dpad-btn dpad-down">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9L12 15L18 9"/></svg>
          </div>
          <div id="dpadLeft" className="dpad-btn dpad-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6L9 12L15 18"/></svg>
          </div>
          <div id="dpadRight" className="dpad-btn dpad-right">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6L15 12L9 18"/></svg>
          </div>
          <div className="dpad-center"></div>
        </div>
      </div>

      {/* 3D Showroom */}
      <div className="showroom-section" id="showroomSection">
        <canvas id="showroomCanvas"></canvas>
      </div>

      {/* Floating Gallery */}
      <section className="gallery-section" id="gallery">
        <div className="gallery-header">
          <h2>The <span className="spectrum-text">Archive</span></h2>
          <p>ColorOut Project by Patrick Cat</p>
        </div>
        <div className="gallery-canvas" id="galleryCanvas"></div>
      </section>

      <div className="archive-cta">
        <a href="/gallery">View Full Archive</a>
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-spectrum"></div>
        <div className="footer-cta">
          <div className="footer-cta-label">Have a ColorOut&trade; tattoo?</div>
          <h3>Claim Your Passport</h3>
          <p>Each tattoo is a unique work of art, documented and authenticated with a permanent certificate of provenance. Request yours and join the living archive.</p>
          <button className="footer-cta-btn" onClick={() => setShowClaim(true)}>Request Passport</button>
        </div>
        <div className="footer-concept">
          <div className="footer-concept-col">
            <h4>The Concept</h4>
            <blockquote>Color inhabits and co-inhabits spaces and objects, as well as emotions and memories that shape dreams. Preserving color is preserving our capacity to feel, to dream, and to be.</blockquote>
          </div>
          <div className="footer-concept-col">
            <h4>About ColorOut&trade;</h4>
            <p>ColorOut&trade; is a multidisciplinary artistic project that uses color as a living language to create immersive experiences through tattoos, paintings, and sculptures. The skin, as a living canvas, becomes a unique exhibition space where the tattoo integrates color into the body, fusing it with the wearer&apos;s identity.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-brand spectrum-text">ColorOut&trade;</div>
          <ul className="footer-bottom-links">
            <li><a href="https://instagram.com/patrickcat_art" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href="https://mixiartstudio.us" target="_blank" rel="noopener noreferrer">Mixi Art</a></li>
            <li><a href="https://coloroutpassport.com" target="_blank" rel="noopener noreferrer">Passport</a></li>
          </ul>
          <div className="footer-bottom-copy">&copy; 2026 Mixi Art Studio LLC</div>
        </div>
      </footer>

      {showClaim && <ClaimPassportForm onClose={() => setShowClaim(false)} />}

      <style jsx>{`
        .loader{position:fixed;inset:0;background:#f5f3f0;z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .loader-brand{font-family:var(--font-display);font-size:13px;letter-spacing:6px;text-transform:uppercase;color:rgba(26,26,26,.45);margin-bottom:40px}
        .loader-bar{width:200px;height:1px;background:rgba(26,26,26,.15);position:relative;overflow:hidden}
        .loader-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:var(--gradient-spectrum);background-size:300% 100%;animation:specFlow 2s linear infinite}
        .loader-pct{font-family:var(--font-display);font-size:11px;letter-spacing:4px;color:rgba(26,26,26,.25);margin-top:20px;font-variant-numeric:tabular-nums}

        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:20px 40px;display:flex;justify-content:space-between;align-items:center;mix-blend-mode:difference}
        .nav-brand{font-family:var(--font-display);font-size:12px;letter-spacing:5px;text-transform:uppercase;color:var(--fg);text-decoration:none}
        .nav-links{display:flex;gap:32px;list-style:none}
        .nav-links a{font-family:var(--font-display);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--fg-muted);text-decoration:none;transition:color .3s}
        .nav-links a:hover{color:var(--fg)}
        @media(max-width:768px){.nav{padding:16px 20px}.nav-links{display:none}}

        .showroom-section{position:relative;height:500vh}
        #showroomCanvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:1}

        .scroll-hint{position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:50;font-family:var(--font-display);font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--fg-dim);display:flex;align-items:center;gap:12px;transition:opacity .6s}
        .scroll-hint .arrow{width:1px;height:24px;background:var(--fg-dim);position:relative;animation:pulse 2s ease-in-out infinite}

        .room-label{position:fixed;bottom:40px;right:40px;z-index:50;font-family:var(--font-display);font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--fg-dim);text-align:right;transition:opacity .4s}
        .room-label .room-name{color:var(--fg-muted);font-size:12px;letter-spacing:3px;margin-bottom:4px}

        .nav-circle{position:fixed;bottom:36px;left:50%;transform:translateX(-50%);z-index:60;width:56px;height:56px;border-radius:50%;border:1.5px solid rgba(26,26,26,.25);background:rgba(255,255,255,.12);backdrop-filter:blur(8px);cursor:grab;touch-action:none;user-select:none;display:flex;align-items:center;justify-content:center;transition:opacity .4s,border-color .3s,transform .2s}
        .nav-circle:active{cursor:grabbing;border-color:rgba(26,26,26,.5);transform:translateX(-50%) scale(.92)}
        .nav-circle svg{width:20px;height:20px;opacity:.35;pointer-events:none}
        .nav-circle-label{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);z-index:60;font-family:var(--font-display);font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--fg-dim);opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap}

        .nav-mobile{position:fixed;bottom:20px;right:20px;z-index:60;display:none;width:140px;height:140px;touch-action:none;user-select:none;transition:opacity .4s}
        .dpad{position:relative;width:100%;height:100%}
        .dpad-btn{position:absolute;width:44px;height:44px;border:1.5px solid rgba(26,26,26,.18);background:rgba(255,255,255,.15);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;transition:background .12s,border-color .12s;border-radius:10px}
        .dpad-btn.active{background:rgba(26,26,26,.12);border-color:rgba(26,26,26,.4)}
        .dpad-btn svg{width:16px;height:16px;opacity:.4;pointer-events:none}
        .dpad-up{top:0;left:50%;transform:translateX(-50%);border-radius:14px 14px 6px 6px}
        .dpad-down{bottom:0;left:50%;transform:translateX(-50%);border-radius:6px 6px 14px 14px}
        .dpad-left{left:0;top:50%;transform:translateY(-50%);border-radius:14px 6px 6px 14px}
        .dpad-right{right:0;top:50%;transform:translateY(-50%);border-radius:6px 14px 14px 6px}
        .dpad-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;border:1.5px solid rgba(26,26,26,.1);background:rgba(255,255,255,.08);backdrop-filter:blur(6px)}
        @media(max-width:768px){.nav-circle,.nav-circle-label{display:none!important}.nav-mobile{display:flex}}
        @media(min-width:769px){.nav-mobile{display:none!important}}

        .gallery-section{position:relative;min-height:300vh;padding:120px 0;z-index:2;background:#f5f3f0}
        .gallery-header{text-align:center;margin-bottom:100px;padding:0 24px}
        .gallery-header h2{font-family:var(--font-display);font-size:clamp(40px,7vw,80px);font-weight:700;letter-spacing:-2px;text-transform:uppercase;line-height:.9}
        .gallery-header p{font-size:13px;color:var(--fg-muted);letter-spacing:2px;text-transform:uppercase;margin-top:20px}
        .gallery-canvas{position:relative;width:100%;min-height:250vh}

        .archive-cta{text-align:center;padding:40px 24px 100px;position:relative;z-index:3;background:#f5f3f0}
        .archive-cta a{display:inline-block;padding:18px 56px;border:1.5px solid var(--fg);color:var(--fg);font-family:var(--font-display);font-size:11px;font-weight:500;letter-spacing:5px;text-transform:uppercase;text-decoration:none;transition:background .3s,color .3s}
        .archive-cta a:hover{background:var(--fg);color:#f5f3f0}
      `}</style>

      <style jsx global>{`
        .gallery-item{position:absolute;overflow:hidden;cursor:pointer;transition:box-shadow .4s}
        .gallery-item:hover{box-shadow:0 20px 60px rgba(0,0,0,.12),0 0 40px rgba(0,0,0,.04)}
        .gallery-item .gi-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative}
        .gallery-item .gi-code{font-family:var(--font-display);font-size:11px;letter-spacing:3px;color:var(--fg-muted);text-transform:uppercase}
        .gallery-item .gi-idx{position:absolute;top:12px;left:14px;font-family:var(--font-display);font-size:9px;letter-spacing:2px;color:var(--fg-dim)}
      `}</style>
    </>
  );
}
