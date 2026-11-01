(() => {
  const $ = (id) => document.getElementById(id);
  const distanceEl = $('distance');
  const headingEl = $('heading');
  const statusText = $('statusText');
  const statusDot = $('statusDot');
  const hint = $('hint');
  const sosBox = $('sosBox');
  const sosText = $('sosText');

  const STEP_M = 0.72;
  let running = false;
  let heading = null;
  let steps = 0;
  let distM = 0;
  let lastPeak = 0;
  let lastAcc = 0;
  let landmark = '';

  function setStatus(kind, text) {
    statusDot.className = 'dot ' + (kind || '');
    statusText.textContent = text;
  }

  function render() {
    distanceEl.textContent = String(Math.round(distM));
    headingEl.textContent = heading == null ? '—' : String(Math.round(heading));
  }

  function onOrientation(e) {
    let h = e.webkitCompassHeading;
    if (h == null && e.absolute !== false && typeof e.alpha === 'number') {
      h = (360 - e.alpha) % 360;
    }
    if (typeof h === 'number' && !Number.isNaN(h)) {
      heading = h;
      render();
    }
  }

  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    const now = Date.now();
    if (mag > 11.2 && lastAcc <= 11.2 && now - lastPeak > 320) {
      lastPeak = now;
      steps += 1;
      const rad = ((heading ?? 0) * Math.PI) / 180;
      // accumulate path length (human-usable distance walked)
      distM += STEP_M;
      render();
    }
    lastAcc = mag;
  }

  async function start() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') {
          setStatus('bad', '未授权方向传感器');
          return;
        }
      }
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        const r = await DeviceMotionEvent.requestPermission();
        if (r !== 'granted') {
          setStatus('warn', '未授权运动传感器，仍可读罗盘');
        }
      }
    } catch (err) {
      setStatus('bad', '传感器授权失败');
      return;
    }

    window.removeEventListener('deviceorientation', onOrientation);
    window.removeEventListener('devicemotion', onMotion);
    window.addEventListener('deviceorientation', onOrientation, true);
    window.addEventListener('devicemotion', onMotion, true);
    running = true;
    setStatus('ok', '已开始 · 无网无星相对定位');
    hint.textContent = '走动几步看「离起点」变化；需要重来就点重置起点。';
  }

  function reset() {
    steps = 0;
    distM = 0;
    landmark = '';
    render();
    setStatus(running ? 'ok' : '', running ? '起点已重置' : '点下方开始');
  }

  function buildSos() {
    const h = heading == null ? '未知' : `${Math.round(heading)}°`;
    const text =
      `【极端定位求救】无网络无卫星。我相对起点约走了 ${Math.round(distM)} 米，朝向约 ${h}。` +
      `这是相对定位，不是绝对经纬度，请按相对描述寻找。`;
    sosText.value = text;
    sosBox.hidden = false;
  }

  $('btnStart').addEventListener('click', start);
  $('btnReset').addEventListener('click', reset);
  $('btnSos').addEventListener('click', buildSos);
  $('btnCopy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(sosText.value);
      setStatus('ok', '已复制求救短句');
    } catch {
      sosText.select();
      setStatus('warn', '请长按文本手动复制');
    }
  });

  // lightweight self-check
  const secure = window.isSecureContext;
  const hasOri = 'DeviceOrientationEvent' in window;
  const hasMot = 'DeviceMotionEvent' in window;
  if (!secure) setStatus('bad', '需要 HTTPS 才能用传感器');
  else if (!hasOri && !hasMot) setStatus('bad', '此设备无可用传感器 API');
  else setStatus('warn', '传感器就绪 · 点开始');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  render();
})();
