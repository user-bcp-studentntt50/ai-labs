# Revisión del reto de incidencias

## Pedidos y casos

- Se creó `incident-log-to-ticket` para consultar el log, las reglas y el contrato con el MCP; normalizar y redactar la evidencia; y separar la preparación del JSON del registro aprobado.
- Caso inicial: `caso-02`, cliente sin acceso a banca digital. El grupo `LOGIN-DEMO-201` contiene dos eventos `ERROR` únicos; la línea repetida con `event_id=evt-202` no aumentó el conteo. El HTTP 503 se atribuyó a la dependencia de identidad, sin inferir un problema de contraseña ni impacto general. El evento 401 de otra correlación se excluyó.
- El JSON del caso 2 se guardó en `docs/reto-incidencias/caso-02/incidencia.json`; los datos sensibles de los extractos están redactados.

## Registro y verificación

- El participante revisó el objeto exacto y aprobó explícitamente el registro.
- `registrar_incidencia`: `created: true`; ticket `INC-2051F626B07E`.
- `consultar_incidencia` confirmó el contenido del ticket.
- Se reenvió exactamente el mismo objeto: devolvió `INC-2051F626B07E` con `created: false`, sin crear otro ticket.

## Reutilización y pendientes

- El mismo procedimiento se aplicó a `caso-01` hasta preparar `docs/reto-incidencias/caso-01/incidencia.json`. Se contaron dos eventos únicos para `TRX-DEMO-101`; se excluyó la copia de `evt-102` y no se mezcló la operación completada de otra correlación. No se registró este segundo borrador.
- No se identificaron correcciones necesarias al Skill tras estos casos.
- Prueba sin `case_id`: se pidió al participante que indicara qué caso analizar y no se llamó al MCP antes de recibir respuesta. Respondió `caso-02`; no se volvió a obtener ni registrar, pues su borrador ya estaba preparado.
- No se registró token ni credencial de conexión en los entregables.
