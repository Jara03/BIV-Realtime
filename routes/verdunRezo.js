var express = require('express');
var router = express.Router();

const axios = require("axios") ;
const path = require("path");
const rootDir = path.resolve(__dirname, '../'); // Go up one directory from the current script's directory
const moment = require("moment-timezone")

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


module.exports = router;