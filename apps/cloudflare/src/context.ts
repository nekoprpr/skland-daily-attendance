import type { TZDate } from '@date-fns/tz'
import type { Storage } from 'unstorage'
import type { createMessageCollector } from './utils'
import { createContext } from 'unctx'

// 配置常量
export const DEFULAT_CONFIG = {
  MAX_RETRIES: 3 as number,
  RETRY_DELAY: 1000,
  CONCURRENT_LIMIT: 3,
  CHUNK_DELAY: 3000,
  BINDINGS_STORAGE_PREFIX: 'bindings:',
  ATTENDANCE_STORAGE_PREFIX: 'attendance:',
  NOTIFICATION_URLS: '',
} as const

export const context = createContext<{
  config: typeof DEFULAT_CONFIG
  storage: Storage
  today: TZDate
  messageCollector: ReturnType<typeof createMessageCollector>
}>()
export const useContext = context.use
