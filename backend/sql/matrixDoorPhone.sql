-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: db
-- Erstellungszeit: 16. Dez 2023 um 22:33
-- Server-Version: 8.2.0
-- PHP-Version: 8.2.8

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `matrixDoorPhone`
--
CREATE DATABASE IF NOT EXISTS `matrixDoorPhone` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `matrixDoorPhone`;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `cookie_sessions`
--

DROP TABLE IF EXISTS `cookie_sessions`;
CREATE TABLE `cookie_sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires_at` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `magic_link_sessions`
--

DROP TABLE IF EXISTS `magic_link_sessions`;
CREATE TABLE `magic_link_sessions` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `magic_link_tokens`
--

DROP TABLE IF EXISTS `magic_link_tokens`;
CREATE TABLE `magic_link_tokens` (
  `id` int NOT NULL,
  `session_id` int NOT NULL,
  `token` varchar(1024) DEFAULT NULL,
  `six_digit_number` int DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL,
  `username` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `cookie_sessions`
--
ALTER TABLE `cookie_sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indizes für die Tabelle `magic_link_sessions`
--
ALTER TABLE `magic_link_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sessionId` (`session_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indizes für die Tabelle `magic_link_tokens`
--
ALTER TABLE `magic_link_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`);

--
-- Indizes für die Tabelle `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `magic_link_sessions`
--
ALTER TABLE `magic_link_sessions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `magic_link_tokens`
--
ALTER TABLE `magic_link_tokens`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints der exportierten Tabellen
--

--
-- Constraints der Tabelle `magic_link_sessions`
--
ALTER TABLE `magic_link_sessions`
  ADD CONSTRAINT `magic_link_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints der Tabelle `magic_link_tokens`
--
ALTER TABLE `magic_link_tokens`
  ADD CONSTRAINT `magic_link_tokens_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `magic_link_sessions` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
