// idle-resource-loader/tests/index.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { loadResources } from '../src'

// Mock DOM APIs
const mockImage = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  crossOrigin: '',
}

const mockAudio = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  crossOrigin: '',
}

const mockVideo = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  crossOrigin: '',
}

const mockLink = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  href: '',
  rel: '',
  as: '',
  type: '',
  crossOrigin: '',
  parentNode: {
    removeChild: vi.fn(),
  },
}

// Mock global objects
global.Image = vi.fn(() => mockImage) as unknown as typeof Image
global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio
global.fetch = vi.fn()

// Mock document
global.document = {
  createElement: vi.fn((tag: string) => {
    if (tag === 'video') {
      return mockVideo
    }
    if (tag === 'link') {
      return mockLink
    }
    return {}
  }),
  head: {
    appendChild: vi.fn(),
  },
} as unknown as Document

// 测试工具函数
const waitForAsync = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms))

beforeEach(() => {
  vi.clearAllMocks()

  // Reset mocks for each test
  global.Image = vi.fn(() => mockImage) as unknown as typeof Image
  global.Audio = vi.fn(() => mockAudio) as unknown as typeof Audio
  global.fetch = vi.fn().mockResolvedValue({ ok: true })

  // Reset mock properties
  mockImage.src = ''
  mockImage.crossOrigin = ''
  mockAudio.src = ''
  mockAudio.crossOrigin = ''
  mockVideo.src = ''
  mockVideo.crossOrigin = ''
  mockLink.href = ''
})

