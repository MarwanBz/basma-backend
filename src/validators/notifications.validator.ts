import { z } from "zod";

export const subscribeTopicSchema = z.object({
  body: z.object({
    token: z.string().min(10, "Token is required"),
    topic: z.string().min(1, "Topic is required"),
    platform: z.string().optional(),
    deviceId: z.string().optional(),
    appVersion: z.string().optional(),
  }),
});

export const sendTopicSchema = z.object({
  body: z.object({
    topic: z.string().min(1, "Topic is required"),
    title: z.string().min(1, "Title is required"),
    body: z.string().min(1, "Body is required"),
    data: z.record(z.string(), z.string()).optional(),
  }),
});

export const unsubscribeTopicSchema = z.object({
  body: z.object({
    token: z.string().min(10, "Token is required"),
    topic: z.string().min(1, "Topic is required"),
  }),
});

export const registerDeviceSchema = z.object({
  body: z.object({
    token: z.string().min(10, "Token is required"),
    platform: z.string().optional(),
    deviceId: z.string().optional(),
    appVersion: z.string().optional(),
  }),
});

export const unregisterDeviceSchema = z.object({
  body: z.object({
    token: z.string().min(10, "Token is required"),
  }),
});

