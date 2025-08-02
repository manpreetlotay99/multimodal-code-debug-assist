import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GeminiSuggestion, GeminiResponse, geminiService } from '../services/geminiService';

interface AISuggestionsContextType {
  suggestions: GeminiSuggestion[];
  isAnalyzing: boolean;
  analysis: string;
  confidence: number;
  analyzeCode: (code: string, language: string) => Promise<void>;
  applySuggestion: (suggestionId: string, onApply: (originalCode: string, suggestedCode: string) => void) => void;
  explainSuggestion: (suggestionId: string) => Promise<string>;
  clearSuggestions: () => void;
}

const AISuggestionsContext = createContext<AISuggestionsContextType | undefined>(undefined);

export const useAISuggestions = () => {
  const context = useContext(AISuggestionsContext);
  if (!context) {
    throw new Error('useAISuggestions must be used within AISuggestionsProvider');
  }
  return context;
};

interface AISuggestionsProviderProps {
  children: ReactNode;
}

export const AISuggestionsProvider: React.FC<AISuggestionsProviderProps> = ({ children }) => {
  const [suggestions, setSuggestions] = useState<GeminiSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [confidence, setConfidence] = useState(0);

  const analyzeCode = async (code: string, language: string) => {
    if (!code.trim()) {
      setSuggestions([]);
      setAnalysis('');
      setConfidence(0);
      return;
    }

    setIsAnalyzing(true);
    try {
      const response: GeminiResponse = await geminiService.analyzecode(code, language);
      setSuggestions(response.suggestions);
      setAnalysis(response.analysis);
      
      // Calculate average confidence
      const avgConfidence = response.suggestions.length > 0 
        ? Math.round(response.suggestions.reduce((sum, s) => sum + s.confidence, 0) / response.suggestions.length)
        : 0;
      setConfidence(avgConfidence);
    } catch (error) {
      console.error('Error analyzing code:', error);
      setSuggestions([]);
      setAnalysis('Failed to analyze code. Please try again.');
      setConfidence(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestionId: string, onApply: (originalCode: string, suggestedCode: string) => void) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      onApply(suggestion.originalCode, suggestion.suggestedCode);
      // Remove applied suggestion
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    }
  };

  const explainSuggestion = async (suggestionId: string): Promise<string> => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return 'Suggestion not found';

    try {
      return await geminiService.explainSuggestion(suggestion, '');
    } catch (error) {
      console.error('Error explaining suggestion:', error);
      return suggestion.description;
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setAnalysis('');
    setConfidence(0);
  };

  const value: AISuggestionsContextType = {
    suggestions,
    isAnalyzing,
    analysis,
    confidence,
    analyzeCode,
    applySuggestion,
    explainSuggestion,
    clearSuggestions
  };

  return (
    <AISuggestionsContext.Provider value={value}>
      {children}
    </AISuggestionsContext.Provider>
  );
};