import React from 'react';

interface SidebarItem {
  name: string;
  icon: string;
}

interface SidebarProps {
  activeSidebarItem: string;
  setActiveSidebarItem: (item: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSidebarItem, setActiveSidebarItem }) => {
  const sidebarItems: SidebarItem[] = [
    { name: 'Code', icon: '📄' },
    { name: 'Logs', icon: '📋' },
    { name: 'AI Debug Assistant', icon: '🚀' },
  ];

  return (
    <div className="fixed left-0 top-16 bottom-0 w-60 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4">
        {sidebarItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setActiveSidebarItem(item.name)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors mb-1 ${
              activeSidebarItem === item.name
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;