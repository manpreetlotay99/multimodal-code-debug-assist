# 🎨 Frontend Setup - AI Debug Assistant UI

React TypeScript application with authentication, code editing, and AI-powered debugging interface.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Configuration
Create `.env` file in the frontend directory:
```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8000

# Optional: Enable development features
REACT_APP_ENV=development

# Optional: Logging level
REACT_APP_LOG_LEVEL=info
```

### 3. Start Development Server
```bash
npm start
```

The application will open at http://localhost:3000

### 4. Build for Production
```bash
npm run build
```

## 📦 Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^4.9.5",
  "@types/react": "^18.2.43",
  "@types/react-dom": "^18.2.17"
}
```

### Styling Dependencies
```json
{
  "tailwindcss": "^3.3.6",
  "@tailwindcss/forms": "^0.5.7",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.32"
}
```

### Development Dependencies
```json
{
  "react-scripts": "5.0.1",
  "@testing-library/react": "^13.4.0",
  "@testing-library/jest-dom": "^5.16.5",
  "@testing-library/user-event": "^13.5.0"
}
```

## 🏗️ Project Structure

```
frontend/src/
├── App.tsx                     # Main application component
├── App.css                     # Global styles
├── index.tsx                   # React DOM entry point
├── index.css                   # Tailwind CSS imports
├── components/
│   ├── CodeEditor.tsx          # Code editor with syntax highlighting
│   ├── LogViewer.tsx           # Log management and filtering
│   ├── RightPanel.tsx          # AI suggestions and logs panel
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── Header.tsx              # App header with user menu
│   ├── MainContent.tsx         # Main content area with tabs
│   ├── DebugAssistant.tsx      # Main debug interface wrapper
│   ├── MultimodalDebugAssistant.tsx # Multimodal input interface
│   ├── LoginPage.tsx           # Authentication interface
│   └── ProtectedRoute.tsx      # Route protection component
├── contexts/
│   ├── AuthContext.tsx         # Authentication state management
│   ├── LogContext.tsx          # Application logging system
│   ├── AISuggestionsContext.tsx # AI analysis state
│   └── DebugAssistantContext.tsx # Debug session management
├── services/
│   ├── backendApiService.ts    # Backend API client
│   ├── saveService.ts          # Save functionality API
│   └── geminiService.ts        # AI service integration
└── public/
    ├── index.html              # HTML template
    ├── favicon.ico             # App icon
    └── manifest.json           # PWA manifest
```

## 🎯 Core Features

### 🔐 Authentication System
- **Login/Signup**: JWT-based authentication
- **Protected Routes**: Automatic login redirect
- **User Profile**: Header dropdown with user info
- **Token Management**: Automatic token refresh

### 📝 Code Editor
- **Syntax Highlighting**: JavaScript and Python support
- **Live Analysis**: Debounced AI code analysis
- **Code Execution**: Run JavaScript/Python in browser
- **Save Functionality**: Persist code to database
- **Copy/Paste**: Clipboard integration
- **Example Code**: Pre-loaded code samples

### 📊 Log Management
- **Real-time Logging**: Application-wide logging system
- **Log Filtering**: Filter by level, source, and search terms
- **Log Export**: JSON export functionality
- **Log Persistence**: Save log collections to database
- **Auto-scroll**: Automatic scroll to latest logs

### 🤖 AI Debug Assistant
- **Multimodal Input**: Code, logs, files, screenshots
- **Agent Workflows**: Visual workflow progress
- **Smart Suggestions**: AI-generated code improvements
- **Fix Application**: One-click code fixes
- **Session Management**: Persistent debug sessions

## 🎨 UI Components

### Layout Components
```typescript
// Main application layout
<AuthProvider>
  <ProtectedRoute>
    <DebugAssistant>
      <Header />
      <div className="flex">
        <Sidebar />
        <MainContent />
        <RightPanel />
      </div>
    </DebugAssistant>
  </ProtectedRoute>
</AuthProvider>
```

### Context Providers
```typescript
// Context hierarchy
<AuthProvider>           // User authentication
  <LogProvider>          // Application logging
    <AISuggestionsProvider>    // Code analysis
      <DebugAssistantProvider> // Debug sessions
        {/* App components */}
      </DebugAssistantProvider>
    </AISuggestionsProvider>
  </LogProvider>
</AuthProvider>
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_BACKEND_URL` | Backend API base URL | `http://localhost:8000` |
| `REACT_APP_ENV` | Environment mode | `development` |
| `REACT_APP_LOG_LEVEL` | Frontend logging level | `info` |

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["react", "react-dom"]
  },
  "include": ["src"]
}
```

## 🔌 API Integration

### Authentication Service
```typescript
// Authentication context usage
const { user, login, logout, isAuthenticated } = useAuth();

// Login example
const handleLogin = async () => {
  const success = await login('username', 'password');
  if (success) {
    // Redirect to main app
  }
};
```

### Backend API Service
```typescript
// API service usage
import backendApiService from '../services/backendApiService';

// Get agents
const agents = await backendApiService.getAgents();

// Start analysis
const workflowId = await backendApiService.startAnalysis('session-id');

