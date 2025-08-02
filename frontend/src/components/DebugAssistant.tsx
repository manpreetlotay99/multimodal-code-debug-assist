import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import RightPanel from './RightPanel';

const DebugAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('Code');
  const [activeSidebarItem, setActiveSidebarItem] = useState<string>('Code');

  return (
    <div className="flex h-screen bg-gray-50">
      <Header userName="Manpreet" />
      <Sidebar 
        activeSidebarItem={activeSidebarItem} 
        setActiveSidebarItem={setActiveSidebarItem} 
      />
      
      <div className="flex-1 ml-60 mt-16 flex">
        <MainContent 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        <RightPanel />
      </div>
    </div>
  );
};

export default DebugAssistant;