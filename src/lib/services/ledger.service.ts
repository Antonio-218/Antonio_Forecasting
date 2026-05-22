import { prisma } from '../prisma'

/**
 * 账本服务类
 * 处理账本相关的业务逻辑，记录所有余额变更
 * 账本是余额变动的唯一真实来源，用于对账和异常检测
 */
export class LedgerService {
  /**
   * 创建充值账本记录
   * @param userId - 用户 ID
   * @param amount - 充值金额（正数）
   * @returns 创建的账本记录
   */
  static async createDepositLedger(userId: number, amount: number) {
    return await prisma.ledger.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: amount,
        description: 'Deposit',
      },
    })
  }

  /**
   * 创建下注扣款账本记录
   * @param userId - 用户 ID
   * @param betId - 下注 ID
   * @param amount - 下注金额（负数）
   * @returns 创建的账本记录
   */
  static async createBetDebitLedger(userId: number, betId: string, amount: number) {
    return await prisma.ledger.create({
      data: {
        userId,
        betId,
        type: 'BET_DEBIT',
        amount: -amount,
        description: `Bet placed for game`,
      },
    })
  }

  /**
   * 创建下注发奖账本记录
   * 赢取时返还 2 倍下注金额（本金 + 利润）
   * @param userId - 用户 ID
   * @param betId - 下注 ID
   * @param amount - 原下注金额
   * @returns 创建的账本记录
   */
  static async createBetCreditLedger(userId: number, betId: string, amount: number) {
    return await prisma.ledger.create({
      data: {
        userId,
        betId,
        type: 'BET_CREDIT',
        amount: amount * 2,
        description: `Bet won - payout`,
      },
    })
  }

  /**
   * 创建下注退款账本记录
   * 取消下注时全额退款
   * @param userId - 用户 ID
   * @param betId - 下注 ID
   * @param amount - 原下注金额（正数）
   * @returns 创建的账本记录
   */
  static async createBetRefundLedger(userId: number, betId: string, amount: number) {
    return await prisma.ledger.create({
      data: {
        userId,
        betId,
        type: 'BET_REFUND',
        amount: amount,
        description: `Bet cancelled - refund`,
      },
    })
  }

  /**
   * 根据账本记录计算用户余额
   * 通过累加所有账本金额得到计算余额，用于对账
   * @param userId - 用户 ID
   * @returns 计算得出的余额
   */
  static async calculateBalance(userId: number): Promise<number> {
    const ledgers = await prisma.ledger.findMany({
      where: { userId },
    })

    return ledgers.reduce((sum: number, ledger) => sum + Number(ledger.amount), 0)
  }
}
