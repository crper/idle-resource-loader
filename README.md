# idle-resource-loader

[中文文档](./README_zh-CN.md) | English

A lightweight resource preloading SDK that intelligently utilizes browser idle time for optimal performance without blocking the main thread.

## Features

- **🎯 Unified API**: Single `loadResources` function with strategy-based loading
- **⚡ Smart Concurrency**: Intelligent batching (default 1, max 2) with sequential batch processing
- **🔄 Idle Time Utilization**: Uses `requestIdleCallback` for non-blocking background loading
- **🛡️ Resource Type Detection**: Automatic loader selection based on file extensions
- **💾 Memory Optimized**: AbortController-based timeout handling prevents leaks
- **🚀 Lightweight**: Only 2.7KB gzipped, zero dependencies
- **📦 ES Module Ready**: Full support for modern build tools (Vite, Webpack, etc.)
- **🔧 TypeScript**: Complete type definitions and intelligent hints
- **🌐 Cross-Browser**: Graceful degradation for older browsers

## Installation

```bash
npm install idle-resource-loader
```

## Quick Start

```typescript
import { loadResources } from 'idle-resource-loader'

// 🚀 Immediate loading (default) - for critical resources
loadResources('https://example.com/hero-image.jpg')

// 🔄 Idle loading - for non-critical resources
loadResources('https://example.com/background-video.mp4', {
  strategy: 'idle',
})

// 📦 Batch loading with smart concurrency control
loadResources(['image1.jpg', 'image2.png', 'image3.webp'], {
  batchSize: 5, // Requests 5, automatically limited to 2 for optimal performance
  timeout: 10000,
  onError: (url, error) => console.warn(`Failed to load: ${url}`),
})
```

## How It Works

### Loading Strategies

**Immediate Loading (default)**

- Processes resources in sequential batches to avoid network congestion
- Each batch processes up to 2 resources concurrently (prioritizes page initialization resources)
- Waits for current batch to complete before starting the next batch
- Best for critical resources needed right away

**Idle Loading**

- Uses `requestIdleCallback` to process resources during browser idle time
- Processes one resource per idle callback to avoid blocking the main thread
- Automatically pauses when page becomes hidden (Page Visibility API)
- Falls back to `setTimeout` when `requestIdleCallback` is unavailable
- Best for non-critical resources that can be loaded in background

### Resource Type Detection

The SDK automatically selects the optimal loader based on file extensions:

- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` → Uses `Image` constructor
- **Audio**: `.mp3`, `.wav`, `.ogg` → Uses `Audio` constructor
- **Video**: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv` → Uses `<video>` element
- **Fonts**: `.woff`, `.woff2`, `.ttf` → Uses `<link>` element with `rel="preload"`
- **Other**: All other file types → Uses `fetch` API with `no-cors` mode

## API Reference

### `loadResources(resources, options?)`

#### Parameters

- **`resources`**: `string | string[]`
  - Single URL string or array of URL strings
  - **Supported formats**: HTTP/HTTPS URLs, relative paths, protocol-relative URLs
  - **Security**: Dangerous protocols (javascript:, data:, file:, etc.) are automatically filtered
- **`options`**: `LoadResourcesOptions` (optional)
  - `strategy`: `'immediate' | 'idle'` - Loading strategy (default: `'immediate'`)
  - `batchSize`: `number` - Resources per batch (default: `1`, max: `2`)
  - `timeout`: `number` - Timeout in milliseconds (default: `15000`)
  - `onError`: `(url: string, error: Error) => void` - Error callback

#### Examples

```typescript
// Future resources preloading (recommended)
loadResources(['/next-page/hero-image.jpg', '/modal/success-icon.svg'], { strategy: 'idle' })

// Supported URL formats
loadResources([
  'https://cdn.example.com/image.jpg', // Absolute HTTPS URL
  'http://example.com/image.jpg', // Absolute HTTP URL
  '/assets/image.jpg', // Root-relative path
  'assets/image.jpg', // Relative path
  '//cdn.example.com/image.jpg', // Protocol-relative URL
])

// Error handling
loadResources(['/assets/image1.jpg', '/assets/image2.jpg'], {
  strategy: 'idle',
  onError: (url, error) => {
    console.error(`Failed to load ${url}:`, error.message)
  },
})

// Large resource lists with sequential batch processing
const resources = Array.from({ length: 100 }, (_, i) => `/assets/image-${i}.jpg`)
loadResources(resources, {
  strategy: 'idle',
  batchSize: 2, // Process 2 resources per batch, then wait for completion
})
```

