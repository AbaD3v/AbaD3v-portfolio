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

const atmosphereVertexSource = `
  attribute vec2 corner;
  varying vec2 uv;

  void main() {
    uv = corner * 0.5 + 0.5;
    gl_Position = vec4(corner, 0.0, 1.0);
  }
`;

const atmosphereFragmentSource = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  varying vec2 uv;
  uniform float phase;
  uniform float aspect;

  float hash(vec2 p) {
    vec3 h = fract(vec3(p.xyx) * 0.1031);
    h += dot(h, h.yzx + 19.19);
    return fract((h.x + h.y) * h.z);
  }

  float noise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    vec2 blend = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1.0, 0.0)), blend.x),
               mix(hash(cell + vec2(0.0, 1.0)), hash(cell + 1.0), blend.x), blend.y);
  }

  float wisps(vec2 p) {
    mat2 rotate = mat2(0.8, -0.6, 0.6, 0.8);
    return 0.55 * noise(p) + 0.29 * noise(rotate * p * 2.08 + 6.7)
         + 0.16 * noise(p * 4.31 + 12.6);
  }

  void main() {
    vec2 wind = vec2(cos(phase), sin(phase));
    vec2 p = vec2((uv.x - 0.50) * min(aspect, 1.9), uv.y);
    float edge = smoothstep(0.0, 0.11, uv.x) * smoothstep(0.0, 0.10, 1.0 - uv.x);

    // Curl and stretch the noise into long streams that drift around the ring.
    vec2 stream = vec2(p.x * 2.8, (p.y - p.x * 0.24) * 7.5);
    vec2 bend = vec2(noise(stream + wind * 1.28),
                     noise(stream + vec2(4.7, 8.3) - wind.yx));
    float density = wisps(stream + (bend - 0.5) * 2.6 - wind * vec2(1.22, 1.7));
    float arc = 0.30 + 0.17 * sin(p.x * 3.9 + wind.x * 0.62) + 0.05 * wind.y;
    float plume = 1.0 - smoothstep(0.018, 0.24, abs(p.y - arc));
    float upper = 1.0 - smoothstep(0.035, 0.28, abs(p.y - 0.74 - p.x * 0.42 + 0.06 * wind.y));
    float fog = smoothstep(0.31, 0.73, density) * (0.38 * plume + 0.31 * upper);
    fog *= edge * smoothstep(0.14, 0.25, p.y) * smoothstep(0.0, 0.17, 1.0 - p.y);
    vec3 smokeColor = mix(vec3(0.33, 0.065, 0.035), vec3(1.0, 0.39, 0.14), density);

    // Broken ripples spread across the floor and catch the light from the portal.
    float floorY = p.y + 0.013 * sin(p.x * 12.0 + phase);
    float floorMask = smoothstep(0.012, 0.045, p.y) * (1.0 - smoothstep(0.15, 0.25, p.y));
    float spread = mix(1.0, 0.44, smoothstep(0.02, 0.19, p.y));
    float width = (p.x - 0.12 - wind.x * 0.06) / spread;
    float flood = 1.0 - smoothstep(0.03, 0.56, abs(width));
    float breaks = noise(vec2(p.x * 15.0, floorY * 57.0) + wind * 0.7);
    float ripple = sin(floorY * 177.0 + phase * 3.0 + breaks * 2.6);
    float glint = smoothstep(0.55, 0.96, ripple) * smoothstep(0.28, 0.76, breaks);
    float pulse = 0.68 + 0.19 * sin(phase * 2.0 + p.x * 8.0) + 0.11 * wind.y;
    float shine = edge * floorMask * flood * pulse * (0.14 + 0.53 * glint);
    vec3 lightColor = mix(vec3(0.91, 0.19, 0.045), vec3(1.0, 0.67, 0.32), glint);

    vec4 smoke = vec4(smokeColor * fog, fog);
    gl_FragColor = vec4(lightColor * shine, shine) + smoke * (1.0 - shine);
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

function createProgram(gl, vertexCode, fragmentCode) {
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexCode);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentCode);
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

