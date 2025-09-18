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
    # NOTE: do not force a GUI backend (e.g., edgechromium); keep portable.
    webview.start(http_server=True)


if __name__ == '__main__':
    main()
