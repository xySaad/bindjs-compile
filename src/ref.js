import {
  arrowFunctionExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  identifier,
  memberExpression,
  JSXEmptyExpression,
} from "@babel/types";
import t from "@babel/types";
export const register = (node, expr) => {
  return callExpression(memberExpression(node, identifier("register")), [
    arrowFunctionExpression([], blockStatement([expressionStatement(expr)])),
  ]);
};

/** @argument {NodePath<Identifier>} path*/
export const getReactiveKind = ({ node, parent, scope }) => {
  const binding = scope.getBinding(node.name);
  const kind = binding?.identifier.extra?.reactive?.kind;

  // skip variable declaration
  // example: ref users = []; shouldn't be converted to ref users.value = [];
  const isDeclaration =
    parent.type === "VariableDeclarator" && parent.id === node;

  return !isDeclaration && kind;
};

/** @argument {t.Expression | JSXEmptyExpression} expression */
export const getRefStatementsFromExpression = (
  expression,
  parent,
  scope,
  registerCallback
) => {
  const statements = [];

  switch (expression.type) {
    case "Identifier":
      if (getReactiveKind({ node: expression, parent, scope })) {
        statements.push(register(expression, registerCallback()));
      }
      break;
    case "ConditionalExpression":
      statements.push(
        ...getRefStatementsFromExpression(
          expression.test,
          expression,
          scope,
          registerCallback
        )
      );
      break;
    case "BinaryExpression":
      const { left, right } = expression;
      for (const node of [left, right]) {
        statements.push(
          ...getRefStatementsFromExpression(
            node,
            expression,
            scope,
            registerCallback
          )
        );
      }
      break;
    case "CallExpression":
      const { callee, arguments: args } = expression;
      if (callee.type === "Identifier") {
        const binding = scope.getBinding(callee.name);
        statements.push(...getComputedStatements(binding, registerCallback));
        for (const arg of args) {
          //check if the function passed is computed
          const binding = scope.getBinding(arg.name);
          const computed = getComputedStatements(binding, registerCallback);
          if (computed.length) {
            statements.push(...computed);
            continue;
          }

          //check other types of arguments
          statements.push(
            ...getRefStatementsFromExpression(
              arg,
              expression,
              scope,
              registerCallback
            )
          );
        }
      }
    default:
      break;
  }

  return statements;
};

export const markeComputedFunctions = (path) => {
  return {
    Identifier(innerPath) {
      if (getReactiveKind(innerPath)) {
        const binding = innerPath.scope.getBinding(innerPath.node.name);
        const { id } = path.parent;
        if (id.extra?.computed && !id.extra.computed.set.has(binding)) {
          id.extra.computed.set.add(binding);
          id.extra.computed.refs.push(innerPath.node);
        } else {
          id.extra = {
            ...id.extra,
            computed: {
              set: new Set([binding]),
              refs: [innerPath.node],
            },
          };
        }
      }
    },
  };
};
export const getComputedStatements = (fnBinding, registerCallback) => {
  const statements = [];
  const computed = fnBinding?.identifier.extra?.computed;
  if (!computed) return [];

  for (const dep of computed.refs) {
    statements.push(register(dep, registerCallback()));
  }
  return statements;
};
