import { loadByType } from './loaders'
import type { IdleDeadline, IdleTask, LoadOptions } from './types'

/**
 * 创建带超时的 AbortController
 * 依赖外部 polyfill 库提供 AbortController 支持
 */
function createTimeoutController(timeout: number): AbortController | null {
  // 如果 AbortController 不可用，返回 null
  if (typeof AbortController === 'undefined') {
    return null
  }

  const controller = new AbortController()
  setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }, timeout)
  return controller
}

/**
 * 获取 requestIdleCallback 函数
 * 依赖外部 polyfill 库提供兼容性支持
 */
function getRequestIdleCallback() {
  // 检查浏览器环境和 API 可用性
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback.bind(window)
  }

  // 如果 API 不可用，返回 null，让调用方处理
  return null
}

// ===== 简化的错误处理 =====
function handleError(
  error: Error,
  url: string,
  userCallback?: (url: string, error: Error) => void,
): void {
  console.warn(`Resource load failed: ${url}`, error)

  if (userCallback) {
    try {
      userCallback(url, error)
    } catch (callbackError) {
      console.warn('Error in user callback:', callbackError)
    }
  }
}

// ===== 简化的状态管理 =====
const idleQueue: IdleTask[] = []
let isIdleProcessing = false

/**
 * 获取最优的批处理大小 - 根据浏览器能力动态调整
 */
function getOptimalBatchSize(requestedSize: number): number {
  // 现代浏览器通常支持每个域名6个并发连接
  // 但为了优先保证页面初始化资源的网络带宽，我们使用更保守的策略
  // 宁可让预加载资源处理得慢一些，也不要与关键资源竞争网络连接
  const MAX_CONCURRENT = 2
  const DEFAULT_SIZE = 1

  // 如果用户明确指定了批处理大小，在合理范围内尊重用户选择
  if (requestedSize > 0) {
    return Math.min(requestedSize, MAX_CONCURRENT)
  }

  return DEFAULT_SIZE
}

export function addIdleTask(urls: string[], options: LoadOptions): void {
  idleQueue.push({ urls, options })
}

/**
 * 加载单个资源
 */
