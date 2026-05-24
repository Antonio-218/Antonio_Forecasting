import { prisma } from '../prisma'
import { LedgerService } from './ledger.service'
import { BetStatus, BetResult } from '../../types'

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

      if (user.balance < amount) {
        throw new Error('Insufficient balance')
      }

      const bet = await tx.bet.create({
        data: {
          userId,
          gameId,
          amount: amount,
          status: BetStatus.PLACED,
        },
      })

      // 使用账本服务记录扣款
      await LedgerService.applyLedgerEntry(tx, {
        userId,
        betId: bet.id,
        amount: -amount,
        type: 'BET_DEBIT',
        description: `Bet placed for game ${gameId}`,
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
  static async settleBet(betId: number, result: BetResult) {
    return await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
      })

      if (!bet) {
        throw new Error('Bet not found')
      }

      if (bet.status !== BetStatus.PLACED) {
        throw new Error('Bet can only be settled from PLACED status')
      }

      if (result === BetResult.WIN) {
        const payout = bet.amount * 2
        // 使用账本服务记录奖金
        await LedgerService.applyLedgerEntry(tx, {
          userId: bet.userId,
          betId: bet.id,
          amount: payout,
          type: 'BET_CREDIT',
          description: `Bet won - payout`,
        })
      }

      const updatedBet = await tx.bet.update({
        where: { id: betId },
        data: {
          status: BetStatus.SETTLED,
          result,
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
  static async cancelBet(betId: number) {
    return await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
      })

      if (!bet) {
        throw new Error('Bet not found')
      }

      if (bet.status !== BetStatus.PLACED) {
        throw new Error('Bet can only be cancelled from PLACED status')
      }

      // 使用账本服务记录退款
      await LedgerService.applyLedgerEntry(tx, {
        userId: bet.userId,
        betId: bet.id,
        amount: bet.amount,
        type: 'BET_REFUND',
        description: `Bet cancelled - refund`,
      })

      const updatedBet = await tx.bet.update({
        where: { id: betId },
        data: {
          status: BetStatus.CANCELLED,
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
  static async getBetById(betId: number) {
    return await prisma.bet.findUnique({
      where: { id: betId },
      include: { user: true },
    })
  }
}