function createAtmosphere(gl) {
  const program = createProgram(gl, atmosphereVertexSource, atmosphereFragmentSource);
  if (!program) return null;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const corner = gl.getAttribLocation(program, 'corner');
  const phase = gl.getUniformLocation(program, 'phase');
  const aspect = gl.getUniformLocation(program, 'aspect');

  return (elapsed, ratio) => {
    gl.disable(gl.BLEND);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(phase, (elapsed % 16) * turn / 16);
    gl.uniform1f(aspect, ratio);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(corner);
  };
}

function createPortal(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!gl) return null;

  const program = createProgram(gl, vertexSource, fragmentSource);
  if (!program) return null;

  const vertices = makePortal();
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const point = gl.getAttribLocation(program, 'point');
  const detail = gl.getAttribLocation(program, 'detail');
  const fit = gl.getUniformLocation(program, 'fit');
  const time = gl.getUniformLocation(program, 'time');
  const drawAtmosphere = createAtmosphere(gl);
  let scale = 1;

  gl.clearColor(0, 0, 0, 0);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  function draw(elapsed) {
    const { width, height } = canvas;
    if (drawAtmosphere) drawAtmosphere(elapsed, width / height);
    else gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(point);
    gl.enableVertexAttribArray(detail);
    gl.vertexAttribPointer(point, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(detail, 3, gl.FLOAT, false, 24, 12);
    gl.uniform2f(fit, scale / width, scale / height);
    gl.uniform1f(time, elapsed);
    gl.drawArrays(gl.LINES, 0, vertices.length / 6);
    gl.disableVertexAttribArray(point);
    gl.disableVertexAttribArray(detail);
  }

  function resize(elapsed) {
    const { width, height } = canvas.getBoundingClientRect();
    const density = Math.min(window.devicePixelRatio || 1, 1.35, 1280 / Math.max(width, 1));
    canvas.width = Math.max(1, Math.round(width * density));
    canvas.height = Math.max(1, Math.round(height * density));
    gl.viewport(0, 0, canvas.width, canvas.height);
    scale = Math.min(canvas.width, canvas.height) * 0.565;
    draw(elapsed);
  }

  return { draw, resize, hasAtmosphere: Boolean(drawAtmosphere) };
}

function mountHero(art) {
  const canvas = art.querySelector('canvas');
  const toggle = art.parentElement.querySelector('.orbital-toggle');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const watchVisibility = 'IntersectionObserver' in window;
  let paused = motion.matches;
  let visible = !watchVisibility;
  let portal = 'ResizeObserver' in window ? createPortal(canvas) : null;
  let frame = 0;
  let lastTime = null;
  let elapsed = 0;

  function animate(now) {
    if (lastTime !== null) elapsed += Math.min(now - lastTime, 50) / 1000;
    lastTime = now;
    portal.draw(elapsed);
    frame = requestAnimationFrame(animate);
  }

  function sync() {
    const moving = !paused && visible && !document.hidden;
    art.classList.toggle('is-moving', moving);
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Запустить анимацию первого экрана' : 'Приостановить анимацию первого экрана');
    toggle.title = toggle.getAttribute('aria-label');
    if (moving && portal) {
      if (!frame) frame = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
    }
  }

  if (portal) {
    const sizeObserver = new ResizeObserver(() => portal?.resize(elapsed));
    sizeObserver.observe(art);
    canvas.addEventListener('webglcontextlost', () => {
      portal = null;
      sizeObserver.disconnect();
      art.classList.remove('is-rendered');
      art.classList.remove('has-atmosphere');
      sync();
    });
    portal.resize(elapsed);
    art.classList.add('is-rendered');
    art.classList.toggle('has-atmosphere', portal.hasAtmosphere);
  }
  if (watchVisibility) {
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    viewObserver.observe(art);
  }
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener?.('change', event => {
    paused = event.matches;
    sync();
  });
  toggle.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  toggle.hidden = false;
  sync();
}

const art = document.querySelector('.hero-art');
if (art) mountHero(art);
