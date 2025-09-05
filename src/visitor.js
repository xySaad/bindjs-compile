import {
  arrowFunctionExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  identifier,
  importDeclaration,
  importSpecifier,
  memberExpression,
  stringLiteral,
  variableDeclaration,
  VariableDeclaration,
  variableDeclarator,
  ObjectProperty,
  Program,
  Identifier,
  VariableDeclarator,
} from "@babel/types";
import { NodePath } from "@babel/traverse";
import {
  createElement,
  createFragment,
  createTextNode,
  setAttribute,
} from "./jsx.js";
import html from "./html.js";
export class RbindVisitor {
  refPrefix = "ref$";
  refImports = { list: false, state: false };
  Program = {
    enter: (_path) => {
      // Reset flags at the start of the program
      for (const key in this.refImports) this.refImports[key] = false;
    },
    /** @argument {NodePath<Program>} path*/
    exit: (path) => {
      const imports = this.refImports;
      // Add import statement if list or state was used
      const specifiers = [];
      for (const key in imports) {
        if (!imports[key]) continue;
        const spec = importSpecifier(identifier(key), identifier(key));
        specifiers.push(spec);
      }
      if (!specifiers.length) return;
      const importDecl = importDeclaration(specifiers, stringLiteral("rbind"));
      path.node.body.unshift(importDecl);
    },
  };

  /** @argument {NodePath<VariableDeclaration>} */
  VariableDeclaration(path) {
    const { kind, declarations } = path.node;
    if (kind !== "ref") return;

    declarations.forEach((d) => {
      if (this.isDerivedListDeclarator(path, d)) return;
      const callee = d.init?.type === "ArrayExpression" ? "list" : "state";
      this.refImports[callee] = true;
      d.id.extra = { ...d.id.extra, reactive: { kind: callee } }; // mark as reactive
      const arg = d.init || identifier("null");
      d.init = callExpression(identifier(callee), [arg]);
    });

    path.node.kind = "const";
  }

  /** @argument {VariableDeclarator} declarator*/
  isDerivedListDeclarator(path, declarator) {
    //TODO: instead of letting the user use ref in declaration
    //detect if DerivedList is used in DOM, if no fallback to .value usage

    const { init } = declarator;

    if (
      init?.type === "CallExpression" &&
      init.callee.type === "MemberExpression" &&
      init.callee.object.type === "Identifier" &&
      init.callee.property.name === "filter"
    ) {
      const binding = path.scope.getBinding(init.callee.object.name);
      if (binding?.identifier.extra?.reactive?.kind !== "list") {
        return false;
      }
      init.callee.extra = { ...init.callee.extra, derivedListCall: true }; //mark that the result of this callExpression results in a DerivedList
      return true;
    }

    return false;
  }

  /** @argument {NodePath<ObjectProperty>} */
  ObjectProperty({ node }) {
    const { key } = node;
    const keyField = key.type === "StringLiteral" ? "value" : "name";
    // property name of either {"foo-bar": "baz"} or {fooBar: "baz"}
    const prop = key[keyField];
    const prefix = this.refPrefix;

    // to prevent converting {"ref$": "foo"} to {"":"foo"}
    if (prop === prefix) throw new Error("can't name a property ref$");
    if (!prop.startsWith(prefix)) return;

    key[keyField] = prop.substring(prefix.length); // rename ref$foo to foo

    // convert {ref$foo: []} to {foo: list([])}
    const callee = node.value.type === "ArrayExpression" ? "list" : "state";
    this.refImports[callee] = true;
    node.value = callExpression(identifier(callee), [node.value]);
  }

  /** @argument {NodePath<Identifier>} path*/
  Identifier(path) {
    const { node, parent } = path;
    const binding = path.scope.getBinding(node.name);
    const kind = binding?.identifier.extra?.reactive.kind;
    if (!kind) return;

    // skip variable declaration
    // example: ref users = []; shouldn't be converted to ref users.value = [];
    if (parent.type === "VariableDeclarator" && parent.id === path.node) return;

    // simply add .value
    if (kind === "state") {
      this.useDotValue(path);
      return;
    }

    // handle kind "list"
    if (kind === "list") {
      this.compileReactiveList(path);
      return;
    }
    throw new Error(`kind ${kind} not implemented yet`);
  }

  // convert Identifier x into x.value
  useDotValue(path) {
    // path.node.extra = { ...path.node.extra, skipReactiveGetter: true };
    const expr = memberExpression(path.node, identifier("value"));
    path.replaceWith(expr);
    path.skip();
  }

  /** @argument {NodePath<Identifier>} path*/
  compileReactiveList(path) {
    const { parentPath, parent } = path;
    //TODO: in keyed mode use .setByKey(<string>, item) otherwise use .setByIndex(<int>, item)
    //case: data[n] = "foo" => data.set(n, "foo")
    if (
      parentPath.parent.type === "AssignmentExpression" &&
      parentPath.parent.left === parent &&
      parent.type === "MemberExpression" &&
      parent.object === path.node &&
      parent.computed
    ) {
      this.replaceWithMethod(parentPath.parentPath, path, "set", [
        parent.property,
        parentPath.parent.right,
      ]);
      return;
    }

    //handle Assignment
    if (
      parent.type === "AssignmentExpression" &&
      parent.operator === "=" &&
      parent.left === path.node &&
      parent.right.type === "ArrayExpression"
    ) {
      const elements = parent.right.elements;
      //case: data = []
      if (elements.length === 0) {
        this.replaceWithMethod(parentPath, path, "clear");
        return;
      }
      //case: data = [...data, ...foo] or data = [...data, {foo: "bar"}]
      if (elements.length > 0 && elements[0].type === "SpreadElement") {
        this.replaceWithMethod(parentPath, path, "push", elements.slice(1));
        return;
      }
    }

    if (!parent.extra?.derivedListCall) {
      this.useDotValue(path);
    }
  }

