const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let labelIndex = 0;

// Credenciales centralizadas
const API_CONFIG = {
    bearer: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJNYW5vbG9HMTEiLCJpYXQiOjE3NDc2OTc4MDQsImV4cCI6MTc0Nzc4NDIwNH0.jVzsaWwz4OIs7XLODh5ppwO5jgJfU1-1vr0zAo48aro",
    apiKey: "ca2229e6-ccbb-4b7b-a261-51b55818e83e"
};

// Función para limpiar mensajes anteriores
function limpiarMensajes() {
    const mensajes = document.querySelectorAll('.mensaje-sistema');
    mensajes.forEach(mensaje => mensaje.remove());
}

// Función para cargar las personas
async function cargarPersonas() {
    try {
        const personaSelect = document.getElementById('personaSelect');

        const response = await fetch('http://localhost:8080/personas', {
            method: "GET",
            headers: {
                "Authorization": API_CONFIG.bearer,
                "X-API-KEY": API_CONFIG.apiKey,
                "Content-Type": "application/json",
            },
            mode: "cors",
        });

        if (response.ok) {
            const personas = await response.json();
            console.log("Personas recibidas:", personas); // Para depuración
            personaSelect.innerHTML = '<option value="">Seleccione una persona</option>';

            personas.forEach(persona => {
                const option = document.createElement('option');
                option.value = persona.id;

                // Armar el nombre completo (primer + segundo nombre)
                const nombres = [persona.pnombre].filter(Boolean).join(' ');
                const apellidos = [persona.papellido].filter(Boolean).join(' ');

                option.textContent = `ID: ${persona.id} - ${nombres} ${apellidos}`;
                personaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error al cargar personas:", error);
        const personaSelect = document.getElementById('personaSelect');
        personaSelect.innerHTML = '<option value="">Error al cargar personas</option>';
    }
}


// Función para inicializar el mapa
async function initMap() {
    try {
        // Limpiar mensajes anteriores
        limpiarMensajes();

        // 1. Verificar que el contenedor del mapa existe
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            throw new Error("No se encontró el elemento con ID 'map'");
        }

        // 2. Centro inicial del mapa
        const centro = { lat: 4.4279668, lng: -75.21346609999999 };

        // 3. Inicializar el mapa con un ID válido
        const map = new google.maps.Map(mapContainer, {
            zoom: 14,
            center: centro,
            mapId: "MAP_ID_123" // ID de mapa personalizado
        });

        // 5. Obtener el endpoint seleccionado
        const endpointSelect = document.getElementById("endpointSelect");
        const selectedEndpoint = endpointSelect.value;

        // 5. Configurar la leyenda del mapa
        setupMapLegend(map, selectedEndpoint);

        // 6. Obtener la URL del endpoint y los parámetros
        const { url, personaId } = getEndpointInfo(selectedEndpoint);

        // 7. Obtener datos del servidor
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": API_CONFIG.bearer,
                "X-API-KEY": API_CONFIG.apiKey,
                "Content-Type": "application/json",
            },
            mode: "cors",
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const coordenadas = await response.json();
        console.log("Datos recibidos:", coordenadas);

        // Verificar si hay coordenadas para mostrar
        if (coordenadas.length === 0) {
            const mensajeDiv = document.createElement("div");
            mensajeDiv.className = "mensaje-sistema mensaje-info";
            mensajeDiv.textContent = selectedEndpoint === "historial"
                ? "No se encontró historial de coordenadas para esta persona"
                : "No se encontraron coordenadas disponibles";
            document.body.prepend(mensajeDiv);
            return;
        }

        // 8. Procesar coordenadas e identificar ubicaciones recientes
        const { processedCoordenadas, ubicacionesRecientesIndices } = processAndIdentifyRecentLocations(coordenadas, selectedEndpoint);

        // 9. Añadir marcadores al mapa
        await addMarkersToMap(map, processedCoordenadas, ubicacionesRecientesIndices, selectedEndpoint);

        // 10. Ajustar los límites del mapa
        adjustMapBounds(map, processedCoordenadas, ubicacionesRecientesIndices, selectedEndpoint);

    } catch (error) {
        console.error("Error en initMap:", error);
        // Mostrar mensaje de error al usuario
        const errorDiv = document.createElement("div");
        errorDiv.className = "mensaje-sistema mensaje-error";
        errorDiv.textContent = `Error al cargar el mapa: ${error.message}`;
        document.body.prepend(errorDiv);
    }
}

function addAdvancedMarker(location, map, label, esReciente, coordData) {
    try {
        const pin = new google.maps.marker.PinElement({
            scale: 1.5,
            background: esReciente ? "#D32F2F" : "#555555", // Colores según la leyenda
            borderColor: "#ffffff",
            glyphColor: "#ffffff",
            glyph: "📍", // O cualquier ícono, texto o incluso puedes dejarlo vacío
        });

        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: location,
            map: map,
            content: pin.element,
            title: label,
        });

        if (!window.coordenadasRecientes) {
            window.coordenadasRecientes = [];
        }
        if (esReciente) {
            window.coordenadasRecientes.push(location);
        }
        // Usar la fecha del objeto coord original si existe, de lo contrario, intentar de coordData
    const fechaBruta = coordData.fechaRegistro || (coordData.coord && coordData.coord.fechaRegistro);
    const fechaFormateada = fechaBruta ? formatearFecha(fechaBruta) : null;

    // Construir el contenido del InfoWindow
    let infoContent = `
    <strong>${label}</strong><br>
    ${coordData.direccionMarcador || getDireccionFromCoordData(coordData.coord)}
    `;

    // Añadir la fecha solo si existe
    if (fechaFormateada) {
        infoContent += `<br><em>Fecha: ${fechaFormateada}</em>`;
    }

    const info = new google.maps.InfoWindow({
        content: infoContent
    });


        marker.addListener("gmp-click", () => {
            info.open(map, marker);
        });

    } catch (error) {
        console.error("Error al crear marcador:", error);
    }
}

