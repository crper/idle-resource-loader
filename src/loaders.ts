import type { CrossOriginElement, LoaderConfig, ResourceLoader } from './types'

/**
 * 获取文件扩展名
 */
function getFileExtension(url: string): string {
  const cleanUrl = url.split('?')[0] || ''
  const parts = cleanUrl.split('.')
  if (parts.length <= 1) {
    return ''
  }

  const extension = parts[parts.length - 1]
  return extension ? extension.toLowerCase() : ''
}

/**
 * 安全设置跨域属性
 */
function setCrossOrigin(element: CrossOriginElement): void {
  try {
    element.crossOrigin = 'anonymous'
  } catch {
    // 忽略设置失败的情况
  }
}

/**
 * 统一的资源加载器工厂函数
 * 消除重复的错误处理代码，提供一致的加载体验
 */
function createResourceLoader<T extends HTMLElement>(config: LoaderConfig<T>): ResourceLoader {
  return (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const element = config.createElement()

      // 如果元素支持跨域，则设置跨域属性
      if ('crossOrigin' in element) {
        setCrossOrigin(element as unknown as CrossOriginElement)
      }

      let isCleanedUp = false
      const cleanup = () => {
        if (isCleanedUp) {
          return
        }
        isCleanedUp = true

        element.removeEventListener(config.successEvent, onSuccess)
        element.removeEventListener(config.errorEvent, onError)

        // 调用自定义清理函数
        config.cleanup?.(element)
      }

      const onSuccess = () => {
        cleanup()
        resolve()
      }

      const onError = () => {
        cleanup()
        reject(new Error(`Failed to load ${element.tagName.toLowerCase()}: ${url}`))
      }

      element.addEventListener(config.successEvent, onSuccess, { once: true })
      element.addEventListener(config.errorEvent, onError, { once: true })

      // 执行元素特定的设置
      config.setup(element, url)
    })
  }
}

/**
 * 根据资源类型选择加载方式
 * 使用 Map 查找提供更好的可维护性
 */
export function loadByType(url: string): Promise<void> {
  const extension = getFileExtension(url)
  const loader = LOADER_MAP.get(extension)

  return loader ? loader(url) : loadGeneric(url)
}

/**
 * 图片预加载
 */
const loadImage: ResourceLoader = createResourceLoader({
  createElement: () => {
    if (typeof Image === 'undefined') {
      throw new Error('Image constructor not available in this environment')
    }
    return new Image()
  },
  successEvent: 'load',
  errorEvent: 'error',
  setup: (img, url) => {
    img.src = url
  },
})

/**
 * 音频预加载
 */
const loadAudio: ResourceLoader = createResourceLoader({
  createElement: () => {
    if (typeof Audio === 'undefined') {
      throw new Error('Audio constructor not available in this environment')
    }
    return new Audio()
  },
  successEvent: 'canplaythrough',
  errorEvent: 'error',
  setup: (audio, url) => {
    audio.src = url
  },
})

/**
 * 视频预加载
 */
const loadVideo: ResourceLoader = createResourceLoader({
  createElement: () => {
    if (typeof document === 'undefined') {
      throw new Error('document not available in this environment')
    }
    return document.createElement('video')
  },
  successEvent: 'loadedmetadata',
  errorEvent: 'error',
  setup: (video, url) => {
    video.src = url
  },
})

/**
 * 获取字体 MIME 类型
 */
function getFontType(url: string): string {
  const extension = getFileExtension(url)
  switch (extension) {
    case 'woff2':
      return 'font/woff2'
    case 'woff':
      return 'font/woff'
    case 'ttf':
      return 'font/ttf'
    default:
      return 'font/woff2' // 默认值
  }
}

/**
 * 字体预加载 - 使用统一的加载器工厂，包含特殊的清理逻辑
 */
const loadFont: ResourceLoader = createResourceLoader({
  createElement: () => {
    if (typeof document === 'undefined') {
      throw new Error('document not available in this environment')
    }
    return document.createElement('link')
  },
  successEvent: 'load',
  errorEvent: 'error',
  setup: (link, url) => {
    link.rel = 'preload'
    link.as = 'font'
    link.type = getFontType(url)
    link.href = url
    if (document.head) {
      document.head.appendChild(link)
    }
  },
  cleanup: (link) => {
    // 加载完成后移除 DOM 元素，避免内存泄漏
    if (link.parentNode) {
      link.parentNode.removeChild(link)
    }
  },
})

/**
 * 通用资源预加载 - 使用 fetch API
 */
const loadGeneric: ResourceLoader = async (url: string): Promise<void> => {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch not available in this environment')
  }

  try {
    await fetch(url, {
      mode: 'no-cors',
      cache: 'default',
    })
  } catch {
    throw new Error(`Failed to load resource: ${url}`)
  }
}

// 扩展名到加载器的映射表
const LOADER_MAP = new Map<string, ResourceLoader>([
  // 图片类型
  ['jpg', loadImage],
  ['jpeg', loadImage],
  ['png', loadImage],
  ['gif', loadImage],
  ['webp', loadImage],
  ['svg', loadImage],

  // 音频类型
  ['mp3', loadAudio],
  ['wav', loadAudio],
  ['ogg', loadAudio],

  // 视频类型
  ['mp4', loadVideo],
  ['webm', loadVideo],
  ['mov', loadVideo],
  ['avi', loadVideo],
  ['mkv', loadVideo],
  ['flv', loadVideo],

  // 字体类型
  ['woff', loadFont],
  ['woff2', loadFont],
  ['ttf', loadFont],
])
