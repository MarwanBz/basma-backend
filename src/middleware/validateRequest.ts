import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ValidationError } from "@/utils/errorHandler";

export const validateRequest = (schema: AnyZodObject, target: 'body' | 'query' | 'params' | 'all' = 'all') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let dataToValidate;

      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'all':
        default:
          dataToValidate = {
            body: req.body,
            query: req.query,
            params: req.params,
            headers: req.headers
          };
          break;
      }

      schema.parse(dataToValidate);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.errors[0]?.message || "Validation failed"));
        return;
      }
      next(new ValidationError("Invalid request data"));
    }
  };
};
