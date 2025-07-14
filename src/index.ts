// 导出类型定义 - 只导出用户需要的类型
export type { LoadResourcesOptions, ResourceInput } from './types'

// 导入依赖
import { addIdleTask, loadAssetsBatch, scheduleIdleWork } from './core'
import type { LoadOptions, LoadResourcesOptions, ResourceInput } from './types'

/**
 * 解析资源输入为 URL 字符串
 * 包含基础安全验证，防止XSS和其他安全风险
 */
function resolveResourceUrl(resource: ResourceInput): string | null {
  if (!resource || typeof resource !== 'string') {
    return null
  }

  const trimmed = resource.trim()
  if (!trimmed) {
    return null
  }

  // 安全检查：禁止危险协议
  if (/^(javascript|data|file|ftp|blob):/i.test(trimmed)) {
    return null
  }

  // 绝对URL必须是HTTP/HTTPS或协议相对URL
  if (trimmed.includes('://') && !/^https?:\/\//.test(trimmed)) {
    return null
  }

  // 基础格式检查：确保包含有效的URL字符
  if (!/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/.test(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * 准备待加载的资源列表
 * 过滤无效URL，通过 onError 回调处理错误
 */
function prepareResourcesForLoading(resources: ResourceInput | ResourceInput[]): string[] {
  const resourceArray = Array.isArray(resources) ? resources : [resources]

  return resourceArray.map(resolveResourceUrl).filter((url): url is string => url !== null)
}

/**
 * 🚀 统一资源加载函数 - 核心 API
 *
 * 支持立即加载和空闲加载两种策略的统一接口
 *
 * @param resources 资源URL字符串或字符串数组
 * @param options 加载选项，包含 strategy 字段来选择加载策略
 *
 * @example
 * // 立即加载（默认）
 * loadResources(['/assets/image.jpg', '/assets/font.woff'])
 *
 * // 空闲加载
 * loadResources(['/assets/video.mp4'], { strategy: 'idle' })
 *
 * // 带配置的立即加载
 * loadResources(['/assets/image.jpg'], {
 *   strategy: 'immediate',
 *   batchSize: 2,
 *   timeout: 15000,
 *   onError: (url, error) => console.error('Failed:', url, error)
 * })
 *
 * // 空闲加载配置
 * loadResources(['/assets/video.mp4'], {
 *   strategy: 'idle',
 *   batchSize: 1,
 *   onError: (url, error) => console.error('Failed:', url, error)
 * })
 */
export function loadResources(
  resources: ResourceInput | ResourceInput[],
  options: LoadResourcesOptions = {},
): void {
  const { strategy = 'immediate', batchSize = 1, ...restOptions } = options
  const validUrls = prepareResourcesForLoading(resources)

  if (validUrls.length === 0) {
    return
  }

  if (strategy === 'idle') {
    // 空闲加载策略
    const idleOptions = { ...restOptions, batchSize } as LoadOptions
    addIdleTask(validUrls, idleOptions)
    scheduleIdleWork()
  } else {
    // 立即加载策略
    const immediateOptions = { ...restOptions, batchSize } as LoadOptions
    loadAssetsBatch(validUrls, immediateOptions).catch((error: unknown) => {
      console.warn('[system] Immediate load failed:', error)
    })
  }
}
