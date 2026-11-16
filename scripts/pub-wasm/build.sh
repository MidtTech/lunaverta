#!/bin/sh
# Builds docs/vendor/libmspub/lv-pub.{js,wasm}: the Publisher reader for "Publisher to PDF".
# libmspub 0.1.5 (MPL-2.0) and librevenge 0.0.6 (MPL-2.0 / LGPL-2.1+) from their release tarballs,
# zlib 1.3.1, boost headers, and emscripten (3.1.x). ICU is replaced by the small stand-in in
# unicode/ + icu_shim.cpp (UTF-16 and Windows code pages; no charset detection).
# Usage: SRC=<folder with libmspub-0.1.5, librevenge-0.0.6, zlib-1.3.1> BOOST=<folder holding boost/> sh build.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd); O=${OBJ:-/tmp/lv-pub-obj}; mkdir -p "$O"
RV=$SRC/librevenge-0.0.6; MP=$SRC/libmspub-0.1.5; Z=$SRC/zlib-1.3.1
INC="-I$RV/inc -I$HERE -I$MP/inc -I$Z -isystem $BOOST"
for f in adler32 crc32 deflate inflate inffast inftrees trees zutil uncompr compress; do emcc -O2 -c $Z/$f.c -o $O/z_$f.o; done
for f in RVNGBinaryData RVNGMemoryStream RVNGProperty RVNGPropertyList RVNGPropertyListVector RVNGString RVNGStringVector RVNGOLEStream RVNGStreamImplementation RVNGZipStream; do
  em++ -O2 -std=c++17 -DNDEBUG -DLIBREVENGE_BUILD -DLIBREVENGE_STREAM_BUILD -DBOOST_ALL_NO_LIB $INC -c $RV/src/lib/$f.cpp -o $O/rv_$f.o
done
for f in $MP/src/lib/*.cpp; do em++ -O2 -std=c++17 -DNDEBUG -DBOOST_ALL_NO_LIB $INC -c $f -o $O/mp_$(basename $f .cpp).o; done
em++ -O2 -std=c++17 $INC -c $HERE/icu_shim.cpp -o $O/icu_shim.o
em++ -O2 -std=c++17 $INC -c $HERE/pub2json.cpp -o $O/pub2json.o
em++ -O2 $O/*.o -o "$HERE/../../docs/vendor/libmspub/lv-pub.js" -sMODULARIZE=1 -sEXPORT_NAME=LVPubModule -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS=_pub2json,_malloc,_free -sEXPORTED_RUNTIME_METHODS=UTF8ToString -sENVIRONMENT=web,worker,node -sFILESYSTEM=0
