#!/bin/bash

# ====================================
# RIVALRY AI - START SERVER (MAC/LINUX)
# ====================================

echo ""
echo "🎯 Starting Rivalry AI Server..."
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found!"
    echo "   Make sure you're in the COMPLETE-FILES/IMPROVED directory"
    echo ""
    exit 1
fi

# Check for Python (Mac usually has python3 installed by default)
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "❌ Error: Python not found!"
    echo "   Install Python from python.org to run the server"
    echo ""
    exit 1
fi

# Start server
echo "✅ Starting HTTP server with API Proxy on port 8000..."
echo ""
echo "🌐 Open your browser to:"
echo "   → http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the proxy server script
$PYTHON_CMD server.py