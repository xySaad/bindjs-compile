import {
  callExpression,
  identifier,
  isArrayExpression,
  memberExpression,
  stringLiteral,
  VariableDeclaration,
} from "@babel/types";
import { NodePath } from "@babel/traverse";
import {
  createElement,
  createFragment,
  createTextNode,
  setAttribute,
} from "./jsx.js";
import { convertMethods } from "./listMethods.js";
import html from "./html.js";
const match = (pattern, ...list) => {
  if (list.includes(pattern)) {
    return true;
  }
  return false;
};

/** @returns {import("@babel/traverse").Visitor} */
export default function () {
  return {
    Identifier(path) {
      const binding = path.scope.getBinding(path.node.name);
      const isVariableInit =
        path.parent.id === path.node &&
        path.parent.type === "VariableDeclarator";
      const isList = binding?.path.node.id?.extra?.reactive.kind === "list";
      const isListMethod =
        path.parentPath.parent.type === "CallExpression" &&
        path.parent.type === "MemberExpression";

      if (
        binding?.path.node.id?.extra?.reactive &&
        !isVariableInit &&
        path.parent.type !== "ObjectProperty" &&
        !path.node.extra?.skipReactiveGetter &&
        !isListMethod
      ) {
        // handle list setter
        if (
          path.parent.type === "AssignmentExpression" &&
          path.parent.left === path.node &&
          isList
        ) {
          convertMethods(path);
          return;
        }
        //case: data[n] = "foo" => data.set(n, "foo")
        if (
          path.parent.type === "MemberExpression" &&
          path.parent.computed &&
          path.parentPath.parent.type === "AssignmentExpression"
        ) {
          const setter = callExpression(
            memberExpression(path.node, identifier("set")),
            [path.parent.property, path.parentPath.parent.right]
          );
          path.parentPath.parentPath.replaceWith(setter);
          return;
        }
        path.node.extra = { ...path.node.extra, skipReactiveGetter: true };
        const expr = memberExpression(path.node, identifier("value"));
        path.replaceWith(expr);
        path.skip();
      }
    },
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
        const tag = node.openingElement.name.name;

        if (!html.has(tag)) {
          const args = jsx.openingElement?.attributes?.map((a) => {
            if (a.type === "JSXSpreadAttribute") {
              return a.argument;
            }
            if (a.value?.type === "JSXExpressionContainer")
              return a.value.expression;
            return a.value;
          });
          const expression = callExpression(identifier(tag), [...args]);
          path.replaceWith(expression);
          return expression;
        }
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

      const prefix = `ref$`;
      if (node.key.name.length <= prefix.length) {
        return;
      }
      if ((name ?? value).startsWith(prefix)) {
        node.key.name = name.substring(prefix.length);
        const callee = node.value.type === "ArrayExpression" ? "list" : "state";
        node.value = callExpression(identifier(callee), [node.value]);
      }
    },
    /** @argument {NodePath<VariableDeclaration>} path */
    VariableDeclaration({ node }) {
      const { kind, declarations } = node;
      if (kind === "ref") {
        declarations.forEach((d) => {
          const callee = d.init.type === "ArrayExpression" ? "list" : "state";
          d.id.extra = { ...d.id.extra, reactive: { kind: callee } };
          d.init = callExpression(identifier(callee), [d.init]);
        });
        node.kind = "const";
      }
    },
  };
}
