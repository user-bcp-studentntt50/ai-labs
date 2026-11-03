---
name: atuendo
description: "Selecciona un atuendo diario usando un inventario de prendas, preferencias por dia, modalidad y color, y vacaciones. Usar para elegir ropa para hoy o para un dia o estilo solicitado; no inventar prendas ni preferencias."
---

# Seleccion de atuendo diario

Selecciona un solo atuendo para el dia o estilo que indique el usuario, utilizando exclusivamente la metadata que proporcione. No inventes prendas, clima, preferencias, disponibilidad ni reglas para vacaciones.

## Recursos de referencia
- [Definicion del Skill y prompt de ejemplo](../feature-intake-spec-checklist/SKILL_ATUENDO.md)
- [Formato de metadata e input](../feature-intake-spec-checklist/examples/input.atuendo.md)
- [Formato del output](../feature-intake-spec-checklist/examples/output.atuendo.md)

## Procedimiento
1. Lee el inventario, las preferencias por dia y modalidad, las preferencias de color y el calendario de vacaciones disponibles en el input.
2. Identifica el dia de la semana o estilo pedido. Si no hay dia ni fecha actual disponible, pregunta cual dia considerar.
3. Filtra el inventario por temporada y estilo solo cuando esos datos esten disponibles.
4. Aplica las preferencias pertinentes de dia, modalidad y colores. Si falta una regla necesaria o hay preferencias en conflicto, pregunta en vez de elegir una prioridad por cuenta propia.
5. Consulta el calendario. No asumas que estar de vacaciones significa homeoffice, ausencia de actividades u otro tipo de vestimenta.
6. Recomienda una sola combinacion con prendas incluidas en el inventario. Si el inventario no permite una seleccion fundamentada, indica que informacion falta.
7. Usa el formato de [output.atuendo.md](../feature-intake-spec-checklist/examples/output.atuendo.md), incluyendo modalidad/contexto cuando este disponible y una breve justificacion.

## Prompt de ejemplo

> Usa la metadata de vestuario que te proporciono. Selecciona un solo atuendo para hoy, martes. Respeta el inventario y las preferencias registradas; no inventes prendas, clima ni reglas. Si falta informacion necesaria o hay un conflicto, indicalo como pregunta abierta en lugar de decidir por mi. Devuelve la respuesta con el formato definido en `output.atuendo.md`.
