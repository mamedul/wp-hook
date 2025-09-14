const Hook = require('./Hook');

/**
 * A class for managing hooks (actions and filters), inspired by the WordPress hook system.
 * This allows for a flexible, event-driven architecture.
 * @class
 */
class Wp_Hook {
	constructor() {
		/** @private @type {Map<string, Hook>} */
		this.hooks = new Map();
		/** @private @type {Map<string, number>} */
		this.actionCounter = new Map();
		/** @private @type {string[]} */
		this.currentActions = [];
		/** @private @type {string[]} */
		this.currentFilters = [];
	}

	/**
	 * Gets or creates a hook instance.
	 * @private
	 * @param {string} hook - The name of the hook.
	 * @returns {Hook} The hook instance.
	 */
	_getHook(hook) {
		if (!this.hooks.has(hook)) {
			this.hooks.set(hook, new Hook(hook));
		}
		return this.hooks.get(hook);
	}

	/**
	 * Registers a callback for a specific hook.
	 * @param {string} hook - The name of the hook.
	 * @param {Function} callback - The callback function.
	 * @param {number} [priority=10] - The execution priority.
	 * @param {number} [accepted_args=1] - The number of arguments the callback accepts.
	 */
	add(hook, callback, priority = 10, accepted_args = 1) {
		if (typeof callback !== 'function') {
			console.error(`The callback for hook '${hook}' must be a function.`);
			return;
		}
		this._getHook(hook).add(callback, priority, accepted_args);
	}
	
	add_action(hook, callback, priority = 10, accepted_args = 1) {
		this.add(hook, callback, priority, accepted_args);
	}
	
	add_filter(hook, callback, priority = 10, accepted_args = 1) {
		this.add(hook, callback, priority, accepted_args);
	}

	/**
	 * Removes a specific callback from a hook.
	 * @param {string} hook - The name of the hook.
	 * @param {Function} callback - The specific function to remove.
	 * @param {number} [priority] - The priority of the function to remove.
	 * @returns {boolean} True if the callback was removed, false otherwise.
	 */
	remove(hook, callback, priority) {
		if (this.hooks.has(hook)) {
			return this._getHook(hook).remove(callback, priority);
		}
		return false;
	}
	
	remove_action(hook, callback, priority) {
		return this.remove(hook, callback, priority);
	}

	remove_filter(hook, callback, priority) {
		return this.remove(hook, callback, priority);
	}
	
	/**
	 * Removes all callbacks for a specific hook.
	 * @param {string} hook - The name of the hook.
	 * @param {number} [priority] - If specified, only callbacks with this priority are removed.
	 */
	remove_all(hook, priority){
		if (this.hooks.has(hook)) {
			this._getHook(hook).removeAll(priority);
		}
	}
	
	remove_all_actions(hook, priority){
		this.remove_all(hook, priority);
	}
	
	remove_all_filters(hook, priority){
		this.remove_all(hook, priority);
	}
	
	/**
	 * Checks if a callback is registered for a hook.
	 * @param {string} hook - The name of the hook.
	 * @param {Function} [callback=false] - Optional callback to check for.
	 * @returns {boolean}
	 */
	has(hook, callback = false) {
		return this.hooks.has(hook) && this._getHook(hook).has(callback);
	}
	
	has_action(hook, callback = false) {
		return this.has(hook, callback);
	}

	has_filter(hook, callback = false) {
		return this.has(hook, callback);
	}

	/**
	 * Executes all callbacks for an action hook.
	 * @param {string} hook - The name of the action to execute.
	 * @param {...*} [args] - Arguments to pass to the action callbacks.
	 */
	do_action(hook, ...args) {
		if (!this.hooks.has(hook)) return;

		const count = this.actionCounter.get(hook) || 0;
		this.actionCounter.set(hook, count + 1);
		
		this.currentActions.push(hook);
		try {
			this._getHook(hook).exec(...args);
		} finally {
			this.currentActions.pop();
		}
	}

	do_action_ref_array(hook, args_array = []) {
		this.do_action(hook, ...args_array);
	}

	/**
	 * Applies all registered filters to a value.
	 * @param {string} hook - The name of the filter.
	 * @param {*} value - The initial value to be filtered.
	 * @param {...*} [args] - Additional arguments to pass to the filter callbacks.
	 * @returns {*} The modified value.
	 */
	apply_filters(hook, value, ...args) {
		if (!this.hooks.has(hook)) return value;
		
		this.currentFilters.push(hook);
		try {
			return this._getHook(hook).apply(value, ...args);
		} finally {
			this.currentFilters.pop();
		}
	}

	apply_filters_ref_array(hook, args_array = []) {
		return this.apply_filters(hook, ...args_array);
	}

	/**
	 * Gets the number of times an action has been fired.
	 * @param {string} hook - The name of the action.
	 * @returns {number}
	 */
	did_action(hook) {
		return this.actionCounter.get(hook) || 0;
	}
	
	/**
	 * Gets the name of the currently running action.
	 * @returns {string|null}
	 */
	current_action() {
		return this.currentActions.length > 0 ? this.currentActions[this.currentActions.length - 1] : null;
	}
	
	/**
	 * Gets the name of the currently running filter.
	 * @returns {string|null}
	 */
	current_filter() {
		return this.currentFilters.length > 0 ? this.currentFilters[this.currentFilters.length - 1] : null;
	}
	
	/**
	 * Checks if a specific action is currently running.
	 * @param {string|null} [hook=null] - The name of the action. If null, checks for any action.
	 * @returns {boolean}
	 */
	doing_action(hook = null) {
		if (hook === null) {
			return this.currentActions.length > 0;
		}
		return this.currentActions.includes(hook);
	}

	/**
	 * Checks if a specific filter is currently running.
	 * @param {string|null} [hook=null] - The name of the filter. If null, checks for any filter.
	 * @returns {boolean}
	 */
	doing_filter(hook = null) {
		if (hook === null) {
			return this.currentFilters.length > 0;
		}
		return this.currentFilters.includes(hook);
	}
	
	// --- Legacy aliases for backward compatibility ---
	exec(hook, ...args) { this.do_action(hook, ...args); }
	apply(hook, value, ...args) { return this.apply_filters(hook, value, ...args); }
	filter(hook, value, ...args) { return this.apply_filters(hook, value, ...args); }
}

const instance = new Wp_Hook();
module.exports = instance;
module.exports.add_action = instance.add_action.bind(instance);
module.exports.add_filter = instance.add_filter.bind(instance);
module.exports.do_action = instance.do_action.bind(instance);
module.exports.do_action_ref_array = instance.do_action_ref_array.bind(instance);
module.exports.apply_filters = instance.apply_filters.bind(instance);
module.exports.remove_action = instance.remove_action.bind(instance);
module.exports.remove_filter = instance.remove_filter.bind(instance);
module.exports.remove_all_actions = instance.remove_all_actions.bind(instance);
module.exports.remove_all_filters = instance.remove_all_filters.bind(instance);
module.exports.has_action = instance.has_action.bind(instance);
module.exports.has_filter = instance.has_filter.bind(instance);
module.exports.did_action = instance.did_action.bind(instance);
module.exports.current_action = instance.current_action.bind(instance);
module.exports.current_filter = instance.current_filter.bind(instance);
module.exports.doing_action = instance.doing_action.bind(instance);
module.exports.doing_filter = instance.doing_filter.bind(instance);

module.exports.Wp_Hook = Wp_Hook;
