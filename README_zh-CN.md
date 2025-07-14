# idle-resource-loader

[English](./README.md) | 中文文档

一个轻量级的资源预加载 SDK，智能利用浏览器空闲时间进行资源加载，用户体验优先，高性能设计。

## 特性

- **🎯 统一 API**：单一 `loadResources` 函数，通过策略选择加载方式
- **⚡ 智能并发**：智能批处理（默认1个，最大2个），顺序批次处理避免网络拥塞
- **🔄 空闲时间利用**：使用 `requestIdleCallback` 实现非阻塞后台加载
- **🛡️ 资源类型检测**：基于文件扩展名自动选择最优加载器
- **💾 内存优化**：基于 AbortController 的超时处理，防止内存泄漏
- **🚀 轻量高效**：仅 2.7KB gzipped，零依赖
- **📦 ES 模块就绪**：完全支持现代构建工具（Vite、Webpack 等）
- **🔧 TypeScript**：完整类型定义和智能提示
- **🌐 跨浏览器**：旧浏览器优雅降级

## 安装

```bash
npm install idle-resource-loader
```

## 快速开始

```typescript
import { loadResources } from 'idle-resource-loader'

// 🚀 立即加载（默认）- 关键资源
loadResources('https://example.com/hero-image.jpg')

// 🔄 空闲加载 - 非关键资源
loadResources('https://example.com/background-video.mp4', {
  strategy: 'idle',
})

// 📦 批量加载，智能并发控制
loadResources(['image1.jpg', 'image2.png', 'image3.webp'], {
  batchSize: 5, // 请求5个，自动限制为2个以获得最佳性能
  timeout: 10000,
  onError: (url, error) => console.warn(`加载失败: ${url}`),
})
```

## 工作原理

### 加载策略

**立即加载（默认）**

- 以顺序批次处理资源，避免网络拥塞
- 每批最多并发处理2个资源（优先保证页面初始化资源）
- 等待当前批次完成后再开始下一批次
- 适用于需要立即使用的关键资源

**空闲加载**

- 使用 `requestIdleCallback` 在浏览器空闲时处理资源
- 每次空闲回调处理一个资源，避免阻塞主线程
- 页面隐藏时自动暂停（Page Visibility API）
- 当 `requestIdleCallback` 不可用时降级到 `setTimeout`
- 适用于可以在后台加载的非关键资源

### 资源类型检测

SDK 基于文件扩展名自动选择最优加载器：

- **图片**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` → 使用 `Image` 构造函数
- **音频**: `.mp3`, `.wav`, `.ogg` → 使用 `Audio` 构造函数
- **视频**: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv` → 使用 `<video>` 元素
- **字体**: `.woff`, `.woff2`, `.ttf` → 使用 `<link>` 元素，`rel="preload"`
- **其他**: 所有其他文件类型 → 使用 `fetch` API，`no-cors` 模式

## API 参考

### `loadResources(resources, options?)`

#### 参数

- **`resources`**: `string | string[]`
  - 单个 URL 字符串或 URL 字符串数组
  - **支持格式**: HTTP/HTTPS URL、相对路径、协议相对URL
  - **安全机制**: 危险协议（javascript:、data:、file: 等）会被自动过滤
- **`options`**: `LoadResourcesOptions`（可选）
  - `strategy`: `'immediate' | 'idle'` - 加载策略（默认：`'immediate'`）
  - `batchSize`: `number` - 每批资源数量（默认：`1`，最大：`2`）
  - `timeout`: `number` - 超时时间，毫秒（默认：`15000`）
  - `onError`: `(url: string, error: Error) => void` - 错误回调

#### 示例

```typescript
// 未来资源预加载（推荐）
loadResources(['/next-page/hero-image.jpg', '/modal/success-icon.svg'], { strategy: 'idle' })

// 支持的URL格式
loadResources([
  'https://cdn.example.com/image.jpg', // 绝对HTTPS URL
  'http://example.com/image.jpg', // 绝对HTTP URL
  '/assets/image.jpg', // 根相对路径
  'assets/image.jpg', // 相对路径
  '//cdn.example.com/image.jpg', // 协议相对URL
])

// 错误处理
loadResources(['/assets/image1.jpg', '/assets/image2.jpg'], {
  strategy: 'idle',
  onError: (url, error) => {
    console.error(`加载失败 ${url}:`, error.message)
  },
})

// 大量资源列表的顺序批次处理
const resources = Array.from({ length: 100 }, (_, i) => `/assets/image-${i}.jpg`)
loadResources(resources, {
  strategy: 'idle',
  batchSize: 2, // 每批处理2个资源，然后等待完成
})
```

