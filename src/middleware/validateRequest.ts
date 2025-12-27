import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ValidationError } from "@/utils/errorHandler";
import { translateValidationError } from "@/utils/i18n";
import { messages } from "@/config/messages.ar";

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
        const originalMessage = error.errors[0]?.message || "Validation failed";
        const arabicMessage = translateValidationError(originalMessage);
        next(new ValidationError(arabicMessage));
        return;
      }
      next(new ValidationError(messages.errors.invalidRequestData));
    }
  };
};
