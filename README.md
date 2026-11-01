# 离线定位 Demo（手机真机实验页）

**手机打开（HTTPS）：** https://yuhaven.github.io/offline-location-demo/

首次请联网打开一次（让浏览器缓存页面壳），之后可以开飞行模式做实验。添加到主屏幕是可选的。

### iOS（Safari）

1. 联网时用 Safari 打开上面的链接，允许定位。
2. 之后可开飞行模式继续验收（GNSS 不依赖蜂窝）。
3. 分享 → **添加到主屏幕**（可选）。

### Android（Chrome）

1. 联网时用 Chrome 打开上面的链接，允许定位。
2. 之后可开飞行模式继续验收。
3. 菜单 → **安装应用** / **添加到主屏幕**（可选）。

户外/个人安全产品 **PWA 静态 Demo**：在真机 Safari / Chrome 打开后，用系统 GNSS、权限失败分支、罗盘与相对位移做飞行模式验收。

> **声明：** 非 GNSS 路径均为 **降级方案 / 非精确定位**，**不可作救援承诺**。仅供产品与交付验收，不可当真实救援能力对外承诺。

- **本地路径：** `/workspace/offline-location-demo/`
- **形态：** 纯静态（`index.html` + CSS/JS + Service Worker），适合 **GitHub Pages**（仓库根目录或 `/docs`）
- **目标验收日：** 2026-11-03（Asia/Shanghai）

## 功能对照验收

| 项 | 内容 | 页内操作 |
|----|------|----------|
| **A** | 飞行模式 + 室外 GNSS：经纬 + 精度(m) + 时间戳 → 写入求救条 → 杀标签再开仍见最后成功点 | 「刷新取点」/「持续监听」→「写入求救条」→ 关标签重开 |
| **B** | 拒权限 / 关定位 / GNSS 失败：不白屏；降级 UI；最后已知点（过期标记）+ 手动钉点 | 拒权限或切「降级」页签 |
| **C** | 极端无 GNSS：罗盘 + 相对位移（步态粗估或 +10/+50m）或手动钉点；求救条可标「无绝对坐标」 | 「极端」页签 →「开启罗盘/运动」 |

页内有可勾选的 A/B/C 清单；勾选状态写入 `localStorage`。

## 目录结构

```
offline-location-demo/
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.webmanifest
├── .nojekyll          # GitHub Pages 跳过 Jekyll
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── README.md
└── PROGRESS.md
```

## 本地预览（开发机）

需要 **HTTPS 或 localhost** 才是安全上下文，Geolocation 才可用。

```bash
cd /workspace/offline-location-demo
# 任选其一
npx --yes serve -l 4173 .
# 或
python3 -m http.server 4173
```

浏览器打开 `http://127.0.0.1:4173/`（本机 localhost 可作为安全上下文）。**手机真机实验请用公网 HTTPS**（GitHub Pages）。

## 发布到 GitHub Pages（推荐）

仓库需为 **yuhaven 下新建的空仓库**（由用户创建后把 URL 交给助手推送）。推荐：

1. 把本目录内容推到仓库 **根目录**（或放入 `/docs` 后在 Pages 设置选 `/docs`）。
2. Settings → Pages → Source：**Deploy from a branch** → `main` → `/ (root)`（或 `/docs`）。
3. 等待 1–2 分钟后访问：
   - `https://yuhaven.github.io/offline-location-demo/`
4. 手机浏览器 **首次需联网** 打开一次（缓存 SW 壳）；之后可开飞行模式做 A 项（GNSS 不依赖蜂窝）。

已包含 `.nojekyll`，避免 Jekyll 忽略部分文件。

### 推送示例（拿到空仓库 URL 后）

```bash
cd /workspace/offline-location-demo
git init
git add .
git commit -m "feat: offline location demo PWA for phone GNSS experiments"
git branch -M main
git remote add origin <EMPTY_REPO_HTTPS_URL>
git push -u origin main
```

然后按上面开启 Pages。

## 手机打开 / 「安装」步骤

### Android（Chrome）

1. 用 Chrome 打开 Pages HTTPS 链接（先联网）。
2. 允许定位权限（A 项）；B 项可故意拒绝。
3. 菜单 → **安装应用** / **添加到主屏幕**（可选，PWA）。
4. 验收 A：开飞行模式、关 Wi‑Fi，室外点「刷新取点」→「写入求救条」→ 强制停止浏览器后再开，确认最后点仍在。

### iOS（Safari）

1. Safari 打开同一 HTTPS 链接（先联网）。
2. 允许定位；iOS 罗盘/运动需点「开启罗盘/运动」并授权。
3. 分享 → **添加到主屏幕**（可选）。
4. 飞行模式室外跑 A；设置里关定位或拒权限跑 B；极端页签跑 C。

## 技术要点

- `navigator.geolocation.getCurrentPosition` / `watchPosition`，`enableHighAccuracy: true`
- 成功点写入 `localStorage`（`offlineLocationDemo.v1`）
- Service Worker 缓存壳资源；**定位仍走系统 API**（飞行模式下 GNSS 可用）
- `DeviceOrientation` / `DeviceMotion` 粗估；失败不阻塞，可手动 +N 米或钉点
- 全程中文 UI；降级文案强制出现

## 不做进本 Demo

完整场景决策树、图商 SDK、付费、卫星硬件联调、商店原生 App。
