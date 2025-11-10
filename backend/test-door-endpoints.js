#!/usr/bin/env node

/**
 * Script de prueba para los endpoints de control de puerta
 * Ejecutar con: node test-door-endpoints.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testEndpoint(method, url, data = null) {
  try {
    console.log(`\n🧪 Testing ${method.toUpperCase()} ${url}`);
    console.log('📤 Request data:', data ? JSON.stringify(data, null, 2) : 'None');
    
    const config = {
      method: method,
      url: `${BASE_URL}${url}`,
      timeout: 5000
    };
    
    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    
    console.log('✅ Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.log('❌ Error Status:', error.response?.status || 'Network Error');
    console.log('💥 Error Data:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de endpoints de control de puerta...\n');
  
  // Test 1: Verificar estado de ayudantes
  console.log('=' .repeat(50));
  console.log('TEST 1: Verificar estado de ayudantes');
  console.log('=' .repeat(50));
  await testEndpoint('GET', '/door/assistants-status');
  
  // Test 2: Intentar abrir puerta sin autorización
  console.log('\n' + '=' .repeat(50));
  console.log('TEST 2: Intentar abrir puerta SIN autorización');
  console.log('=' .repeat(50));
  await testEndpoint('POST', '/door/open', {
    userType: 'ESTUDIANTE',
    userName: 'Test User',
    authorized: false
  });
  
  // Test 3: Abrir puerta CON autorización (simulado)
  console.log('\n' + '=' .repeat(50));
  console.log('TEST 3: Abrir puerta CON autorización');
  console.log('=' .repeat(50));
  await testEndpoint('POST', '/door/open', {
    userType: 'AYUDANTE',
    userName: 'Test Assistant',
    authorized: true
  });
  
  // Test 4: Verificar y abrir - Ayudante
  console.log('\n' + '=' .repeat(50));
  console.log('TEST 4: Check-and-open para AYUDANTE');
  console.log('=' .repeat(50));
  await testEndpoint('POST', '/door/check-and-open', {
    userType: 'AYUDANTE',
    userName: 'Juan Pérez',
    userEmail: 'juan@uai.cl',
    actionType: 'Entrada'
  });
  
  // Test 5: Verificar y abrir - Estudiante
  console.log('\n' + '=' .repeat(50));
  console.log('TEST 5: Check-and-open para ESTUDIANTE');
  console.log('=' .repeat(50));
  await testEndpoint('POST', '/door/check-and-open', {
    userType: 'ESTUDIANTE', 
    userName: 'María González',
    userEmail: 'maria@uai.cl',
    actionType: 'Entrada'
  });
  
  // Test 6: Procesar QR de Ayudante (con integración completa)
  console.log('\n' + '=' .repeat(50));
  console.log('TEST 6: Procesamiento QR completo - AYUDANTE');
  console.log('=' .repeat(50));
  
  const qrDataAyudante = {
    name: "Test",
    surname: "Assistant", 
    email: "test.assistant@uai.cl",
    timestamp: Date.now(),
    tipoUsuario: "AYUDANTE"
  };
  
  await testEndpoint('POST', '/qr/process', {
    qrData: qrDataAyudante
  });
  
  // Test 7: Procesar QR de Estudiante (con integración completa)
  console.log('\n' + '=' .repeat(50));
  console.log('TEST 7: Procesamiento QR completo - ESTUDIANTE');
  console.log('=' .repeat(50));
  
  const qrDataEstudiante = {
    name: "Test",
    surname: "Student",
    email: "test.student@uai.cl", 
    timestamp: Date.now(),
    tipoUsuario: "ESTUDIANTE"
  };
  
  await testEndpoint('POST', '/qr/process', {
    qrData: qrDataEstudiante
  });
  
  console.log('\n🏁 Pruebas completadas!');
  console.log('\n📋 NOTAS IMPORTANTES:');
  console.log('- La puerta se abre ejecutando el script open_door.py');
  console.log('- Se requieren al menos 2 ayudantes presentes para que estudiantes puedan entrar');
  console.log('- Los usuarios de prueba deben existir en la base de datos');
  console.log('- Python3 y las dependencias del script deben estar instaladas');
  console.log('- Revisa los logs del backend para más detalles');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };