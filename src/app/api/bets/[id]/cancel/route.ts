import { NextRequest, NextResponse } from 'next/server'
import { BetService } from '@/lib/services/bet.service'

/**
 * 取消下注接口
 * POST /api/bets/:id/cancel
 * 
 * 功能：取消指定下注并全额退款
 * 状态流转：PLACED → CANCELLED
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 调用服务层取消下注
    const bet = await BetService.cancelBet(params.id)

    return NextResponse.json({
      id: bet.id,
      userId: bet.userId,
      gameId: bet.gameId,
      amount: Number(bet.amount),
      status: bet.status,
      updatedAt: bet.updatedAt,
    })
  } catch (error) {
    console.error('Cancel error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('can only be cancelled') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
