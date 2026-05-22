import { prisma } from '../prisma'

/**
 * 用户服务类
 * 处理用户相关的业务逻辑，包括余额管理
 */
export class UserService {
  /**
   * 用户充值
   * 在事务中更新用户余额并创建账本记录
   * @param userId - 用户 ID
   * @param amount - 充值金额
   * @returns 更新后的用户对象
   */
  static async deposit(userId: number, amount: number) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      })

      await tx.ledger.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount: amount,
          description: 'Deposit',
        },
      })

      return user
    })
  }

  /**
   * 根据 ID 获取用户信息
   * @param userId - 用户 ID
   * @returns 用户对象
   */
  static async getUserById(userId: number) {
    return await prisma.user.findUnique({
      where: { id: userId },
    })
  }

  /**
   * 扣除用户余额
   * 在事务中检查余额是否充足，然后扣除余额
   * @param userId - 用户 ID
   * @param amount - 扣除金额
   * @returns 更新后的用户对象
   * @throws Error 如果用户不存在或余额不足
   */
  static async deductBalance(userId: number, amount: number) {
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

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      })

      return updatedUser
    })
  }

  /**
   * 增加用户余额
   * 在事务中增加用户余额
   * @param userId - 用户 ID
   * @param amount - 增加金额
   * @returns 更新后的用户对象
   */
  static async addBalance(userId: number, amount: number) {
    return await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      })

      return updatedUser
    })
  }
}
