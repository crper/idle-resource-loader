// Basic usage examples for idle-resource-loader
// Run with: npm run example

import { loadResources } from '../src'

console.log('🚀 idle-resource-loader Examples')
console.log('📦 2.7KB gzipped | ⚡ Smart concurrency | 🛡️ User experience first\n')

// Example 1: Immediate loading (default strategy)
console.log('⚡ Example 1: Immediate loading - Critical resources')
loadResources(['https://placehold.co/400x300.jpg', 'https://placehold.co/500x400.png'])

// Example 2: Idle loading - Non-critical resources
console.log('🔄 Example 2: Idle loading - Background resources')
loadResources(['https://placehold.co/600x500.jpg', 'https://placehold.co/800x600.mp4'], {
  strategy: 'idle',
})

// Example 3: Batch loading with configuration
console.log('📦 Example 3: Batch loading with smart concurrency')
loadResources(
  [
    'https://placehold.co/300x200.jpg',
    'https://placehold.co/400x300.png',
    'https://placehold.co/500x400.webp',
  ],
  {
    batchSize: 5, // Requests 5, automatically limited to 2
    timeout: 10000,
    onError: (url) => console.warn(`❌ Failed: ${url.split('/').pop()}`),
  },
)

// Example 4: Future resources preloading (recommended use case)
console.log('🔮 Example 4: Future resources preloading')
loadResources(
  ['/next-page/hero-image.jpg', '/modal/success-icon.svg', '/assets/future-background.webp'],
  {
    strategy: 'idle',
  },
)

// Example 5: Large resource lists (idle strategy recommended)
console.log('🔄 Example 5: Large resource list - Idle processing')
const manyResources = Array.from(
  { length: 20 },
  (_, i) => `https://placehold.co/100x100.jpg?id=${i}`,
)
loadResources(manyResources, {
  strategy: 'idle',
  onError: (url) => console.warn(`❌ Failed: ${url}`),
})

console.log('\n✅ Examples completed!')
console.log('\n💡 Key Features:')
console.log('  • Immediate: Smart concurrency (default 1, max 2 connections)')
console.log('  • Idle: Dynamic time slicing (1 resource per idle callback)')
console.log('  • Time management: Reserves 12ms for other tasks')
console.log('  • Page visibility: Auto-pause when page is hidden')
console.log('  • Memory optimized: AbortController prevents leaks')
console.log('  • Browser friendly: Respects connection limits')

console.log('\n⚠️  Best Practices:')
console.log('  ✅ DO: Use URL strings for preloading')
console.log('  ✅ DO: Preload future/next-page resources with idle strategy')
console.log('  ✅ DO: Use immediate strategy for critical current-page resources')
console.log("  ❌ DON'T: Use static imports (import logo from './logo.png')")
console.log("  ❌ DON'T: Preload resources that components will request anyway")
console.log('  💡 WHY: Static imports increase bundle size and reduce performance')
