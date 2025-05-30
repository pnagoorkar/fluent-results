import { AReason } from './AReason';
import { AError } from './AError';
import { ExceptionalError } from './ExceptionalError';
import { PromiseRejection } from './PromiseRejection';

export abstract class AResult {

    /** Informational messages *and* errors gathered so far. */
    protected _reasons: AReason[] = [];
    /** Single‑slot cache for the latest successful value. */
    protected stateCache: any[] = [];
    /** `true` when *no* {@link AError} has been recorded. */
    public get isSuccess(): boolean {
        return !this.isFailed;
    }
    /** `true` when **at least one** {@link AError} exists. */
    public get isFailed(): boolean {
        return this._reasons.some((r) => r instanceof AError);
    }

    private _routineName: string = "";

    /**
     * A descriptive name for the routine, useful for logging or debugging.
     */
    public get routineName(): string {
        return this._routineName;
    }

    private _parent?: AResult;
    private _child?: AResult;

    /**
     * The parent result that created this result (usually as to execute a contingent routine)
     */
    public get parent(): AResult | undefined {
        return this._parent;
    }

    /**
     * A child that was created as a result of execution of a contingent path
     */
    public get child(): AResult | undefined {
        return this._child;
    }

    protected set child(child: AResult) {
        this._child = child;
    }

    /**
     * @param routineName A descriptive name for the routine, useful for logging or debugging.
     * @param [parent] The parent result that created this result (usually as to execute a contingent routine)
     */
    constructor(routineName: string, parent?: AResult) {
        this._routineName = routineName;
        this._parent = parent;

    }

}
/**
 * `Result` represents the outcome **and** the flowing state of a pipeline that can
 * short‑circuit on the first error ("railway‑oriented programming").
 * 
 * A `Result` starts out *successful* and accumulates {@link AReason | reasons};
 * any {@link AError | error} automatically flips the result into the *failed* state.
 *
 */
export class Result<TState = any> extends AResult {

