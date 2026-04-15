const inicio = document.getElementById("periodo-inicio");
const fin = document.getElementById("periodo-fin");
const tbody = document.querySelector("tbody.card-body");
const totalPeriodoEl = document.getElementById("total-periodo");
const horasContratoInput = document.getElementById("horas-contrato");
const horasExtraEl = document.getElementById("horas-extra");
const inputEmpleado = document.getElementById("nombre-empleado");
const inputPuesto = document.getElementById("puesto-empleado");

const obtenerDatosLS = () => JSON.parse(localStorage.getItem("registro-empleado")) || { empleado: "", puesto: "", horas_contrato: 0, registro: {}, periodo: {} };
const guardarDatosLS = (data) => localStorage.setItem("registro-empleado", JSON.stringify(data));

function ajustarMargenes() {
    const cardTop = document.getElementById("card-top");
    const cardBottom = document.getElementById("card-bottom");
    const cardMiddle = document.getElementById("card-middle");
    if (cardTop && cardBottom && cardMiddle) {
        const hTop = cardTop.offsetHeight;
        const hBot = cardBottom.offsetHeight;
        cardMiddle.style.marginTop = `${hTop}px`;
        cardMiddle.style.marginBottom = `${hBot}px`;
        cardMiddle.style.height = `calc(100vh - ${hTop + hBot}px)`;
    }
}

function autoAjustarZoom() {
    const contenedor = document.getElementById("card-middle");
    const html = document.documentElement;
    if (!contenedor) return;

    let escala = 100;
    html.style.fontSize = `${escala}%`;
    ajustarMargenes();

    // Bucle para achicar si hay scroll
    while (contenedor.scrollHeight > contenedor.clientHeight && escala > 40) {
        escala -= 2;
        html.style.fontSize = `${escala}%`;
        ajustarMargenes();
    }

    // Bucle para agrandar si sobra espacio
    while (contenedor.scrollHeight <= contenedor.clientHeight && escala < 150) {
        escala += 2;
        html.style.fontSize = `${escala}%`;
        ajustarMargenes();
        if (contenedor.scrollHeight > contenedor.clientHeight) {
            escala -= 2;
            html.style.fontSize = `${escala}%`;
            ajustarMargenes();
            break;
        }
    }
}

function generarFilas() {
    const fechaInicio = new Date(inicio.value);
    const fechaFin = new Date(fin.value);
    const data = obtenerDatosLS();
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime()) || fechaFin < fechaInicio) return;

    tbody.innerHTML = "";
    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split("T")[0];
        const datosDia = data.registro[fechaStr] || { entrada: "", salida: "", notas: "" };
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="col-fecha">${fechaStr}</td>
            <td><input type="time" name="entrada" value="${datosDia.entrada}" /></td>
            <td><input type="time" name="salida" value="${datosDia.salida}" /></td>
            <td><span class="total-dia">00:00</span></td>
            <td><input type="text" name="notas" value="${datosDia.notas}" placeholder="..." /></td>
        `;

        const ent = tr.querySelector('input[name="entrada"]'), sal = tr.querySelector('input[name="salida"]'), not = tr.querySelector('input[name="notas"]');
        [ent, sal].forEach(i => i.addEventListener("input", () => {
            actualizarRegistro(fechaStr, ent.value, sal.value, not.value);
            calcularDia(tr);
        }));
        not.addEventListener("input", () => actualizarRegistro(fechaStr, ent.value, sal.value, not.value));
        tbody.appendChild(tr);
        calcularDia(tr);
    }
    setTimeout(autoAjustarZoom, 100);
}

function calcularDia(tr) {
    const e = tr.querySelector('input[name="entrada"]').value, s = tr.querySelector('input[name="salida"]').value, span = tr.querySelector(".total-dia");
    if (!e || !s) { span.textContent = "00:00"; calcularTotales(); return; }
    const [h1, m1] = e.split(":").map(Number), [h2, m2] = s.split(":").map(Number);
    let t1 = h1 * 60 + m1, t2 = h2 * 60 + m2;
    if (t2 < t1) t2 += 1440;
    const diff = t2 - t1;
    span.textContent = `${Math.floor(diff/60).toString().padStart(2,"0")}:${(diff%60).toString().padStart(2,"0")}`;
    calcularTotales();
}

function calcularTotales() {
    let totalMin = 0;
    document.querySelectorAll(".total-dia").forEach(el => {
        const [h, m] = el.textContent.split(":").map(Number);
        totalMin += h * 60 + m;
    });
    totalPeriodoEl.textContent = `${Math.floor(totalMin/60).toString().padStart(2,"0")}:${(totalMin%60).toString().padStart(2,"0")}`;
    const contrato = parseInt(horasContratoInput.value, 10) || 0;
    const extraMin = Math.max(0, totalMin - (contrato * 60));
    horasExtraEl.textContent = `${Math.floor(extraMin/60).toString().padStart(2,"0")}:${(extraMin%60).toString().padStart(2,"0")}`;
}

function actualizarRegistro(f, e, s, n) {
    const data = obtenerDatosLS();
    data.registro[f] = { entrada: e, salida: s, notas: n };
    guardarDatosLS(data);
}

// Listeners
[inicio, fin].forEach(i => i.addEventListener("change", () => {
    const data = obtenerDatosLS();
    data.periodo = { inicio: inicio.value, fin: fin.value };
    guardarDatosLS(data);
    generarFilas();
}));

horasContratoInput.addEventListener("input", () => {
    const data = obtenerDatosLS();
    data.horas_contrato = parseInt(horasContratoInput.value, 10) || 0;
    guardarDatosLS(data);
    calcularTotales();
});

[inputEmpleado, inputPuesto].forEach(i => i.addEventListener("input", () => {
    const data = obtenerDatosLS();
    data.empleado = inputEmpleado.value;
    data.puesto = inputPuesto.value;
    guardarDatosLS(data);
}));

window.addEventListener("resize", autoAjustarZoom);

document.addEventListener("DOMContentLoaded", () => {
    const data = obtenerDatosLS();
    inputEmpleado.value = data.empleado || "";
    inputPuesto.value = data.puesto || "";
    horasContratoInput.value = data.horas_contrato || "";
    if (data.periodo?.inicio) inicio.value = data.periodo.inicio;
    if (data.periodo?.fin) fin.value = data.periodo.fin;
    ajustarMargenes();
    if (inicio.value && fin.value) generarFilas();
});