import {
  callExpression,
  identifier,
  memberExpression,
  stringLiteral,
  VariableDeclaration,
} from "@babel/types";
import { NodePath } from "@babel/traverse";
import { types } from "./parser.js";
import {
  createElement,
  createFragment,
  createTextNode,
  setAttribute,
} from "./jsx.js";

/** @returns {import("@babel/traverse").Visitor} */
export default function () {
  return {
    JSXElement(path) {
      const handler = (node) => {
        const jsx = node;
        const el = path.scope.generateUidIdentifier("el");
        const expression = createElement(jsx);
        path.scope.push({ id: el, init: expression, kind: "const" });
        const where = path.parentPath.isReturnStatement()
          ? path.parentPath
          : path;

        jsx.openingElement?.attributes.forEach((attr) => {
          if (attr.type === "JSXSpreadAttribute") {
            return;
          }
          where.insertBefore(setAttribute(el, attr.name.name, attr.value));
        });

        const fragID = path.scope.generateUidIdentifier("frag");

        const frag = createFragment(where, fragID);

        jsx.children?.forEach((child) => {
          switch (child.type) {
            case "JSXElement":
              const childEl = handler(child);
              frag.append(childEl);
              break;
            case "JSXExpressionContainer":
            case "JSXText":
              const textNodeID = path.scope.generateUidIdentifier("textNode");
              const text = child.expression ?? stringLiteral(child.value);
              createTextNode(where, textNodeID, text);
              frag.append(textNodeID);
              break;
            default:
              throw new Error(`Unexpected jsx child type ${child.type}`);
          }
        });

        where.insertBefore(
          callExpression(memberExpression(el, identifier("append")), [fragID])
        );
        path.replaceWith(el);
        return el;
      };
      handler(path.node);
    },
    ObjectProperty({ node }) {
      const { name, value } = node.key;

      for (const type in types) {
        const prefix = `${type}$`;
        if ((name ?? value).startsWith(prefix)) {
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
