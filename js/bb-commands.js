// ============================================================
// bb-commands.js — Comandos del modo Bug Bounty
// Recon, scan, test, exploit, report para cazar vulnerabilidades
// ============================================================

import { BB_CASOS, numCasoBB } from "./bb-casos.js";

// Comandos disponibles en modo bug bounty
export function crearComandosBB({ engine, term, ui }) {
  return {
    // --- Reconocimiento ---
    recon: (args) => {
      const target = args.trim();
      if (!target) {
        term.printErr("Uso: recon <target>");
        term.printInfo("Ejemplo: recon techcorp.com");
        return;
      }

      const caso = engine.caso;
      if (!caso || caso.tipo === undefined) {
        term.printErr("No estás en un caso de bug bounty.");
        return;
      }

      term.printSec(`Reconocimiento de ${target}...`);
      term.print("");

      // Simular reconocimiento
      term.print(`[+] Escaneando ${target}...`, "t-out-info");
      term.print("[+] Buscando subdominios...", "t-out-info");
      term.print("[+] Analizando headers HTTP...", "t-out-info");
      term.print("[+] Descubriendo endpoints...", "t-out-info");
      term.print("");

      // Mostrar endpoints encontrados
      if (caso.fs) {
        const endpoints = Object.keys(caso.fs).filter(k => k.startsWith("/target/"));
        term.print(`[+] Endpoints encontrados: ${endpoints.length}`, "t-out-success");
        endpoints.forEach(ep => {
          term.print(`    → ${ep}`, "t-out-dim");
        });
      }

      term.print("");
      term.print("[+] Reconocimiento completado. Usa 'scan <url>' para escanear.", "t-out-success");

      // Registrar acción
      engine.registrarAccion("recon", target);
    },

    // --- Escaneo ---
    scan: (args) => {
      const url = args.trim();
      if (!url) {
        term.printErr("Uso: scan <url>");
        term.printInfo("Ejemplo: scan https://techcorp.com");
        return;
      }

      const caso = engine.caso;
      if (!caso || caso.tipo === undefined) {
        term.printErr("No estás en un caso de bug bounty.");
        return;
      }

      term.printSec(`Escaneando ${url}...`);
      term.print("");

      term.print("[+] Escaneo de seguridad iniciado...", "t-out-info");
      term.print("[+] Verificando headers de seguridad...", "t-out-info");
      term.print("[+] Buscando vulnerabilidades conocidas...", "t-out-info");
      term.print("[+] Analizando configuración CORS...", "t-out-info");
      term.print("[+] Probando parámetros de entrada...", "t-out-info");
      term.print("");

      // Mostrar vulnerabilidades potenciales según el caso
      const vulns = detectarVulnerabilidades(caso);
      if (vulns.length > 0) {
        term.print(`[!] Vulnerabilidades potenciales detectadas: ${vulns.length}`, "t-out-warning");
        vulns.forEach(v => {
          term.print(`    ⚠ ${v.nombre} (${v.severidad})`, "t-out-warning");
          term.print(`      ${v.descripcion}`, "t-out-dim");
        });
      } else {
        term.print("[+] No se detectaron vulnerabilidades obvias.", "t-out-success");
      }

      term.print("");
      term.print("[+] Escaneo completado. Usa 'test <tipo> <param>' para verificar.", "t-out-success");

      engine.registrarAccion("scan", url);
    },

    // --- Prueba de vulnerabilidad ---
    test: (args) => {
      const parts = args.split(/\s+/);
      const tipo = parts[0];
      const param = parts.slice(1).join(" ");

      if (!tipo) {
        term.printErr("Uso: test <tipo> <param>");
        term.printInfo("Tipos disponibles: idor, xss, cors, redirect, ssrf, sqli");
        term.printInfo("Ejemplo: test idor /api/users/2/profile");
        return;
      }

      const caso = engine.caso;
      if (!caso || caso.tipo === undefined) {
        term.printErr("No estás en un caso de bug bounty.");
        return;
      }

      term.printSec(`Probando ${tipo.toUpperCase()}...`);
      term.print("");

      // Verificar si el tipo coincide con el caso
      if (caso.tipo !== tipo && !caso.tipo.includes(tipo)) {
        term.print(`[!] Este caso es de tipo: ${caso.tipo}`, "t-out-warning");
        term.print("[i] Intenta con el tipo correcto.", "t-out-dim");
        return;
      }

      // Simular prueba
      const resultado = simularPrueba(caso, tipo, param);
      term.print(resultado.mensaje, resultado.clase);
      term.print("");

      if (resultado.exito) {
        term.print("[+] ¡Vulnerabilidad confirmada!", "t-out-success");
        term.print("[+] Usa 'exploit <tipo>' para explotar.", "t-out-info");
        engine.registrarAccion("test", `${tipo} ${param}`);
      } else {
        term.print("[-] Prueba fallida. Intenta con otro payload.", "t-out-error");
      }
    },

    // --- Explotación ---
    exploit: (args) => {
      const tipo = args.trim();
      if (!tipo) {
        term.printErr("Uso: exploit <tipo>");
        term.printInfo("Tipos: idor, xss, cors, redirect, ssrf, sqli");
        return;
      }

      const caso = engine.caso;
      if (!caso || caso.tipo === undefined) {
        term.printErr("No estás en un caso de bug bounty.");
        return;
      }

      term.printSec(`Explotando ${tipo.toUpperCase()}...`);
      term.print("");

      // Simular explotación
      const resultado = simularExplotacion(caso, tipo);
      term.print(resultado.mensaje, resultado.clase);
      term.print("");

      if (resultado.exito) {
        term.print("[+] ¡Explotación exitosa!", "t-out-success");
        term.print("[+] Datos exfiltrados:", "t-out-info");
        resultado.datos.forEach(d => {
          term.print(`    ${d}`, "t-out-dim");
        });
        term.print("");
        term.print("[+] Usa 'report' para generar el reporte.", "t-out-info");
        engine.registrarAccion("exploit", tipo);
      } else {
        term.print("[-] Explotación fallida.", "t-out-error");
      }
    },

    // --- Generar reporte ---
    report: () => {
      const caso = engine.caso;
      if (!caso || !caso.informeEsperado) {
        term.printErr("No hay caso activo o no hay informe esperado.");
        return;
      }

      const info = caso.informeEsperado;
      term.printSec("Generando reporte de hallazgo...");
      term.print("");

      term.print("═══════════════════════════════════════════", "t-out-info");
      term.print("  REPORTE DE VULNERABILIDAD", "t-out-info");
      term.print("═══════════════════════════════════════════", "t-out-info");
      term.print("");
      term.print(`  Título: ${info.titulo}`, "t-out-hi");
      term.print(`  Tipo: ${info.tipo}`, "");
      term.print(`  Severidad: ${info.severidad}`, info.severidad === "CRITICA" ? "t-out-error" : "t-out-warning");
      term.print(`  Endpoint: ${info.endpoint}`, "");
      term.print("");
      term.print("  Impacto:", "t-out-info");
      term.print(`    ${info.impacto}`, "");
      term.print("");
      term.print("  Remediación:", "t-out-info");
      term.print(`    ${info.remediacion}`, "");
      term.print("");
      term.print("═══════════════════════════════════════════", "t-out-info");
      term.print("");

      // Calcular bounty
      const bounty = calcularBounty(caso, engine.acciones);
      term.print(`  💰 Bounty: $${bounty} USD`, "t-out-success");
      term.print("");
      term.print("[+] Reporte generado. ¡Buen trabajo!", "t-out-success");

      engine.registrarAccion("report", "generado");
      engine.completarCasoBB(caso.id, bounty);
    },

    // --- Ver scope ---
    scope: () => {
      const caso = engine.caso;
      if (!caso) {
        term.printErr("No hay caso activo.");
        return;
      }

      term.printSec("Scope del programa:");
      term.print("");
      term.print(`  Programa: ${caso.titulo}`, "t-out-hi");
      term.print(`  Severidad: ${caso.severidad}`, "");
      term.print(`  Bounty estimado: $${caso.bounty} USD`, "t-out-success");
      term.print("");
    },

    // --- Ver casos completados ---
    casos: () => {
      const completados = GAME.bbCasosCompletados || [];
      term.printSec("Casos de Bug Bounty:");
      term.print("");

      BB_CASOS.forEach((caso, i) => {
        const estado = completados.includes(caso.id) ? "✅" : "⬜";
        term.print(`  ${estado} ${i + 1}. ${caso.titulo}`, "");
        term.print(`     Tipo: ${caso.tipo} | Severidad: ${caso.severidad} | Bounty: $${caso.bounty}`, "t-out-dim");
      });

      term.print("");
      term.print(`  Completados: ${completados.length}/${BB_CASOS.length}`, "t-out-info");
    },
  };
}

