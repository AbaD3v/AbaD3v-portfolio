import * as THREE from './vendor/three.module.min.js';
import {createInspector} from './model-inspector.js';

function surface(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .47, metalness: .15, ...options });
}

function neon(color) {
  return surface(color, { emissive: color, emissiveIntensity: .4, roughness: .3 });
}

function place(parent, geometry, material, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  parent.add(part);
  return part;
}

function block(parent, width, height, depth, material, x = 0, y = 0, z = 0) {
  return place(parent, new THREE.BoxGeometry(width, height, depth), material, x, y, z);
}

function bevel(parent, width, height, depth, radius, material, x = 0, y = 0, z = 0) {
  const shape = new THREE.Shape();
  const left = -width / 2, right = width / 2;
  const bottom = -height / 2, top = height / 2;
  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  const edge = Math.min(depth * .22, .038);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: edge, bevelThickness: edge, curveSegments: 5,
  });
  geometry.translate(0, 0, -depth / 2);
  return place(parent, geometry, material, x, y, z);
}

function globe(parent, radius, material, x = 0, y = 0, z = 0) {
  return place(parent, new THREE.SphereGeometry(radius, 32, 20), material, x, y, z);
}

function cylinder(parent, radius, height, material, x = 0, y = 0, z = 0) {
  return place(parent, new THREE.CylinderGeometry(radius, radius, height, 36), material, x, y, z);
}

function ring(parent, radius, thickness, material, x = 0, y = 0, z = 0) {
  return place(parent, new THREE.TorusGeometry(radius, thickness, 8, 72), material, x, y, z);
}

function arc(parent, radius, thickness, start, sweep, material) {
  const segment = place(parent, new THREE.TorusGeometry(radius, thickness, 6, 28, sweep), material);
  segment.rotation.z = start;
  return segment;
}

function group(parent, x = 0, y = 0, z = 0) {
  const child = new THREE.Group();
  child.position.set(x, y, z);
  parent.add(child);
  return child;
}

function strut(parent, start, end, radius, material) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const rod = cylinder(parent, radius, direction.length(), material);
  rod.position.copy(a).lerp(b, .5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return rod;
}

