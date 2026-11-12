import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en .env.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const app = express();
app.use(express.json());

const server = createServer(app);
const sockets = new WebSocketServer({ server, path: "/ws" });

function productoJson(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    precio: Number(row.precio),
    descripcion: row.descripcion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function emitir(mensaje) {
  const data = JSON.stringify(mensaje);
  for (const client of sockets.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

sockets.on("connection", async (socket) => {
  const productos = (await prisma.producto.findMany({ orderBy: { createdAt: "asc" } })).map(productoJson);
  socket.send(JSON.stringify({ evento: "conectado", productos }));
  console.log("Cliente WebSocket conectado. Registros actuales:", productos.length);
});

app.get("/api/productos", async (_req, res) => {
  const productos = (await prisma.producto.findMany({ orderBy: { createdAt: "asc" } })).map(productoJson);
  res.json(productos);
});

app.post("/api/productos", async (req, res) => {
  const nombre = typeof req.body?.nombre === "string" ? req.body.nombre.trim() : "";
  const precio = Number(req.body?.precio);
  const descripcion = typeof req.body?.descripcion === "string" ? req.body.descripcion.trim() : null;

  if (!nombre || Number.isNaN(precio) || precio < 0) {
    return res.status(400).json({ error: "nombre y precio son obligatorios. El precio no puede ser negativo." });
  }

  const creado = await prisma.producto.create({
    data: { nombre, precio, descripcion: descripcion || null },
  });
  const producto = productoJson(creado);
  emitir({ evento: "insertado", producto });
  return res.status(201).json(producto);
});

app.put("/api/productos/:id", async (req, res) => {
  const actual = await prisma.producto.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: "Producto no encontrado" });

  const data = {};
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "nombre")) {
    const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
    if (!nombre) return res.status(400).json({ error: "nombre no puede quedar vacío" });
    data.nombre = nombre;
  }
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "precio")) {
    const precio = Number(req.body.precio);
    if (Number.isNaN(precio) || precio < 0) return res.status(400).json({ error: "precio no es válido" });
    data.precio = precio;
  }
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "descripcion")) {
    data.descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() || null : null;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No hay campos para actualizar" });
  }

  const actualizado = productoJson(await prisma.producto.update({ where: { id: req.params.id }, data }));
  emitir({ evento: "actualizado", producto: actualizado });
  return res.json(actualizado);
});

app.delete("/api/productos/:id", async (req, res) => {
  const actual = await prisma.producto.findUnique({ where: { id: req.params.id } });
  if (!actual) return res.status(404).json({ error: "Producto no encontrado" });

  await prisma.producto.delete({ where: { id: req.params.id } });
  emitir({ evento: "eliminado", id: req.params.id });
  return res.json({ eliminado: true, id: req.params.id });
});

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});
app.use(vite.middlewares);

server.listen(PORT, () => {
  console.log(`App y API listas en http://localhost:${PORT}`);
});
