#pragma once
#include "utypes.h"
typedef struct UConverter UConverter;
UConverter *ucnv_open(const char *name, UErrorCode *err);
UChar32 ucnv_getNextUChar(UConverter *cnv, const char **source, const char *sourceLimit, UErrorCode *err);
void ucnv_close(UConverter *cnv);
