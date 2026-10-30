(() => {
  const canvas = document.getElementById('gameCanvas');
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const comboEl = document.getElementById('combo');
  const bestEl = document.getElementById('best');
  const energyFill = document.getElementById('energyFill');
  const turboFill = document.getElementById('turboFill');
  const livesEl = document.getElementById('lives');
  const centerMessage = document.getElementById('centerMessage');
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const finalScore = document.getElementById('finalScore');
  const finalCoins = document.getElementById('finalCoins');
  const finalCombo = document.getElementById('finalCombo');
  const finalBest = document.getElementById('finalBest');
  const resultMessage = document.getElementById('resultMessage');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  const turboBtn = document.getElementById('turboBtn');

  const BEST_KEY = 'pedalTurboRealisticBest';
  const lanePositions = [-4.1, 0, 4.1];
  const obstacleTypes = ['preguica', 'ansiedade', 'cansaco', 'estresse', 'barreira'];
  let bestScore = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = bestScore;

  let scene, camera, renderer, clock;
  let world, roadLines = [], buildings = [], lamps = [];
  let cyclist, cyclistRig, bikeFrontWheel, bikeRearWheel;
  let playing = false, gameEnded = false;
  let currentLane = 1, targetLane = 1;
  let jumpTimer = 0, isJumping = false;
  let turboTimer = 0, messageTimer = 0;
  let baseSpeed = 28, speed = 28;
  let score = 0, coins = 0, combo = 1, maxCombo = 1, lives = 3, energy = 100, turbo = 0;
  let swipeStart = null;
  const actors = [];

  init();
  animate();

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x7f5ab9, 0.013);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 350);
    camera.position.set(0, 5.5, 17);
    camera.lookAt(0, 2.8, -20);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    clock = new THREE.Clock();

    const hemi = new THREE.HemisphereLight(0xffddb9, 0x4d2e66, 1.4);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffbc77, 1.9);
    sun.position.set(7, 18, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    const fill = new THREE.PointLight(0xff7a00, 2.2, 55, 2);
    fill.position.set(0, 7, 8);
    scene.add(fill);

    buildWorld();
    buildCyclist();
    seedActors();
    bindEvents();
    updateHUD();
  }

  function buildWorld() {
    world = new THREE.Group();
    scene.add(world);

    const skyGeo = new THREE.SphereGeometry(180, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x8d66d7) },
        bottomColor: { value: new THREE.Color(0xffc27a) }
      },
      vertexShader: `varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition + vec3(0.0, 40.0, 0.0)).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), 1.3), 0.0)), 1.0); }`
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    const roadGeo = new THREE.PlaneGeometry(18, 280);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x3b3945, roughness: 0.92, metalness: 0.03 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -105);
    road.receiveShadow = true;
    world.add(road);

    const shoulderGeo = new THREE.PlaneGeometry(1.1, 280);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xffb049, roughness: 0.88 });
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.rotation.x = -Math.PI / 2;
    leftShoulder.position.set(-9.05, 0.01, -105);
    const rightShoulder = leftShoulder.clone();
    rightShoulder.position.x = 9.05;
    world.add(leftShoulder, rightShoulder);

    const grassGeo = new THREE.PlaneGeometry(60, 300);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2a3146, roughness: 1 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.05, -105);
    world.add(grass);

    for (let i = 0; i < 40; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.23, 0.02, 4.5),
        new THREE.MeshStandardMaterial({ color: 0xf4f4f4, emissive: 0xffffff, emissiveIntensity: 0.08 })
      );
      line.position.set(0, 0.015, -4 - i * 7.2);
      world.add(line);
      roadLines.push(line);
    }

    for (let side of [-1, 1]) {
      for (let i = 0; i < 18; i++) {
        const block = createBuilding(i, side);
        block.position.z = -8 - i * 15;
        block.position.x = side * (12 + Math.random() * 8);
        world.add(block);
        buildings.push(block);

        const lamp = createLamp();
        lamp.position.set(side * 7.9, 0, -6 - i * 15);
        world.add(lamp);
        lamps.push(lamp);
      }
    }

    for (let i = 0; i < 8; i++) {
      const cloud = createCloud();
      cloud.position.set(-18 + Math.random() * 36, 13 + Math.random() * 5, -30 - Math.random() * 120);
      scene.add(cloud);
    }
  }

  function createBuilding(index, side) {
    const group = new THREE.Group();
    const w = 3 + Math.random() * 3;
    const h = 5 + Math.random() * 8;
    const d = 3 + Math.random() * 3;
    const colors = [0x4fb6ff, 0xff6da8, 0xff7f32, 0x29213b, 0xe44d82, 0x4d354f];
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.78, metalness: 0.04 })
    );
    building.position.y = h / 2;
    building.castShadow = true;
    building.receiveShadow = true;
    group.add(building);

    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffd79b, emissive: 0xffa938, emissiveIntensity: 0.65 });
    for (let y = 0; y < Math.floor(h / 1.8); y++) {
      for (let x = 0; x < Math.max(1, Math.floor(w / 1.2)); x++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.06), windowMat);
        win.position.set(-w / 2 + 0.45 + x * 0.95, 1 + y * 1.2, d / 2 + 0.04);
        group.add(win);
      }
    }
    group.userData.recycleZ = -275;
    return group;
  }

  function createLamp() {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 4.2, 10), new THREE.MeshStandardMaterial({ color: 0x18151f, roughness: 0.8 }));
    pole.position.y = 2.1;
    group.add(pole);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffd37f, emissive: 0xffbc49, emissiveIntensity: 1.4 }));
    bulb.position.set(0, 4.45, 0);
    group.add(bulb);

    const light = new THREE.PointLight(0xffba4d, 0.8, 8, 2);
    light.position.copy(bulb.position);
    group.add(light);
    group.userData.recycleZ = -275;
    return group;
  }

  function createCloud() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xf3d2ec, roughness: 1 });
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random() * 1.3, 20, 16), mat);
      puff.position.set((i - count / 2) * 1.2, Math.random() * 0.8, Math.random() - 0.4);
      group.add(puff);
    }
    return group;
  }

  function buildCyclist() {
    cyclistRig = new THREE.Group();
    cyclistRig.position.set(lanePositions[currentLane], 0, 8);
    world.add(cyclistRig);

    const bike = new THREE.Group();
    cyclist = new THREE.Group();

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111216, roughness: 0.72, metalness: 0.25 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xfefefe, roughness: 0.5, metalness: 0.2 });

    bikeFrontWheel = createWheel(wheelMat, rimMat);
    bikeRearWheel = createWheel(wheelMat, rimMat);
    bikeFrontWheel.position.set(0.85, 1.05, -0.1);
    bikeRearWheel.position.set(-0.85, 1.05, -0.1);
    bike.add(bikeFrontWheel, bikeRearWheel);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x252730, metalness: 0.4, roughness: 0.42 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff7a00, metalness: 0.15, roughness: 0.55 });
    const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 12), frameMat);
    bar1.position.set(-0.1, 1.7, -0.1);
    bar1.rotation.z = Math.PI / 2.7;
    const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.55, 12), accentMat);
    bar2.position.set(0.0, 1.45, -0.1);
    bar2.rotation.z = -Math.PI / 2.2;
    const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 10), frameMat);
    seatPost.position.set(-0.25, 2.0, -0.1);
    seatPost.rotation.z = 0.25;
    const handlePost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 10), frameMat);
    handlePost.position.set(0.55, 2.0, -0.1);
    handlePost.rotation.z = -0.18;
    const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 10), frameMat);
    handleBar.position.set(0.75, 2.4, -0.1);
    handleBar.rotation.x = Math.PI / 2;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.25), new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.88 }));
    seat.position.set(-0.35, 2.3, -0.1);
    bike.add(bar1, bar2, seatPost, handlePost, handleBar, seat);

    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b18a, roughness: 0.95 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xff7a00, roughness: 0.84 });
    const shortMat = new THREE.MeshStandardMaterial({ color: 0x16171c, roughness: 0.92 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x241913, roughness: 1 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 1.0, 8, 16), shirt);
    torso.position.set(0, 3.0, -0.1);
    torso.rotation.z = 0.18;
    torso.castShadow = true;
    cyclist.add(torso);

    const chestLogo = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.03), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3e2, emissiveIntensity: 0.1 }));
    chestLogo.position.set(0.22, 3.0, 0.38);
    chestLogo.rotation.z = 0.18;
    cyclist.add(chestLogo);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), skin);
    head.position.set(0.2, 4.0, -0.05);
    head.castShadow = true;
    cyclist.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.39, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
    hair.position.set(0.2, 4.15, -0.05);
    cyclist.add(hair);

    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.9, 8, 12), skin);
    const armR = armL.clone();
    armL.position.set(-0.28, 3.05, 0);
    armR.position.set(0.52, 3.05, 0);
    armL.rotation.z = 1.0;
    armR.rotation.z = 1.1;
    armL.rotation.x = 0.2;
    armR.rotation.x = -0.2;
    cyclist.add(armL, armR);

    const thighMat = shortMat;
    const calfMat = skin;
    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.0, 8, 12), thighMat);
    const legR = legL.clone();
    legL.position.set(-0.18, 1.95, 0.04);
    legR.position.set(0.25, 1.95, 0.04);
    cyclist.add(legL, legR);

    const shinL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.95, 8, 12), calfMat);
    const shinR = shinL.clone();
    shinL.position.set(-0.12, 1.15, 0.12);
    shinR.position.set(0.2, 1.15, 0.12);
    cyclist.add(shinL, shinR);

    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.5), shoeMat);
    const shoeR = shoeL.clone();
    shoeL.position.set(-0.1, 0.63, 0.3);
    shoeR.position.set(0.22, 0.63, 0.3);
    cyclist.add(shoeL, shoeR);

    cyclist.userData.parts = { armL, armR, legL, legR, shinL, shinR, torso, head, shoeL, shoeR };
    cyclistRig.add(bike, cyclist);
  }

  function createWheel(tireMat, rimMat) {
    const group = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.08, 12, 32), tireMat);
    tire.rotation.y = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.02, 8, 24), rimMat);
    rim.rotation.y = Math.PI / 2;
    group.add(tire, rim);
    return group;
  }

  function seedActors() {
    for (let i = 0; i < 16; i++) {
      const type = i % 4 === 0 ? 'coin' : obstacleTypes[i % obstacleTypes.length];
      const actor = makeActor(type);
      resetActor(actor, -25 - i * 14 - Math.random() * 18);
      actors.push(actor);
      world.add(actor.group);
    }
    for (let i = 0; i < 4; i++) {
      const energyActor = makeActor(i % 2 === 0 ? 'energy' : 'turbo');
      resetActor(energyActor, -70 - i * 40);
      actors.push(energyActor);
      world.add(energyActor.group);
    }
  }

  function makeActor(type) {
    const group = new THREE.Group();
    group.userData.type = type;
    group.userData.radius = type === 'coin' ? 0.7 : 1.1;

    let mesh;
    if (type === 'coin') {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 0.12, 30),
        new THREE.MeshStandardMaterial({ color: 0xffca45, emissive: 0xffa500, emissiveIntensity: 0.7, metalness: 0.55, roughness: 0.32 })
      );
      mesh.rotation.z = Math.PI / 2;
      const center = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.13, 20), new THREE.MeshStandardMaterial({ color: 0xff8e1d, emissive: 0xff8e1d, emissiveIntensity: 0.4 }));
      center.rotation.z = Math.PI / 2;
      group.add(mesh, center);
      group.position.y = 1.7;
    } else if (type === 'energy') {
      mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), new THREE.MeshStandardMaterial({ color: 0x44e07c, emissive: 0x2cc167, emissiveIntensity: 0.8, roughness: 0.4 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 12, 24), new THREE.MeshStandardMaterial({ color: 0xb0ffd0, emissive: 0x89ffbb, emissiveIntensity: 0.75 }));
      ring.rotation.x = Math.PI / 2;
      group.add(mesh, ring);
      group.position.y = 1.5;
    } else if (type === 'turbo') {
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), new THREE.MeshStandardMaterial({ color: 0x49bfff, emissive: 0x42d9ff, emissiveIntensity: 0.95, roughness: 0.38 }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 10, 22), new THREE.MeshStandardMaterial({ color: 0x8ce8ff, emissive: 0x42d9ff, emissiveIntensity: 0.8 }));
      group.add(mesh, ring);
      group.position.y = 1.7;
    } else {
      mesh = buildObstacle(type);
      group.add(mesh);
      group.position.y = 0;
    }

    group.add(createShadowBlob());
    return { group, type, active: true, pulse: Math.random() * Math.PI * 2, lane: 1, passed: false };
  }

  function buildObstacle(type) {
    const g = new THREE.Group();
    if (type === 'preguica') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 22, 18), new THREE.MeshStandardMaterial({ color: 0x9a6648, roughness: 1 }));
      body.scale.set(1.15, 0.75, 1.05);
      body.position.y = 0.78;
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.1), new THREE.MeshStandardMaterial({ color: 0x2c2e35, roughness: 1 }));
      pillow.position.y = 0.28;
      const face = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshStandardMaterial({ color: 0xc58a64, roughness: 1 }));
      face.position.set(0, 0.9, 0.65);
      g.add(body, pillow, face);
    } else if (type === 'ansiedade') {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 16), new THREE.MeshStandardMaterial({ color: 0x8c59ff, emissive: 0x5b34c7, emissiveIntensity: 0.6, roughness: 0.76 }));
      core.position.y = 0.9;
      for (let i = 0; i < 7; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x47d7ff, emissive: 0x42d9ff, emissiveIntensity: 0.8 }));
        const a = (i / 7) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 1.05, 1.05, Math.sin(a) * 1.05);
        spike.lookAt(0, 1, 0);
        g.add(spike);
      }
      g.add(core);
    } else if (type === 'cansaco') {
      const battery = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.85), new THREE.MeshStandardMaterial({ color: 0x5c4837, roughness: 0.9 }));
      battery.position.y = 1.0;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.32), new THREE.MeshStandardMaterial({ color: 0x16171b }));
      top.position.set(0, 1.82, 0);
      const low = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.9, 0.2), new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xff7a00, emissiveIntensity: 0.4 }));
      low.position.set(0, 1.0, 0.44);
      g.add(battery, top, low);
    } else if (type === 'barreira') {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.85), new THREE.MeshStandardMaterial({ color: 0xff8e2b, roughness: 0.75 }));
      barrier.position.y = 0.5;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.16, 0.86), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
      stripe.position.y = 0.6;
      g.add(barrier, stripe);
    } else {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16), new THREE.MeshStandardMaterial({ color: 0xff4f4f, emissive: 0xbe1b1b, emissiveIntensity: 0.6, roughness: 0.85 }));
      cloud.scale.set(1.15, 0.78, 1.05);
      cloud.position.y = 0.9;
      for (let i = 0; i < 4; i++) {
        const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.08), new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xff7a00, emissiveIntensity: 0.9 }));
        bolt.position.set(-0.65 + i * 0.42, 0.2, 0.7);
        bolt.rotation.z = 0.45;
        g.add(bolt);
      }
      g.add(cloud);
    }
    return g;
  }

  function createShadowBlob() {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    return shadow;
  }

  function resetActor(actor, z) {
    actor.group.visible = true;
    actor.active = true;
    actor.passed = false;
    actor.lane = Math.floor(Math.random() * 3);
    actor.group.position.x = lanePositions[actor.lane];
    actor.group.position.z = z;
    actor.group.position.y = actor.type === 'coin' ? 1.9 : actor.type === 'turbo' ? 1.8 : actor.type === 'energy' ? 1.65 : 0;
    actor.group.rotation.set(0, Math.random() * Math.PI, 0);
  }

  function bindEvents() {
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKeyDown);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);

    bindPress(leftBtn, moveLeft);
    bindPress(rightBtn, moveRight);
    bindPress(jumpBtn, jump);
    bindPress(turboBtn, activateTurbo);

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  function bindPress(el, fn) {
    el.addEventListener('click', fn);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
  }

  function onTouchStart(e) {
    if (!playing) return;
    const touch = e.changedTouches[0];
    swipeStart = { x: touch.clientX, y: touch.clientY, time: performance.now() };
  }

  function onTouchEnd(e) {
    if (!playing || !swipeStart) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - swipeStart.x;
    const dy = touch.clientY - swipeStart.y;
    const dt = performance.now() - swipeStart.time;
    if (dt < 600) {
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) moveLeft(); else moveRight();
      } else if (dy < -40) {
        jump();
      }
    }
    swipeStart = null;
  }

  function onKeyDown(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveLeft();
    if (e.code === 'ArrowRight' || e.code === 'KeyD') moveRight();
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') jump();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyT') activateTurbo();
    if (!playing && (e.code === 'Enter' || e.code === 'Space')) startGame();
  }

  function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('visible');
    resetGameState();
    playing = true;
    gameEnded = false;
    clock.start();
    showMessage('Bora pedalar!');
  }

  function restartGame() {
    gameOverScreen.classList.add('hidden');
    resetGameState();
    playing = true;
    gameEnded = false;
    showMessage('Nova corrida!');
  }

  function resetGameState() {
    score = 0;
    coins = 0;
    combo = 1;
    maxCombo = 1;
    lives = 3;
    energy = 100;
    turbo = 0;
    speed = baseSpeed;
    turboTimer = 0;
    jumpTimer = 0;
    isJumping = false;
    currentLane = 1;
    targetLane = 1;
    cyclistRig.position.x = lanePositions[1];
    cyclistRig.position.y = 0;
    let z = -28;
    for (const actor of actors) {
      resetActor(actor, z);
      z -= 12 + Math.random() * 15;
    }
    updateHUD();
  }

  function gameOver() {
    if (gameEnded) return;
    playing = false;
    gameEnded = true;
    finalScore.textContent = Math.floor(score);
    finalCoins.textContent = coins;
    finalCombo.textContent = 'x' + maxCombo;
    finalBest.textContent = bestScore;
    resultMessage.textContent = score > bestScore * 0.9 ? 'Mandou bem! Você ficou muito perto do seu melhor desempenho.' : 'Boa corrida! Pegue mais moedas, use o turbo e tente bater seu recorde.';
    gameOverScreen.classList.remove('hidden');
  }

  function moveLeft() {
    if (!playing) return;
    targetLane = Math.max(0, targetLane - 1);
  }

  function moveRight() {
    if (!playing) return;
    targetLane = Math.min(2, targetLane + 1);
  }

  function jump() {
    if (!playing || isJumping) return;
    isJumping = true;
    jumpTimer = 0.001;
  }

  function activateTurbo() {
    if (!playing || turbo < 100 || turboTimer > 0) return;
    turbo = 0;
    turboTimer = 3.2;
    showMessage('Turbo ativado!');
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.035);
    if (playing) update(delta);
    renderer.render(scene, camera);
  }

  function update(delta) {
    if (messageTimer > 0) {
      messageTimer -= delta;
      if (messageTimer <= 0) centerMessage.classList.add('hidden');
    }

    speed = baseSpeed + Math.min(score / 300, 12);
    if (turboTimer > 0) {
      turboTimer -= delta;
      speed += 22;
      if (turboTimer <= 0) showMessage('Turbo esgotado');
    }

    score += delta * speed * combo * 0.7;
    energy = Math.max(0, energy - delta * (turboTimer > 0 ? 2.4 : 0.65));
    if (energy <= 0) {
      takeHit('Ficou sem energia!');
      energy = 35;
    }

    const targetX = lanePositions[targetLane];
    cyclistRig.position.x += (targetX - cyclistRig.position.x) * Math.min(1, delta * 12);
    currentLane = nearestLane(cyclistRig.position.x);

    updateJump(delta);
    updateCyclistAnimation(delta);
    updateRoad(delta);
    updateActors(delta);
    updateCamera(delta);
    updateHUD();

    if (score > bestScore) {
      bestScore = Math.floor(score);
      localStorage.setItem(BEST_KEY, bestScore);
    }

    if (lives <= 0) gameOver();
  }

  function updateJump(delta) {
    if (!isJumping) {
      cyclistRig.position.y += (0 - cyclistRig.position.y) * Math.min(1, delta * 12);
      return;
    }
    jumpTimer += delta * 2.8;
    const phase = Math.sin(Math.min(jumpTimer, Math.PI));
    cyclistRig.position.y = phase * 2.15;
    if (jumpTimer >= Math.PI) {
      isJumping = false;
      jumpTimer = 0;
      cyclistRig.position.y = 0;
    }
  }

  function updateCyclistAnimation(delta) {
    const time = performance.now() * 0.001;
    const parts = cyclist.userData.parts;
    const pedalRate = speed * 0.16;
    const wave = Math.sin(time * pedalRate);
    const wave2 = Math.sin(time * pedalRate + Math.PI);

    bikeFrontWheel.rotation.z += delta * speed * 0.7;
    bikeRearWheel.rotation.z += delta * speed * 0.7;

    parts.legL.rotation.z = wave * 0.8 - 0.1;
    parts.legR.rotation.z = wave2 * 0.8 - 0.1;
    parts.shinL.rotation.z = Math.max(-0.2, -wave * 0.7) + 0.2;
    parts.shinR.rotation.z = Math.max(-0.2, -wave2 * 0.7) + 0.2;
    parts.armL.rotation.z = 1.0 + wave * 0.08;
    parts.armR.rotation.z = 1.05 + wave2 * 0.08;
    parts.torso.rotation.z = 0.18 + Math.sin(time * 4) * 0.02;
    parts.head.rotation.z = Math.sin(time * 2.8) * 0.03;

    cyclistRig.rotation.z = (lanePositions[targetLane] - cyclistRig.position.x) * -0.03;
    cyclistRig.rotation.x = turboTimer > 0 ? -0.04 : 0;
  }

  function updateRoad(delta) {
    const roadSpeed = speed * delta;
    for (const line of roadLines) {
      line.position.z += roadSpeed;
      if (line.position.z > 20) line.position.z = -260;
    }

    for (const block of buildings) {
      block.position.z += roadSpeed * 0.95;
      if (block.position.z > 18) {
        block.position.z = block.userData.recycleZ;
        block.position.x = Math.sign(block.position.x) * (12 + Math.random() * 8);
      }
    }

    for (const lamp of lamps) {
      lamp.position.z += roadSpeed;
      if (lamp.position.z > 18) lamp.position.z = lamp.userData.recycleZ;
    }
  }

  function updateActors(delta) {
    const move = speed * delta;
    for (const actor of actors) {
      actor.group.position.z += move;
      actor.pulse += delta * 2.5;
      const isPickup = ['coin', 'energy', 'turbo'].includes(actor.type);

      if (actor.type === 'coin') actor.group.rotation.y += delta * 6;
      if (actor.type === 'energy' || actor.type === 'turbo') {
        actor.group.rotation.y += delta * 4;
        actor.group.position.y = (actor.type === 'energy' ? 1.65 : 1.85) + Math.sin(actor.pulse) * 0.2;
      }

      if (actor.group.position.z > 20) {
        resetActor(actor, -210 - Math.random() * 80);
        if (!actor.passed && !isPickup) combo = 1;
        continue;
      }

      const sameLane = actor.lane === currentLane;
      if (!sameLane) continue;
      const dz = actor.group.position.z - cyclistRig.position.z;
      const close = Math.abs(dz) < 1.3;
      if (!close || !actor.active) continue;

      if (isPickup) {
        collectPickup(actor);
      } else {
        const canJumpOver = actor.type === 'barreira' && cyclistRig.position.y > 1.15;
        if (canJumpOver) {
          actor.active = false;
          actor.group.visible = false;
          combo = Math.min(combo + 1, 8);
          maxCombo = Math.max(maxCombo, combo);
          score += 60 * combo;
          turbo = Math.min(100, turbo + 12);
          showMessage('Salto perfeito!');
          setTimeout(() => resetActor(actor, -200 - Math.random() * 60), 120);
        } else if (turboTimer > 0) {
          actor.active = false;
          actor.group.visible = false;
          score += 45;
          showMessage('Turbo atravessou obstáculo!');
          setTimeout(() => resetActor(actor, -200 - Math.random() * 60), 120);
        } else if (cyclistRig.position.y < 1.0) {
          actor.active = false;
          actor.group.visible = false;
          takeHit('Você bateu em ' + labelType(actor.type) + '!');
          setTimeout(() => resetActor(actor, -200 - Math.random() * 60), 120);
        }
      }
    }
  }

  function collectPickup(actor) {
    actor.active = false;
    actor.group.visible = false;
    combo = Math.min(combo + (actor.type === 'coin' ? 1 : 0), 8);
    maxCombo = Math.max(maxCombo, combo);

    if (actor.type === 'coin') {
      coins += 1;
      score += 50 * combo;
      turbo = Math.min(100, turbo + 5);
      showMessage('+1 moeda');
    } else if (actor.type === 'energy') {
      energy = Math.min(100, energy + 28);
      score += 30;
      showMessage('Energia recuperada');
    } else if (actor.type === 'turbo') {
      turbo = Math.min(100, turbo + 32);
      score += 35;
      showMessage('Turbo carregado');
    }
    setTimeout(() => resetActor(actor, -210 - Math.random() * 70), 120);
  }

  function takeHit(message) {
    lives -= 1;
    energy = Math.max(18, energy - 24);
    turbo = Math.max(0, turbo - 18);
    combo = 1;
    showMessage(message);
    flashScreen();
  }

  function flashScreen() {
    document.body.animate([
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.45)' },
      { filter: 'brightness(1)' }
    ], { duration: 260, easing: 'ease-out' });
  }

  function updateCamera(delta) {
    const laneX = cyclistRig.position.x;
    const desiredX = laneX * 0.28;
    camera.position.x += (desiredX - camera.position.x) * Math.min(1, delta * 3.5);
    camera.position.y += ((turboTimer > 0 ? 5.2 : 5.7) - camera.position.y) * Math.min(1, delta * 2.5);
    camera.position.z += ((turboTimer > 0 ? 16 : 17.5) - camera.position.z) * Math.min(1, delta * 2.2);
    camera.lookAt(laneX * 0.12, 2.4 + cyclistRig.position.y * 0.24, -22);
  }

  function updateHUD() {
    scoreEl.textContent = Math.floor(score);
    coinsEl.textContent = coins;
    comboEl.textContent = 'x' + combo;
    bestEl.textContent = bestScore;
    energyFill.style.width = `${Math.max(0, Math.min(100, energy))}%`;
    turboFill.style.width = `${Math.max(0, Math.min(100, turbo))}%`;
    livesEl.textContent = '❤ '.repeat(Math.max(0, lives)).trim() || '—';
  }

  function showMessage(text) {
    centerMessage.textContent = text;
    centerMessage.classList.remove('hidden');
    messageTimer = 1.25;
  }

  function labelType(type) {
    const map = {
      preguica: 'Preguiça',
      ansiedade: 'Ansiedade',
      cansaco: 'Cansaço',
      estresse: 'Estresse',
      barreira: 'Barreira'
    };
    return map[type] || type;
  }

  function nearestLane(x) {
    let nearest = 0;
    let min = Infinity;
    lanePositions.forEach((value, index) => {
      const dist = Math.abs(x - value);
      if (dist < min) { min = dist; nearest = index; }
    });
    return nearest;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
})();
