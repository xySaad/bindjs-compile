import { dirname, join, resolve } from "path";
import { NodePath } from "@babel/traverse";
import {
  callExpression,
  exportNamedDeclaration,
  identifier,
  Identifier,
  importDeclaration,
  importSpecifier,
  JSXElement,
  memberExpression,
  ObjectProperty,
  Program,
  stringLiteral,
  VariableDeclaration,
  VariableDeclarator,
} from "@babel/types";
import t from "@babel/types";
import { createElement, setAttributes } from "./jsx.js";
import { getReactiveKind, markComputedFunctions } from "./ref.js";
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

  /** @argument {NodePath<VariableDeclaration>} path*/
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
    const kind = getReactiveKind(path);
    if (!kind) return;
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
    if (path.node.extra?.visited) return;
    path.node.extra = { ...path.node.extra, visited: true };
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

  JSXElement = {
    /** @param {NodePath<JSXElement>} path*/
    enter(path) {
      const opening = path.node.openingElement;
      const { name, attributes } = opening;
      //TODO: handle name as JSXMemberExpression and JSXNamespacedName
      if (name.type !== "JSXIdentifier")
        throw new Error(`tagName type ${name.type} unimplemented`);
      const tag = name.name;
      const statementParent = path.getStatementParent();
      const elID = path.scope.generateUidIdentifier(tag);
      statementParent.insertBefore([
        createElement(elID, tag),
        ...setAttributes(path, elID, attributes),
      ]);
    },
    exit(path) {
      path.remove();
    },
  };
}
/**
 *
 * @param {Map<string, Map<string, any>} moduleGraph
 * @returns {import("@babel/traverse").Visitor}
 */
export default function (inputPath, moduleGraph) {
  const visitor = new RbindVisitor();
  const moduleMeta = moduleGraph.get(inputPath);
  return {
    Program: visitor.Program,
    ImportDeclaration(path) {
      path.node.specifiers;
      const { source, specifiers } = path.node;
      const currentFile = inputPath;
      const currentDir = dirname(currentFile);
      const resolvedPath = join(currentDir, source.value);
      const refImports = moduleGraph.get(resolvedPath);
      if (!refImports) return;

      for (const spec of specifiers) {
        if (spec.type !== "ImportSpecifier")
          throw Error(`${spec.type} not implemented`);
        const ref = refImports.get(spec.imported.name);
        if (!ref) return;

        if (ref.computed) {
          console.log(ref);
        }
      }
    },
    Identifier(path) {
      visitor.Identifier(path);
    },
    ObjectProperty(path) {
      visitor.ObjectProperty(path);
    },
    VariableDeclaration(path) {
      visitor.VariableDeclaration(path);
    },
    /** @argument {NodePath<JSXElement>} path*/
    JSXElement: {
      enter(path) {
        visitor.JSXElement.enter(path);
      },
      exit(path) {
        visitor.JSXElement.exit(path);
      },
    },
    FunctionDeclaration(path) {
      if (path.parent.type !== "VariableDeclarator") return;
      path.traverse(markComputedFunctions(path));
    },

    ArrowFunctionExpression(path) {
      if (path.parent.type !== "VariableDeclarator") return;
      path.traverse(markComputedFunctions(path));
      const { extra, name } = path.parent.id;
      const computed = extra?.computed;
      if (!computed) return;
      if (path.parentPath.parentPath.parent.type !== "ExportNamedDeclaration")
        return;

      moduleMeta.set(name, extra);

      // moduleMeta.set(path.node.na)
      // export refs used in exported computed functions
      for (const dep of computed.set) {
        if (dep.path.parentPath.parent.type !== "ExportNamedDeclaration") {
          dep.path.parentPath.replaceWith(
            exportNamedDeclaration(dep.path.parent)
          );
        }
      }
    },
  };
}
