export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Forecasting Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          A simplified Polymarket-like forecasting platform with idempotency,
          state machine control, and ledger reconciliation.
        </p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">API Endpoints</h2>
          <ul className="space-y-2 text-gray-700">
            <li>
              <strong className="text-blue-600">POST</strong>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                /api/users/:id/deposit
              </code>{' '}
              - Deposit funds with idempotency
            </li>
            <li>
              <strong className="text-blue-600">POST</strong>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">/api/bets</code> - Place a bet
            </li>
            <li>
              <strong className="text-blue-600">POST</strong>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                /api/bets/:id/settle
              </code>{' '}
              - Settle a bet (WIN/LOSE)
            </li>
            <li>
              <strong className="text-blue-600">POST</strong>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                /api/bets/:id/cancel
              </code>{' '}
              - Cancel a bet with refund
            </li>
            <li>
              <strong className="text-green-600">GET</strong>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                /api/admin/reconcile?userId=...
              </code>{' '}
              - Reconcile accounts
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✓ Idempotency handling for all mutations</li>
            <li>✓ State machine for bet status (PLACED → SETTLED/CANCELLED)</li>
            <li>✓ Ledger model for transaction tracking</li>
            <li>✓ Account reconciliation with anomaly detection</li>
            <li>✓ Database transactions for consistency</li>
            <li>✓ Comprehensive test coverage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
