<template>
  <div class="main-container">

    <!-- En-tête de la page -->
    <div style="display: flex; flex-direction: row; justify-content: space-evenly; align-content: center;">

      <!-- Logo -->
      <div style="display: flex; justify-content: start; align-items: center; margin-left: 50px">
        <img :src="operatorImage()" alt="" style="width: 100px; height: 50px"/>
      </div>

      <!-- Titre de la page -->
      <div style="display: flex; justify-content: center; align-items: center; flex-grow: 1;">
        <h2 style="color: black">{{ stopName.Name }}</h2>
      </div>

      <!-- Heure actuelle -->
      <div style="display: flex; justify-content: center; align-items: center; background-color: #8f6adf;">
        <p style="color: white; padding: 50px; font-size: 20px">{{ currentTime }}</p>
      </div>

    </div>

    <!-- Partie diapositive -->
    <div class="slideshow-container table-container">
      <div v-for="(page, index) in pages" :key="index" class="slide" :class="{ active: currentPageIndex === index }">
        <table class="my-table">
          <thead>
          <tr>
            <th>Lignes</th>
            <th>Directions</th>
            <th>Temps de passage</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(hours, index) in page" :key="index">
            <td><label class="lineTag" :style="{ backgroundColor: hours.color }">{{ hours.ln }}</label></td>
            <td><label>{{ hours.direction }}</label></td>
            <td>{{ formatTimeLeft(hours.rm) }}<img v-if="hours.rt" class="realtime-icon" src="../../resources/rt-animated.gif" alt="realtime GIF"/></td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Fin de la partie diapositive -->

  </div>

  <!-- Contenu de la page -->
  <div>
    <div class="footer">
      <!-- Contenu du pied de page -->
      <img :src="cityImage()" style="height: 10%; width: 10%" alt="">
      <img src="../../resources/Transdev_logo_2018.png" style="height: 10%; width: 10%" alt="">
      <p>version beta (1.0)</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  created() {
    // Mettre à jour l'heure actuelle chaque seconde
    setInterval(() => {
      let date = new Date();
      this.currentTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit',second:'2-digit' });
    }, 1000)
  },

  async mounted() {

    // Function to fetch data from the API
  console.log(this.$route.params.stop)
    const fetchData = async () => {
      try {
        const response = await axios.get("https://biv-api2.azurewebsites.net/api/verdun-rezo/"+this.$route.params.stop);
        this.hours = response.data;

        const stop_response = await axios.get("https://biv-api2.azurewebsites.net/api/verdun-rezo/"+this.$route.params.stop+"/name");
        this.stopName = stop_response.data;
        console.log(stop_response.data)
      } catch (error) {
        console.error(error);
      }
    };

    // Initial fetch
    await fetchData();

    // Set interval to fetch data every 10 seconds
    setInterval(fetchData, 10000);

    // Changement de diapositive toutes les 7 secondes
    setInterval(() => {
      this.currentPageIndex = (this.currentPageIndex + 1) % this.pages.length;
    }, 7000);
  },

  name: 'BivInterface',
  props: {
    msg: String,
    param: String
  },
  data() {
    return {
      itemsPerPage: 7,
      currentPageIndex: 0,
      hours: [{ tr: "921280008:11", ln: "L1", rm: "1", direction: "...", color: "black" }],
      currentTime: '',
      message: "",
      stopName:""
    }
  },
  computed: {
    pages() {
      const pageCount = Math.ceil(this.hours.length / this.itemsPerPage);
      const pages = [];
      for (let i = 0; i < pageCount; i++) {
        const start = i * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        pages.push(this.hours.slice(start, end));
      }
      return pages;
    }
  },
  methods: {
    formatTimeLeft(time) {
      return time < 1 ? 'Passage imminent' : time + " min ";
    },
    cityImage(){
      if(this.$route.params.stop == "citura"){
        return require("../../resources/logo-commune-citura.png")
      }else if(this.$route.params.stop == "gare"){
        return require("../../resources/logo-commune-verdun.png")

      }

    },
    operatorImage(){
      if(this.$route.params.stop == "citura"){
        return require("../../resources/logo_reseau_citura.png")
      }else if(this.$route.params.stop == "gare"){
        return require("../../resources/logo_reseau_gare.png")

      }
    },
    getStopName(){
      return("Gare Multimodale")
    }
  }
}
</script>

<style scoped>
/* Styles CSS spécifiques au composant */
.slideshow-container {
  position: relative;
  height: 500px;
  overflow: hidden;
}

.slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.25s ease-in-out;
  z-index: -1;
}

.slide.active {
  opacity: 1;
  z-index: 1;
}

.footer {
  display: flex;
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: white;
  text-align: center;
  justify-content: space-evenly;
  align-items: center;
  padding: 10px;
}

.lineTag {
  font-weight: bold;
  font-size: 30px;
  border-radius: 7px;
  border: 2px inherit solid;
  padding-inline: 10px;
  padding-bottom: 3px;
  padding-top: 3px;
  padding-left: 5px;
  padding-right: 5px;
  color: white;
  justify-content: start;
  width: auto;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.main-container {
  /* Styles pour le conteneur principal */
}

.realtime-icon {
  width: 25px;
  height: 20px;
  transform: rotate(45deg);
}

.table-container {
  font-size: large;
  display: flex;
  justify-content: center;
}

/* Styles pour la table */
.my-table {
  width: 100%;
  border-collapse: collapse;
}

.my-table th,
.my-table td {
  padding: 25px;
  text-align: center;
  background-color: lightgrey;
}

.my-table td:first-child {
  width: 33%;
}

.my-table td:nth-child(2) {
  width: 33%;
  font-size: 20px;
}

.my-table td:nth-child(3) {
  width: 33%;
}

.my-table th {
  background-color: #f2f2f2;
}

/* Autres styles pour la table */
.my-table td {
}

.my-table tr {
  border-bottom: 3px solid #fff;
}
</style>
