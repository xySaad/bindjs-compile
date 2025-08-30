import { callExpression, identifier, VariableDeclaration } from "@babel/types";
import { NodePath } from "@babel/traverse";
import { types } from "./parser.js";

/** @returns {import("@babel/traverse").Visitor} */
export default function () {
  return {
    ObjectProperty({ node }) {
      const { name } = node.key;
      for (const type in types) {
        const prefix = `${type}$`;
        if (name.startsWith(prefix)) {
          node.key.name = name.substring(prefix.length);
          node.value = callExpression(identifier(type), [node.value]);
        }
      }
    },
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
