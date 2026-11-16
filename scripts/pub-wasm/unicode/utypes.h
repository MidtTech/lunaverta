// Minimal ICU stand-in for LunaVerta's Publisher reader: only what libmspub uses.
#pragma once
#include <stdint.h>
typedef int UErrorCode;
typedef int32_t UChar32;
#define U_ZERO_ERROR 0
#define U_ILLEGAL_ARGUMENT_ERROR 1
#define U_SUCCESS(x) ((x) <= 0)
#define U_FAILURE(x) ((x) > 0)
