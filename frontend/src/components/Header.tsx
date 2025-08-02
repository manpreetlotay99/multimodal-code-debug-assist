import React from 'react';

interface HeaderProps {
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ userName = "Manpreet" }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-10 h-16 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-900">Multimodal Debug Assistant</h1>
      <div className="flex items-center space-x-2">
        <span className="text-gray-700 font-medium">{userName}</span>
        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">👤</span>
        </div>
      </div>
    </div>
  );
};

export default Header;