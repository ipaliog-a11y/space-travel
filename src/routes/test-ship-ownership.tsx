import { createFileRoute } from "@tanstack/react-router";
import { testShipOwnership, type OwnershipTestReport } from "../lib/ship-ownership/test-api";

export const Route = createFileRoute("/test-ship-ownership")({
  component: TestShipOwnership,
  loader: async () => {
    const result = await testShipOwnership();
    return result;
  },
});

function TestShipOwnership() {
  const result = Route.useLoaderData() as OwnershipTestReport;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🧪 Ship Ownership Backend Tests</h1>
        <p className="text-gray-400 mb-8">
          Live testing of database and server functions
        </p>

        {/* Summary */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-400">
                {result.summary.passed}
              </div>
              <div className="text-sm text-gray-400">Passed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400">
                {result.summary.failed}
              </div>
              <div className="text-sm text-gray-400">Failed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">
                {result.summary.total}
              </div>
              <div className="text-sm text-gray-400">Total Tests</div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {result.tests.map((test, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                test.status === "pass"
                  ? "bg-gray-800 border-green-500"
                  : "bg-gray-800 border-red-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {test.status === "pass" ? "✅" : "❌"}
                  </span>
                  <span className="font-medium">{test.name}</span>
                </div>
                <span
                  className={`text-sm px-3 py-1 rounded ${
                    test.status === "pass"
                      ? "bg-green-900 text-green-300"
                      : "bg-red-900 text-red-300"
                  }`}
                >
                  {test.status.toUpperCase()}
                </span>
              </div>

              {/* Result Details */}
              {test.result && (
                <div className="mt-3 ml-10 text-sm text-gray-400 font-mono bg-gray-900 p-3 rounded">
                  {test.result}
                </div>
              )}

              {/* Error Details */}
              {test.error && (
                <div className="mt-3 ml-10 text-sm text-red-400 font-mono bg-gray-900 p-3 rounded">
                  Error: {test.error}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Test completed at: {new Date(result.timestamp).toLocaleString()}</p>
          <p className="mt-2">
            {result.success ? (
              <span className="text-green-400">
                🎉 All tests passed! Backend is working correctly.
              </span>
            ) : (
              <span className="text-red-400">
                ⚠️ Some tests failed. Check errors above.
              </span>
            )}
          </p>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            🔄 Run Tests Again
          </button>
        </div>
      </div>
    </div>
  );
}