function texture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function moon(root, lunarImage) {
  let seed = 32374;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const map = lunarImage?.naturalWidth || lunarImage?.width ? new THREE.Texture(lunarImage) : texture(512, 256, (ctx, width, height) => {
    const base = ctx.createImageData(width, height);
    for (let i = 0; i < base.data.length; i += 4) {
      const x = (i / 4) % width, y = Math.floor(i / (4 * width));
      const haze = Math.sin(x * .031 + Math.sin(y * .057)) * Math.cos(y * .033) * 24;
      const shade = 163 + haze + random() * 47;
      base.data[i] = shade;
      base.data[i + 1] = shade * .94;
      base.data[i + 2] = shade * .98;
      base.data[i + 3] = 255;
    }
    ctx.putImageData(base, 0, 0);
    for (let i = 0; i < 81; i++) {
      const x = random() * width, y = random() * height, radius = 3 + 24 * random() ** 2.3;
      const crater = ctx.createRadialGradient(x - radius * .2, y - radius * .15, 0, x, y, radius);
      crater.addColorStop(0, '#3734409d');
      crater.addColorStop(.55, '#59505b5f');
      crater.addColorStop(.82, '#dfcadc75');
      crater.addColorStop(1, '#b3a0b300');
      ctx.fillStyle = crater;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  if (lunarImage && !lunarImage.complete && !lunarImage.width) {
    lunarImage.addEventListener('load', () => {
      map.image = lunarImage;
      map.needsUpdate = true;
    }, {once: true});
  }
  const planet = place(root, new THREE.SphereGeometry(.89, 80, 52),
    surface(0xf9e8e0, {map, bumpMap: map, bumpScale: .08, roughness: .85, metalness: .025}));
  const orbits = group(root);
  const gold = neon(0xffbd94), violet = neon(0xa6a6ff);
  const alloy = surface(0xbd9576, {metalness: .72, roughness: .28});
  const solar = surface(0x495fb6, {metalness: .35, roughness: .25});
  const path = ring(orbits, 1.36, .009, gold);
  path.rotation.x = 1.17;
  const outer = group(orbits);
  outer.rotation.set(1.39, .17, .26);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    arc(outer, 1.56, .010, angle + .09, .53, i % 3 === 0 ? gold : violet);
    arc(outer, 1.48, .006, angle + .62, .116, violet);
  }
  const satellite = group(path);
  bevel(satellite, .19, .147, .15, .025, alloy);
  block(satellite, .51, .03, .022, alloy);
  for (const side of [-1, 1]) {
    bevel(satellite, .19, .115, .028, .012, solar, side * .202);
    for (const seam of [.167, .225]) block(satellite, .005, .106, .008, gold, side * seam, 0, .025);
    block(satellite, .186, .004, .008, gold, side * .202, 0, .025);
  }
  strut(satellite, [0, .054, .043], [.033, .136, .098], .009, alloy);
  globe(satellite, .02, violet, .033, .136, .098);
  const antenna = ring(satellite, .07, .012, alloy, 0, 0, .085);
  antenna.rotation.y = .34;
  globe(satellite, .021, gold, 0, 0, .11);
  const far = place(outer, new THREE.OctahedronGeometry(.061), violet);
  return t => {
    planet.rotation.y = 1.28 + t * .14;
    orbits.rotation.y = t * .11;
    const angle = t * .77 + .25;
    satellite.position.set(Math.cos(angle) * 1.36, Math.sin(angle) * 1.36, 0);
    satellite.rotation.set(-.28, .22 + t * .24, angle + Math.PI / 2);
    far.position.set(Math.cos(-t * .57 + 2) * 1.56, Math.sin(-t * .57 + 2) * 1.56, 0);
    far.rotation.z = t * 1.12;
  };
}

function house(parent, x, y, z, wallColor, roofColor, size = 1) {
  const home = group(parent, x, y, z);
  const wall = surface(wallColor), roof = surface(roofColor);
  const glass = neon(0xffdcac), door = surface(0x353846), stone = surface(0xc3b5a4);
  block(home, .82, .64, .72, wall, 0, .32);
  block(home, .86, .09, .76, stone, 0, .045);
  const gable = new THREE.Shape();
  gable.moveTo(-.5, 0);
  gable.lineTo(.5, 0);
  gable.lineTo(0, .39);
  gable.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(gable, {depth: .84, bevelEnabled: false});
  roofGeo.translate(0, 0, -.42);
  place(home, roofGeo, roof, 0, .64);
  for (const seam of [-.31, -.12, .08, .28]) {
    strut(home, [-.484,.663,seam], [0,1.04,seam], .011, roof);
    strut(home, [0,1.04,seam], [.484,.663,seam], .011, roof);
  }
  block(home, .13, .27, .13, wall, .239, .855, -.18);
  block(home, .16, .045, .16, stone, .239, 1.004, -.18);
  bevel(home, .20, .33, .038, .018, door, 0, .19, .381);
  block(home, .26, .07, .15, stone, 0, .039, .442);
  globe(home, .018, glass, .055, .185, .413);
  for (const u of [-.25, .25]) {
    block(home, .177, .177, .028, door, u, .435, .373);
    block(home, .14, .14, .022, glass, u, .435, .389);
    block(home, .014, .14, .015, door, u, .435, .405);
    block(home, .14, .011, .015, door, u, .435, .406);
    block(home, .20, .022, .06, stone, u, .343, .398);
  }
  block(home, .03, .18, .26, glass, .421, .4, .02);
  home.scale.setScalar(size);
  return home;
}

function neighbors(root) {
  const platform = cylinder(root, 1.46, .12, surface(0x204339), 0, -.57);
  platform.scale.z = .75;
  const trim = ring(root, 1.37, .017, surface(0x76ad98, {metalness: .37}), 0, -.593);
  trim.rotation.x = Math.PI / 2;
  trim.scale.y = .78;
  const homes = [
    house(root, -.66, -.51, .14, 0x87c5a9, 0x276e5c),
    house(root, .65, -.51, -.12, 0xe3a980, 0xb06051),
  ];
  homes[0].rotation.y = -.22;
  homes[1].rotation.y = .27;
  const routePoints = [new THREE.Vector3(-.66, -.48, .55), new THREE.Vector3(-.23, -.45, .81),
    new THREE.Vector3(.32, -.45, .71), new THREE.Vector3(.65, -.48, .32)];
  const route = new THREE.CatmullRomCurve3(routePoints);
  place(root, new THREE.TubeGeometry(route, 24, .027, 8), neon(0x98f2c6));
  const indicator = group(root);
  const light = neon(0xffcb9a);
  const halo = ring(indicator, .085, .012, light, 0, .018);
  halo.rotation.x = Math.PI / 2;
  place(indicator, new THREE.OctahedronGeometry(.053), light, 0, .125);
  return t => indicator.position.copy(route.getPointAt((Math.sin(t * .9) + 1) / 2));
}

function keyboard(root) {
  const body = group(root, 0, -.2);
  body.rotation.x = -Math.PI / 2;
  bevel(body, 2.28, 1.5, .20, .15, surface(0x3a2d46, {metalness: .55, roughness: .30}));
  bevel(body, 2.15, 1.35, .030, .105, surface(0x1d1928), 0, 0, .116);
  const ink = surface(0x3a263e), silver = surface(0xbdb7cd, {metalness: .67});
  const led = neon(0xf6a678);
  const colors = [surface(0xdecbe3), surface(0xffbd84), surface(0x977eb6)];
  const letters = ['Q','W','E','R','A','S','D','F','Z','X','C','V'];
  const keys = letters.map((letter, i) => {
    const key = group(body, (i % 4 - 1.5) * .49, (1 - Math.floor(i / 4)) * .4, .24);
    const material = colors[i === 5 ? 1 : i < 8 ? 0 : 2];
    block(body, .13, .13, .12, i === 5 ? led : silver, key.position.x, key.position.y, .17);
    bevel(key, .40, .325, .11, .045, material);
    bevel(key, .33, .264, .044, .035, material, 0, 0, .062);
    const map = texture(64, 64, (ctx, w, h) => {
      ctx.fillStyle = '#342238';
      ctx.font = '700 42px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, w / 2, h / 2 + 2);
    });
    place(key, new THREE.PlaneGeometry(.21, .21), new THREE.MeshBasicMaterial({
      map, transparent: true, depthWrite: false,
    }), 0, 0, .094);
    return key;
  });
  const meters = Array.from({length: 5}, (_, i) => block(body, .09, .015, .017, led, (i - 2) * .16, -.631, .14));
  block(body, .31, .02, .012, ink, .76, -.631, .132);
  const underglow = surface(0x57395b, {emissive: 0xb286e8, emissiveIntensity: .37});
  bevel(body, 1.81, .027, .022, .008, underglow, -.04, -.745, -.046);
  for (const side of [-1, 1]) block(body, .039, .63, .025, underglow, side * 1.143, .02, -.047);
  return t => {
    keys.forEach((key, i) => { key.position.z = .226 + Math.max(0, Math.sin(t * 3.3 - i * .68)) ** 7 * .31; });
    meters.forEach((meter, i) => { meter.scale.x = .45 + .55 * (1 + Math.sin(t * 2.4 - i * .64)) / 2; });
    underglow.emissiveIntensity = .28 + .24 * (1 + Math.sin(t * 2)) / 2;
  };
}

function drone(root) {
  const chassis = group(root, 0, .18);
  const aluminum = surface(0xb9d5e6, {metalness: .52, roughness: .32});
  const dark = surface(0x202d40, {metalness: .38, roughness: .43});
  const blue = neon(0x5ecbff), orange = neon(0xff925b);
  const top = group(chassis);
  top.rotation.x = -Math.PI / 2;
  bevel(top, .78, 1.01, .18, .22, dark);
  bevel(top, .72, .88, .086, .188, aluminum, 0, -.035, .115);
  bevel(top, .30, .41, .012, .055, dark, 0, .015, .172);
  for (const x of [-.23, .23]) {
    for (let i = 0; i < 3; i++) block(top, .10, .015, .008, dark, x, .125 - i * .065, .167);
    block(top, .038, .15, .011, orange, x, -.29, .172);
  }
  const cameraHead = group(chassis, 0, -.12, .51);
  bevel(cameraHead, .35, .27, .19, .055, dark);
  const lens = cylinder(cameraHead, .102, .095, aluminum, 0, -.015, .112);
  lens.rotation.x = Math.PI / 2;
  const iris = globe(cameraHead, .075, surface(0x354fb2, {metalness:.45, roughness:.13}), 0, -.015, .165);
  iris.scale.z = .36;
  ring(cameraHead, .075, .010, blue, 0, -.015, .165);
  for (const side of [-1, 1]) {
    const x = side * .295;
    strut(chassis, [x, -.08, -.35], [x, -.245, -.28], .029, dark);
    strut(chassis, [x, -.08, .23], [x, -.245, .30], .029, dark);
    strut(chassis, [x, -.245, -.35], [x, -.245, .375], .029, aluminum);
    block(chassis, .088, .035, .14, dark, x, -.25, -.27);
    block(chassis, .088, .035, .14, dark, x, -.25, .30);
  }
  const rotors = [];
  for (const x of [-.9, .9]) {
    for (const z of [-.65, .65]) {
      strut(chassis, [x * .30, -.025, z * .44], [x, .017, z], .061, dark);
      strut(chassis, [x * .42, .041, z * .56], [x * .87, .058, z * .91], .023, aluminum);
      cylinder(chassis, .132, .17, aluminum, x, .02, z);
      const guard = ring(chassis, .274, .023, dark, x, .145, z);
      guard.rotation.x = Math.PI / 2;
      strut(chassis, [x, .018, z], [x * 1.28, .145, z], .024, dark);
      globe(chassis, .037, z > 0 ? blue : orange, x * 1.28, .148, z);
      const rotor = group(chassis, x, .149, z);
      for (let n = 0; n < 3; n++) {
        const rootBlade = group(rotor);
        rootBlade.rotation.y = n * Math.PI * 2 / 3;
        const blade = bevel(rootBlade, .191, .07, .019, .026, n === 0 ? blue : aluminum, .145, 0);
        blade.rotation.set(-Math.PI / 2 - .22, -.1, 0);
      }
      cylinder(rotor, .063, .073, dark, 0, .027);
      cylinder(rotor, .039, .013, aluminum, 0, .068);
      rotors.push(rotor);
    }
  }
  const landing = group(root, 0, -.62);
  landing.rotation.x = Math.PI / 2;
  ring(landing, 1.04, .008, blue);
  for (let i = 0; i < 4; i++) arc(landing, 1.15, .019, i * Math.PI / 2 + .22, .48, i === 1 ? orange : blue);
  return t => {
    chassis.position.y = .17 + Math.sin(t * 1.7) * .13;
    chassis.rotation.z = Math.sin(t * 1.26) * .08;
    cameraHead.rotation.y = Math.sin(t * .96) * .23;
    landing.rotation.z = t * .18;
    rotors.forEach((rotor, i) => { rotor.rotation.y = t * (i % 2 ? 15 : -15) + i * .72; });
  };
}

function phone(parent, x, y, z, color, screenColor) {
  const device = group(parent, x, y, z);
  const caseMaterial = surface(color, {metalness: .65, roughness: .28});
  const card = surface(0x34354b), peach = neon(0xffa676), glass = surface(0xeee3e4);
  const screen = surface(screenColor, {roughness: .19, metalness: .28});
  bevel(device, .82, 1.5, .13, .13, caseMaterial);
  bevel(device, .751, 1.417, .035, .098, card, 0, 0, .082);
  bevel(device, .698, 1.36, .016, .086, screen, 0, 0, .111);
  bevel(device, .48, .43, .012, .058, peach, 0, .237, .125);
  const thumbnail = bevel(device, .148, .234, .020, .029, card, .07, .238, .141);
  thumbnail.rotation.z = -.25;
  block(device, .12, .017, .009, glass, -.124, .273, .143);
  block(device, .108, .013, .009, glass, -.133, .234, .143);
  for (const u of [-.14, .14]) {
    bevel(device, .235, .212, .014, .033, card, u, -.16, .126);
    bevel(device, .139, .073, .009, .015, glass, u, -.126, .140);
    block(device, .075, .014, .01, peach, u - .028, -.21, .141);
  }
  bevel(device, .38, .073, .013, .03, peach, 0, -.42, .126);
  block(device, .29, .011, .008, glass, 0, -.587, .128);
  bevel(device, .158, .041, .012, .016, card, 0, .583, .129);
  for (const y of [.31,.16]) block(device, .025, .11, .029, caseMaterial, -.419, y, -.019);
  bevel(device, .26, .26, .038, .045, caseMaterial, -.208, .478, -.079);
  for (const [u, v] of [[-.265,.527],[-.155,.455]]) {
    ring(device, .041, .01, caseMaterial, u, v, -.117);
    globe(device, .032, screen, u, v, -.121);
  }
  return device;
}

function shop(root) {
  const front = phone(root, -.51, -.04, .23, 0xf1a16e, 0x3b2636);
  const back = phone(root, .51, .13, -.28, 0x9db9cb, 0x202c43);
  front.rotation.z = .18;
  back.rotation.z = -.22;
  back.rotation.y = 2.68;
  return t => {
    front.position.y = -.04 + Math.sin(t * 1.06) * .12;
    back.position.y = .13 + Math.sin(t * 1.06 + 1.8) * .12;
    front.rotation.y = -.10 + Math.sin(t * .72) * .29;
    back.rotation.y = 2.68 - Math.sin(t * .72) * .22;
  };
}

function nodeCore(root) {
  const shell = group(root);
  const aqua = neon(0x71eddb), violet = neon(0xb2a0ff);
  const metal = surface(0x506286, {metalness: .67, roughness: .34});
  const core = place(shell, new THREE.IcosahedronGeometry(.43), surface(0x407287, {
    metalness: .56, roughness: .22, flatShading: true, emissive: 0x174d6a, emissiveIntensity: .51,
  }));
  const cage = place(shell, new THREE.IcosahedronGeometry(.56), new THREE.MeshBasicMaterial({
    color: 0xaadcf7, wireframe: true, transparent: true, opacity: .62,
  }));
  const rails = [];
  for (let i = 0; i < 3; i++) {
    const radius = .94 + i * .185;
    const path = group(shell);
    path.rotation.set(.38 + i * .62, .21 + i * .47, i * .8);
    ring(path, radius, .010, metal);
    const light = i === 1 ? violet : aqua;
    for (const angle of [.16, 2.26, 4.36]) arc(path, radius, .021, angle, .65, light);
    const packet = bevel(path, .16, .12, .087, .021, light);
    rails.push({packet,radius});
  }
  return t => {
    shell.rotation.x = t * .15;
    shell.rotation.y = t * .13;
    core.rotation.set(t * -.21, t * .23, 0);
    cage.rotation.y = t * .28;
    rails.forEach(({packet, radius}, i) => {
      const angle = t * (i + 1) * (i === 1 ? -.32 : .38) + i * 1.45;
      packet.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      packet.rotation.z = angle + Math.PI / 2;
    });
  };
}

function kindergarten(root) {
  const mint = surface(0x65a980), red = surface(0xe28471), yellow = surface(0xf4bc6b);
  const stone = surface(0xc9af88), steel = surface(0x486b7d,{metalness:.4});
  const garden = cylinder(root, 1.42, .12, mint, 0, -.56);
  garden.scale.z = .78;
  const facade = house(root, .32, -.5, -.30, 0xf2c794, 0xbe685c, 1.08);
  facade.scale.x *= 1.17;
  house(root, -.52, -.5, -.44, 0xe8b2a0, 0x7c9eaa, .61);
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(.34,-.494,.18),new THREE.Vector3(.38,-.493,.51),new THREE.Vector3(.63,-.494,.77)]);
  place(root, new THREE.TubeGeometry(path, 20, .068, 8), stone);
  for (const [x,z] of [[-.93,.4],[.92,.39],[1.015,-.24]]) {
    cylinder(root, .036, .30, red, x, -.36, z);
    place(root, new THREE.IcosahedronGeometry(.17, 1), mint, x, -.165, z);
    globe(root, .078, yellow, x + .05, -.115, z + .10);
  }
  const play = group(root, -.46, -.49, .54);
  for (const x of [-.24,.24]) {
    strut(play,[x,0,.17],[x,.44,0],.03,red);
    strut(play,[x,0,-.17],[x,.44,0],.03,red);
  }
  strut(play,[-.27,.44,0],[.27,.44,0],.027,steel);
  const swing = group(play,0,.44,0);
  for (const x of [-.098,.098]) strut(swing,[x,0,0],[x,-.30,0],.009,steel);
  block(swing,.235,.031,.103,yellow,0,-.31);
  return t => { swing.rotation.x = Math.sin(t * 1.75) * .52; };
}

