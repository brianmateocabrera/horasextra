document.addEventListener("DOMContentLoaded", async () => {
    const db = new Dexie("MisHorasExtra");

    db.version(1).stores({
        registros: "&fecha, entrada, salida, observacion, periodo",
        configuracion: "&clave, valor"
    });

    const hoy = new Date();
    let inicio, fin;
    if (hoy.getDate() >= 21) {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 21);
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 20);
    } else {
        inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 21);
        fin = new Date(hoy.getFullYear(), hoy.getMonth(), 20);
    }

    const periodoClave = `${inicio.toISOString().slice(0, 10)}_${fin.toISOString().slice(0, 10)}`;
    document.getElementById("periodoTexto").textContent = `Periodo: ${inicio.toLocaleDateString()} al ${fin.toLocaleDateString()}`;

    let horasContrato = 160;
    const config = await db.configuracion.get("horasContrato");
    if (config) {
        horasContrato = parseInt(config.valor) || 160;
    } else {
        await db.configuracion.put({ clave: "horasContrato", valor: 160 });
    }

    const horasContratoInput = document.getElementById("horasContratoInput");
    horasContratoInput.value = horasContrato;
    horasContratoInput.addEventListener("change", async () => {
        const nuevoValor = parseInt(horasContratoInput.value);
        if (!isNaN(nuevoValor)) {
            await db.configuracion.put({ clave: "horasContrato", valor: nuevoValor });
            horasContrato = nuevoValor;
            calcularTotalesPeriodo();
        }
    });

    await cargarPeriodo(periodoClave);

    // Mostrar lista de periodos anteriores
    const contenedorPeriodos = document.getElementById("listaPeriodos");
    const periodosUnicos = await db.registros.orderBy("periodo").uniqueKeys();

    contenedorPeriodos.innerHTML = "";
    for (const clave of periodosUnicos.reverse()) {
        const btn = document.createElement("button");
        btn.className = "btn btn-outline-secondary w-100 mb-1";
        btn.textContent = clave.replace(/_/g, " al ");
        btn.addEventListener("click", async () => {
            await cargarPeriodo(clave);
            const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("buscador"));
            offcanvas.hide();
        });
        contenedorPeriodos.appendChild(btn);
    }

    document.getElementById("anioActual").textContent = new Date().getFullYear();

    async function cargarPeriodo(clave) {
        let registros = await db.registros.where("periodo").equals(clave).toArray();

        if (registros.length === 0 && clave === periodoClave) {
            const nuevos = [];
            const fecha = new Date(inicio);
            while (fecha <= fin) {
                nuevos.push({
                    fecha: fecha.toISOString().slice(0, 10),
                    entrada: "",
                    salida: "",
                    observacion: "",
                    periodo: clave
                });
                fecha.setDate(fecha.getDate() + 1);
            }
            await db.registros.bulkAdd(nuevos);
            registros = nuevos;
        }

        registros.sort((a, b) => a.fecha.localeCompare(b.fecha));
        const tbody = document.getElementById("cuerpoTabla");
        tbody.innerHTML = "";
        const hoyISO = new Date().toISOString().slice(0, 10);

        for (const item of registros) {
            const fechaObj = new Date(item.fecha);
            const esHoy = item.fecha === hoyISO;
            const diaSemana = fechaObj.toLocaleDateString("es-AR", { weekday: "short" });

            const tr = document.createElement("tr");
            if (esHoy) tr.classList.add("today");

            tr.innerHTML = `
                <td>${fechaObj.getDate().toString().padStart(2, "0")}/${(fechaObj.getMonth() + 1).toString().padStart(2, "0")}</td>
                <td>${diaSemana}</td>
                <td><input type="time" class="form-control form-control-sm entrada" style="width: 100px;" value="${item.entrada}"></td>
                <td><input type="time" class="form-control form-control-sm salida" style="width: 100px;" value="${item.salida}"></td>
                <td class="total-horas">00:00</td>
                <td><input type="text" class="form-control form-control-sm observacion" value="${item.observacion}"></td>
            `;

            const [entrada, salida, total, observacion] = tr.querySelectorAll("input, .total-horas");

            entrada.addEventListener("change", async () => {
                await db.registros.update(item.fecha, { entrada: entrada.value });
                calcularYActualizarTotal(tr, entrada.value, salida.value, total);
                calcularTotalesPeriodo();
            });

            salida.addEventListener("change", async () => {
                await db.registros.update(item.fecha, { salida: salida.value });
                calcularYActualizarTotal(tr, entrada.value, salida.value, total);
                calcularTotalesPeriodo();
            });

            observacion.addEventListener("change", async () => {
                await db.registros.update(item.fecha, { observacion: observacion.value });
            });

            tbody.appendChild(tr);
            calcularYActualizarTotal(tr, item.entrada, item.salida, total);
        }

        $("#tablaHoras").DataTable().destroy();
        $("#tablaHoras").DataTable({
            scrollX: "400px",
            scrollY: "70vh",
            scrollCollapse: true,
            paging: false,
            searching: false,
            ordering: false,
            info: false
        });

        calcularTotalesPeriodo();
        document.getElementById("periodoTexto").textContent = `Periodo: ${clave.replace(/_/g, " al ")}`;
    }

    function calcularYActualizarTotal(row, entrada, salida, tdTotal) {
        if (!entrada || !salida) {
            tdTotal.textContent = "00:00";
            return;
        }

        const [hE, mE] = entrada.split(":").map(Number);
        const [hS, mS] = salida.split(":").map(Number);
        const inicioMin = hE * 60 + mE;
        const finMin = hS * 60 + mS;

        if (finMin > inicioMin) {
            const totalMin = finMin - inicioMin;
            const horas = Math.floor(totalMin / 60);
            const minutos = totalMin % 60;
            tdTotal.textContent = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
        } else {
            tdTotal.textContent = "00:00";
        }
    }

    function calcularTotalesPeriodo() {
        const filas = document.querySelectorAll("#cuerpoTabla tr");
        let totalMin = 0;

        filas.forEach(fila => {
            const td = fila.querySelector(".total-horas");
            const [h, m] = td.textContent.split(":").map(Number);
            totalMin += h * 60 + m;
        });

        const horas = Math.floor(totalMin / 60);
        const minutos = totalMin % 60;
        document.getElementById("hsTotales").textContent = `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;

        const contratoMin = horasContrato * 60;
        const extraMin = Math.max(totalMin - contratoMin, 0);
        const hExtra = Math.floor(extraMin / 60);
        const mExtra = extraMin % 60;
        document.getElementById("hsExtras").textContent = `${hExtra.toString().padStart(2, "0")}:${mExtra.toString().padStart(2, "0")}`;
    }
});