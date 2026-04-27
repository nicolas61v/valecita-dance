# Arquitectura de Servidor y Sistema de Salas (GCP) 🚀

Para un juego de ritmo con hasta 5 jugadores, la latencia y la sincronización del "Reloj Maestro" son los factores más críticos.

## 1. Arquitectura Propuesta

### El Stack de Red
- **Backend:** Node.js + Socket.io.
- **Estado de Salas (Session Store):** Redis (GCP Memorystore).
- **Hosting:** Google Cloud Run (recomendado por escalabilidad) o Compute Engine (para control total de red).

### Por qué esta combinación:
1.  **Relay Only:** El servidor no procesa la lógica del juego (quién acertó la nota), solo reenvía eventos. Esto reduce la carga de CPU y la latencia.
2.  **Sincronización `startAt`:** El servidor genera un timestamp de GCP (reloj de alta precisión) y le dice a los 5 clientes: "Empiecen la canción exactamente en `T + 3000ms`". Los clientes usan su offset respecto al servidor para compensar el lag.

---

## 2. Sistema de Salas (Room System)

### Flujo de Datos:
1.  **Host:** Crea una sala -> El servidor genera un código de 6 letras (ej: `VALE69`) y lo guarda en Redis con un TTL (tiempo de vida) de 2 horas.
2.  **Clientes:** Se unen vía código -> El servidor verifica en Redis si la sala tiene < 5 jugadores.
3.  **Persistencia:** Usar **GCP Memorystore (Redis)** permite que, si tienes 10 instancias del servidor corriendo, todas sepan qué jugadores están en la sala `VALE69`.

---

## 3. Infraestructura en GCP

### Opción A: Google Cloud Run (Recomendada para escalabilidad)
Es "Serverless". Se escala a cero si nadie juega (ahorro de costos) y sube a miles de instancias si es necesario.
- **Configuración:**
  - **CPU:** 1 vCPU (mínimo), 2 vCPU (óptimo).
  - **Memoria:** 512MB - 1GB.
  - **Concurrencia:** Configurar a 80-100 conexiones por instancia.
  - **Sticky Sessions:** **Obligatorio** habilitar "Session Affinity" en Cloud Run para que Socket.io mantenga la conexión con la misma instancia.

### Opción B: Compute Engine (VM Dedicada - Máximo rendimiento)
Si buscas la latencia más baja posible sin capas intermedias.
- **Tipo de VM:** `c2-standard-4` (Instancias optimizadas para computación) o la serie `e2-medium` para pruebas.
- **Configuración de Red:**
  - Usar **Tier de Red Premium** de GCP.
  - Ubicación: Elige la región más cercana a tus usuarios (ej: `southamerica-east1` para Latam).
- **SO:** Debian 12 o Ubuntu 22.04 LTS.

---

## 4. Configuración para Baja Latencia

### Optimización de Socket.io (Server-side):
```javascript
const io = new Server(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket"], // Forzar WebSockets, evitar polling
  pingInterval: 2000,        // Pings frecuentes para detectar desconexiones rápido
  pingTimeout: 5000
});
```

### Sincronización de Tiempo (Clock Sync):
Para que el ritmo sea perfecto, los clientes deben sincronizar su reloj con el del servidor al conectarse:
1.  Cliente envía `sync_request` (timestamp local).
2.  Servidor responde con su `server_timestamp`.
3.  Cliente calcula: `Latencia = (Ahora - local_timestamp) / 2`.
4.  `Offset_Servidor = server_timestamp + Latencia - Ahora`.

## 5. Escalabilidad con Redis
Para que el sistema sea escalable a miles de jugadores, debes usar el **Socket.io Redis Adapter**. Esto permite que un mensaje emitido en el Servidor A llegue a un jugador conectado en el Servidor B.

```bash
# Comando para instalar el adaptador
npm install @socket.io/redis-adapter redis
```

---

## 6. Resumen de VM Recomendada (Compute Engine)

| Parámetro | Configuración |
| :--- | :--- |
| **Serie de Máquina** | `e2-standard-2` (Equilibrio costo/rendimiento) |
| **Región** | La más cercana a tu audiencia principal |
| **Red** | Habilitar "External IP" con Tier Premium |
| **Firewall** | Abrir puerto 80/443 (o el puerto de tu app) |
| **Estado** | Stateless (usa Memorystore para las salas) |