// Función para extraer la dirección de los datos de coordenadas
function getDireccionFromCoordData(coordData) {
    if (!coordData) return '';

    // Prioridad de campos para dirección
    if (coordData.direccion) return coordData.direccion;
    if (coordData.ubicacion) return coordData.ubicacion;
    if (coordData.lugar) return coordData.lugar;
    if (coordData.descripcion) return coordData.descripcion;

    // Si la dirección está dentro de otro objeto
    if (coordData.datosAdicionales && coordData.datosAdicionales.direccion) {
        return coordData.datosAdicionales.direccion;
    }

    return '';
}

// Función para formatear fecha
function formatearFecha(fechaStr) {
    try {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return fechaStr; // Devolver el string original si hay error
    }
}

// Nueva función para obtener la URL del endpoint y los parámetros necesarios
function getEndpointInfo(selectedEndpoint) {
    let url;
    let personaId = null; // Declare personaId here

    if (selectedEndpoint === "historial") {
        const personaSelect = document.getElementById("personaSelect");
        personaId = personaSelect.value;

        if (!personaId) {
            throw new Error("Por favor seleccione una persona");
        }

        url = `http://localhost:8080/ubicacion/coordenadas/historial/${personaId}`;
    } else {
        url = "http://localhost:8080/ubicacion/coordenadas";
    }

    return { url, personaId };
}

// Nueva función para configurar la leyenda del mapa
function setupMapLegend(map, selectedEndpoint) {
    const leyendaDiv = document.createElement("div");
    leyendaDiv.className = "mapa-leyenda";

    if (selectedEndpoint === "historial") {
        leyendaDiv.innerHTML = `
            <div style="background-color: white; padding: 10px; border-radius: 5px; margin: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 12px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Leyenda:</div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="background-color: #D32F2F; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px;"></div>
                    <span>Ubicación actual</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="background-color: #555555; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px;"></div>
                    <span>Ubicaciones históricas</span>
                </div>
            </div>
        `;
    } else {
        leyendaDiv.innerHTML = `
            <div style="background-color: white; padding: 10px; border-radius: 5px; margin: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 12px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Leyenda:</div>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="background-color: #D32F2F; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px;"></div>
                    <span>Ubicación actual de cada persona</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <div style="background-color: #555555; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px;"></div>
                    <span>Ubicaciones anteriores</span>
                </div>
            </div>
        `;
    }

    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(leyendaDiv);
}

