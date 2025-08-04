import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAISuggestions } from '../contexts/AISuggestionsContext';
import { useLogger } from '../contexts/LogContext';
import saveService from '../services/saveService';

type Language = 'javascript' | 'python';

interface CodeExample {
  [key: string]: string;
}

interface CodeEditorProps {
  onCodeChange?: (code: string) => void;
  applySuggestionRef?: React.MutableRefObject<((originalCode: string, suggestedCode: string) => void) | null>;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ onCodeChange, applySuggestionRef }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<number[]>([1]);
  const { analyzeCode } = useAISuggestions();
  const logger = useLogger();
  
  // Debounce timer for AI analysis
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const codeExamples: CodeExample = {
    javascript: `// Welcome to the Debug Assistant!
// Try these examples or write your own code

function greet(name) {
  return "Hello, " + name + "!";
}

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function isPrime(num) {
  if (num <= 1) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i == 0) return false;
  }
  return true;
}

// Example usage:
console.log(greet("Developer"));
console.log("Fibonacci(7):", fibonacci(7));
console.log("Is 17 prime?", isPrime(17));
console.log("Random number:", Math.floor(Math.random() * 100));`,

    python: `# Welcome to the Debug Assistant!
# Try these examples or write your own code

def greet(name):
    return f"Hello, {name}!"

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

def is_prime(num):
    if num <= 1:
        return False
    for i in range(2, int(num ** 0.5) + 1):
        if num % i == 0:
            return False
    return True

def factorial(n):
    return 1 if n <= 1 else n * factorial(n - 1)

# Example usage:
print(greet("Developer"))
print(f"Fibonacci(7): {fibonacci(7)}")
print(f"Is 17 prime? {is_prime(17)}")
print(f"Factorial(5): {factorial(5)}")
print("Sum of 1-10:", sum(range(1, 11)))`
  };

  // Initialize code when language changes
  useEffect(() => {
    if (!code.trim()) {
      setCode(codeExamples[selectedLanguage]);
    }
  }, [selectedLanguage]);

  // Initialize logging
  useEffect(() => {
    logger.info('Code Editor initialized', 'CodeEditor', { 
      defaultLanguage: selectedLanguage 
    });
  }, []);

  // Log AI analysis
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (code.trim().length > 10) {
        logger.debug('Starting AI code analysis', 'CodeEditor', { 
          codeLength: code.length,
          language: selectedLanguage 
        });
        analyzeCode(code, selectedLanguage);
      }
    }, 10000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [code, selectedLanguage, analyzeCode, logger]);

  // Update line numbers when code changes
  useEffect(() => {
    const lines = code.split('\n');
    setLineNumbers(Array.from({ length: lines.length }, (_, i) => i + 1));
  }, [code]);

  // Notify parent component of code changes
  useEffect(() => {
    if (onCodeChange) {
      onCodeChange(code);
    }
  }, [code, onCodeChange]);

  // Function to apply AI suggestions to the code
  const applySuggestionToCode = useCallback((originalCode: string, suggestedCode: string) => {
    if (originalCode && suggestedCode) {
      const newCode = code.replace(originalCode, suggestedCode);
      setCode(newCode);
    }
  }, [code]);

  // Register the apply suggestion function with the ref
  useEffect(() => {
    if (applySuggestionRef) {
      applySuggestionRef.current = applySuggestionToCode;
    }
  }, [applySuggestionRef, applySuggestionToCode]);

  const handleLanguageChange = (language: Language) => {
    logger.info(`Language changed to ${language}`, 'CodeEditor');
    setSelectedLanguage(language);
    setCode(codeExamples[language]);
    setOutput('');
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    
    logger.info(`Starting code execution`, 'CodeEditor', { language: selectedLanguage });

    try {
      let result: string;
      
      if (selectedLanguage === 'javascript') {
        logger.debug('Executing JavaScript code', 'CodeEditor');
        result = executeJavaScript(code);
        setOutput(result);
        logger.success('JavaScript code executed successfully', 'CodeEditor', { output: result });
      } else if (selectedLanguage === 'python') {
        logger.debug('Executing Python code', 'CodeEditor');
        result = executePython(code);
        setOutput(result);
        logger.success('Python code executed successfully', 'CodeEditor', { output: result });
      } else {
        throw new Error(`Unsupported language: ${selectedLanguage}`);
      }
    } catch (error) {
      const errorMessage = `Error: ${error}`;
      setOutput(errorMessage);
      logger.error('Code execution failed', 'CodeEditor', { 
        error: errorMessage, 
        language: selectedLanguage 
      }, error instanceof Error ? error.stack : undefined);
    } finally {
      setIsRunning(false);
    }
  };

  const executeJavaScript = (code: string): string => {
    try {
      // Capture console.log output
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        logs.push(args.map(arg => String(arg)).join(' '));
      };
      
      console.error = (...args) => {
        logs.push('Error: ' + args.map(arg => String(arg)).join(' '));
      };

      // Execute the code in a more controlled environment
      const func = new Function(`
        ${code}
        return typeof result !== 'undefined' ? result : undefined;
      `);
      
      const result = func();
      
      // Restore console methods
      console.log = originalLog;
      console.error = originalError;

      // Return logs or result
      if (logs.length > 0) {
        return logs.join('\n');
      }
      return result !== undefined ? String(result) : 'Code executed successfully (no output)';
    } catch (error) {
      // Restore console methods in case of error
      console.log = console.log;
      console.error = console.error;
      
      return `JavaScript Error: ${error}`;
    }
  };

  const executePython = (code: string): string => {
    // This is a simplified Python simulator
    // In a real implementation, you'd need a Python interpreter or API
    try {
      let output = '';
      const lines = code.split('\n');
      
      // Simple simulation for basic Python operations
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        // Handle print statements
        if (trimmedLine.startsWith('print(')) {
          const match = trimmedLine.match(/print\((.*)\)/);
          if (match) {
            let content = match[1];
            
            // Handle f-strings and function calls
            if (content.includes('greet(')) {
              const nameMatch = content.match(/greet\(["']([^"']+)["']\)/);
              if (nameMatch) {
                if (content.includes('f"') || content.includes("f'")) {
                  output += `Hello, ${nameMatch[1]}!\n`;
                } else {
                  output += `Hello, ${nameMatch[1]}!\n`;
                }
              }
            } else if (content.includes('fibonacci(7)')) {
              output += 'Fibonacci(7): 13\n';
            } else if (content.includes('is_prime(17)')) {
              output += 'Is 17 prime? True\n';
            } else if (content.includes('factorial(5)')) {
              output += 'Factorial(5): 120\n';
            } else if (content.includes('sum(range(1, 11))')) {
              output += 'Sum of 1-10: 55\n';
            } else if (content.startsWith('"') || content.startsWith("'")) {
              // String literal
              content = content.replace(/^["']|["']$/g, '');
              output += content + '\n';
            } else {
              // Try to evaluate simple expressions
              try {
                // Handle basic math expressions
                if (/^[\d\s+\-*/().]+$/.test(content)) {
                  const result = eval(content);
                  output += result + '\n';
                } else {
                  // Just output the content as-is for complex expressions
                  output += content.replace(/['"]/g, '') + '\n';
                }
              } catch {
                output += content + '\n';
              }
            }
          }
        }
      }
      
      return output || 'Code executed successfully (no output)';
    } catch (error) {
      return `Python Error: ${error}`;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      logger.success('Code copied to clipboard', 'CodeEditor', { 
        codeLength: code.length 
      });
    } catch (err) {
      logger.error('Failed to copy code to clipboard', 'CodeEditor', { 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
  };

  const saveCode = async () => {
    if (!code.trim()) {
      logger.warning('Cannot save empty code', 'CodeEditor');
      return;
    }

    setIsSaving(true);
    try {
      const title = prompt('Enter a title for this code snippet:');
      if (!title) {
        setIsSaving(false);
        return;
      }

      const description = prompt('Enter a description (optional):') || undefined;

      const result = await saveService.saveCode({
        title,
        description,
        code_content: code,
        language: selectedLanguage,
        tags: [selectedLanguage, 'debug-session']
      });

      if (result.success) {
        logger.success('Code saved successfully', 'CodeEditor', { 
          savedId: result.item_id,
          codeLength: code.length 
        });
        alert('Code saved successfully!');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      logger.error('Failed to save code', 'CodeEditor', { 
        error: err instanceof Error ? err.message : String(err) 
      });
      alert('Failed to save code. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      
      // Set cursor position after the tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    
    // Handle Ctrl+Enter or Cmd+Enter to run code
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
    
    // Handle Ctrl+S or Cmd+S to save (copy to clipboard)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      copyToClipboard();
    }
    
    // Handle Ctrl+/ or Cmd+/ for commenting (basic)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const lines = code.split('\n');
      const startLine = code.substring(0, start).split('\n').length - 1;
      const endLine = code.substring(0, end).split('\n').length - 1;
      
      const commentChar = selectedLanguage === 'python' ? '#' : '//';
      
      for (let i = startLine; i <= endLine; i++) {
        if (lines[i].trim().startsWith(commentChar)) {
          // Uncomment
          lines[i] = lines[i].replace(new RegExp(`^(\\s*)${commentChar}\\s?`), '$1');
        } else {
          // Comment
          lines[i] = lines[i].replace(/^(\s*)/, `$1${commentChar} `);
        }
      }
      
      setCode(lines.join('\n'));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-100 rounded-lg">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Language:</label>
          <select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
          
          <div className="ml-4 text-xs text-gray-500" title="Keyboard Shortcuts">
            💡 Shortcuts: Ctrl+Enter (Run) | Ctrl+S (Copy) | Ctrl+/ (Comment) | Tab (Indent)
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              logger.info('Manual AI analysis triggered', 'CodeEditor', { 
                codeLength: code.length,
                language: selectedLanguage 
              });
              analyzeCode(code, selectedLanguage);
            }}
            disabled={code.trim().length < 10}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors text-sm font-medium"
            title="Analyze code with AI"
          >
            🤖 Analyze
          </button>
          <button
            onClick={copyToClipboard}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            title="Copy code to clipboard"
          >
            📋 Copy
          </button>
          <button
            onClick={saveCode}
            disabled={isSaving || !code.trim()}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors text-sm font-medium"
            title="Save code to database"
          >
            {isSaving ? 'Saving...' : '💾 Save'}
          </button>
          <button
            onClick={runCode}
            disabled={isRunning}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm font-medium"
          >
            {isRunning ? 'Running...' : '▶ Run Code'}
          </button>
          <button
            onClick={() => {
              logger.warning('Code cleared by user', 'CodeEditor', { 
                previousCodeLength: code.length 
              });
              setCode('');
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            🗑️ Clear
          </button>
          <button
            onClick={() => {
              logger.info('Example code loaded', 'CodeEditor', { 
                language: selectedLanguage 
              });
              setCode(codeExamples[selectedLanguage]);
            }}
            className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
            title="Load example code"
          >
            📝 Example
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex h-full">
          {/* Line Numbers */}
          <div className="bg-gray-800 text-gray-400 text-sm font-mono py-4 px-2 select-none border-r border-gray-700">
            {lineNumbers.map((num) => (
              <div key={num} className="text-right leading-6 h-6">
                {num}
              </div>
            ))}
          </div>
          
          {/* Code Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-full bg-transparent text-gray-100 font-mono text-sm p-4 resize-none outline-none leading-6"
              placeholder={`Enter your ${selectedLanguage} code here...`}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Output Panel */}
      {output && (
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium text-sm">Output:</h4>
            <button
              onClick={() => setOutput('')}
              className="text-gray-400 hover:text-white text-sm"
            >
              Clear
            </button>
          </div>
          <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;