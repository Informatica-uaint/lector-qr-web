#!/usr/bin/env node

/**
 * Script de prueba para verificar la integración del frontend con el control de puerta
 * 
 * Este script simula diferentes respuestas del backend para probar cómo el frontend
 * maneja los nuevos mensajes de control de puerta.
 * 
 * NO ejecutar directamente - usar como referencia para entender las estructuras de datos.
 */

// Ejemplo de respuesta cuando un AYUDANTE escanea (puerta se abre)
const responseAyudanteEntrada = {
  success: true,
  message: "Juan Pérez",
  tipo: "Entrada",
  usuario_tipo: "AYUDANTE", 
  fecha: "2024-01-15",
  hora: "10:30:45",
  timestamp: "10:30:45 AM",
  registro_id: 123,
  door: {
    shouldOpen: true,
    reason: "Ayudante autorizado - entrada permitida",
    assistantsPresent: true,
    specialMessage: null
  }
};

// Ejemplo de respuesta cuando un ESTUDIANTE escanea y HAY ayudantes (puerta se abre)
const responseEstudianteConAyudantes = {
  success: true,
  message: "María González",
  tipo: "Entrada",
  usuario_tipo: "ESTUDIANTE",
  fecha: "2024-01-15", 
  hora: "10:35:20",
  timestamp: "10:35:20 AM",
  registro_id: 124,
  door: {
    shouldOpen: true,
    reason: "Estudiante autorizado - ayudantes presentes",
    assistantsPresent: true,
    specialMessage: null
  }
};

// Ejemplo de respuesta cuando un ESTUDIANTE escanea y NO HAY ayudantes (LABORATORIO CERRADO)
const responseEstudianteSinAyudantes = {
  success: true, // Sigue siendo success porque el registro se hace
  message: "Carlos López",
  tipo: "Entrada",
  usuario_tipo: "ESTUDIANTE",
  fecha: "2024-01-15",
  hora: "08:15:30", 
  timestamp: "08:15:30 AM",
  registro_id: 125,
  door: {
    shouldOpen: false,
    reason: "Laboratorio cerrado - no hay ayudantes presentes",
    assistantsPresent: false,
    specialMessage: {
      type: "LABORATORIO_CERRADO",
      title: "Laboratorio Cerrado",
      message: "Tocar Timbre",
      style: "warning"
    }
  }
};

// Ejemplo de respuesta de error (usuario no autorizado)
const responseError = {
  success: false,
  message: "No Autorizado",
  errorType: "USUARIO_NO_AUTORIZADO",
  email: "usuario.noautorizado@ejemplo.com",
  timestamp: "08:20:15 AM"
};

console.log('📋 EJEMPLOS DE RESPUESTAS PARA TESTING FRONTEND\n');

console.log('✅ 1. AYUDANTE ENTRANDO (Puerta se abre):');
console.log(JSON.stringify(responseAyudanteEntrada, null, 2));

console.log('\n✅ 2. ESTUDIANTE CON AYUDANTES PRESENTES (Puerta se abre):');
console.log(JSON.stringify(responseEstudianteConAyudantes, null, 2));

console.log('\n⚠️  3. ESTUDIANTE SIN AYUDANTES (LABORATORIO CERRADO):');
console.log(JSON.stringify(responseEstudianteSinAyudantes, null, 2));

console.log('\n❌ 4. ERROR - USUARIO NO AUTORIZADO:');
console.log(JSON.stringify(responseError, null, 2));

console.log('\n🎨 COMPORTAMIENTO ESPERADO EN FRONTEND:');
console.log('- Caso 1 & 2: Pantalla VERDE/NARANJA normal con "ENTRADA" o "SALIDA"');
console.log('- Caso 3: Pantalla AMARILLA con "LABORATORIO CERRADO" y "Tocar Timbre"');
console.log('- Caso 4: Pantalla ROJA con "ERROR" y mensaje de error');

console.log('\n🧪 PARA PROBAR EN DESARROLLO:');
console.log('1. Asegurar que backend esté corriendo: npm run dev (en carpeta backend)');
console.log('2. Asegurar que frontend esté corriendo: npm run dev (en carpeta frontend)');
console.log('3. Crear usuarios de prueba en base de datos');
console.log('4. Registrar entrada de ayudante para probar caso 2');
console.log('5. Asegurar que no hay ayudantes registrados para probar caso 3');
console.log('6. Usar QR de usuario no autorizado para probar caso 4');

module.exports = {
  responseAyudanteEntrada,
  responseEstudianteConAyudantes,
  responseEstudianteSinAyudantes,
  responseError
};