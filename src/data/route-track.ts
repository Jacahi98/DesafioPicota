import { Waves, TreePine, Mountain, Trees } from "lucide-react";

// Trazado real de la ruta de referencia (Wikiloc: DESAFIO PICOTA, Ana y
// Charlos, https://www.wikiloc.com/hiking-trails/desafio-picota-278233000).
// Cada punto: [longitud, latitud, altitud en m, distancia acumulada en m].
// Re-muestreado de 4063 puntos GPS originales a 110, forzando el punto
// exacto del pico (La Picota, 233 m) en el hueco de la rejilla más cercano
// a su distancia real — si no, el remuestreo por distancia podía saltárselo
// y el perfil se quedaba unos metros corto de la cota máxima real.
export const routeTrack: [number, number, number, number][] = [
  [-3.9282, 43.4609, 68, 0],
  [-3.9282, 43.4612, 67, 120],
  [-3.9292, 43.4621, 62, 240],
  [-3.9297, 43.4628, 56, 359],
  [-3.9311, 43.4639, 49, 479],
  [-3.9335, 43.465, 44, 599],
  [-3.9335, 43.465, 44, 719],
  [-3.9345, 43.4656, 39, 838],
  [-3.9357, 43.4658, 30, 958],
  [-3.937, 43.4665, 36, 1078],
  [-3.9386, 43.467, 31, 1198],
  [-3.9394, 43.4675, 26, 1317],
  [-3.9403, 43.4684, 34, 1437],
  [-3.9414, 43.469, 37, 1557],
  [-3.9429, 43.4689, 39, 1677],
  [-3.944, 43.4689, 30, 1797],
  [-3.9447, 43.4681, 46, 1916],
  [-3.9456, 43.4673, 54, 2036],
  [-3.9463, 43.4664, 40, 2156],
  [-3.9468, 43.4654, 30, 2276],
  [-3.9476, 43.4644, 25, 2395],
  [-3.9487, 43.464, 15, 2515],
  [-3.9498, 43.4632, 18, 2635],
  [-3.9501, 43.4623, 11, 2755],
  [-3.9508, 43.4616, 21, 2874],
  [-3.9518, 43.4609, 22, 2994],
  [-3.9524, 43.4601, 22, 3114],
  [-3.9533, 43.4595, 21, 3234],
  [-3.954, 43.4587, 21, 3354],
  [-3.9542, 43.4577, 11, 3473],
  [-3.9549, 43.4575, 15, 3593],
  [-3.9558, 43.4567, 15, 3713],
  [-3.9565, 43.4559, 15, 3833],
  [-3.9572, 43.455, 23, 3952],
  [-3.958, 43.4541, 26, 4072],
  [-3.9582, 43.4531, 30, 4192],
  [-3.9589, 43.4523, 30, 4312],
  [-3.9576, 43.4521, 38, 4431],
  [-3.9564, 43.4521, 41, 4551],
  [-3.9555, 43.4529, 42, 4671],
  [-3.9546, 43.4536, 42, 4791],
  [-3.9533, 43.4533, 42, 4910],
  [-3.9519, 43.4529, 46, 5030],
  [-3.9508, 43.4536, 43, 5150],
  [-3.9496, 43.4539, 44, 5270],
  [-3.9483, 43.4538, 43, 5390],
  [-3.9474, 43.4529, 46, 5509],
  [-3.9471, 43.4519, 55, 5629],
  [-3.947, 43.4509, 64, 5749],
  [-3.9476, 43.4498, 70, 5869],
  [-3.9483, 43.4491, 73, 5988],
  [-3.9476, 43.4486, 77, 6108],
  [-3.9466, 43.4481, 86, 6228],
  [-3.946, 43.4492, 80, 6348],
  [-3.9452, 43.4499, 79, 6467],
  [-3.9456, 43.4509, 73, 6587],
  [-3.9457, 43.4519, 65, 6707],
  [-3.9448, 43.4527, 65, 6827],
  [-3.9438, 43.4535, 70, 6947],
  [-3.9423, 43.4539, 73, 7066],
  [-3.9411, 43.4539, 79, 7186],
  [-3.9399, 43.4536, 84, 7306],
  [-3.9386, 43.4543, 86, 7426],
  [-3.9379, 43.454, 91, 7545],
  [-3.9393, 43.4537, 91, 7665],
  [-3.9405, 43.4531, 91, 7785],
  [-3.9416, 43.4524, 102, 7905],
  [-3.9417, 43.4514, 120, 8024],
  [-3.942, 43.4503, 133, 8144],
  [-3.9426, 43.4494, 141, 8264],
  [-3.9433, 43.4484, 149, 8384],
  [-3.9435, 43.4474, 168, 8504],
  [-3.9434, 43.4463, 183, 8623],
  [-3.9431, 43.4454, 188, 8743],
  [-3.9436, 43.4444, 191, 8863],
  [-3.9436, 43.4436, 196, 8983],
  [-3.9439, 43.4427, 179, 9102],
  [-3.9447, 43.442, 197, 9222],
  [-3.9454, 43.441, 224, 9342],
  [-3.9447, 43.4402, 228, 9462],
  [-3.9445, 43.44, 233, 9581],
  [-3.9435, 43.4403, 209, 9701],
  [-3.9423, 43.4403, 194, 9821],
  [-3.9418, 43.4409, 177, 9941],
  [-3.9417, 43.4419, 154, 10061],
  [-3.9421, 43.4428, 153, 10180],
  [-3.9423, 43.4438, 161, 10300],
  [-3.9419, 43.4448, 168, 10420],
  [-3.9418, 43.4458, 185, 10540],
  [-3.9421, 43.4465, 203, 10659],
  [-3.9415, 43.4469, 220, 10779],
  [-3.9417, 43.4478, 228, 10899],
  [-3.9411, 43.4487, 219, 11019],
  [-3.9404, 43.4497, 219, 11138],
  [-3.9398, 43.4506, 216, 11258],
  [-3.9389, 43.4515, 203, 11378],
  [-3.9378, 43.452, 181, 11498],
  [-3.9364, 43.4522, 169, 11618],
  [-3.9351, 43.4527, 151, 11737],
  [-3.9345, 43.4536, 156, 11857],
  [-3.9335, 43.4543, 156, 11977],
  [-3.9325, 43.4551, 142, 12097],
  [-3.9314, 43.4558, 133, 12216],
  [-3.9321, 43.4565, 93, 12336],
  [-3.9322, 43.4571, 83, 12456],
  [-3.9313, 43.4579, 79, 12576],
  [-3.9302, 43.4586, 76, 12695],
  [-3.9292, 43.4593, 74, 12815],
  [-3.9284, 43.4602, 72, 12935],
  [-3.9282, 43.4609, 68, 13055],
];

export const routeStats = {
  distanceM: 13055,
  // gainM/lossM: NO es la suma bruta de subidas/bajadas punto a punto del
  // GPX (eso da ~523 m con suavizado moderado, más si no se suaviza nada) —
  // es la cifra que la propia ficha de Wikiloc muestra para esta ruta
  // ("Elevation+ 372 m"), que usa su propio algoritmo de corrección de
  // ruido. Se prioriza coincidir con el dato "oficial" publicado antes que
  // con un cálculo casero que sistemáticamente da más alto (visto también
  // en Andarines: ~311 m calculado vs 252 m publicado).
  gainM: 372,
  lossM: 372,
  minEle: 6,
  maxEle: 233,
};

// Trazado de la modalidad Andarines (Wikiloc: DESAFIO PICOTA ANDARINES, Ana
// y Charlos, https://www.wikiloc.com/hiking-trails/desafio-picota-andarines-278246304).
// Mismo formato que routeTrack. Re-muestreado de 504 puntos GPS originales
// a 60, con el mismo forzado del pico exacto que routeTrack.
export const andarinesTrack: [number, number, number, number][] = [
  [-3.9281, 43.4609, 68, 0],
  [-3.9285, 43.4603, 71, 120],
  [-3.93, 43.4599, 66, 239],
  [-3.9318, 43.4597, 60, 359],
  [-3.9331, 43.4594, 60, 478],
  [-3.9341, 43.459, 57, 598],
  [-3.9352, 43.4582, 58, 718],
  [-3.9366, 43.458, 65, 837],
  [-3.9376, 43.4574, 68, 957],
  [-3.9383, 43.4568, 69, 1076],
  [-3.9374, 43.4559, 76, 1196],
  [-3.9367, 43.4548, 83, 1315],
  [-3.9374, 43.4542, 90, 1435],
  [-3.939, 43.4538, 90, 1555],
  [-3.9398, 43.4534, 90, 1674],
  [-3.9414, 43.4525, 102, 1794],
  [-3.9417, 43.4516, 117, 1913],
  [-3.9417, 43.4508, 132, 2033],
  [-3.9423, 43.4499, 142, 2153],
  [-3.9428, 43.449, 145, 2272],
  [-3.9434, 43.448, 159, 2392],
  [-3.9435, 43.447, 174, 2511],
  [-3.9428, 43.4462, 190, 2631],
  [-3.9433, 43.4452, 186, 2750],
  [-3.9439, 43.4442, 200, 2870],
  [-3.9434, 43.4435, 191, 2990],
  [-3.944, 43.4426, 181, 3109],
  [-3.9449, 43.4416, 208, 3229],
  [-3.9451, 43.4408, 231, 3348],
  [-3.9446, 43.44, 233, 3468],
  [-3.9444, 43.4404, 220, 3588],
  [-3.9429, 43.4405, 203, 3707],
  [-3.9418, 43.4403, 185, 3827],
  [-3.9419, 43.4414, 161, 3946],
  [-3.9418, 43.4424, 148, 4066],
  [-3.9424, 43.4433, 154, 4185],
  [-3.9422, 43.4443, 161, 4305],
  [-3.9422, 43.4452, 176, 4425],
  [-3.9421, 43.4462, 192, 4544],
  [-3.9416, 43.4465, 210, 4664],
  [-3.9419, 43.4472, 231, 4783],
  [-3.9414, 43.4482, 229, 4903],
  [-3.9408, 43.4493, 216, 5023],
  [-3.94, 43.4504, 216, 5142],
  [-3.9395, 43.4511, 216, 5262],
  [-3.9384, 43.4516, 193, 5381],
  [-3.9372, 43.4521, 177, 5501],
  [-3.9358, 43.4524, 159, 5621],
  [-3.9348, 43.453, 147, 5740],
  [-3.9343, 43.4539, 154, 5860],
  [-3.9333, 43.4545, 152, 5979],
  [-3.9323, 43.4552, 140, 6099],
  [-3.9314, 43.456, 130, 6218],
  [-3.9321, 43.4566, 91, 6338],
  [-3.9317, 43.4575, 81, 6458],
  [-3.9313, 43.458, 78, 6577],
  [-3.9299, 43.4588, 74, 6697],
  [-3.9292, 43.4593, 74, 6816],
  [-3.9284, 43.4602, 72, 6936],
  [-3.9282, 43.4609, 68, 7056],
];

