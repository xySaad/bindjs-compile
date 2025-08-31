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
const match = (pattern, ...list) => {
  if (list.includes(pattern)) {
    return true;
  }
  return false;
};

/** @returns {import("@babel/traverse").Visitor} */
export default function () {
  return {
    CallExpression(path) {
      const { callee } = path.node;
      if (callee.type !== "MemberExpression") {
        return;
      }
      const binding = path.scope.getBinding(callee.object.name);
      if (!binding?.identifier?.extra?.reactive) {
        return;
      }
      if (callee.property.name !== "map") {
        return;
      }
    },
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
            console.error("JSXSpreadAttribute not imlemented");
            return;
          }
          where.insertBefore(setAttribute(el, attr, where));
        });

        const fragID = path.scope.generateUidIdentifier("frag");

        const frag = createFragment(where, fragID);
        jsx.children?.forEach((child) => {
          if (child.type === "JSXElement") {
            const childEl = handler(child);
            frag.append(childEl);
          } else if (match(child.type, "JSXExpressionContainer", "JSXText")) {
            const textNodeID = path.scope.generateUidIdentifier("textNode");
            let text = child.expression; //JSXExpressionContainer
            if (child.type === "JSXText") {
              const trimed = child.value.trim();
              if (!trimed.length) {
                return;
              }
              text = stringLiteral(trimed);
            }
            if (text.type === "JSXEmptyExpression") {
              return;
            }

            createTextNode(where, textNodeID, text);
            frag.append(textNodeID);
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

      for (const kind in types) {
        const prefix = `${kind}$`;
        if ((name ?? value).startsWith(prefix)) {
          node.key.name = name.substring(prefix.length);
          node.value = callExpression(identifier(kind), [node.value]);
        }
      }
    },
    /** @argument {NodePath<VariableDeclaration>} path */
    VariableDeclaration({ node }) {
      const { kind, declarations } = node;
      if (kind in types) {
        declarations.forEach((d) => {
          d.id.extra = { ...d.id.extra, reactive: { kind } };
          d.init = callExpression(identifier(kind), [d.init]);
        });
        node.kind = "const";
      }
    },
  };
}
