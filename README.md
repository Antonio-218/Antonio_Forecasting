# Forecasting Platform

A simplified Polymarket-like forecasting platform with idempotency, state machine control, and ledger reconciliation.

一个简化版的类 Polymarket 预测平台，具有幂等性、状态机控制和账本对账功能。

## Features / 功能特性

- **User System**: Pre-seeded static users with balance management
  - 用户系统：预置静态用户，支持余额管理
- **Deposit API**: Idempotent deposit operations with balance tracking
  - 充值接口：支持幂等性的充值操作，追踪余额变化
- **Betting System**: Place bets with balance validation and state machine control
  - 下注系统：下注时验证余额，并通过状态机控制
- **State Machine**: Bet status transitions (PLACED → SETTLED/CANCELLED)
  - 状态机：下注状态流转（已下注 → 已结算/已取消）
- **Ledger Model**: Complete transaction tracking with balance reconciliation
  - 账本模型：完整的交易追踪和余额对账
- **Idempotency**: All mutation operations support idempotency keys
  - 幂等性：所有变更操作支持幂等键
- **Admin Reconciliation**: Account balance verification with anomaly detection
  - 管理员对账：账户余额验证和异常检测

## Tech Stack / 技术栈

- **Backend**: Node.js with TypeScript
- **Frontend**: Next.js 14 (App Router)
- **Database**: SQLite + Prisma ORM
- **Testing**: Jest

## Installation / 安装

1. Install dependencies / 安装依赖:
```bash
npm install
```

2. Set up the database / 设置数据库:
```bash
npm run db:setup
```

This will create the SQLite database, run Prisma migrations, and seed initial users (user1: 1000, user2: 500, user3: 2000).
这将创建 SQLite 数据库、运行 Prisma 迁移并初始化用户数据。

3. View database with Prisma Studio / 使用 Prisma Studio 查看数据库:
```bash
npx prisma studio
```

This will open a visual database interface at `http://localhost:5555`.
这将在 `http://localhost:5555` 打开数据库可视化界面。

## Running the Application / 运行应用

Development mode / 开发模式:
```bash
npm run dev
```

Production build / 生产构建:
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`
应用将在 http://localhost:3000 可用

## API Testing with Swagger UI / Swagger API 测试页面

Interactive API documentation is available at:
交互式 API 文档可在以下地址访问：

**Swagger UI**: `http://localhost:3000/api-docs`

This page allows you to test all API endpoints directly in the browser:
此页面允许您在浏览器中直接测试所有 API 端点：

- **Deposit** - Add funds to user balance
- **Place Bet** - Create a new bet
- **Settle Bet** - Settle bet as WIN or LOSE
- **Cancel Bet** - Cancel bet and refund
- **Admin Reconcile** - Verify account balance consistency

All mutation endpoints require `Idempotency-Key` header for idempotency support.
所有变更操作端点需要 `Idempotency-Key` 请求头以支持幂等性。

### Test Data / 测试数据

Pre-seeded users / 预置用户：
- user1 (id: 68) - balance: 1000
- user2 (id: 69) - balance: 500
- user3 (id: 70) - balance: 2000

**Quick Test Flow / 快速测试流程：**

1. **Deposit** - Recharge user 68 with 100:
   - id: `68`, Idempotency-Key: `deposit-001`, amount: `100`

2. **Place Bet** - Create a bet for user 68:
   - Idempotency-Key: `bet-001`, userId: `68`, gameId: `game-001`, amount: `50`

3. **Settle Bet** - Settle as WIN:
   - id: `{bet-id}` (copy from Place Bet response, e.g. `3fa85f64-5717-4562-b3fc-2c963f66afa6`)
   - Idempotency-Key: `settle-001`, result: `WIN`

4. **Cancel Bet** - Cancel a bet (alternative to settle):
   - id: `{bet-id}` (another bet ID in PLACED status)
   - Idempotency-Key: `cancel-001`

5. **Admin Reconcile** - Check user 68 balance:
   - userId: `68`

**Idempotency Test / 幂等性测试：**
- Use same `Idempotency-Key` with same payload → returns cached response
- Use same `Idempotency-Key` with different amount → returns 409 Conflict

## API Documentation / API 文档

### 1. Deposit Funds / 充值

Add funds to a user's balance. / 向用户余额添加资金

**Endpoint**: `POST /api/users/:id/deposit`

**Headers**:
- `Idempotency-Key`: Required string for idempotency / 必需的幂等性键

**Body**:
```json
{
  "amount": 100
}
```

