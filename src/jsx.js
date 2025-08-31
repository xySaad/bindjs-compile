import {
  arrowFunctionExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  identifier,
  isFunction,
  memberExpression,
  stringLiteral,
  traverse,
  variableDeclaration,
  variableDeclarator,
} from "@babel/types";

/** @param {NodePath<JSXElement>} path */
export const createElement = (node) => {
  const tag = node.openingElement.name.name;

  // document.createElement(tag)
  const methodCall = callExpression(
    memberExpression(identifier("document"), identifier("createElement")),
    [stringLiteral(tag)]
  );

  return methodCall;
};
export const setAttribute = (el, attr, path) => {
  const name = attr.name.name;
  let value = attr.value;

  // Normalize JSXExpressionContainer
  if (value?.type === "JSXExpressionContainer") {
    value = value.expression;
  }

  // Initial setter: _el.setAttribute("class", value)
  const method = memberExpression(el, identifier("setAttribute"));
  const methodCall = callExpression(method, [stringLiteral(name), value]);
  if (isFunction(value)) {
    return methodCall;
  }
  path.scope.traverse(value, {
    Identifier(idPath) {
      const binding = idPath.scope.getBinding(idPath.node.name);
      if (!binding?.identifier?.extra?.reactive) return;

      // Wrap setter into a trigger function
      const trigger = arrowFunctionExpression(
        [],
        blockStatement([
          expressionStatement(
            callExpression(method, [stringLiteral(name), value])
          ),
        ])
      );

      const registerTrigger = expressionStatement(
        callExpression(
          memberExpression(binding.identifier, identifier("register")),
          [trigger]
        )
      );

      // Insert after the setter
      path.insertBefore(registerTrigger);
    },
  });

  return methodCall;
};

export const createFragment = (where, varID) => {
  const methodCall = callExpression(
    memberExpression(
      identifier("document"),
      identifier("createDocumentFragment")
    ),
    []
  );

  where.insertBefore(
    variableDeclaration("const", [variableDeclarator(varID, methodCall)])
  );
  return {
    append: (child) => {
      where.insertBefore(
        callExpression(memberExpression(varID, identifier("append")), [child])
      );
    },
  };
};
export const createTextNode = (where, varID, text) => {
  const methodCall = callExpression(
    memberExpression(identifier("document"), identifier("createTextNode")),
    [text]
  );

  where.insertBefore(
    variableDeclaration("const", [variableDeclarator(varID, methodCall)])
  );
};
