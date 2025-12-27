/**
 * Internationalization (i18n) Utility
 * Arabic-only implementation for user-facing messages
 */

import {
  messages,
  SuccessMessageKey,
  ErrorMessageKey,
  ValidationMessageKey,
} from "@/config/messages.ar";
import { ErrorCode } from "./errorCodes";

/**
 * Get a success message by key
 */
export const getSuccessMessage = (key: SuccessMessageKey): string => {
  return messages.success[key] || messages.success.default;
};

/**
 * Get an error message by key
 */
export const getErrorMessage = (key: ErrorMessageKey): string => {
  return messages.errors[key] || messages.errors.internalServerError;
};

/**
 * Get a validation message by key
 */
export const getValidationMessage = (key: ValidationMessageKey): string => {
  return messages.validation[key] || messages.validation.fieldRequired;
};

/**
 * Get email template content
 */
export const getEmailContent = (
  template: "verification" | "passwordReset"
): typeof messages.email.verification | typeof messages.email.passwordReset => {
  return messages.email[template];
};

/**
 * Get notification content
 */
export const getNotificationContent = (
  type: keyof typeof messages.notifications
): { title: string; body: string } => {
  return messages.notifications[type];
};

/**
 * Map ErrorCode enum to Arabic error messages
 */
export const getErrorMessageByCode = (code: ErrorCode): string => {
  const codeToMessageMap: Record<ErrorCode, ErrorMessageKey> = {
    // Authentication Errors
    [ErrorCode.UNAUTHORIZED]: "unauthorized",
    [ErrorCode.INVALID_CREDENTIALS]: "invalidCredentials",
    [ErrorCode.TOKEN_EXPIRED]: "tokenExpired",
    [ErrorCode.INVALID_TOKEN]: "invalidToken",

    // Authorization Errors
    [ErrorCode.FORBIDDEN]: "forbidden",
    [ErrorCode.INSUFFICIENT_PERMISSIONS]: "insufficientPermissions",

    // Validation Errors
    [ErrorCode.INVALID_INPUT]: "invalidRequestData",
    [ErrorCode.MISSING_REQUIRED_FIELD]: "missingRequiredFields",
    [ErrorCode.INVALID_EMAIL]: "invalidRequestData",
    [ErrorCode.INVALID_PASSWORD]: "invalidRequestData",
    [ErrorCode.INVALID_REQUEST]: "invalidRequestData",
    [ErrorCode.VALIDATION_ERROR]: "validationFailed",

    // Resource Errors
    [ErrorCode.NOT_FOUND]: "resourceNotFound",
    [ErrorCode.ALREADY_EXISTS]: "resourceAlreadyExists",
    [ErrorCode.CONFLICT]: "resourceAlreadyExists",

    // Database Errors
    [ErrorCode.DB_ERROR]: "databaseError",
    [ErrorCode.DB_CONNECTION_ERROR]: "dbConnectionError",
    [ErrorCode.DB_QUERY_ERROR]: "dbQueryError",

    // Server Errors
    [ErrorCode.INTERNAL_SERVER_ERROR]: "internalServerError",
    [ErrorCode.SERVICE_UNAVAILABLE]: "serviceUnavailable",
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: "serviceUnavailable",
  };

  const messageKey = codeToMessageMap[code];
  return messageKey ? messages.errors[messageKey] : messages.errors.internalServerError;
};

/**
 * Map common English error messages to Arabic
 * Used as a fallback when ErrorCode is not available
 */
