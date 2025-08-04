import React, { useState, useRef } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import RightPanel from './RightPanel';
import { AISuggestionsProvider } from '../contexts/AISuggestionsContext';
import { LogProvider } from '../contexts/LogContext';
import { DebugAssistantProvider } from '../contexts/DebugAssistantContext';

const DebugAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('Code');
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('Code');
  const applySuggestionRef = useRef<((originalCode: string, suggestedCode: string) => void) | null>(null);

  const handleApplySuggestion = (originalCode: string, suggestedCode: string) => {
    if (applySuggestionRef.current) {
      applySuggestionRef.current(originalCode, suggestedCode);
    }
  };

  // Sync sidebar selection with main tab
  const handleSidebarItemClick = (item: string) => {
    setActiveSidebarItem(item);
    setActiveTab(item);
  };

  return (
    <LogProvider>
      <DebugAssistantProvider>
        <AISuggestionsProvider>
          <div className="flex h-screen bg-gray-50">
            <Header userName="Manpreet" />
            <Sidebar 
              activeSidebarItem={activeSidebarItem} 
              setActiveSidebarItem={handleSidebarItemClick} 
            />
            
            <div className="flex-1 ml-60 mt-16 flex">
              <MainContent 
                activeTab={activeTab} 
                setActiveTab={setActiveTab}
                applySuggestionRef={applySuggestionRef}
              />
              <RightPanel onApplySuggestion={handleApplySuggestion} />
            </div>
          </div>
        </AISuggestionsProvider>
      </DebugAssistantProvider>
    </LogProvider>
  );
};

export default DebugAssistant;