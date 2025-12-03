import http.server
import socketserver
import json
import urllib.request
import urllib.error
import os
import ssl
import sys
import webbrowser

# ==============================================================================
# CONFIGURATION & ENVIRONMENT LOADER
# ==============================================================================

# 1. Load local .env file if it exists (For Local Development)
if os.path.exists(".env"):
    print("📂 Loading local environment from .env file...")
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key] = value.strip("\"'")

# 2. Get Configuration
PORT = int(os.environ.get("PORT", 8000))
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")


class ProxyRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/analyze":
            content_length = int(self.headers["Content-Length"])
            post_data = self.rfile.read(content_length)

            try:
                if not ANTHROPIC_API_KEY:
                    raise Exception(
                        "Missing API Key. Set ANTHROPIC_API_KEY in .env (Local) or Render Dashboard (Cloud)."
                    )

                client_data = json.loads(post_data)

                headers = {
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                }

                claude_payload = {
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 400,
                    "messages": client_data.get("messages", []),
                }

                req = urllib.request.Request(
                    "https://api.anthropic.com/v1/messages",
                    data=json.dumps(claude_payload).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )

                # SSL Context
                try:
                    ssl_context = ssl._create_unverified_context()
                except AttributeError:
                    ssl_context = None

                print(f"👉 Connecting to Claude...")
                with urllib.request.urlopen(req, context=ssl_context) as response:
                    result = response.read()
                    self.send_response(200)
                    self.send_header("Content-type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(result)

            except Exception as e:
                print(f"❌ Error: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_error(404)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


# ==============================================================================
# MAIN SERVER LOOP
# ==============================================================================

if __name__ == "__main__":
    # Allow address reuse to prevent "Address already in use" errors if you restart quickly
    socketserver.TCPServer.allow_reuse_address = True

    print("-" * 50)
    print(f"✅ Rivalry AI Server starting on Port {PORT}...")
    print(f"🔑 API Key Status: {'LOADED' if ANTHROPIC_API_KEY else '❌ MISSING'}")

    # Determine Local vs Cloud URL
    if os.environ.get("RENDER"):
        print(f"☁️  Running in Cloud Mode")
    else:
        local_url = f"http://localhost:{PORT}"
        print(f"🔗 Local URL: {local_url}")
        print(f"🛑 Press Ctrl+C to stop the server")
        print("-" * 50)

        # Auto-open browser
        try:
            webbrowser.open(local_url)
        except Exception:
            pass

    # Start Server with Graceful Shutdown
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), ProxyRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down server... Goodbye!")
        try:
            httpd.server_close()
        except:
            pass
        sys.exit(0)
