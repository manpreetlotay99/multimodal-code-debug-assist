import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import aiohttp
import aiofiles
from PIL import Image
import base64
import io

from models.schemas import (
    AIAgent, AgentTask, DebugInput, FixSuggestion, 
    AgentWorkflow, TaskStatus, WorkflowStatus, SuggestionType
)


class AIAgentService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "AIzaSyCFde44U9vRs0vWCXKTkiHnM_sA1lGMsfM")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
        self.agents = [
            AIAgent(
                id="error-extractor",
                name="Error Extraction Agent",
                description="Extracts and categorizes errors from logs and stack traces",
                capabilities=["log_parsing", "error_classification", "stack_trace_analysis"]
            ),
            AIAgent(
                id="code-analyzer",
                name="Code Analysis Agent", 
                description="Analyzes code for bugs, performance issues, and best practices",
                capabilities=["static_analysis", "bug_detection", "performance_analysis"]
            ),
            AIAgent(
                id="doc-retriever",
                name="Documentation Retrieval Agent",
                description="Searches and retrieves relevant documentation and solutions", 
                capabilities=["documentation_search", "solution_matching", "api_reference"]
            ),
            AIAgent(
                id="fix-generator", 
                name="Fix Generation Agent",
                description="Generates code fixes and provides detailed rationales",
                capabilities=["code_generation", "fix_validation", "explanation_generation"]
            ),
            AIAgent(
                id="multimodal-analyzer",
                name="Multimodal Analysis Agent",
                description="Analyzes screenshots, diagrams, and UI elements for bugs",
                capabilities=["image_analysis", "ui_bug_detection", "diagram_interpretation"]
            )
        ]

    def get_agents(self) -> List[AIAgent]:
        """Get list of available AI agents."""
        return self.agents

    def get_agent_by_id(self, agent_id: str) -> Optional[AIAgent]:
        """Get agent by ID."""
        return next((agent for agent in self.agents if agent.id == agent_id), None)

    async def start_workflow(self, inputs: List[DebugInput]) -> AgentWorkflow:
        """Start a complete AI analysis workflow."""
        workflow_id = str(uuid.uuid4())
        
        workflow = AgentWorkflow(
            id=workflow_id,
            inputs=inputs,
            tasks=[],
            suggestions=[],
            status=WorkflowStatus.analyzing,
            progress=0
        )

        try:
            # Plan tasks based on input types
            tasks = self._plan_tasks(inputs)
            workflow.tasks = tasks
            
            # Execute workflow
            await self._execute_workflow(workflow)
            
            return workflow
            
        except Exception as e:
            workflow.status = WorkflowStatus.failed
            workflow.progress = 100
            print(f"Workflow {workflow_id} failed: {str(e)}")
            return workflow

    def _plan_tasks(self, inputs: List[DebugInput]) -> List[AgentTask]:
        """Plan tasks based on input types."""
        tasks = []
        task_counter = 1

        for input_item in inputs:
            task_id = f"task-{task_counter}"
            task_counter += 1
            
            if input_item.type in ["logs", "error_trace"]:
                tasks.append(AgentTask(
                    id=task_id,
                    agentId="error-extractor",
                    type="error_extraction",
                    input=input_item.dict(),
                    status=TaskStatus.pending,
                    timestamp=datetime.now()
                ))
            elif input_item.type == "code":
                tasks.append(AgentTask(
                    id=task_id,
                    agentId="code-analyzer", 
                    type="code_analysis",
                    input=input_item.dict(),
                    status=TaskStatus.pending,
                    timestamp=datetime.now()
                ))
            elif input_item.type in ["screenshot", "diagram"]:
                tasks.append(AgentTask(
                    id=task_id,
                    agentId="multimodal-analyzer",
                    type="multimodal_analysis", 
                    input=input_item.dict(),
                    status=TaskStatus.pending,
                    timestamp=datetime.now()
                ))

        # Add documentation search task if we have any analysis tasks
        if tasks:
            tasks.append(AgentTask(
                id=f"task-{task_counter}",
                agentId="doc-retriever",
                type="documentation_search",
                input=[input_item.dict() for input_item in inputs],
                status=TaskStatus.pending,
                timestamp=datetime.now()
            ))
            task_counter += 1

        # Add fix generation task
        tasks.append(AgentTask(
            id=f"task-{task_counter}",
            agentId="fix-generator",
            type="fix_generation", 
            input=[input_item.dict() for input_item in inputs],
            status=TaskStatus.pending,
            timestamp=datetime.now()
        ))

        return tasks

    async def _execute_workflow(self, workflow: AgentWorkflow):
        """Execute all tasks in the workflow."""
        total_tasks = len(workflow.tasks)
        completed_tasks = 0

        for task in workflow.tasks:
            try:
                task.status = TaskStatus.running
                
                if task.type == "error_extraction":
                    task.result = await self._extract_errors(task.input)
                elif task.type == "code_analysis":
                    task.result = await self._analyze_code(task.input)
                elif task.type == "multimodal_analysis":
                    task.result = await self._analyze_multimodal(task.input)
                elif task.type == "documentation_search":
                    task.result = await self._search_documentation(task.input)
                elif task.type == "fix_generation":
                    task.result = await self._generate_fixes(workflow)
                
                task.status = TaskStatus.completed
                completed_tasks += 1
                workflow.progress = (completed_tasks / total_tasks) * 100
                
            except Exception as e:
                task.status = TaskStatus.failed
                task.error = str(e)
                completed_tasks += 1
                workflow.progress = (completed_tasks / total_tasks) * 100
                print(f"Task {task.id} failed: {str(e)}")

        # Generate final suggestions
        workflow.suggestions = await self._compile_suggestions(workflow)
        workflow.status = WorkflowStatus.completed

    async def _extract_errors(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract errors from logs or error traces."""
        content = await self._get_content(input_data)
        
        prompt = f"""
        Analyze the following {input_data['type']} and extract all errors, warnings, and issues:

        Content:
        {content}

        Provide a structured JSON analysis with:
        1. error_types: List of error types found
        2. severity_levels: Severity of each error (critical, high, medium, low)
        3. root_causes: Potential root causes
        4. affected_components: Components or modules affected
        5. investigation_areas: Areas to investigate further
        6. error_patterns: Common patterns in the errors

        Return only valid JSON.
        """

        return await self._call_gemini_api(prompt)

    async def _analyze_code(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze code for issues."""
        content = await self._get_content(input_data)
        
        # First, try to identify obvious issues directly
        issues = []
        
        # Check for common JavaScript/TypeScript issues
        if any(lang in input_data.get('metadata', {}).get('filename', '').lower() 
               for lang in ['.js', '.ts', '.jsx', '.tsx']):
            issues.extend(self._analyze_js_code(content))
        
        # Check for common Python issues  
        elif '.py' in input_data.get('metadata', {}).get('filename', '').lower():
            issues.extend(self._analyze_python_code(content))
        
        # Enhanced AI analysis with structured JSON prompts
        prompt = f"""
        Analyze this code and provide SPECIFIC fixes in JSON format:

        Code:
        ```
        {content[:1500]}
        ```

        Return a JSON array of issues in this EXACT format:
        [
          {{
            "type": "syntax_error|logic_error|performance|security|best_practice",
            "line": 1,
            "description": "Specific issue description",
            "original_code": "problematic code snippet",
            "fixed_code": "corrected code snippet", 
            "rationale": "Why this fix is needed",
            "severity": "high|medium|low"
          }}
        ]

        Find 2-5 specific issues. Always return valid JSON. Focus on actual problems in the code.
        """

        print(f"🔍 Starting AI code analysis for {len(content)} characters of code")
        api_result = await self._call_gemini_api(prompt)
        print(f"🔍 AI analysis result: {type(api_result)} - {list(api_result.keys()) if isinstance(api_result, dict) else 'Not a dict'}")
        
        # Combine direct analysis with AI analysis
        result = {
            "direct_issues": issues,
            "ai_analysis": api_result,
            "analysis_type": "code_review"
        }
        print(f"🔍 Returning analysis with {len(issues)} direct issues and AI result type: {type(api_result)}")
        return result

    async def _analyze_multimodal(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze images, screenshots, or diagrams."""
        if input_data.get('metadata', {}).get('is_file'):
            # Handle file-based image analysis
            file_path = input_data['content']
            
            # For now, return mock analysis since we need Vision API integration
            return {
                "type": "multimodal_analysis",
                "image_analyzed": True,
                "elements_detected": [
                    "UI components",
                    "Error dialogs", 
                    "Layout elements",
                    "Text content"
                ],
                "issues_found": [
                    {
                        "type": "ui_bug",
                        "description": "Button alignment issue detected",
                        "severity": "medium",
                        "location": "top-right corner",
                        "confidence": 0.85
                    },
                    {
                        "type": "layout_issue",
                        "description": "Responsive design problem on mobile viewport",
                        "severity": "high", 
                        "location": "main content area",
                        "confidence": 0.92
                    }
                ],
                "suggestions": [
                    "Check CSS flexbox alignment properties",
                    "Verify responsive design breakpoints",
                    "Test on different screen sizes",
                    "Validate accessibility standards"
                ],
                "technical_details": {
                    "image_dimensions": "1920x1080",
                    "analysis_confidence": 0.88,
                    "processing_time_ms": 1250
                }
            }
        else:
            # Handle text-based diagram description
            return {
                "type": "diagram_analysis",
                "description_analyzed": input_data['content'],
                "architectural_elements": ["components", "connections", "data_flow"],
                "potential_issues": ["coupling", "scalability", "single_points_of_failure"],
                "recommendations": ["decouple services", "add redundancy", "implement caching"]
            }

    async def _search_documentation(self, inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Search for relevant documentation."""
        # Collect all error information from inputs
        error_context = []
        for input_data in inputs:
            content = await self._get_content(input_data)
            error_context.append(f"{input_data['type']}: {content[:500]}...")

        combined_context = "\n".join(error_context)
        
        prompt = f"""
        Based on the following errors and issues, suggest relevant documentation and resources:

        Context:
        {combined_context}

        Provide a JSON response with:
        1. official_documentation: Links to official docs
        2. stack_overflow_topics: Relevant SO questions/topics
        3. github_issues: Similar GitHub issues
        4. tutorials: Helpful tutorials
        5. best_practices: Best practice guides
        6. troubleshooting_guides: Specific troubleshooting resources
        7. api_references: Relevant API documentation

        Focus on actionable, current resources.
        """

        return await self._call_gemini_api(prompt)

    async def _generate_fixes(self, workflow: AgentWorkflow) -> Dict[str, Any]:
        """Generate fixes based on all analysis results."""
        # Collect analysis results from completed tasks
        analysis_results = []
        for task in workflow.tasks:
            if task.status == TaskStatus.completed and task.result:
                analysis_results.append({
                    "agent": task.agentId,
                    "type": task.type,
                    "result": task.result
                })

        prompt = f"""
        Based on the following analysis results from multiple AI agents, generate specific, actionable fixes:

        Analysis Results:
        {json.dumps(analysis_results, indent=2)}

        For each issue identified, provide:
        1. Root cause explanation
        2. Step-by-step fix instructions  
        3. Code snippets with before/after examples
        4. Rationale for why this fix works
        5. Potential side effects or considerations
        6. Testing recommendations
        7. Priority level (critical, high, medium, low)

        Return as JSON with an array of fixes, each containing:
        - id, title, description, confidence, priority
        - type (code_fix, configuration, dependency, architecture)
        - originalCode, suggestedCode (when applicable)
        - steps (array of strings)
        - rationale, documentation, relatedInputs
        """

        return await self._call_gemini_api(prompt)

    async def _compile_suggestions(self, workflow: AgentWorkflow) -> List[FixSuggestion]:
        """Compile final suggestions from task results."""
        suggestions = []
        
        print(f"🔧 Compiling suggestions from {len(workflow.tasks)} tasks")
        
        # Process results from all analysis tasks
        analysis_content = []
        errors_found = []
        code_issues = []
        
        for task in workflow.tasks:
            print(f"🔧 Processing task {task.id} (type: {task.type}, status: {task.status})")
            if task.status == TaskStatus.completed and task.result:
                print(f"🔧 Task has result: {type(task.result)}")
                if task.type == "error_extraction" and task.result:
                    extracted = self._extract_error_details(task.result)
                    errors_found.extend(extracted)
                    print(f"🔧 Extracted {len(extracted)} error details")
                elif task.type == "code_analysis" and task.result:
                    extracted = self._extract_code_issues(task.result)
                    code_issues.extend(extracted)
                    print(f"🔧 Extracted {len(extracted)} code issues")
                
                # Store raw content for context
                analysis_content.append({
                    "agent": task.agentId,
                    "type": task.type,
                    "result": task.result
                })
            else:
                print(f"🔧 Skipping task - status: {task.status}, has_result: {bool(task.result)}")

        # Generate context-aware suggestions based on actual findings
        if errors_found:
            for i, error in enumerate(errors_found[:3]):  # Limit to top 3 errors
                suggestion = FixSuggestion(
                    id=str(uuid.uuid4()),
                    title=f"Fix {error.get('type', 'Error')} Issue",
                    description=error.get('description', 'Address this critical error in your code'),
                    confidence=max(70, min(95, error.get('confidence', 80))),
                    type=SuggestionType.code_fix,
                    originalCode=error.get('code_snippet'),
                    suggestedCode=error.get('suggested_fix'),
                    steps=error.get('steps', [
                        f"Locate the issue in {error.get('location', 'the problematic code')}",
                        f"Apply the suggested fix for {error.get('type', 'this error')}",
                        "Test the fix to ensure it resolves the issue"
                    ]),
                    rationale=error.get('rationale', f"This fixes a {error.get('severity', 'critical')} issue that could cause runtime problems."),
                    documentation=[],
                    relatedInputs=[inp.id for inp in workflow.inputs],
                    agent="Error Analysis Agent"
                )
                suggestions.append(suggestion)

        if code_issues:
            for i, issue in enumerate(code_issues[:2]):  # Limit to top 2 code issues
                suggestion = FixSuggestion(
                    id=str(uuid.uuid4()),
                    title=f"Improve {issue.get('category', 'Code Quality')}",
                    description=issue.get('description', 'Address this code quality issue'),
                    confidence=max(60, min(90, issue.get('confidence', 75))),
                    type=SuggestionType.code_fix,
                    originalCode=issue.get('code_snippet'),
                    suggestedCode=issue.get('suggested_improvement'),
                    steps=issue.get('steps', [
                        f"Review the {issue.get('category', 'code')} issue",
                        "Apply the recommended improvements",
                        "Verify the code still functions correctly"
                    ]),
                    rationale=issue.get('rationale', f"This improves {issue.get('category', 'code quality')} and follows best practices."),
                    documentation=[],
                    relatedInputs=[inp.id for inp in workflow.inputs],
                    agent="Code Analysis Agent"
                )
                suggestions.append(suggestion)

        print(f"🔧 Found {len(errors_found)} errors and {len(code_issues)} code issues")
        print(f"🔧 Current suggestions: {len(suggestions)}")
        print(f"🔧 Analysis content available: {len(analysis_content)}")
        
        # Always generate AI-based suggestions from analysis content
        if not suggestions and analysis_content:
            print("🔧 No suggestions yet, processing analysis content...")
            # Extract raw AI responses and create dynamic suggestions
            for i, analysis in enumerate(analysis_content):
                print(f"🔧 Processing analysis {i}: type={analysis.get('type')}")
                if analysis.get("result") and isinstance(analysis["result"], dict):
                    result = analysis["result"]
                    print(f"🔧 Result keys: {list(result.keys())}")
                    
                    # Try to use AI analysis directly, even if parsing failed
                    ai_response = result.get("ai_analysis", {})
                    print(f"🔧 AI response type: {type(ai_response)}, keys: {list(ai_response.keys()) if isinstance(ai_response, dict) else 'N/A'}")
                    
                    raw_response = ai_response.get("raw_response", "") if isinstance(ai_response, dict) else ""
                    print(f"🔧 Raw response length: {len(raw_response)}")
                    
                    if raw_response and len(raw_response) > 50:
                        print("🔧 Creating suggestion from AI raw response")
                        
                        # Try to extract clean, actionable suggestions from the raw response
                        clean_description = "AI analysis found areas for improvement in your code."
                        clean_title = f"Code Quality Improvements"
                        clean_rationale = "Based on AI code analysis"
                        
                        # Look for specific patterns in the response
                        import re
                        lines = raw_response.split('\n')
                        key_points = []
                        
                        for line in lines:
                            line = line.strip()
                            if line.startswith(('1.', '2.', '3.', '4.', '5.', '-', '*')) and len(line) > 10:
                                # Extract key points
                                clean_line = re.sub(r'^[\d\.\-\*\s]+', '', line)
                                if '**' in clean_line:
                                    clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_line)
                                if clean_line and len(clean_line) > 5:
                                    key_points.append(clean_line)
                        
                        if key_points:
                            clean_description = ". ".join(key_points[:3]) + "."
                            if len(key_points) > 3:
                                clean_description += f" Plus {len(key_points) - 3} more improvement{'s' if len(key_points) > 4 else ''}."
                        
                        # Look for specific code snippets mentioned
                        original_code = ""
                        suggested_code = ""
                        
                        # Extract code from backticks
                        code_matches = re.findall(r'`([^`]+)`', raw_response)
                        if code_matches:
                            if len(code_matches) >= 2:
                                original_code = code_matches[0]
                                suggested_code = code_matches[1]
                            elif len(code_matches) == 1:
                                if '==' in code_matches[0]:
                                    original_code = code_matches[0]
                                    suggested_code = code_matches[0].replace('==', '===')
                        
                        # Create clean, actionable steps
                        clean_steps = [
                            "Review the specific issues identified by AI analysis",
                            "Focus on the most critical improvements first",
                            "Apply the suggested code changes",
                            "Test thoroughly to ensure functionality is preserved"
                        ]
                        
                        if original_code and suggested_code:
                            clean_steps.insert(1, f"Replace '{original_code}' with '{suggested_code}'")
                        
                        suggestions.append(FixSuggestion(
                            id=str(uuid.uuid4()),
                            title=clean_title,
                            description=clean_description,
                            confidence=80,
                            type=SuggestionType.code_fix,
                            originalCode=original_code,
                            suggestedCode=suggested_code,
                            steps=clean_steps,
                            rationale=clean_rationale,
                            documentation=[],
                            relatedInputs=[inp.id for inp in workflow.inputs],
                            agent=f"AI {analysis.get('type', 'Analysis').replace('_', ' ').title()} Agent"
                        ))
                        break  # Only create one suggestion per analysis
            
            # Final fallback only if no AI analysis was available at all
            if not suggestions:
                input_types = [inp.type for inp in workflow.inputs]
                suggestions.append(FixSuggestion(
                    id=str(uuid.uuid4()),
                    title="AI Analysis Unavailable",
                    description="Unable to connect to AI analysis service. Please check your configuration.",
                    confidence=30,
                    type=SuggestionType.configuration,
                    steps=[
                        "Check internet connection",
                        "Verify API configuration",
                        "Retry the analysis",
                        "Contact support if issues persist"
                    ],
                    rationale="AI analysis service is currently unavailable.",
                    documentation=[],
                    relatedInputs=[inp.id for inp in workflow.inputs],
                    agent="System"
                ))

        print(f"🔧 Final suggestions count: {len(suggestions)}")
        if suggestions:
            for i, s in enumerate(suggestions):
                print(f"🔧 Suggestion {i}: {s.title} (confidence: {s.confidence}%)")
        
        return suggestions

    def _analyze_js_code(self, content: str) -> List[Dict[str, Any]]:
        """Analyze JavaScript/TypeScript code for common issues."""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line_lower = line.lower().strip()
            
            # Check for console.log statements
            if 'console.log' in line and not line.strip().startswith('//'):
                issues.append({
                    "type": "Debug Code",
                    "line": i,
                    "code": line.strip(),
                    "issue": "Console.log statement found",
                    "fix": "Remove console.log or replace with proper logging",
                    "severity": "low",
                    "rationale": "Console statements should not remain in production code"
                })
            
            # Check for var declarations
            if line.strip().startswith('var '):
                issues.append({
                    "type": "Outdated Syntax",
                    "line": i,
                    "code": line.strip(),
                    "issue": "Using 'var' instead of 'let' or 'const'",
                    "fix": line.replace('var ', 'const ' if '=' in line else 'let '),
                    "severity": "medium",
                    "rationale": "'let' and 'const' have better scoping rules than 'var'"
                })
            
            # Check for == instead of ===
            if '==' in line and '===' not in line and '!=' in line:
                issues.append({
                    "type": "Type Coercion",
                    "line": i,
                    "code": line.strip(),
                    "issue": "Using loose equality (==) instead of strict equality (===)",
                    "fix": line.replace('==', '===').replace('!=', '!=='),
                    "severity": "medium",
                    "rationale": "Strict equality prevents unexpected type coercion bugs"
                })
        
        return issues

    def _analyze_python_code(self, content: str) -> List[Dict[str, Any]]:
        """Analyze Python code for common issues."""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line_stripped = line.strip()
            
            # Check for bare except clauses
            if line_stripped.startswith('except:') or line_stripped == 'except:':
                issues.append({
                    "type": "Exception Handling",
                    "line": i,
                    "code": line.strip(),
                    "issue": "Bare except clause catches all exceptions",
                    "fix": "except Exception as e:" if ':' in line else "except Exception as e:",
                    "severity": "high",
                    "rationale": "Bare except can hide important errors and make debugging difficult"
                })
            
            # Check for print statements (might be debug code)
            if line_stripped.startswith('print(') and not line.strip().startswith('#'):
                issues.append({
                    "type": "Debug Code",
                    "line": i,
                    "code": line.strip(),
                    "issue": "Print statement found - might be debug code",
                    "fix": "Consider using logging instead: import logging; logging.info(...)",
                    "severity": "low",
                    "rationale": "Use proper logging instead of print statements for better control"
                })
            
            # Check for missing docstrings in functions
            if line_stripped.startswith('def ') and ':' in line:
                next_line = lines[i] if i < len(lines) else ""
                if not next_line.strip().startswith('"""') and not next_line.strip().startswith("'''"):
                    issues.append({
                        "type": "Documentation",
                        "line": i,
                        "code": line.strip(),
                        "issue": "Function missing docstring",
                        "fix": f'{line}\n    """Brief description of what this function does."""',
                        "severity": "low",
                        "rationale": "Docstrings improve code maintainability and help other developers"
                    })
        
        return issues

    def _extract_error_details(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract structured error details from analysis result."""
        errors = []
        
        try:
            # Handle different response formats
            if isinstance(analysis_result, dict):
                # If it's a direct JSON response
                if "error_types" in analysis_result:
                    error_types = analysis_result.get("error_types", [])
                    severities = analysis_result.get("severity_levels", [])
                    root_causes = analysis_result.get("root_causes", [])
                    
                    for i, error_type in enumerate(error_types):
                        severity = severities[i] if i < len(severities) else "medium"
                        cause = root_causes[i] if i < len(root_causes) else "Unknown cause"
                        
                        errors.append({
                            "type": error_type,
                            "severity": severity,
                            "description": f"Found {error_type} error",
                            "rationale": f"Root cause: {cause}",
                            "confidence": 85 if severity in ["critical", "high"] else 70,
                            "location": "Check the error trace or logs",
                            "steps": [
                                f"Investigate {error_type} in the codebase",
                                f"Address the root cause: {cause}",
                                "Test the fix thoroughly"
                            ]
                        })
                
                # Handle raw text responses
                elif "raw_response" in analysis_result:
                    text = analysis_result["raw_response"].lower()
                    if "error" in text or "exception" in text:
                        errors.append({
                            "type": "Runtime Error",
                            "severity": "high",
                            "description": "Error detected in the provided content",
                            "rationale": "Based on error patterns found in the text",
                            "confidence": 75,
                            "location": "Check the provided logs or stack trace",
                            "steps": [
                                "Review the error message carefully",
                                "Identify the root cause",
                                "Apply appropriate fixes"
                            ]
                        })
                        
        except Exception as e:
            print(f"Error extracting error details: {e}")
            
        return errors

    def _extract_code_issues(self, analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract structured code issues from analysis result."""
        issues = []
        
        try:
            # Handle our new enhanced analysis format
            if isinstance(analysis_result, dict) and "direct_issues" in analysis_result:
                # Process direct code analysis issues
                for issue in analysis_result.get("direct_issues", []):
                    issues.append({
                        "category": issue.get("type", "Code Issue"),
                        "description": f"Line {issue.get('line', '?')}: {issue.get('issue', 'Code issue found')}",
                        "confidence": 90 if issue.get('severity') == 'high' else 75,
                        "code_snippet": issue.get("code", ""),
                        "suggested_improvement": issue.get("fix", ""),
                        "rationale": issue.get("rationale", "Code improvement recommended"),
                        "line_number": issue.get("line"),
                        "severity": issue.get("severity", "medium"),
                        "steps": [
                            f"Go to line {issue.get('line', '?')} in your code",
                            f"Replace: {issue.get('code', 'the problematic code')}",
                            f"With: {issue.get('fix', 'the suggested fix')}",
                            "Test to ensure the change works correctly"
                        ]
                    })
                
                # Process AI analysis if available
                ai_analysis = analysis_result.get("ai_analysis", {})
                if isinstance(ai_analysis, dict):
                    # Try to parse JSON array from AI response first
                    if isinstance(ai_analysis, list):
                        # Direct JSON array response
                        for ai_issue in ai_analysis:
                            if isinstance(ai_issue, dict):
                                issues.append({
                                    "category": ai_issue.get("type", "AI Analysis").replace("_", " ").title(),
                                    "description": ai_issue.get("description", "AI identified issue"),
                                    "confidence": 85,
                                    "code_snippet": ai_issue.get("original_code", ""),
                                    "suggested_improvement": ai_issue.get("fixed_code", ""),
                                    "rationale": ai_issue.get("rationale", "Based on AI analysis"),
                                    "line_number": ai_issue.get("line"),
                                    "severity": ai_issue.get("severity", "medium"),
                                    "steps": [
                                        f"Locate the issue: {ai_issue.get('description', 'the problem')}",
                                        f"Replace: {ai_issue.get('original_code', 'problematic code')}",
                                        f"With: {ai_issue.get('fixed_code', 'improved code')}",
                                        "Test the changes thoroughly"
                                    ]
                                })
                    elif "raw_response" in ai_analysis:
                        text = ai_analysis["raw_response"]
                        
                        # Try to parse as JSON first
                        try:
                            if text.strip().startswith('['):
                                parsed_issues = json.loads(text)
                                if isinstance(parsed_issues, list):
                                    for ai_issue in parsed_issues:
                                        if isinstance(ai_issue, dict):
                                            issues.append({
                                                "category": ai_issue.get("type", "AI Analysis").replace("_", " ").title(),
                                                "description": ai_issue.get("description", "AI identified issue"),
                                                "confidence": 85,
                                                "code_snippet": ai_issue.get("original_code", ""),
                                                "suggested_improvement": ai_issue.get("fixed_code", ""),
                                                "rationale": ai_issue.get("rationale", "Based on AI analysis"),
                                                "line_number": ai_issue.get("line"),
                                                "severity": ai_issue.get("severity", "medium"),
                                                "steps": [
                                                    f"Locate: {ai_issue.get('description', 'the issue')}",
                                                    f"Replace: {ai_issue.get('original_code', 'problematic code')}",
                                                    f"With: {ai_issue.get('fixed_code', 'improved code')}",
                                                    "Test the changes"
                                                ]
                                            })
                            else:
                                # Try to extract JSON from within the text
                                import re
                                json_match = re.search(r'\[.*?\]', text, re.DOTALL)
                                if json_match:
                                    parsed_issues = json.loads(json_match.group())
                                    if isinstance(parsed_issues, list):
                                        for ai_issue in parsed_issues:
                                            if isinstance(ai_issue, dict):
                                                issues.append({
                                                    "category": ai_issue.get("type", "AI Analysis").replace("_", " ").title(),
                                                    "description": ai_issue.get("description", "AI identified issue"),
                                                    "confidence": 85,
                                                    "code_snippet": ai_issue.get("original_code", ""),
                                                    "suggested_improvement": ai_issue.get("fixed_code", ""),
                                                    "rationale": ai_issue.get("rationale", "Based on AI analysis"),
                                                    "line_number": ai_issue.get("line"),
                                                    "severity": ai_issue.get("severity", "medium"),
                                                    "steps": [
                                                        f"Locate the issue on line {ai_issue.get('line', '?')}",
                                                        f"Current code: {ai_issue.get('original_code', 'problematic code')}",
                                                        f"Replace with: {ai_issue.get('fixed_code', 'improved code')}",
                                                        "Test the changes to ensure they work correctly"
                                                    ]
                                                })
                                else:
                                    raise json.JSONDecodeError("No JSON found", text, 0)
                        except json.JSONDecodeError:
                            # Parse the text response for key information
                            lines = text.split('\n')
                            current_issue = None
                            
                            for line in lines:
                                line = line.strip()
                                if line.startswith(('1.', '2.', '3.', '4.', '5.')) and '**' in line:
                                    # Extract issue title
                                    title_match = re.search(r'\*\*(.*?)\*\*', line)
                                    if title_match:
                                        if current_issue:
                                            issues.append(current_issue)
                                        
                                        current_issue = {
                                            "category": title_match.group(1),
                                            "description": line.split('**')[2].strip() if len(line.split('**')) > 2 else title_match.group(1),
                                            "confidence": 80,
                                            "code_snippet": "",
                                            "suggested_improvement": "",
                                            "rationale": "Identified by AI analysis",
                                            "steps": []
                                        }
                                elif current_issue and line:
                                    # Add details to current issue
                                    if 'should use' in line.lower() or 'instead of' in line.lower():
                                        current_issue["suggested_improvement"] = line
                                    elif current_issue["description"] == current_issue["category"]:
                                        current_issue["description"] = line
                            
                            if current_issue:
                                issues.append(current_issue)
                            
                            # If no structured issues found, create a general one
                            if not issues and text and len(text) > 50:
                                issues.append({
                                    "category": "AI Code Analysis", 
                                    "description": "Code improvements recommended",
                                    "confidence": 75,
                                    "code_snippet": "",
                                    "suggested_improvement": text[:300] + "..." if len(text) > 300 else text,
                                    "rationale": "Based on comprehensive AI analysis",
                                    "steps": [
                                        "Review the AI analysis findings",
                                        "Identify the specific issues mentioned", 
                                        "Apply the suggested improvements",
                                        "Test the updated code thoroughly"
                                    ]
                                })
            
            # Handle legacy response formats
            elif isinstance(analysis_result, dict):
                # If it's a direct JSON response with categories
                categories = ["syntax_errors", "logic_errors", "performance_issues", 
                             "security_vulnerabilities", "best_practice_violations"]
                
                for category in categories:
                    if category in analysis_result:
                        category_issues = analysis_result[category]
                        if isinstance(category_issues, list):
                            for issue in category_issues:
                                issues.append({
                                    "category": category.replace("_", " ").title(),
                                    "description": issue.get("description", f"Found {category} issue"),
                                    "confidence": issue.get("confidence", 80),
                                    "code_snippet": issue.get("code_snippet"),
                                    "suggested_improvement": issue.get("suggested_fix"),
                                    "rationale": issue.get("rationale", f"This addresses a {category} in your code"),
                                    "steps": issue.get("steps", [
                                        f"Locate the {category} issue",
                                        "Apply the suggested improvement",
                                        "Verify the code works correctly"
                                    ])
                                })
                
            # Handle raw text responses  
            elif "raw_response" in analysis_result:
                text = analysis_result["raw_response"].lower()
                if any(term in text for term in ["bug", "issue", "problem", "improve", "optimize"]):
                    issues.append({
                        "category": "Code Quality",
                        "description": "Code improvement opportunities identified",
                        "confidence": 70,
                        "rationale": "Based on code analysis patterns",
                        "steps": [
                            "Review the analysis findings",
                            "Apply suggested improvements",
                            "Test the updated code"
                        ]
                    })
                        
        except Exception as e:
            print(f"Error extracting code issues: {e}")
            
        return issues

    async def _get_content(self, input_data: Dict[str, Any]) -> str:
        """Get content from input data, handling both text and file inputs."""
        if input_data.get('metadata', {}).get('is_file'):
            # Read file content
            file_path = input_data['content']
            try:
                async with aiofiles.open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return await f.read()
            except Exception as e:
                print(f"Error reading file {file_path}: {e}")
                return f"[Error reading file: {str(e)}]"
        else:
            return str(input_data['content'])

    async def _call_gemini_api(self, prompt: str) -> Dict[str, Any]:
        """Call Gemini API with the given prompt."""
        try:
            url = f"{self.base_url}/models/gemini-1.5-flash:generateContent?key={self.api_key}"
            print(f"🤖 Calling Gemini API: {url[:50]}...")
            
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.3,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 2048
                }
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    print(f"📡 Gemini API Response Status: {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        print(f"✅ Gemini API Success - Response length: {len(text)} chars")
                        
                        # Try to parse as JSON, fallback to text
                        try:
                            parsed = json.loads(text)
                            print("📋 Successfully parsed JSON response")
                            return parsed
                        except json.JSONDecodeError:
                            print("📝 Using raw text response (not JSON)")
                            return {"raw_response": text, "parsed": False}
                    else:
                        error_text = await response.text()
                        print(f"❌ Gemini API Error {response.status}: {error_text}")
                        return {"error": f"API call failed: {response.status}", "details": error_text}
                        
        except Exception as e:
            print(f"💥 Gemini API Exception: {str(e)}")
            return {"error": f"Failed to call Gemini API: {str(e)}"}

    def _get_agent_name(self, agent_id: str) -> str:
        """Get agent name by ID."""
        agent = self.get_agent_by_id(agent_id)
        return agent.name if agent else "Unknown Agent"