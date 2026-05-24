import { prisma } from '../prisma'
import { LedgerType } from '../../types'

/**
 * 账本服务类
 * 处理账本相关的业务逻辑，记录所有余额变更
 * 账本是余额变动的唯一真实来源，用于对账和异常检测
 */
export class LedgerService {
  /**
   * 应用账本条目并更新用户余额
   * 这是余额变动的唯一入口点
   * @param tx - Prisma 事务客户端
   * @param userId - 用户 ID
   * @param amount - 金额（正数表示增加，负数表示减少）
   * @param type - 账本类型
   * @param betId - 关联的下注 ID（可选）
   * @param description - 交易描述（可选）
   * @returns 更新后的用户
   */
  static async applyLedgerEntry(
    tx: any,
    {
      userId,
      amount,
      type,
      betId,
      description,
    }: {
      userId: number
      amount: number
      type: LedgerType
      betId?: number
      description?: string
    }
  ) {
    // 创建账本记录
    await tx.ledger.create({
      data: {
        userId,
        betId,
        type,
        amount,
        description,
      },
    })

    // 更新用户余额
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount,
        },
      },
    })

    return updated
  }

  /**
   * 根据账本记录计算用户余额
   * 通过累加所有账本金额得到计算余额，用于对账
   * @param userId - 用户 ID
   * @returns 计算得出的余额
   */
  static async calculateBalance(userId: number): Promise<number> {
    const result = await prisma.ledger.aggregate({
      where: { userId },
      _sum: { amount: true },
    })

    return Number(result._sum.amount ?? 0)
  }
}
