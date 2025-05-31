const inicio = document.getElementById("periodo-inicio");
const fin = document.getElementById("periodo-fin");
const tbody = document.querySelector("tbody.card-body");
const totalPeriodoEl = document.getElementById("total-periodo");
const horasContratoInput = document.getElementById("horas-contrato");
const horasExtraEl = document.getElementById("horas-extra");

inicio.addEventListener("change", generarFilas);
fin.addEventListener("change", generarFilas);
horasContratoInput.addEventListener("input", calcularTotales);

function generarFilas() {
    const fechaInicio = new Date(inicio.value);
    const fechaFin = new Date(fin.value);

    if (
        isNaN(fechaInicio.getTime()) ||
        isNaN(fechaFin.getTime()) ||
        fechaFin < fechaInicio
    ) {
        tbody.innerHTML = "";
        return;
    }

    tbody.innerHTML = ""; // Limpiar filas anteriores

    for (
        let d = new Date(fechaInicio);
        d <= fechaFin;
        d.setDate(d.getDate() + 1)
    ) {
        const fechaStr = d.toISOString().split("T")[0];

        const tr = document.createElement("tr");
        tr.innerHTML = `
                <td>${fechaStr}</td>
                <td><input type="time" name="entrada" /></td>
                <td><input type="time" name="salida" /></td>
                <td><span class="total-dia">00:00</span></td>
                <td><input type="text" name="notas" /></td>
            `;

        // Añadir eventos para recálculo
        const entrada = tr.querySelector('input[name="entrada"]');
        const salida = tr.querySelector('input[name="salida"]');
        entrada.addEventListener("input", () => calcularDia(tr));
        salida.addEventListener("input", () => calcularDia(tr));

        tbody.appendChild(tr);
    }

    calcularTotales(); // Inicializar totales
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

    // Soporte para turno nocturno
    if (t2 < t1) {
        t2 += 24 * 60;
    }

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

    // Calcular horas extra
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
