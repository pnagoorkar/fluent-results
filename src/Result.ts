import {AReason} from './AReason';
import {AError} from './AError';
import { ExceptionalError } from './ExceptionalError';

export class Result{
    protected _reasons: AReason[] = [];
    private values: any[] = []; // will hold the value of last executed function that did not result in an exception
    private numberOfBindsSinceLastSuccess = 0;

    get isSuccess(): boolean{
        return !this.isFailed;
    } 
    get isFailed(): boolean{
        return this._reasons.some(reason => reason instanceof AError);
    }
    get value() : any{
        if(this.values.length === 1){
            return this.values[0];
        }
        else {
            throw new Error("To inject value into a parameterized function, first call a function that returns a value for retention");            
        }
    }

    get reasons() : AReason[]{
        return this._reasons.slice();
    }

    static try(action : () => any) : Result {
        let result = new Result();
        let retVal = undefined;
        let retResult = false;

        try{
            retVal = action(); 
            retResult = true;
        }
        catch(e){
            result._reasons.push(new ExceptionalError(e));
        }
        finally{
            if (retResult) result.retainValue(retVal); // retain value only if executing the action did not result in an exception
            return result;
        }
    }
    
    private retainValue(value: any) {
        while(this.values.length > 0) this.values.pop();
        this.values.unshift(value);
    }

    bind(func: (() => any) | ((input: any) => any)) : Result{
        let retVal = undefined;
        let retResult = false;
        try{
            if(this.isSuccess){
                retVal = func.length === 0 ? (func as () => any)() : (func as (input: any) => any)(this.value);
                retResult = true;     
            }
            else {
                this.numberOfBindsSinceLastSuccess++;
            }
        }
        catch(e) {
            this._reasons.push(new ExceptionalError(e));
        }
        finally {
            if (retResult) this.retainValue(retVal); // retain value only if the func execution did not result in an exception
            return this;
        }
    }

    addReasonIfFailed(reason: AReason) : Result{
        if(this.isFailed && this.numberOfBindsSinceLastSuccess == 0){
            this._reasons.unshift(reason);
        }
        return this;
    }

    okIf(func: () => boolean, error: AError) : Result{
        try{
            if(!func()){
                this._reasons.push(error);
            }
        }
        catch(e) {
            this._reasons.push(new ExceptionalError(e));
        }
        finally{
            return this;
        }
    }

    failIf(func: () => boolean, error: AError) : Result{
        try{
            if(func()){
                this._reasons.push(error);
            }
        }
        catch(e) {
            this._reasons.push(new ExceptionalError(e));
        }
        finally{
            return this;
        }
    }

}
