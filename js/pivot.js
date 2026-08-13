// ============================================================
// pivot.js — Ataque adaptativo de CYBERGRAD
// Si el analista NO contiene a tiempo el objetivo origen de un
// incidente (no aísla el host, no bloquea la IP/C2...), el
// atacante PIVOTA: se mueve a otro host/cuenta y el caso se
// complica — aparecen nuevos objetivos en el checklist (que
// ahora también se exigen para el informe), una alerta nueva
// y una penalización de puntos.
//
// Módulo puro y determinista: `prepararPivot` decide SIN efectos
// secundarios (recibe caso + hecho y devuelve qué aplicar), así
// es testeable en Node igual que los helpers de reto.js. El
// motor (engine.js) hace los efectos: añadir objetivos, alertar,
// penalizar y re-renderizar el checklist.
// ============================================================

// Clave de `hecho` que evita el pivote (p. ej. "aislar:host:HOST-104").
// Devuelve { aplicar, motivo, nuevas, alerta, detalle, penalizacion }.
export function prepararPivot(caso, hecho) {
  const p = caso && caso.pivot;
  if (!p) return { aplicar: false, motivo: "sin-pivot" };
  if (caso.pivoteado) return { aplicar: false, motivo: "ya-pivoteado" };
  const hechoSet = hecho instanceof Set ? hecho : new Set();
  if (p.siNo && hechoSet.has(p.siNo)) return { aplicar: false, motivo: "contenido-a-tiempo" };
  return {
    aplicar: true,
    nuevas: p.correctas || {},
    alerta: p.alerta,
    detalle: p.detalle || "",
    penalizacion: p.penalizacion || 30,
  };
}

// Valida la estructura de un pivot declarado en un caso: devuelve
// lista de errores (vacía si todo es coherente). La usa el test.
export function validarPivot(caso) {
  const p = caso && caso.pivot;
  const errs = [];
  if (!p) return errs;
  if (!(p.en > 0)) errs.push(`pivot.en debe ser > 0 (${p.en})`);
  if (p.en >= caso.sla) errs.push(`pivot.en (${p.en}) debe ser < SLA (${caso.sla})`);
  if (typeof p.siNo !== "string" || p.siNo.length === 0) errs.push("pivot.siNo debe ser la clave de hecho que evita el pivote");
  if (!p.correctas || typeof p.correctas !== "object") {
    errs.push("pivot.correctas debe listar los objetivos nuevos");
  } else {
    for (const [tipo, valores] of Object.entries(p.correctas)) {
      if (!Array.isArray(valores) || valores.length === 0) errs.push(`pivot.correctas.${tipo} debe ser un array no vacío`);
      // Los valores nuevos deben encajar con los formatos del caso (tipo:valor)
      for (const v of valores || []) {
        if (typeof v !== "string" || !v.includes(":")) errs.push(`pivot.correctas.${tipo}: '${v}' debe tener formato tipo:valor`);
      }
      // El tipo nuevo debe existir ya en el caso (no inventar categorías)
      if (caso.correctas && !(tipo in caso.correctas)) errs.push(`pivot.correctas.${tipo} no existe en el caso`);
    }
  }
  if (!p.alerta || !p.alerta.titulo || !p.alerta.detalle || !p.alerta.sev) {
    errs.push("pivot.alerta debe tener titulo, detalle y sev");
  }
  return errs;
}
