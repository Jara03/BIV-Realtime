const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require("fs");
const readline = require("readline");
const Long = require("long");
const axios = require("axios") ;
const express = require("express");
const path = require("path");
const cors = require("cors");
const csv = require("csv-parser");
const https = require("https");

const app = express();
app.use(cors());


const privateKey = fs.readFileSync("./key.pem",'utf8');
const certificate = fs.readFileSync('./cert.pem','utf8');
const credentials  = {key:privateKey, cert: certificate};

const agent = new https.Agent({
        requestCert: true,
        rejectUnauthorized: false,
        cert:certificate
});
app.get('/api/verdun-rezo/gare', async (req, res) => {
    const GTFS_RT_PATH =  './resources/poll.proto';
    try {
         axios.get('https://zenbus.net/gtfs/rt/poll.proto?dataset=verdun-rezo',{
            httpsAgent: agent,
            responseType:'stream'
        }).then(async response => {
             if(fs.existsSync(GTFS_RT_PATH)){
                 fs.unlink(GTFS_RT_PATH, (err) => {
                     if (err) {
                         console.error(err);
                     }
                 });
             }


             const writer = fs.createWriteStream(path.resolve(GTFS_RT_PATH));
             response.data.pipe(writer);
             writer.on('finish', async () => {
                 console.log('File downloaded successfully!');

                 const rt_hours = await getRtHours();
                 const theoretical_hours = await getTheoreticalHours();

                 const filteredHours = filterHours(rt_hours,theoretical_hours);

                 fs.unlink(GTFS_RT_PATH, (err) => {
                     if (err) {
                         console.error(err);
                     }
                 });
                 res.json(filteredHours);
             });


         }).catch(error => {
             console.error('Error downloading file:', error);
         });


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }

});

const httpsServer = https.createServer(credentials,app);
const PORT = 443;

httpsServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
});

const stopId = 'zenbus:StopPoint:SP:507070002:LOC' //ID Zenbus de l'arrêt gare multimodale

