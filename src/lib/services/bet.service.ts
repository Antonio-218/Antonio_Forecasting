import { prisma } from '../prisma'

/**
 * 下注服务类
 * 处理下注相关的业务逻辑，包括下注、结算、取消
 * 使用状态机模式控制下注状态流转：PLACED → SETTLED/CANCELLED
 */
export class BetService {
  /**
   * 下注
   * 在事务中检查余额、扣除余额、创建下注记录、创建账本记录
   * @param userId - 用户 ID
   * @param gameId - 游戏 ID
   * @param amount - 下注金额
   * @returns 创建的下注对象
   * @throws Error 如果用户不存在或余额不足
   */
  static async placeBet(userId: number, gameId: string, amount: number) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      if (Number(user.balance) < amount) {
        throw new Error('Insufficient balance')
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      })

      const bet = await tx.bet.create({
        data: {
          userId,
          gameId,
          amount: amount,
          status: 'PLACED',
        },
      })

      await tx.ledger.create({
        data: {
          userId,
          betId: bet.id,
          type: 'BET_DEBIT',
          amount: -amount,
          description: `Bet placed for game ${gameId}`,
        },
      })

      return bet
    })
  }

  /**
   * 结算下注
   * 只能从 PLACED 状态结算为 SETTLED 状态
   * 赢取时返还 2 倍下注金额，输则无返还
   * @param betId - 下注 ID
   * @param result - 结算结果：WIN 或 LOSE
   * @returns 更新后的下注对象
   * @throws Error 如果下注不存在或状态不是 PLACED
   */
  static async settleBet(betId: string, result: 'WIN' | 'LOSE') {
    return await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
        include: { user: true },
      })

      if (!bet) {
        throw new Error('Bet not found')
      }

      if (bet.status !== 'PLACED') {
        throw new Error('Bet can only be settled from PLACED status')
      }

      if (result === 'WIN') {
        const payout = Number(bet.amount) * 2
        await tx.user.update({
          where: { id: bet.userId },
          data: {
            balance: {
              increment: payout,
            },
          },
        })

        await tx.ledger.create({
          data: {
            userId: bet.userId,
            betId: bet.id,
            type: 'BET_CREDIT',
            amount: payout,
            description: `Bet won - payout`,
          },
        })
      }

      const updatedBet = await tx.bet.update({
        where: { id: betId },
        data: {
          status: 'SETTLED',
        },
      })

      return updatedBet
    })
  }

  /**
   * 取消下注
   * 只能从 PLACED 状态取消为 CANCELLED 状态
   * 取消时全额退款
   * @param betId - 下注 ID
   * @returns 更新后的下注对象
   * @throws Error 如果下注不存在或状态不是 PLACED
   */
  static async cancelBet(betId: string) {
    return await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
      })

      if (!bet) {
        throw new Error('Bet not found')
      }

      if (bet.status !== 'PLACED') {
        throw new Error('Bet can only be cancelled from PLACED status')
      }

      await tx.user.update({
        where: { id: bet.userId },
        data: {
          balance: {
            increment: Number(bet.amount),
          },
        },
      })

      await tx.ledger.create({
        data: {
          userId: bet.userId,
          betId: bet.id,
          type: 'BET_REFUND',
          amount: Number(bet.amount),
          description: `Bet cancelled - refund`,
        },
      })

      const updatedBet = await tx.bet.update({
        where: { id: betId },
        data: {
          status: 'CANCELLED',
        },
      })

      return updatedBet
    })
  }

  /**
   * 根据 ID 获取下注信息
   * @param betId - 下注 ID
   * @returns 下注对象（包含用户信息）
   */
  static async getBetById(betId: string) {
    return await prisma.bet.findUnique({
      where: { id: betId },
      include: { user: true },
    })
  }
}
