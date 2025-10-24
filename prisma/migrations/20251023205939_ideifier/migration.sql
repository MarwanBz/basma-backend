/*
  Warnings:

  - A unique constraint covering the columns `[customIdentifier]` on the table `maintenance_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `maintenance_requests` ADD COLUMN `customIdentifier` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `request_identifiers` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(50) NOT NULL,
    `building` VARCHAR(100) NOT NULL,
    `year` INTEGER NOT NULL,
    `sequence` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `customPattern` VARCHAR(200) NULL,
    `customSequence` INTEGER NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `request_identifiers_identifier_key`(`identifier`),
    INDEX `request_identifiers_building_idx`(`building`),
    INDEX `request_identifiers_year_idx`(`year`),
    INDEX `request_identifiers_isActive_idx`(`isActive`),
    INDEX `request_identifiers_identifier_idx`(`identifier`),
    INDEX `request_identifiers_createdBy_fkey`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `building_configs` (
    `id` VARCHAR(191) NOT NULL,
    `buildingName` VARCHAR(100) NOT NULL,
    `buildingCode` VARCHAR(20) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `currentSequence` INTEGER NOT NULL DEFAULT 0,
    `lastResetYear` INTEGER NULL,
    `allowCustomId` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `building_configs_buildingName_key`(`buildingName`),
    UNIQUE INDEX `building_configs_buildingCode_key`(`buildingCode`),
    INDEX `building_configs_buildingName_idx`(`buildingName`),
    INDEX `building_configs_buildingCode_idx`(`buildingCode`),
    INDEX `building_configs_isActive_idx`(`isActive`),
    INDEX `building_configs_createdBy_fkey`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` TEXT NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `fileExtension` VARCHAR(10) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `duration` INTEGER NULL,
    `processingStatus` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'THUMBNAIL_GENERATING', 'VIRUS_SCANNING') NOT NULL DEFAULT 'PENDING',
    `thumbnailPath` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `isScanned` BOOLEAN NOT NULL DEFAULT false,
    `scanResult` VARCHAR(20) NULL,
    `isValidated` BOOLEAN NOT NULL DEFAULT false,
    `entityType` ENUM('MAINTENANCE_REQUEST', 'REQUEST_COMMENT', 'USER_PROFILE', 'BUILDING_CONFIG') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `uploadIp` VARCHAR(45) NULL,
    `expiresAt` DATETIME(3) NULL,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `lastAccessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `file_attachments_fileName_key`(`fileName`),
    INDEX `file_attachments_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `file_attachments_uploadedById_idx`(`uploadedById`),
    INDEX `file_attachments_processingStatus_idx`(`processingStatus`),
    INDEX `file_attachments_isPublic_idx`(`isPublic`),
    INDEX `file_attachments_expiresAt_idx`(`expiresAt`),
    INDEX `file_attachments_createdAt_idx`(`createdAt`),
    INDEX `file_attachments_checksum_idx`(`checksum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcm_device_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `platform` ENUM('ANDROID', 'IOS', 'WEB') NOT NULL,
    `deviceId` VARCHAR(100) NULL,
    `appVersion` VARCHAR(20) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `fcm_device_tokens_token_key`(`token`),
    INDEX `fcm_device_tokens_isActive_idx`(`isActive`),
    INDEX `fcm_device_tokens_lastUsedAt_idx`(`lastUsedAt`),
    INDEX `fcm_device_tokens_platform_idx`(`platform`),
    INDEX `fcm_device_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcm_topic_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `topic` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tokenId` VARCHAR(191) NOT NULL,

    INDEX `fcm_topic_subscriptions_topic_idx`(`topic`),
    UNIQUE INDEX `fcm_topic_subscriptions_tokenId_topic_key`(`tokenId`, `topic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `maintenance_requests_customIdentifier_key` ON `maintenance_requests`(`customIdentifier`);

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_customIdentifier_fkey` FOREIGN KEY (`customIdentifier`) REFERENCES `request_identifiers`(`identifier`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_identifiers` ADD CONSTRAINT `request_identifiers_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `building_configs` ADD CONSTRAINT `building_configs_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_attachments` ADD CONSTRAINT `file_attachments_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcm_device_tokens` ADD CONSTRAINT `fcm_device_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcm_topic_subscriptions` ADD CONSTRAINT `fcm_topic_subscriptions_tokenId_fkey` FOREIGN KEY (`tokenId`) REFERENCES `fcm_device_tokens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
