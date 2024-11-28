class SimpleLexer:
    def __init__(self, input: str):
        self.input = input
        self.pos = 0

    def eos(self) -> bool:
        return self.pos >= len(self.input)

    def try_eat(self, key: str) -> bool:
        if self.input[self.pos:self.pos+len(key)] == key:
            self.eat(len(key))
            return True
        else:
            return False

    def expect(self, key: str) -> str:
        if self.try_eat(key):
            return key
        else:
            raise Exception(f'"{key}" is expected.')

    def peek(self, n: int = 1) -> str:
        return self.input[self.pos:self.pos+n]
        
    def eat(self, n: int = 1) -> str:
        if self.pos + n > len(self.input):
            raise Exception('Unexpected EOS')
        ret = self.peek(n)
        self.pos += n
        return ret

    def back_to(self, p: int) -> None:
        self.pos = p

