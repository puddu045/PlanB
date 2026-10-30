"""Local web-build smoke server with Expo Router SPA fallback. Not a production server."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        target = Path(self.translate_path(self.path))
        if not target.exists() and not Path(urlsplit(self.path).path).suffix:
            self.path = '/index.html'
        super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8081)
    parser.add_argument('--host', default='127.0.0.1')
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent.parent / 'dist'
    if not (directory / 'index.html').exists():
        parser.error('Build the web app first: npm run build:web')
    print(f'Serving local PlanB build on port {args.port}', flush=True)
    ThreadingHTTPServer((args.host, args.port), partial(Handler, directory=str(directory))).serve_forever()
