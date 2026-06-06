---
name: schulte-color-interference
description: 舒尔特方格颜色干扰模式设计：开局随机为每个数字格子分配文字颜色，增加视觉干扰难度
metadata:
  type: project
---

# 舒尔特方格颜色干扰模式

## 概述

在设置页添加"颜色干扰"开关。开启后，每次开始游戏时为每个格子随机分配文字颜色，利用颜色的视觉吸引力干扰用户扫描数字的效率。颜色在本局游戏中保持固定，重新开始时重新随机。

## 设置入口

在 `schulte.html` 的 `screen-home` 设置区，"逐格延迟"的 `setting-row` 之后插入：

```html
<div class="setting-row">
  <span class="setting-label">颜色干扰</span>
  <label class="toggle-switch">
    <input type="checkbox" id="toggle-color">
    <span class="toggle-slider"></span>
  </label>
</div>
```

样式复用现有 `.setting-row` / `.toggle-switch`，无需新增 CSS。

## 颜色生成

在 `app.js` 的 `buildGrid()` 函数中，若 `colorEnabled === true`，为每个 cell 生成独立颜色：

```js
function randomCellColor() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 51) + 50; // 50–100%
  const l = dark
    ? Math.floor(Math.random() * 31) + 45  // 45–75%
    : Math.floor(Math.random() * 36) + 20; // 20–55%
  return `hsl(${h},${s}%,${l}%)`;
}
```

在 `buildGrid()` 的 `numbers.forEach` 中，格子创建后：

```js
if (colorEnabled) cell.style.color = randomCellColor();
```

## 洗牌兼容

`reshufflePartial()` 只更新 `dataset.num` 和 `textContent`，不改 `style.color`，颜色与格子位置绑定而非数字绑定。洗牌后数字换格子、颜色随格子走，无需额外处理。

## 已点击格子

`.correct` 状态通过 `cell.style.color = 'var(--success)'` 覆盖干扰色（现有逻辑 `handleCellClick` 已这样做），无需改动。

## 状态持久化

`colorEnabled` 存入 localStorage 的 `schulte_settings`（key: `color`），与其他设置保持一致：

- `loadPrefs()` 读取：`colorEnabled = p.color || false`
- 开关变更时：`savePrefs({ color: colorEnabled })`

## 不影响的功能

- 分区辅助背景色（`background-color`）与文字色互相独立，不冲突
- 错误动画（`.wrong`）背景色覆盖效果照常工作
- 深色模式下通过亮度范围调整保证可读性