function chat(root) {
  const pane = surface(0x413362, {metalness:.48, roughness:.29});
  const reply = surface(0x715789, {metalness:.27, roughness:.32});
  const light = neon(0xc1a9ff), pink = neon(0xffa0c7);
  const front = group(root, -.38, .34, .23);
  const back = group(root, .46, -.28, -.17);
  bevel(front, 1.55, .66, .17, .15, pane);
  bevel(back, 1.28, .51, .15, .12, reply);
  bevel(front, 1.34, .46, .015, .127, surface(0x292440,{roughness:.28}), 0, 0, .116);
  bevel(back, 1.10, .35, .016, .103, surface(0x4a385e), 0, 0, .104);
  const tip = block(front, .20, .20, .13, pane, -.45, -.28, 0);
  tip.rotation.z = Math.PI / 4;
  const replyTip = block(back, .16, .16, .12, reply, .45, -.24, 0);
  replyTip.rotation.z = Math.PI / 4;
  const dots = [-.13, .055, .24].map(x => globe(front, .060, light, x, -.006, .145));
  const avatar = ring(front, .113, .012, pink, -.43, 0, .145);
  place(front, new THREE.OctahedronGeometry(.065), light, -.43, 0, .148);
  for (let i = 0; i < 2; i++) bevel(back, .76 - i * .21, .028, .01, .009, i ? pink : light, -.04 - i * .105, .052 - i * .101, .129);
  const pulse = place(root, new THREE.OctahedronGeometry(.094), pink, .89, .51, -.18);
  return t => {
    front.position.y = .34 + Math.sin(t * 1.1) * .11;
    back.position.y = -.28 + Math.sin(t * 1.1 + 1.4) * .11;
    front.rotation.y = Math.sin(t * .67) * .12;
    avatar.rotation.y = t * 1.24;
    pulse.rotation.set(t * .87, t * .76, 0);
    pulse.position.y = .51 + Math.sin(t * 1.55) * .14;
    dots.forEach((dot, i) => dot.scale.setScalar(.7 + .46 * (1 + Math.sin(t * 4 - i * 1.1)) / 2));
  };
}

