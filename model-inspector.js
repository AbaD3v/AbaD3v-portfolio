const initialView = {yaw: .22, pitch: .06, zoom: 1.15};

export function createInspector(dialog, draw, onStateChange) {
  if (typeof dialog?.showModal !== 'function') return null;

  const title = dialog.querySelector('h2');
  const canvas = dialog.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;

  const zoom = dialog.querySelector('input[type="range"]');
  const play = dialog.querySelector('[data-play]');
  const view = {...initialView};
  let selected = null;
  let source = null;
  let pointer = null;
  let time = 0;
  let playing = false;

  function paint() {
    if (selected && dialog.open) draw(selected.art, context, canvas.width, canvas.height, time, view);
  }

  function setPlaying(value) {
    playing = value;
    play.setAttribute('aria-pressed', String(playing));
    onStateChange();
  }

  function turn(yaw, pitch) {
    view.yaw = (view.yaw + yaw) % (2 * Math.PI);
    view.pitch = Math.max(-1.1, Math.min(1.1, view.pitch + pitch));
    paint();
  }

  function reset() {
    Object.assign(view, initialView);
    zoom.value = String(Math.round(initialView.zoom * 100));
  }

  function endDrag(event) {
    if (pointer?.id === event.pointerId) pointer = null;
  }

  zoom.addEventListener('input', () => {
    view.zoom = Number(zoom.value) / 100;
    paint();
  });
  canvas.addEventListener('pointerdown', event => {
    if (pointer || event.button !== 0) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    turn((event.clientX - pointer.x) * .012, (event.clientY - pointer.y) * .010);
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(event, endDrag);
  }
  canvas.addEventListener('keydown', event => {
    const directions = {
      ArrowLeft: [-.16, 0],
      ArrowRight: [.16, 0],
      ArrowUp: [0, -.12],
      ArrowDown: [0, .12],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    turn(...direction);
  });
  dialog.querySelector('[data-reset]').addEventListener('click', () => { reset(); paint(); });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  play.addEventListener('click', () => setPlaying(!playing));
  dialog.addEventListener('close', () => {
    selected = null;
    pointer = null;
    setPlaying(false);
    source?.focus({preventScroll: true});
    source = null;
  });

  return {
    get open() { return dialog.open; },
    get playing() { return playing; },
    show(card, name, trigger, autoplay) {
      if (dialog.open) return;
      selected = card;
      time = card.time;
      source = trigger;
      title.textContent = name;
      const style = getComputedStyle(card.cover);
      for (const property of ['--stage-light', '--stage-dark']) {
        dialog.style.setProperty(property, style.getPropertyValue(property));
      }
      reset();
      dialog.showModal();
      setPlaying(autoplay);
      paint();
    },
    advance(elapsed) {
      if (!playing) return;
      time += elapsed;
      paint();
    },
    refresh(card) { if (selected === card) paint(); },
    pause() { if (dialog.open) setPlaying(false); },
    close() { if (dialog.open) dialog.close(); },
  };
}
