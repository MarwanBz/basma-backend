import { NextFunction, Request, Response } from "express";

import { AppError } from "@/utils/appError";
import { AuthService } from "@/services/auth.service";
import { BaseController } from "./base.controller";

export class AuthController extends BaseController {
  constructor(private authService: AuthService) {
    super();
  }

  signup = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(
      req,
      res,
      next,
      async () => {
        const { email, name, password } = req.body;
        return await this.authService.signup(email, name, password);
      },
      201,
      "User created successfully",
    );
  };

  login = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { identifier, email, password } = req.body;
      return await this.authService.login(identifier || email, password);
    });
  };

  logout = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      if (!req.user?.userId) {
        throw new AppError("Unauthorized", 401);
      }
      await this.authService.logout(req.user.userId);
      return { message: "Logged out successfully" };
    });
  };

  refresh = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { refreshToken } = req.body;
      return await this.authService.refresh(refreshToken);
    });
  };

  verifyEmail = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { token } = req.params;
      return await this.authService.verifyEmail(token);
    });
  };

  resendVerification = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    this.handleRequest(req, res, next, async () => {
      const { email } = req.body;
      return await this.authService.resendVerificationEmail(email);
    });
  };

  forgotPassword = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { email } = req.body;
      return await this.authService.forgotPassword(email);
    });
  };

  resetPassword = (req: Request, res: Response, next: NextFunction): void => {
    this.handleRequest(req, res, next, async () => {
      const { token } = req.params;
      const { password } = req.body;
      return await this.authService.resetPassword(token, password);
    });
  };
}
