import json, os, sys, subprocess
from datetime import datetime
from openpyxl import Workbook, load_workbook
from docx import Document

SCHEMA_PATH = os.path.join('forms', 'schema.json')
TEMPLATES_DIR = 'templates'


class LocalAPI:
    def get_schema(self):
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_schema(self, schema):
        if not isinstance(schema, dict) or 'fields' not in schema:
            raise ValueError('Invalid schema: missing fields')
        os.makedirs(os.path.dirname(SCHEMA_PATH), exist_ok=True)
        with open(SCHEMA_PATH, 'w', encoding='utf-8') as f:
            json.dump(schema, f, ensure_ascii=False, indent=2)
        return True

    def generate_xlsx(self, data, folder):
        os.makedirs(folder or '.', exist_ok=True)
        xlsx_path = os.path.join(folder or '.', 'output.xlsx')
        if os.path.exists(xlsx_path):
            wb = load_workbook(xlsx_path)
            ws = wb.active
        else:
            wb = Workbook()
            ws = wb.active
            ws.append(list(data.keys()))
        ws.append([data.get(k, '') for k in ws[1]])
        wb.save(xlsx_path)
        return os.path.abspath(xlsx_path)

    def generate_docx(self, data, folder):
        os.makedirs(folder or '.', exist_ok=True)
        docx_path = os.path.join(folder or '.', 'output.docx')
        template = os.path.join(TEMPLATES_DIR, 'docx_base_template.docx')
        if os.path.exists(template):
            doc = Document(template)
            for p in doc.paragraphs:
                for k, v in data.items():
                    p.text = p.text.replace(f'{{{{{k}}}}}', str(v))
        else:
            doc = Document()
            doc.add_heading('Form Output', level=1)
            for k, v in data.items():
                doc.add_paragraph(f"{k}: {v}")
        doc.add_paragraph(f"Generated: {datetime.now().isoformat(timespec='seconds')}")
        doc.save(docx_path)
        return os.path.abspath(docx_path)

    def open_folder(self, path):
        path = os.path.abspath(path or '.')
        if sys.platform.startswith('win'):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == 'darwin':
            subprocess.call(['open', path])
        else:
            subprocess.call(['xdg-open', path])
        return True

