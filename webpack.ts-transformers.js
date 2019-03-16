// const safelyTransformer = require('ts-transform-safely').transform;
const safeTransformer = require('./tools/transforms/safe').default;
// const nameofTransformer = require('./tools/transforms/nameof').default;

const getCustomTransformers = () => ({
	before: [
		safeTransformer(),
		// nameofTransformer()
	],
});

module.exports = getCustomTransformers;
