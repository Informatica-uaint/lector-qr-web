-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS registro_qr;
USE registro_qr;

-- Crear tabla de registros QR
CREATE TABLE IF NOT EXISTS qr_registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    tipo ENUM('Entrada', 'Salida') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha DATE GENERATED ALWAYS AS (DATE(timestamp)) STORED,
    INDEX idx_email (email),
    INDEX idx_fecha (fecha),
    INDEX idx_timestamp (timestamp)
);

-- Insertar algunos datos de prueba
INSERT INTO qr_registros (nombre, apellido, email, tipo) VALUES
('Juan', 'Pérez', 'juan.perez@uai.cl', 'Entrada'),
('María', 'González', 'maria.gonzalez@uai.cl', 'Entrada'),
('Carlos', 'López', 'carlos.lopez@uai.cl', 'Salida');

-- Crear usuario para la aplicación
CREATE USER IF NOT EXISTS 'qr_user'@'%' IDENTIFIED BY 'qr_password';
GRANT SELECT, INSERT, UPDATE ON registro_qr.* TO 'qr_user'@'%';
FLUSH PRIVILEGES;