// Nueva función para procesar coordenadas e identificar ubicaciones recientes
function processAndIdentifyRecentLocations(coordenadas, selectedEndpoint) {
    let ubicacionesRecientesIndices = new Set();
    let processedCoordenadas = [...coordenadas]; // Trabajar con una copia si es necesario modificar el orden

    if (selectedEndpoint !== "historial") {
        // Primero, agrupar coordenadas por persona
        const coordenadasPorPersona = {};

        processedCoordenadas.forEach((coord, index) => {
            if (coord.persona && coord.persona.id) {
                if (!coordenadasPorPersona[coord.persona.id]) {
                    coordenadasPorPersona[coord.persona.id] = [];
                }
                coordenadasPorPersona[coord.persona.id].push({ ...coord, indiceOriginal: index });
            }
        });

        // Para cada persona, ordenar sus coordenadas por fecha y marcar la más reciente
        Object.values(coordenadasPorPersona).forEach(coordsPersona => {
            if (coordsPersona.length > 0) {
                // Ordenar coordenadas de esta persona por fecha
                coordsPersona.sort((a, b) => {
                    if (a.fechaRegistro && b.fechaRegistro) {
                        return new Date(b.fechaRegistro) - new Date(a.fechaRegistro);
                    }
                    if (a.timestamp && b.timestamp) {
                        return b.timestamp - a.timestamp;
                    }
                    if (a.id && b.id) {
                        return b.id - a.id;
                    }
                    return 0;
                });

                // Marcar la primera (más reciente) como ubicación actual usando su índice original
                ubicacionesRecientesIndices.add(coordsPersona[0].indiceOriginal);
            }
        });

        console.log("Ubicaciones recientes encontradas (indices):", [...ubicacionesRecientesIndices]);
    } else if (processedCoordenadas.length > 1) {
        // Para el historial, ordenar por fecha (la más reciente primero)
        processedCoordenadas.sort((a, b) => {
            if (a.fechaRegistro && b.fechaRegistro) {
                return new Date(b.fechaRegistro) - new Date(a.fechaRegistro);
            }
            if (a.timestamp && b.timestamp) {
                return b.timestamp - a.timestamp;
            }
            if (a.id && b.id) {
                return b.id - a.id;
            }
            return 0;
        });
        ubicacionesRecientesIndices.add(0); // La primera coordenada después de ordenar es la reciente
    }

    return { processedCoordenadas, ubicacionesRecientesIndices };
}

