/*
 Navicat Premium Data Transfer

 Source Server         : 22bot
 Source Server Type    : MySQL
 Source Server Version : 80022
 Source Host           : localhost:3306
 Source Schema         : bf1new

 Target Server Type    : MySQL
 Target Server Version : 80022
 File Encoding         : 65001

 Date: 08/06/2022 11:44:32
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for accounts
-- ----------------------------
DROP TABLE IF EXISTS `accounts`;
CREATE TABLE `accounts`  (
  `personaId` bigint NOT NULL,
  `remid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `sid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `sessionId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `admin` tinyint(1) NOT NULL DEFAULT 0,
  `available` tinyint(1) NOT NULL DEFAULT 1,
  `updateAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`personaId`) USING BTREE,
  CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for bans
-- ----------------------------
DROP TABLE IF EXISTS `bans`;
CREATE TABLE `bans`  (
  `personaId` bigint NOT NULL,
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`personaId`, `guid`) USING BTREE,
  INDEX `guid`(`guid`) USING BTREE,
  CONSTRAINT `bans_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `server_bans` (`personaId`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `bans_ibfk_2` FOREIGN KEY (`guid`) REFERENCES `server_bans` (`guid`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for bind_accounts
-- ----------------------------
DROP TABLE IF EXISTS `bind_accounts`;
CREATE TABLE `bind_accounts`  (
  `qq` bigint NOT NULL,
  `account_id` bigint NOT NULL,
  PRIMARY KEY (`qq`) USING BTREE,
  INDEX `bind_account`(`account_id`) USING BTREE,
  CONSTRAINT `bind_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for bind_players
-- ----------------------------
DROP TABLE IF EXISTS `bind_players`;
CREATE TABLE `bind_players`  (
  `qq` bigint NOT NULL,
  `personaId` bigint NOT NULL,
  PRIMARY KEY (`qq`) USING BTREE,
  INDEX `personaId`(`personaId`) USING BTREE,
  CONSTRAINT `bind_players_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cloudban_records
-- ----------------------------
DROP TABLE IF EXISTS `cloudban_records`;
CREATE TABLE `cloudban_records`  (
  `personaId` bigint NOT NULL,
  `time` datetime NOT NULL,
  `message` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`personaId`) USING BTREE,
  CONSTRAINT `cloudban_records_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `cloudbans` (`personaId`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cloudbans
-- ----------------------------
DROP TABLE IF EXISTS `cloudbans`;
CREATE TABLE `cloudbans`  (
  `personaId` bigint NOT NULL,
  `status` tinyint(1) NOT NULL,
  PRIMARY KEY (`personaId`) USING BTREE,
  CONSTRAINT `cloudbans_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_admins
-- ----------------------------
DROP TABLE IF EXISTS `group_admins`;
CREATE TABLE `group_admins`  (
  `qq` bigint NOT NULL,
  `group_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`qq`, `group_name`) USING BTREE,
  INDEX `group_name`(`group_name`) USING BTREE,
  CONSTRAINT `group_admins_ibfk_1` FOREIGN KEY (`group_name`) REFERENCES `groups` (`name`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_owners
-- ----------------------------
DROP TABLE IF EXISTS `group_owners`;
CREATE TABLE `group_owners`  (
  `qq` bigint NOT NULL,
  `group_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`qq`, `group_name`) USING BTREE,
  INDEX `group_name`(`group_name`) USING BTREE,
  CONSTRAINT `group_owners_ibfk_1` FOREIGN KEY (`group_name`) REFERENCES `groups` (`name`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for group_servers
-- ----------------------------
DROP TABLE IF EXISTS `group_servers`;
CREATE TABLE `group_servers`  (
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `group_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `account_id` bigint NOT NULL,
  PRIMARY KEY (`name`) USING BTREE,
  UNIQUE INDEX `guid`(`guid`) USING BTREE,
  INDEX `group_name`(`group_name`) USING BTREE,
  INDEX `account`(`account_id`) USING BTREE,
  CONSTRAINT `account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `group_servers_ibfk_1` FOREIGN KEY (`guid`) REFERENCES `servers` (`guid`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `group_servers_ibfk_2` FOREIGN KEY (`group_name`) REFERENCES `groups` (`name`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for groups
-- ----------------------------
DROP TABLE IF EXISTS `groups`;
CREATE TABLE `groups`  (
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `bindGroups` json NULL COMMENT 'qq群',
  PRIMARY KEY (`name`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for platoon_members
-- ----------------------------
DROP TABLE IF EXISTS `platoon_members`;
CREATE TABLE `platoon_members`  (
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `personaId` bigint NOT NULL,
  `role` tinyint NOT NULL,
  PRIMARY KEY (`guid`, `personaId`) USING BTREE,
  INDEX `personaId`(`personaId`) USING BTREE,
  CONSTRAINT `platoon_members_ibfk_1` FOREIGN KEY (`guid`) REFERENCES `platoons` (`guid`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `platoon_members_ibfk_2` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for platoons
-- ----------------------------
DROP TABLE IF EXISTS `platoons`;
CREATE TABLE `platoons`  (
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `size` tinyint NOT NULL,
  `tag` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `emblem` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`guid`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for players
-- ----------------------------
DROP TABLE IF EXISTS `players`;
CREATE TABLE `players`  (
  `personaId` bigint NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `userId` bigint NULL DEFAULT NULL,
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `updateAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`personaId`) USING BTREE,
  UNIQUE INDEX `userId`(`userId`) USING BTREE,
  INDEX `playerName`(`name`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for server_admins
-- ----------------------------
DROP TABLE IF EXISTS `server_admins`;
CREATE TABLE `server_admins`  (
  `personaId` bigint NOT NULL,
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `createAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`personaId`, `guid`) USING BTREE,
  INDEX `guid`(`guid`) USING BTREE,
  CONSTRAINT `server_admins_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `server_admins_ibfk_2` FOREIGN KEY (`guid`) REFERENCES `servers` (`guid`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for server_bans
-- ----------------------------
DROP TABLE IF EXISTS `server_bans`;
CREATE TABLE `server_bans`  (
  `personaId` bigint NOT NULL,
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `createAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`personaId`, `guid`) USING BTREE,
  INDEX `guid`(`guid`) USING BTREE,
  CONSTRAINT `server_bans_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `server_bans_ibfk_2` FOREIGN KEY (`guid`) REFERENCES `servers` (`guid`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for server_status
-- ----------------------------
DROP TABLE IF EXISTS `server_status`;
CREATE TABLE `server_status`  (
  `time` datetime NOT NULL,
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `map` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `mode` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `soldier` tinyint NOT NULL,
  `spectator` tinyint NOT NULL,
  PRIMARY KEY (`guid`, `time`) USING BTREE,
  CONSTRAINT `server_status_ibfk_1` FOREIGN KEY (`guid`) REFERENCES `servers` (`guid`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for server_vips
-- ----------------------------
DROP TABLE IF EXISTS `server_vips`;
CREATE TABLE `server_vips`  (
  `personaId` bigint NOT NULL,
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `createAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`personaId`, `guid`) USING BTREE,
  INDEX `guid`(`guid`) USING BTREE,
  CONSTRAINT `server_vips_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `server_vips_ibfk_2` FOREIGN KEY (`guid`) REFERENCES `servers` (`guid`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for servers
-- ----------------------------
DROP TABLE IF EXISTS `servers`;
CREATE TABLE `servers`  (
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `gameId` bigint NOT NULL,
  `serverId` int NOT NULL,
  `id` int NULL DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `region` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `country` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `serverType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `serverBookmarkCount` int NOT NULL,
  `owner` bigint NOT NULL,
  `createdDate` datetime NOT NULL,
  `expirationDate` datetime NOT NULL,
  `updatedDate` datetime NOT NULL,
  `updatedBy` bigint NOT NULL,
  `rotation` json NOT NULL,
  `customGameSettings` json NOT NULL,
  PRIMARY KEY (`guid`) USING BTREE,
  UNIQUE INDEX `gameId`(`gameId`) USING BTREE,
  UNIQUE INDEX `serverId`(`serverId`) USING BTREE,
  UNIQUE INDEX `id`(`id`) USING BTREE,
  INDEX `servers_ibfk_1`(`owner`) USING BTREE,
  INDEX `servers_ibfk_2`(`updatedBy`) USING BTREE,
  CONSTRAINT `servers_ibfk_1` FOREIGN KEY (`owner`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `servers_ibfk_2` FOREIGN KEY (`updatedBy`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 541124 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for stats
-- ----------------------------
DROP TABLE IF EXISTS `stats`;
CREATE TABLE `stats`  (
  `personaId` bigint NOT NULL,
  `time` datetime NOT NULL,
  `stat` json NOT NULL,
  PRIMARY KEY (`personaId`) USING BTREE,
  CONSTRAINT `stats_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `players` (`personaId`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for vips
-- ----------------------------
DROP TABLE IF EXISTS `vips`;
CREATE TABLE `vips`  (
  `personaId` bigint NOT NULL,
  `guid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`personaId`, `guid`) USING BTREE,
  INDEX `guid`(`guid`) USING BTREE,
  CONSTRAINT `vips_ibfk_1` FOREIGN KEY (`personaId`) REFERENCES `server_vips` (`personaId`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `vips_ibfk_2` FOREIGN KEY (`guid`) REFERENCES `server_vips` (`guid`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
