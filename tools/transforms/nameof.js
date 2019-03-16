"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
var ts = require("typescript");
var path = require("path");

function transformer() {
	return function (ctx) {
		return function (sf) { return ts.visitNode(sf, visitor(ctx)); };
	};
}

exports.default = transformer;

function visitor(ctx) {
	// var typeChecker = program.getTypeChecker();
	// if (!isKeysCallExpression(node, typeChecker)) {
	// 	return node;
	// }
	// if (!node.typeArguments) {
	// 	return ts.createArrayLiteral([]);
	// }
	// var type = typeChecker.getTypeFromTypeNode(node.typeArguments[0]);
	// var properties = typeChecker.getPropertiesOfType(type);
	// return ts.createArrayLiteral(properties.map(function (property) { return ts.createLiteral(property.name); }));

	var visitor = function (node) {
		
		
		if (ts.isCallExpression(node)) {
			var calleeExpression = node.expression;
			if (ts.isIdentifier(calleeExpression) && calleeExpression.text == 'path') {
				return ts.createLiteral(arguments[0].text);
			}
		}
		return ts.visitEachChild(node, visitor, ctx);
	};

	return visitor;
}

// var indexTs = path.join(__dirname, 'index.ts');

// function isKeysCallExpression(node, typeChecker) {
// 	if (node.kind !== ts.SyntaxKind.CallExpression) {
// 		return false;
// 	}
// 	var signature = typeChecker.getResolvedSignature(node);
// 	if (typeof signature === 'undefined') {
// 		return false;
// 	}
// 	var declaration = signature.declaration;
// 	return !!declaration
// 		&& (path.join(declaration.getSourceFile().fileName) === indexTs)
// 		&& !!declaration['name']
// 		&& (declaration['name'].getText() === 'keys');
// }
