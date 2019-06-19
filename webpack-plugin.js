
const { RawSource } = require('webpack-sources');

const ConstDependency = require("webpack/lib/dependencies/ConstDependency");
const ParserHelpers = require("webpack/lib/ParserHelpers");
const NullFactory = require("webpack/lib/NullFactory");

const PLUGIN_NAME = 'IsomorphicEnvWebpackPlugin';
const PROCESS_ENV_KEY = 'process.env';

const DEFAULT_OPTIONS = {
	filename: 'isomorphic-env.json',
	variable: '__ISOMORPHIC_ENV__'
};

// lodash-like pick function
// returns shallow copy of object with keys presented in 'keysToPick' array
function pick(object, keysToPick) {
	return keysToPick.reduce((result, key) => {
		result[key] = object[key];
		
		return result;
	}, {});
}

// lodash-like omit function
// returns shallow copy of object without keys presented in 'keysToOmit' array
function omit(object, keysToOmit) {
	const result = Object.assign({}, object);

	keysToOmit.forEach(key => delete result[key]);

	return result;
}

module.exports = class IsomorphicEnvWebpackPlugin {
	constructor(options) {
		this.options = Object.assign({}, DEFAULT_OPTIONS, options)

		this.compilationEnvMap = {};
		this.envMap = {};

		this.startTime = Date.now();

		this.compilationHook = this.compilationHook.bind(this);
		this.parserHook = this.parserHook.bind(this);
		this.emitHook = this.emitHook.bind(this);
	}

	recordEnv(filename, env) {
		if (!this.compilationEnvMap[filename]) {
			this.compilationEnvMap[filename] = {};
		}

		this.compilationEnvMap[filename][env] = true;
	}

	compilationHook(compilation, { normalModuleFactory }) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

		const moduleTypes = ['javascript/auto', 'javascript/dynamic', 'javascript/esm'];

		moduleTypes.forEach(moduleType => {
			normalModuleFactory.hooks.parser
				.for(moduleType)
				.tap(PLUGIN_NAME, this.parserHook);
		});
	}

	parserHook(parser) {
		const { variable } = this.options;

		// allow to rename 'process.env' in assigment expressions
		parser.hooks.canRename.for(PROCESS_ENV_KEY)
			.tap(PLUGIN_NAME, ParserHelpers.approve);

		// triggered on evaluation of 'process.env' expressions
		parser.hooks.evaluateIdentifier.for(PROCESS_ENV_KEY)
			.tap(PLUGIN_NAME, expr => {
				// evaluate 'process.env' as 'variable' in this expression 
				return parser.evaluate(variable).setRange(expr.range);
			});

		// triggered on 'process.env' expressions
		parser.hooks.expression.for(PROCESS_ENV_KEY)
			.tap(PLUGIN_NAME, expr => {
				// rename 'process.env' as 'variable' in this expression 
				return ParserHelpers.toConstantDependency(parser, variable)(expr);
			});

		// triggered on 'process.env.*' expressions
		parser.hooks.expressionAnyMember.for(PROCESS_ENV_KEY)
			.tap(PLUGIN_NAME, expr => {
				// record env's name and filename of parsed module
				this.recordEnv(parser.state.current.resource, expr.property.name);
				
				// rename 'process.env' as 'variable' in this expression 
				return ParserHelpers.toConstantDependency(parser, variable)(expr.object);
			});
	}

	emitHook(compilation) {
		const { fileDependencies, fileTimestamps, assets } = compilation;

		// from already collected files pick those that remain in the bundle after last compilation
		const presentedFiles = Object.keys(this.envMap)
			.filter(filename => fileDependencies.has(filename));

		// pick changed files
		const changedFiles = presentedFiles
			.filter(filename => (this.prevTimestamps.get(filename) || this.startTime) < fileTimestamps.get(filename));

		// from changed files select files without env vars
		const emptyFiles = changedFiles
			.filter(filename => !this.compilationEnvMap[filename]);

	  	this.prevTimestamps = fileTimestamps;

		// pick envs that remain after last compilation
		const presentedEnvMap = omit(pick(this.envMap, presentedFiles), emptyFiles);

		// add envs that had been recorded during last compilation
		this.envMap = Object.assign({}, presentedEnvMap, this.compilationEnvMap);

		// reset compilation envs map to prepare for next compilation
		this.compilationEnvMap = {};

		// get array of env vars names
		const envKeys = Object.keys(Object.assign({}, ...Object.values(this.envMap)));

		const { variable, filename } = this.options;
	
		// add file with array of env vars names and variable name to assets
		assets[filename] = new RawSource(JSON.stringify({ variable, envKeys }, null, 2));
	}

	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, this.compilationHook);
		compiler.hooks.emit.tap(PLUGIN_NAME, this.emitHook)
	}
}
