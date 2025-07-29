#pragma once
#include <stdint.h>

#ifdef SEG7_USE_PROGMEM
#include <avr/pgmspace.h>
#endif

#ifndef PROGMEM
#define PROGMEM
#endif

#ifndef pgm_read_byte
#define pgm_read_byte(addr) (*(const uint8_t*)(addr))
#endif

#ifdef SEG7_INCLUDE_AS_STATIC
#define SEG7_FUNC_PREFIX static
#else
#define SEG7_FUNC_PREFIX
#endif

#ifndef SEG7_POS_TYPE
#define SEG7_POS_TYPE int16_t
#endif

#ifndef SEG7_COL_TYPE
#define SEG7_COL_TYPE uint16_t
#endif

namespace seg7 {

using pos_t = SEG7_POS_TYPE;
using col_t = SEG7_COL_TYPE;

static constexpr uint8_t SEG7_NEG_SIGN = 16;
static constexpr uint8_t SEG7_DOT_MASK = 0x80;

SEG7_FUNC_PREFIX void fillRect(pos_t x, pos_t y, uint8_t w, uint8_t h,
                               col_t col);

#ifdef SEG7_INCLUDE_IMPL
static const uint8_t SEG7_LUT[] PROGMEM = {
    0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c,
    0x58, 0x5e, 0x79, 0x71, 0x40, 0x01, 0x1d, 0x5d, 0x81, 0x58, 0x18, 0x41};
#endif

SEG7_FUNC_PREFIX pos_t drawDigit(pos_t x, pos_t y, uint8_t size, col_t col,
                                 uint8_t dig)
#ifdef SEG7_INCLUDE_IMPL
{
  uint8_t seg = pgm_read_byte(&SEG7_LUT[dig & 0x01f]);
  for (uint8_t iseg = 0; iseg < 7; iseg++) {
    if (seg & 1) {
      uint8_t pos = pgm_read_byte(&SEG7_LUT[17 + iseg]);
      pos_t segX = x + size * (pos & 0x07);
      pos_t segY = y + size * ((pos >> 4) & 0x0f);
      bool vertical = 0 != (pos & 0x08);
      uint8_t segW = vertical ? size : size * 4;
      uint8_t segH = vertical ? size * 3 : size;
      fillRect(segX, segY, segW, segH, col);
    }
    seg >>= 1;
  }
  if (dig & SEG7_DOT_MASK) {
    fillRect(x + size * 7, y + 8 * size, size * 2, size * 2, col);
    x += size * 2;
  }
  return x + size * 8;
}
#else
    ;
#endif

SEG7_FUNC_PREFIX pos_t drawString(pos_t x, pos_t y, uint8_t size, col_t col,
                                  const uint8_t* digs, uint8_t len)
#ifdef SEG7_INCLUDE_IMPL
{
  for (uint8_t idig = 0; idig < len; idig++) {
    x = drawDigit(x, y, size, col, digs[idig]);
  }
  return x;
}
#else
    ;
#endif

SEG7_FUNC_PREFIX pos_t drawHex32(pos_t x, pos_t y, uint8_t size, col_t col,
                                 uint32_t num)
#ifdef SEG7_INCLUDE_IMPL

{
  constexpr uint8_t NUM_DIGS = sizeof(num) * 2;
  uint8_t digs[NUM_DIGS];
  for (int8_t i = NUM_DIGS - 1; i >= 0; i--) {
    digs[i] = num & 0x0F;
    num >>= 4;
  }
  return drawString(x, y, size, col, digs, NUM_DIGS);
}
#else
    ;
#endif

SEG7_FUNC_PREFIX pos_t drawDec32(pos_t x, pos_t y, uint8_t size, col_t col,
                                 int32_t num, int8_t dotPos
#ifdef SEG7_INCLUDE_IMPL
) {
  // sizeof(T) * log(256) / log(10) + 1
  constexpr uint8_t NUM_DIGS = (sizeof(num) * 616 + 255) / 256 + 1;
  bool neg = num < 0;
  if (neg) num = -num;
  uint8_t digs[NUM_DIGS];
  uint8_t i = NUM_DIGS;
  do {
    digs[--i] = num % 10;
    num /= 10;
    if (dotPos-- == 0) {
      digs[i] |= SEG7_DOT_MASK;
    }
  } while (num > 0 || dotPos >= 0);
  if (neg) {
    digs[--i] = SEG7_NEG_SIGN;
  }
  return drawString(x, y, size, col, digs + i, NUM_DIGS - i);
}
#else
= -1);
#endif

}  // namespace seg7
