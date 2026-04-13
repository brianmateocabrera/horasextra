const inicio = document.getElementById("periodo-inicio");
const fin = document.getElementById("periodo-fin");
const tbody = document.querySelector("tbody.card-body");
const totalPeriodoEl = document.getElementById("total-periodo");
const horasContratoInput = document.getElementById("horas-contrato");
const horasExtraEl = document.getElementById("horas-extra");
const inputEmpleado = document.getElementById("nombre-empleado");

// Listeners principales
inicio.addEventListener("change", () => { guardarPeriodoEnLS(); generarFilas(); });
fin.addEventListener("change", () => { guardarPeriodoEnLS(); generarFilas(); });

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

document.addEventListener("DOMContentLoaded", () => {
    const data = obtenerDatosLS();
    inputEmpleado.value = data.empleado || "";
    horasContratoInput.value = data.horas_contrato || "";
    if (data.periodo?.inicio) inicio.value = data.periodo.inicio;
    if (data.periodo?.fin) fin.value = data.periodo.fin;
    if (inicio.value && fin.value) generarFilas();
});

// Persistencia
function obtenerDatosLS() {
    const datos = localStorage.getItem("registro-empleado");
    return datos ? JSON.parse(datos) : { empleado: "", horas_contrato: 0, registro: {}, periodo: {} };
}

function guardarDatosLS(data) {
    localStorage.setItem("registro-empleado", JSON.stringify(data));
}

function guardarPeriodoEnLS() {
    const data = obtenerDatosLS();
    data.periodo = { inicio: inicio.value, fin: fin.value };
    guardarDatosLS(data);
}

function actualizarRegistro(fecha, entrada, salida, notas) {
    const data = obtenerDatosLS();
    data.registro[fecha] = { entrada, salida, notas };
    guardarDatosLS(data);
}

// Lógica de Interfaz
function generarFilas() {
    const fechaInicio = new Date(inicio.value);
    const fechaFin = new Date(fin.value);
    const data = obtenerDatosLS();

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime()) || fechaFin < fechaInicio) {
        tbody.innerHTML = "";
        return;
    }

    tbody.innerHTML = "";

    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split("T")[0];
        const datosDia = data.registro[fechaStr] || { entrada: "", salida: "", notas: "" };
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td style="font-weight:700; color:#264395;">${fechaStr}</td>
            <td><input type="time" name="entrada" value="${datosDia.entrada}" /></td>
            <td><input type="time" name="salida" value="${datosDia.salida}" /></td>
            <td><span class="total-dia" style="font-weight:700;">00:00</span></td>
            <td><input type="text" name="notas" value="${datosDia.notas}" placeholder="..." style="text-align:left; width:90%;" /></td>
        `;

        const entrada = tr.querySelector('input[name="entrada"]');
        const salida = tr.querySelector('input[name="salida"]');
        const notas = tr.querySelector('input[name="notas"]');

        [entrada, salida].forEach(i => i.addEventListener("input", () => {
            actualizarRegistro(fechaStr, entrada.value, salida.value, notas.value);
            calcularDia(tr);
        }));

        notas.addEventListener("input", () => actualizarRegistro(fechaStr, entrada.value, salida.value, notas.value));
        
        tbody.appendChild(tr);
        calcularDia(tr);
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
    let t1 = h1 * 60 + m1, t2 = h2 * 60 + m2;

    if (t2 < t1) t2 += 1440;
    const diff = t2 - t1;
    totalSpan.textContent = `${Math.floor(diff / 60).toString().padStart(2, "0")}:${(diff % 60).toString().padStart(2, "0")}`;
    calcularTotales();
}

function calcularTotales() {
    let totalMinutos = 0;
    document.querySelectorAll(".total-dia").forEach(el => {
        const [h, m] = el.textContent.split(":").map(Number);
        totalMinutos += h * 60 + m;
    });

    totalPeriodoEl.textContent = `${Math.floor(totalMinutos / 60).toString().padStart(2, "0")}:${(totalMinutos % 60).toString().padStart(2, "0")}`;
    
    const contrato = parseInt(horasContratoInput.value, 10);
    if (!isNaN(contrato)) {
        const extraMin = Math.max(0, totalMinutos - (contrato * 60));
        horasExtraEl.textContent = `${Math.floor(extraMin / 60).toString().padStart(2, "0")}:${(extraMin % 60).toString().padStart(2, "0")}`;
    } else {
        horasExtraEl.textContent = "00:00";
    }
}