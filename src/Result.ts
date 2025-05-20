import { AReason } from './AReason';
import { AError } from './AError';
import { ExceptionalError } from './ExceptionalError';

export class Result {
    protected _reasons: AReason[] = [];
    private stateCache: any[] = []; // will hold the state of last executed function that did not result in an exception

    get isSuccess(): boolean {
        return !this.isFailed;
    }
    get isFailed(): boolean {
        return this._reasons.some(reason => reason instanceof AError);
    }
    get currentState(): any {
        if (this.stateCache.length === 1) {
            return this.stateCache[0];
        }
        else {
            throw new Error("To inject state into a parameterized function, first call a function that returns a state for retention");
        }
    }

    get reasons(): AReason[] {
        return this._reasons.slice();
    }
    get errors(): AError[] {
        return this._reasons.filter(reason => reason instanceof AError);
    }

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

    private cacheState(value: any) {
        while (this.stateCache.length > 0) this.stateCache.pop();
        this.stateCache.unshift(value);
    }

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