export const andarinesStats = {
  distanceM: 7056,
  // Mismo criterio que routeStats.gainM: cifra "Elevation+" publicada por
  // Wikiloc para esta ruta, no la suma bruta calculada del GPX (~311 m).
  gainM: 252,
  lossM: 252,
  minEle: 54,
  // La cima es la MISMA que la de routeStats (La Picota) — se usa el mismo
  // valor (233) en las dos modalidades aunque las dos lecturas GPS
  // independientes dieran 232.7 y 235.1: no tiene sentido mostrar dos
  // "cotas máximas" distintas para el mismo punto físico. El punto del
  // trazado que marca la cima (más abajo) lleva la misma altitud, para que
  // el perfil no la dibuje por encima de este eje.
  maxEle: 233,
};

// Las cuatro paradas del recorrido — NO repartidas a partes iguales, sino
// en el km real donde empieza cada tramo (confirmado directamente): Costa
// Quebrada hasta el km 4, Pinares de Liencres hasta el 6.8, Monte Picota
// hasta el 10, Monte Tolío el resto. startFraction es ese km real dividido
// por la distancia total — RouteMap (WaypointCard) lo usa para decidir qué
// parada mostrar según drawProgress en vez de dividir el recorrido en
// tramos iguales. El timeline de abajo (WaypointItem) sigue reparted a
// partes iguales a propósito: mide progreso de LECTURA de la lista, no de
// avance real sobre el trazado, así que no debe usar estos mismos km.
export const waypoints = [
  {
    place: "Costa Quebrada",
    terrain: "Roca y oleaje",
    icon: Waves,
    text: "Estratos de roca retorcidos por el tiempo, tallados por el oleaje en calas, bufones y arcos de piedra. Los primeros kilómetros bordean el geoparque que da nombre a esta costa, con el Cantábrico cerca.",
    startFraction: 0,
  },
  {
    place: "Pinares de Liencres",
    terrain: "Bosque",
    icon: TreePine,
    text: "Pino marítimo y sombra durante casi tres kilómetros. El terreno se endurece y el camino empieza a subir en serio.",
    startFraction: 4000 / routeStats.distanceM,
  },
  {
    place: "Monte Picota",
    terrain: "Roca y viento",
    icon: Mountain,
    text: "233 metros sobre el mar, entre los restos de una torre defensiva y de un búnker de la Guerra Civil. La ría de Mogro se abre en herradura justo debajo.",
    startFraction: 6800 / routeStats.distanceM,
  },
  {
    place: "Monte Tolío",
    terrain: "Prado y bosque",
    icon: Trees,
    text: "Un segundo alto, más bajo que Picota, entre prados y bosque, con el curso de la ría cerca. El descenso final vuelve hacia el interior hasta terminar el recorrido.",
    startFraction: 10000 / routeStats.distanceM,
  },
];
