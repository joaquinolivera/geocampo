#!/usr/bin/env python3
"""
Convert .docx files to Markdown using only Python standard library.
.docx files are ZIP archives containing XML. We extract document.xml and parse it.
"""

import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import re

# WordprocessingML namespaces
NAMESPACES = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
}

# Register namespaces to keep clean output
for prefix, uri in NAMESPACES.items():
    ET.register_namespace(prefix, uri)


def get_text_from_element(element):
    """Extract all text from an element and its children."""
    text_parts = []
    if element.text and element.text.strip():
        text_parts.append(element.text)
    for child in element:
        if child.text and child.text.strip():
            text_parts.append(child.text)
        if child.tail and child.tail.strip():
            text_parts.append(child.tail)
    return ''.join(text_parts)


def is_bold(run):
    """Check if a run is bold."""
    bold = run.find('.//w:b', NAMESPACES)
    if bold is not None:
        val = bold.get(f'{{{NAMESPACES["w"]}}}val')
        return val is None or val.lower() not in ('0', 'false')
    return False


def is_italic(run):
    """Check if a run is italic."""
    italic = run.find('.//w:i', NAMESPACES)
    if italic is not None:
        val = italic.get(f'{{{NAMESPACES["w"]}}}val')
        return val is None or val.lower() not in ('0', 'false')
    return False


def get_heading_level(pPr):
    """Get heading level from paragraph properties."""
    pStyle = pPr.find('w:pStyle', NAMESPACES)
    if pStyle is not None:
        val = pStyle.get(f'{{{NAMESPACES["w"]}}}val')
        if val and val.startswith('Heading'):
            try:
                return int(val.replace('Heading', ''))
            except ValueError:
                pass
    return None


def is_list_paragraph(pPr):
    """Check if paragraph is a list item."""
    numPr = pPr.find('.//w:numPr', NAMESPACES)
    return numPr is not None


def get_list_info(pPr):
    """Get list numbering info."""
    numPr = pPr.find('.//w:numPr', NAMESPACES)
    if numPr is not None:
        ilvl = numPr.find('w:ilvl', NAMESPACES)
        level = 0
        if ilvl is not None:
            val = ilvl.get(f'{{{NAMESPACES["w"]}}}val')
            if val:
                level = int(val)
        return True, level
    return False, 0


def process_run(run):
    """Process a single run and return markdown text."""
    text = get_text_from_element(run)
    if not text:
        return ""

    # Handle bold and italic
    bold = is_bold(run)
    italic = is_italic(run)

    if bold and italic:
        text = f'***{text}***'
    elif bold:
        text = f'**{text}**'
    elif italic:
        text = f'*{text}*'

    return text


def process_paragraph(para):
    """Process a paragraph and return markdown."""
    pPr = para.find('w:pPr', NAMESPACES)

    # Get text from all runs
    text_parts = []
    for run in para.findall('.//w:r', NAMESPACES):
        processed = process_run(run)
        if processed:
            text_parts.append(processed)

    text = ''.join(text_parts).strip()
    if not text:
        return ""

    # Check if it's a heading
    if pPr is not None:
        level = get_heading_level(pPr)
        if level:
            return f'{"#" * level} {text}'

        # Check if it's a list
        is_list, list_level = get_list_info(pPr)
        if is_list:
            indent = "  " * list_level
            return f'{indent}- {text}'

    return text


def convert_docx_to_markdown(docx_path):
    """Convert a .docx file to markdown string."""
    docx_path = Path(docx_path)

    # Read the document.xml from the .docx zip
    with zipfile.ZipFile(docx_path, 'r') as z:
        if 'word/document.xml' not in z.namelist():
            raise ValueError(f"Invalid .docx file: {docx_path}")

        with z.open('word/document.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()

    # Process body paragraphs
    body = root.find('.//w:body', NAMESPACES)
    if body is None:
        raise ValueError("Could not find document body")

    markdown_lines = []
    for para in body.findall('w:p', NAMESPACES):
        md = process_paragraph(para)
        if md:
            markdown_lines.append(md)

    # Join lines and handle multiple consecutive empty lines
    markdown = '\n\n'.join(markdown_lines)
    # Clean up excessive whitespace
    markdown = re.sub(r'\n{3,}', '\n\n', markdown)

    return markdown


def main():
    if len(sys.argv) < 2:
        print("Usage: python docx_to_md.py <input.docx> [output.md]")
        print("       python docx_to_md.py --all")
        sys.exit(1)

    if sys.argv[1] == '--all':
        # Convert all .docx files in current directory
        for docx_file in Path('.').glob('*.docx'):
            md_path = docx_file.with_suffix('.md')
            try:
                markdown = convert_docx_to_markdown(docx_file)
                with open(md_path, 'w', encoding='utf-8') as f:
                    f.write(markdown)
                print(f"✓ Converted: {docx_file} -> {md_path}")
            except Exception as e:
                print(f"✗ Error converting {docx_file}: {e}")
    else:
        input_path = Path(sys.argv[1])
        if len(sys.argv) >= 3:
            output_path = Path(sys.argv[2])
        else:
            output_path = input_path.with_suffix('.md')

        markdown = convert_docx_to_markdown(input_path)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(markdown)
        print(f"✓ Converted: {input_path} -> {output_path}")


if __name__ == '__main__':
    main()
