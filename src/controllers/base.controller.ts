import { NextFunction, Request, Response } from "express";

import { ApiResponse } from "@/utils/apiResponse";
import { messages } from "@/config/messages.ar";

export abstract class BaseController {
  protected async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction,
    action: () => Promise<any>,
    successStatus: number = 200,
    successMessage: string = messages.success.default
  ): Promise<void> {
    try {
      const result = await action();
      ApiResponse.success(res, result, successMessage, successStatus);
    } catch (error) {
      next(error);
    }
  }
}
