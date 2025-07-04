#define F_CPU (250000)

#include <avr/io.h>
#include <stdint.h>
#include <util/delay.h>

static constexpr uint8_t PORT_LED = 2;

int main() {
  _PROTECTED_WRITE(CLKCTRL.MCLKCTRLB, CLKCTRL_PDIV_64X_gc | CLKCTRL_PEN_bm);

  PORTA_DIRSET = (1 << PORT_LED);

  while (true) {
    _delay_ms(500);
    PORTA_OUTTGL = (1 << PORT_LED);
  }

  return 0;
}
