import type { AppBindingPlayer } from 'skland-kit'
import type { CreateMessageCollectorOptions } from './utils'
import process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { createClient } from 'skland-kit'
import { createMessageCollector, formatCharacterName, isTodayAttended } from './utils'

const client = createClient()

interface AttendanceResult {
  success: boolean
  message: string
  hasError: boolean
}

// Attend for a single character with retry logic
async function attendCharacter(character: AppBindingPlayer, maxRetries: number): Promise<AttendanceResult> {
  const characterLabel = formatCharacterName(character)

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const query = {
        uid: character.uid,
        gameId: character.channelMasterId,
      }

      const attendanceStatus = await client.collections.game.getAttendanceStatus(query)

      if (isTodayAttended(attendanceStatus)) {
        return {
          success: false,
          message: `${characterLabel} 今天已经签到过了`,
          hasError: false,
        }
      }

      const data = await client.collections.game.attendance(query)
      const awards = data.awards.map(a => `「${a.resource.name}」${a.count}个`).join(',')

      return {
        success: true,
        message: `${characterLabel} 签到成功，获得了${awards}`,
        hasError: false,
      }
    }
    catch (error: unknown) {
      // Handle 403 error as already attended
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response
        if (response && response.status === 403) {
          return {
            success: false,
            message: `${characterLabel} 今天已经签到过了`,
            hasError: false,
          }
        }
      }

      // For other errors, retry if not the last attempt
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (attempt === maxRetries - 1) {
        console.error(`${characterLabel} 签到失败，已达到最大重试次数`)
        return {
          success: false,
          message: `${characterLabel} 签到过程中出现未知错误: ${errorMessage}`,
          hasError: true,
        }
      }

      console.log(`${characterLabel} 签到失败，重试中... (${attempt + 1}/${maxRetries})`)
      await setTimeout(1000) // Wait 1s before retry
    }
  }

  // Should never reach here, but for type safety
  return {
    success: false,
    message: `${characterLabel} 签到失败`,
    hasError: true,
  }
}

export async function doAttendanceForAccount(token: string, options: CreateMessageCollectorOptions) {
  const { code } = await client.collections.hypergryph.grantAuthorizeCode(token)
  await client.signIn(code)

  const { list } = await client.collections.player.getBinding()
  const messageCollector = createMessageCollector(options)

  messageCollector.log('## 明日方舟签到')

  const characterList = list
    .filter(i => i.appCode === 'arknights')
    .flatMap(i => i.bindingList)

  const maxRetries = Number.parseInt(process.env.MAX_RETRIES || '3', 10)

  // Process characters sequentially to avoid rate limiting and ensure proper logging
  const results: AttendanceResult[] = []
  for (let i = 0; i < characterList.length; i++) {
    const character = characterList[i]
    console.log(`正在签到第 ${i + 1}/${characterList.length} 个角色`)

    const result = await attendCharacter(character, maxRetries)
    results.push(result)
    messageCollector.log(result.message, result.hasError)

    // Add delay between characters to avoid rate limiting
    if (i < characterList.length - 1) {
      await setTimeout(3000)
    }
  }

  // Count successful attendances
  const successCount = results.filter(r => r.success).length
  if (successCount > 0) {
    messageCollector.log(`成功签到 ${successCount} 个角色`)
  }

  await messageCollector.push()
}
