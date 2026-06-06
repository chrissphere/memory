---
name: tracking-mot
description: 多目标追踪（MOT）训练模式：Canvas 小球运动，标记阶段观察目标，追踪阶段球变同色移动，猜测阶段点选目标球后确认，结果页显示正确率和历史折线图
metadata:
  type: project
---

# 多目标追踪（MOT）训练模式

## 概述

新增独立训练模块"多目标追踪"。玩家先观察哪些球是目标，球开始移动后追踪它们，停止后点选并确认答案，结果页展示正确率与历史趋势。

## 文件结构

- 新建 `tracking.html` — 页面结构（三个 screen）
- 新建 `tracking.js` — 游戏逻辑、Canvas 动画、统计
- 修改 `index.html` — 新增模块卡片
- 共用 `style.css` — 复用现有 `.screen`、`.setting-row`、`.toggle-switch`、`.btn-start` 等样式

## index.html 改动

在 `.modules` 容器内、扑克记忆卡片之后新增：

```html
<a class="module-card" href="tracking.html">
  <div class="module-icon icon-tracking">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="8"  cy="8"  r="4" fill="rgba(255,255,255,0.9)"/>
      <circle cx="24" cy="12" r="4" fill="rgba(255,255,255,0.9)"/>
      <circle cx="16" cy="24" r="4" fill="rgba(255,255,255,0.9)"/>
    </svg>
  </div>
  <div class="module-info">
    <div class="module-name">多目标追踪</div>
    <div class="module-sub">注意力追踪 · 动态视觉</div>
    <div class="module-tags">
      <span class="tag tag-green">注意力</span>
      <span class="tag tag-green">追踪训练</span>
      <span class="tag tag-green">可调难度</span>
    </div>
  </div>
  <svg class="module-arrow" ...></svg>
</a>
```

`index.html` 内联 style 补充：
```css
.icon-tracking { background: linear-gradient(135deg, #22C55E, #0EA5E9); }
.tag-green { background: rgba(34,197,94,0.2); color: #4ade80; }
```

## tracking.html 结构

三个 screen，复用 `style.css`：

1. **screen-home** — 设置页：总球数、目标数、速度选择、追踪时长、历史成绩卡片、开始按钮
2. **screen-game** — 游戏页：返回按钮、阶段提示文字、Canvas、确认按钮（猜测阶段才显示）
3. **screen-result** — 结果页：正确率大字、本次时长、历史折线图 Canvas、再来/返回按钮

## 设置参数

| 参数 | 控件 | 范围 | 默认 |
|------|------|------|------|
| 总球数 | number input | 4–12 | 8 |
| 目标数 | number input | 1–5 | 3 |
| 移动速度 | 三选按钮（慢/中/快） | 1.5/3/5 px/帧 | 中 |
| 追踪时长 | number input | 3–15s | 5 |

目标数上限自动 clamp 为 `min(targets, Math.floor(balls/2))`。

## 游戏状态机

```
IDLE → MARKING(2s) → TRACKING(duration) → GUESSING → RESULT
```

- **MARKING**：球静止，目标球橙色描边 + 1.3× 放大，持续 2s 后自动进入 TRACKING
- **TRACKING**：所有球变灰白同色，开始移动；顶部倒计时；到时自动进入 GUESSING
- **GUESSING**：球停止，可点击；点中变蓝色选中，再点取消；选够目标数时"确认"按钮激活
- **RESULT**：显示结果页

## Canvas 物理

- Canvas 尺寸：`min(屏幕宽-40px, 420px)` 正方形
- 球半径：`22px`
- 边界：球心保持在 `[radius, canvasSize-radius]` 范围内，碰边取反对应速度分量
- 球间碰撞：检测两球心距 < 2×radius 时，交换两球速度向量（弹性碰撞近似）
- 帧率：`requestAnimationFrame`，速度单位为 px/帧（60fps 下约等于 px/16ms）

## 点击判断

```js
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  balls.forEach(b => {
    if (Math.hypot(b.x - x, b.y - y) <= RADIUS) toggleSelect(b);
  });
});
```

## 统计持久化

```js
// localStorage keys
const SETTINGS_KEY = 'tracking_settings';
const STATS_KEY    = 'tracking_stats';

// stats 数组每项
{ correct: number, total: number, ms: number, ts: number }
// 最多保留 20 条，超出时移除最旧一条
```

结果页指标：
- 正确率文字：`correct / total`
- 本次时长：追踪阶段 ms（非完整游戏时长）
- 历史折线：取最近 10 条，Canvas 绘制折线，Y 轴 0–1（正确率），点上绘小圆

## 结果判断

猜测阶段结束后，对比 `selectedBalls` 与 `targetBalls`（按 id 对比），计算 `correct = intersection.length`。
