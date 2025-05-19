-- MySQL dump
--
-- Host: 127.0.0.1    Database: matrixDoorPhone
-- ------------------------------------------------------
-- Server version	8.2.0

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `call_participants`
--

DROP TABLE IF EXISTS `call_participants`;
CREATE TABLE `call_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `raw_display_name` varchar(255) DEFAULT NULL,
  `matrix_device_id` varchar(255) DEFAULT NULL,
  `mxid` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `call_rooms`
--

DROP TABLE IF EXISTS `call_rooms`;
CREATE TABLE `call_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `calls`
--

DROP TABLE IF EXISTS `calls`;
CREATE TABLE `calls` (
  `id` varchar(255) NOT NULL,
  `device_id` int DEFAULT NULL,
  `direction` varchar(255) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `hang_up_party` varchar(255) DEFAULT NULL,
  `hang_up_reason` varchar(255) DEFAULT NULL,
  `participant_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_calls_room_id` (`room_id`),
  KEY `fk_devices_id` (`device_id`),
  KEY `fk_calls_participants_id` (`participant_id`),
  CONSTRAINT `fk_calls_participants_id` FOREIGN KEY (`participant_id`) REFERENCES `call_participants` (`id`),
  CONSTRAINT `fk_calls_room_id` FOREIGN KEY (`room_id`) REFERENCES `call_rooms` (`id`),
  CONSTRAINT `fk_devices_id` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `cookie_sessions`
--

DROP TABLE IF EXISTS `cookie_sessions`;
CREATE TABLE `cookie_sessions` (
  `id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires_at` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `magic_link_sessions`
--

DROP TABLE IF EXISTS `magic_link_sessions`;
CREATE TABLE `magic_link_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int NOT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessionId` (`session_id`),
  KEY `device_id` (`device_id`),
  CONSTRAINT `magic_link_sessions_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `magic_link_tokens`
--

DROP TABLE IF EXISTS `magic_link_tokens`;
CREATE TABLE `magic_link_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `token` varchar(1024) DEFAULT NULL,
  `six_digit_number` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `magic_link_tokens_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `magic_link_sessions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `visitor_inputs`
--

DROP TABLE IF EXISTS `visitor_inputs`;
CREATE TABLE `visitor_inputs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int DEFAULT NULL,
  `type` varchar(45) DEFAULT NULL,
  `triggered_at` timestamp NULL DEFAULT NULL,
  `smart_home_state` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_visitor_inputs_devices_id` (`device_id`),
  CONSTRAINT `fk_visitor_inputs_devices_id` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `devices` (`name`) VALUES ('matrixDoorPhone');