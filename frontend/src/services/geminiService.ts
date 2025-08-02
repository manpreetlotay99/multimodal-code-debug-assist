interface GeminiSuggestion {
  id: string;
  title: string;
  description: string;
  originalCode: string;
  suggestedCode: string;
  confidence: number;
  type: 'fix' | 'optimization' | 'refactor';
  line?: number;
}

interface GeminiResponse {
  suggestions: GeminiSuggestion[];
  analysis: string;
}

class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    // In production, this should come from environment variables
    this.apiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
  }

  async analyzecode(code: string, language: string): Promise<GeminiResponse> {
    if (!this.apiKey) {
      console.warn('Gemini API key not configured');
      return this.getMockSuggestions(code, language);
    }

    try {
      const prompt = this.createAnalysisPrompt(code, language);
      
      const response = await fetch(`${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return this.parseGeminiResponse(analysisText, code);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return this.getMockSuggestions(code, language);
    }
  }

  private createAnalysisPrompt(code: string, language: string): string {
    return `
Analyze this ${language} code and provide suggestions for improvements, bug fixes, and optimizations.

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Please provide your response in the following JSON format:
{
  "suggestions": [
    {
      "id": "unique-id",
      "title": "Brief title of the suggestion",
      "description": "Detailed explanation",
      "originalCode": "code snippet to replace",
      "suggestedCode": "improved code snippet",
      "confidence": 85,
      "type": "fix|optimization|refactor",
      "line": 5
    }
  ],
  "analysis": "Overall analysis of the code quality and main issues"
}

Focus on:
1. Potential bugs or errors
2. Performance optimizations
3. Code readability improvements
4. Best practices violations
5. Security issues

Provide specific, actionable suggestions with code examples.
`;
  }

  private parseGeminiResponse(response: string, originalCode: string): GeminiResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          suggestions: parsed.suggestions || [],
          analysis: parsed.analysis || response
        };
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
    }

    // Fallback: create suggestions from text response
    return {
      suggestions: this.extractSuggestionsFromText(response, originalCode),
      analysis: response
    };
  }

  private extractSuggestionsFromText(text: string, originalCode: string): GeminiSuggestion[] {
    const suggestions: GeminiSuggestion[] = [];
    
    // Simple pattern matching for common suggestions
    const lines = text.split('\n');
    let id = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      if (line.includes('error') || line.includes('bug') || line.includes('fix')) {
        suggestions.push({
          id: `suggestion-${id++}`,
          title: 'Potential Issue Found',
          description: lines[i].trim(),
          originalCode: '',
          suggestedCode: '',
          confidence: 75,
          type: 'fix'
        });
      } else if (line.includes('optimize') || line.includes('performance')) {
        suggestions.push({
          id: `suggestion-${id++}`,
          title: 'Optimization Opportunity',
          description: lines[i].trim(),
          originalCode: '',
          suggestedCode: '',
          confidence: 70,
          type: 'optimization'
        });
      }
    }

    return suggestions;
  }

  private getMockSuggestions(code: string, language: string): GeminiResponse {
    const suggestions: GeminiSuggestion[] = [];

    // Mock suggestions based on common patterns
    if (code.includes('console.log')) {
      suggestions.push({
        id: 'remove-console-log',
        title: 'Remove console.log statements',
        description: 'Console.log statements should be removed before production deployment.',
        originalCode: 'console.log(',
        suggestedCode: '// console.log(',
        confidence: 90,
        type: 'fix'
      });
    }

    if (code.includes('var ')) {
      suggestions.push({
        id: 'use-let-const',
        title: 'Use let/const instead of var',
        description: 'Using let or const provides better scoping and prevents hoisting issues.',
        originalCode: 'var ',
        suggestedCode: 'const ',
        confidence: 95,
        type: 'refactor'
      });
    }

    if (language === 'javascript' && code.includes('==')) {
      suggestions.push({
        id: 'strict-equality',
        title: 'Use strict equality (===)',
        description: 'Use === instead of == to avoid type coercion issues.',
        originalCode: '==',
        suggestedCode: '===',
        confidence: 85,
        type: 'fix'
      });
    }

    if (code.length > 500) {
      suggestions.push({
        id: 'break-down-function',
        title: 'Consider breaking down large functions',
        description: 'Large functions can be harder to maintain. Consider splitting into smaller, focused functions.',
        originalCode: '',
        suggestedCode: '',
        confidence: 70,
        type: 'refactor'
      });
    }

    return {
      suggestions,
      analysis: `Analyzed ${language} code with ${code.split('\n').length} lines. Found ${suggestions.length} potential improvements.`
    };
  }

  async explainSuggestion(suggestion: GeminiSuggestion, code: string): Promise<string> {
    if (!this.apiKey) {
      return `This suggestion (${suggestion.title}) helps improve your code by: ${suggestion.description}`;
    }

    try {
      const prompt = `
Explain why this code suggestion is important and how it improves the code:

Original issue: ${suggestion.title}
Description: ${suggestion.description}
Original code: ${suggestion.originalCode}
Suggested code: ${suggestion.suggestedCode}

Please provide a clear, educational explanation suitable for a developer.
`;

      const response = await fetch(`${this.baseUrl}/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          }
        })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || suggestion.description;
    } catch (error) {
      console.error('Error explaining suggestion:', error);
      return suggestion.description;
    }
  }
}

export const geminiService = new GeminiService();
export type { GeminiSuggestion, GeminiResponse };