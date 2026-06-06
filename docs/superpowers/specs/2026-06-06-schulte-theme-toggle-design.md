---
name: schulte-theme-toggle
description: 舒尔特方格手动深浅主题切换：设置页添加"深色模式"开关，覆盖系统 prefers-color-scheme
metadata:
  type: project
---

# 舒尔特方格主题切换

## 概述

在设置页添加"深色模式"开关。开启时强制深色主题，关闭时恢复跟随系统 `prefers-color-scheme`。实现方式为在 `<body>` 上切换 `theme-dark` / `theme-light` class，通过 CSS 覆盖现有变量。

## 设置入口

在 `schulte.html` 的 `.home-header` 之后、`.size-selector` 之前插入：

```html
<div class="setting-row">
  <span class="setting-label">深色模式</span>
  <label class="toggle-switch">
    <input type="checkbox" id="toggle-theme">
    <span class="toggle-slider"></span>
  </label>
</div>
```

## CSS 规则（style.css）

在文件末尾新增两组覆盖规则：

**强制深色（`.theme-dark`）：**
复制 `@media (prefers-color-scheme: dark)` 内的所有 CSS 变量到 `body.theme-dark`，使其在任意系统主题下生效。同时在该媒体查询内加 `body.theme-dark` 以保证深色模式下 zone 颜色也正确。

**强制浅色（`.theme-light`）：**
在 `@media (prefers-color-scheme: dark)` 内部添加 `body.theme-light { ... }`，用浅色变量覆盖，确保系统深色时也能强制浅色。

## JS 逻辑（app.js）

**状态变量：**
```js
let darkForced = false; // null 表示跟随系统，true 表示强制深色
```

**applyTheme 函数：**
```js
function applyTheme(forced) {
  document.body.classList.toggle('theme-dark', forced === true);
  document.body.classList.toggle('theme-light', forced === false);
}
```
- `forced = true`：加 `theme-dark`，移除 `theme-light`
- `forced = null`（跟随系统）：两个 class 都移除

注：开关只有开/关两态。开 = 强制深色（`forced = true`），关 = 跟随系统（移除 class）。不需要强制浅色的逻辑，`.theme-light` 规则保留为扩展预留但当前不使用。

**initPrefs 绑定：**
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

`darkForced`（boolean）存入 `schulte_settings` localStorage，key 为 `darkForced`。

## 不影响的功能

- 颜色干扰模式（`randomCellColor`）已通过 `window.matchMedia` 检测深浅模式，`theme-dark` class 不影响该 API，颜色生成逻辑不变（可接受的轻微不一致）
- 分区辅助 zone 颜色通过 CSS 变量定义，`body.theme-dark` 规则内同步覆盖 zone 颜色即可