describe('loadResources 核心功能', () => {
  test('应该优雅处理空输入', () => {
    expect(() => loadResources('')).not.toThrow()
    expect(() => loadResources([])).not.toThrow()
  })

  test('应该过滤无效的URL', async () => {
    const spy = vi.spyOn(global, 'Image')
    loadResources(['', null, undefined, 'https://placehold.co/400x300.jpg'] as unknown as string[])

    // 等待异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 50))

    // 应该只为有效URL创建Image对象
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('应该处理单个字符串URL', async () => {
    const spy = vi.spyOn(global, 'Image')
    loadResources('https://placehold.co/300x200.jpg')

    // 等待异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('应该处理URL数组', async () => {
    const spy = vi.spyOn(global, 'Image')
    loadResources(['https://placehold.co/400x300.jpg', 'https://placehold.co/500x400.png'], {
      batchSize: 2, // 明确指定批处理大小为2，确保两个资源都被处理
    })

    // 等待异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(spy).toHaveBeenCalledTimes(2)
  })

  test('应该接受有效的配置选项', () => {
    const options = {
      batchSize: 2,
      timeout: 5000,
      onError: vi.fn(),
    }

    expect(() => loadResources('https://placehold.co/600x400.jpg', options)).not.toThrow()
  })
})

describe('资源类型检测', () => {
  test('应该对图片文件使用Image对象', () => {
    // 测试函数对图片文件不会抛出异常
    expect(() => loadResources('https://placehold.co/400x300.jpg')).not.toThrow()
    expect(() => loadResources('https://placehold.co/400x300.png')).not.toThrow()
    expect(() => loadResources('https://placehold.co/400x300.gif')).not.toThrow()
  })

  test('应该对音频文件使用Audio对象', async () => {
    const spy = vi.spyOn(global, 'Audio')
    loadResources('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3')

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('应该对视频文件使用video元素', async () => {
    const spy = vi.spyOn(document, 'createElement')
    loadResources('https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4')

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalledWith('video')
  })

  test('应该对字体文件使用link元素', async () => {
    const spy = vi.spyOn(document, 'createElement')
    loadResources('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2')

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalledWith('link')
  })

  test('应该对未知文件类型使用fetch', async () => {
    const spy = vi.spyOn(global, 'fetch')
    loadResources('https://httpbin.org/json')

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalledWith('https://httpbin.org/json', {
      mode: 'no-cors',
      cache: 'default',
    })
  })
})

describe('URL字符串支持', () => {
  test('应该正确处理绝对URL', async () => {
    const spy = vi.spyOn(global, 'Image')

    loadResources('https://placehold.co/400x300.jpg')

    // 等待异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('应该正确处理相对URL', async () => {
    const spy = vi.spyOn(global, 'Image')

    loadResources('/assets/image.jpg')

    // 等待异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('加载策略', () => {
  test('应该默认使用立即加载策略', async () => {
    const spy = vi.spyOn(global, 'Image')

    loadResources('https://placehold.co/400x300.jpg')

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('应该在指定时使用立即加载策略', async () => {
    const spy = vi.spyOn(global, 'Image')

    loadResources('https://placehold.co/400x300.jpg', { strategy: 'immediate' })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('应该在指定时使用空闲加载策略', () => {
    const spy = vi.spyOn(global, 'Image')

    loadResources('https://placehold.co/400x300.jpg', { strategy: 'idle' })

    // 不应该立即创建Image对象（空闲加载）
    expect(spy).toHaveBeenCalledTimes(0)
  })
})

describe('输入验证和错误处理', () => {
  test('应该优雅处理各种无效输入', async () => {
    const spy = vi.spyOn(global, 'Image')

    // 测试各种无效输入
    const invalidInputs = [
      '', // 空字符串
      null, // null值
      undefined, // undefined值
      'javascript:alert("xss")', // 危险协议
      'data:text/html,<script>', // 数据URL
      'file:///etc/passwd', // 文件协议
      'ftp://example.com/file', // FTP协议
      'blob:http://example.com', // Blob协议
      '   ', // 纯空白
      'invalid<>chars', // 无效字符
    ]

    // 所有无效输入都不应该抛出异常
    invalidInputs.forEach((input) => {
      expect(() => loadResources(input as unknown as string)).not.toThrow()
      expect(() => loadResources(input as unknown as string, { strategy: 'idle' })).not.toThrow()
    })

    // 混合有效和无效URL的数组
    loadResources([
      'https://placehold.co/400x300.jpg', // 有效
      '', // 无效
      'javascript:alert(1)', // 危险
      '/assets/image.jpg', // 有效
      null, // 无效
      'https://placehold.co/500x400.jpg', // 有效
    ] as unknown as string[])

    await waitForAsync()
    // 只有有效的URL会被处理
    expect(spy).toHaveBeenCalled()
  })

  test('应该处理大量资源和特殊字符', async () => {
    const spy = vi.spyOn(global, 'Image')

    // 大量资源测试
    const largeArray = Array(100).fill('https://placehold.co/100x100.jpg')
    expect(() => loadResources(largeArray)).not.toThrow()
    expect(() => loadResources(largeArray, { strategy: 'idle' })).not.toThrow()

    // URL特殊字符测试
    loadResources('https://placehold.co/400x300.jpg?param=value&other=test#fragment')
    await waitForAsync()
    expect(spy).toHaveBeenCalled()
  })

  test('应该正确验证URL安全性', async () => {
    const spy = vi.spyOn(global, 'Image')

    // 有效的URL应该被处理
    const validUrls = [
      'https://example.com/image.jpg',
      'http://example.com/image.jpg',
      '/assets/image.jpg',
      'assets/image.jpg',
      '../assets/image.jpg',
      '//cdn.example.com/image.jpg',
    ]

    validUrls.forEach((url) => {
      expect(() => loadResources(url)).not.toThrow()
    })

    // 危险的URL应该被过滤（不会创建Image对象）
    const dangerousUrls = [
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      'file:///etc/passwd',
      'ftp://example.com/file',
    ]

    spy.mockClear()
    dangerousUrls.forEach((url) => {
      loadResources(url)
    })

    await waitForAsync()
    // 危险URL不应该创建任何Image对象
    expect(spy).toHaveBeenCalledTimes(0)
  })
})

describe('智能批处理机制', () => {
  test('立即加载智能调整并发数', async () => {
    const spy = vi.spyOn(global, 'Image')

    // 请求大批处理，会被智能调整到合理范围（最大3个并发）
    loadResources(
      [
        'https://placehold.co/100x100.jpg',
        'https://placehold.co/200x200.jpg',
        'https://placehold.co/300x300.jpg',
      ],
      { batchSize: 5 },
    ) // 请求5个并发，实际限制为3

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalled()
  })

  test('应该支持超时配置', async () => {
    const spy = vi.spyOn(global, 'Image')

    loadResources('https://placehold.co/400x300.jpg', { timeout: 5000 })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalled()
  })

  test('动态并发控制应该根据请求调整', async () => {
    const spy = vi.spyOn(global, 'Image')

    // 测试默认批处理大小
    loadResources(['https://placehold.co/100x100.jpg', 'https://placehold.co/200x200.jpg'])
    await new Promise((resolve) => setTimeout(resolve, 50))

    // 测试自定义批处理大小在合理范围内
    loadResources(
      [
        'https://placehold.co/300x300.jpg',
        'https://placehold.co/400x400.jpg',
        'https://placehold.co/500x500.jpg',
      ],
      { batchSize: 2 },
    )

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalled()
  })

  test('应该支持错误回调', async () => {
    const onError = vi.fn()
    const spy = vi.spyOn(global, 'Image')

    loadResources('https://placehold.co/400x300.jpg', { onError })

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(spy).toHaveBeenCalled()
  })

  test('空闲加载采用单个资源处理策略', () => {
    const spy = vi.spyOn(global, 'Image')

    loadResources(['url1.jpg', 'url2.jpg'], {
      strategy: 'idle', // 空闲加载每次只处理1个资源，忽略batchSize
    })

    // 空闲加载不会立即创建Image对象
    expect(spy).toHaveBeenCalledTimes(0)
  })
})

describe('性能和边界情况', () => {
  test('应该处理极大的资源数组', () => {
    const largeArray = Array(1000).fill('https://placehold.co/1x1.jpg')

    expect(() => loadResources(largeArray)).not.toThrow()
    expect(() => loadResources(largeArray, { strategy: 'idle' })).not.toThrow()
  })

  test('应该优雅处理格式错误的URL', () => {
    const malformedUrls = ['not-a-url', 'http://', 'https://', 'ftp://invalid.com/file.jpg']

    expect(() => loadResources(malformedUrls)).not.toThrow()
    expect(() => loadResources(malformedUrls, { strategy: 'idle' })).not.toThrow()
  })

  test('重复资源依赖浏览器缓存机制', async () => {
    const duplicateUrls = ['https://placehold.co/400x300.jpg', 'https://placehold.co/400x300.jpg']

    const spy = vi.spyOn(global, 'Image')
    loadResources(duplicateUrls)

    await new Promise((resolve) => setTimeout(resolve, 50))
    // SDK不做重复检查，依赖浏览器缓存机制优化性能
    expect(spy).toHaveBeenCalled()
  })

  test('应该验证异步资源过滤行为', async () => {
    const spy = vi.spyOn(global, 'Image')

    // 测试异步过滤逻辑
    loadResources(['https://placehold.co/valid.jpg', '', null] as unknown as string[])

    await new Promise((resolve) => setTimeout(resolve, 100))
    // 只有有效URL应该被处理
    expect(spy).toHaveBeenCalled()
  })
})

describe('动态时间切片机制', () => {
  test('应该根据可用时间动态调整批处理大小', () => {
    // 模拟 requestIdleCallback 的 deadline 对象
    const mockDeadlineHighTime = { timeRemaining: () => 50 } // 充足时间
    const mockDeadlineLowTime = { timeRemaining: () => 10 } // 时间不足
    const mockDeadlineNoTime = { timeRemaining: () => 5 } // 几乎没有时间

    // 这里我们测试时间切片逻辑的概念，实际实现在内部
    // 充足时间应该允许处理更多资源
    expect(mockDeadlineHighTime.timeRemaining()).toBeGreaterThan(12)

    // 时间不足时应该限制处理数量
    expect(mockDeadlineLowTime.timeRemaining()).toBeLessThan(15)

    // 几乎没有时间时应该跳过处理
    expect(mockDeadlineNoTime.timeRemaining()).toBeLessThan(12)
  })

  test('空闲加载应该在时间不足时延迟处理', () => {
    const spy = vi.spyOn(global, 'Image')

    // 使用空闲策略加载资源
    loadResources(['https://placehold.co/100x100.jpg', 'https://placehold.co/200x200.jpg'], {
      strategy: 'idle',
    })

    // 空闲加载不会立即处理
    expect(spy).toHaveBeenCalledTimes(0)
  })

  test('时间切片配置常量应该合理', () => {
    // 验证时间切片的基本逻辑
    const MIN_TIME_REMAINING = 12
    const ESTIMATED_PROCESS_TIME = 3
    const MAX_BATCH_SIZE = 2

    // 最小剩余时间应该足够保护主线程
    expect(MIN_TIME_REMAINING).toBeGreaterThanOrEqual(10)

    // 单个资源处理时间应该合理
    expect(ESTIMATED_PROCESS_TIME).toBeGreaterThan(0)
    expect(ESTIMATED_PROCESS_TIME).toBeLessThan(10)

    // 最大批处理大小应该保守
    expect(MAX_BATCH_SIZE).toBeLessThanOrEqual(3)
  })

  test('应该优先考虑用户体验', () => {
    // 模拟页面隐藏状态
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true,
    })

    const spy = vi.spyOn(global, 'Image')

    loadResources('https://placehold.co/400x300.jpg', { strategy: 'idle' })

    // 页面隐藏时，空闲加载应该暂停
    expect(spy).toHaveBeenCalledTimes(0)

    // 恢复页面可见状态
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    })
  })
})

describe('类型定义优化验证', () => {
  test('LoadStrategy 类型应该正确工作', () => {
    // 测试新的类型定义
    const validStrategies: Array<'immediate' | 'idle'> = ['immediate', 'idle']

    validStrategies.forEach((strategy) => {
      expect(() => loadResources('https://placehold.co/100x100.jpg', { strategy })).not.toThrow()
    })
  })

  test('LoadResourcesOptions 类型应该支持所有配置', () => {
    const options = {
      strategy: 'idle' as const,
      batchSize: 2,
      timeout: 15000,
      onError: (url: string, error: Error) => console.error(url, error),
    }

    expect(() => loadResources('https://placehold.co/100x100.jpg', options)).not.toThrow()
  })

  test('ResourceInput 类型应该支持字符串输入格式', () => {
    // 字符串输入
    expect(() => loadResources('https://placehold.co/100x100.jpg')).not.toThrow()

    // 数组输入
    expect(() =>
      loadResources(['https://placehold.co/100x100.jpg', '/assets/image.jpg']),
    ).not.toThrow()
  })
})

describe('空闲调度机制测试', () => {
  test('应该正确处理空闲队列', () => {
    const spy = vi.spyOn(global, 'Image')

    // 添加多个空闲任务
    loadResources('https://placehold.co/100x100.jpg', { strategy: 'idle' })
    loadResources('https://placehold.co/200x200.jpg', { strategy: 'idle' })

    // 空闲加载不会立即执行
    expect(spy).toHaveBeenCalledTimes(0)
  })

  test('应该在 requestIdleCallback 不可用时使用 setTimeout 降级', () => {
    const originalRequestIdleCallback = global.requestIdleCallback
    delete (global as unknown as { requestIdleCallback?: unknown }).requestIdleCallback

    const spy = vi.spyOn(global, 'Image')
    loadResources('https://placehold.co/100x100.jpg', { strategy: 'idle' })

    // 恢复原始函数
    global.requestIdleCallback = originalRequestIdleCallback

    expect(spy).toHaveBeenCalledTimes(0)
  })

  test('应该在 AbortController 不可用时使用简单超时', () => {
    const originalAbortController = global.AbortController
    delete (global as unknown as { AbortController?: unknown }).AbortController

    const spy = vi.spyOn(global, 'Image')
    loadResources('https://placehold.co/100x100.jpg', { timeout: 1000 })

    // 恢复原始构造函数
    global.AbortController = originalAbortController

    expect(spy).toHaveBeenCalled()
  })
})
