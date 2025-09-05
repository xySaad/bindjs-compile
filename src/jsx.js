import { NodePath } from "@babel/traverse";
import t from "@babel/types";
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
} from "@babel/types";

/** @param {NodePath<t.JSXElement>} node */
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

  // Initial setter: _el.setAttribute("name", value)
  const method = memberExpression(el, identifier("setAttribute"));
  let methodCall = callExpression(method, [stringLiteral(name), value]);
  if (name.startsWith("on")) {
    methodCall = assignmentExpression(
      "=",
      memberExpression(el, identifier(name)),
      value
    );
  }
  // Helper function to create and register a trigger
  const registerReactiveTrigger = (binding) => {
    const trigger = arrowFunctionExpression(
      [],
      blockStatement([expressionStatement(methodCall)])
    );
    binding.identifier.extra = {
      ...binding.identifier.extra,
      skipReactiveGetter: true,
    };
    const registerTrigger = expressionStatement(
      callExpression(
        memberExpression(binding.identifier, identifier("register")),
        [trigger]
      )
    );

    path.insertBefore(registerTrigger);
  };

  // Check if the value is a single reactive identifier
  if (value?.type === "Identifier") {
    const binding = path.scope.getBinding(value.name);
    if (binding?.identifier?.extra?.reactive) {
      registerReactiveTrigger(binding);
    }
  } else if (value.type === "ConditionalExpression") {
    // Handle complex expressions by traversing for reactive identifiers
    path.scope.traverse(value, {
      Identifier(idPath) {
        const binding = idPath.scope.getBinding(idPath.node.name);
        if (binding?.identifier?.extra?.reactive) {
          registerReactiveTrigger(binding);
        }
      },
    });
  }

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