    /**
     * The most recent value produced by the pipeline.
     * @throws {Error}  If no value has been cached yet (typically because the pipeline only ran parameter‑less steps).
     */
    public get currentState(): TState {
        if (this.stateCache.length === 1) {
            return this.stateCache[0];
        }
        throw new Error(
            'No state present. Ensure a previous delegate returns a value before attempting to read currentState.'
        );
    }
    /** Immutable copy of informational reasons **and** errors. */
    public get reasons(): AReason[] {
        return this._reasons.slice();
    }
    /** Convenience subset of {@link reasons} limited to errors. */
    public get errors(): AError[] {
        return this._reasons.filter((r) => r instanceof AError);
    }
    /**
   * Executes `action` and wraps its outcome into a new **root** `Result`.
   *
   * • If `action` throws, the exception is captured as an {@link ExceptionalError}.
   * • If it completes successfully, the return value is stored as {@link currentState}.
   *
   * @param action A synchronous delegate that may return a value and/or throw.
   * @param routineName A descriptive name for the routine, useful for logging or debugging.
   */
    public static try<T>(action: () => T, routineName: string): Result<T> {
        const result = new Result<T>(routineName);

        try {
            result.cacheState(action());
        }
        catch (e) {
            result._reasons.push(new ExceptionalError(e));
        }
        finally {
            return result;
        }
    }
    /**
   * Executes `action` and wraps its awaited outcome into a new **root** `Result`.
   *
   * • If `action` throws, the exception is captured as an {@link ExceptionalError}.
   * • If it completes successfully, the awaited outcome is stored as {@link currentState}.
   *
   * @param action A synchronous delegate that may return a value and/or throw.
   * @param routineName A descriptive name for the routine, useful for logging or debugging.
   */
    public static async tryAsync<T>(action: () => Promise<T>, routineName: string): Promise<Result<T>> {
        const result = new Result<T>(routineName);
        try {
            await action().then(value => result.cacheState(value)).catch(reason => result._reasons.push(new PromiseRejection(reason)));
        }
        catch (e) {
            result._reasons.push(new ExceptionalError(e));
        }
        finally {
            return result;
        }
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
    public bind<TRet>(func: (() => TRet) | ((input: TState) => TRet)): Result<TRet> {
        if (this.isSuccess) {
            try {
                const out = func.length === 0
                    ? (func as () => TRet)()
                    : (func as (i: TState) => TRet)(this.currentState);
                (this as unknown as Result<TRet>).cacheState(out);
            }
            catch (e) {
                this._reasons.push(new ExceptionalError(e));
            }
        }
        return this as unknown as Result<TRet>;
    }

    /**
     * Chains another synchronous function into the pipeline and captures its awaited outcome as {@link currentState}.
     *
     * @param func A delegate returning a promise.
     *              • If the previous step succeeded, its return value becomes the input when `func` has an arity of **1**.
     *              • If the previous step failed, `func` is **skipped**.
     *
     * @returns **this** so that calls can be fluently chained.
     */
    public async bindAsync<TRet>(func: (() => Promise<TRet>) | ((input: TState) => Promise<TRet>)): Promise<Result<TRet>> {
        if (this.isSuccess) {
            try {
                const promise = func.length === 0
                    ? (func as () => Promise<TRet>)()
                    : (func as (i: TState) => Promise<TRet>)(this.currentState);

                await promise.then(value => (this as unknown as Result<TRet>).cacheState(value)).catch(reason => this._reasons.push(new PromiseRejection(reason)));
            }
            catch (e) {
                this._reasons.push(new ExceptionalError(e));
            }
        }
        return this as unknown as Result<TRet>;
    }

    /**
     * Keeps the pipeline successful **only if** the `predicate` evaluates to `true`.
     *
     * @param predicate  Condition to evaluate (optionally with `currentState` input).
     * @param error      Error instance to push when the predicate fails.
     *
     * @returns **this** for chaining.
     */
    public okIf(predicate: (() => boolean) | ((input: TState) => boolean), error: AError): Result<TState> {
        if (this.isSuccess) {
            try {
                const pass = predicate.length === 0
                    ? (predicate as () => boolean)()
                    : (predicate as (i: TState) => boolean)(this.currentState);
                if (!pass) this._reasons.push(error);
            }
            catch (e) {
                this._reasons.push(new ExceptionalError(e));
            }
        }
        return this;
    }

    /**
     * Keeps the pipeline successful **only if** the `predicate` evaluates to `true`.
     *
     * @param predicate A function returning promise that returns boolean when awaited (optionally with `currentState` input).
     * @param error      Error instance to push when the predicate fails.
     *
     * @returns **this** for chaining.
     */
    public async okIfAsync(predicate: (() => Promise<boolean>) | ((input: TState) => Promise<boolean>), error: AError): Promise<Result<TState>> {
        if (this.isSuccess) {
            try {
                const pass = predicate.length === 0
                    ? await (predicate as () => Promise<boolean>)()
                    : await (predicate as (i: TState) => Promise<boolean>)(this.currentState);
                if (!pass) this._reasons.push(error);
            }
            catch (e) {
                this._reasons.push(new ExceptionalError(e));
            }
        }
        return this;
    }


    /**
     * Fails the pipeline **only if** the `predicate` evaluates to `true`.
     *
     * @param predicate  Condition to evaluate (optionally with `currentState` input).
     * @param error      Error instance to push when the predicate **passes**.
     * @param [contingency] - Optional object defining a contingent route.
     * @param next.func - A function to be executed if {@link predicate} evaluates to false
     * @param next.routineName - A descriptive name for the routine, useful for logging or debugging.
     *
     * @returns **this** for chaining.
     */
    public failIf(predicate: (() => boolean) | ((input: TState) => boolean),
        error: AError,
        contingency?: { func: (nextResult: Result<TState>) => void, routineName: string }): Result<TState> {
        if (this.isSuccess) {
            try {
                const fail = predicate.length === 0
                    ? (predicate as () => boolean)()
                    : (predicate as (i: TState) => boolean)(this.currentState);
                if (fail) {
                    this._reasons.push(error);
                    if (contingency) {
                        let child = new Result<TState>(contingency.routineName, this);
                        this.child = child;
                        contingency.func(child);
                    }
                }
            }
            catch (e) {
                this._reasons.push(new ExceptionalError(e));
            }
        }
        return this;
    }



    /**
     * Fails the pipeline **only if** the `predicate` evaluates to `true`.
     *
     * @param predicate A function returning promise that returns boolean when awaited (optionally with `currentState` input).
     * @param error      Error instance to push when the predicate **passes**.
     * @param [contingency] - Optional object defining a contingent route.
     * @param next.func - A function to be executed if {@link predicate} evaluates to false
     * @param next.routineName - A descriptive name for the routine, useful for logging or debugging.
     *
     * @returns **this** for chaining.
     */
    public async failIfAsync(predicate: (() => Promise<boolean>) | ((input: TState) => Promise<boolean>),
        error: AError,
        contingency?: { func: (nextResult: Result<TState>) => void, routineName: string }): Promise<Result<TState>> {
        if (this.isSuccess) {
            try {
                const fail = predicate.length === 0
                    ? await (predicate as () => Promise<boolean>)()
                    : await (predicate as (i: TState) => Promise<boolean>)(this.currentState);
                if (fail) {
                    this._reasons.push(error);
                    if (contingency) {
                        let child = new Result<TState>(contingency.routineName, this);
                        this.child = child;
                        contingency.func(child);
                    }
                }
            }
            catch (e) {
                this._reasons.push(new ExceptionalError(e));
            }
        }
        return this;
    }

    /**
     * Internal helper—overwrites the single‑slot {@link stateCache}.
     * Not exposed publicly on purpose.
     */
    private cacheState(value: TState) {
        this.stateCache.length = 0;
        this.stateCache.push(value);
    }

}