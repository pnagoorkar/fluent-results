import { AReason } from "./AReason";

export abstract class AError extends AReason{
    /**
     *
     */
    constructor(message: string) {
        super(message);
        
    }
}