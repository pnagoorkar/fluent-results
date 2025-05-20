import { AReason } from './AReason';
import { AError } from './AError';
import { ExceptionalError } from './ExceptionalError';

export class Result {
    protected _reasons: AReason[] = [];
    private states: any[] = []; // will hold the state of last executed function that did not result in an exception

    get isSuccess(): boolean {
        return !this.isFailed;
    }
    get isFailed(): boolean {
        return this._reasons.some(reason => reason instanceof AError);
    }
    get currentState(): any {
        if (this.states.length === 1) {
            return this.states[0];
        }
        else {
            throw new Error("To inject state into a parameterized function, first call a function that returns a state for retention");
        }
    }

    get reasons(): AReason[] {
        return this._reasons.slice();
    }

    static try(action: () => any): Result {
        let result = new Result();
        let retVal = undefined;
        let retResult = false;

        try {
            retVal = action();
            retResult = true;
        }
        catch (e) {
            result._reasons.push(new ExceptionalError(e));
        }
        finally {
            if (retResult) result.retainValue(retVal); // retain value only if executing the action did not result in an exception
            return result;
        }
    }

    private retainValue(value: any) {
        while (this.states.length > 0) this.states.pop();
        this.states.unshift(value);
    }

    bind(func: (() => any) | ((input: any) => any)): Result {
        let retVal = undefined;
        let retResult = false;
        try {
            if (this.isSuccess) {
                retVal = func.length === 0 ? (func as () => any)() : (func as (input: any) => any)(this.currentState);
                retResult = true;
            }
        }
        catch (e) {
            this._reasons.push(new ExceptionalError(e));
        }
        finally {
            if (retResult) this.retainValue(retVal); // retain value only if the func execution did not result in an exception
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
