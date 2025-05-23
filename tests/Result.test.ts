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

describe('Result.tryAsync', () => {
    it("should await a promise returned by the passed parameterless function", async () => {
        let b = false;
        const result = await Result.tryAsync(() => new Promise(resolve => { b = true; resolve(null); }));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state returned from an awaited promise", async () => {
        const result = await Result.tryAsync(() => new Promise<number>(resolve => resolve(42)))
            .then(result => result.bind(() => { throw new Error("Intentionally thrown exception"); }));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });
})

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
});

describe('Result.bindAsync', () => {
    it("should await a promise returned by the passed parameterless function", async () => {
        let b = false;
        const result = await Result.try(() => { }).bindAsync(() => new Promise(resolve => { b = true; resolve(null); }));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state returned from an awaited promise", async () => {
        const result = await Result.try(() => { }).bind(() => 42).bindAsync(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });

    it("should not await promises past the point of failure", async () => {
        let pi = 3.14;
        const result = await Result.try(() => { })
            .bindAsync(() => new Promise<number>(resolve => resolve(42)))
            .then(result => result.bindAsync(() => { throw new Error("Intentionally thrown exception"); }))
            .then(result => result.bindAsync(() => new Promise(resolve => { pi++; })));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
        expect(pi).toBe(3.14);
    });

    it("should not await promises past the point of failure even when the failure has occurred at tryAsync", async () => {
        let pi = 3.14;
        const result = await Result.tryAsync(() => { throw new Error("Intentionally thrown exception"); })
            .then(result => result.bindAsync(() => new Promise(resolve => { pi++; })));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(pi).toBe(3.14);
    });

    it("should await a promise returned by executing a parameterized function with most recent state injected as parameter", async () => {
        const result = await Result.tryAsync(() => new Promise<number>(resolve => resolve(42)))
            .then(result => result.bindAsync(num => new Promise<number>(resovle => resovle(++num))));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.currentState).toBe(43);
    });
});

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
        expect(() => { let v = result.currentState; }).toThrow("No state present. Ensure a previous delegate returns a value before attempting to read currentState.");
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

    it("should inject most recent state when predicate requires it", () => {
        const result = Result.try(() => 42)
            .okIf(state => state === 42, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

});

describe('Result.okIfAsync', () => {
    it("should not cause result to fail when the promise resolves to true", async () => {
        const result = await Result.try(() => { })
            .okIfAsync(() => new Promise<boolean>(resolve => resolve(true)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the promise resolves to false", async () => {
        const result = await Result.try(() => { })
            .okIfAsync(() => new Promise<boolean>(resolve => resolve(false)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", async () => {
        const result = await Result.try(() => { throw new Error("Intentionally thrown exception"); })
            .okIfAsync(() => new Promise<boolean>(resolve => resolve(true)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should inject most recent state when predicate requires it", async () => {
        const result = await Result.try(() => 42)
            .okIfAsync(state => new Promise<boolean>(resolve => resolve(state === 42)), new TestError("This is a test error"));
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

    it("should inject most recent state when predicate requires it", () => {
        const result = Result.try(() => 42)
            .failIf(state => state !== 42, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });
});

describe('Result.failIfAsync', () => {
    it("should not cause result to fail when the promise resolves to false", async () => {
        const result = await Result.try(() => { })
            .failIfAsync(() => new Promise<boolean>(resolve => resolve(false)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the promise resolves to true", async () => {
        const result = await Result.try(() => { })
            .failIfAsync(() => new Promise<boolean>(resolve => resolve(true)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", async () => {
        const result = await Result.try(() => { throw new Error("Intentionally thrown exception"); })
            .failIfAsync(() => new Promise<boolean>(resolve => resolve(false)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should inject most recent state when predicate requires it", async () => {
        const result = await Result.try(() => 42)
            .failIfAsync(state => new Promise<boolean>(resolve => resolve(state !== 42)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });
});

describe('Reason.errors', () => {
    it("should return only errors", () => {
        const result = Result.try(() => { throw new Error(); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.length).toBe(1);
    });
});