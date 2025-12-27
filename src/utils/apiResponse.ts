import { Response } from "express";
import { messages } from "@/config/messages.ar";

export class ApiResponse {
  static success(
    res: Response,
    data: any = null,
    message: string = messages.success.default,
    statusCode: number = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      requestId: res.getHeader("X-Request-ID") || res.getHeader("X-Request-Id"),
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 400,
    code?: string
  ): void {
    res.status(statusCode).json({
      success: false,
      message,
      code,
      requestId: res.getHeader("X-Request-ID") || res.getHeader("X-Request-Id"),
      ...(process.env.NODE_ENV === "development" && {
        stack: new Error().stack,
      }),
    });
  }
}
