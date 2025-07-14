/**
 * 资源类型 - 支持字符串路径
 */
export type ResourceInput = string

/**
 * 加载策略类型
 */
export type LoadStrategy = 'immediate' | 'idle'

/**
 * 基础加载配置
 */
interface BaseLoadConfig {
  /** 每批处理的资源数量，默认 1。优先保证页面初始化资源的网络带宽 */
  batchSize?: number
  /** 超时时间（毫秒），默认 15000 */
  timeout?: number
  /** 资源加载失败回调 */
  onError?: (url: string, error: Error) => void
}

/**
 * 统一的加载选项接口
 */
export type LoadOptions = BaseLoadConfig

/**
 * loadResources 函数的选项接口
 */
export type LoadResourcesOptions = BaseLoadConfig & {
  /** 加载策略，默认 'immediate' */
  strategy?: LoadStrategy
}

// ===== 内部类型定义 =====

/**
 * 空闲队列任务接口
 */
export interface IdleTask {
  urls: string[]
  options: LoadOptions
}

/**
 * 空闲回调接口 - 简化的 requestIdleCallback deadline 类型
 */
export interface IdleDeadline {
  timeRemaining(): number
}

/**
 * 资源加载器函数类型
 */
export type ResourceLoader = (url: string) => Promise<void>

/**
 * 支持跨域的元素类型
 */
export type CrossOriginElement =
  | HTMLImageElement
  | HTMLAudioElement
  | HTMLVideoElement
  | HTMLLinkElement

/**
 * 加载器配置接口 - 使用泛型约束减少类型重复
 */
export interface LoaderConfig<T extends HTMLElement = HTMLElement> {
  createElement: () => T
  successEvent: string
  errorEvent: string
  setup: (element: T, url: string) => void
  cleanup?: (element: T) => void
}
