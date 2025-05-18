import {AReason} from './AReason';
import {AError} from './AError';
import { ExceptionalError } from './ExceptionalError';

export class Result{
    protected reasons: AReason[] = [];
    private retValues: any[] = [];
    private numberOfBindsSinceLastSuccess = 0;

    get isSuccess(): boolean{
        return !this.isFailed;
    } 
    get isFailed(): boolean{
        return this.reasons.some(reason => reason instanceof AError);
    }

    static try(action : () => any, retainResult = false) : Result {
        let result = new Result();

        try{
            let retVal = action();
            if(retainResult){
                result.retValues.push(retVal);
            }
            
        }
        catch(e){
            result.reasons.push(new ExceptionalError(e));
        }
        finally{
            return result;
        }
    }
    

    bind(func: (() => any) | ((input: any) => any), retainResult = false) : Result{
        try{
            if(this.isSuccess){
                let retVal = func.length === 0 ? (func as () => any)() : (func as (input: any) => any)(this.retValues.shift());                
                if(retainResult){
                    this.retValues.push(retVal);
                }
            }
            else {
                this.numberOfBindsSinceLastSuccess++;
            }
        }
        catch(e) {
            this.reasons.push(new ExceptionalError(e));
        }
        finally {
            return this;
        }
    }

    addReasonIfFailed(reason: AReason){
        if(this.isFailed && this.numberOfBindsSinceLastSuccess == 0){
            this.reasons.unshift(reason);
        }
    }

}

class DivideByZero extends AReason{

}

Result.try(() => console.log("hello world!"))
      .bind(() => console.log("another message"))
      .bind(() => 0, true)
      .bind(number => 5/number)
      .addReasonIfFailed(new DivideByZero(""));