function sql(root) {
  const turquoise = neon(0x68ecbf), dark = surface(0x233b38), lid = surface(0x88b9aa,{metalness: .67,roughness:.29});
  const disks = [];
  for (let i = 0; i < 3; i++) {
    const layer = group(root, -.72, -.48 + i * .31, .21);
    cylinder(layer, .46, .22, dark);
    cylinder(layer, .46, .045, lid, 0, .10);
    const band = ring(layer, .457, .015, turquoise, 0, -.063);
    band.rotation.x = Math.PI / 2;
    for (const x of [-.15,0,.15]) {
      const z = Math.sqrt(.454 ** 2 - x ** 2);
      block(layer, .049, .025, .013, lid, x, .027, z);
    }
    disks.push(layer);
  }
  const panel = group(root, .57, .22, -.21);
  panel.rotation.y = -.08;
  bevel(panel, 1.40, .96, .14, .081, lid);
  bevel(panel, 1.32, .887, .027, .063, dark, 0, 0, .083);
  const code = texture(480, 300, (ctx, width, height) => {
    ctx.fillStyle = '#112925';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#214039';
    ctx.fillRect(0, 0, width, 47);
    [38,62,86].forEach(x => {
      ctx.beginPath();
      ctx.arc(x, 24, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#56b29a';
      ctx.fill();
    });
    ctx.font = '700 34px monospace';
    const rows = [['SELECT', ' name'], ['FROM', ' products'], ['ORDER BY', ' price;']];
    rows.forEach(([keyword, value], i) => {
      const y = 104 + i * 59;
      ctx.fillStyle = '#72f0bb';
      ctx.fillText(keyword, 23, y);
      ctx.fillStyle = '#f6d2a4';
      ctx.fillText(value, 23 + ctx.measureText(keyword).width, y);
    });
  });
  place(panel,new THREE.PlaneGeometry(1.197,.748),new THREE.MeshBasicMaterial({map:code}),0,0,.106);
  const cursor = block(panel,.038,.013,.012,turquoise,-.51,-.296,.114);
  return t => {
    disks.forEach((disk, i) => { disk.position.y = -.48 + i * .31 + Math.sin(t * 1.5 - i * .8) * .07; });
    cursor.scale.x = .6 + .4 * Math.cos(t * 3.7) ** 2;
    panel.rotation.y = -.08 + Math.sin(t * .82) * .14;
  };
}

function voice(root) {
  const gold = neon(0xffa976), cream = neon(0xffd4a0);
  const gunmetal = surface(0x3e2e32,{metalness:.52,roughness:.34});
  const copper = surface(0xb97857,{metalness:.72,roughness:.26});
  const pedestal = bevel(root, 2.56, .69, .10, .14, gunmetal, 0, -.55, -.12);
  pedestal.rotation.x = -Math.PI / 2;
  const stand = group(root, -.35, -.51, .16);
  cylinder(stand,.273,.066,copper,0,.039);
  cylinder(stand,.076,.26,gunmetal,0,.177);
  const mic = group(stand,0,.69,0);
  place(mic,new THREE.CapsuleGeometry(.208,.52,8,24),copper);
  place(mic,new THREE.CapsuleGeometry(.17,.45,8,24),gunmetal,0,0,.045);
  for (let i = -4; i <= 4; i++) {
    const band = ring(mic,.205,.009,copper,0,i*.063,.018);
    band.rotation.x = Math.PI/2;
    band.scale.x = .88;
  }
  for (const x of [-.105, -.052, .052, .105]) {
    strut(mic, [x, -.23, .178], [x, .23, .178], .007, copper);
  }
  for (const x of [-.259,.259]) {
    strut(stand,[x,.26,0],[x,.71,0],.028,copper);
    globe(stand,.052,cream,x,.719,0);
    strut(stand,[0,.245,0],[x,.26,0],.027,copper);
  }
  block(mic,.042,.105,.018,gold,0,-.264,.192);
  const bars = [];
  for (let i = 0; i < 9; i++) {
    const x = -.92 + i * .24;
    const height = .14 + Math.cos((i - 4) * .31) ** 2 * (.54 + Math.cos(i * 2.3) * .15);
    const capsule = place(root, new THREE.CapsuleGeometry(.041,height,5,12),i % 3 === 0 ? cream : gold,x,.04,-.43);
    bars.push({capsule, height});
  }
  return t => {
    mic.rotation.x = -.12 + Math.sin(t * 1.25) * .13;
    bars.forEach(({capsule,height},i) => {
      capsule.scale.y = .49 + (1 + Math.sin(t * 4.5 - i * .85)) * .31;
      capsule.position.y = -.41 + height * capsule.scale.y * .53;
    });
  };
}

function fields(root) {
  const earth = surface(0x59412e), edge = surface(0x866746, {metalness: .31, roughness: .38});
  const path = surface(0xb08d5b), light = neon(0x7ef1c8);
  const platform = group(root, 0, -.42);
  platform.rotation.x = -Math.PI / 2;
  bevel(platform, 2.44, 1.74, .13, .12, edge);
  bevel(platform, 2.35, 1.66, .073, .12, earth, 0, 0, .083);
  block(platform, 2.24, .085, .032, path, 0, 0, .125);
  block(platform, .084, 1.54, .032, path, 0, 0, .125);

  const crops = [0x3f734e, 0xa58748, 0x6da158, 0x988651];
  for (let plot = 0; plot < crops.length; plot++) {
    const x = plot % 2 ? .57 : -.57;
    const y = plot < 2 ? .39 : -.39;
    const crop = surface(crops[plot]);
    bevel(platform, 1.02, .637, .04, .068, crop, x, y, .137);
    for (let row = 0; row < 7; row++) {
      const ridge = block(platform, .049, .553, .044, crop, x + (row - 3) * .137, y, .169);
      ridge.rotation.z = plot % 2 ? .10 : -.10;
    }
  }
  const scanner = group(root, 0, 0, 0);
  const glass = new THREE.MeshBasicMaterial({
    color: 0x88efc1, transparent: true, opacity: .20, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = place(scanner, new THREE.PlaneGeometry(1.41, .57), glass, 0, -.003);
  beam.rotation.y = Math.PI / 2;
  strut(scanner, [0, .283, -.705], [0, .283, .705], .014, light);
  strut(scanner, [0, -.278, -.705], [0, -.278, .705], .011, light);
  for (const side of [-1, 1]) {
    strut(scanner, [0, -.278, side * .705], [0, .283, side * .705], .013, light);
    place(scanner, new THREE.OctahedronGeometry(.063), light, 0, .283, side * .705);
  }
  const sensors = [
    globe(platform, .053, light, -1.09, -.737, .166),
    globe(platform, .053, light, 1.09, .737, .166),
  ];
  return t => {
    scanner.position.x = Math.sin(t * .97) * 1.01;
    glass.opacity = .17 + .07 * Math.sin(t * 3.6) ** 2;
    sensors.forEach((sensor, i) => { sensor.scale.setScalar(.75 + .30 * Math.cos(t * 3 + i) ** 2); });
  };
}

function paperTexture(accent, illustration) {
  return texture(300, 355, (ctx, width, height) => {
    ctx.fillStyle = '#f5e7cc';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#b29a77';
    for (let i = 0; i < 9; i++) ctx.fillRect(27, 83 + i * 24, 235 - (i % 3 === 1 ? 54 : 0), 4);
    ctx.fillStyle = accent;
    ctx.fillRect(27, 36, 137, 10);
    if (illustration) {
      ctx.fillStyle = '#e7d6b9';
      ctx.fillRect(30, 92, 239, 119);
      ctx.fillStyle = accent;
      ctx.fillRect(60, 122, 28, 62);
      ctx.fillRect(110, 142, 28, 42);
      ctx.fillRect(159, 107, 28, 77);
      ctx.fillRect(210, 128, 28, 56);
    }
  });
}

function page(parent, side, level, material) {
  const geometry = new THREE.PlaneGeometry(.92, 1.25, 22, 6);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const u = vertices.getX(i) / .92 + .5;
    const z = vertices.getY(i);
    const x = side * u * .92;
    const y = level + Math.sin(Math.PI * u) * .111 - u * .033;
    vertices.setXYZ(i, x, y, side * z);
  }
  geometry.computeVertexNormals();
  return place(parent, geometry, material);
}

function book(root) {
  const plum = surface(0x5c396c, {metalness: .36, roughness: .36});
  const cream = surface(0xdcc7a1, {side: THREE.DoubleSide, roughness: .81});
  const spine = surface(0x926f80);
  const ribbon = neon(0xd391ff);
  const bind = cylinder(root, .107, 1.43, plum, 0, -.268);
  bind.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const cover = bevel(root, .985, 1.389, .068, .067, plum, side * .49, -.305);
    cover.rotation.x = -Math.PI / 2;
    cover.rotation.z = side * .023;
    block(root, .917, .057, 1.237, spine, side * .461, -.248);
    for (let i = 0; i < 4; i++) page(root, side, -.226 + i * .029, cream);
    const map = paperTexture(side > 0 ? '#835e93' : '#7a526e', side < 0);
    page(root, side, -.13, surface(0xfff1d9, {map, side: THREE.DoubleSide, roughness: .9}));
  }
  const turningSheet = page(root, 1, -.13, surface(0xffedce, {
    map: paperTexture('#946c9e', false), side: THREE.DoubleSide, roughness: .87,
  }));
  const bookmark = bevel(root, .084, .31, .014, .019, ribbon, -.029, -.11, .648);
  bookmark.rotation.x = -.9;
  const note = group(root, -.66, .411, -.15);
  bevel(note, .48, .35, .039, .06, surface(0xb987ca, {metalness: .33, roughness: .4}));
  for (let i = 0; i < 3; i++) {
    block(note, .265 - .047 * (i % 2), .012, .010, cream, -.014 - .02 * (i % 2), .075 - i * .067, .027);
  }
  return t => {
    turningSheet.rotation.z = .11 + .86 * (.5 + .5 * Math.sin(t * 1.37)) ** 1.7;
    note.position.y = .411 + Math.sin(t * 1.42 + .38) * .084;
    note.rotation.set(-.12 + Math.sin(t * .77) * .12, .17, -.29);
    bookmark.rotation.x = -.88 + Math.sin(t * 1.52) * .10;
  };
}

function carSection(parent, width, profile, material) {
  const outline = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: width, bevelEnabled: true, bevelSegments: 2, bevelSize: .025, bevelThickness: .022, steps: 1,
  });
  geometry.translate(0, 0, -width / 2);
  geometry.rotateY(-Math.PI / 2);
  return place(parent, geometry, material);
}

