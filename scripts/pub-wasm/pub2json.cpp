// LunaVerta: a Publisher (.pub) file in, a list of drawing steps out (JSON). The browser lays out the
// text and draws the pages itself, so the result uses the computer's own fonts. Nothing is uploaded.
#include <libmspub/libmspub.h>
#include <librevenge/librevenge.h>
#include <librevenge-stream/librevenge-stream.h>
#include <string>
#include <string.h>
#include <stdlib.h>
using namespace librevenge;

static void esc(std::string &o, const char *s) {
  o += '"';
  for (const unsigned char *p = (const unsigned char *)s; *p; p++) {
    unsigned char c = *p;
    if (c == '"' || c == '\\') { o += '\\'; o += (char)c; }
    else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o += b; }
    else o += (char)c;
  }
  o += '"';
}
static void props(std::string &o, const RVNGPropertyList &pl);
static void vec(std::string &o, const RVNGPropertyListVector &v) {
  o += '[';
  for (unsigned long i = 0; i < v.count(); i++) { if (i) o += ','; props(o, v[i]); }
  o += ']';
}
static void props(std::string &o, const RVNGPropertyList &pl) {
  o += '{'; bool first = true;
  RVNGPropertyList::Iter it(pl);
  for (it.rewind(); it.next();) {
    if (!first) o += ','; first = false;
    esc(o, it.key()); o += ':';
    if (it.child()) vec(o, *it.child());
    else if (it()) esc(o, it()->getStr().cstr());
    else o += "null";
  }
  o += '}';
}

class JsonGen : public RVNGDrawingInterface {
public:
  std::string o;
  bool first = true;
  void op(const char *name, const RVNGPropertyList *pl = nullptr) {
    o += first ? "[" : ","; first = false;
    o += "{\"op\":"; esc(o, name);
    if (pl) { o += ",\"p\":"; props(o, *pl); }
    o += '}';
  }
  void startDocument(const RVNGPropertyList &p) override { op("startDocument", &p); }
  void endDocument() override { op("endDocument"); }
  void setDocumentMetaData(const RVNGPropertyList &p) override { op("meta", &p); }
  void defineEmbeddedFont(const RVNGPropertyList &) override {}
  void startPage(const RVNGPropertyList &p) override { op("startPage", &p); }
  void endPage() override { op("endPage"); }
  void startMasterPage(const RVNGPropertyList &p) override { op("startMasterPage", &p); }
  void endMasterPage() override { op("endMasterPage"); }
  void setStyle(const RVNGPropertyList &p) override { op("setStyle", &p); }
  void startLayer(const RVNGPropertyList &p) override { op("startLayer", &p); }
  void endLayer() override { op("endLayer"); }
  void startEmbeddedGraphics(const RVNGPropertyList &p) override { op("startEmbeddedGraphics", &p); }
  void endEmbeddedGraphics() override { op("endEmbeddedGraphics"); }
  void openGroup(const RVNGPropertyList &p) override { op("openGroup", &p); }
  void closeGroup() override { op("closeGroup"); }
  void drawRectangle(const RVNGPropertyList &p) override { op("rect", &p); }
  void drawEllipse(const RVNGPropertyList &p) override { op("ellipse", &p); }
  void drawPolygon(const RVNGPropertyList &p) override { op("polygon", &p); }
  void drawPolyline(const RVNGPropertyList &p) override { op("polyline", &p); }
  void drawPath(const RVNGPropertyList &p) override { op("path", &p); }
  void drawGraphicObject(const RVNGPropertyList &p) override { op("image", &p); }
  void drawConnector(const RVNGPropertyList &p) override { op("connector", &p); }
  void startTextObject(const RVNGPropertyList &p) override { op("startText", &p); }
  void endTextObject() override { op("endText"); }
  void startTableObject(const RVNGPropertyList &p) override { op("startTable", &p); }
  void openTableRow(const RVNGPropertyList &p) override { op("openRow", &p); }
  void closeTableRow() override { op("closeRow"); }
  void openTableCell(const RVNGPropertyList &p) override { op("openCell", &p); }
  void closeTableCell() override { op("closeCell"); }
  void insertCoveredTableCell(const RVNGPropertyList &p) override { op("coveredCell", &p); }
  void endTableObject() override { op("endTable"); }
  void insertTab() override { op("tab"); }
  void insertSpace() override { op("space"); }
  void insertText(const RVNGString &t) override { o += first ? "[" : ","; first = false; o += "{\"op\":\"text\",\"t\":"; esc(o, t.cstr()); o += '}'; }
  void insertLineBreak() override { op("br"); }
  void insertField(const RVNGPropertyList &p) override { op("field", &p); }
  void openOrderedListLevel(const RVNGPropertyList &p) override { op("openList", &p); }
  void openUnorderedListLevel(const RVNGPropertyList &p) override { op("openList", &p); }
  void closeOrderedListLevel() override { op("closeList"); }
  void closeUnorderedListLevel() override { op("closeList"); }
  void openListElement(const RVNGPropertyList &p) override { op("openPara", &p); }
  void closeListElement() override { op("closePara"); }
  void defineParagraphStyle(const RVNGPropertyList &) override {}
  void openParagraph(const RVNGPropertyList &p) override { op("openPara", &p); }
  void closeParagraph() override { op("closePara"); }
  void defineCharacterStyle(const RVNGPropertyList &) override {}
  void openSpan(const RVNGPropertyList &p) override { op("openSpan", &p); }
  void closeSpan() override { op("closeSpan"); }
  void openLink(const RVNGPropertyList &p) override { op("openLink", &p); }
  void closeLink() override { op("closeLink"); }
};

extern "C" {
// 0 = not a Publisher file, 1 = could not be read, else a malloc'd JSON array of drawing steps
char *pub2json(const unsigned char *data, unsigned long len) {
  RVNGStringStream input(data, len);
  if (!libmspub::MSPUBDocument::isSupported(&input)) return (char *)0;
  JsonGen gen;
  if (!libmspub::MSPUBDocument::parse(&input, &gen)) return (char *)1;
  gen.o += gen.first ? "[]" : "]";
  char *r = (char *)malloc(gen.o.size() + 1); memcpy(r, gen.o.c_str(), gen.o.size() + 1);
  return r;
}
}
