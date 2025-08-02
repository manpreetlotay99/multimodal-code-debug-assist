import React, { useEffect } from 'react';
import CodeEditor from './CodeEditor';
import LogViewer from './LogViewer';

interface MainContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  applySuggestionRef: React.MutableRefObject<((originalCode: string, suggestedCode: string) => void) | null>;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab, setActiveTab, applySuggestionRef }) => {
  const tabs = ['Code', 'Logs', 'Screenshots'];

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-hidden">
        {activeTab === 'Code' && (
          <div className="h-full">
            <CodeEditor 
              onCodeChange={(code) => {
                // Could be used for additional code change handling
              }}
              applySuggestionRef={applySuggestionRef}
            />
          </div>
        )}
        
        {activeTab === 'Logs' && (
          <div className="h-full">
            <LogViewer />
          </div>
        )}
        
        {activeTab === 'Screenshots' && (
          <div className="bg-gray-50 rounded-lg p-4 h-full overflow-auto">
            <p className="text-gray-600">Screenshots content would go here...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainContent;