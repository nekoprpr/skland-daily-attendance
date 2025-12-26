import type { AppBindingPlayer, AttendanceStatus } from "skland-kit"
import { createSender } from "statocysts"

export function isTodayAttended(attendanceStatus: AttendanceStatus): boolean {
  const today = new Date().setHours(0, 0, 0, 0)
  return attendanceStatus.records.some((record) => {
    return new Date(Number(record.ts) * 1000).setHours(0, 0, 0, 0) === today
  })
}

export function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export function formatCharacterName(character: AppBindingPlayer) {
  return `${formatChannelName(character.channelMasterId)}角色${formatPrivacyName(character.nickName)}`
}

export function formatChannelName(channelMasterId: string): string {
  return Number(channelMasterId) - 1 ? 'B 服' : '官服'
}

export function formatPrivacyName(nickName: string) {
  const [name, number] = nickName.split('#')
  if (name.length <= 2)
    return nickName

  const firstChar = name[0]
  const lastChar = name[name.length - 1]
  const stars = '*'.repeat(name.length - 2)

  return `${firstChar}${stars}${lastChar}#${number}`
}

export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {

  try {
    return await fn()
  }
  catch (error) {
    if (retries > 0) {
      console.log(`操作失败，剩余重试次数: ${retries}`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return retry(fn, retries - 1, delay)
    }
    throw error
  }
}

export function pick(obj: Record<string, any>, keys: string[]) {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {} as Record<string, any>)
}

export interface CreateMessageCollectorOptions {
  notificationUrls?: string | string[]
  onError?: () => void
}

export function createMessageCollector(options: CreateMessageCollectorOptions) {
  const messages: string[] = []
  let hasError = false

  const log = (message: string, isError = false) => {
    messages.push(message)
    console[isError ? 'error' : 'log'](message)
    if (isError) {
      hasError = true
    }
  }

  const push = async () => {
    const title = '【森空岛每日签到】'
    const content = messages.join('\n\n')
    const urls = options.notificationUrls ? toArray(options.notificationUrls) : []
    const sender = createSender(urls)

    await sender.send(title, content)

    // Exit with error if any error occurred
    if (hasError && options.onError) {
      options.onError()
    }
  }

  return { log, push, hasError: () => hasError } as const
}
