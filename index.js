const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let labelIndex = 0;

// Credenciales centralizadas
const API_CONFIG = {
    bearer: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJKdWFuUDEiLCJpYXQiOjE3NDYzMDc3MDYsImV4cCI6MTc0NjM5NDEwNn0.FQCLyrxMkPwGht-BpNTTsEVBIm3KAmII6OloBxJgj-k",
    apiKey: "45b2a099-6bd1-46f6-ad4e-8b3ef9b6eed9"
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

        const response = await fetch('http://localhost:8082/personas', {
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

        let url;
        if (selectedEndpoint === "historial") {
            const personaSelect = document.getElementById("personaSelect");
            const personaId = personaSelect.value;

            if (!personaId) {
                throw new Error("Por favor seleccione una persona");
            }

            url = `http://localhost:8082/ubicacion/coordenadas/historial/${personaId}`;
        } else {
            url = "http://localhost:8082/ubicacion/coordenadas";
        }

        // 6. Obtener datos del servidor
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
            mensajeDiv.className = "mensaje-sistema";
            mensajeDiv.style.color = "blue";
            mensajeDiv.style.padding = "20px";
            mensajeDiv.style.textAlign = "center";
            mensajeDiv.style.backgroundColor = "#f8f9fa";
            mensajeDiv.style.border = "1px solid #dee2e6";
            mensajeDiv.style.borderRadius = "5px";
            mensajeDiv.style.margin = "10px";
            mensajeDiv.textContent = "No se encontró historial de coordenadas para esta persona";
            document.body.prepend(mensajeDiv);
            return;
        }

        // 7. Procesar cada coordenada
        coordenadas.forEach((coord, index) => {
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

            // 8. Añadir marcador con manejo correcto de eventos
            addAdvancedMarker({ lat, lng }, map, coord.marca || `Marcador ${index + 1}`);
        });

    } catch (error) {
        console.error("Error en initMap:", error);
        // Mostrar mensaje de error al usuario
        const errorDiv = document.createElement("div");
        errorDiv.className = "mensaje-sistema";
        errorDiv.style.color = "red";
        errorDiv.style.padding = "20px";
        errorDiv.style.textAlign = "center";
        errorDiv.textContent = `Error al cargar el mapa: ${error.message}`;
        document.body.prepend(errorDiv);
    }
}

function addAdvancedMarker(location, map, label) {
    try {
        // Crear elemento Pin con letra
        const pin = new google.maps.marker.PinElement({
            glyph: labels[labelIndex++ % labels.length],
            glyphColor: "white",
            background: "#Ff0000", // Color azul de Google
            borderColor: "#3367D6",
        });

        // Crear marcador avanzado
        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: location,
            map: map,
            content: pin.element,
            title: label,
        });

        // Manejo CORRECTO del evento click según la API v3
        marker.addListener("gmp-click", () => {
            console.log("Marcador clickeado:", label);
            // Aquí puedes añadir más interacciones como:
            const infoWindow = new google.maps.InfoWindow({
                content: `<strong>${label}</strong><br>Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`,
            });
            infoWindow.open(map, marker);
        });

        return marker;

    } catch (error) {
        console.error("Error al crear marcador:", error);
        return null;
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