import { ExceptionalError } from '../src/ExceptionalError';
import { PromiseRejection } from '../src/PromiseRejection';
import { Result } from '../src/Result';
import { TestError } from './setup/TestError';

describe("Result.try", () => {

    it("should set routineName", () => {
        const result = Result.try(() => { }, "foo");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.routineName).toBe("foo");
    });

    it("should execute a parameterless function", () => {
        let b = false;
        const result = Result.try(() => { b = true }, "should execute a parameterless function");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state from the most recent successful execution", () => {
        const result = Result.try(() => 42, "should retain the state from the most recent successful execution").bind(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });
});

describe('Result.tryAsync', () => {

    it("should set routineName", async () => {
        const result = await Result.tryAsync(async () => { }, "foo");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.routineName).toBe("foo");
    });

    it("should await a promise returned by the passed parameterless function", async () => {
        let b = false;
        const result = await Result.tryAsync(() => new Promise(resolve => { b = true; resolve(null); }), "should await a promise returned by the passed parameterless function");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state returned from an awaited promise", async () => {
        const result = await Result.tryAsync(() => new Promise<number>(resolve => resolve(42)), "should retain the state returned from an awaited promise")
            .then(result => result.bind(() => { throw new Error("Intentionally thrown exception"); }));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });

    it("should treat rejections as failures", async () => {
        const result = await Result.tryAsync(() => new Promise<number>((resolve, reject) => reject()), "should treat rejections as failures");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
    });

    it("should capture rejections reasons", async () => {
        const result = await Result.tryAsync(() => new Promise<number>((resolve, reject) => reject("Some random reason")), "should capture rejections reasons");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.filter(err => err instanceof PromiseRejection && (err as PromiseRejection).reason === "Some random reason").length).toBe(1);
    });

})

describe('Result.bind', () => {
    it("should execute a parameterless function", () => {
        let b = false;
        const result = Result.try(() => { }, "should execute a parameterless function").bind(() => { b = true });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state from the most recent successful execution", () => {
        const result = Result.try(() => { }, "should retain the state from the most recent successful execution").bind(() => 42).bind(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });

    it("should not execute actions past the point of failure", () => {
        let pi = 3.14;
        const result = Result.try(() => { }, "should not execute actions past the point of failure")
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
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); }, "should not execute actions past the point of failure even when the failure has occurred at try")
            .bind(() => { pi++; });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(pi).toBe(3.14);
    });

    it("should execute a parameterized function with most recent state injected as parameter", () => {
        const result = Result.try(() => 42, "should execute a parameterized function with most recent state injected as parameter").bind(num => ++num);
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.currentState).toBe(43);
    });
});

describe('Result.bindAsync', () => {
    it("should await a promise returned by the passed parameterless function", async () => {
        let b = false;
        const result = await Result.try(() => { }, "should await a promise returned by the passed parameterless function").bindAsync(() => new Promise(resolve => { b = true; resolve(null); }));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(b).toBe(true);
    });

    it("should retain the state returned from an awaited promise", async () => {
        const result = await Result.try(() => { }, "should retain the state returned from an awaited promise").bind(() => 42).bindAsync(() => { throw new Error("Intentionally thrown exception"); });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.currentState).toBe(42);
    });

    it("should not await promises past the point of failure", async () => {
        let pi = 3.14;
        const result = await Result.try(() => { }, "should not await promises past the point of failure")
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
        const result = await Result.tryAsync(() => { throw new Error("Intentionally thrown exception"); }, "should not await promises past the point of failure even when the failure has occurred at tryAsync")
            .then(result => result.bindAsync(() => new Promise(resolve => { pi++; })));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(pi).toBe(3.14);
    });

    it("should await a promise returned by executing a parameterized function with most recent state injected as parameter", async () => {
        const result = await Result.tryAsync(() => new Promise<number>(resolve => resolve(42)), "should await a promise returned by executing a parameterized function with most recent state injected as parameter")
            .then(result => result.bindAsync(num => new Promise<number>(resovle => resovle(++num))));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.currentState).toBe(43);
    });

    it("should treat rejections as failures", async () => {
        const result = await Result.try(() => { }, "should treat rejections as failures").bindAsync(() => new Promise<number>((resolve, reject) => reject()));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
    });

    it("should capture rejections reasons", async () => {
        const result = await Result.try(() => { }, "should capture rejections reasons").bindAsync(() => new Promise<number>((resolve, reject) => reject("Some random reason")));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.filter(err => err instanceof PromiseRejection && (err as PromiseRejection).reason === "Some random reason").length).toBe(1);
    });
});

