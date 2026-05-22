import { prisma } from './prisma'

/**
 * 检查幂等键是否存在
 * @param idempotencyKey - 幂等键，由客户端生成
 * @param endpoint - API 端点路径
 * @returns 如果幂等键存在，返回缓存的响应；否则返回不存在
 */
export async function checkIdempotency(
  idempotencyKey: string,
  endpoint: string
): Promise<{ exists: boolean; response?: any }> {
  const record = await prisma.idempotencyKey.findUnique({
    where: {
      endpoint_id: {
        endpoint,
        id: idempotencyKey,
      },
    },
  })

  if (record) {
    return {
      exists: true,
      response: JSON.parse(record.response),
    }
  }

  return { exists: false }
}

/**
 * 保存幂等键和响应
 * @param idempotencyKey - 幂等键
 * @param endpoint - API 端点路径
 * @param response - 要缓存的响应对象
 */
export async function saveIdempotency(
  idempotencyKey: string,
  endpoint: string,
  response: any
): Promise<void> {
  await prisma.idempotencyKey.create({
    data: {
      id: idempotencyKey,
      endpoint,
      response: JSON.stringify(response),
    },
  })
}

/**
 * 验证幂等键的金额一致性
 * 防止客户端使用相同的幂等键但不同的金额进行请求
 * @param idempotencyKey - 幂等键
 * @param endpoint - API 端点路径
 * @param newAmount - 新请求的金额
 * @returns 如果金额一致或幂等键不存在，返回有效；否则返回无效
 */
export async function validateIdempotencyAmount(
  idempotencyKey: string,
  endpoint: string,
  newAmount: number
): Promise<{ valid: boolean; error?: string }> {
  const record = await prisma.idempotencyKey.findUnique({
    where: {
      endpoint_id: {
        endpoint,
        id: idempotencyKey,
      },
    },
  })

  if (!record) {
    return { valid: true }
  }

  const previousResponse = JSON.parse(record.response)
  const previousAmount = previousResponse.amount || previousResponse.bet?.amount

  if (previousAmount !== undefined && previousAmount !== newAmount) {
    return {
      valid: false,
      error: 'Idempotency key already used with different amount',
    }
  }

  return { valid: true }
}