async function loadSingleAsset(url: string, timeout: number, options: LoadOptions): Promise<void> {
  const controller = createTimeoutController(timeout)

  try {
    // 创建一个可以被中断的 Promise
    const loadPromise = loadByType(url)

    if (controller) {
      // 如果 AbortController 可用，使用它来处理超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Timeout: ${url}`))
        })
      })

      await Promise.race([loadPromise, timeoutPromise])
    } else {
      // 如果 AbortController 不可用，使用简单的超时机制
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: ${url}`)), timeout)
      })

      await Promise.race([loadPromise, timeoutPromise])
    }

    // 加载成功，浏览器已缓存资源
  } catch (error) {
    const loadError = error as Error
    handleError(loadError, url, options.onError)
    throw loadError
  }
}

/**
 * 智能批量加载 - 考虑浏览器连接限制和用户体验
 */
export async function loadAssetsBatch(urls: string[], options: LoadOptions): Promise<void> {
  const {
    batchSize = 1, // 默认1个并发，优先保证页面初始化资源的网络带宽
    timeout = 15000,
  } = options

  // 智能批处理：根据浏览器能力动态调整并发数
  const optimalBatchSize = getOptimalBatchSize(batchSize)

  // 分批并发加载，避免网络拥塞
  for (let i = 0; i < urls.length; i += optimalBatchSize) {
    const batch = urls.slice(i, i + optimalBatchSize)
    const promises = batch.map((url) => loadSingleAsset(url, timeout, options))

    // 等待当前批次完成再处理下一批
    // 这样可以避免同时发起过多请求
    await Promise.allSettled(promises)
  }
}

// ===== 空闲调度器 =====

/**
 * 调度空闲工作
 */
export function scheduleIdleWork(): void {
  if (isIdleProcessing || idleQueue.length === 0) {
    return
  }

  isIdleProcessing = true
  const requestIdleCallback = getRequestIdleCallback()

  if (requestIdleCallback) {
    // 使用 requestIdleCallback API
    requestIdleCallback((deadline) => {
      try {
        processIdleQueue(deadline)
      } catch (error) {
        console.warn('Idle processing failed:', error)
        isIdleProcessing = false
      }
    })
  } else {
    // 如果 requestIdleCallback 不可用，使用 setTimeout 作为降级
    setTimeout(() => {
      try {
        // 创建一个简单的 deadline 对象
        const deadline = {
          timeRemaining: () => 5, // 简单的固定值，表示有少量时间可用
        }
        processIdleQueue(deadline)
      } catch (error) {
        console.warn('Idle processing failed:', error)
        isIdleProcessing = false
      }
    }, 50)
  }
}

/**
 * 检查是否应该暂停空闲加载（用户体验优先）
 */
function shouldPauseIdleLoading(): boolean {
  // 页面不可见时暂停（用户切换了标签页）
  if (typeof document !== 'undefined' && document.hidden) {
    return true
  }

  return false
}

/**
 * 时间切片配置常量
 */
const TIME_SLICE_CONFIG = {
  /** 保守的最小剩余时间 - 为其他任务保留足够时间 */
  MIN_TIME_REMAINING: 12,
  /** 单个资源处理的预估时间 */
  ESTIMATED_PROCESS_TIME: 3,
  /** 最大批处理数量 - 防止过度处理 */
  MAX_BATCH_SIZE: 2,
} as const

/**
 * 计算当前空闲时间片可以处理的资源数量
 */
function calculateOptimalBatchSize(timeRemaining: number): number {
  const { MIN_TIME_REMAINING, ESTIMATED_PROCESS_TIME, MAX_BATCH_SIZE } = TIME_SLICE_CONFIG

  // 可用时间 = 总剩余时间 - 保留时间
  const availableTime = timeRemaining - MIN_TIME_REMAINING

  if (availableTime <= 0) {
    return 0
  }

  // 根据可用时间计算可处理的资源数量
  const calculatedSize = Math.floor(availableTime / ESTIMATED_PROCESS_TIME)

  // 限制在合理范围内，避免过度处理
  return Math.min(calculatedSize, MAX_BATCH_SIZE)
}

/**
 * 智能的空闲队列处理 - 动态时间切片
 */
function processIdleQueue(deadline: IdleDeadline): void {
  // 用户体验检查：如果应该暂停，则延迟处理
  if (shouldPauseIdleLoading()) {
    isIdleProcessing = false
    // 延迟重新调度
    setTimeout(() => scheduleIdleWork(), 1000)
    return
  }

  const timeRemaining = deadline.timeRemaining()
  const optimalBatchSize = calculateOptimalBatchSize(timeRemaining)

  // 如果没有足够时间处理任何资源，直接退出
  if (optimalBatchSize === 0 || idleQueue.length === 0) {
    isIdleProcessing = false
    // 如果还有任务，继续调度
    if (idleQueue.length > 0) {
      scheduleIdleWork()
    }
    return
  }

  // 处理当前批次的资源
  let processedCount = 0
  while (processedCount < optimalBatchSize && idleQueue.length > 0) {
    const task = idleQueue.shift()
    if (task) {
      const { urls, options } = task
      const url = urls.shift()

      if (url) {
        // 异步启动加载，不阻塞空闲回调
        loadSingleAsset(url, options.timeout || 15000, options).catch((error) =>
          handleError(error as Error, url, options.onError),
        )
        processedCount++
      }

      // 如果还有剩余资源，重新入队
      if (urls.length > 0) {
        idleQueue.push({ urls, options })
      }
    }
  }

  isIdleProcessing = false

  // 如果还有任务，继续调度
  if (idleQueue.length > 0) {
    scheduleIdleWork()
  }
}
