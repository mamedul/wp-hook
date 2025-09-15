const assert = require('assert');
const hooker = require('./lib/Wp-Hook.js');
const { Wp_Hook } = require('./lib/Wp-Hook.js');


console.log('Running tests for wp-hook v2...');

let testCount = 0;
let passCount = 0;

function test(description, fn) {
    testCount++;
    try {
        fn();
        passCount++;
        console.log(`\x1b[32m✔\x1b[0m ${description}`);
    } catch (error) {
        console.error(`\x1b[31m✖\x1b[0m ${description}`);
        console.error(error);
        process.exit(1);
    }
}

// Reset singleton state between tests
function createCleanInstance() {
    return new Wp_Hook();
}

let fresh_wp_hook;

// --- REGISTRATION & TRIGGERING ---
test('should execute action with do_action', () => {
    fresh_wp_hook = createCleanInstance();
    let executed = false;
    fresh_wp_hook.add_action('test_1', () => { executed = true; });
    fresh_wp_hook.do_action('test_1');
    assert.strictEqual(executed, true);
});

test('should apply filter with apply_filters', () => {
    fresh_wp_hook = createCleanInstance();
    fresh_wp_hook.add_filter('test_2', (v) => v.toUpperCase());
    const result = fresh_wp_hook.apply_filters('test_2', 'hello');
    assert.strictEqual(result, 'HELLO');
});

test('should execute action with do_action_ref_array', () => {
    fresh_wp_hook = createCleanInstance();
    let result = '';
    fresh_wp_hook.add_action('test_3', (a, b) => { result = `${a} ${b}`; }, 10, 2);
    fresh_wp_hook.do_action_ref_array('test_3', ['Hello', 'World']);
    assert.strictEqual(result, 'Hello World');
});

test('should apply filter with apply_filters_ref_array', () => {
    fresh_wp_hook = createCleanInstance();
    fresh_wp_hook.add_filter('test_4', (v, a) => `${v}${a}`, 10, 2);
    const result = fresh_wp_hook.apply_filters_ref_array('test_4', ['Hello', '!']);
    assert.strictEqual(result, 'Hello!');
});

// --- REMOVAL ---
test('should remove action with specific priority using remove_action', () => {
    fresh_wp_hook = createCleanInstance();
    let priority10Wp_Hooked = false;
    let priority20Wp_Hooked = false;
    const cb1 = () => { priority10Wp_Hooked = true; };
    const cb2 = () => { priority20Wp_Hooked = true; };
    fresh_wp_hook.add_action('test_5', cb1, 10);
    fresh_wp_hook.add_action('test_5', cb2, 20);
    fresh_wp_hook.remove_action('test_5', cb1, 10);
    fresh_wp_hook.do_action('test_5');
    assert.strictEqual(priority10Wp_Hooked, false, 'Priority 10 should have been removed');
    assert.strictEqual(priority20Wp_Hooked, true, 'Priority 20 should still exist');
});

test('should remove all actions for a hook with remove_all_actions', () => {
    fresh_wp_hook = createCleanInstance();
    let called = false;
    fresh_wp_hook.add_action('test_6', () => { called = true; });
    fresh_wp_hook.remove_all_actions('test_6');
    fresh_wp_hook.do_action('test_6');
    assert.strictEqual(called, false);
});

test('should remove all filters for a specific priority with remove_all_filters', () => {
    fresh_wp_hook = createCleanInstance();
    const cb1 = v => v + 'A';
    const cb2 = v => v + 'B';
    fresh_wp_hook.add_filter('test_7', cb1, 10);
    fresh_wp_hook.add_filter('test_7', cb2, 20);
    fresh_wp_hook.remove_all_filters('test_7', 10);
    const result = fresh_wp_hook.apply_filters('test_7', '');
    assert.strictEqual(result, 'B');
});

