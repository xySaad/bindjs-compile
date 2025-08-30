import { Parser, defaultOptions, tokTypes } from "acorn";
import { estreeToBabel } from "estree-to-babel";
import JSX from "acorn-jsx";
export const types = {
  state: null,
  list: null,
};

function rbind(ParentParser) {
  return class extends ParentParser {
    parseStatement(context, topLevel, exports) {
      // parse state and list declarations
      const node = this.startNode();
      if (this.type == tokTypes.name && this.value in types) {
        return this.parseVarStatement(node, this.value);
      }
      return super.parseStatement(context, topLevel, exports);
    }
  };
}

export default function (code, options = defaultOptions) {
  return estreeToBabel(Parser.extend(JSX(), rbind).parse(code, options));
}
