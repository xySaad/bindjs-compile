import { callExpression, identifier, VariableDeclaration } from "@babel/types";
import { NodePath } from "@babel/traverse";
import { types } from "./parser.js";
export default function () {
  return {
    /** @argument {NodePath<VariableDeclaration>} path */
    VariableDeclaration({ node }) {
      const { kind, declarations } = node;
      if (kind in types) {
        declarations.forEach((d) => {
          d.init = callExpression(identifier(kind), [d.init]);
        });
        node.kind = "const";
      }
    },
  };
}
