-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS registro_qr;
USE registro_qr;

-- Tabla de usuarios ayudantes autorizados
CREATE TABLE IF NOT EXISTS usuarios_permitidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    TP VARCHAR(50) DEFAULT 'AYUDANTE',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_activo (activo)
);

-- Tabla de usuarios estudiantes autorizados
CREATE TABLE IF NOT EXISTS usuarios_estudiantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    TP VARCHAR(50) DEFAULT 'ESTUDIANTE',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_activo (activo)
);

-- Tabla de registros para ayudantes
CREATE TABLE IF NOT EXISTS registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    dia VARCHAR(20) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    metodo VARCHAR(20) DEFAULT 'QR',
    tipo ENUM('Entrada', 'Salida') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_fecha (fecha),
    INDEX idx_timestamp (timestamp)
);

-- Tabla de registros para estudiantes
CREATE TABLE IF NOT EXISTS EST_registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    dia VARCHAR(20) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    metodo VARCHAR(20) DEFAULT 'QR',
    tipo ENUM('Entrada', 'Salida') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_fecha (fecha),
    INDEX idx_timestamp (timestamp)
);

-- El usuario se crea automáticamente por docker-compose usando MYSQL_USER y MYSQL_PASSWORD