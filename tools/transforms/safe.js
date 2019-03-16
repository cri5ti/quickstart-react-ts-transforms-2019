"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getObjectReference(ctx, name) {
	var temp = name
		? ts.createUniqueName(name)
		: ts.createTempVariable(/*recordTempVariable*/ undefined);
	ctx.hoistVariableDeclaration(temp);
	/*if (!path.objectRefId) {
        path.objectRefId = path.scope.generateDeclaredUidIdentifier(name || 'object')
    }
    return path.objectRefId*/
	return temp;
}
function markAsSafe(node) {
	node.isSafe = node;
	return node;
}
function ensureObject(node, ctx, isArray) {
	if (ts.isIdentifier(node)) {
		// (object || (object = {})).property = right
		return ts.createBinary(node, ts.SyntaxKind.BarBarToken, ts.createBinary(node, ts.SyntaxKind.EqualsToken, isArray ? ts.createArrayLiteral() : ts.createObjectLiteral()));
	}
	else if (ts.isPropertyAccessExpression(node)) {
		var ensuredObject = ensureObject(node.expression, ctx);
		var objectRef = getObjectReference(ctx, node.name.text);
		return ts.createBinary(markAsSafe(ts.createPropertyAccess(ts.createBinary(objectRef, ts.SyntaxKind.EqualsToken, ensuredObject), node.name)), ts.SyntaxKind.BarBarToken, markAsSafe(ts.createBinary(markAsSafe(ts.createPropertyAccess(objectRef, node.name)), ts.SyntaxKind.EqualsToken, isArray ? ts.createArrayLiteral() : ts.createObjectLiteral())));
	}
	else if (ts.isElementAccessExpression(node)) {
		var ensuredObject = ensureObject(node.expression, ctx, ts.isNumericLiteral(node.argumentExpression));
		var objectRef = getObjectReference(ctx, 'safe');
		return ts.createBinary(markAsSafe(ts.createElementAccess(ts.createBinary(objectRef, ts.SyntaxKind.EqualsToken, ensuredObject), node.argumentExpression)), ts.SyntaxKind.BarBarToken, markAsSafe(ts.createBinary(markAsSafe(ts.createElementAccess(objectRef, node.argumentExpression)), ts.SyntaxKind.EqualsToken, isArray ? ts.createArrayLiteral() : ts.createObjectLiteral())));
	}
	// else can't be ensured, just used the referenced expression
	return node;
}
function visitor(ctx) {
	var safelyVisitor = function (node) {
		if (ts.isBinaryExpression(node) && node.operatorToken.kind == ts.SyntaxKind.EqualsToken) {
			var left = node.left, operatorToken = node.operatorToken, right = node.right;
			if (node.isSafe) {
				return node;
			}
			if (ts.isPropertyAccessExpression(left)) {
				node = ts.updateBinary(node, ts.updatePropertyAccess(left, ensureObject(left.expression, ctx, ts.isNumericLiteral(left.name)), left.name), safelyVisitor(right), operatorToken);
				markAsSafe(left);
				//                else
				// expr == null ? void 0 : expr.property = right
			}
			else if (ts.isElementAccessExpression(left)) {
				node = ts.updateBinary(node, ts.updateElementAccess(left, ensureObject(left.expression, ctx, ts.isNumericLiteral(left.argumentExpression)), left.argumentExpression), safelyVisitor(right), operatorToken);
				markAsSafe(left);
				//                else
				// expr == null ? void 0 : expr.property = right
			}
			return node;
		}
		if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
			node = ts.visitEachChild(node, safelyVisitor, ctx) || node;
			if (node.isSafe) {
				return node;
			}
			var propertyAccess = node;
			var object = propertyAccess.expression;
			var objectRef = object;
			if (!ts.isIdentifier(object)) {
				objectRef = getObjectReference(ctx, 'safe');
				object = markAsSafe(ts.createBinary(objectRef, ts.SyntaxKind.EqualsToken, object));
			}
			// object == null ? void 0 : objects.property
			var safeMember = ts.createConditional(ts.createBinary(object, ts.SyntaxKind.EqualsEqualsToken, ts.createNull()), ts.createVoidZero(), markAsSafe(ts.isPropertyAccessExpression(node) ?
				ts.createPropertyAccess(objectRef, propertyAccess.name) :
				ts.createElementAccess(objectRef, node.argumentExpression)));
			safeMember.isSafeMember = true;
			return safeMember;
		}
		if (ts.isCallExpression(node)) {
			if (node.isSafe) {
				return node;
			}
			var callee = node.expression;
			if (ts.isPropertyAccessExpression(callee) && (callee.name.text === 'push' || callee.name.text === 'unshift')) {
				// for push or unshift, we ensure an array rather than doing existence checks
				callee.isSafe = true;
				node.isSafe = true;
				return ts.updateCall(node, ts.updatePropertyAccess(callee, ensureObject(callee.expression, ctx, true), callee.name), [], node.arguments);
			}
			node = ts.visitEachChild(node, safelyVisitor, ctx) || node;
			if (node.isSafe) {
				return node;
			}
			callee = node.expression;
			var calleeConditional = callee.expression;
			if (calleeConditional && calleeConditional.isSafeMember) {
				// objectExpr.method == null ? void 0 : objectExpr.method ? objectExpr.method(args) : void 0
				var member = calleeConditional.whenFalse;
				return ts.updateConditional(calleeConditional, calleeConditional.condition, calleeConditional.whenTrue, ts.createConditional(member, markAsSafe(ts.createCall(member, [], node.arguments)), ts.createVoidZero()));
			}
			else {
				// func == null ? void 0 : func()
				if (ts.isIdentifier(callee)) {
					return ts.createConditional(callee, markAsSafe(ts.createCall(callee, [], node.arguments)), ts.createVoidZero());
				}
				else {
					var funcRef = getObjectReference(ctx, 'func');
					return ts.createConditional(ts.createBinary(funcRef, ts.SyntaxKind.EqualsToken, callee), markAsSafe(ts.createCall(funcRef, [], node.arguments)), ts.createVoidZero());
				}
			}
		}
		return ts.visitEachChild(node, safelyVisitor, ctx);
	};
	var visitor = function (node) {
		if (ts.isCallExpression(node)) {
			var calleeExpression = node.expression;
			if (ts.isIdentifier(calleeExpression) && calleeExpression.text == 'safe') {
				return safelyVisitor(node.arguments[0]);
			}
		}
		return ts.visitEachChild(node, visitor, ctx);
	};
	return visitor;
}
function default_1() {
	return function (ctx) {
		return function (sf) { return ts.visitNode(sf, visitor(ctx)); };
	};
}
exports.default = default_1;