// --- INSPECTION ---
test('has_action should return true for existing action, false otherwise', () => {
    fresh_wp_hook = createCleanInstance();
    const cb = () => {};
    fresh_wp_hook.add_action('test_8', cb);
    assert.strictEqual(fresh_wp_hook.has_action('test_8'), true);
    assert.strictEqual(fresh_wp_hook.has_action('test_8', cb), true);
    assert.strictEqual(fresh_wp_hook.has_action('test_8_nonexistent'), false);
    assert.strictEqual(fresh_wp_hook.has_action('test_8', () => {}), false);
});

test('has_filter should work correctly', () => {
    fresh_wp_hook = createCleanInstance();
    const cb = v => v;
    fresh_wp_hook.add_filter('test_9', cb);
    assert.strictEqual(fresh_wp_hook.has_filter('test_9'), true);
    assert.strictEqual(fresh_wp_hook.has_filter('test_9', cb), true);
});

test('did_action should return correct execution count', () => {
    fresh_wp_hook = createCleanInstance();
    fresh_wp_hook.add_action('test_10', () => {});
    assert.strictEqual(fresh_wp_hook.did_action('test_10'), 0);
    fresh_wp_hook.do_action('test_10');
    fresh_wp_hook.do_action('test_10');
    assert.strictEqual(fresh_wp_hook.did_action('test_10'), 2);
    assert.strictEqual(fresh_wp_hook.did_action('test_10_nonexistent'), 0);
});

test('current_action should return the current action name', () => {
    fresh_wp_hook = createCleanInstance();
    assert.strictEqual(fresh_wp_hook.current_action(), null);
    fresh_wp_hook.add_action('test_11', () => {
        assert.strictEqual(fresh_wp_hook.current_action(), 'test_11');
    });
    fresh_wp_hook.do_action('test_11');
    assert.strictEqual(fresh_wp_hook.current_action(), null);
});

test('current_filter should return the current filter name, even inside an action', () => {
    fresh_wp_hook = createCleanInstance();
    fresh_wp_hook.add_filter('test_12_filter', v => v);
    fresh_wp_hook.add_action('test_12_action', () => {
        assert.strictEqual(fresh_wp_hook.current_action(), 'test_12_action');
        assert.strictEqual(fresh_wp_hook.current_filter(), null);
        fresh_wp_hook.apply_filters('test_12_filter', '');
        assert.strictEqual(fresh_wp_hook.current_action(), 'test_12_action');
    });
    fresh_wp_hook.do_action('test_12_action');
});

test('doing_action should correctly report status', () => {
    fresh_wp_hook = createCleanInstance();
    assert.strictEqual(fresh_wp_hook.doing_action(), false);
    fresh_wp_hook.add_action('test_13', () => {
        assert.strictEqual(fresh_wp_hook.doing_action(), true);
        assert.strictEqual(fresh_wp_hook.doing_action('test_13'), true);
        assert.strictEqual(fresh_wp_hook.doing_action('nonexistent'), false);
    });
    fresh_wp_hook.do_action('test_13');
    assert.strictEqual(fresh_wp_hook.doing_action(), false);
});

test('doing_filter should correctly report status', () => {
    fresh_wp_hook = createCleanInstance();
    assert.strictEqual(fresh_wp_hook.doing_filter(), false);
    fresh_wp_hook.add_filter('test_14', v => {
        assert.strictEqual(fresh_wp_hook.doing_filter(), true);
        assert.strictEqual(fresh_wp_hook.doing_filter('test_14'), true);
        return v;
    });
    fresh_wp_hook.apply_filters('test_14', '');
    assert.strictEqual(fresh_wp_hook.doing_filter(), false);
});

console.log(`\n--- Test Summary ---`);
console.log(`Total: ${testCount}`);
console.log(`Passed: ${passCount}`);
if (testCount === passCount) {
    console.log('\x1b[32mAll tests passed!\x1b[0m');
} else {
    console.error(`\x1b[31m${testCount - passCount} tests failed.\x1b[0m`);
    process.exit(1);
}

