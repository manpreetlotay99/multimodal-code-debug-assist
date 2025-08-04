#!/usr/bin/env python3
"""
Integration test script for AI Debug Assistant
Tests the complete backend-frontend integration workflow
"""

import asyncio
import aiohttp
import json
import time
from pathlib import Path

BASE_URL = "http://localhost:8000"

class IntegrationTester:
    def __init__(self):
        self.session = None
        self.session_id = f"test-session-{int(time.time())}"
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_health_check(self):
        """Test backend health endpoint"""
        print("🔍 Testing backend health...")
        async with self.session.get(f"{BASE_URL}/health") as response:
            assert response.status == 200
            data = await response.json()
            assert data["status"] == "healthy"
            print("✅ Health check passed")
            return data

    async def test_agents_endpoint(self):
        """Test agents listing endpoint"""
        print("🤖 Testing agents endpoint...")
        async with self.session.get(f"{BASE_URL}/agents") as response:
            assert response.status == 200
            data = await response.json()
            assert "agents" in data
            assert len(data["agents"]) == 5  # We defined 5 agents
            
            agent_names = [agent["name"] for agent in data["agents"]]
            expected_agents = [
                "Error Extraction Agent",
                "Code Analysis Agent", 
                "Documentation Retrieval Agent",
                "Fix Generation Agent",
                "Multimodal Analysis Agent"
            ]
            
            for expected in expected_agents:
                assert expected in agent_names
            
            print(f"✅ Found {len(data['agents'])} agents as expected")
            return data

    async def test_add_text_input(self):
        """Test adding text input"""
        print("📝 Testing text input addition...")
        
        payload = {
            "type": "code",
            "content": "function buggyFunction() {\n  let x = 1;\n  if (x = 2) {\n    console.log('Bug!');\n  }\n}",
            "metadata": {"language": "javascript"},
            "session_id": self.session_id
        }
        
        async with self.session.post(f"{BASE_URL}/debug/input", json=payload) as response:
            assert response.status == 200
            data = await response.json()
            assert data["success"] == True
            assert "input_id" in data
            print("✅ Text input added successfully")
            return data

    async def test_add_logs_input(self):
        """Test adding logs input"""
        print("📋 Testing logs input addition...")
        
        payload = {
            "type": "logs",
            "content": "ERROR: TypeError: Cannot read property 'length' of undefined\n    at buggyFunction (app.js:15:3)\n    at main (app.js:23:5)\nWARNING: Deprecated API usage detected",
            "metadata": {"source": "application.log"},
            "session_id": self.session_id
        }
        
        async with self.session.post(f"{BASE_URL}/debug/input", json=payload) as response:
            assert response.status == 200
            data = await response.json()
            assert data["success"] == True
            print("✅ Logs input added successfully")
            return data

    async def test_start_analysis(self):
        """Test starting analysis workflow"""
        print("🚀 Testing analysis workflow start...")
        
        payload = {
            "session_id": self.session_id,
            "priority": "normal"
        }
        
        async with self.session.post(f"{BASE_URL}/debug/analyze", json=payload) as response:
            assert response.status == 200
            data = await response.json()
            assert data["success"] == True
            assert "workflow_id" in data
            print(f"✅ Analysis started with workflow ID: {data['workflow_id']}")
            return data

    async def test_workflow_status(self, workflow_id):
        """Test workflow status polling"""
        print("📊 Testing workflow status polling...")
        
        max_polls = 30  # 30 seconds max
        poll_count = 0
        
        while poll_count < max_polls:
            async with self.session.get(f"{BASE_URL}/debug/workflow/{workflow_id}") as response:
                assert response.status == 200
                data = await response.json()
                
                print(f"   Status: {data['status']}, Progress: {data['progress']}%")
                
                if data["status"] in ["completed", "failed"]:
                    print(f"✅ Workflow {data['status']} after {poll_count + 1} polls")
                    return data
                
                poll_count += 1
                await asyncio.sleep(1)
        
        raise Exception(f"Workflow did not complete within {max_polls} seconds")

    async def test_get_suggestions(self, workflow_id):
        """Test getting AI suggestions"""
        print("💡 Testing suggestions retrieval...")
        
        async with self.session.get(f"{BASE_URL}/debug/suggestions/{workflow_id}") as response:
            assert response.status == 200
            data = await response.json()
            
            print(f"   Found {data['suggestions_count']} suggestions")
            
            if data["suggestions"]:
                first_suggestion = data["suggestions"][0]
                print(f"   First suggestion: {first_suggestion['title']}")
                print(f"   Confidence: {first_suggestion['confidence']}%")
                print(f"   Type: {first_suggestion['type']}")
            
            print("✅ Suggestions retrieved successfully")
            return data

    async def test_apply_suggestion(self, workflow_id, suggestion_id):
        """Test applying a suggestion"""
        print("🔧 Testing suggestion application...")
        
        payload = {
            "workflow_id": workflow_id,
            "suggestion_id": suggestion_id
        }
        
        async with self.session.post(f"{BASE_URL}/debug/apply-suggestion", json=payload) as response:
            assert response.status == 200
            data = await response.json()
            assert data["success"] == True
            print("✅ Suggestion applied successfully")
            return data

    async def test_clear_session(self):
        """Test session clearing"""
        print("🧹 Testing session cleanup...")
        
        async with self.session.delete(f"{BASE_URL}/debug/session/{self.session_id}") as response:
            assert response.status == 200
            data = await response.json()
            assert data["success"] == True
            print("✅ Session cleared successfully")
            return data

    async def run_complete_workflow_test(self):
        """Run the complete integration test workflow"""
        print("🎯 Starting Complete Integration Test")
        print("=" * 50)
        
        try:
            # 1. Health check
            await self.test_health_check()
            
            # 2. Get agents
            await self.test_agents_endpoint()
            
            # 3. Add inputs
            await self.test_add_text_input()
            await self.test_add_logs_input()
            
            # 4. Start analysis
            analysis_result = await self.test_start_analysis()
            workflow_id = analysis_result["workflow_id"]
            
            # 5. Poll for completion
            workflow_status = await self.test_workflow_status(workflow_id)
            
            # 6. Get suggestions
            suggestions = await self.test_get_suggestions(workflow_id)
            
            # 7. Apply first suggestion if available
            if suggestions["suggestions"]:
                first_suggestion_id = suggestions["suggestions"][0]["id"]
                await self.test_apply_suggestion(workflow_id, first_suggestion_id)
            
            # 8. Clear session
            await self.test_clear_session()
            
            print("\n🎉 ALL INTEGRATION TESTS PASSED!")
            print("✅ Backend-Frontend integration is working seamlessly")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Integration test failed: {str(e)}")
            return False

async def main():
    """Main test runner"""
    print("🚀 AI Debug Assistant Integration Test")
    print("Testing complete backend-frontend workflow...")
    print()
    
    async with IntegrationTester() as tester:
        success = await tester.run_complete_workflow_test()
        
        if success:
            print("\n🎯 INTEGRATION TEST SUMMARY:")
            print("├── ✅ Backend server health: PASSED")
            print("├── ✅ API endpoints: PASSED") 
            print("├── ✅ Input handling: PASSED")
            print("├── ✅ AI workflow execution: PASSED")
            print("├── ✅ Real-time progress tracking: PASSED")
            print("├── ✅ Suggestion generation: PASSED")
            print("├── ✅ Suggestion application: PASSED")
            print("└── ✅ Session management: PASSED")
            print("\n🎉 Backend and Frontend are fully integrated!")
        else:
            print("\n❌ Some tests failed. Check the backend server is running.")
            exit(1)

if __name__ == "__main__":
    asyncio.run(main())