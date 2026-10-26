// Empresas CamiLombriz Ltda. - Real 360° Virtual Reality Panoramic Scroll Experience
// Pure 360° Photographic Background + Clean Editorial Typography

(function () {
  'use strict';

  const CHAPTERS = [
    {
      id: '01',
      label: 'Inicio',
      topline: 'V REGIÓN · QUILPUÉ · BELLOTO · VILLA ALEMANA',
      hint: 'GIRA LA RUEDA O ARRASTRA EN 360°',
      targetYaw: 0,
      targetPitch: 0
    },
    {
      id: '02',
      label: 'Riego',
      topline: 'SISTEMAS DE RIEGO TECNIFICADO · CÉSPED & PARCELAS',
      hint: 'DESLIZA PARA SEGUIR RECORRIENDO',
      targetYaw: -0.65,
      targetPitch: -0.05
    },
    {
      id: '03',
      label: 'Jardín',
      topline: 'JARDINERÍA & PODA INTEGRAL · PAISAJISMO Y REGENERACIÓN',
      hint: 'ARRASTRA EN 360° PARA EXPLORAR EL JARDÍN',
      targetYaw: 1.25,
      targetPitch: 0.08
    },
    {
      id: '04',
      label: 'Fumigación',
      topline: 'FUMIGACIONES & SANIDAD FITOSANITARIA · CONTROL SAG',
      hint: 'GESTIÓN AMBIENTAL & PROTECCIÓN BIOLÓGICA',
      targetYaw: -2.22,
      targetPitch: 0.02
    },
    {
      id: '05',
      label: 'Contacto',
      topline: 'ATENCIÓN DIRECTA · ING. AGRÓNOMO PUCV (+56 9 9953 6785)',
      hint: 'CONVERSA DIRECTO POR WHATSAPP',
      targetYaw: 0,
      targetPitch: 0
    }
  ];

  // --- DOM Elements ---
  const rootEl = document.getElementById('xp-root');
  const canvasEl = document.getElementById('xp-canvas');
  const toplineTextEl = document.getElementById('xp-topline-text');
  const lookEl = document.getElementById('xp-look');
  const angleEl = document.getElementById('xp-angle');
  const progressBarEl = document.getElementById('xp-progress-bar');
  const loaderEl = document.getElementById('xp-loader');
  const loaderBarEl = document.getElementById('xp-loader-fill');
  const loaderPctEl = document.getElementById('xp-loader-pct');
  const hintTextEl = document.getElementById('xp-hint-text');
  const chaptersNav = document.getElementById('xp-chapters-nav');
  const soundBtn = document.getElementById('xp-sound-btn');
  const motionBtn = document.getElementById('xp-motion-btn');
  const replayBtn = document.getElementById('xp-replay-btn');

  const scene01 = document.getElementById('scene-01');
  const scene02 = document.getElementById('scene-02');
  const scene03 = document.getElementById('scene-03');
  const scene04 = document.getElementById('scene-04');
  const scene05 = document.getElementById('scene-05');

  const menuDialog = document.getElementById('xp-menu-dialog');
  const menuBackdrop = document.getElementById('xp-menu-backdrop');
  const menuToggle = document.getElementById('xp-menu-toggle');
  const menuClose = document.getElementById('xp-menu-close');

  // --- WebAudio Synthesizer ---
  class NatureSoundscape {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sources = [];
      this.isPlaying = false;
    }

    start() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);

        const bufSize = this.ctx.sampleRate * 2;
        const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2) * 0.3;
        }

        const src = this.ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 1.0;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.22;

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        src.start(0);
        this.sources.push(src);

        const chord = [130.81, 196.0, 261.63, 329.63];
        const chordGain = this.ctx.createGain();
        chordGain.gain.value = 0.07;
        chordGain.connect(this.master);

        chord.forEach(f => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          osc.connect(chordGain);
          osc.start();
          this.sources.push(osc);
        });
      }

      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.3);
      this.isPlaying = true;
    }

    stop() {
      if (!this.ctx || !this.isPlaying) return;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      this.isPlaying = false;
    }
  }

  const soundSystem = new NatureSoundscape();

  // --- Three.js 360° VR Spherical Scene ---
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 0, 0); // Positioned exactly at center of 360 sphere

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // 360 Navigation Variables
  let targetScroll = 0;
  let currentScroll = 0;
  const scrubLength = 5000;

  let userYaw = 0;
  let userPitch = 0;
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let isReducedMotion = false;

  // --- 360° Spherical VR Panoramas (Strictly Agronomic & Landscaping) ---
  const sphereGeo = new THREE.SphereGeometry(500, 60, 40);
  sphereGeo.scale(-1, 1, 1); // Invert so faces point inward toward center

  const textureLoader = new THREE.TextureLoader();
  let loadedCount = 0;
  const totalToLoad = 4;

  function trackLoad() {
    loadedCount++;
    const pct = Math.min(100, Math.round((loadedCount / totalToLoad) * 100));
    if (loaderBarEl) loaderBarEl.style.transform = `scaleX(${pct / 100})`;
    if (loaderPctEl) loaderPctEl.textContent = `${pct}%`;
    if (loadedCount >= totalToLoad) {
      setTimeout(() => {
        rootEl.classList.add('is-ready');
      }, 250);
    }
  }

  // 1. Terreno / Parcela V Región (Inicio: Suelo Nuevo)
  const parcelaTex = textureLoader.load('assets/places/autumn_park.webp', trackLoad, undefined, () => trackLoad());
  parcelaTex.colorSpace = THREE.SRGBColorSpace;
  const parcelaMat = new THREE.MeshBasicMaterial({
    map: parcelaTex,
    transparent: true,
    opacity: 1,
    depthWrite: false
  });
  const parcelaSphere = new THREE.Mesh(sphereGeo, parcelaMat);
  parcelaSphere.renderOrder = 1;
  scene.add(parcelaSphere);

  // 2. Césped y Riego Tecnificado (Riego)
  const lawnTex = textureLoader.load('assets/places/eilenriede_park.webp', trackLoad, undefined, () => trackLoad());
  lawnTex.colorSpace = THREE.SRGBColorSpace;
  const lawnMat = new THREE.MeshBasicMaterial({
    map: lawnTex,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const lawnSphere = new THREE.Mesh(sphereGeo, lawnMat);
  lawnSphere.renderOrder = 2;
  scene.add(lawnSphere);

  // 3. Jardín Botánico & Arboleda Podada (Jardinería, Poda y Contacto)
  const gardenTex = textureLoader.load('assets/places/ninomaru_teien.webp', trackLoad, undefined, () => trackLoad());
  gardenTex.colorSpace = THREE.SRGBColorSpace;
  const gardenMat = new THREE.MeshBasicMaterial({
    map: gardenTex,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const gardenSphere = new THREE.Mesh(sphereGeo, gardenMat);
  gardenSphere.renderOrder = 3;
  scene.add(gardenSphere);

  // 4. Huerto de Cítricos con Técnico en Traje y Motopulverizadora (Control Fitosanitario SAG)
  const fumigacionTex = textureLoader.load('assets/places/fumigacion_360.webp', trackLoad, undefined, () => trackLoad());
  fumigacionTex.colorSpace = THREE.SRGBColorSpace;
  const fumigacionMat = new THREE.MeshBasicMaterial({
    map: fumigacionTex,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const fumigacionSphere = new THREE.Mesh(sphereGeo, fumigacionMat);
  fumigacionSphere.renderOrder = 4;
  scene.add(fumigacionSphere);

  // --- Ambient Floating Sunbeams / Water Droplets ---
  const partCount = 350;
  const partGeo = new THREE.BufferGeometry();
  const partPos = new Float32Array(partCount * 3);
  const partVel = new Float32Array(partCount * 3);

  for (let i = 0; i < partCount; i++) {
    const r = 8 + Math.random() * 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;

    partPos[i * 3] = r * Math.cos(phi) * Math.sin(theta);
    partPos[i * 3 + 1] = r * Math.sin(phi);
    partPos[i * 3 + 2] = r * Math.cos(phi) * Math.cos(theta);

    partVel[i * 3 + 1] = -0.005 - Math.random() * 0.01;
  }

  partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
  const partMat = new THREE.PointsMaterial({
    color: 0xfef08a,
    size: 0.12,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending
  });
  const particleField = new THREE.Points(partGeo, partMat);
  scene.add(particleField);

  // --- Scroll Scrubbing & Chapter Updates ---
  function updateTimeline(progress) {
    // Exact target opacities for clean non-ghosted transitions
    let targetParcela = 0;
    let targetLawn = 0;
    let targetGarden = 0;
    let targetFumigacion = 0;
    let targetColor = 0xfef08a; // warm sunlight

    if (progress <= 0.16) {
      // 01 Inicio: Parcela / Suelo Nuevo
      targetParcela = 1.0;
      targetColor = 0xfef08a;
    } else if (progress < 0.28) {
      // Transición 01 -> 02 (Riego)
      const t = (progress - 0.16) / (0.28 - 0.16);
      targetParcela = 1 - t;
      targetLawn = t;
      targetColor = 0x38bdf8;
    } else if (progress <= 0.44) {
      // 02 Riego Tecnificado (100% Césped e irrigación)
      targetLawn = 1.0;
      targetColor = 0x38bdf8; // Blue water spray
    } else if (progress < 0.52) {
      // Transición 02 -> 03 (Jardín)
      const t = (progress - 0.44) / (0.52 - 0.44);
      targetLawn = 1 - t;
      targetGarden = t;
      targetColor = 0x84cc16;
    } else if (progress <= 0.68) {
      // 03 Jardinería, Poda y Tala (100% Jardín Botánico impecable)
      targetGarden = 1.0;
      targetColor = 0x84cc16; // Organic green
    } else if (progress < 0.76) {
      // Transición 03 -> 04 (Fumigación)
      const t = (progress - 0.68) / (0.76 - 0.68);
      targetGarden = 1 - t;
      targetFumigacion = t;
      targetColor = 0xf59e0b;
    } else if (progress <= 0.88) {
      // 04 Control Fitosanitario SAG (100% Huerto de cítricos con técnico en traje y pulverizadora)
      targetFumigacion = 1.0;
      targetColor = 0xf59e0b; // Amber bio-protection mist
    } else if (progress < 0.94) {
      // Transición 04 -> 05 (Contacto)
      const t = (progress - 0.88) / (0.94 - 0.88);
      targetFumigacion = 1 - t;
      targetGarden = t;
      targetColor = 0xfcd34d;
    } else {
      // 05 Contacto Directo (100% Jardín consolidado para entrega)
      targetGarden = 1.0;
      targetColor = 0xfcd34d; // Gold
    }

    // Smooth lerp for buttery smooth transitions
    parcelaMat.opacity = THREE.MathUtils.lerp(parcelaMat.opacity, targetParcela, 0.12);
    lawnMat.opacity = THREE.MathUtils.lerp(lawnMat.opacity, targetLawn, 0.12);
    gardenMat.opacity = THREE.MathUtils.lerp(gardenMat.opacity, targetGarden, 0.12);
    fumigacionMat.opacity = THREE.MathUtils.lerp(fumigacionMat.opacity, targetFumigacion, 0.12);
    partMat.color.lerp(new THREE.Color(targetColor), 0.1);

    // Determine Active Chapter
    let activeIdx = 0;
    if (progress < 0.20) {
      activeIdx = 0;
      scene01.classList.add('is-active');
      scene02.classList.remove('is-active');
      scene03.classList.remove('is-active');
      scene04.classList.remove('is-active');
      scene05.classList.remove('is-active');
    } else if (progress < 0.45) {
      activeIdx = 1;
      scene01.classList.remove('is-active');
      scene02.classList.add('is-active');
      scene03.classList.remove('is-active');
      scene04.classList.remove('is-active');
      scene05.classList.remove('is-active');
    } else if (progress < 0.70) {
      activeIdx = 2;
      scene01.classList.remove('is-active');
      scene02.classList.remove('is-active');
      scene03.classList.add('is-active');
      scene04.classList.remove('is-active');
      scene05.classList.remove('is-active');
    } else if (progress < 0.88) {
      activeIdx = 3;
      scene01.classList.remove('is-active');
      scene02.classList.remove('is-active');
      scene03.classList.remove('is-active');
      scene04.classList.add('is-active');
      scene05.classList.remove('is-active');
    } else {
      activeIdx = 4;
      scene01.classList.remove('is-active');
      scene02.classList.remove('is-active');
      scene03.classList.remove('is-active');
      scene04.classList.remove('is-active');
      scene05.classList.add('is-active');
    }

    const chap = CHAPTERS[activeIdx];
    if (toplineTextEl) toplineTextEl.textContent = chap.topline;
    if (hintTextEl) hintTextEl.textContent = chap.hint;

    // Update chapter dots/buttons
    if (chaptersNav) {
      chaptersNav.querySelectorAll('button').forEach((b, i) => {
        b.classList.toggle('is-active', i === activeIdx);
      });
    }

    // Progress line
    if (progressBarEl) progressBarEl.style.transform = `scaleX(${progress})`;
  }

  // --- Wheel & Key Navigation ---
  window.addEventListener('wheel', e => {
    e.preventDefault();
    targetScroll = THREE.MathUtils.clamp(targetScroll + (e.deltaY / scrubLength), 0, 1);
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    const step = 0.08;
    if (e.key === 'ArrowDown' || e.key === ' ') {
      targetScroll = Math.min(1, targetScroll + step);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      targetScroll = Math.max(0, targetScroll - step);
      e.preventDefault();
    } else if (e.key === 'PageDown') {
      targetScroll = Math.min(1, targetScroll + step * 2.5);
      e.preventDefault();
    } else if (e.key === 'PageUp') {
      targetScroll = Math.max(0, targetScroll - step * 2.5);
      e.preventDefault();
    } else if (e.key === 'Home') {
      targetScroll = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      targetScroll = 1;
      e.preventDefault();
    }
  });

  // --- 360° VR Drag Looking (Mouse & Touch) ---
  canvasEl.addEventListener('pointerdown', e => {
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    canvasEl.setPointerCapture(e.pointerId);
  });

  window.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    // Adjust 360° VR viewing angles
    userYaw -= dx * 0.0035;
    userPitch = THREE.MathUtils.clamp(userPitch - dy * 0.0025, -Math.PI / 2.3, Math.PI / 2.3);

    const deg = Math.round(((userYaw * 180 / Math.PI) % 360 + 360) % 360);
    if (angleEl) angleEl.textContent = `${String(deg).padStart(3, '0')}°`;
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
  });

  // Chapter buttons click
  if (chaptersNav) {
    chaptersNav.querySelectorAll('button').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const targets = [0, 0.32, 0.58, 0.80, 1.0];
        targetScroll = targets[idx] ?? 0;
      });
    });
  }

  // Replay button click
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      targetScroll = 0;
      userYaw = 0;
      userPitch = 0;
    });
  }

  // Sound toggle
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      if (soundSystem.isPlaying) {
        soundSystem.stop();
        soundBtn.classList.remove('is-on');
        soundBtn.querySelector('.xp-label').textContent = 'Sonido';
      } else {
        soundSystem.start();
        soundBtn.classList.add('is-on');
        soundBtn.querySelector('.xp-label').textContent = 'Sonido: ON';
      }
    });
  }

  // Motion toggle
  if (motionBtn) {
    motionBtn.addEventListener('click', () => {
      isReducedMotion = !isReducedMotion;
      motionBtn.querySelector('.xp-label').textContent = isReducedMotion ? 'Inercia: Off' : 'Movimiento';
    });
  }

  // Side Drawer menu handlers
  if (menuToggle && menuDialog && menuBackdrop && menuClose) {
    menuToggle.addEventListener('click', () => {
      menuDialog.classList.add('is-open');
      menuBackdrop.classList.add('is-open');
    });

    const closeDrawer = () => {
      menuDialog.classList.remove('is-open');
      menuBackdrop.classList.remove('is-open');
    };

    menuClose.addEventListener('click', closeDrawer);
    menuBackdrop.addEventListener('click', closeDrawer);

    // Wire "Ver en 360°" buttons from the drawer
    document.querySelectorAll('[data-goto-chapter]').forEach(btn => {
      btn.addEventListener('click', e => {
        const chap = btn.getAttribute('data-goto-chapter');
        const targetMap = {
          '01': 0,
          '02': 0.32,
          '03': 0.58,
          '04': 0.80,
          '05': 1.0
        };
        if (targetMap[chap] !== undefined) {
          targetScroll = targetMap[chap];
          closeDrawer();
        }
      });
    });
  }

  // --- Animation Loop ---
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(50, now - lastTime) / 1000;
    lastTime = now;

    // Smooth scroll interpolation
    if (isReducedMotion) {
      currentScroll = targetScroll;
    } else {
      currentScroll += (targetScroll - currentScroll) * 0.08;
    }

    updateTimeline(currentScroll);

    // Subtle automatic cinematic drift when not actively dragging
    if (!isDragging) {
      userYaw += 0.0003;
    }

    // Apply 360° VR camera rotation
    camera.rotation.y = userYaw;
    camera.rotation.x = userPitch;

    // Subtle particle drift
    const pos = partGeo.attributes.position.array;
    for (let i = 0; i < partCount; i++) {
      pos[i * 3 + 1] += partVel[i * 3 + 1];
      if (pos[i * 3 + 1] < -12) pos[i * 3 + 1] = 12;
    }
    partGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

})();