function driftCar(root) {
  const street = surface(0x282b39), paint = surface(0xc4bfbc), tire = surface(0x23222b);
  const body = surface(0xe16a36, {metalness: .57, roughness: .24});
  const steel = surface(0xb8bfd7, {metalness: .72, roughness: .26});
  const window = surface(0x314d76, {metalness: .42, roughness: .19});
  const ice = neon(0xafedff), red = neon(0xff7364);

  const road = bevel(root, 1.84, 2.55, .12, .14, street, 0, -.607);
  road.rotation.x = -Math.PI / 2;
  for (let i = -2; i <= 2; i++) block(root, .031, .013, .19, paint, -.67, -.537, i * .43);

  const car = group(root, .06, 0, 0);
  carSection(car, .91, [[-1.04,-.32],[1.01,-.32],[1.075,-.23],[.985,-.055],[-.945,-.023],[-1.075,-.14]], body);
  carSection(car, .727, [[-.72,-.052],[.676,-.068],[.34,.235],[-.37,.265]], window);
  bevel(car, .64, .074, .68, .034, body, 0, .245, -.069);
  block(car, .054, .018, .35, paint, 0, -.034, .775);
  block(car, .060, .018, .482, paint, 0, .287, -.070);
  for (const x of [-.34, .34]) {
    bevel(car, .166, .079, .063, .026, ice, x, -.113, 1.067);
    bevel(car, .146, .055, .041, .015, red, x, -.124, -1.077);
    block(car, .025, .043, 1.43, tire, Math.sign(x) * .468, -.308, .01);
    block(car, .036, .16, .037, steel, x * .85, .02, -.908);
  }
  bevel(car, 1.015, .041, .17, .019, body, 0, .106, -.909);
  bevel(car, .377, .073, .038, .023, tire, 0, -.226, 1.064);

  const wheels = [];
  for (const x of [-.465,.465]) {
    for (const z of [-.66,.654]) {
      const wheel = group(car, x, -.337, z);
      wheel.rotation.z = Math.PI / 2;
      const axle = group(wheel);
      cylinder(axle, .212, .142, tire);
      const side = -Math.sign(x);
      cylinder(axle, .147, .024, steel, 0, side * .080);
      cylinder(axle, .064, .035, body, 0, side * .095);
      for (let i = 0; i < 5; i++) {
        const spoke = group(axle);
        spoke.rotation.y = i * 2 * Math.PI / 5;
        block(spoke, .023, .018, .076, tire, 0, side * .102, .095);
      }
      wheels.push(axle);
    }
  }
  return t => {
    car.rotation.y = -.43 + .26 * Math.sin(t * 1.12);
    car.position.x = .055 + .14 * Math.sin(t * 1.12);
    car.rotation.z = .042 * Math.sin(t * 1.12 + .8);
    wheels.forEach(wheel => { wheel.rotation.y = t * 4.15; });
  };
}