// Funciones auxiliares
function detectarVulnerabilidades(caso) {
  const vulns = [];
  if (caso.tipo === "idor") {
    vulns.push({ nombre: "IDOR", severidad: "MEDIA", descripcion: "Endpoints sin validación de permisos" });
  } else if (caso.tipo === "xss") {
    vulns.push({ nombre: "XSS Reflejado", severidad: "ALTA", descripcion: "Input reflejado sin sanitizar" });
  } else if (caso.tipo === "cors") {
    vulns.push({ nombre: "CORS Misconfiguration", severidad: "MEDIA", descripcion: "Origin reflejado con credenciales" });
  } else if (caso.tipo === "open_redirect") {
    vulns.push({ nombre: "Open Redirect", severidad: "BAJA", descripcion: "Redirección a URLs externas" });
  } else if (caso.tipo === "ssrf") {
    vulns.push({ nombre: "SSRF", severidad: "ALTA", descripcion: "Acceso a servicios internos" });
  } else if (caso.tipo === "sqli") {
    vulns.push({ nombre: "SQL Injection", severidad: "CRITICA", descripcion: "Inyección SQL en login" });
  }
  return vulns;
}

function simularPrueba(caso, tipo, param) {
  const exito = caso.tipo === tipo || caso.tipo.includes(tipo);
  return {
    exito,
    mensaje: exito
      ? `[+] ${tipo.toUpperCase()} confirmado en ${param || caso.tipo}`
      : `[-] ${tipo.toUpperCase()} no detectado`,
    clase: exito ? "t-out-success" : "t-out-error",
  };
}

