import { AReason } from './AReason';
import { AError } from './AError';
import { ExceptionalError } from './ExceptionalError';

/**
 * Represents the outcome of a pipeline of operations executed in a *railway‑oriented* fashion.
 *
 * A `Result` starts out *successful* and accumulates {@link AReason | reasons}—
 * any {@link AError | error} automatically flips the result into the *failed* state.
 *
 * • Inspired by the .NET FluentResults pattern, but adapted for JavaScript / TypeScript.
 * • Supports short‑circuiting: once failed, subsequent {@link bind} / {@link okIf} / {@link failIf} calls are ignored.
 * • Keeps the **current state/value** flowing between chained steps without global variables.
 */
export class Result {
    /**
     * All informational messages and errors collected so far.
     * An element that `instanceof AError` marks the {@link Result} as failed.
     */
    protected _reasons: AReason[] = [];

    /**
     * Internal single‑slot cache that holds the most recent value
     * returned by a delegate that completed *without* throwing.
     */
    private stateCache: any[] = [];

    /** `true` when *no* {@link AError} has been recorded. */
    get isSuccess(): boolean {
        return !this.isFailed;
    }

    /** `true` when **at least one** {@link AError} has been recorded. */
    get isFailed(): boolean {
        return this._reasons.some(reason => reason instanceof AError);
    }


    /**
     * The most recent value produced by the pipeline.
     * @throws {Error}  If no value has been cached yet (typically because the pipeline only ran parameter‑less steps).
     */
    get currentState(): any {
        if (this.stateCache.length === 1) {
            return this.stateCache[0];
        }
        else {
            throw new Error("To inject state into a parameterized function, first call a function that returns a state for retention");
        }
    }

    /** Immutable copy of all collected informational messages and errors. */
    get reasons(): AReason[] {
        return this._reasons.slice();
    }

    /** Convenience accessor limited to objects that are actual {@link AError} instances. */
    get errors(): AError[] {
        return this._reasons.filter(reason => reason instanceof AError);
    }

    /**
   * Executes `action` and wraps its outcome into a new **root** `Result`.
   *
   * • If `action` throws, the exception is captured as an {@link ExceptionalError}.
   * • If it completes successfully, the return value is stored as {@link currentState}.
   *
   * @param action  A synchronous delegate that may return a value and/or throw.
   */
    static try(action: () => any): Result {
        let result = new Result();
        let retVal = undefined;
        let captureState = false;

        try {
            retVal = action();
            captureState = true;
        }
        catch (e) {
            result._reasons.push(new ExceptionalError(e));
        }
        finally {
            if (captureState) result.cacheState(retVal); // retain state only if executing the action did not result in an exception
            return result;
        }
    }

    /**
     * Internal helper—overwrites the single‑slot {@link stateCache}.
     * Not exposed publicly on purpose.
     */
    private cacheState(value: any) {
        while (this.stateCache.length > 0) this.stateCache.pop();
        this.stateCache.unshift(value);
    }

    /**
     * Chains another synchronous function into the pipeline.
     *
     * @param func  Delegate to execute.
     *              • If the previous step succeeded, its return value becomes the input when `func` has an arity of **1**.
     *              • If the previous step failed, `func` is **skipped**.
     *
     * @returns **this** so that calls can be fluently chained.
     */
    bind(func: (() => any) | ((input: any) => any)): Result {
        let retVal = undefined;
        let captureState = false;
        try {
            if (this.isSuccess) {
                retVal = func.length === 0 ? (func as () => any)() : (func as (input: any) => any)(this.currentState);
                captureState = true;
            }
        }
        catch (e) {
            this._reasons.push(new ExceptionalError(e));
        }
        finally {
            if (captureState) this.cacheState(retVal); // retain state only if the func execution did not result in an exception
            return this;
        }
    }

    /**
     * Keeps the pipeline successful **only if** the `predicate` evaluates to `true`.
     *
     * @param predicate  Condition to evaluate (optionally with `currentState` input).
     * @param error      Error instance to push when the predicate fails.
     *
     * @returns **this** for chaining.
     */
    okIf(predicate: (() => boolean) | ((input: any) => boolean), error: AError): Result {
        try {
            if (this.isSuccess) {
                var res = predicate.length === 0 ? (predicate as () => any)() : (predicate as (input: any) => any)(this.currentState);
                if (res !== true) {
                    this._reasons.push(error);
                }
            }
        }
        catch (e) {
            this._reasons.push(new ExceptionalError(e));
        }
        finally {
            return this;
        }
    }

    /**
     * Fails the pipeline **only if** the `predicate` evaluates to `true`.
     *
     * @param predicate  Condition to evaluate (optionally with `currentState` input).
     * @param error      Error instance to push when the predicate **passes**.
     *
     * @returns **this** for chaining.
     */
    failIf(predicate: (() => boolean) | ((input: any) => boolean), error: AError): Result {
        try {
            if (this.isSuccess) {
                var res = predicate.length === 0 ? (predicate as () => any)() : (predicate as (input: any) => any)(this.currentState);
                if (res === true) {
                    this._reasons.push(error);
                }
            }
        }
        catch (e) {
            this._reasons.push(new ExceptionalError(e));
        }
        finally {
            return this;
        }
    }

}
