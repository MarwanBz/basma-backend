-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `phone` VARCHAR(20) NULL,
  ADD UNIQUE INDEX `users_phone_key`(`phone`);
