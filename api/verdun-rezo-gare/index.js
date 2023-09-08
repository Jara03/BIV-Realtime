const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require("fs");
const readline = require("readline");
const Long = require("long");
const axios = require("axios") ;
const path = require("path");
const csv = require("csv-parser");

module.exports = async function (context, req) {
    const GTFS_RT_PATH = './resources/poll.proto';


    try {
        // Effectue une requête pour obtenir le fichier GTFS-RT depuis Zenbus
        
        axios.get('https://zenbus.net/gtfs/rt/poll.proto?dataset=verdun-rezo', {
            responseType: 'stream'
        }).then(async response => {
            // Si le fichier GTFS-RT existe déjà, le supprime
            
           if (fs.existsSync(GTFS_RT_PATH)) {
                fs.unlink(GTFS_RT_PATH, (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
                }
            

            // Crée un flux d'écriture pour enregistrer le fichier GTFS-RT téléchargé
           // const writer = fs.createWriteStream(path.resolve(GTFS_RT_PATH));
            //response.data.pipe(writer);

            // Événement déclenché lorsque l'écriture est terminée
            
            writer.on('finish', async () => {
                let currentTime = new Date();
                console.log('File downloaded at ' + currentTime.getHours() + ":" + (currentTime.getMinutes() < 10 ? '0' : currentTime.getMinutes()));

                // Obtient les heures en temps réel (RT) et les heures théoriques
                const rt_hours = await getRtHours();
                const theoretical_hours = await getTheoreticalHours();

                // Filtre les heures pour ne garder que celles pertinentes
                const filteredHours = filterHours(rt_hours, theoretical_hours);

                // Supprime le fichier GTFS-RT téléchargé après utilisation
                fs.unlink(GTFS_RT_PATH, (err) => {
                    if (err) {
                        console.error(err);
                    }
                });

                // Renvoie les heures filtrées au client
                //res.json(filteredHours);

            });
            

            
    
    context.res.json({
        data: "Hello from the verdun-rezo"
    });

        }).catch(error => {
            console.error('Error downloading file:', error);
        });
    

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }

/**
 * Filtre et combine des données provenant de deux sources en fonction des identifiants de trajet (trip IDs).
 * @param {Array} data1 - Données de la première source.
 * @param {Array} data2 - Données de la deuxième source.
 * @returns {Array} - Données filtrées et combinées.
 */
function filterHours(data1, data2) {
    const filteredData = [];

    // Crée une carte pour suivre les ID de trajet et leurs objets correspondants
    const tripMap = new Map();

    // Traite les données de la première source
    for (const item of data1) {
        const { tr } = item;

        // Ajoute ou met à jour l'élément dans la carte
        tripMap.set(tr, item);
    }

    // Traite les données de la deuxième source
    for (const item of data2) {
        const { tr } = item;

        // Si l'ID de trajet existe déjà dans la carte, passe à l'itération suivante
        if (tripMap.has(tr)) {
            continue;
        }

        // Ajoute l'élément de la deuxième source à la carte
        tripMap.set(tr, item);
    }

    // Convertit les valeurs de la carte en un tableau de données filtrées
    for (const item of tripMap.values()) {
        filteredData.push(item);
    }

    return filteredData;
}

/**
 * Formate le nom d'une ligne de transport en utilisant les données du fichier GTFS.
 * @param {string} ZenbusName - Nom de la ligne de transport provenant de Zenbus.
 * @returns {Promise} - Promise résolue avec un objet contenant le nom et la couleur de la ligne.
 */
function formatGTFSName(ZenbusName) {
    return new Promise((resolve) => {
        // Flux de lecture du fichier routes.txt du GTFS
        const RoutesData = fs.createReadStream("./resources/verdun-rezo/routes.txt", { encoding: "utf8" });

        // Variables pour stocker les informations de la ligne
        let routeInfo = {};
        let routeName = '';
        let routeColor = '';

        // Interface de lecture de ligne pour parcourir le fichier
        const rl = readline.createInterface({
            input: RoutesData,
            crlfDelay: Infinity
        });

        // Événement déclenché pour chaque ligne lue
        rl.on('line', (line) => {
            const values = line.split(',');
            if (ZenbusName.toString() === values[0]) {
                routeName = values[4];
                routeColor = values[7];
                routeInfo = { name: routeName, color: ('#' + routeColor) };
            }
        });

        // Événement déclenché lorsque la lecture est terminée
        rl.on('close', () => {
            resolve(routeInfo);
        });
    });
}
/**
 * Récupère le dernier arrêt d'un trajet en utilisant l'identifiant du trajet (TripId).
 * @param {string} TripId - Identifiant du trajet.
 * @returns {Promise} - Promise résolue avec le nom de l'arrêt final du trajet.
 */
async function getLastStopOfTrip(TripId) {
    return new Promise((resolve) => {
        // Tableau pour stocker les horaires d'arrêt
        const stopTimes = [];

        // Lecture du fichier stop_times.txt et traitement CSV
        fs.createReadStream('./resources/verdun-rezo/stop_times.txt')
            .pipe(csv())
            .on('data', row => {
                if (row.trip_id === TripId) {
                    stopTimes.push(row);
                }
            })
            .on('end', async () => {
                // Trie les horaires d'arrêt par leur numéro de séquence
                stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);

                // Obtient l'ID du dernier arrêt
                const lastStopId = stopTimes[stopTimes.length - 1].stop_id;

                // Trouve le nom de l'arrêt correspondant à cet ID
                const stopName = await getStopNameById(lastStopId);

                resolve(stopName);
            });

        // Fonction pour obtenir le nom d'un arrêt en utilisant son ID
        async function getStopNameById(stopId) {
            return new Promise(resolve => {
                fs.createReadStream('./resources/verdun-rezo/stops.txt')
                    .pipe(csv())
                    .on('data', row => {
                        if (row.stop_id === stopId) {
                            resolve(row.stop_name);
                        }
                    });
            });
        }
    });
}
/**
 * Formate le temps restant en minutes jusqu'à la prochaine date donnée.
 * @param {Date} nextDate - Prochaine date à laquelle le temps restant est calculé.
 * @returns {number} - Temps restant en minutes.
 */
function formatMinutesLeft(nextDate) {
    const now = new Date();
    // Timestamp Unix
    const diffInSeconds = (nextDate.getTime() - now.getTime()) / 1000;
    return Math.trunc(diffInSeconds / 60);
}

/**
 * Recherche et renvoie le StopTimeUpdate correspondant à un arrêt donné dans un tableau d'arrêts.
 * @param {Array} StopTimeUpdates - Tableau d'objets StopTimeUpdate.
 * @param {string} stopId - Identifiant de l'arrêt recherché.
 * @returns {object|null} - Objet StopTimeUpdate correspondant ou null s'il n'est pas trouvé.
 */
function searchStopPoint(StopTimeUpdates, stopId) {
    // Parcours chaque StopTimeUpdate dans le tableau
    for (let i = 0; i < StopTimeUpdates.length; i++) {
        // Si l'ID de l'arrêt correspond à l'ID donné, renvoie le StopTimeUpdate
        if (StopTimeUpdates[i].stopId === stopId) {
            return StopTimeUpdates[i];
        }
    }
    // Si aucun StopTimeUpdate n'est trouvé, renvoie null
    return null;
}
/**
 * Obtient les heures théoriques de passage des véhicules.
 * @returns {Array} - Tableau d'objets contenant les heures théoriques de passage.
 */
async function getTheoreticalHours() {
    let arrivals = [];

    // Récupère les prochaines arrivées à l'arrêt
    arrivals = await getNextArrivalAtStop();

    // Extrait les heures de passage théoriques des données d'arrivée
    let Hours = arrivals.Data.Hours;

    // Filtre les heures théoriques pour celles qui sont limitées dans le temps
    let arrival_limited = await filterLimited(Hours);

    let THEORETICAL_HOURS = [];

    // Traite chaque élément d'arrivée limitée
    await arrival_limited.forEach((element) => {
        let now = new Date();
        let current_time = (now.getHours() * 60) + now.getMinutes();
        let RemainMinutes = element.TheoricArrivalTime - current_time;

        // Détermine le tripId et la direction
        let id = element.VehicleJourneyId;
        let dir;
        let tripId;
        function setTripInfo(id) {
            const vehicleJourney = arrivals.Data.VehicleJourneys.find((journey) => journey.Id === id);

            if (vehicleJourney) {
                tripId = vehicleJourney.OperatorJourneyId;
                dir = vehicleJourney.JourneyDestination;
            } else {
                tripId = null; // Si aucun trajet correspondant n'est trouvé
                dir = null;
            }
        }
        setTripInfo(id);

        // Détermine la couleur et les informations de ligne
        let color;
        let LineInfo;
        function setLineInfo(id) {
            const line = arrivals.Data.Lines.find((line) => line.Id === id);

            if (line) {
                color = "#" + line.Color;
                LineInfo = line.Number;
            } else {
                color = null;
                LineInfo = null;
            }
        }
        setLineInfo(element.LineId);

        // Ajoute l'heure théorique au tableau THEORETICAL_HOURS
        THEORETICAL_HOURS.push({
            tr: tripId,
            ln: LineInfo,
            rm: RemainMinutes,
            direction: dir,
            color: color,
            rt: false
        });
    });

    /**
     * Filtre les heures limitées en fonction du temps actuel.
     * @param {Array} hours - Tableau d'heures de passage.
     * @returns {Array} - Tableau d'heures de passage filtrées.
     */
    async function filterLimited(hours) {
        let filtered = [];
        let end_hour_in_minutes = () => {
            let now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes();

            return hours * 60 + minutes + 46;
        };
        hours.forEach((element) => {
            if (element.TheoricArrivalTime <= end_hour_in_minutes() && element.TheoricArrivalTime !== null && element.TheoricArrivalTime >= (end_hour_in_minutes() - 44)) {
                filtered.push(element);
            }
        });

        return filtered;
    }

    return THEORETICAL_HOURS;
}
/**
 * Récupère les prochaines heures de passage à un arrêt donné.
 * @returns {Object} - Données des prochaines heures de passage.
 */
async function getNextArrivalAtStop() {
    try {
        // Effectue une requête pour obtenir les prochaines heures de passage à l'arrêt
        let response = await axios.get('https://stage1.api.grandest2.cityway.fr/api/transport/v3/timetable/GetNextStopHoursForStops/json', {
            params: {
                StopIds: '151317'
            }
        });

        return response.data;
    } catch (e) {
        // En cas d'erreur, affiche un message d'erreur
        console.error("Error: ", e);
    }
}

/**
 * Obtient les heures de passage en temps réel (RT) des véhicules.
 * @returns {Array} - Tableau d'objets contenant les heures de passage en temps réel.
 */
async function getRtHours() {
    let RTHOURS = [];

    // Lecture des données du fichier poll.proto
    const data = fs.readFileSync("./resources/poll.proto");

    // Décodage des données du fichier en un objet FeedMessage
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(Buffer.from(data));

    // Parcourt chaque entité dans le feed
    for (let i = 0; i < feed.entity.length; i++) {
        if (feed.entity[i].tripUpdate) {
            if (feed.entity[i].tripUpdate.stopTimeUpdate) {
                let tripUpdate = feed.entity[i].tripUpdate;

                // Recherche l'élément StopTimeUpdate correspondant
                let stopTimeItem = searchStopPoint(tripUpdate.stopTimeUpdate);

                if (stopTimeItem != null) {
                    let value = stopTimeItem.arrival.time.toString();

                    // Convertit la valeur en un timestamp
                    const longValue = Long.fromString(value);
                    const timestamp = longValue.toNumber() * 1000;
                    const dateTimestamp = new Date(timestamp);

                    // Obtient la direction du dernier arrêt du trajet
                    const direction = await getLastStopOfTrip(tripUpdate.trip.tripId);

                    // Obtient les informations de la ligne
                    let LineInfo = await formatGTFSName(tripUpdate.trip.routeId);

                    // Calcule le temps restant en minutes
                    let MinutesLeft = formatMinutesLeft(dateTimestamp) + 1;
                    let tripId = tripUpdate.trip.tripId;

                    // Ajoute les heures RT au tableau RTHOURS si elles sont pertinentes
                    if (MinutesLeft < 46 && MinutesLeft >= 0) {
                        RTHOURS.push({
                            tr: tripId,
                            ln: LineInfo.name,
                            rm: MinutesLeft,
                            direction: direction,
                            color: LineInfo.color,
                            rt: true
                        });
                    }
                }
            }
        }
    }

    // Trie le tableau RTHOURS avant l'envoi
    RTHOURS.sort((a, b) => a.rm - b.rm);

    return RTHOURS;
}
}