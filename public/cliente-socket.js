const estado = document.querySelector("#estado");
const filas = document.querySelector("#filas");
const productos = new Map();

function dinero(valor) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(valor);
}

function hora(iso) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));
}

function pintar(idResaltado) {
  if (productos.size === 0) {
    filas.innerHTML = '<tr><td colspan="4">Todavía no hay productos.</td></tr>';
    return;
  }

  filas.replaceChildren();
  for (const producto of productos.values()) {
    const tr = document.createElement("tr");
    if (producto.id === idResaltado) tr.className = "nuevo";
    for (const texto of [producto.nombre, dinero(producto.precio), producto.descripcion || "—", hora(producto.updatedAt)]) {
      const td = document.createElement("td");
      td.textContent = texto;
      tr.append(td);
    }
    filas.append(tr);
  }
}

function guardarLista(lista) {
  productos.clear();
  for (const producto of lista) productos.set(producto.id, producto);
  pintar();
}

const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`);

socket.addEventListener("open", () => {
  console.log("Socket conectado");
  estado.textContent = "Socket conectado";
  estado.classList.add("conectado");
});

socket.addEventListener("message", (event) => {
  const mensaje = JSON.parse(event.data);

  if (mensaje.evento === "conectado") {
    console.log("Registros actuales:", mensaje.productos);
    guardarLista(mensaje.productos);
  }

  if (mensaje.evento === "insertado") {
    console.log("Inserción recibida:", mensaje.producto);
    productos.set(mensaje.producto.id, mensaje.producto);
    pintar(mensaje.producto.id);
  }

  if (mensaje.evento === "actualizado") {
    console.log("Actualización recibida:", mensaje.producto);
    productos.set(mensaje.producto.id, mensaje.producto);
    pintar(mensaje.producto.id);
  }

  if (mensaje.evento === "eliminado") {
    console.log("Eliminación recibida:", mensaje.id);
    productos.delete(mensaje.id);
    pintar();
  }
});

socket.addEventListener("close", () => {
  console.log("Socket desconectado");
  estado.textContent = "Socket desconectado";
  estado.classList.remove("conectado");
});
