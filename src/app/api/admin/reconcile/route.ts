import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LedgerService } from '@/lib/services/ledger.service'
import { ReconciliationResponse } from '@/types'

/**
 * 管理员对账接口
 * GET /api/admin/reconcile?userId=xxx
 * 
 * 功能：
 * 1. 对比数据库余额和账本计算余额，检测不一致
 * 2. 统计各状态下注数量
 * 3. 检测账本记录异常（缺少扣款、重复发奖、缺少退款等）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    // 验证必需参数
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    const userIdNum = parseInt(userId)

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 对比数据库余额和账本计算余额
    const currentBalance = Number(user.balance)
    const calculatedBalance = await LedgerService.calculateBalance(userIdNum)

    // 统计各状态下注数量
    const betStats = await prisma.bet.groupBy({
      by: ['status'],
      where: { userId: userIdNum },
      _count: true,
    })

    const stats = {
      placed: 0,
      settled: 0,
      cancelled: 0,
    }

    betStats.forEach((stat) => {
      stats[stat.status.toLowerCase() as keyof typeof stats] = stat._count
    })

    const anomalies: string[] = []

    // 检测余额不一致（允许 0.01 的浮点误差）
    if (Math.abs(currentBalance - calculatedBalance) > 0.01) {
      anomalies.push(
        `Balance mismatch: DB=${currentBalance}, Ledger=${calculatedBalance}`
      )
    }

    // 检测 PLACED 状态下注是否缺少扣款记录
    const placedBets = await prisma.bet.findMany({
      where: {
        userId: userIdNum,
        status: 'PLACED',
      },
      include: {
        ledgers: true,
      },
    })

    for (const bet of placedBets) {
      const hasDebit = bet.ledgers.some((l) => l.type === 'BET_DEBIT')
      if (!hasDebit) {
        anomalies.push(`Missing BET_DEBIT ledger for bet ${bet.id}`)
      }
    }

    // 检测 SETTLED 状态下注是否存在重复发奖记录
    const settledBets = await prisma.bet.findMany({
      where: {
        userId: userIdNum,
        status: 'SETTLED',
      },
      include: {
        ledgers: true,
      },
    })

    for (const bet of settledBets) {
      const creditCount = bet.ledgers.filter((l) => l.type === 'BET_CREDIT').length
      if (creditCount > 1) {
        anomalies.push(`Duplicate BET_CREDIT for bet ${bet.id}`)
      }
    }

    // 检测 CANCELLED 状态下注是否缺少退款记录
    const cancelledBets = await prisma.bet.findMany({
      where: {
        userId: userIdNum,
        status: 'CANCELLED',
      },
      include: {
        ledgers: true,
      },
    })

    for (const bet of cancelledBets) {
      const hasRefund = bet.ledgers.some((l) => l.type === 'BET_REFUND')
      if (!hasRefund) {
        anomalies.push(`Missing BET_REFUND ledger for cancelled bet ${bet.id}`)
      }
    }

    // 构建对账响应
    const response: ReconciliationResponse = {
      userId: userIdNum,
      currentBalance: currentBalance.toString(),
      calculatedBalance: calculatedBalance.toString(),
      isConsistent: anomalies.length === 0,
      betStats: stats,
      anomalies,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
