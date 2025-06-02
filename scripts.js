const inicio = document.getElementById("periodo-inicio");
const fin = document.getElementById("periodo-fin");
const tbody = document.querySelector("tbody.card-body");
const totalPeriodoEl = document.getElementById("total-periodo");
const horasContratoInput = document.getElementById("horas-contrato");
const horasExtraEl = document.getElementById("horas-extra");
const inputEmpleado = document.getElementById("nombre-empleado");

inicio.addEventListener("change", () => {
    guardarPeriodoEnLS();
    generarFilas();
});

fin.addEventListener("change", () => {
    guardarPeriodoEnLS();
    generarFilas();
});

horasContratoInput.addEventListener("input", () => {
    const data = obtenerDatosLS();
    data.horas_contrato = parseInt(horasContratoInput.value, 10) || 0;
    guardarDatosLS(data);
    calcularTotales();
});

inputEmpleado.addEventListener("input", () => {
    const data = obtenerDatosLS();
    data.empleado = inputEmpleado.value;
    guardarDatosLS(data);
});

// Inicializar con datos almacenados
document.addEventListener("DOMContentLoaded", () => {
    const data = obtenerDatosLS();
    inputEmpleado.value = data.empleado || "";
    horasContratoInput.value = data.horas_contrato || "";

    // Restaurar período si existe
    if (data.periodo?.inicio) inicio.value = data.periodo.inicio;
    if (data.periodo?.fin) fin.value = data.periodo.fin;

    // Generar filas si ambas fechas están definidas
    if (inicio.value && fin.value) {
        generarFilas();
    }
});

function obtenerDatosLS() {
    const datos = localStorage.getItem("registro-empleado");
    return datos
        ? JSON.parse(datos)
        : { empleado: "", horas_contrato: 0, registro: {}, periodo: {} };
}

function guardarDatosLS(data) {
    localStorage.setItem("registro-empleado", JSON.stringify(data));
}

function guardarPeriodoEnLS() {
    const data = obtenerDatosLS();
    data.periodo = {
        inicio: inicio.value,
        fin: fin.value
    };
    guardarDatosLS(data);
}

function actualizarRegistro(fecha, entrada, salida, notas) {
    const data = obtenerDatosLS();
    data.registro[fecha] = { entrada, salida, notas };
    guardarDatosLS(data);
}