function simularExplotacion(caso, tipo) {
  const exito = caso.tipo === tipo || caso.tipo.includes(tipo);
  const datos = [];
  
  if (exito) {
    if (caso.tipo === "idor") {
      datos.push("ID: 2, Nombre: Carlos López, Email: carlos.lopez@techcorp.com");
      datos.push("ID: 3, Nombre: Ana Martínez, NSS: 52123456789");
    } else if (caso.tipo === "xss") {
      datos.push("Cookie de sesión: session=abc123def456");
      datos.push("UserID: 42, Role: admin");
    } else if (caso.tipo === "cors") {
      datos.push("API Key: tk_test_ficticio_abc123");
      datos.push("Email: laura@empresa.com, Plan: enterprise");
    } else if (caso.tipo === "ssrf") {
      datos.push("AWS Access Key: AKIAIOSFODNN7EXAMPLE");
      datos.push("Admin Panel: http://internal-admin/");
    } else if (caso.tipo === "sqli") {
      datos.push("Users table: admin@medirecord.es, doctor.lopez@medirecord.es");
      datos.push("Patient data: Antonio Ruiz (Diabetes, Hipertensión)");
    }
  }

  return {
    exito,
    mensaje: exito
      ? `[+] ${tipo.toUpperCase()} explotado exitosamente`
      : `[-] Explotación de ${tipo.toUpperCase()} fallida`,
    clase: exito ? "t-out-success" : "t-out-error",
    datos,
  };
}

function calcularBounty(caso, acciones) {
  let base = caso.bounty || 0;
  let bonus = 0;

  // Bonus por calidad del reporte
  if (acciones.includes("report")) bonus += 50;
  if (acciones.length >= 5) bonus += 100; // Cadena completa
  
  return base + bonus;
}
