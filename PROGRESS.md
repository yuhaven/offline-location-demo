# PROGRESS · 离线定位 Demo

时区：Asia/Shanghai（UTC+8）

| 时间 | 事项 |
|------|------|
| 2026-11-01 约 22:19 | 群内定稿：产品方案 2 天交付手机可实验 Demo；形态为浏览器实验页/PWA，非商店原生 App；目标 **2026-11-03** |
| 2026-11-01 约 22:20–22:22 | 在 `/workspace/offline-location-demo/` 搭建静态 PWA：`index.html` / `styles.css` / `app.js` / `sw.js` / `manifest` / icons / `.nojekyll` |
| 2026-11-01 约 22:22 | 对齐验收 A/B/C：GNSS 取点+求救条+localStorage；失败降级 UI；极端罗盘/相对位移/手动钉点 |
| 2026-11-01 约 22:22 | 托管：用户将新建 **yuhaven 空 GitHub 仓库** 后推送并开 Pages；此前不阻塞本地完工。`gh` CLI 未登录；Cursor 无法代建 GitHub 仓库 |
| 2026-11-01 | 未做持久公网发布（等空仓库 URL）。可选临时 tunnel 未作为正式交付 |
| 2026-11-01 | 代码已推送到 GitHub（Asia/Shanghai）：`yuhaven/offline-location-demo` 的 `main`，站点文件在仓库根目录 |

## 状态

- [x] 本地完整可运行静态站
- [x] README（安装、手机步骤、A/B/C）
- [x] GitHub Pages 就绪（根目录 + `.nojekyll`）
- [x] 推送到 yuhaven 新仓库（2026-11-01，Asia/Shanghai）
- [ ] 启用 GitHub Pages 并产出 HTTPS URL
- [ ] 真机飞行模式 A/B/C 录屏验收

## 下一步（拿到仓库 URL 后）

1. 将本目录推到空仓库 `main`
2. 开启 Pages（root）
3. 把 `https://yuhaven.github.io/offline-location-demo/` 发群，交付/客户按清单验收