describe('Result.currentState', () => {
    it("should return the state from the most recent successful execution", () => {
        const result = Result.try(() => 42, "should return the state from the most recent successful execution").bind(state => state + 1);
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.currentState).toBe(43);
    });
    it("should throw an error if being accessed before the state is set", () => {
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); }, "should throw an error if being accessed before the state is set");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(() => { let v = result.currentState; }).toThrow("No state present. Ensure a previous delegate returns a value before attempting to read currentState.");
    });
});

describe('Result.okIf', () => {
    it("should not cause result to fail when the predicate returns true", () => {
        const result = Result.try(() => { }, "should not cause result to fail when the predicate returns true")
            .okIf(() => true, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the predicate returns false", () => {
        const result = Result.try(() => { }, "should cause result to fail when the predicate returns false")
            .okIf(() => false, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", () => {
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); }, "should not affect result if result is already in a failed state")
            .okIf(() => true, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should inject most recent state when predicate requires it", () => {
        const result = Result.try(() => 42, "should inject most recent state when predicate requires it")
            .okIf(state => state === 42, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should capture only exceptional error on exception in predicate evaluation", () => {
        const result = Result.try(() => { }, "should capture only exceptional error on exception in predicate evaluation")
            .okIf(() => { throw new Error("Intentionally thrown exception"); }, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.filter(err => err instanceof TestError).length).toBe(0);
        expect(result.errors.filter(err => err instanceof ExceptionalError).length).toBe(1);
    });
});

describe('Result.okIfAsync', () => {
    it("should not cause result to fail when the promise resolves to true", async () => {
        const result = await Result.try(() => { }, "should not cause result to fail when the promise resolves to true")
            .okIfAsync(() => new Promise<boolean>(resolve => resolve(true)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the promise resolves to false", async () => {
        const result = await Result.try(() => { }, "should cause result to fail when the promise resolves to false")
            .okIfAsync(() => new Promise<boolean>(resolve => resolve(false)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", async () => {
        const result = await Result.try(() => { throw new Error("Intentionally thrown exception"); }, "should not affect result if result is already in a failed state")
            .okIfAsync(() => new Promise<boolean>(resolve => resolve(true)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should inject most recent state when predicate requires it", async () => {
        const result = await Result.try(() => 42, "should inject most recent state when predicate requires it")
            .okIfAsync(state => new Promise<boolean>(resolve => resolve(state === 42)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should capture only exceptional error on exception in predicate evaluation", async () => {
        const result = await Result.try(() => { }, "should capture only exceptional error on exception in predicate evaluation")
            .okIfAsync(() => { throw new Error("Intentionally thrown exception"); }, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.filter(err => err instanceof TestError).length).toBe(0);
        expect(result.errors.filter(err => err instanceof ExceptionalError).length).toBe(1);
    });
});

describe('Result.failIf', () => {
    it("should not cause result to fail when the predicate returns false", () => {
        const result = Result.try(() => { }, "should not cause result to fail when the predicate returns false")
            .failIf(() => false, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the predicate returns true", () => {
        const result = Result.try(() => { }, "should cause result to fail when the predicate returns true")
            .failIf(() => true, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", () => {
        const result = Result.try(() => { throw new Error("Intentionally thrown exception"); }, "should not affect result if result is already in a failed state")
            .failIf(() => false, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should inject most recent state when predicate requires it", () => {
        const result = Result.try(() => 42, "should inject most recent state when predicate requires it")
            .failIf(state => state !== 42, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should capture only exceptional error on exception in predicate evaluation", () => {
        const result = Result.try(() => { }, "should capture only exceptional error on exception in predicate evaluation")
            .failIf(() => { throw new Error("Intentionally thrown exception"); }, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.filter(err => err instanceof TestError).length).toBe(0);
        expect(result.errors.filter(err => err instanceof ExceptionalError).length).toBe(1);
    });

    it("should execute a contingent routine on failure", () => {
        let b = false;
        const result = Result.try(() => 42, "Primary route")
            .failIf(num => num > 40, new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(true);
    });

    it("should capture result of execution of a contingent route", () => {
        let b = false;
        const result = Result.try(() => 42, "Primary route")
            .failIf(num => num > 40, new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(true);
        expect(result.child).not.toBeNull();
    });

    it("should set current result as parent on execution of a contingent route", () => {
        let b = false;
        const result = Result.try(() => 42, "Primary route")
            .failIf(num => num > 40, new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(true);
        expect(result.child).not.toBeNull();
        expect(result.child?.parent).toBe(result);
    });

    it("should not execute a contingent routine on exception in predicate evaluation", () => {
        let b = false;
        const result = Result.try(() => 42, "Primary route")
            .failIf(num => { throw new Error("Intentionally thrown exception"); }, new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(false);
        expect(result.child).toBeUndefined();
    });
});

describe('Result.failIfAsync', () => {
    it("should not cause result to fail when the promise resolves to false", async () => {
        const result = await Result.try(() => { }, "should not cause result to fail when the promise resolves to false")
            .failIfAsync(() => new Promise<boolean>(resolve => resolve(false)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should cause result to fail when the promise resolves to true", async () => {
        const result = await Result.try(() => { }, "should cause result to fail when the promise resolves to true")
            .failIfAsync(() => new Promise<boolean>(resolve => resolve(true)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(1);
    });

    it("should not affect result if result is already in a failed state", async () => {
        const result = await Result.try(() => { throw new Error("Intentionally thrown exception"); }, "should not affect result if result is already in a failed state")
            .failIfAsync(() => new Promise<boolean>(resolve => resolve(false)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should inject most recent state when predicate requires it", async () => {
        const result = await Result.try(() => 42, "should inject most recent state when predicate requires it")
            .failIfAsync(state => new Promise<boolean>(resolve => resolve(state !== 42)), new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(true);
        expect(result.reasons.filter(reason => reason instanceof TestError).length).toBe(0);
    });

    it("should capture only exceptional error on exception in predicate evaluation", async () => {
        const result = await Result.try(() => { }, "should capture only exceptional error on exception in predicate evaluation")
            .failIfAsync(() => { throw new Error("Intentionally thrown exception"); }, new TestError("This is a test error"));
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.filter(err => err instanceof TestError).length).toBe(0);
        expect(result.errors.filter(err => err instanceof ExceptionalError).length).toBe(1);
    });

    it("should execute a contingent routine on failure", async () => {
        let b = false;
        const result = await Result.try(() => 42, "Primary route")
            .failIfAsync(num => new Promise(resolve => resolve(num > 40)), new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(true);
    });

    it("should capture result of execution of a contingent route", async () => {
        let b = false;
        const result = await Result.try(() => 42, "Primary route")
            .failIfAsync(num => new Promise(resolve => resolve(num > 40)), new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(true);
        expect(result.child).not.toBeNull();
    });

    it("should set current result as parent on execution of a contingent route", async () => {
        let b = false;
        const result = await Result.try(() => 42, "Primary route")
            .failIfAsync(num => new Promise(resolve => resolve(num > 40)), new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(true);
        expect(result.child).not.toBeNull();
        expect(result.child?.parent).toBe(result);
    });

    it("should not execute a contingent routine on exception in predicate evaluation", async () => {
        let b = false;
        const result = await Result.try(() => 42, "Primary route")
            .failIfAsync(num => { throw new Error("Intentionally thrown exception"); }, new TestError("This is a test error"), { func: nextRes => { b = true }, routineName: "Contingent route" });
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(b).toBe(false);
        expect(result.child).toBeUndefined();
    });
});

describe('Reason.errors', () => {
    it("should return only errors", () => {
        const result = Result.try(() => { throw new Error(); }, "should return only errors");
        expect(result).not.toBeNull();
        expect(result.isSuccess).toBe(false);
        expect(result.errors.length).toBe(1);
    });
});