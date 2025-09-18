import os
import webview
from api import LocalAPI


def main():
    api = LocalAPI()
    html_path = os.path.abspath(os.path.join('ui', 'index.html'))
    window = webview.create_window('SDDL-DS', html_path, js_api=api)
    # NOTE: do not force a GUI backend (e.g., edgechromium); keep portable.
    webview.start(http_server=True)


if __name__ == '__main__':
    main()
