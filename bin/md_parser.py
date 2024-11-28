import re
import warnings
from article_struct import *
from simple_lexer import *

class MdParser:
    DEBUG_PRINT=True
    RE_H = r'^(#+)\s*(.*)$'
    RE_UL = r'^([-\*])\s+(.*)$'
    RE_OL = r'^(\d+)\.\s+(.*)$'
    RE_HR = r'^---+$'
    
    def __init__(self, lines: list[str]):
        self.lines = lines
        self.last_indent = ''
        self.tab_size = 4
    
    def log(self, msg) -> None:
        print(f'{self.last_indent}{msg}')
    
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

        return not line.startswith(self.last_indent)

    def skip_white_lines(self) -> int:
        n = 0
        while not self.eof() and len(self.lines[0]) == 0:
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
        
        line = self.lines[0]
        
        # インデントの深さ
        indent_len = 0
        if len(line) > 0:
            num_whites = 0
            for i in range(len(line)):
                if line[i] == ' ':
                    num_whites += 1
                elif line[i] == '　':
                    num_whites += 1
                    self.warn('Wide space detected.')
                elif line[i] == '\t':
                    num_whites += self.tab_size
                    self.warn('TAB char detected.')
                else:
                    indent_len = i
                    break
            return line[:len(indent_len)]
        else:
            # 空行の場合は前の行と同じ深さとみなす
            return self.last_indent

    def on_indented(self, indent_char: str = '') -> None:
        indent_char += ' ' * (self.tab_size - len(indent_char))
        self.last_indent += indent_char

    def on_unindented(self) -> None:
        if len(self.last_indent) < self.tab_size:
            raise 'Indent broken'
        self.last_indent = self.last_indent[:-self.tab_size]

    def peek_line_unindent(self, end_with_empty_line: bool) -> str:
        if self.end_of_block(end_with_empty_line):
            raise 'Unexpected end of block'
        return self.lines[0][len(self.last_indent):]

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
            elif re.match(MdParser.RE_HR, line):
                children.append(HR())
            else:
                #if text_as_paragraph:
                    children.append(self.p(line))
                #else:
                #    children.append(self.text(line, end_with_empty_line=text_as_paragraph))

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

    #def markup_inline_text(self, text: str) -> str:
    #    ret = ''
    #    while len(text) > 0:
    #        m_link = re.search(MdParser.RE_LINK, text)
    #        
    #        nearest: re.Match = None
    #        if m_link and (not nearest or m_link.start() < nearest.start()):
    #           nearest = m_link
    #        
    #        if nearest:
    #            ret += text[:nearest.start()]
    #            if m_link and m_link.start() == nearest.start():
    #                prefix = m_link[1]
    #                link_text = m_link[2]
    #                url = m_link[3]
    #                if prefix == '':
    #                    self.info(f'link: href={url}, text="{link_text}"')
    #                    ret += f'<a href="{url}" target="_blank">{link_text}</a>'
    #                elif prefix == '!':
    #                    self.info(f'image: src={url}, alt="{link_text}"')
    #                    ret += f'<img src="{url}" alt="{link_text}">'
    #                else:
    #                    raise Exception(f'Invalid link prefix: "{prefix}"')
    #                text = text[nearest.end():]
    #            else:
    #                raise Exception('Not implemented.')
    #        else:
    #            ret += text
    #            text = ''
    #    return ret

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
                ret += self.decoration(lex, '**', 'strong')
            else:
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
                self.info(f'image: src="{url}", alt="{link_text}"')
                return f'<img src="{url}" alt="{link_text}">'
            else:
                self.info(f'link: href="{url}", text="{link_text}"')
                return f'<a href="{url}" target="_blank">{link_text}</a>'
        except Exception as ex:
            self.info(f'Link parse failed: {ex}')
            lex.back_to(start_pos)
            return start_key
    
    def decoration(self, lex: SimpleLexer, key: str, tag: str) -> str:
        start_pos = lex.pos
        try:
            inner_text = self.inline_text(lex, key)
            lex.expect(key)
            return f'<{tag}>{inner_text}</{tag}>'
        except Exception as ex:
            self.info(f'Decoration parse failed: {ex}')
            lex.back_to(start_pos)
            return key
    
        
        