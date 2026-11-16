#pragma once
#include "utypes.h"
#define ULOC_FULLNAME_CAPACITY 157
int32_t uloc_getLocaleForLCID(uint32_t hostID, char *locale, int32_t localeCapacity, UErrorCode *status);
int32_t uloc_getLanguage(const char *localeID, char *language, int32_t languageCapacity, UErrorCode *err);
int32_t uloc_getCountry(const char *localeID, char *country, int32_t countryCapacity, UErrorCode *err);
int32_t uloc_getScript(const char *localeID, char *script, int32_t scriptCapacity, UErrorCode *err);
