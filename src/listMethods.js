import t from "@babel/types";

export const convertMethods = (path) => {
  const right = path.parent.right; // The right-hand side of the assignment
  const identifierName = path.node.name; // e.g., "users"

  // Case 1: users = [];
  if (t.isArrayExpression(right) && right.elements.length === 0) {
    const clearCall = t.callExpression(
      t.memberExpression(path.node, t.identifier("clear")),
      []
    );
    path.parentPath.replaceWith(clearCall);
    path.parentPath.skip();
    return;
  }

  // Case 2: users = [...users, {name: "john"}];
  if (
    t.isArrayExpression(right) &&
    right.elements.length > 0 &&
    right.elements.some(
      (el) =>
        t.isSpreadElement(el) &&
        t.isIdentifier(el.argument) &&
        el.argument.name === identifierName
    )
  ) {
    // Extract non-spread elements as arguments for push
    const pushArgs = right.elements.filter(
      (el) => !t.isSpreadElement(el) || el.argument.name !== identifierName
    );
    const pushCall = t.callExpression(
      t.memberExpression(path.node, t.identifier("push")),
      pushArgs
    );
    path.parentPath.replaceWith(pushCall);
    path.parentPath.skip();
    return;
  }

  // Case 3: users = [{name: "john"}];
  if (t.isArrayExpression(right)) {
    path.parent.left = t.memberExpression(path.node, t.identifier("value"));
    path.parentPath.skip();
    return;
  }
};
