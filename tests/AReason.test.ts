import { TestError } from "./setup/TestError";

describe('AReason.ctor', () => {
    it("should capture the passed message", () => {
        const msg = "This is a test";
        const testError = new TestError(msg);
        expect(testError.message).toBe(msg);
    });
});