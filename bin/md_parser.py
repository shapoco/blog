import re
import warnings
from article_struct import *
from simple_lexer import *

class MdParser:
    DEBUG_PRINT=False
    RE_H = r'^(#+)\s*(.*)$'
    RE_UL = r'^([-\*])\s+(.*)$'
    RE_OL = r'^(\d+)\.\s+(.*)$'
    RE_BLOCKQUOTE = r'^(>\s+)(.*)$'
    RE_NOTES = r'^\[!(note|tip|important|warning|caution)\]$'
    RE_TABLE = r'^\|(.+\|.+)\|$'
    RE_HR = r'^---+$'
    
    def __init__(self, lines: list[str]):
        # 行末の空白を除去
        for i in range(len(lines)):
            lines[i] = lines[i].rstrip(' 　\t\r\n')
        
        self.lines = lines
        self.indent_stack: list[str] = []
        self.tab_size = 4
    
    def joined_indent(self) -> str:
        return ''.join(self.indent_stack)
    
    def log(self, msg) -> None:
        print(f'{self.joined_indent()}{msg}')
    
    def warn(self, msg) -> None:
        warnings.warn(f'#{len(self.lines)} *W: {msg}')

    def info(self, msg) -> None:
        if MdParser.DEBUG_PRINT:
            self.log(msg)

    def eof(self) -> bool:
        return len(self.lines) == 0

    def end_of_block(self, end_with_empty_line: bool) -> bool:
        if self.eof():
            return True

        line = self.lines[0]

        if end_with_empty_line and len(line) == 0:
            return True

        return not line.startswith(self.joined_indent())

    def skip_white_lines(self) -> int:
        n = 0
        while not self.eof() and self.lines[0] == self.joined_indent().rstrip():
            line = self.lines.pop(0)
            n += 1
        if n > 0:
            self.info(f'(skipped {n} white lines)')
        return n

    def peek_line(self) -> str:
        if self.eof():
            raise 'Unexpected EOF'
        
        line = self.lines[0]
        while len(line) == 0:
            line = self.lines.pop(0)

    def peek_indent(self) -> str:
        if self.eof():
            raise 'Unexpected EOF'
        
        if len(line) == 0 or line == self.joined_indent().rstrip():
            # 空行の場合は前の行と同じ深さとみなす
            return self.joined_indent()

        # インデントの深さ
        line = self.lines[0]
        for i in range(len(line)):
            if line[i] == ' ':
                pass
            elif line[i] == '>':
                pass
            elif line[i] == '　':
                self.warn('Wide space detected.')
            elif line[i] == '\t':
                self.warn('TAB char detected.')
            else:
                return line[:i]

    def on_indented(self, indent: str = None) -> None:
        if not indent:
            indent = ' ' * self.tab_size
        self.indent_stack.append(indent)

    def on_unindented(self) -> None:
        self.indent_stack.pop(-1)

    def peek_line_unindent(self, end_with_empty_line: bool) -> str:
        if self.end_of_block(end_with_empty_line):
            raise 'Unexpected end of block'
        return self.lines[0][len(self.joined_indent()):]

    def pop_line_unindent(self, end_with_empty_line: bool) -> str:
        line = self.peek_line_unindent(end_with_empty_line)
        self.lines.pop(0)
        return line

    def body(self) -> ArticleBody:
        self.info(f'--> body()')
        ret = ArticleBody()
        ret.children = self.block_children(first_line='', text_as_paragraph=True)
        if not self.eof():
            raise Exception(f'Input not finished (next="{self.lines[0]}")')
        self.info(f'<-- body()')
        return ret
        
    def block_children(self, first_line: str, text_as_paragraph: bool) -> list[Element]:
        self.info(f'--> block_children("{first_line}")')
        children: list[Element] = []
        line = first_line
        while True:
            if not line:
                self.skip_white_lines()
                if self.end_of_block(end_with_empty_line=text_as_paragraph):
                    break
                line = self.pop_line_unindent(end_with_empty_line=text_as_paragraph)
            
            if re.match(MdParser.RE_H, line):
                children.append(self.hx(line))
            elif re.match(MdParser.RE_UL, line):
                children.append(self.ul(line))
            elif re.match(MdParser.RE_OL, line):
                children.append(self.ol(line))
            elif re.match(MdParser.RE_BLOCKQUOTE, line):
                children.append(self.blockquote(line))
            elif re.match(MdParser.RE_TABLE, line):
                children.append(self.table(line))
            elif re.match(MdParser.RE_HR, line):
                children.append(HR())
            else:
                p = self.p(line)
                # ブロック要素の HTML が直接記述されている場合は <p>...</p> で囲まない
                text: str = p.text_content()
                m = re.match(r'^<(p|ul|ol|table|script)[^>]*>', text)
                if m and text.endswith(f'</{m[1]}>'):
                    children.append(TextElement(text))
                else:
                    children.append(p)

            line = None
        
        self.info(f'<-- block_children()')
        return children

    def p(self, first_line) -> P:
        self.info(f'--> p("{first_line}")')
        ret = P()
        ret.children.append(self.text(first_line, end_with_empty_line=True))
        self.info(f'<-- p()')
        return ret

    def hx(self, line) -> ArticleBody:
        self.info(f'--> hx("{line}")')
        m = re.match(MdParser.RE_H, line)
        level = len(m[1])
        text = m[2]
        self.info(f'<-- hx()')
        return Hx(level, text)

    def ul(self, first_line: str) -> UL:
        return self.xl(ordered=False, first_line=first_line)
        
    def ol(self, first_line: str) -> OL:
        return self.xl(ordered=True, first_line=first_line)
        
    def xl(self, ordered: bool, first_line: str):
        tag = 'ol' if ordered else 'ul'
        regexp = MdParser.RE_OL if ordered else MdParser.RE_UL
        self.info(f'--> {tag}("{first_line}")')
        m = re.match(regexp, first_line)
        marker = m[1]
        text = m[2]

        ret = OL() if ordered else UL()
        ret.children.append(self.li(text))
        
        while True:
            self.skip_white_lines()
            if self.end_of_block(end_with_empty_line=False):
                break

            next_line = self.peek_line_unindent(end_with_empty_line=False)
            m = re.match(regexp, next_line)
            if not m:
                break
            self.pop_line_unindent(end_with_empty_line=False)
            
            ret.children.append(self.li(m[2]))
        
        self.info(f'<-- {tag}()')
        return ret
        
    def li(self, first_line: str) -> LI:
        self.info(f'--> li("{first_line}")')
        self.on_indented()
        ret = LI()
        ret.children = self.block_children(first_line=first_line, text_as_paragraph=False)
        
        if len(ret.children) == 1 and issubclass(type(ret.children[0]), P):
            ret.children = ret.children[0].children
        
        self.on_unindented()
        self.info(f'<-- li()')
        return ret

    def blockquote(self, first_line: str) -> BLOCKQUOTE:
        self.info(f'--> blockquote("{first_line}")')
        m = re.match(MdParser.RE_BLOCKQUOTE, first_line)
        indent = m[1]
        text = m[2].strip()
        self.on_indented(indent)
        ret = BLOCKQUOTE()
        m_note = re.match(MdParser.RE_NOTES, text.lower())
        if m_note:
            text = ''
            ret.classes.append(m_note[1])
        ret.children = self.block_children(first_line=text, text_as_paragraph=True)
        
        if len(ret.children) == 1 and issubclass(type(ret.children[0]), P):
            ret.children = ret.children[0].children
        
        self.on_unindented()
        self.info(f'<-- blockquote()')
        return ret

    def table(self, first_line: str) -> TABLE:
        self.info(f'--> table("{first_line}")')

        rows: list[list[str]] = []
        
        header = self.table_line(first_line)
        rows.append(header)
        
        aligns = self.table_line(self.pop_line_unindent(end_with_empty_line=True))
        assert len(header) == len(aligns), f'Number of column mismatch: {len(header)} != {len(aligns)}'
        for i in range(len(aligns)):
            if re.match(r'^\s*:-+\s*$', aligns[i]):
                aligns[i] = None
            elif re.match(r'^\s*-+:\s*$', aligns[i]):
                aligns[i] = 'right'
            elif re.match(r'^\s*:-+:\s*$', aligns[i]) or re.match(r'^\s*-+\s*$', aligns[i]):
                aligns[i] = 'center'
            else:
                raise Exception(f'Invalid alignment: "{aligns[i]}"')
        
        while not self.end_of_block(end_with_empty_line=True):
            cols = self.table_line(self.pop_line_unindent(end_with_empty_line=True))
            assert len(header) == len(cols), f'Number of column mismatch: {len(header)} != {len(cols)}'
            rows.append(cols)
            
        self.info(f'<-- table()')
        return TABLE(aligns, rows)

    def table_line(self, line: str) -> list[str]:
        lex = SimpleLexer(line)
        cells: list[str] = []
        lex.expect('|')
        cells.append(self.inline_text(lex, term='|'))
        lex.expect('|')
        while not lex.eos():
            cells.append(self.inline_text(lex, term='|'))
            lex.expect('|')
        return cells

    def text(self, first_line: str, end_with_empty_line: bool) -> TextElement:
        self.info(f'--> text("{first_line}")')
        ret = TextElement(first_line) 
        while True:
            if self.end_of_block(end_with_empty_line):
                break
            if len(ret.text) > 0:
                ret.text += '\n'
            ret.text += self.pop_line_unindent(end_with_empty_line)
        
        ret.text = self.markup_inline_text(ret.text)
        
        self.info(f'<-- text()')
        return ret

    def markup_inline_text(self, text: str) -> str:
        return self.inline_text(SimpleLexer(text))
        
    def inline_text(self, lex: SimpleLexer, term: str = None) -> str:
        ret = ''
        while True:
            if term:
                if lex.eos():
                    raise Exception(f'{term} is Expected')
                elif lex.peek(len(term)) == term:
                    return ret
            elif lex.eos():
                return ret
            
            if lex.try_eat('!['):
                ret += self.inline_link(lex, '![')
            elif lex.try_eat('['):
                ret += self.inline_link(lex, '[')
            elif lex.try_eat('**'):
                ret += self.inline_decoration(lex, '**', 'strong')
            elif lex.try_eat('~~'):
                ret += self.inline_decoration(lex, '~~', 'del')
            elif lex.try_eat('`'):
                ret += self.inline_code(lex)
            else:
                lex.try_eat('\\')
                ret += lex.eat()
    
    def inline_link(self, lex: SimpleLexer, start_key: str) -> str:
        start_pos = lex.pos
        try:
            link_text = self.inline_text(lex, ']')
            lex.expect('](')
            url = ''
            while not lex.try_eat(')'):
                url += lex.eat()
            if start_key == '![':
                if url.endswith('mp4'):
                    self.info(f'video: src="{url}", alt="{link_text}"')
                    return \
                        f'<video controls>' + \
                        f'<source src="{url}" type="video/mp4" />' + \
                        f'</video>'
                else:
                    self.info(f'image: src="{url}", alt="{link_text}"')
                    return f'<img src="{url}" alt="{link_text}">'
            else:
                self.info(f'link: href="{url}", text="{link_text}"')
                
                # サイト内リンクかどうかの判定
                targetIsLocal = False
                if url.startswith('http://') or url.startswith('https://'):
                    targetIsLocal = not not re.match(r'^https?://((www|blog)\.)?shapoco\.net/', url)
                else:
                    targetIsLocal = True
                
                # サイト内の *.md へのリンクを *.html へのリンクに置換
                if url.endswith('.md') and (url.startswith('/') or url.startswith('./') or url.startswith('../')):
                    url = url.replace('/article.md', '/index.md')
                    url = url[:-2] + 'html'
                    
                if targetIsLocal:
                    return f'<a href="{url}">{link_text}</a>'
                else:
                    # 外部サイトは新しいウィンドウで開く
                    return f'<a href="{url}" target="_blank">{link_text}</a>'

        except Exception as ex:
            self.info(f'Link parse failed: {ex}')
            lex.back_to(start_pos)
            return start_key
    
    def inline_decoration(self, lex: SimpleLexer, key: str, tag: str) -> str:
        start_pos = lex.pos
        try:
            inner_text = self.inline_text(lex, key)
            lex.expect(key)
            return f'<{tag}>{inner_text}</{tag}>'
        except Exception as ex:
            self.info(f'Decoration parse failed: {ex}')
            lex.back_to(start_pos)
            return key
    
    def inline_code(self, lex: SimpleLexer) -> str:
        start_pos = lex.pos
        try:
            code = ''
            while not lex.try_eat('`'):
                code += lex.eat()
            return f'<code>{code}</code>'
        except Exception as ex:
            self.info(f'Inline code parse failed: {ex}')
            lex.back_to(start_pos)
            return '`'
    
        
        