/* Original low-poly Lady Justice, modelled in code for the Verbatim deck.
   She turns slowly beside the first and last slides. No external 3D asset is used. */
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (_) {
    return; // Without WebGL the slides simply stay centered.
  }
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xffffff, 0);

  const host = document.createElement('div');
  host.className = 'themis';
  host.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  document.body.appendChild(host);
  document.documentElement.classList.add('has-themis');

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(26, 1, 0.1, 80);
  scene.add(new T.HemisphereLight(0xffffff, 0x3c4860, 0.62));
  const key = new T.DirectionalLight(0xffffff, 1.12);
  key.position.set(3.5, 7, 6);
  scene.add(key);
  const fill = new T.DirectionalLight(0xc9d8ee, 0.3);
  fill.position.set(-6, 2, 2);
  scene.add(fill);
  const rim = new T.DirectionalLight(0xffffff, 0.5);
  rim.position.set(1, 4, -7);
  scene.add(rim);

  const standard = (hex, roughness, metalness = 0, extra = {}) => {
    const material = new T.MeshStandardMaterial({ roughness, metalness, flatShading: true, ...extra });
    material.color.setHex(hex).convertSRGBToLinear();
    return material;
  };
  const marble = standard(0x3b4d6e, 0.56, 0.08);
  const drape = standard(0x536992, 0.6, 0.06);
  const hair = standard(0x202e47, 0.66);
  const ink = standard(0x101e36, 0.5, 0.08, { side: T.DoubleSide });
  const marker = standard(0xffe45c, 0.45, 0, { side: T.DoubleSide });
  const gold = standard(0xd9b238, 0.32, 0.62, { side: T.DoubleSide });
  const steel = standard(0xdfe4ec, 0.26, 0.55);

  const figure = new T.Group();
  scene.add(figure);
  const UP = new T.Vector3(0, 1, 0);
  const v = (x, y, z) => new T.Vector3(x, y, z);

  function add(geometry, material, parent = figure, x = 0, y = 0, z = 0) {
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function limb(a, b, radiusA, radiusB, material, parent = figure, sides = 8) {
    const direction = b.clone().sub(a);
    const mesh = add(new T.CylinderGeometry(radiusB, radiusA, direction.length(), sides), material, parent);
    mesh.position.copy(a).addScaledVector(direction, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
    return mesh;
  }

  /* Plinth */
  add(new T.CylinderGeometry(1.36, 1.44, 0.2, 8), ink, figure, 0, 0.1, 0);
  add(new T.CylinderGeometry(1.17, 1.25, 0.22, 8), marble, figure, 0, 0.31, 0);

  /* Robe with sculpted folds */
  const profile = [[1.03, 0.42], [0.97, 0.62], [0.87, 1], [0.77, 1.5], [0.69, 2], [0.6, 2.45], [0.47, 2.85], [0.38, 3.12],
    [0.4, 3.35], [0.5, 3.6], [0.5, 3.78], [0.4, 3.96], [0.2, 4.1], [0.12, 4.16]].map(([r, y]) => new T.Vector2(r, y));
  const robe = new T.LatheGeometry(profile, 64);
  const position = robe.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const radius = Math.hypot(x, z);
    const depth = T.MathUtils.clamp((3.15 - y) / 2.7, 0, 1);
    const folded = radius + depth * (0.075 * Math.sin(angle * 9 + y * 0.7) + 0.03 * Math.sin(angle * 17 - y));
    const flatten = T.MathUtils.lerp(0.94, 0.72, T.MathUtils.clamp((y - 0.5) / 3, 0, 1));
    position.setXYZ(i, Math.cos(angle) * folded, y, Math.sin(angle) * folded * flatten);
  }
  robe.computeVertexNormals();
  add(robe, marble);

  const belt = add(new T.TorusGeometry(0.39, 0.035, 6, 40), gold, figure, 0, 3.13, 0);
  belt.rotation.x = Math.PI / 2;
  belt.scale.y = 0.78;
  const sash = new T.CatmullRomCurve3([v(-0.43, 3.86, 0.2), v(-0.09, 3.42, 0.39), v(0.28, 2.96, 0.37), v(0.57, 2.48, 0.28), v(0.69, 1.86, 0.3)]);
  add(new T.TubeGeometry(sash, 28, 0.075, 6, false), drape);

  /* Head */
  limb(v(0, 4.02, 0), v(0, 4.38, 0.01), 0.14, 0.11, marble);
  const head = add(new T.IcosahedronGeometry(0.31, 2), marble, figure, 0, 4.62, 0.02);
  head.scale.set(0.86, 1.08, 0.96);
  const nose = add(new T.ConeGeometry(0.038, 0.1, 4), marble, figure, 0, 4.58, 0.31);
  nose.rotation.x = -0.25;
  const hairBack = add(new T.SphereGeometry(0.34, 14, 9, Math.PI, Math.PI), hair, figure, 0, 4.67, 0);
  hairBack.scale.set(0.91, 1.06, 1.02);
  const hairTop = add(new T.SphereGeometry(0.34, 14, 5, 0, Math.PI * 2, 0, 1.05), hair, figure, 0, 4.67, 0);
  hairTop.scale.set(0.91, 1.04, 0.98);
  limb(v(0, 4.58, -0.17), v(0, 3.62, -0.3), 0.2, 0.08, hair, figure, 10);
  add(new T.IcosahedronGeometry(0.13, 1), hair, figure, 0, 4.88, -0.27);
  const laurel = add(new T.TorusGeometry(0.272, 0.02, 5, 28), gold, figure, 0, 4.84, -0.01);
  laurel.rotation.x = Math.PI / 2 - 0.1;
  laurel.scale.y = 1.06;

  /* Blindfold, in the deck's highlighter color */
  const blindfold = add(new T.CylinderGeometry(0.287, 0.298, 0.13, 26, 1, true), marker, figure, 0, 4.67, 0.02);
  blindfold.scale.set(0.95, 1, 1.09);
  add(new T.IcosahedronGeometry(0.06, 0), marker, figure, 0, 4.67, -0.33);
  limb(v(0, 4.66, -0.34), v(-0.14, 4.22, -0.44), 0.035, 0.018, marker, figure, 4);
  limb(v(0, 4.66, -0.34), v(0.13, 4.16, -0.42), 0.035, 0.018, marker, figure, 4);

  /* Arm holding the scales */
  const rightShoulder = v(0.47, 3.76, 0);
  const rightElbow = v(1.03, 3.8, 0.1);
  const rightHand = v(1.55, 4.55, 0.16);
  add(new T.IcosahedronGeometry(0.16, 1), drape, figure, rightShoulder.x, rightShoulder.y, rightShoulder.z);
  limb(rightShoulder, rightElbow.clone().lerp(rightShoulder, 0.25), 0.17, 0.13, drape);
  limb(rightShoulder, rightElbow, 0.125, 0.095, marble);
  add(new T.IcosahedronGeometry(0.098, 1), marble, figure, rightElbow.x, rightElbow.y, rightElbow.z);
  limb(rightElbow, rightHand, 0.094, 0.066, marble);
  add(new T.IcosahedronGeometry(0.09, 1), marble, figure, rightHand.x, rightHand.y, rightHand.z);

  /* Arm holding the sword */
  const leftShoulder = v(-0.47, 3.76, 0);
  const leftElbow = v(-0.84, 3.08, 0.1);
  const leftHand = v(-0.99, 2.5, 0.38);
  add(new T.IcosahedronGeometry(0.16, 1), drape, figure, leftShoulder.x, leftShoulder.y, leftShoulder.z);
  limb(leftShoulder, leftElbow.clone().lerp(leftShoulder, 0.25), 0.17, 0.13, drape);
  limb(leftShoulder, leftElbow, 0.125, 0.095, marble);
  add(new T.IcosahedronGeometry(0.098, 1), marble, figure, leftElbow.x, leftElbow.y, leftElbow.z);
  limb(leftElbow, leftHand, 0.094, 0.066, marble);
  add(new T.IcosahedronGeometry(0.09, 1), marble, figure, leftHand.x, leftHand.y, leftHand.z);

  /* Sword */
  const sx = leftHand.x;
  const sz = leftHand.z;
  add(new T.IcosahedronGeometry(0.055, 0), gold, figure, sx, 2.72, sz);
  limb(v(sx, 2.68, sz), v(sx, 2.3, sz), 0.03, 0.03, gold, figure, 6);
  add(new T.BoxGeometry(0.46, 0.055, 0.075), gold, figure, sx, 2.29, sz);
  add(new T.BoxGeometry(0.105, 1.42, 0.026), steel, figure, sx, 1.56, sz);
  const tip = add(new T.ConeGeometry(0.074, 0.19, 4), steel, figure, sx, 0.76, sz);
  tip.rotation.set(Math.PI, Math.PI / 4, 0);
  tip.scale.z = 0.25;

  /* Scales */
  limb(rightHand, v(rightHand.x, 5.3, rightHand.z), 0.024, 0.018, gold, figure, 6);
  add(new T.IcosahedronGeometry(0.052, 1), gold, figure, rightHand.x, 5.35, rightHand.z);
  const beam = new T.Group();
  beam.position.set(rightHand.x, 5.27, rightHand.z);
  figure.add(beam);
  limb(v(-0.74, 0, 0), v(0.74, 0, 0), 0.018, 0.018, gold, beam, 6);
  const pans = [-0.72, 0.72].map((x) => {
    const pan = new T.Group();
    pan.position.x = x;
    beam.add(pan);
    add(new T.IcosahedronGeometry(0.028, 0), gold, pan);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
      limb(v(0, 0, 0), v(Math.cos(angle) * 0.24, -0.7, Math.sin(angle) * 0.24), 0.007, 0.007, gold, pan, 4);
    }
    const dish = add(new T.SphereGeometry(0.28, 18, 5, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), gold, pan, 0, -0.5, 0);
    dish.scale.y = 0.72;
    return pan;
  });

  /* Soft contact shadow */
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const shadowContext = shadowCanvas.getContext('2d');
  const gradient = shadowContext.createRadialGradient(128, 128, 18, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(16,24,40,.28)');
  gradient.addColorStop(0.62, 'rgba(16,24,40,.11)');
  gradient.addColorStop(1, 'rgba(16,24,40,0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 256, 256);
  const shadow = new T.Mesh(new T.PlaneGeometry(4.2, 4.2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.005;
  scene.add(shadow);

  function resize() {
    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const halfHeight = Math.max(3.05, 2.72 / camera.aspect);
    const distance = halfHeight / Math.tan(T.MathUtils.degToRad(camera.fov / 2)) + 1.1;
    camera.position.set(0, 3.25, distance);
    camera.lookAt(0, 2.72, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Automated PDF rendering freezes her facing the viewer.
  const still = navigator.webdriver || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const START_ANGLE = 0;
  const TURN_SECONDS = 18;
  let elapsed = 0;
  let last = performance.now();
  let hiddenSince = 0;

  function draw() {
    figure.rotation.y = START_ANGLE + (still ? 0 : (elapsed / TURN_SECONDS) * Math.PI * 2);
    const tilt = still ? 0.04 : Math.sin(elapsed * 1.05) * 0.07;
    beam.rotation.z = tilt;
    pans.forEach((pan) => { pan.rotation.z = -tilt; });
    renderer.render(scene, camera);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    const visible = !!document.querySelector('.scene.on.sc-cover');
    if (visible && !host.classList.contains('on')) elapsed = 0; // Each slide opens with her facing us.
    host.classList.toggle('on', visible);
    if (visible) {
      hiddenSince = 0;
      elapsed += delta;
    } else {
      hiddenSince = hiddenSince || now;
      if (now - hiddenSince > 800) return;
    }
    draw();
  }
  requestAnimationFrame(tick);
})();
