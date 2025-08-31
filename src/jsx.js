import {
  callExpression,
  identifier,
  memberExpression,
  stringLiteral,
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
export const setAttribute = (el, name, value) => {
  //#1  _el.setAttribute
  const method = memberExpression(el, identifier("setAttribute"));

  if (value.type == "JSXExpressionContainer") {
    value = value.expression.name
      ? identifier(value.expression.name)
      : value.expression;
  }

  //#2 #1(attr, value)
  const methodCall = callExpression(method, [stringLiteral(name), value]);
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
