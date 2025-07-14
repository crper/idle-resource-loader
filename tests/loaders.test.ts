// idle-resource-loader/tests/loaders.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { loadByType } from '../src/loaders'

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
global.fetch = vi.fn().mockResolvedValue({} as Response)

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

beforeEach(() => {
  vi.clearAllMocks()

  // Reset mock properties
  mockImage.src = ''
  mockImage.crossOrigin = ''
  mockAudio.src = ''
  mockAudio.crossOrigin = ''
  mockVideo.src = ''
  mockVideo.crossOrigin = ''
  mockLink.href = ''
})

describe('按类型加载', () => {
  test('应该根据文件扩展名路由到正确的加载器', () => {
    const imageSpy = vi.spyOn(global, 'Image')
    const audioSpy = vi.spyOn(global, 'Audio')
    const fetchSpy = vi.spyOn(global, 'fetch')

    // 测试图片路由
    loadByType('test.jpg')
    expect(imageSpy).toHaveBeenCalled()

    // 测试音频路由
    loadByType('test.mp3')
    expect(audioSpy).toHaveBeenCalled()

    // 测试通用路由
    loadByType('test.json')
    expect(fetchSpy).toHaveBeenCalled()
  })
})

describe('loadByType 核心功能', () => {
  test('应该正确加载图片类型', async () => {
    const imageSpy = vi.spyOn(global, 'Image')

    // 模拟成功加载
    mockImage.addEventListener.mockImplementation((event, callback) => {
      if (event === 'load') {
        setTimeout(callback, 0)
      }
    })

    await loadByType('test.jpg')

    expect(imageSpy).toHaveBeenCalled()
    expect(mockImage.src).toBe('test.jpg')
  })

  test('应该正确加载通用资源类型', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    fetchSpy.mockResolvedValue({} as Response)

    await loadByType('test.json')

    expect(fetchSpy).toHaveBeenCalledWith('test.json', {
      mode: 'no-cors',
      cache: 'default',
    })
  })

  test('应该返回 Promise', () => {
    const result = loadByType('test.json')
    expect(result).toBeInstanceOf(Promise)
  })

  test('应该处理加载错误', async () => {
    // Mock fetch to reject
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    try {
      await loadByType('test.json')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('Failed to load resource')
    }
  })
})