  /** @argument {NodePath<Identifier>} path*/
  replaceWithMethod(path, { node }, method, args = []) {
    const memberExpr = memberExpression(node, identifier(method));
    const call = callExpression(memberExpr, args);
    path.replaceWith(call);
    path.skip();
  }
}

export default function () {
  const visitor = new RbindVisitor();
  return {
    Program: visitor.Program,
    Identifier(path) {
      visitor.Identifier(path);
    },
    // JSXElement(path) {
    //   const handler = (node) => {
    //     const jsx = node;
    //     const tag = node.openingElement.name.name;
    //     if (!html.has(tag)) {
    //       const args = jsx.openingElement?.attributes?.map((a) => {
    //         if (a.type === "JSXSpreadAttribute") {
    //           return a.argument;
    //         }
    //         if (a.value?.type === "JSXExpressionContainer")
    //           return a.value.expression;
    //         return a.value;
    //       });

    //       const expression = callExpression(identifier(tag), [...args]);
    //       path.replaceWith(expression);
    //       path.skip();
    //       return expression;
    //     }
    //     const el = path.scope.generateUidIdentifier("el");
    //     const expression = createElement(jsx);
    //     path.scope.push({ id: el, init: expression, kind: "const" });
    //     const where = path.getStatementParent();

    //     jsx.openingElement?.attributes.forEach((attr) => {
    //       where.insertBefore(setAttribute(el, attr, where, jsx));
    //     });

    //     const fragID = path.scope.generateUidIdentifier("frag");

    //     const frag = createFragment(where, fragID);
    //     jsx.children?.forEach((child) => {
    //       if (child.type === "JSXElement") {
    //         const childEl = handler(child);
    //         frag.append(childEl);
    //       } else if (child.type === "JSXText") {
    //         const textNodeID = path.scope.generateUidIdentifier("textNode");
    //         const trimed = child.value.trim();
    //         if (!trimed.length) {
    //           return;
    //         }
    //         const text = stringLiteral(trimed);
    //         createTextNode(where, textNodeID, text);
    //         frag.append(textNodeID);
    //       } else if (child.type === "JSXExpressionContainer") {
    //         if (child.expression.type === "JSXEmptyExpression") return;
    //         if (child.expression.type === "Identifier") {
    //           const textNodeID = path.scope.generateUidIdentifier("textNode");
    //           createTextNode(where, textNodeID, child.expression);
    //           frag.append(textNodeID);
    //         } else {
    //           const elID = path.scope.generateUidIdentifier("el");
    //           where.insertBefore(
    //             variableDeclaration("const", [
    //               variableDeclarator(elID, child.expression),
    //             ])
    //           );
    //           frag.append(elID);

    //           if (child.expression.type === "ConditionalExpression") {
    //             const { test } = child.expression;

    //             const visitIdentifier = (idPath) => {
    //               const nodeEl = path.scope.generateUidIdentifier("nodeEl");

    //               where.insertBefore(
    //                 variableDeclaration("const", [
    //                   variableDeclarator(
    //                     nodeEl,
    //                     memberExpression(fragID, identifier("lastChild"))
    //                   ),
    //                 ])
    //               );
    //               const methodCall = callExpression(
    //                 memberExpression(nodeEl, identifier("replaceWith")),
    //                 [child.expression]
    //               );
    //               const binding = idPath.scope.getBinding(idPath.node.name);
    //               if (binding?.identifier?.extra?.reactive) {
    //                 const trigger = arrowFunctionExpression(
    //                   [],
    //                   blockStatement([expressionStatement(methodCall)])
    //                 );

    //                 binding.identifier.extra = {
    //                   ...binding.identifier.extra,
    //                   skipReactiveGetter: true,
    //                 };

    //                 const registerTrigger = expressionStatement(
    //                   callExpression(
    //                     memberExpression(
    //                       binding.identifier,
    //                       identifier("register")
    //                     ),
    //                     [trigger]
    //                   )
    //                 );

    //                 where.insertBefore(registerTrigger);
    //               }
    //             };

    //             if (test.type === "Identifier") {
    //               // direct case
    //               visitIdentifier({ node: test, scope: path.scope });
    //             } else {
    //               // complex expressions (Binary, Logical, Call, etc.)
    //               path.scope.traverse(test, {
    //                 Identifier: visitIdentifier,
    //               });
    //             }
    //           }
    //         }
    //       }
    //     });

    //     where.insertBefore(
    //       callExpression(memberExpression(el, identifier("append")), [fragID])
    //     );
    //     path.replaceWith(el);
    //     path.skip();
    //     return el;
    //   };
    //   handler(path.node);
    // },
    ObjectProperty(path) {
      visitor.ObjectProperty(path);
    },
    VariableDeclaration(path) {
      visitor.VariableDeclaration(path);
    },
  };
}
