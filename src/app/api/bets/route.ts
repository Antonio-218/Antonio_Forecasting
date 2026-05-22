import { NextRequest, NextResponse } from 'next/server'
import { BetService } from '@/lib/services/bet.service'
import { checkIdempotency, saveIdempotency } from '@/lib/idempotency'

/**
 * 下注接口
 * POST /api/bets
 * 
 * 功能：创建新下注，验证余额并扣除
 * 需要 Idempotency-Key 请求头支持幂等性
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, gameId, amount } = body

    // 验证请求参数
    if (!userId || !gameId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const idempotencyKey = request.headers.get('Idempotency-Key')
    const endpoint = '/api/bets'

    // 验证幂等键
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Idempotency-Key header is required' },
        { status: 400 }
      )
    }

    // 检查幂等键是否已存在
    const idempotencyCheck = await checkIdempotency(idempotencyKey, endpoint)
    if (idempotencyCheck.exists) {
      return NextResponse.json(idempotencyCheck.response)
    }

    // 调用服务层创建下注
    const bet = await BetService.placeBet(userId, gameId, amount)
    const response = {
      id: bet.id,
      userId: bet.userId,
      gameId: bet.gameId,
      amount: Number(bet.amount),
      status: bet.status,
      createdAt: bet.createdAt,
    }

    // 保存幂等键和响应
    await saveIdempotency(idempotencyKey, endpoint, response)

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Bet error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('Insufficient balance') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
