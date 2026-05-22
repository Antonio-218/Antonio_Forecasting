import { PrismaClient } from '@prisma/client'

// Prisma Client 单例模式
// 在开发环境下，避免热重载时创建多个数据库连接
// 在生产环境下，每次请求都会创建新的连接
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// 仅在开发环境下将 Prisma 实例挂载到全局对象
// 这样在热重载时不会重复创建数据库连接
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
