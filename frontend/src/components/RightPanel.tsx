import React from 'react';

const RightPanel: React.FC = () => {
  const logs = [
    'at foo (/path/to/filejs:2:10)',
    'at foo (/path/to/filejs:2:10)',
    'at foo (/path/to/filejs:2:17)',
    'at foo (/path/to/filejs:2:20)'
  ];

  return (
    <div className="w-80 border-l border-gray-200 bg-white">
      {/* Logs Section */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Logs</h3>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <div
              key={i}
              className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded"
            >
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
          <span className="text-sm text-gray-500">Confidence: 87%</span>
        </div>
        
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-6">
            <button className="py-2 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm">
              Fixes
            </button>
            <button className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
              Rationale
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-gray-900 mb-2">
              foo(xs) → bar(xs)
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Change foo to bar based on the error and documentation.
            </p>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                Apply Fix
              </button>
              <button className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors">
                Ask Why
              </button>
            </div>
          </div>
        </div>

        <button className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
          <span>📤</span>
          <span>Upload</span>
        </button>
      </div>
    </div>
  );
};

export default RightPanel;