import { Parser, TokenType, defaultOptions } from "acorn";
import { estreeToBabel } from "estree-to-babel";
const { keywordTypes } = Parser.acorn;
const kw = (n) => (keywordTypes[n] = new TokenType(n, {}));
export const types = {
  state: kw("state"),
  list: kw("list"),
};

function rbind(ParentParser) {
  return class extends ParentParser {
    parse(program) {
      const existing = this.keywords.source;
      const newWords = existing.replace("const", "const|state|list");
      const newRegex = new RegExp(newWords);
      this.keywords = newRegex;
      return super.parse(program);
    }
    parseStatement(context, topLevel, exports) {
      const node = this.startNode();
      switch (this.type) {
        case types.state:
        case types.list:
          return this.parseVarStatement(node, this.type.label);
        default:
          return super.parseStatement(context, topLevel, exports);
      }
    }
  };
}

export default function (code, options = defaultOptions) {
  return estreeToBabel(Parser.extend(rbind).parse(code, options));
}
