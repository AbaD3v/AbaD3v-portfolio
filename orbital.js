const turn = 2 * Math.PI;

const vertexSource = `
  attribute vec3 point;
  attribute vec3 detail;
  uniform vec2 fit;
  uniform float time;
  varying vec4 light;

  void main() {
    float angle = time * detail.x;
    float c = cos(angle);
    float s = sin(angle);
    vec3 p = point;
    p.xy = mat2(c, s, -s, c) * p.xy;

    // A steady camera tilt keeps the opening and its depth in view.
    p.yz = mat2(0.93, 0.368, -0.368, 0.93) * p.yz;
    p.xz = mat2(0.986, -0.167, 0.167, 0.986) * p.xz;

    float w = 1.0 - 0.18 * p.z;
    gl_Position = vec4(p.xy * fit, 0.0, w);
    float shimmer = 0.8 + 0.2 * sin(time * 1.75 + 8.0 * p.x + 4.0 * p.y);
    float depth = 0.84 + 0.21 * p.z;
    vec3 amber = mix(vec3(1.0, 0.27, 0.042), vec3(1.0, 0.76, 0.43), detail.y);
    vec3 color = mix(amber, vec3(0.26, 0.72, 0.78), max(0.0, -detail.y));
    light = vec4(color, min(1.0, detail.z * shimmer * depth * 1.64));
  }
`;

const fragmentSource = `
  precision mediump float;
  varying vec4 light;

  void main() {
    gl_FragColor = light;
  }
`;

function makePortal() {
  const vertices = [];
  let seed = 2914;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  function vertex(radius, angle, z, style) {
    vertices.push(radius * Math.cos(angle), radius * Math.sin(angle), z, ...style);
  }

  function arc(radius, start, sweep, z, style, ripple = 0) {
    const steps = Math.max(2, Math.ceil(sweep * 36));
    for (let i = 0; i < steps; i++) {
      for (const step of [i, i + 1]) {
        const angle = start + sweep * step / steps;
        vertex(radius + ripple * Math.sin(13 * angle + start), angle,
          z + ripple * Math.cos(9 * angle + start), style);
      }
    }
  }

  // Fine scales and segmented bands around the portal.
  arc(1.42, 0, turn, -0.09, [0, .24, .25]);
  arc(1.31, 0, turn, -0.11, [0, .25, .4]);
  arc(1.35, 0, turn, -0.11, [0, .1, .16]);
  for (let i = 0; i < 144; i++) {
    const angle = turn * i / 144;
    const major = i % 12 === 0;
    const style = [0, major ? .7 : .12, major ? .85 : .29];
    vertex(major ? 1.34 : 1.385, angle, -.08, style);
    vertex(1.42, angle, -.08, style);
  }

  for (let i = 0; i < 11; i++) {
    const angle = turn * i / 11;
    arc(1.26, angle, .27, .04, [-.18, .7, .8]);
    arc(1.22, angle + .035, .22, .04, [-.18, .34, .48]);
    arc(1.49, angle + .08, .12, -.05, [.12, i % 4 === 0 ? -.93 : .31, .53]);
  }

  for (let i = 0; i < 6; i++) {
    const start = turn * i / 6 + .19;
    const style = [.13, i % 3 === 1 ? -.88 : .57, .64];
    arc(1.46, start, .2, -.035, style);
    arc(1.5, start + .024, .151, -.035, style);
    vertex(1.46, start, -.035, style);
    vertex(1.5, start + .024, -.035, style);
    vertex(1.46, start + .2, -.035, style);
    vertex(1.5, start + .175, -.035, style);
  }

  // Threads form the bright inner rim, layered front to back.
  for (let i = 0; i < 192; i++) {
    const start = random() * turn;
    const radius = .99 + random() * .17;
    const speed = .32 + random() * .47;
    arc(radius, start, .16 + random() * 1.35, (random() - .5) * .32,
      [speed, random() ** 1.5, .15 + random() * .42], .008 + random() * .04);
  }

  for (let i = 0; i < 24; i++) {
    const angle = turn * i / 24;
    arc(.91, angle, .14, .1, [-.42, .66, .57]);
    const style = [-.42, .24, .33];
    vertex(.87, angle, .09, style);
    vertex(.91, angle, .1, style);
  }

  // Broken orbits and short particle trails drift around the opening.
  for (let i = 0; i < 108; i++) {
    const start = random() * turn;
    const radius = 1.12 + random() * .51;
    arc(radius, start, .003 + random() * .034, (random() - .5) * .52,
      [i % 4 === 0 ? -.42 : .64, .35 + random() * .65, .15 + random() * .54]);
  }
  for (let i = 0; i < 4; i++) {
    arc(1.52 + i * .052, i * 1.61, .95, (i - 1.5) * .08, [-.085, -.57, .33], .009);
  }

  return new Float32Array(vertices);
}

function createProgram(gl) {
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

function mountOrbit(art) {
  const canvas = art.querySelector('canvas');
  const toggle = art.parentElement.querySelector('.orbital-toggle');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!gl) return;

  const program = createProgram(gl);
  if (!program) return;

  const vertices = makePortal();
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  for (const [name, offset] of [['point', 0], ['detail', 12]]) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset);
  }

  const fit = gl.getUniformLocation(program, 'fit');
  const time = gl.getUniformLocation(program, 'time');
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let visible = false;
  let frame = 0;
  let lastTime = null;
  let elapsed = 0;
  let active = true;

  function draw() {
    if (!active) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(time, elapsed);
    gl.drawArrays(gl.LINES, 0, vertices.length / 6);
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    const density = Math.min(window.devicePixelRatio || 1, 1.6);
    canvas.width = Math.max(1, Math.round(width * density));
    canvas.height = Math.max(1, Math.round(height * density));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width, canvas.height) * 0.565;
    gl.uniform2f(fit, scale / canvas.width, scale / canvas.height);
    draw();
  }

  function animate(now) {
    if (lastTime !== null) elapsed += Math.min(now - lastTime, 50) / 1000;
    lastTime = now;
    draw();
    frame = requestAnimationFrame(animate);
  }

  function sync() {
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Запустить вращение портала' : 'Приостановить вращение портала');
    toggle.title = toggle.getAttribute('aria-label');
    if (!paused && visible && !document.hidden && active) {
      if (!frame) frame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
    }
  }

  const sizeObserver = new ResizeObserver(resize);
  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  sizeObserver.observe(art);
  viewObserver.observe(art);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', event => {
    paused = event.matches;
    sync();
  });
  toggle.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  canvas.addEventListener('webglcontextlost', () => {
    active = false;
    sizeObserver.disconnect();
    viewObserver.disconnect();
    art.classList.remove('is-rendered');
    toggle.hidden = true;
    sync();
  });

  resize();
  art.classList.add('is-rendered');
  toggle.hidden = false;
  sync();
}

const art = document.querySelector('.hero-art');
if (art && 'ResizeObserver' in window && 'IntersectionObserver' in window) mountOrbit(art);
