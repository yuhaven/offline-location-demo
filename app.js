(() => {
  'use strict';

  const STORAGE_KEY = 'offlineLocationDemo.v1';
  const STALE_MS = 5 * 60 * 1000;

  const state = {
    mode: 'gnss',
    watching: false,
    watchId: null,
    liveFix: null,
    lastFix: null,
    heading: null,
    relativeMeters: 0,
    stepEstimate: 0,
    motionListening: false,
    orientationListening: false,
    lastAccel: null,
    lastStepAt: 0,
    sosText: '',
    lastError: null,
    secure: window.isSecureContext,
    geoSupported: 'geolocation' in navigator,
  };

  const $ = (id) => document.getElementById(id);
  const els = {};

  function qs() {
    [
      'chipSecure','chipGeo','chipSw','chipMode',
      'tabGnss','tabDegraded','tabExtreme',
      'disclaimerDegraded','statusLine',
      'lat','lon','acc','ts','source',
      'btnRefresh','btnWatch','btnSos','btnUseLast','btnManualApply','btnClear',
      'btnCopySos','btnInstallHint',
      'manualLat','manualLon','manualNote',
      'btnPlus10','btnPlus50','btnResetRel','btnEnableSensors',
      'relMeters','stepCount','headingVal','needle','compassHint',
      'sosOut','toast','panelExtreme','panelManual',
      'chkA','chkB','chkC'
    ].forEach((id) => { els[id] = $(id); });
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.lastFix) state.lastFix = data.lastFix;
      if (typeof data.relativeMeters === 'number') state.relativeMeters = data.relativeMeters;
      if (typeof data.stepEstimate === 'number') state.stepEstimate = data.stepEstimate;
      if (data.sosText) state.sosText = data.sosText;
      if (data.checklist) {
        if (data.checklist.a) els.chkA.checked = true;
        if (data.checklist.b) els.chkB.checked = true;
        if (data.checklist.c) els.chkC.checked = true;
      }
    } catch (e) {
      console.warn('loadStore', e);
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        lastFix: state.lastFix,
        relativeMeters: state.relativeMeters,
        stepEstimate: state.stepEstimate,
        sosText: state.sosText,
        checklist: {
          a: !!els.chkA.checked,
          b: !!els.chkB.checked,
          c: !!els.chkC.checked,
        },
        savedAt: Date.now(),
      }));
    } catch (e) {
      console.warn('saveStore', e);
    }
  }

  function fmtTs(ms) {
    if (!ms) return '—';
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).format(new Date(ms)) + ' (Asia/Shanghai)';
    } catch {
      return new Date(ms).toLocaleString('zh-CN');
    }
  }

  function ageLabel(ms) {
    if (!ms) return '';
    const age = Date.now() - ms;
    if (age < 60e3) return Math.floor(age / 1000) + ' 秒前';
    if (age < 3600e3) return Math.floor(age / 60e3) + ' 分钟前';
    return Math.floor(age / 3600e3) + ' 小时前';
  }

  function isStale(fix) {
    if (!fix || !fix.timestamp) return true;
    return Date.now() - fix.timestamp > STALE_MS;
  }

  function setStatus(msg, kind) {
    els.statusLine.textContent = msg || '';
    els.statusLine.className = 'status-line' + (kind === 'err' ? ' err' : kind === 'ok' ? ' ok' : '');
  }

  function updateChips() {
    els.chipSecure.textContent = state.secure ? '安全上下文 HTTPS ✓' : '非 HTTPS（定位可能不可用）';
    els.chipSecure.className = 'chip ' + (state.secure ? 'ok' : 'bad');
    els.chipGeo.textContent = state.geoSupported ? 'Geolocation API ✓' : '无 Geolocation';
    els.chipGeo.className = 'chip ' + (state.geoSupported ? 'ok' : 'bad');
    const modeMap = {
      gnss: '模式：无网 GNSS',
      degraded: '模式：降级',
      extreme: '模式：极端无 GNSS',
    };
    els.chipMode.textContent = modeMap[state.mode];
    els.chipMode.className = 'chip ' + (state.mode === 'gnss' ? 'ok' : 'warn');
  }

  function setMode(mode) {
    state.mode = mode;
    els.tabGnss.classList.toggle('active', mode === 'gnss');
    els.tabDegraded.classList.toggle('active', mode === 'degraded');
    els.tabExtreme.classList.toggle('active', mode === 'extreme');
    els.disclaimerDegraded.classList.toggle('hidden', mode === 'gnss');
    els.panelExtreme.classList.toggle('hidden', mode !== 'extreme');
    els.panelManual.classList.toggle('hidden', mode === 'gnss');
    updateChips();
    renderFix();
  }

  function renderFix() {
    const display = state.liveFix || state.lastFix;
    const usingLive = !!state.liveFix;
    const source = usingLive
      ? (state.liveFix.source || 'GNSS')
      : (state.lastFix ? ('缓存·' + (state.lastFix.source || '未知')) : '无');

    if (!display) {
      els.lat.textContent = '—';
      els.lon.textContent = '—';
      els.acc.textContent = '—';
      els.ts.textContent = '—';
      els.source.textContent = '尚无坐标';
    } else {
      const stale = isStale(display) && !usingLive;
      els.lat.textContent = Number(display.lat).toFixed(6);
      els.lon.textContent = Number(display.lon).toFixed(6);
      els.acc.textContent = display.accuracy != null
        ? (Number(display.accuracy).toFixed(1) + ' m')
        : (display.noAbsolute ? '无绝对精度' : '—');
      els.ts.textContent = fmtTs(display.timestamp) + (stale ? ' · 已过期/陈旧' : '') +
        (display.timestamp ? ' · ' + ageLabel(display.timestamp) : '');
      els.source.textContent = source + (stale ? '（降级：最后已知点）' : '');
    }

    els.relMeters.textContent = state.relativeMeters.toFixed(1) + ' m';
    els.stepCount.textContent = String(state.stepEstimate);
    if (state.heading != null) {
      els.headingVal.textContent = state.heading.toFixed(0) + '°';
      els.needle.style.transform = 'rotate(' + state.heading + 'deg)';
    } else {
      els.headingVal.textContent = '—';
    }
  }

  function persistSuccessfulFix(fix) {
    state.lastFix = Object.assign({}, fix);
    saveStore();
  }

  function onPosition(pos) {
    const fix = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp || Date.now(),
      source: 'GNSS',
      noAbsolute: false,
    };
    state.liveFix = fix;
    state.lastError = null;
    persistSuccessfulFix(fix);
    setStatus('已取得 GNSS 坐标（精度约 ' + (fix.accuracy != null ? fix.accuracy.toFixed(1) + ' m' : '未知') + '）', 'ok');
    renderFix();
  }

  function enterDegradedFromError(err) {
    state.liveFix = null;
    state.lastError = err;
    const code = err && err.code;
    let msg = '定位失败，已进入降级 UI（不卡死）。';
    if (code === 1) msg = '定位权限被拒绝 → 降级方案。不可作救援承诺。';
    else if (code === 2) msg = '位置不可用（服务关闭/无卫星）→ 降级方案。';
    else if (code === 3) msg = '定位超时 → 降级方案。可重试或手动钉点。';
    else if (err && err.message) msg = err.message + ' → 降级方案。';
    setStatus(msg, 'err');
    if (state.mode === 'gnss') setMode('degraded');
    renderFix();
  }

  function geoOptions() {
    return { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 };
  }

  function refreshOnce() {
    if (!state.secure) {
      setStatus('需要 HTTPS 安全上下文才能调用定位。请用公网 HTTPS 打开本页。', 'err');
      setMode('degraded');
      return;
    }
    if (!state.geoSupported) {
      enterDegradedFromError({ code: 2, message: '浏览器不支持 Geolocation' });
      return;
    }
    setStatus('正在取点…', '');
    navigator.geolocation.getCurrentPosition(onPosition, enterDegradedFromError, geoOptions());
  }

  function toggleWatch() {
    if (state.watching) {
      stopWatch();
      return;
    }
    if (!state.secure || !state.geoSupported) {
      enterDegradedFromError({ code: 2, message: '无法持续监听定位' });
      return;
    }
    state.watchId = navigator.geolocation.watchPosition(onPosition, enterDegradedFromError, geoOptions());
    state.watching = true;
    els.btnWatch.textContent = '停止监听';
    setStatus('已开始 watchPosition 持续取点', 'ok');
  }

  function stopWatch() {
    if (state.watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(state.watchId);
    }
    state.watchId = null;
    state.watching = false;
    els.btnWatch.textContent = '持续监听';
  }

  function useLastKnown() {
    if (!state.lastFix) {
      setStatus('没有缓存的最后已知点。请先成功取点或手动钉点。', 'err');
      setMode('degraded');
      return;
    }
    state.liveFix = null;
    setMode('degraded');
    setStatus(
      isStale(state.lastFix)
        ? '已切换到最后已知点（已过期/陈旧）。降级方案，不可作救援承诺。'
        : '已切换到最后已知点。请注意时效。',
      ''
    );
    renderFix();
  }

  function applyManualPin() {
    const lat = parseFloat(els.manualLat.value);
    const lon = parseFloat(els.manualLon.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setStatus('请输入有效经纬度（纬度 -90~90，经度 -180~180）。', 'err');
      return;
    }
    const fix = {
      lat: lat,
      lon: lon,
      accuracy: null,
      timestamp: Date.now(),
      source: '手动钉点',
      noAbsolute: false,
      note: (els.manualNote.value || '').trim(),
    };
    state.liveFix = fix;
    persistSuccessfulFix(fix);
    if (state.mode === 'gnss') setMode('degraded');
    setStatus('已写入手动钉点（降级方案，不可作救援承诺）。', 'ok');
    renderFix();
    toast('手动钉点已保存');
  }

  function bumpRelative(meters) {
    state.relativeMeters += meters;
    if (state.lastFix && state.heading != null && Number.isFinite(state.lastFix.lat)) {
      const R = 6378137;
      const d = meters;
      const brng = state.heading * Math.PI / 180;
      const lat1 = state.lastFix.lat * Math.PI / 180;
      const lon1 = state.lastFix.lon * Math.PI / 180;
      const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));
      const lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
        Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
      );
      const est = {
        lat: lat2 * 180 / Math.PI,
        lon: lon2 * 180 / Math.PI,
        accuracy: null,
        timestamp: Date.now(),
        source: '相对位移粗估',
        noAbsolute: false,
        estimated: true,
        baseFrom: state.lastFix.source,
      };
      state.liveFix = est;
      state.lastFix = Object.assign({}, est);
    }
    saveStore();
    renderFix();
    setStatus('相对位移 +' + meters + ' m（粗估，降级/非精确定位，不可作救援承诺）。', '');
  }

  function resetRelative() {
    state.relativeMeters = 0;
    state.stepEstimate = 0;
    saveStore();
    renderFix();
    toast('相对位移已清零');
  }

  function handleOrientation(ev) {
    let heading = null;
    if (typeof ev.webkitCompassHeading === 'number') {
      heading = ev.webkitCompassHeading;
    } else if (typeof ev.alpha === 'number') {
      heading = (360 - ev.alpha) % 360;
    }
    if (heading != null && Number.isFinite(heading)) {
      state.heading = heading;
      renderFix();
    }
  }

  function handleMotion(ev) {
    const a = ev.accelerationIncludingGravity || ev.acceleration;
    if (!a) return;
    const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    const now = Date.now();
    if (state.lastAccel != null) {
      const delta = mag - state.lastAccel;
      if (delta > 1.6 && now - state.lastStepAt > 350) {
        state.lastStepAt = now;
        state.stepEstimate += 1;
        bumpRelative(0.7);
      }
    }
    state.lastAccel = mag;
  }

  async function enableSensors() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') {
          setStatus('方向传感器权限未授予。仍可用手动 +N 米 / 手动钉点。', 'err');
          els.compassHint.textContent = '方向权限被拒 — 请用手动位移';
          return;
        }
      }
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        try { await DeviceMotionEvent.requestPermission(); } catch (_) {}
      }
    } catch (e) {
      console.warn(e);
    }

    if (!state.orientationListening) {
      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      state.orientationListening = true;
    }
    if (!state.motionListening) {
      window.addEventListener('devicemotion', handleMotion, true);
      state.motionListening = true;
    }
    els.compassHint.textContent = '传感器已开启（罗盘/步态粗估）。降级方案，不可作救援承诺。';
    setStatus('传感器已开启', 'ok');
    toast('传感器已开启');
  }

  function buildSos() {
    const fix = state.liveFix || state.lastFix;
    const lines = [];
    lines.push('【求救条 · Demo 草稿】');
    lines.push('时间：' + fmtTs(Date.now()));
    lines.push('模式：' + ({ gnss: '无网GNSS', degraded: '降级', extreme: '极端无GNSS' }[state.mode]));

    if (fix && !fix.noAbsolute && Number.isFinite(fix.lat)) {
      lines.push('坐标：' + Number(fix.lat).toFixed(6) + ', ' + Number(fix.lon).toFixed(6));
      if (fix.accuracy != null) lines.push('精度：约 ' + Number(fix.accuracy).toFixed(1) + ' m');
      lines.push('坐标时间：' + fmtTs(fix.timestamp));
      lines.push('来源：' + (fix.source || '未知') + (fix.estimated || isStale(fix) ? '（可能陈旧/粗估）' : ''));
      lines.push('地图：https://maps.google.com/?q=' + fix.lat + ',' + fix.lon);
    } else {
      lines.push('坐标：【无绝对坐标】');
      lines.push('说明：当前无法提供 GNSS 绝对定位。');
    }

    if (state.relativeMeters) lines.push('相对位移累计：约 ' + state.relativeMeters.toFixed(1) + ' m（粗估）');
    if (state.stepEstimate) lines.push('步态峰值估计：' + state.stepEstimate + ' 步');
    if (state.heading != null) lines.push('罗盘朝向：约 ' + state.heading.toFixed(0) + '°');
    if (fix && fix.note) lines.push('备注：' + fix.note);

    lines.push('');
    lines.push('⚠️ 降级/非精确定位，不可作救援承诺。本条仅用于产品 Demo 验收。');
    state.sosText = lines.join('\n');
    els.sosOut.value = state.sosText;
    saveStore();
    setStatus('求救条已生成', 'ok');
    toast('求救条已写入');
  }

  async function copySos() {
    if (!els.sosOut.value) buildSos();
    const out = els.sosOut.value;
    try {
      await navigator.clipboard.writeText(out);
      toast('已复制到剪贴板');
    } catch {
      els.sosOut.focus();
      els.sosOut.select();
      toast('请长按文本手动复制');
    }
  }

  function clearCache() {
    stopWatch();
    state.liveFix = null;
    state.lastFix = null;
    state.relativeMeters = 0;
    state.stepEstimate = 0;
    state.sosText = '';
    els.sosOut.value = '';
    els.manualLat.value = '';
    els.manualLon.value = '';
    els.manualNote.value = '';
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    renderFix();
    setStatus('本地缓存已清除', 'ok');
    toast('缓存已清');
  }

  function bind() {
    els.tabGnss.addEventListener('click', () => setMode('gnss'));
    els.tabDegraded.addEventListener('click', () => setMode('degraded'));
    els.tabExtreme.addEventListener('click', () => setMode('extreme'));
    els.btnRefresh.addEventListener('click', refreshOnce);
    els.btnWatch.addEventListener('click', toggleWatch);
    els.btnSos.addEventListener('click', buildSos);
    els.btnUseLast.addEventListener('click', useLastKnown);
    els.btnManualApply.addEventListener('click', applyManualPin);
    els.btnClear.addEventListener('click', clearCache);
    els.btnCopySos.addEventListener('click', copySos);
    els.btnPlus10.addEventListener('click', () => bumpRelative(10));
    els.btnPlus50.addEventListener('click', () => bumpRelative(50));
    els.btnResetRel.addEventListener('click', resetRelative);
    els.btnEnableSensors.addEventListener('click', enableSensors);
    [els.chkA, els.chkB, els.chkC].forEach((el) => el.addEventListener('change', saveStore));
    els.btnInstallHint.addEventListener('click', () => {
      toast('iOS：Safari 分享→添加到主屏幕；Android：Chrome 菜单→安装应用/添加到主屏幕');
    });
  }

  function registerSw() {
    if (!('serviceWorker' in navigator)) {
      els.chipSw.textContent = '无 Service Worker';
      els.chipSw.className = 'chip warn';
      return;
    }
    navigator.serviceWorker.register('./sw.js').then(() => {
      els.chipSw.textContent = 'SW 已注册（可离线壳）';
      els.chipSw.className = 'chip ok';
    }).catch((e) => {
      els.chipSw.textContent = 'SW 注册失败';
      els.chipSw.className = 'chip warn';
      console.warn(e);
    });
  }

  function boot() {
    qs();
    loadStore();
    if (state.sosText) els.sosOut.value = state.sosText;
    bind();
    updateChips();
    setMode('gnss');
    renderFix();
    registerSw();

    if (!state.secure) {
      setStatus('当前非安全上下文。请用 HTTPS 公网地址在手机打开，否则 GNSS 可能被浏览器拦截。', 'err');
      setMode('degraded');
    } else if (state.lastFix) {
      setStatus('已恢复上次成功点（localStorage）。可点「刷新取点」或「持续监听」。', 'ok');
    } else {
      setStatus('准备就绪。建议室外开飞行模式后点「刷新取点」。', '');
    }

    if (state.secure && state.geoSupported) {
      navigator.geolocation.getCurrentPosition(onPosition, (err) => {
        state.lastError = err;
        setStatus('首次自动取点未成功（可点刷新）。失败不卡死。', 'err');
        renderFix();
      }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
