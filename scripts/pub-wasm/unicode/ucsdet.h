#pragma once
#include "utypes.h"
typedef struct UCharsetDetector UCharsetDetector;
typedef struct UCharsetMatch UCharsetMatch;
UCharsetDetector *ucsdet_open(UErrorCode *status);
void ucsdet_setText(UCharsetDetector *ucsd, const char *textIn, int32_t len, UErrorCode *status);
const UCharsetMatch **ucsdet_detectAll(UCharsetDetector *ucsd, int32_t *matchesFound, UErrorCode *status);
const char *ucsdet_getName(const UCharsetMatch *ucsm, UErrorCode *status);
void ucsdet_close(UCharsetDetector *ucsd);
