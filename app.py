import os, sys
import webview
from api import LocalAPI


def main():
    api = LocalAPI()
    # Resolve asset base dir for packaged (PyInstaller) and dev
    if getattr(sys, 'frozen', False):
        base_dir = getattr(sys, '_MEIPASS', os.path.abspath('.'))  # type: ignore[attr-defined]
    else:
        base_dir = os.path.abspath(os.path.dirname(__file__))

    # Serve from base_dir so /ui/* paths resolve under the internal HTTP server
    try:
        os.chdir(base_dir)
    except Exception:
        pass

    html_path = os.path.join('ui', 'index.html')
    window = webview.create_window('SDDL-DS', html_path, js_api=api)
    # Optional dev tools when WEBVIEW_DEBUG=1
    debug = os.environ.get('WEBVIEW_DEBUG', '').strip() in ('1', 'true', 'yes')
    webview.start(debug=debug, http_server=True)


if __name__ == '__main__':
    main()