const definitions = {
  moon: [moon, 0xaa8fe4, 1.03],
  neighbors: [neighbors, 0x76d5aa, 1.1],
  dida: [keyboard, 0xcda2f0, 1.19],
  flight: [drone, 0x5dbbff, 1.1],
  shop: [shop, 0xf4a481, 1.13],
  civic: [nodeCore, 0x91a6ff, 1.07],
  kindergarten: [kindergarten, 0xe0bd77, 1.13],
  chat: [chat, 0xd2a4fc, 1.19],
  sql: [sql, 0x6bdcbf, 1.18],
  voice: [voice, 0xffa46a, 1.13],
  agro: [fields, 0x8bd7a2, 1.06],
  bilim: [book, 0xd99df2, 1.18],
  apex: [driftCar, 0xffaa6e, 1.02],
};

export function makeScene(name, lunarImage) {
  const [build, accent, scale] = definitions[name];
  const scene = new THREE.Scene();
  const model = group(scene);
  model.scale.setScalar(scale);
  const update = build(model, lunarImage);
  scene.add(new THREE.HemisphereLight(0xeae7fb, 0x362e47, 1.65));
  const key = new THREE.DirectionalLight(0xffe2be, 2.82);
  key.position.set(-3, 3.8, 4.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(accent, 3.4);
  rim.position.set(1.9, 2.4, -3.8);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xbdcaff, .75);
  fill.position.set(4.8, 2.8, 5);
  scene.add(fill);
  const camera = new THREE.PerspectiveCamera(29, 660 / 420, .1, 40);
  camera.position.set(2.75, 2.02, 5.8);
  camera.lookAt(0, 0, 0);
  return { scene, model, camera, update };
}

