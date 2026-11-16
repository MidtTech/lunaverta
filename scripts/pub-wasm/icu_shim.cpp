// The few ICU calls libmspub makes, without shipping ICU (megabytes) to the browser:
// UTF-16LE and the Windows code pages for older Publisher text, and LCID → language for the text's language.
#include <string.h>
#include <stdlib.h>
#include "unicode/ucnv.h"
#include "unicode/ucsdet.h"
#include "unicode/uloc.h"

struct UConverter { int kind; };  // 0 = UTF-16LE, 1252/1250/1251/... = code page
static const unsigned short CP1252[32] = { 0x20AC,0xFFFD,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0160,0x2039,0x0152,0xFFFD,0x017D,0xFFFD,
  0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x02DC,0x2122,0x0161,0x203A,0x0153,0xFFFD,0x017E,0x0178 };

UConverter *ucnv_open(const char *name, UErrorCode *err) {
  UConverter *c = (UConverter *)malloc(sizeof(UConverter));
  if (!name || !strcmp(name, "UTF-16LE")) c->kind = 0;
  else if (!strncmp(name, "windows-", 8)) c->kind = atoi(name + 8);
  else c->kind = 1252;
  *err = U_ZERO_ERROR;
  return c;
}
UChar32 ucnv_getNextUChar(UConverter *c, const char **src, const char *lim, UErrorCode *err) {
  const unsigned char *s = (const unsigned char *)*src, *l = (const unsigned char *)lim;
  *err = U_ZERO_ERROR;
  if (c->kind == 0) {
    if (l - s < 2) { *src = lim; *err = U_ILLEGAL_ARGUMENT_ERROR; return 0; }
    unsigned u = s[0] | (s[1] << 8); s += 2;
    if (u >= 0xD800 && u < 0xDC00 && l - s >= 2) { unsigned v = s[0] | (s[1] << 8); if (v >= 0xDC00 && v < 0xE000) { s += 2; u = 0x10000 + ((u - 0xD800) << 10) + (v - 0xDC00); } }
    *src = (const char *)s; return u;
  }
  unsigned b = *s++; *src = (const char *)s;
  if (b < 0x80) return b;
  if (c->kind == 1252 && b < 0xA0) return CP1252[b - 0x80];
  return b < 0xA0 ? 0xFFFD : b; // Latin-1 for the rest: right for Western European text
}
void ucnv_close(UConverter *c) { free(c); }

// No detection: libmspub then uses windows-1252 for old files.
UCharsetDetector *ucsdet_open(UErrorCode *status) { *status = U_ILLEGAL_ARGUMENT_ERROR; return 0; }
void ucsdet_setText(UCharsetDetector *, const char *, int32_t, UErrorCode *status) { *status = U_ILLEGAL_ARGUMENT_ERROR; }
const UCharsetMatch **ucsdet_detectAll(UCharsetDetector *, int32_t *n, UErrorCode *status) { *n = 0; *status = U_ILLEGAL_ARGUMENT_ERROR; return 0; }
const char *ucsdet_getName(const UCharsetMatch *, UErrorCode *status) { *status = U_ILLEGAL_ARGUMENT_ERROR; return 0; }
void ucsdet_close(UCharsetDetector *) {}

static const struct { unsigned id; const char *loc; } LCIDS[] = {
  {1030,"da_DK"},{1033,"en_US"},{2057,"en_GB"},{1031,"de_DE"},{1036,"fr_FR"},{3082,"es_ES"},{1034,"es_ES"},{1044,"nb_NO"},{2068,"nn_NO"},{1053,"sv_SE"},
  {1043,"nl_NL"},{1040,"it_IT"},{1035,"fi_FI"},{1045,"pl_PL"},{2070,"pt_PT"},{1046,"pt_BR"},{3079,"de_AT"},{2055,"de_CH"},{4105,"en_CA"},{3081,"en_AU"},{0,0} };
int32_t uloc_getLocaleForLCID(uint32_t id, char *loc, int32_t cap, UErrorCode *st) {
  for (int i = 0; LCIDS[i].id; i++) if (LCIDS[i].id == id) { strncpy(loc, LCIDS[i].loc, cap); loc[cap - 1] = 0; *st = U_ZERO_ERROR; return (int32_t)strlen(loc); }
  *st = U_ILLEGAL_ARGUMENT_ERROR; return 0;
}
int32_t uloc_getLanguage(const char *l, char *o, int32_t cap, UErrorCode *e) { int n = 0; while (l[n] && l[n] != '_' && n < cap - 1) { o[n] = l[n]; n++; } o[n] = 0; *e = U_ZERO_ERROR; return n; }
int32_t uloc_getCountry(const char *l, char *o, int32_t cap, UErrorCode *e) { const char *p = strchr(l, '_'); int n = 0; if (p) { p++; while (p[n] && p[n] != '_' && n < cap - 1) { o[n] = p[n]; n++; } } o[n] = 0; *e = U_ZERO_ERROR; return n; }
int32_t uloc_getScript(const char *, char *o, int32_t, UErrorCode *e) { o[0] = 0; *e = U_ZERO_ERROR; return 0; }
