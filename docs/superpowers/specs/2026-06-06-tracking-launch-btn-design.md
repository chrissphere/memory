---
name: tracking-ball-limit-and-launch-btn
description: 多目标追踪：总球数上限改为20，MARKING阶段改为手动点击"开始追踪"推进，按钮加间距
metadata:
  type: project
---

# 多目标追踪：球数上限与启动按钮

## 概述

两个改动：① 总球数上限从12提升到20；② MARKING阶段取消2秒自动推进，改为显示"开始追踪"按钮，用户确认记住目标球后手动点击推进。同时统一游戏页按钮的间距。

## 改动 1：总球数上限 20

- `tracking.html`：`<input id="input-balls" max="12">` → `max="20"`
- `tracking.js` initPrefs：`Math.min(20, Math.min(20, parseInt(...) || 8))`

## 改动 2：MARKING 阶段手动推进

**新流程：**
1. 主页点"开始训练" → 立即进入 MARKING（目标球橙色高亮，静止）
2. 底部显示"开始追踪"按钮（`id="btn-launch"`）
3. 用户点击 → 隐藏 btn-launch，进入 TRACKING（球变灰运动，倒计时）
4. GUESSING / RESULT 不变

**`startMarking` 改动：**
- 移除 `setTimeout(() => startTracking(canvas), 2000)`
- 改为显示 `btn-launch` 按钮

**新增事件绑定（initPrefs 内）：**
```js
document.getElementById('btn-launch').addEventListener('click', () => {
  document.getElementById('btn-launch').style.display = 'none';
  startTracking(document.getElementById('game-canvas'));
});
```

**`startGame` 中：** 重置时隐藏 `btn-launch`（`style.display = 'none'`）

## 改动 3：按钮间距

`tracking.html` 游戏页按钮区域：
- `btn-launch` 和 `btn-confirm` 样式：`margin: 12px 20px 20px`
- 游戏页 screen-game 底部：`padding-bottom: env(safe-area-inset-bottom, 24px)`

## tracking.html 新增元素

在 `btn-confirm` 之前插入：
```html
<button class="btn-confirm" id="btn-launch" style="display:none;margin:12px 20px 20px;">开始追踪</button>
```

`btn-confirm` 同步加 `style="display:none;margin:12px 20px 20px;"`
