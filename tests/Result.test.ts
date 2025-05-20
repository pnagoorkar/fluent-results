import { Result } from '../src/Result';
import { TestError } from './setup/TestError';

describe("Result.try", () => {

    it("should execute a parameterless function", () => {
        let b = false;
        const result = Result.try(() => { b = true });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state from the most recent successful execution", () => {
        const result = Result.try(() => 42).bind(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });
});

describe('Result.bind', () => {
    it("should execute a parameterless function", () => {
        let b = false;
        const result = Result.try(() => { }).bind(() => { b = true });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state from the most recent successful execution", () => {
        const result = Result.try(() => { }).bind(() => 42).bind(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });

    it("should not execute actions past the point of failure", () => {
        let pi = 3.14;
        const result = Result.try(() => { })
            .bind(() => 42)
            .bind(() => { throw new Error("Intentionally thrown exception"); })
            .bind(() => { pi++; });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
        expect(pi).toBe(3.14);
    });

    it("should not execute actions past the point of failure even when the failure has occurred at try", () => {
        let pi = 3.14;
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); })
            .bind(() => { pi++; });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(pi).toBe(3.14);
    });

    it("should execute a parameterized function with most recent state injected as parameter", () => {
        const result = Result.try(() => 42).bind(num => ++num);
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.currentState).toBe(43);
    });
})

describe('Result.currentState', () => {
    it("should return the state from the most recent successful execution", () => {
        const result = Result.try(() => 42).bind(state => state + 1);
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.currentState).toBe(43);
    });
    it("should throw an error if being accessed before the state is set", () => {
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(() => { let v = result.currentState; }).toThrow("To inject state into a parameterized function, first call a function that returns a state for retention");
    });
});

describe('Result.okIf', () => {
    it("should not cause result to fail when the predicate returns true", () => {
        const result = Result.try(() => { })
            .okIf(() => true, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the predicate returns false", () => {
        const result = Result.try(() => { })
            .okIf(() => false, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", () => {
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); })
            .okIf(() => true, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should evaluate most recent state when predicate requires it", () => {
        const result = Result.try(() => 42)
            .okIf(state => state === 42, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

});

describe('Result.failIf', () => {
    it("should not cause result to fail when the predicate returns false", () => {
        const result = Result.try(() => { })
            .failIf(() => false, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the predicate returns true", () => {
        const result = Result.try(() => { })
            .failIf(() => true, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", () => {
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); })
            .failIf(() => false, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should evaluate most recent state when predicate requires it", () => {
        const result = Result.try(() => 42)
            .failIf(state => state !== 42, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

});