function studioReflection(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x252432);
  const panels = [
    [5, 3.4, 0xffe7cc, 2.8, [-4, 3.1, 4.5]],
    [2.1, 4.7, 0x8bafff, 2.4, [4.2, 1.5, 1.5]],
    [4.5, .85, 0xff9f75, 2.3, [.5, 2, -5]],
    [4, 3.9, 0xe9f0ff, 2.3, [1.4, 5, -1.1]],
  ];
  for (const [width, height, color, intensity, position] of panels) {
    const material = new THREE.MeshBasicMaterial({color, side: THREE.DoubleSide});
    material.color.multiplyScalar(intensity);
    const panel = place(studio, new THREE.PlaneGeometry(width, height), material, ...position);
    panel.lookAt(0, 0, 0);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(studio, .035, .1, 25);
  } finally {
    generator.dispose();
    for (const panel of studio.children) {
      panel.geometry.dispose();
      panel.material.dispose();
    }
  }
}

function mountShowcase(section) {
  const button = section.querySelector('.model-toggle');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return;
  }
  renderer.setSize(660, 420, false);
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  let reflection;
  const cards = new Map();
  const visible = new Set();
  const inspector = createInspector(document.querySelector('#model-inspector'), drawInspection, sync);
  const lunarImage = typeof Image === 'function' ? new Image() : null;
  if (lunarImage) {
    // NASA Scientific Visualization Studio, CGI Moon Kit (https://svs.gsfc.nasa.gov/4720/).
    lunarImage.src = './assets/models/lunar-surface.webp';
    lunarImage.addEventListener('load', () => {
      const cover = section.querySelector('[data-model="moon"]');
      const card = cards.get(cover);
      requestAnimationFrame(() => {
        if (inspector?.open) inspector.refresh(card);
        else if (visible.has(card)) paint(card);
      });
    }, {once: true});
  }
  let paused = motion.matches;
  let frame = 0;
  let previous = 0;

  function draw(art, context, width, height, time, yaw, pitch, zoom, lift) {
    const {model, scene, camera, update} = art;
    model.rotation.set(pitch, yaw, 0);
    model.position.y = lift;
    update(time);
    if (camera.zoom !== zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
      renderer.setSize(width, height, false);
    }
    renderer.render(scene, camera);
    context.clearRect(0, 0, width, height);
    context.drawImage(renderer.domElement, 0, 0);
  }

  function drawInspection(art, context, width, height, time, view) {
    draw(art, context, width, height, time, view.yaw, view.pitch, view.zoom, 0);
  }

  function paint(card) {
    const yaw = Math.sin(card.time * .52) * .43 + card.tiltX;
    const pitch = Math.sin(card.time * .7 + .5) * .075 + card.tiltY;
    const lift = Math.sin(card.time * 1.15) * .055;
    draw(card.art, card.ctx, 660, 420, card.time, yaw, pitch, 1, lift);
    card.cover.classList.add('has-model');
  }

  function advance(now) {
    if (now - previous >= 30) {
      const elapsed = previous ? Math.min(now - previous, 65) / 1000 : 0;
      previous = now;
      if (inspector?.open) {
        inspector.advance(elapsed);
      } else {
        for (const card of visible) {
          card.time += elapsed;
          paint(card);
        }
      }
    }
    frame = requestAnimationFrame(advance);
  }

  function sync() {
    button.textContent = paused ? 'Запустить 3D' : 'Пауза 3D';
    const animating = inspector?.open ? inspector.playing : !paused && visible.size;
    if (animating && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(advance);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const cover = entry.target;
      if (!entry.isIntersecting) {
        visible.delete(cards.get(cover));
        continue;
      }
      let card = cards.get(cover);
      if (!card) {
        const canvas = cover.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        const art = makeScene(cover.dataset.model, cover.dataset.model === 'moon' ? lunarImage : undefined);
        if (renderer.isWebGLRenderer && reflection === undefined) {
          try { reflection = studioReflection(renderer); } catch { reflection = null; }
        }
        if (reflection) {
          art.scene.environment = reflection.texture;
          art.scene.environmentIntensity = .59;
        }
        card = {cover, ctx, art, time: 0, tiltX: 0, tiltY: 0};
        cards.set(cover, card);
        paint(card);
        button.hidden = false;
        if (inspector) {
          const trigger = cover.querySelector('.model-open');
          const name = cover.closest('article').querySelector('h3').textContent;
          trigger.setAttribute('aria-label', 'Рассмотреть 3D-модель ' + name);
          trigger.addEventListener('click', () => inspector.show(card, name, trigger, !paused));
          trigger.hidden = false;
        }
      } else if (paused && !inspector?.open) {
        paint(card);
      }
      visible.add(card);
    }
    sync();
  }, {rootMargin: '30px'});

  for (const cover of [...section.querySelectorAll('[data-model]'), ...document.querySelectorAll('#catalog [data-model]')]) {
    observer.observe(cover);
    cover.addEventListener('pointermove', event => {
      const card = cards.get(cover);
      if (!card || paused || event.pointerType !== 'mouse') return;
      const box = cover.getBoundingClientRect();
      card.tiltX = ((event.clientX - box.left) / box.width - .5) * .45;
      card.tiltY = ((event.clientY - box.top) / box.height - .5) * .26;
    });
    cover.addEventListener('pointerleave', () => {
      const card = cards.get(cover);
      if (card) card.tiltX = card.tiltY = 0;
    });
  }

  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', event => {
    paused = event.matches;
    if (paused) inspector?.pause();
    sync();
  });
  button.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  renderer.domElement.addEventListener('webglcontextlost', () => {
    observer.disconnect();
    visible.clear();
    inspector?.close();
    for (const cover of cards.keys()) {
      cover.classList.remove('has-model');
      if (inspector) cover.querySelector('.model-open').hidden = true;
    }
    button.hidden = true;
    sync();
  });
}

const gallery = document.querySelector('#projects');
if (gallery && 'IntersectionObserver' in window) mountShowcase(gallery);