## Browser Compatibility

| Feature               | Required    | Fallback       |
| --------------------- | ----------- | -------------- |
| `fetch`               | ✅ Required | None           |
| `requestIdleCallback` | ⚡ Optional | `setTimeout`   |
| `AbortController`     | ⚡ Optional | Simple timeout |

**Polyfill Strategy**: The SDK delegates polyfill handling to your build tools (Webpack, Vite, etc.) and polyfill libraries (core-js, etc.) for maximum flexibility.

## How It Works

### Immediate Loading Strategy

- **Smart Concurrency**: Default 2 concurrent requests, max 3 to respect browser limits
- **Batch Processing**: Large arrays are processed in optimal chunks
- **Timeout Protection**: AbortController prevents hanging requests

### Idle Loading Strategy

- **Dynamic Time Slicing**: Processes 1 resource per idle callback based on available time
- **Page Visibility**: Automatically pauses when page is hidden
- **Time Management**: Reserves 12ms for other tasks to prevent main thread blocking

### Supported Resource Types

| Type   | Extensions                                 | Loader            |
| ------ | ------------------------------------------ | ----------------- |
| Images | `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg` | `<img>` element   |
| Audio  | `mp3`, `wav`, `ogg`                        | `<audio>` element |
| Video  | `mp4`, `webm`, `mov`, `avi`, `mkv`, `flv`  | `<video>` element |
| Fonts  | `woff`, `woff2`, `ttf`                     | `<link>` preload  |
| Others | Any extension                              | `fetch()` API     |

## ⚠️ Important Usage Guidelines

### ✅ DO - Recommended Use Cases

```typescript
// ✅ Preload future/next-page resources
loadResources(
  ['/next-page/hero-image.jpg', '/modal/success-icon.svg', '/future-section/background.webp'],
  { strategy: 'idle' },
)

// ✅ Preload resources from API/config
const futureAssets = await fetch('/api/next-page-assets').then((r) => r.json())
loadResources(futureAssets, { strategy: 'idle' })

// ✅ Critical resources with immediate loading
loadResources(['/hero-banner.jpg', '/critical-font.woff2'], { strategy: 'immediate' })
```

### ❌ DON'T - Avoid These Patterns

```typescript
// ❌ DON'T: Static imports cause bundle bloat
import logo from '@/assets/logo.png'
import img1 from '@/assets/img1.jpg'
import img2 from '@/assets/img2.jpg'
loadResources([logo, img1, img2])  // Increases bundle size by MBs!

// ❌ DON'T: Preload current component resources
function MyComponent() {
  return <img src="/current-logo.png" />  // Browser already requests this
}
loadResources(['/current-logo.png'])  // Redundant and wasteful

// ❌ DON'T: Dangerous URLs (automatically filtered for security)
loadResources([
  'javascript:alert("xss")',           // XSS risk
  'data:text/html,<script>',          // Data URL risk
  'file:///etc/passwd',               // Local file access
  'ftp://example.com/file'            // Unsupported protocol
])
```

### 💡 Why These Guidelines Matter

- **Static imports** add all assets to your main bundle, increasing initial load time
- **Current component resources** are already requested by the browser during rendering
- **Future resources** benefit most from idle-time preloading
- **Sequential batch processing** prevents network congestion and respects browser limits

## Best Practices

1. **Use immediate loading for critical resources** that are needed right away
2. **Use idle loading for future resources** that might be needed later
3. **Trust the sequential batching** - SDK processes batches sequentially to avoid network congestion
4. **Handle errors gracefully** with the `onError` callback
5. **Use URL strings only** - avoid static imports to prevent bundle bloat
6. **Leverage automatic resource type detection** - the SDK chooses optimal loaders based on file extensions

## Performance

- **Bundle Size**: 2.7KB gzipped (9.2KB uncompressed)
- **Memory Usage**: Minimal, with automatic cleanup and AbortController-based timeout handling
- **Network Impact**: Sequential batch processing respects browser connection limits (max 2 concurrent)
- **Main Thread**: Non-blocking with `requestIdleCallback` for idle strategy
- **Resource Loading**: Automatic loader selection optimized for each resource type

## TypeScript

Full TypeScript support with intelligent IntelliSense:

```typescript
import { loadResources, type LoadResourcesOptions } from 'idle-resource-loader'

const options: LoadResourcesOptions = {
  strategy: 'idle',
  batchSize: 2,
  timeout: 10000,
  onError: (url: string, error: Error) => {
    // Type-safe error handling
  },
}
```

## License

MIT © [crper](https://github.com/crper)
