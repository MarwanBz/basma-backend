import { NextFunction, Request, Response } from "express";

import { notificationService } from "@/services/notifications.service";
import { AppError } from "@/utils/appError";

export class NotificationsController {
  async subscribeToTopic(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError("User not authenticated", 401);
      }

      const { token, topic, platform, deviceId, appVersion } = req.body;

      const result = await notificationService.subscribeAndStore({
        token,
        topic,
        userId,
        platform,
        deviceId,
        appVersion,
      });

      res.status(200).json({
        success: true,
        message: "Subscribed to topic",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async unsubscribeFromTopic(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError("User not authenticated", 401);

      const { token, topic } = req.body;

      await notificationService.unsubscribeFromTopic(token, topic, userId);

      res.status(200).json({
        success: true,
        message: "Unsubscribed from topic",
      });
    } catch (error) {
      next(error);
    }
  }

  async registerDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError("User not authenticated", 401);

      const { token, platform, deviceId, appVersion } = req.body;

      const record = await notificationService.registerDevice({
        token,
        platform,
        deviceId,
        appVersion,
        userId,
      });

      res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  async unregisterDevice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError("User not authenticated", 401);

      const { token } = req.body;
      await notificationService.unregisterDevice(token, userId);

      res.status(200).json({
        success: true,
        message: "Device unregistered",
      });
    } catch (error) {
      next(error);
    }
  }

  async listSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError("User not authenticated", 401);

      const devices = await notificationService.getUserDevices(userId);

      res.status(200).json({
        success: true,
        data: {
          devices,
          count: devices.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async sendToTopic(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { topic, title, body, data } = req.body;

      const result = await notificationService.sendToTopic({
        topic,
        title,
        body,
        data,
      });

      res.status(200).json({
        success: true,
        message: "Notification sent",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();

