/*
  Warnings:

  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `user`;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(99) NOT NULL,
    `email` VARCHAR(99) NOT NULL,
    `password` VARCHAR(100) NULL,
    `refreshToken` TEXT NULL,
    `role` ENUM('SUPER_ADMIN', 'MAINTENANCE_ADMIN', 'BASMA_ADMIN', 'TECHNICIAN', 'CUSTOMER', 'ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `emailVerified` DATETIME(3) NULL,
    `emailVerificationToken` VARCHAR(100) NULL,
    `emailVerificationExpires` DATETIME(3) NULL,
    `passwordResetToken` VARCHAR(100) NULL,
    `passwordResetExpires` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `request_categories_name_idx`(`name`),
    INDEX `request_categories_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_requests` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('DRAFT', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `categoryId` INTEGER NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `building` VARCHAR(100) NULL,
    `specificLocation` VARCHAR(200) NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `assignedById` VARCHAR(191) NULL,
    `estimatedCost` DECIMAL(10, 2) NULL,
    `actualCost` DECIMAL(10, 2) NULL,
    `scheduledDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `maintenance_requests_status_idx`(`status`),
    INDEX `maintenance_requests_priority_idx`(`priority`),
    INDEX `maintenance_requests_categoryId_idx`(`categoryId`),
    INDEX `maintenance_requests_requestedById_idx`(`requestedById`),
    INDEX `maintenance_requests_assignedToId_idx`(`assignedToId`),
    INDEX `maintenance_requests_assignedById_idx`(`assignedById`),
    INDEX `maintenance_requests_createdAt_idx`(`createdAt`),
    INDEX `maintenance_requests_scheduledDate_idx`(`scheduledDate`),
    INDEX `maintenance_requests_building_idx`(`building`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_comments` (
    `id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,

    INDEX `request_comments_requestId_idx`(`requestId`),
    INDEX `request_comments_userId_idx`(`userId`),
    INDEX `request_comments_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'REJECTED') NULL,
    `toStatus` ENUM('DRAFT', 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'REJECTED') NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changedById` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NOT NULL,

    INDEX `request_status_history_requestId_idx`(`requestId`),
    INDEX `request_status_history_changedById_idx`(`changedById`),
    INDEX `request_status_history_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_assignment_history` (
    `id` VARCHAR(191) NOT NULL,
    `fromTechnicianId` VARCHAR(191) NULL,
    `toTechnicianId` VARCHAR(191) NULL,
    `assignmentType` ENUM('INITIAL_ASSIGNMENT', 'REASSIGNMENT', 'SELF_ASSIGNMENT', 'UNASSIGNMENT') NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assignedById` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,

    INDEX `request_assignment_history_requestId_idx`(`requestId`),
    INDEX `request_assignment_history_assignedById_idx`(`assignedById`),
    INDEX `request_assignment_history_fromTechnicianId_idx`(`fromTechnicianId`),
    INDEX `request_assignment_history_toTechnicianId_idx`(`toTechnicianId`),
    INDEX `request_assignment_history_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `request_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_requests` ADD CONSTRAINT `maintenance_requests_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_status_history` ADD CONSTRAINT `request_status_history_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_status_history` ADD CONSTRAINT `request_status_history_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_assignment_history` ADD CONSTRAINT `request_assignment_history_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_assignment_history` ADD CONSTRAINT `request_assignment_history_fromTechnicianId_fkey` FOREIGN KEY (`fromTechnicianId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_assignment_history` ADD CONSTRAINT `request_assignment_history_toTechnicianId_fkey` FOREIGN KEY (`toTechnicianId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_assignment_history` ADD CONSTRAINT `request_assignment_history_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
