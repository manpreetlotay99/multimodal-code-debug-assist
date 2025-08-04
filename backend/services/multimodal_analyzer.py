import base64
import io
import os
from typing import Dict, Any, Optional, List
from PIL import Image
import aiohttp
import aiofiles


class MultimodalAnalyzer:
    """Service for analyzing multimodal content like images, screenshots, and diagrams."""
    
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyCFde44U9vRs0vWCXKTkiHnM_sA1lGMsfM")
        self.vision_api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent"
        
    async def analyze_image(self, image_path: str, analysis_type: str = "general") -> Dict[str, Any]:
        """Analyze an image file for bugs, UI issues, or architectural problems."""
        try:
            # Check if file exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            # Get image info
            image_info = await self._get_image_info(image_path)
            
            # Convert image to base64 for API call
            image_base64 = await self._image_to_base64(image_path)
            
            # Generate analysis prompt based on type
            prompt = self._generate_analysis_prompt(analysis_type, image_info)
            
            # Call vision API
            analysis_result = await self._call_vision_api(prompt, image_base64)
            
            # Post-process results
            processed_result = self._process_analysis_result(analysis_result, image_info)
            
            return processed_result
            
        except Exception as e:
            return {
                "error": f"Failed to analyze image: {str(e)}",
                "image_path": image_path,
                "analysis_type": analysis_type
            }
    
    async def analyze_screenshot(self, image_path: str) -> Dict[str, Any]:
        """Specifically analyze a screenshot for UI bugs and usability issues."""
        prompt_context = """
        Analyze this screenshot for:
        1. UI/UX issues (alignment, spacing, overlap)
        2. Accessibility problems
        3. Responsive design issues
        4. Error states or broken elements
        5. Performance indicators (loading states, etc.)
        6. Visual consistency problems
        """
        
        return await self.analyze_image(image_path, "screenshot")
    
    async def analyze_diagram(self, image_path: str) -> Dict[str, Any]:
        """Analyze architectural diagrams, flowcharts, or technical diagrams."""
        prompt_context = """
        Analyze this technical diagram for:
        1. Architectural issues (tight coupling, circular dependencies)
        2. Scalability concerns
        3. Single points of failure
        4. Missing components or connections
        5. Security considerations
        6. Performance bottlenecks
        """
        
        return await self.analyze_image(image_path, "diagram")
    
    async def _get_image_info(self, image_path: str) -> Dict[str, Any]:
        """Get basic information about the image."""
        try:
            with Image.open(image_path) as img:
                return {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode,
                    "size_bytes": os.path.getsize(image_path),
                    "aspect_ratio": round(img.width / img.height, 2)
                }
        except Exception as e:
            return {"error": f"Could not get image info: {str(e)}"}
    
    async def _image_to_base64(self, image_path: str, max_size: int = 1024) -> str:
        """Convert image to base64, resizing if necessary."""
        try:
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if too large
                if max(img.width, img.height) > max_size:
                    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                
                # Convert to base64
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85)
                img_str = base64.b64encode(buffer.getvalue()).decode()
                
                return img_str
                
        except Exception as e:
            raise Exception(f"Failed to convert image to base64: {str(e)}")
    
    def _generate_analysis_prompt(self, analysis_type: str, image_info: Dict[str, Any]) -> str:
        """Generate appropriate prompt based on analysis type."""
        base_prompt = f"""
        Analyze this image ({analysis_type}) and provide detailed feedback.
        
        Image specifications:
        - Dimensions: {image_info.get('width', 'unknown')}x{image_info.get('height', 'unknown')}
        - Format: {image_info.get('format', 'unknown')}
        - Size: {image_info.get('size_bytes', 0)} bytes
        """
        
        if analysis_type == "screenshot":
            return base_prompt + """
            
            Focus on UI/UX analysis:
            1. Identify any visual bugs, alignment issues, or layout problems
            2. Check for accessibility issues (contrast, font sizes, etc.)
            3. Look for broken or missing UI elements
            4. Assess overall user experience and usability
            5. Note any error states or loading indicators
            6. Evaluate responsive design elements
            
            Provide specific, actionable feedback with locations and severity levels.
            """
        
        elif analysis_type == "diagram":
            return base_prompt + """
            
            Focus on architectural analysis:
            1. Identify architectural patterns and anti-patterns
            2. Look for potential scalability issues
            3. Check for single points of failure
            4. Assess coupling and cohesion
            5. Identify missing error handling or monitoring
            6. Evaluate security considerations
            
            Provide architectural recommendations and best practices.
            """
        
        else:  # general
            return base_prompt + """
            
            Provide general analysis:
            1. Describe what you see in the image
            2. Identify any obvious issues or problems
            3. Suggest improvements or optimizations
            4. Note any technical details visible
            
            Be thorough and specific in your analysis.
            """
    
    async def _call_vision_api(self, prompt: str, image_base64: str) -> Dict[str, Any]:
        """Call Google's Gemini Vision API."""
        try:
            url = f"{self.vision_api_url}?key={self.gemini_api_key}"
            
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.4,
                    "topK": 32,
                    "topP": 1,
                    "maxOutputTokens": 2048
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        return {"success": True, "analysis": text}
                    else:
                        error_text = await response.text()
                        return {"success": False, "error": f"Vision API failed: {response.status}", "details": error_text}
                        
        except Exception as e:
            return {"success": False, "error": f"Failed to call Vision API: {str(e)}"}
    
    def _process_analysis_result(self, api_result: Dict[str, Any], image_info: Dict[str, Any]) -> Dict[str, Any]:
        """Process and structure the analysis result."""
        if not api_result.get("success"):
            return {
                "analysis_successful": False,
                "error": api_result.get("error", "Unknown error"),
                "image_info": image_info
            }
        
        analysis_text = api_result.get("analysis", "")
        
        # Structure the response
        result = {
            "analysis_successful": True,
            "image_info": image_info,
            "raw_analysis": analysis_text,
            "structured_analysis": self._extract_structured_data(analysis_text),
            "timestamp": "2024-01-01T00:00:00Z",  # In production, use actual timestamp
            "confidence_score": self._calculate_confidence(analysis_text)
        }
        
        return result
    
    def _extract_structured_data(self, analysis_text: str) -> Dict[str, Any]:
        """Extract structured data from the analysis text."""
        # This is a simplified extraction - in production, you'd use more sophisticated NLP
        
        issues = []
        suggestions = []
        severity_indicators = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        lines = analysis_text.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for common patterns
            if any(word in line.lower() for word in ['issue', 'problem', 'bug', 'error']):
                severity = 'medium'
                if any(word in line.lower() for word in ['critical', 'severe', 'major']):
                    severity = 'high'
                elif any(word in line.lower() for word in ['minor', 'small', 'trivial']):
                    severity = 'low'
                
                issues.append({
                    "description": line,
                    "severity": severity,
                    "category": "ui" if "ui" in line.lower() else "general"
                })
                severity_indicators[severity] += 1
                
            elif any(word in line.lower() for word in ['suggest', 'recommend', 'should', 'could']):
                suggestions.append({
                    "recommendation": line,
                    "priority": "medium",
                    "actionable": True
                })
        
        return {
            "issues_found": issues,
            "suggestions": suggestions,
            "severity_breakdown": severity_indicators,
            "total_issues": len(issues),
            "total_suggestions": len(suggestions)
        }
    
    def _calculate_confidence(self, analysis_text: str) -> float:
        """Calculate confidence score based on analysis text characteristics."""
        if not analysis_text:
            return 0.0
        
        # Simple heuristic based on text length and specificity
        base_confidence = min(0.9, len(analysis_text) / 1000)  # Longer analysis = higher confidence
        
        # Boost confidence if specific technical terms are mentioned
        technical_terms = ['ui', 'css', 'html', 'responsive', 'accessibility', 'layout', 'alignment']
        technical_score = sum(1 for term in technical_terms if term in analysis_text.lower()) / len(technical_terms)
        
        final_confidence = min(1.0, base_confidence + (technical_score * 0.3))
        return round(final_confidence, 2)
    
    async def analyze_multiple_images(self, image_paths: List[str]) -> Dict[str, Any]:
        """Analyze multiple images and provide comparative analysis."""
        results = {}
        
        for i, image_path in enumerate(image_paths):
            try:
                result = await self.analyze_image(image_path)
                results[f"image_{i+1}"] = result
            except Exception as e:
                results[f"image_{i+1}"] = {"error": str(e)}
        
        # Provide summary analysis
        summary = self._generate_multi_image_summary(results)
        
        return {
            "individual_results": results,
            "summary": summary,
            "total_images": len(image_paths),
            "successful_analyses": len([r for r in results.values() if not r.get("error")])
        }
    
    def _generate_multi_image_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary for multiple image analysis."""
        total_issues = 0
        total_suggestions = 0
        common_issues = []
        
        for result in results.values():
            if not result.get("error") and result.get("structured_analysis"):
                structured = result["structured_analysis"]
                total_issues += structured.get("total_issues", 0)
                total_suggestions += structured.get("total_suggestions", 0)
        
        return {
            "total_issues_across_images": total_issues,
            "total_suggestions_across_images": total_suggestions,
            "average_issues_per_image": round(total_issues / len(results), 2) if results else 0,
            "common_patterns": common_issues,
            "overall_assessment": "Multiple images analyzed successfully" if total_issues == 0 else f"Found {total_issues} issues across images"
        }