function filterHours(data1, data2){
    const filteredData = [];

    // Create a map to track trip IDs and their corresponding objects
    const tripMap = new Map();

    // Process data from the first table
    for (const item of data1) {
        const { tr } = item;

        // Add or update the item in the map
        tripMap.set(tr, item);
    }

    // Process data from the second table
    for (const item of data2) {
        const { tr } = item;

        // If trip ID already exists in the map, skip
        if (tripMap.has(tr)) {
            continue;
        }

        // Add the item from the second table to the map
        tripMap.set(tr, item);
    }

    // Convert the map values to an array of filtered data
    for (const item of tripMap.values()) {
        filteredData.push(item);
    }

    return filteredData;
}

 function formatGTFSName(ZenbusName){
     return new Promise((resolve, reject) => {
         const RoutesData = fs.createReadStream("./resources/verdun-rezo/routes.txt", {encoding: "utf8"});
         let routeInfo = {};
         let routeName = '';
         let routeColor = '';

         const rl = readline.createInterface({
             input: RoutesData,
             crlfDelay: Infinity
         });

         rl.on('line', (line) => {
             const values = line.split(',');
             if (ZenbusName.toString() === values[0]) {
                 routeName = values[4];
                 routeColor = values[7];
                 routeInfo = {name:routeName,color:('#'+routeColor)};
             }
         });

         rl.on('close', () => {
             resolve(routeInfo);
         });
     });
}
async function getLastStopOfTrip(TripId) {

    return new Promise((resolve, reject) => {
        const stopTimes = [];
        fs.createReadStream('./resources/verdun-rezo/stop_times.txt')
            .pipe(csv())
            .on('data', row => {
                if (row.trip_id === TripId) {
                    stopTimes.push(row);
                }
            })
            .on('end', async () => {
                // Sort the stop times by their sequence number
                stopTimes.sort((a, b) => a.stop_sequence - b.stop_sequence);

                // Get the last stop ID
                const lastStopId = stopTimes[stopTimes.length - 1].stop_id;

                // Find the stop with this ID in the stops.txt file
                const stopName = await getStopNameById(lastStopId);

                resolve(stopName);
            });

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
function formatMinutesLeft(nextDate){
    const now = new Date();
     // Unix timestamp
     const diffInSeconds = (nextDate.getTime() - now.getTime()) / 1000;
     return Math.trunc(diffInSeconds / 60);

}
function searchStopPoint(StopTimeUpdates) {

    // Loop through each StopTimeUpdate in the array
    for (let i = 0; i < StopTimeUpdates.length; i++) {
        // If the stopId matches the given stopId, return the StopTimeUpdate
        if (StopTimeUpdates[i].stopId === stopId) {
            return StopTimeUpdates[i];
        }
    }
    // If no StopTimeUpdate is found, return null
    return null;
}
async function getTheoreticalHours(){
    let arrivals = [];

    arrivals = await getNextArrivalAtStop();
    //console.log(arrivals);
    //return arrivals.Hours

    let Hours = arrivals.Data.Hours;
    let arrival_limited = await filterLimited(Hours);
    let THEORETICAL_HOURS = [];

    await arrival_limited.forEach((element) => {
        //Determiner le temps restant
        let now = new Date();
        let current_time = (now.getHours()*60)+now.getMinutes();
        let RemainMinutes = element.TheoricArrivalTime - current_time;

        //determiner le tripId
        let id = element.VehicleJourneyId;
        let dir;
        let tripId;
        function setTripInfo(id){
            const vehicleJourney = arrivals.Data.VehicleJourneys.find((journey) => journey.Id === id);

            if (vehicleJourney) {
                tripId = vehicleJourney.OperatorJourneyId;
                dir = vehicleJourney.JourneyDestination;
            }else{
                tripId =  null; // If no matching journey found
                dir = null;
            }
        }

        setTripInfo(id);
        let color;
        let LineInfo;
        function setLineInfo(id){
            const line = arrivals.Data.Lines.find((line) => line.Id === id);

            if (line) {
                color = "#"+line.Color;
                LineInfo =  line.Number;

            }else{
                color = null;
                LineInfo = null;
            }
        }

        setLineInfo(element.LineId);

        THEORETICAL_HOURS.push({
            tr: tripId,
            ln: LineInfo,
            rm: RemainMinutes,
            direction: dir,
            color:color,
            rt : false
        })
    })

    async function filterLimited(hours){
        let filtered = [];
        //console.log(hours)
        let  end_hour_in_minutes = () => {
            let now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes();

            return hours*60 + minutes + 46;
        }
        console.log(end_hour_in_minutes())
        hours.forEach((element) => {
            if(element.TheoricArrivalTime <= end_hour_in_minutes() && element.TheoricArrivalTime != null && element.TheoricArrivalTime >= (end_hour_in_minutes()-44) ){
                //console.log(element);
                filtered.push(element);
            }
        })

        return filtered;
    }

    return THEORETICAL_HOURS;

}
async function getNextArrivalAtStop() {
    try{
        let response = await axios.get('https://stage1.api.grandest2.cityway.fr/api/transport/v3/timetable/GetNextStopHoursForStops/json', {
            params: {
                StopIds: '151317'
            }
        })
        return response.data;

    }catch (e){
        console.error("Error : ", e);
    }
}

async function getRtHours(){
    let RTHOURS = [];

    const data = fs.readFileSync("./resources/poll.proto")

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(Buffer.from(data));

    for(let i = 0; i < feed.entity.length;i++){

        if (feed.entity[i].tripUpdate) {

            if (feed.entity[i].tripUpdate.stopTimeUpdate) {
                let tripUpdate = feed.entity[i].tripUpdate;
                let stopTimeItem = searchStopPoint(tripUpdate.stopTimeUpdate);

                if(stopTimeItem != null){

                    let value = stopTimeItem.arrival.time.toString();

                    const longValue = Long.fromString(value); // Create a Long object from a string
                    const timestamp = longValue.toNumber() * 1000; // Convert the Long object to a timestamp in milliseconds
                    const dateTimestamp = new Date(timestamp);
                    const direction = await getLastStopOfTrip(tripUpdate.trip.tripId);


                    let LineInfo = await formatGTFSName(tripUpdate.trip.routeId);
                    let MinutesLeft = formatMinutesLeft(dateTimestamp)+1;
                    let tripId = tripUpdate.trip.tripId;
                    if(MinutesLeft < 46 && MinutesLeft>=0){
                        RTHOURS.push({
                            tr: tripId,
                            ln: LineInfo.name,
                            rm: MinutesLeft,
                            direction:direction,
                            color:LineInfo.color,
                            rt: true
                        })
                    }

                }


            }
        }
    }
    //tri du tableau avant envoi
    RTHOURS.sort((a, b) => a.rm - b.rm);

    return RTHOURS;
}