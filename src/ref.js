import {
  arrowFunctionExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  identifier,
  memberExpression,
} from "@babel/types";

/** Wrap an expression in node.register(() => expr) */
export const register = (node, expr) =>
  callExpression(memberExpression(node, identifier("register")), [
    arrowFunctionExpression([], blockStatement([expressionStatement(expr)])),
  ]);

/** Return reactive kind ("ref") or undefined; skip variable declarations */
export const getReactiveKind = ({ node, parent, scope }) => {
  const binding = scope.getBinding(node.name);
  const kind = binding?.identifier.extra?.reactive?.kind;
  const isDeclaration =
    parent.type === "VariableDeclarator" && parent.id === node;
  return !isDeclaration && kind;
};

/** Recursively collect register statements from an expression */
export const trackRefs = (expr, parent, scope, registerCallback) => {
  const statements = [];

  const visitNode = (node) => {
    switch (node.type) {
      case "Identifier":
        if (getReactiveKind({ node, parent, scope })) {
          statements.push(register(node, registerCallback()));
        }
        break;
      case "ConditionalExpression":
        visitNode(node.test);
        break;
      case "BinaryExpression":
        visitNode(node.left);
        visitNode(node.right);
        break;
      case "CallExpression":
        if (node.callee.type === "Identifier") {
          const binding = scope.getBinding(node.callee.name);
          statements.push(...computedStatements(binding, registerCallback));

          for (const arg of node.arguments) {
            const argBinding = scope.getBinding(arg.name);
            const computed = computedStatements(argBinding, registerCallback);

            if (computed.length) {
              statements.push(...computed);
            } else {
              visitNode(arg);
            }
          }
        } else
          throw new Error(
            `CallExpression calle type ${node.callee.type} unimplemented`
          );

        break;
    }
  };

  visitNode(expr);
  return statements;
};

/** Visitor to mark computed functions and track refs */
export const markComputedFunctions = (path) => ({
  Identifier(innerPath) {
    if (getReactiveKind(innerPath)) {
      // skip functions that only sets the ref
      if (
        innerPath.parent.type === "AssignmentExpression" &&
        innerPath.parent.left === innerPath.node
      ) {
        return;
      }
      const binding = innerPath.scope.getBinding(innerPath.node.name);
      const { id } = path.parent;

      if (!id.extra?.computed) {
        id.extra = {
          ...id.extra,
          computed: {
            set: new Set([binding]),
            refs: [innerPath.node],
          },
        };
        return;
      }

      if (!id.extra.computed.set.has(binding)) {
        id.extra.computed.set.add(binding);
        id.extra.computed.refs.push(innerPath.node);
      }
    }
  },
});

/** Generate register statements for a computed function */
export const computedStatements = (fnBinding, registerCallback) => {
  const statements = [];
  const computed = fnBinding?.identifier.extra?.computed;
  if (!computed) return statements;

  for (const dep of computed.refs) {
    statements.push(register(dep, registerCallback()));
  }

  return statements;
};
