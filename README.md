# Forecasting Platform

一个简化版的类 Polymarket 预测平台，具有幂等性、状态机控制和账本对账功能。

## 功能特性

- **用户系统**：预置静态用户，支持余额管理
- **充值接口**：支持幂等性的充值操作，追踪余额变化
- **下注系统**：下注时验证余额，并通过状态机控制
- **状态机**：下注状态流转（已下注 → 已结算/已取消）
- **账本模型**：完整的交易追踪和余额对账
- **幂等性**：所有变更操作支持幂等键
- **管理员对账**：账户余额验证和异常检测

## 技术栈

- **Backend**: Node.js with TypeScript
- **Frontend**: Next.js 14 (App Router)
- **Database**: SQLite + Prisma ORM
- **Testing**: Jest

## 安装

1. 安装依赖:
```bash
npm install
```

2. 设置数据库:
```bash
npm run db:setup
```

这将创建 SQLite 数据库、运行 Prisma 迁移并初始化用户数据。

3. 使用 Prisma Studio 查看数据库:
```bash
npx prisma studio
```

这将在 `http://localhost:5555` 打开数据库可视化界面。

## 运行应用

开发模式:
```bash
npm run dev
```

生产构建:
```bash
npm run build
npm start
```

应用将在 http://localhost:3000 可用

## Swagger API 测试页面

交互式 API 文档可在以下地址访问：

**Swagger UI**: `http://localhost:3000/api-docs`

此页面允许您在浏览器中直接测试所有 API 端点：

- **Deposit** - 向用户余额添加资金
- **Place Bet** - 创建新的下注
- **Settle Bet** - 结算下注为赢或输
- **Cancel Bet** - 取消下注并退款
- **Admin Reconcile** - 验证账户余额一致性

所有变更操作端点需要 `Idempotency-Key` 请求头以支持幂等性。

### 测试数据

预置用户：
- user1 (id: 68) - balance: 1000
- user2 (id: 69) - balance: 500
- user3 (id: 70) - balance: 2000

**快速测试流程：**

1. **Deposit** - 给用户68充值100:
   - id: `68`, Idempotency-Key: `deposit-001`, amount: `100`

2. **Place Bet** - 为用户68创建下注:
   - Idempotency-Key: `bet-001`, userId: `68`, gameId: `game-001`, amount: `50`

3. **Settle Bet** - 结算为赢:
   - id: `{bet-id}` (从 Place Bet 响应中复制，例如 `3fa85f64-5717-4562-b3fc-2c963f66afa6`)
   - Idempotency-Key: `settle-001`, result: `WIN`

4. **Cancel Bet** - 取消下注 (替代结算):
   - id: `{bet-id}` (另一个 PLACED 状态的下注 ID)
   - Idempotency-Key: `cancel-001`

5. **Admin Reconcile** - 检查用户68余额:
   - userId: `68`

**幂等性测试：**
- 使用相同的 `Idempotency-Key` 和相同的负载 → 返回缓存响应
- 使用相同的 `Idempotency-Key` 但金额不同 → 返回 409 Conflict

## 测试

运行所有测试:
```bash
npm test
```

监听模式运行测试:
```bash
npm run test:watch
```

### 测试覆盖

项目包含10个综合测试用例:

1. ✅ 充值后余额正确增加
2. ✅ 充值幂等性验证
3. ✅ 余额不足时禁止下注
4. ✅ 下注幂等性验证
5. ✅ 赢取结算后余额正确增加
6. ✅ 已结算订单不能重复结算
7. ✅ 下注取消并退款
8. ✅ 账本余额计算一致性
9. ✅ 状态机：已下注 → 已取消
10. ✅ 状态机：已下注 → 已结算

## 数据库架构

### 用户表
- `id`: 唯一标识符
- `username`: 唯一用户名
- `balance`: 当前余额
- `createdAt`: 创建时间

### 下注表
- `id`: 唯一标识符 (UUID)
- `userId`: 关联用户
- `gameId`: 游戏标识符
- `amount`: 下注金额
- `status`: PLACED | SETTLED | CANCELLED
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### 账本表
- `id`: 唯一标识符
- `userId`: 关联用户
- `betId`: 关联下注（可选）
- `type`: DEPOSIT | BET_DEBIT | BET_CREDIT | BET_REFUND
- `amount`: 交易金额
- `description`: 交易描述
- `createdAt`: 创建时间

### 幂等键表
- `id`: 唯一标识符
- `endpoint`: API 端点
- `response`: 缓存响应 (JSON 字符串)
- `createdAt`: 创建时间

## 架构

### 服务层

应用采用分层架构:

- **Controllers/API Routes**: 处理 HTTP 请求和响应
- **Services**: 包含业务逻辑 (UserService, BetService, LedgerService)
- **Repository**: Prisma ORM 用于数据库操作

### 事务处理

所有余额和账本操作都包装在数据库事务中以确保一致性:

```typescript
await prisma.$transaction(async (tx) => {
  // 更新用户余额
  // 创建账本记录
  // 要么都成功，要么都失败
})
```

### 幂等性

幂等性通过专用表实现响应缓存:

1. 检查幂等键是否存在
2. 如果存在，返回缓存响应
3. 如果不存在，执行操作并缓存响应
4. 验证充值操作的金额一致性

## 状态机

下注状态流转:

```
PLACED → SETTLED (win/lose)
PLACED → CANCELLED (refund)
```

- 已结算和已取消是终态
- 终态不可再流转
- 服务层强制状态验证

## 账本模型

所有余额变更必须创建对应的账本记录:

| 账本类型 | 触发场景 | 金额 |
|-------------|---------|--------|
| DEPOSIT | 用户充值 | +amount |
| BET_DEBIT | 下注 | -amount |
| BET_CREDIT | 赢取 (WIN) | +2×amount |
| BET_REFUND | 取消 | +amount |

余额一致性通过以下方式强制执行:
- 业务逻辑中绝不直接修改 User.balance
- 始终使用事务处理余额+账本操作
- 通过对账 API 检测异常



## 许可证

MIT
