import React from 'react';
import DebugAssistant from './components/DebugAssistant';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <ProtectedRoute>
          <DebugAssistant />
        </ProtectedRoute>
      </div>
    </AuthProvider>
  );
}

export default App;
