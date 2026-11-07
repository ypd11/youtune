import http.server
import socketserver

PORT = 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        if path.endswith(".js"):
            return "text/javascript"
        if path.endswith(".json"):
            return "application/json"
        if path.endswith(".webmanifest"):
            return "application/manifest+json"
        return super().guess_type(path)


socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving YouTune Radio at http://localhost:{PORT}  (Ctrl+C to stop)")
    httpd.serve_forever()
