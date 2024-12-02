import io
import re

def get_indent(depth: int) -> str:
    return '  ' * depth

def escape_for_html(text: str) -> str:
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&#39;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text.strip()

def escape_for_attr(text: str) -> str:
    text = re.sub(r'[\r\n]+', ' ', text)
    text = escape_for_html(text)
    return text.strip()

def remove_tags(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text)

class Element:
    def to_html(self, depth: int = 0) -> str:
        return None

    def text_content(self) -> str:
        return None

    def is_multiline(self) -> bool:
        return None

class TextElement(Element):
    def __init__(self, text: str = ''):
        super().__init__()
        self.text: str = text

    def to_html(self, depth: int = 0) -> str:
        # todo: エスケープ
        html = self.text
        if self.is_multiline():
            return html.replace('\n', '\n' + get_indent(depth - 1))
        else:
            return html

    def text_content(self) -> str:
        return self.text

    def is_multiline(self) -> bool:
        return '\n' in self.text

class RawHtml(TextElement):
    def __init__(self, text: str = ''):
        super().__init__(text)

    def is_multiline(self) -> bool:
        return True

class CodeBlock(TextElement):
    def __init__(self, text: str = '', lang: str = ''):
        super().__init__(text)
        self.lang: str = lang

    def to_html(self, depth: int = 0) -> str:
        return '<pre>' + self.text + '</pre>'

    def is_multiline(self) -> bool:
        return True

class TaggedElement(Element):
    def __init__(self, tag: str):
        self.tag = tag
        self.children: list[Element] = []
        self.classes: list[str] = []
        
    def to_html(self, depth: int = 0) -> str:
        ret: str = ''
        if len(self.classes) > 0:
            ret += f'<{self.tag} class="{' '.join(self.classes)}">'
        else:
            ret += f'<{self.tag}>'
        if self.is_multiline():
            ret += '\n'
        for child in self.children:
            if self.is_multiline():
                ret += get_indent(depth)
            ret += child.to_html(depth + 1)
            if self.is_multiline():
                ret += '\n'
        if self.is_multiline():
            if not ret.endswith('\n'):
                ret += '\n'                
            ret += get_indent(depth - 1)
        ret += f'</{self.tag}>'
        return ret

    def text_content(self) -> str:
        ret = ''
        for child in self.children:
            ret += child.text_content()
        return ret

    def is_multiline(self) -> bool:
        if len(self.children) > 1:
            return True
        for child in self.children:
            if child.is_multiline():
                return True
        return False

    def get_1st_element_by_class(self, typ: type, depth: int = 9999) -> Element:
        if issubclass(type(self), typ):
            return self
        if depth <= 0:
            return None
        for child in self.children:
            if issubclass(type(child), TaggedElement):
                ret = child.get_1st_element_by_class(typ, depth - 1)
                if ret and not ret.text_content().startswith('<img ') and not ret.text_content().startswith('<video '):
                    return ret
        return None

class ArticleBody(TaggedElement):
    def __init__(self):
        super().__init__('')
        
    def to_html(self, depth: int = 0) -> str:
        ret = ''
        for child in self.children:
            ret += get_indent(depth) + child.to_html(depth + 1) + '\n'
        return ret
    
    def is_multiline(self) -> bool:
        return True

class Hx(TaggedElement):
    def __init__(self, level: int, text: str):
        super().__init__('h' + str(level + 1))
        self.level: int = level
        self.children.append(TextElement(text))

class P(TaggedElement):
    def __init__(self):
        super().__init__('p')

class ListBase(TaggedElement):
    def __init__(self, tag: str):
        super().__init__(tag)

class UL(ListBase):
    def __init__(self):
        super().__init__('ul')

    def is_multiline(self) -> bool:
        return True

class OL(ListBase):
    def __init__(self):
        super().__init__('ol')

    def is_multiline(self) -> bool:
        return True

class LI(TaggedElement):
    def __init__(self):
        super().__init__('li')

class BLOCKQUOTE(TaggedElement):
    def __init__(self):
        super().__init__('blockquote')

class TABLE(TaggedElement):
    def __init__(self, aligns: list[str], rows: list[list[str]]):
        super().__init__('table')
        self.aligns = aligns
        self.rows = rows

    def to_html(self, depth = 0) -> str:
        # 文字数が少ない列は nowrap にする
        nowraps = [True] * len(self.rows[0])
        for cols in self.rows:
            for icol in range(len(cols)):
                nowraps[icol] &= len(remove_tags(cols[icol])) < 15
        
        html = ''
        html += '<table>\n'
        for irow in range(len(self.rows)):
            cell_tag = 'th' if irow == 0 else 'td'
            cols = self.rows[irow]
            html += '  <tr>\n'
            for icol in range(len(cols)):
                attr = ''
                if nowraps[icol]:
                    attr += ' class="nowrap"'
                if self.aligns[icol]:
                    attr += f' style="text-align: {self.aligns[icol]};"'
                html += f'    <{cell_tag}{attr}>{cols[icol]}</{cell_tag}>\n'
            html += '  </tr>\n'
        html += '</table>'
        return html.replace('\n', f'\n{get_indent(depth-1)}')

    def is_multiline(self) -> bool:
        return True

class TR(TaggedElement):
    def __init__(self):
        super().__init__('tr')

    def is_multiline(self) -> bool:
        return True

class TH(TaggedElement):
    def __init__(self):
        super().__init__('th')

class TD(TaggedElement):
    def __init__(self):
        super().__init__('td')

class HR(TaggedElement):
    def __init__(self):
        super().__init__('hr')

    def to_html(self, depth: int = 0) -> str:
        return f'{get_indent(depth)}<hr>\n'
    
    def is_multiline(self) -> bool:
        return True
