---
name: tracking-theme-toggle
description: 多目标追踪页面深色模式开关：与 schulte 页面相同模式，body.theme-dark class 切换，持久化到 tracking_settings
metadata:
  type: project
---

# 多目标追踪深色模式开关

## 概述

在 `tracking.html` 设置页添加"深色模式"开关，与 schulte 实现完全一致。CSS 规则（`body.theme-dark` / `body.theme-light`）已在 `style.css` 中就绪，只需添加 UI 和 JS 逻辑。

## tracking.html 改动

在"移动速度" `.setting-row` 之后、`.speed-group` 之前插入：

```html
<div class="setting-row">
  <span class="setting-label">深色模式</span>
  <label class="toggle-switch">
    <input type="checkbox" id="toggle-theme">
    <span class="toggle-slider"></span>
  </label>
</div>
```

## tracking.js 改动

**顶部变量区**（`let trackingMs = 0;` 之后）新增：
```js
let darkForced = false;
```

**`shuffle` 函数之前**新增：
```js
function applyTheme(forced) {
  document.body.classList.toggle('theme-dark', forced === true);
  document.body.classList.toggle('theme-light', forced === false);
}
```

**`initPrefs` 内**，`inputBalls` 绑定之前插入：
```js
darkForced = p.darkForced || false;
applyTheme(darkForced ? true : null);
const toggleTheme = document.getElementById('toggle-theme');
toggleTheme.checked = !!darkForced;
toggleTheme.addEventListener('change', () => {
  darkForced = toggleTheme.checked;
  applyTheme(darkForced ? true : null);
  savePrefs({ darkForced });
});
```

## 持久化

`darkForced` 存入 `tracking_settings`（key: `darkForced`），与其他设置合并保存。
