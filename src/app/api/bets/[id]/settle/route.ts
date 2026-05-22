import { NextRequest, NextResponse } from 'next/server'
import { BetService } from '@/lib/services/bet.service'

/**
 * 结算下注接口
 * POST /api/bets/:id/settle
 * 
 * 功能：结算指定下注，赢取时返还 2 倍金额，输则无返还
 * 状态流转：PLACED → SETTLED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { result } = body

    // 验证结算结果
    if (result !== 'WIN' && result !== 'LOSE') {
      return NextResponse.json(
        { error: 'Invalid result. Must be WIN or LOSE' },
        { status: 400 }
      )
    }

    // 调用服务层结算下注
    const bet = await BetService.settleBet(params.id, result)

    return NextResponse.json({
      id: bet.id,
      userId: bet.userId,
      gameId: bet.gameId,
      amount: Number(bet.amount),
      status: bet.status,
      updatedAt: bet.updatedAt,
    })
  } catch (error) {
    console.error('Settle error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('can only be settled') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