function generarFilas() {
    const fechaInicio = new Date(inicio.value);
    const fechaFin = new Date(fin.value);
    const data = obtenerDatosLS();

    if (
        isNaN(fechaInicio.getTime()) ||
        isNaN(fechaFin.getTime()) ||
        fechaFin < fechaInicio
    ) {
        tbody.innerHTML = "";
        return;
    }

    tbody.innerHTML = "";

    for (
        let d = new Date(fechaInicio);
        d <= fechaFin;
        d.setDate(d.getDate() + 1)
    ) {
        const fechaStr = d.toISOString().split("T")[0];
        const datosDia = data.registro[fechaStr] || {
            entrada: "",
            salida: "",
            notas: ""
        };

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fechaStr}</td>
            <td><input type="time" name="entrada" value="${datosDia.entrada}" /></td>
            <td><input type="time" name="salida" value="${datosDia.salida}" /></td>
            <td><span class="total-dia">00:00</span></td>
            <td><input type="text" name="notas" value="${datosDia.notas}" /></td>
        `;

        const entrada = tr.querySelector('input[name="entrada"]');
        const salida = tr.querySelector('input[name="salida"]');
        const notas = tr.querySelector('input[name="notas"]');

        entrada.addEventListener("input", () => {
            actualizarRegistro(
                fechaStr,
                entrada.value,
                salida.value,
                notas.value
            );
            calcularDia(tr);
        });

        salida.addEventListener("input", () => {
            actualizarRegistro(
                fechaStr,
                entrada.value,
                salida.value,
                notas.value
            );
            calcularDia(tr);
        });

        notas.addEventListener("input", () => {
            actualizarRegistro(
                fechaStr,
                entrada.value,
                salida.value,
                notas.value
            );
        });

        tbody.appendChild(tr);
        calcularDia(tr); // Recalcular en caso de datos existentes
    }

    calcularTotales();
}

function calcularDia(tr) {
    const entrada = tr.querySelector('input[name="entrada"]').value;
    const salida = tr.querySelector('input[name="salida"]').value;
    const totalSpan = tr.querySelector(".total-dia");

    if (!entrada || !salida) {
        totalSpan.textContent = "00:00";
        calcularTotales();
        return;
    }

    const [h1, m1] = entrada.split(":").map(Number);
    const [h2, m2] = salida.split(":").map(Number);

    let t1 = h1 * 60 + m1;
    let t2 = h2 * 60 + m2;

    if (t2 < t1) t2 += 24 * 60; // Turno nocturno

    const diffMin = t2 - t1;
    const horas = Math.floor(diffMin / 60)
        .toString()
        .padStart(2, "0");
    const minutos = (diffMin % 60).toString().padStart(2, "0");

    totalSpan.textContent = `${horas}:${minutos}`;
    calcularTotales();
}

function calcularTotales() {
    let totalMinutos = 0;
    document.querySelectorAll(".total-dia").forEach(el => {
        const [h, m] = el.textContent.split(":").map(Number);
        totalMinutos += h * 60 + m;
    });

    const horas = Math.floor(totalMinutos / 60)
        .toString()
        .padStart(2, "0");
    const minutos = (totalMinutos % 60).toString().padStart(2, "0");
    totalPeriodoEl.textContent = `${horas}:${minutos}`;

    const contrato = parseInt(horasContratoInput.value, 10);
    if (!isNaN(contrato)) {
        const contratoMin = contrato * 60;
        const extraMin = Math.max(0, totalMinutos - contratoMin);
        const extraH = Math.floor(extraMin / 60)
            .toString()
            .padStart(2, "0");
        const extraM = (extraMin % 60).toString().padStart(2, "0");
        horasExtraEl.textContent = `${extraH}:${extraM}`;
    } else {
        horasExtraEl.textContent = "00:00";
    }
}

function mostrarEstadoActual() {
    const data = obtenerDatosLS();
    console.log("Estado actual del JSON:", JSON.stringify(data, null, 2));
}
function descargarCSV() {
    const data = obtenerDatosLS();
    const filas = [];
    filas.push(["Fecha", "Entrada", "Salida", "Total", "Notas"]);

    for (const [fecha, { entrada, salida, notas }] of Object.entries(
        data.registro
    )) {
        // Calcular total diario
        let total = "00:00";
        if (entrada && salida) {
            const [h1, m1] = entrada.split(":").map(Number);
            const [h2, m2] = salida.split(":").map(Number);
            let t1 = h1 * 60 + m1;
            let t2 = h2 * 60 + m2;
            if (t2 < t1) t2 += 24 * 60;
            const diff = t2 - t1;
            const horas = String(Math.floor(diff / 60)).padStart(2, "0");
            const mins = String(diff % 60).padStart(2, "0");
            total = `${horas}:${mins}`;
        }

        filas.push([fecha, entrada, salida, total, notas || ""]);
    }

    // Generar contenido CSV
    const csv = filas
        .map(fila =>
            fila.map(campo => `"${campo.replace(/"/g, '""')}"`).join(";")
        )
        .join("\n");

    // Crear archivo y disparar descarga
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registro.csv";
    a.click();
    URL.revokeObjectURL(url);
}
function descargarJSON() {
    const data = obtenerDatosLS();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "registro-empleado.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function cargarJSONDesdeArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validación básica de estructura
            if (
                typeof data === "object" &&
                "empleado" in data &&
                "horas_contrato" in data &&
                "registro" in data
            ) {
                guardarDatosLS(data);

                // Recargar valores en UI
                inputEmpleado.value = data.empleado || "";
                horasContratoInput.value = data.horas_contrato || "";
                generarFilas(); // Para refrescar la tabla con el registro
                alert("Datos cargados correctamente desde el archivo.");
            } else {
                alert("El archivo JSON no tiene el formato esperado.");
            }
        } catch (err) {
            alert("Error al leer el archivo JSON.");
            console.error(err);
        }
    };

    reader.readAsText(file);
}
function capturarYDescargarImagen() {
    const area = document.body; // Podés cambiar esto por un div específico si querés limitar el área

    html2canvas(area, {
        scrollY: -window.scrollY, // Evita capturas parciales si hay scroll
        useCORS: true
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "registro_empleado.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}
document.getElementById("btn-opciones").addEventListener("click", () => {
    document.getElementById("modal-opciones").style.display = "block";
});

function cerrarModal() {
    document.getElementById("modal-opciones").style.display = "none";
}

window.addEventListener("click", e => {
    const modal = document.getElementById("modal-opciones");
    if (e.target === modal) {
        cerrarModal();
    }
});