// Get suggestions
const suggestions = await backendApiService.getSuggestions(workflowId);
```

### Save Service
```typescript
// Save code snippet
import saveService from '../services/saveService';

const result = await saveService.saveCode({
  title: 'My Code',
  description: 'Sample code',
  code_content: 'console.log("Hello");',
  language: 'javascript',
  tags: ['debug', 'sample']
});
```

## 🎭 State Management

### Context Pattern
The application uses React Context for state management:

#### Auth Context
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}
```

#### Log Context
```typescript
interface LogContextType {
  logs: LogEntry[];
  addLog: (level: LogLevel, message: string, source?: string, details?: any) => void;
  clearLogs: () => void;
  getLogCounts: () => LogCounts;
}
```

#### Debug Assistant Context
```typescript
interface DebugAssistantContextType {
  agents: AIAgent[];
  currentInputs: DebugInput[];
  currentWorkflow: AgentWorkflow | null;
  isAnalyzing: boolean;
  addInput: (type: string, content: string) => Promise<void>;
  startAnalysis: () => Promise<void>;
  clearSession: () => void;
}
```

## 🎨 Styling Guide

### Color Palette
```css
/* Primary Colors */
--blue-50: #eff6ff;
--blue-500: #3b82f6;
--blue-600: #2563eb;
--blue-700: #1d4ed8;

/* Status Colors */
--green-500: #10b981;  /* Success */
--red-500: #ef4444;    /* Error */
--yellow-500: #f59e0b; /* Warning */
--gray-500: #6b7280;   /* Info */
```

### Component Styling Patterns
```typescript
// Button variants
const buttonClasses = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-600 hover:bg-gray-700 text-white",
  success: "bg-green-600 hover:bg-green-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white"
};

// Card styling
const cardClasses = "bg-white rounded-lg border border-gray-200 shadow-sm";

// Input styling
const inputClasses = "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
```

## 🧪 Development

### Available Scripts
```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Format code
npm run format

# Eject (not recommended)
npm run eject
```

### Development Tools
```bash
# Install React Developer Tools
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

# TypeScript error checking
npx tsc --noEmit

# Bundle analysis
npm run build
npx serve -s build
```

### Hot Reloading
The development server supports:
- **Hot Module Replacement**: Instant updates without page refresh
- **Error Overlay**: Full-screen error display during development
- **TypeScript Checking**: Real-time type checking

## 🧪 Testing

### Test Structure
```
src/
├── components/
│   ├── __tests__/
│   │   ├── CodeEditor.test.tsx
│   │   ├── LogViewer.test.tsx
│   │   └── LoginPage.test.tsx
│   └── ...
├── contexts/
│   ├── __tests__/
│   │   ├── AuthContext.test.tsx
│   │   └── LogContext.test.tsx
│   └── ...
└── services/
    ├── __tests__/
    │   ├── backendApiService.test.ts
    │   └── saveService.test.ts
    └── ...
```

### Test Examples
```typescript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import LoginPage from '../LoginPage';

test('renders login form', () => {
  render(<LoginPage />);
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

// Context testing
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

test('login updates authentication state', async () => {
  const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;
  const { result } = renderHook(() => useAuth(), { wrapper });
  
  await act(async () => {
    await result.current.login('admin', '1234');
  });
  
  expect(result.current.isAuthenticated).toBe(true);
});
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Module Resolution Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear React scripts cache
rm -rf node_modules/.cache
```

#### 2. TypeScript Errors
```bash
# Check TypeScript configuration
npx tsc --showConfig

# Restart TypeScript service in VS Code
Cmd+Shift+P > "TypeScript: Restart TS Server"
```

#### 3. Build Failures
```bash
# Check for circular dependencies
npm run build 2>&1 | grep -i "circular"

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### 4. API Connection Issues
```bash
# Check backend server status
curl http://localhost:8000/

# Verify environment variables
echo $REACT_APP_BACKEND_URL

# Check browser console for CORS errors
# Open Developer Tools > Console
```

### Performance Optimization

#### Bundle Size Analysis
```bash
# Install bundle analyzer
npm install --save-dev webpack-bundle-analyzer

# Analyze bundle
npm run build
npx webpack-bundle-analyzer build/static/js/*.js
```

#### Code Splitting
```typescript
// Lazy load components
import { lazy, Suspense } from 'react';

const DebugAssistant = lazy(() => import('./components/DebugAssistant'));

function App() {
  return (
    <div className="App">
      <Suspense fallback={<div>Loading...</div>}>
        <DebugAssistant />
      </Suspense>
    </div>
  );
}
```

#### Memory Leaks Prevention
```typescript
// Cleanup subscriptions in useEffect
useEffect(() => {
  const subscription = eventEmitter.subscribe(handler);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);

// Cleanup timers
useEffect(() => {
  const timer = setTimeout(() => {
    // Do something
  }, 1000);
  
  return () => {
    clearTimeout(timer);
  };
}, []);
```

## 🌐 Production Deployment

### Build Configuration
```bash
# Production build
npm run build

# Serve static files
npm install -g serve
serve -s build -l 3000
```

### Environment Configuration
```env
# Production environment variables
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_ENV=production
REACT_APP_LOG_LEVEL=error
```

### Docker Deployment
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name localhost;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