// Nueva función para añadir marcadores al mapa y centrar en la ubicación más reciente (si aplica)
async function addMarkersToMap(map, processedCoordenadas, ubicacionesRecientesIndices, selectedEndpoint) {
    // Función auxiliar para obtener dirección por lat/lng usando Google Maps Geocoder
    async function obtenerDireccionPorLatLng(lat, lng) {
        return new Promise((resolve) => {
            if (!window.geocoder) {
                window.geocoder = new google.maps.Geocoder();
            }
            window.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    resolve(results[0].formatted_address);
                } else {
                    resolve('Ubicación desconocida');
                }
            });
        });
    }

    const marcadoresPromesas = processedCoordenadas.map(async (coord, index) => {
        console.log(`Procesando coordenada ${index + 1}:`, coord);

        // Validar coordenadas
        if (coord.latitud === undefined || coord.longitud === undefined) {
            console.error(`Coordenada incompleta:`, coord);
            return;
        }

        const lat = Number(coord.latitud);
        const lng = Number(coord.longitud);

        if (isNaN(lat) || isNaN(lng)) {
            console.error(`Coordenadas inválidas:`, coord);
            return;
        }

        // Obtener nombre de la persona para la etiqueta
        let etiqueta = `Marcador ${index + 1}`;

        // Si hay información de persona, usarla para la etiqueta
        if (coord.persona) {
            const nombres = coord.persona.pnombre || '';
            const apellidos = coord.persona.papellido || '';
            if (nombres || apellidos) {
                etiqueta = `${nombres} ${apellidos}`.trim();
            }
        } else if (coord.marca) {
            etiqueta = coord.marca;
        }

        // Lógica para mostrar el marcador como "actual" en ambos modos
        // Para el historial, solo el primer elemento ordenado es reciente
        // Para el endpoint general, todas las ubicaciones recientes identificadas por processAndIdentifyRecentLocations
        let esReciente = selectedEndpoint !== "historial" || index === 0; // Es reciente si no es historial O si es historial y es el primer elemento

        // Si estamos en el endpoint general, obtener la dirección por reverse geocoding
        let direccionMarcador = '';
        if (selectedEndpoint !== "historial") {
            direccionMarcador = await obtenerDireccionPorLatLng(lat, lng);
        } else {
            direccionMarcador = getDireccionFromCoordData(coord);
        }

        // 8. Añadir marcador con manejo correcto de eventos, pasando la dirección obtenida
        addAdvancedMarker({ lat, lng }, map, etiqueta, esReciente, { ...coord, selectedEndpoint, direccionMarcador });

        // Centrar el mapa en la ubicación más reciente si está en modo historial
        if (esReciente && selectedEndpoint === "historial") {
            map.setCenter({ lat, lng });
            map.setZoom(15); // Zoom más cercano para la ubicación actual
        }
    });

    // Esperar a que todos los marcadores se hayan procesado
    await Promise.all(marcadoresPromesas);
}

// Nueva función para ajustar los límites del mapa
function adjustMapBounds(map, processedCoordenadas, ubicacionesRecientesIndices, selectedEndpoint) {
    const bounds = new google.maps.LatLngBounds();
    let ubicacionesParaAjustar = [];

    if (selectedEndpoint === "historial") {
        // En historial, ajustar a todas las coordenadas
        if (processedCoordenadas.length <= 1) {
            ubicacionesParaAjustar = processedCoordenadas.map(coord => ({ lat: Number(coord.latitud), lng: Number(coord.longitud) }));
        }
    } else {
        // En el endpoint general, ajustar solo a las ubicaciones recientes
        ubicacionesParaAjustar = processedCoordenadas
            .filter((_, index) => ubicacionesRecientesIndices.has(index))
            .map(coord => ({ lat: Number(coord.latitud), lng: Number(coord.longitud) }));
    }

    if (ubicacionesParaAjustar.length > 0) {
        ubicacionesParaAjustar.forEach(coord => {
            bounds.extend(coord);
        });

        // Solo ajustar límites si no estamos en modo historial con múltiples puntos
        if (selectedEndpoint !== "historial" || processedCoordenadas.length <= 1) {
            map.fitBounds(bounds);

            // Si solo hay un punto, hacer zoom apropiado (en cualquier modo si solo hay un punto relevante)
            if (ubicacionesParaAjustar.length === 1) {
                map.setZoom(15);
            }
        }
    }
}

// Inicializar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    const menuButton = document.getElementById('menuButton');
    const menuPanel = document.getElementById('menuPanel');
    const closeButton = document.getElementById('closeButton');
    const endpointSelect = document.getElementById('endpointSelect');

    menuButton.addEventListener('click', function () {
        menuPanel.classList.add('active');
    });

    closeButton.addEventListener('click', function () {
        menuPanel.classList.remove('active');
    });

    // Cargar personas cuando se selecciona el endpoint de historial
    endpointSelect.addEventListener('change', function () {
        const personaContainer = document.getElementById('personaIdContainer');
        personaContainer.style.display = this.value === 'historial' ? 'block' : 'none';

        if (this.value === 'historial') {
            cargarPersonas();
        }
    });
});

// Asegurar que las funciones estén disponibles globalmente
window.initMap = initMap;