**Response** (200):
```json
{
  "id": 1,
  "username": "user1",
  "balance": 1100
}
```

**Error Responses / 错误响应**:
- `400`: Invalid amount or missing Idempotency-Key / 无效金额或缺少幂等键
- `409`: Idempotency key already used with different amount / 幂等键已使用但金额不同
- `500`: Internal server error / 服务器内部错误

### 2. Place Bet / 下注

Place a bet on a game. / 在游戏中下注

**Endpoint**: `POST /api/bets`

**Headers**:
- `Idempotency-Key`: Required string for idempotency / 必需的幂等性键

**Body**:
```json
{
  "userId": 1,
  "gameId": "game-001",
  "amount": 100
}
```

**Response** (201):
```json
{
  "id": "uuid-here",
  "userId": 1,
  "gameId": "game-001",
  "amount": 100,
  "status": "PLACED",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses / 错误响应**:
- `400`: Invalid request body or insufficient balance / 无效请求体或余额不足
- `500`: Internal server error / 服务器内部错误

### 3. Settle Bet / 结算

Settle a bet as WIN or LOSE. / 将下注结算为赢或输

**Endpoint**: `POST /api/bets/:id/settle`

**Body**:
```json
{
  "result": "WIN"
}
```

**Response** (200):
```json
{
  "id": "uuid-here",
  "userId": 1,
  "gameId": "game-001",
  "amount": 100,
  "status": "SETTLED",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Rules / 规则**:
- `WIN`: Returns 2x the bet amount (original + profit) / 赢：返回2倍下注金额（本金+利润）
- `LOSE`: No return / 输：无返还
- Can only settle bets in PLACED status / 只能结算已下注状态的订单

**Error Responses / 错误响应**:
- `400`: Invalid result or bet not in PLACED status / 无效结果或下注状态不是已下注
- `500`: Internal server error / 服务器内部错误

### 4. Cancel Bet / 取消

Cancel a bet and refund the amount. / 取消下注并退款

**Endpoint**: `POST /api/bets/:id/cancel`

**Response** (200):
```json
{
  "id": "uuid-here",
  "userId": 1,
  "gameId": "game-001",
  "amount": 100,
  "status": "CANCELLED",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Rules / 规则**:
- Can only cancel bets in PLACED status / 只能取消已下注状态的订单
- Full refund is processed immediately / 立即全额退款

**Error Responses / 错误响应**:
- `400`: Bet not in PLACED status / 下注状态不是已下注
- `500`: Internal server error / 服务器内部错误

### 5. Admin Reconciliation / 管理员对账

Verify account balance and detect anomalies. / 验证账户余额并检测异常

**Endpoint**: `GET /api/admin/reconcile?userId=1`

**Response** (200):
```json
{
  "userId": 1,
  "currentBalance": "1000",
  "calculatedBalance": "1000",
  "isConsistent": true,
  "betStats": {
    "placed": 2,
    "settled": 1,
    "cancelled": 0
  },
  "anomalies": []
}
```

**Anomaly Detection / 异常检测**:
- Balance mismatch between DB and ledger sum / 数据库余额与账本总和不匹配
- Missing BET_DEBIT records for PLACED bets / 已下注订单缺少扣款记录
- Duplicate BET_CREDIT records for SETTLED bets / 已结算订单存在重复发奖记录
- Missing BET_REFUND records for CANCELLED bets / 已取消订单缺少退款记录

## Testing / 测试

Run all tests / 运行所有测试:
```bash
npm test
```

Run tests in watch mode / 监听模式运行测试:
```bash
npm run test:watch
```

### Test Coverage / 测试覆盖

The project includes 10 comprehensive test cases / 项目包含10个综合测试用例:

1. ✅ Deposit increases balance correctly / 充值后余额正确增加
2. ✅ Deposit idempotency verification / 充值幂等性验证
3. ✅ Insufficient balance prevents betting / 余额不足时禁止下注
4. ✅ Bet placement idempotency verification / 下注幂等性验证
5. ✅ WIN settlement increases balance correctly / 赢取结算后余额正确增加
6. ✅ Cannot settle already settled bets / 已结算订单不能重复结算
7. ✅ Bet cancellation with refund / 下注取消并退款
8. ✅ Ledger balance calculation consistency / 账本余额计算一致性
9. ✅ State machine: PLACED → CANCELLED / 状态机：已下注 → 已取消
10. ✅ State machine: PLACED → SETTLED / 状态机：已下注 → 已结算

## Database Schema / 数据库架构

### User / 用户表
- `id`: Unique identifier / 唯一标识符
- `username`: Unique username / 唯一用户名
- `balance`: Current balance (Decimal) / 当前余额
- `createdAt`: Creation timestamp / 创建时间

### Bet / 下注表
- `id`: Unique identifier (UUID) / 唯一标识符
- `userId`: Reference to User / 关联用户
- `gameId`: Game identifier / 游戏标识符
- `amount`: Bet amount (Decimal) / 下注金额
- `status`: PLACED | SETTLED | CANCELLED / 状态：已下注|已结算|已取消
- `createdAt`: Creation timestamp / 创建时间
- `updatedAt`: Last update timestamp / 更新时间

### Ledger / 账本表
- `id`: Unique identifier / 唯一标识符
- `userId`: Reference to User / 关联用户
- `betId`: Reference to Bet (optional) / 关联下注（可选）
- `type`: DEPOSIT | BET_DEBIT | BET_CREDIT | BET_REFUND / 类型：充值|下注扣款|下注发奖|下注退款
- `amount`: Transaction amount (Decimal) / 交易金额
- `description`: Transaction description / 交易描述
- `createdAt`: Creation timestamp / 创建时间

### IdempotencyKey / 幂等键表
- `id`: Unique identifier / 唯一标识符
- `endpoint`: API endpoint / API 端点
- `response`: Cached response (JSON string) / 缓存响应
- `createdAt`: Creation timestamp / 创建时间

## Architecture / 架构

### Service Layer / 服务层

The application follows a layered architecture / 应用采用分层架构:

- **Controllers/API Routes**: Handle HTTP requests and responses / 控制器/API 路由：处理 HTTP 请求和响应
- **Services**: Contain business logic (UserService, BetService, LedgerService) / 服务：包含业务逻辑
- **Repository**: Prisma ORM for database operations / 仓储：Prisma ORM 用于数据库操作

### Transaction Handling / 事务处理

All balance and ledger operations are wrapped in database transactions to ensure consistency / 所有余额和账本操作都包装在数据库事务中以确保一致性:

```typescript
await prisma.$transaction(async (tx) => {
  // Update user balance / 更新用户余额
  // Create ledger entry / 创建账本记录
  // Both succeed or both fail / 要么都成功，要么都失败
})
```

### Idempotency / 幂等性

Idempotency is implemented using a dedicated table to cache responses / 幂等性通过专用表实现响应缓存:

1. Check if idempotency key exists / 检查幂等键是否存在
2. If exists, return cached response / 如果存在，返回缓存响应
3. If not, execute operation and cache response / 如果不存在，执行操作并缓存响应
4. Validate amount consistency for deposit operations / 验证充值操作的金额一致性

## State Machine / 状态机

Bet status transitions / 下注状态流转:

```
PLACED → SETTLED (win/lose) / 已下注 → 已结算（赢/输）
PLACED → CANCELLED (refund) / 已下注 → 已取消（退款）
```

- SETTLED and CANCELLED are terminal states / 已结算和已取消是终态
- No transitions from terminal states / 终态不可再流转
- State validation enforced at service layer / 服务层强制状态验证

## Ledger Model / 账本模型

All balance changes must create corresponding ledger entries / 所有余额变更必须创建对应的账本记录:

| Ledger Type / 账本类型 | Trigger / 触发场景 | Amount / 金额 |
|-------------|---------|--------|
| DEPOSIT / 充值 | User deposit / 用户充值 | +amount |
| BET_DEBIT / 下注扣款 | Bet placed / 下注 | -amount |
| BET_CREDIT / 下注发奖 | Bet won (WIN) / 赢取 | +2×amount |
| BET_REFUND / 下注退款 | Bet cancelled / 取消 | +amount |

Balance consistency is enforced by / 余额一致性通过以下方式强制执行:
- Never directly modifying User.balance in business logic / 业务逻辑中绝不直接修改 User.balance
- Always using transactions for balance + ledger operations / 始终使用事务处理余额+账本操作
- Reconciliation API to detect anomalies / 通过对账 API 检测异常

## Deployment / 部署

### Vercel

1. Push to GitHub 
2. Import project in Vercel 
3. Add environment variable: `DATABASE_URL` (use Vercel Postgres or external SQLite) / 添加环境变量：DATABASE_URL
4. Deploy

Note: For production, consider using PostgreSQL instead of SQLite for better concurrency and scalability.
注意：生产环境建议使用 PostgreSQL 替代 SQLite 以获得更好的并发性和可扩展性。

## License / 许可证

MIT