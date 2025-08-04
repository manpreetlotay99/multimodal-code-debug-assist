#!/usr/bin/env python3
"""
Startup script for the AI Debug Assistant API
"""

import os
import sys
import subprocess
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version_info.major}.{sys.version_info.minor}")


def install_dependencies():
    """Install required dependencies."""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)


def setup_environment():
    """Set up environment variables."""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚙️ Creating .env file...")
        with open(env_file, "w") as f:
            f.write("# AI Debug Assistant Environment Variables\n")
            f.write("GEMINI_API_KEY=AIzaSyCFde44U9vRs0vWCXKTkiHnM_sA1lGMsfM\n")
            f.write("BACKEND_HOST=0.0.0.0\n")
            f.write("BACKEND_PORT=8000\n")
            f.write("DEBUG=true\n")
        print("✅ .env file created")
    else:
        print("✅ .env file already exists")


def create_directories():
    """Create necessary directories."""
    directories = ["uploads", "logs", "temp"]
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    print("✅ Directories created")


def start_server():
    """Start the FastAPI server."""
    print("🚀 Starting AI Debug Assistant API...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API documentation at: http://localhost:8000/docs")
    print("🛑 Press Ctrl+C to stop the server\n")
    
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)


def main():
    """Main startup function."""
    print("🤖 AI Debug Assistant API - Starting up...")
    print("=" * 50)
    
    check_python_version()
    
    # Check if running for the first time
    if "--install" in sys.argv or not Path("requirements.txt").exists():
        install_dependencies()
    
    setup_environment()
    create_directories()
    
    # Quick dependency check
    try:
        import fastapi
        import uvicorn
        import aiohttp
        import aiofiles
        from PIL import Image
        print("✅ All dependencies are available")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run with --install to install dependencies")
        sys.exit(1)
    
    start_server()


if __name__ == "__main__":
    main()