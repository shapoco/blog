#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <assert.h>

uint16_t log2u16(uint16_t x) {
    static constexpr uint16_t table[] = {
        0  , 22 , 44 , 63 , 82 , 100, 118, 134,
        150, 165, 179, 193, 207, 220, 232, 244, 256
    };

    uint16_t ret = 0xc000;
    if (x & 0xf000) {
        if (x & 0xc000) { x >>= 2; ret += 0x2000; }
        if (x & 0x2000) { x >>= 1; ret += 0x1000; }
    }
    else {
        if (!(x & 0xffc0)) { x <<= 6; ret -= 0x6000; }
        if (!(x & 0xfe00)) { x <<= 3; ret -= 0x3000; }
        if (!(x & 0xf800)) { x <<= 2; ret -= 0x2000; }
        if (!(x & 0xf000)) { x <<= 1; ret -= 0x1000; }
    }

    int index = (x >> 8) & 0xf;
    uint16_t a = table[index];
    uint16_t b = table[index + 1];
    uint16_t q = x & 0xff;
    uint16_t p = 256 - q;
    ret += ((a * p + b * q) + 8) >> 4;

    return ret;
}

int main(int argc, char* argv[]) {
    static constexpr int N = 1 << 16;
    static constexpr int MAX_ERROR = 16;
    float diff_f32_neg_worst = 0;
    float diff_f32_pos_worst = 0;
    float diff_f32_sum = 0;
    int32_t diff_u16_neg_worst = 0;
    int32_t diff_u16_pos_worst = 0;
    int32_t diff_u16_sum = 0;

    int32_t error_dist[MAX_ERROR * 2 + 1];
    memset(error_dist, 0, sizeof(error_dist));

    assert(log2u16(0) == 0);

    FILE *fp = fopen("error_all.csv", "w");
    for (uint32_t x = 1; x < N; x++) {
        float exp_f32 = log2(x);
        uint32_t exp_u32 = round(exp_f32 * 4096);
        uint16_t exp_u16 = exp_u32 < 0xffffu ? exp_u32 : 0xffffu;

        uint16_t act_u16 = log2u16(x);
        float act_f32 = (float)act_u16 / 4096;

        int32_t diff_u16 = (int32_t)act_u16 - (int32_t)exp_u16;
        float diff_f32 = act_f32 - exp_f32;

        if (abs(diff_u16) < MAX_ERROR) {
            error_dist[diff_u16 + MAX_ERROR]++;
        }
        else {
            fprintf(stderr, "*ERROR: x=%5d, exp=%7.3f (0x%4x), act=%7.3f (0x%4x), err=%+7.3f (%+4d)\n",
                x,
                exp_f32, (int)exp_u16,
                act_f32, (int)act_u16,
                diff_f32, (int)diff_u16);
        }

        fprintf(fp, "%d,%d\n", x, (int)diff_u16);

        if (diff_f32 < diff_f32_neg_worst) diff_f32_neg_worst = diff_f32;
        if (diff_f32 > diff_f32_pos_worst) diff_f32_pos_worst = diff_f32;
        diff_f32_sum += diff_f32;

        if (diff_u16 < diff_u16_neg_worst) diff_u16_neg_worst = diff_u16;
        if (diff_u16 > diff_u16_pos_worst) diff_u16_pos_worst = diff_u16;
        diff_u16_sum += diff_u16;
    }
    fclose(fp);

    fp = fopen("error_dist.csv", "w");
    for (int32_t err = -MAX_ERROR; err <= MAX_ERROR; err++) {
        fprintf(fp, "%d,%d\n", err, error_dist[err + MAX_ERROR]);
    }
    fclose(fp);

    fp = fopen("summary.log", "w");
    float diff_f32_ave = diff_f32_sum / (N - 1);
    float diff_u16_ave = (float)diff_u16_sum / (N - 1);
    fprintf(fp, "Worst Negative Error = %10.6f (%+5d LSB)\n", diff_f32_neg_worst, diff_u16_neg_worst);
    fprintf(fp, "Worst Positive Error = %10.6f (%+5d LSB)\n", diff_f32_pos_worst, diff_u16_pos_worst);
    fprintf(fp, "Average Error        = %10.6f (%+5.2f LSB)\n", diff_f32_ave, diff_u16_ave);
    fclose(fp);

    return diff_u16_ave < 16 ? 0 : 1;
}