## 浏览器兼容性

| 功能                  | 必需性  | 降级方案     |
| --------------------- | ------- | ------------ |
| `fetch`               | ✅ 必需 | 无           |
| `requestIdleCallback` | ⚡ 可选 | `setTimeout` |
| `AbortController`     | ⚡ 可选 | 简单超时     |

**Polyfill 策略**：SDK 将 polyfill 处理委托给构建工具（Webpack、Vite 等）和 polyfill 库（core-js 等），以获得最大灵活性。

## 工作原理

### 立即加载策略

- **智能并发**：默认2个并发请求，最大3个以尊重浏览器限制
- **批处理**：大数组以最优块进行处理
- **超时保护**：AbortController 防止请求挂起

### 空闲加载策略

- **动态时间切片**：根据可用时间每次空闲回调处理1个资源
- **页面可见性**：页面隐藏时自动暂停
- **时间管理**：为其他任务保留12ms，防止主线程阻塞

### 支持的资源类型

| 类型 | 扩展名                                     | 加载器          |
| ---- | ------------------------------------------ | --------------- |
| 图片 | `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg` | `<img>` 元素    |
| 音频 | `mp3`, `wav`, `ogg`                        | `<audio>` 元素  |
| 视频 | `mp4`, `webm`, `mov`, `avi`, `mkv`, `flv`  | `<video>` 元素  |
| 字体 | `woff`, `woff2`, `ttf`                     | `<link>` 预加载 |
| 其他 | 任何扩展名                                 | `fetch()` API   |

## ⚠️ 重要使用指南

### ✅ 推荐用法

```typescript
// ✅ 预加载未来/下一页资源
loadResources(
  ['/next-page/hero-image.jpg', '/modal/success-icon.svg', '/future-section/background.webp'],
  { strategy: 'idle' },
)

// ✅ 从 API/配置预加载资源
const futureAssets = await fetch('/api/next-page-assets').then((r) => r.json())
loadResources(futureAssets, { strategy: 'idle' })

// ✅ 关键资源的立即加载
loadResources(['/hero-banner.jpg', '/critical-font.woff2'], { strategy: 'immediate' })
```

### ❌ 避免的用法

```typescript
// ❌ 不要：静态导入会导致 bundle 膨胀
import logo from '@/assets/logo.png'
import img1 from '@/assets/img1.jpg'
import img2 from '@/assets/img2.jpg'
loadResources([logo, img1, img2])  // 会让 bundle 增加数 MB！

// ❌ 不要：预加载当前组件资源
function MyComponent() {
  return <img src="/current-logo.png" />  // 浏览器已经会请求这个
}
loadResources(['/current-logo.png'])  // 多余且浪费

// ❌ 不要：危险的URL（会被自动过滤以确保安全）
loadResources([
  'javascript:alert("xss")',           // XSS风险
  'data:text/html,<script>',          // 数据URL风险
  'file:///etc/passwd',               // 本地文件访问
  'ftp://example.com/file'            // 不支持的协议
])
```

### 💡 为什么要遵循这些指南

- **静态导入**会将所有资源添加到主 bundle 中，增加初始加载时间
- **当前组件资源**在渲染时浏览器已经会请求
- **未来资源**最能从空闲时间预加载中受益
- **顺序批次处理**防止网络拥塞并遵循浏览器限制

## 最佳实践

1. **对关键资源使用立即加载** - 立即需要的资源
2. **对未来资源使用空闲加载** - 可能稍后需要的资源
3. **信任顺序批处理** - SDK 顺序处理批次以避免网络拥塞
4. **优雅处理错误** - 使用 `onError` 回调
5. **只使用 URL 字符串** - 避免静态导入防止 bundle 膨胀
6. **利用自动资源类型检测** - SDK 基于文件扩展名选择最优加载器

## 性能

- **包大小**：2.7KB gzipped（9.2KB 未压缩）
- **内存使用**：最小化，自动清理和基于 AbortController 的超时处理
- **网络影响**：顺序批次处理遵循浏览器连接限制（最大2个并发）
- **主线程**：空闲策略使用 `requestIdleCallback` 实现非阻塞
- **资源加载**：针对每种资源类型优化的自动加载器选择

## TypeScript

完整的 TypeScript 支持和智能 IntelliSense：

```typescript
import { loadResources, type LoadResourcesOptions } from 'idle-resource-loader'

const options: LoadResourcesOptions = {
  strategy: 'idle',
  batchSize: 2,
  timeout: 10000,
  onError: (url: string, error: Error) => {
    // 类型安全的错误处理
  },
}
```

## 许可证

MIT © [crper](https://github.com/crper)