export const translateErrorMessage = (englishMessage: string): string => {
  const messageMap: Record<string, string> = {
    // Authentication
    "Unauthorized": messages.errors.unauthorized,
    "Not authenticated": messages.errors.notAuthenticated,
    "User not authenticated": messages.errors.userNotAuthenticated,
    "Invalid credentials": messages.errors.invalidCredentials,
    "No token provided": messages.errors.noTokenProvided,
    "Invalid token": messages.errors.invalidToken,
    "Token expired": messages.errors.tokenExpired,
    "Invalid refresh token": messages.errors.invalidRefreshToken,
    "Email not verified": messages.errors.emailNotVerified,
    "Account is disabled": messages.errors.accountDisabled,

    // Authorization
    "Access denied": messages.errors.accessDenied,
    "Forbidden": messages.errors.forbidden,
    "Not authorized to access this profile": messages.errors.notAuthorizedToAccessProfile,
    "Insufficient permissions": messages.errors.insufficientPermissions,
    "Access denied. Admin privileges required.": messages.errors.adminPrivilegesRequired,
    "Only administrators can send announcements": messages.errors.onlyAdminsCanSendAnnouncements,

    // Not Found
    "User not found": messages.errors.userNotFound,
    "Request not found": messages.errors.requestNotFound,
    "File not found": messages.errors.fileNotFound,
    "Category not found": messages.errors.categoryNotFound,
    "Building configuration not found": messages.errors.buildingConfigNotFound,
    "Resource not found": messages.errors.resourceNotFound,

    // Already Exists
    "Email already exists": messages.errors.emailAlreadyExists,
    "Phone number already exists": messages.errors.phoneAlreadyExists,
    "Resource already exists": messages.errors.resourceAlreadyExists,

    // Validation
    "Validation failed": messages.errors.validationFailed,
    "Invalid request data": messages.errors.invalidRequestData,
    "Name, email, password, and role are required": messages.errors.nameEmailPasswordRoleRequired,
    "Updates must be an array": messages.errors.updatesMustBeArray,
    "User IDs must be an array": messages.errors.userIdsMustBeArray,
    "User ID is required": messages.errors.userIdRequired,
    "Email or identifier is required": messages.errors.emailOrIdentifierRequired,

    // Files
    "No file provided": messages.errors.noFileProvided,
    "No file provided for upload": messages.errors.noFileProvided,
    "No files provided": messages.errors.noFilesProvided,
    "No files provided for upload": messages.errors.noFilesProvided,
    "File key is required": messages.errors.fileKeyRequired,
    "Entity type and ID are required": messages.errors.entityTypeAndIdRequired,
    "Invalid entity type": messages.errors.invalidEntityType,
    "File size exceeds maximum limit of 50MB": messages.errors.fileSizeExceedsLimit,
    "Failed to upload file": messages.errors.failedToUploadFile,
    "Failed to delete file": messages.errors.failedToDeleteFile,
    "Failed to generate download URL": messages.errors.failedToGenerateDownloadUrl,
    "Failed to generate file URL": messages.errors.failedToGenerateDownloadUrl,
    "Failed to retrieve files": messages.errors.failedToRetrieveFiles,
    "Failed to retrieve file information": messages.errors.failedToRetrieveFiles,
    "File has expired": messages.errors.fileHasExpired,
    "Storage bucket does not exist": messages.errors.storageBucketNotExist,
    "Access denied to storage service": messages.errors.accessDeniedToStorage,
    "File size exceeds storage limit": messages.errors.fileSizeExceedsStorageLimit,

    // Notifications
    "Either userId or topic must be provided": messages.errors.userIdOrTopicRequired,
    "Test endpoint not available in production": messages.errors.testEndpointNotInProduction,
    "Failed to subscribe to topic": messages.errors.failedToSubscribeToTopic,

    // Requests
    "Invalid technician": messages.errors.invalidTechnician,

    // Database
    "Database error": messages.errors.databaseError,
    "Internal server error": messages.errors.internalServerError,
  };

  // Check for exact match first
  if (messageMap[englishMessage]) {
    return messageMap[englishMessage];
  }

  // Check for partial matches (for dynamic messages)
  for (const [key, value] of Object.entries(messageMap)) {
    if (englishMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Return generic error if no match found
  return messages.errors.internalServerError;
};

/**
 * Translate validation error messages from Zod
 */
export const translateValidationError = (englishMessage: string): string => {
  const validationMap: Record<string, string> = {
    "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character":
      messages.validation.passwordRequirements,
    "Email or identifier is required": messages.errors.emailOrIdentifierRequired,
    "Refresh token is required": messages.validation.refreshTokenRequired,
    "Invalid email address": messages.validation.invalidEmailAddress,
    "Invalid email": messages.validation.invalidEmailAddress,
    "Verification token is required": messages.validation.verificationTokenRequired,
    "Reset token is required": messages.validation.resetTokenRequired,
    "String must contain at least 8 character(s)": messages.validation.passwordMinLength,
    "String must contain at least 2 character(s)": messages.validation.nameMinLength,
    "Required": messages.validation.fieldRequired,
  };

  // Check for exact match
  if (validationMap[englishMessage]) {
    return validationMap[englishMessage];
  }

  // Check for common Zod patterns
  if (englishMessage.includes("must contain at least")) {
    return messages.validation.fieldRequired;
  }
  if (englishMessage.includes("Invalid email")) {
    return messages.validation.invalidEmailAddress;
  }
  if (englishMessage.includes("Required")) {
    return messages.validation.fieldRequired;
  }

  // Return generic validation error
  return messages.errors.validationFailed;
};

// Export the messages object for direct access if needed
export { messages };

