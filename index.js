const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let labelIndex = 0;

async function initMap() {
    try {
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

        // 4. Configuración de la API
        const bearer = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJKdWFuUDEiLCJpYXQiOjE3NDU0NjQ5NjEsImV4cCI6MTc0NTU1MTM2MX0.6n7af4Tfs9zUaPNCVDUt-7pr-W2n4jOdoo_XuzpShuo";
        const apiKey = "45b2a099-6bd1-46f6-ad4e-8b3ef9b6eed9";

        // 5. Obtener datos del servidor
        const response = await fetch("http://localhost:8082/ubicacion/coordenadas", {
            method: "GET",
            headers: {
                "Authorization": bearer,
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            mode: "cors",
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const coordenadas = await response.json();
        console.log("Datos recibidos:", coordenadas);

        // 6. Procesar cada coordenada
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

            // 7. Añadir marcador con manejo correcto de eventos
            addAdvancedMarker({ lat, lng }, map, coord.marca || `Marcador ${index + 1}`);
        });

    } catch (error) {
        console.error("Error en initMap:", error);
        // Mostrar mensaje de error al usuario
        const errorDiv = document.createElement("div");
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

// Asegurar que la función esté disponible globalmente
window.initMap = initMap;