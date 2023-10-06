var express = require('express');
var router = express.Router();

const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require("fs");
const readline = require("readline");
const Long = require("long");
const axios = require("axios") ;
const path = require("path");
const csv = require("csv-parser");
const rootDir = path.resolve(__dirname, '../'); // Go up one directory from the current script's directory
const moment = require("moment-timezone")

const GTFS_RT_PATH = path.join(rootDir, 'public', 'poll.proto');
const timeZone = 'Europe/Paris';


/* GET home page. */
router.get('/gare', async function(req, res, next) {

  try {

      // Renvoie les heures filtrées au client
      res.json(await getTheoreticalHours("151317")); //filteredHours 

  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred' });
  }});

  router.get('/citura', async function(req,res,next) {
    try {

        // Renvoie les heures filtrées au client
        res.json(await getTheoreticalHours("1802131")); //filteredHours 
  
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }})

    router.get('/:stop/name', async function(req,res,next) { 
        
        try {
      // Get the 'stop' parameter from the URL
      const stop = req.params.stop;

      // Define a mapping of stop names to StopIds
      const stopId = stop === 'citura' ? '1802131' : stop === 'gare' ? '151317' : '151317';
      const color = stop === 'citura' ? "#751e27" : stop === 'gare' ? "#8f6adf" : "#8f6adf"
  
      // Make the Axios GET request with the correct StopIds
      const response = await axios.get('https://stage1.api.grandest2.cityway.fr:443/api/transport/v3/stop/GetStopsDetails/json', {
        params: {
          StopIds: stopId // Use the mapped StopId
        }
      });
  
      // Extract the name from the response data and send it as JSON
      const name = response.data.Data[0].Name;
      res.json({ Name: name ,
    color :color });
      
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'An error occurred' });
        }})

  
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
      const routesDataPath = path.join(rootDir, 'public', 'verdun-rezo', 'routes.txt');

      const RoutesData = fs.createReadStream(routesDataPath, { encoding: "utf8" });

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
      const stopTimesDataPath = path.join(rootDir, 'public', 'verdun-rezo', 'stop_times.txt');

      // Lecture du fichier stop_times.txt et traitement CSV
      fs.createReadStream(stopTimesDataPath)
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
            const stopDataPath = path.join(rootDir,'public', 'verdun-rezo', 'stops.txt');

              fs.createReadStream(stopDataPath)
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
function formatMinutesLeft(nextDate, timeZone) {
  // Obtenez la date et l'heure actuelles dans le fuseau horaire spécifié
  const nowInTimeZone = moment.tz(timeZone);

  // Calculez la différence entre nextDate et l'heure actuelle dans le fuseau horaire spécifié
  const diffInMilliseconds = moment(nextDate).diff(nowInTimeZone);

  // Convertissez la différence en minutes
  const minutesLeft = moment.duration(diffInMilliseconds).asMinutes();

  return Math.trunc(minutesLeft);
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

function filterLimited(hours) {
    let filtered = [];
    let end_hour_in_minutes = () => {
// Définissez le fuseau horaire souhaité, par exemple, 'Europe/Paris'

// Obtenez l'heure actuelle dans le fuseau horaire spécifié
const nowInParis = moment.tz(timeZone);

// Obtenez l'heure et les minutes au format du fuseau horaire de Paris
const hours = parseInt(nowInParis.format('HH'));
const minutes = parseInt(nowInParis.format('mm'));
let timetest = hours * 60 + minutes + 46
        return timetest ;
    };
   hours.forEach((element) => {
        if (element.TheoricArrivalTime <= end_hour_in_minutes() && element.TheoricArrivalTime !== null && element.TheoricArrivalTime >= (end_hour_in_minutes() - 44)) { 
            console.log(element.TheoricArrivalTime)
            filtered.push(element);
        }
    });
    console.log(filtered);

    return filtered;
}
/**
* Obtient les heures théoriques de passage des véhicules.
* @returns {Array} - Tableau d'objets contenant les heures théoriques de passage.
*/
async function getTheoreticalHours(stopId) {
    return new Promise(async(resolve,reject) => {
        try{
    
            let arrivals = [];

            // Récupère les prochaines arrivées à l'arrêt
            arrivals = await getNextArrivalAtStop(stopId);
          
            // Extrait les heures de passage théoriques des données d'arrivée
            let Hours = arrivals.Data.Hours;
          
            // Filtre les heures théoriques pour celles qui sont limitées dans le temps
            let arrival_limited = filterLimited(Hours);
        
            let THEORETICAL_HOURS = [];
          
            // Traite chaque élément d'arrivée limitée
            await arrival_limited.forEach((element) => {

                const nowInParis = moment.tz(timeZone);

                let current_time = (parseInt(nowInParis.format('HH')) * 60) + parseInt(nowInParis.format('mm'));
                let RemainMinutes = element.TheoricArrivalTime - current_time;
                let rt = false;

                if (element.RealArrivalTime !== null) {
                    console.log(element.RealArrivalTime);
                    RemainMinutes = element.RealArrivalTime - current_time;
                    rt =true;
                  } else if (element.PredictedArrivalTime !== null) {
                    RemainMinutes = element.PredictedArrivalTime - current_time;
                    rt = true;
                  } else if (element.AimedArrivalTime !== null) {
                    RemainMinutes = element.AimedArrivalTime - current_time;
                    rt = true;
                  }
          
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
                    rt: rt
                });
            });
          
            /**
             * Filtre les heures limitées en fonction du temps actuel.
             * @param {Array} hours - Tableau d'heures de passage.
             * @returns {Array} - Tableau d'heures de passage filtrées.
             */
        
          
            resolve(THEORETICAL_HOURS) ;

        }catch(error){
            reject(error);
        }
    })

}
/**
* Récupère les prochaines heures de passage à un arrêt donné.
* @returns {Object} - Données des prochaines heures de passage.
*/
async function getNextArrivalAtStop(stopId) {
  try {
      // Effectue une requête pour obtenir les prochaines heures de passage à l'arrêt
      let response = await axios.get('https://stage1.api.grandest2.cityway.fr/api/transport/v3/timetable/GetNextStopHoursForStops/json', {
          params: {
              StopIds: stopId
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

async function getRtHours() {
  let RTHOURS = [];

  // Lecture des données du fichier poll.proto
  const data = fs.readFileSync(GTFS_RT_PATH);

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
*/


module.exports = router;