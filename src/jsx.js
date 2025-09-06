import { NodePath } from "@babel/traverse";
import t, { functionDeclaration, returnStatement } from "@babel/types";
import {
  arrowFunctionExpression,
  assignmentExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  identifier,
  memberExpression,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
  JSXElement,
  VariableDeclaration,
  Identifier,
  JSXAttribute,
  JSXSpreadAttribute,
  toIdentifier,
  JSXEmptyExpression,
} from "@babel/types";
import {
  getReactiveKind,
  getRefStatementsFromExpression,
  register,
} from "./ref.js";

/** @param {Identifier} varID
 * @param {string} tag
 * @returns {VariableDeclaration} */
export const createElement = (varID, tag) => {
  // document.createElement(tag)
  const methodCall = callExpression(
    memberExpression(identifier("document"), identifier("createElement")),
    [stringLiteral(tag)]
  );
  return variableDeclaration("const", [variableDeclarator(varID, methodCall)]);
};

/** @param {Identifier} varID
 * @param {(JSXAttribute | JSXSpreadAttribute)[]} attributes
 * @param {NodePath<JSXElement>} path
 * @returns {void} */

export const setAttributes = (path, varID, attributes) => {
  const statements = [];

  for (const attr of attributes) {
    //TODO: handle JSXSpreadAttribute
    if (attr.type === "JSXSpreadAttribute")
      throw new Error(`attribute type ${attr.type} unimplemented`);
    const { name, value } = attr;
    if (name.type === "JSXNamespacedName")
      throw new Error(`attributeName type ${name.type} unimplemented`);

    let normalizedValue = null;

    const methodCall = () =>
      callExpression(memberExpression(varID, identifier("setAttribute")), [
        stringLiteral(name.name),
        normalizedValue,
      ]);

    if (value.type === "StringLiteral") {
      normalizedValue = value;
    } else if (value.type === "JSXExpressionContainer") {
      normalizedValue = value.expression;
      statements.push(
        ...getRefStatementsFromExpression(
          normalizedValue,
          value,
          path.scope,
          methodCall
        )
      );
    } else {
      console.error("attributeValue: ", value);
      throw new Error(`attributeValue type ${value.type} unimplemented`);
    }

    statements.push(methodCall());
  }
  return statements;
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

  const registerReactiveTrigger = (binding) => {
    // Create a trigger to update the text node's nodeValue
    const trigger = arrowFunctionExpression(
      [],
      blockStatement([
        expressionStatement(
          assignmentExpression(
            "=",
            memberExpression(varID, identifier("nodeValue")),
            text
          )
        ),
      ])
    );

    // Register the trigger with the reactive binding
    const registerTrigger = expressionStatement(
      callExpression(
        memberExpression(binding.identifier, identifier("register")),
        [trigger]
      )
    );

    where.insertBefore(registerTrigger);
  };
  // Check if the text is a reactive identifier
  if (text.type === "Identifier") {
    const binding = where.scope.getBinding(text.name);
    if (binding?.identifier?.extra?.reactive) {
      registerReactiveTrigger(binding);
    }
  } else if (text.type === "ConditionalExpression") {
    where.scope.traverse(text, {
      Identifier(idPath) {
        const binding = idPath.scope.getBinding(idPath.node.name);
        if (binding?.identifier?.extra?.reactive) {
          registerReactiveTrigger(binding);
        }
      },
    });
  }
};
