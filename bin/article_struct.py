import io
import re

def get_indent(depth: int) -> str:
    return '  ' * depth

def escape_for_attr(text: str) -> str:
    text = re.sub(r'[\r\n]+', ' ', text)
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&#39;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text.strip()

class Element:
    def to_html(self, depth: int = 0) -> str:
        return None

    def text_content(self) -> str:
        return None

    def is_multiline(self) -> bool:
        return None

class TextElement(Element):
    def __init__(self, text: str = '') -> None:
        super().__init__()
        self.text: str = text

    def to_html(self, depth: int = 0) -> str:
        # todo: エスケープ
        if self.is_multiline():
            return self.text.replace('\n', '\n' + get_indent(depth - 1))
        else:
            return self.text

    def text_content(self) -> str:
        return self.text

    def is_multiline(self) -> bool:
        return '\n' in self.text

class CodeBlock(TextElement):
    def __init__(self, lang: str = '') -> None:
        super().__init__('')
        self.lang: str = lang

    def to_html(self, depth: int = 0) -> str:
        # todo: エスケープ
        return get_indent(depth) + '<pre>' + self.text + '</pre>\n'

    def is_multiline(self) -> bool:
        return True

class TaggedElement(Element):
    def __init__(self, tag: str) -> None:
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
                if ret and not ret.text_content().startswith('<img '):
                    return ret
        return None

class ArticleBody(TaggedElement):
    def __init__(self) -> None:
        super().__init__('')
        
    def to_html(self, depth: int = 0) -> str:
        ret = ''
        for child in self.children:
            ret += get_indent(depth) + child.to_html(depth + 1) + '\n'
        return ret
    
    def is_multiline(self) -> bool:
        return True
    
    def first_header_text(self) -> str:
        h = self.get_1st_element_by_class(Hx, 1)
        if not h:
            return 'Untitled'
        return re.sub(r'<[^>]+>', '', h.text_content())

    def first_paragraph_text(self) -> str:
        p = self.get_1st_element_by_class(P, 1)
        if not p:
            return self.first_header_text()
        return re.sub(r'<[^>]+>', '', p.text_content())

class Hx(TaggedElement):
    def __init__(self, level: int, text: str) -> None:
        super().__init__('h' + str(level + 1))
        self.level: int = level
        self.children.append(TextElement(text))

class P(TaggedElement):
    def __init__(self) -> None:
        super().__init__('p')

class ListBase(TaggedElement):
    def __init__(self, tag: str) -> None:
        super().__init__(tag)

class UL(ListBase):
    def __init__(self) -> None:
        super().__init__('ul')

    def is_multiline(self) -> bool:
        return True

class OL(ListBase):
    def __init__(self) -> None:
        super().__init__('ol')

    def is_multiline(self) -> bool:
        return True

class LI(TaggedElement):
    def __init__(self) -> None:
        super().__init__('li')

class BLOCKQUOTE(TaggedElement):
    def __init__(self) -> None:
        super().__init__('blockquote')

class HR(TaggedElement):
    def __init__(self) -> None:
        super().__init__('hr')

    def to_html(self, depth: int = 0) -> str:
        return f'{get_indent(depth)}<hr>\n'
    
    def is_multiline(self) -> bool:
        return True