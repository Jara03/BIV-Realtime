<template>
  <div class="main-container">

    <div style="display: flex;flex-direction: row; justify-content:space-evenly;align-content: center;">

      <div style="display: flex; justify-content: start; align-items: center; margin-left:50px">
        <img src="../../resources/LOGO-REZO-2048x1065.png" alt="" style="width: 100px; height: 50px"/>
      </div>

        <div style="display: flex; justify-content: center; align-items: center; flex-grow: 1; ">
          <h2 style="color: black">Gare Multimodale</h2>
        </div>

      <div style="display: flex; justify-content: center; align-items: center;background-color:#8f6adf;">
        <p style="color:white;padding: 50px; font-size:20px">{{ currentTime }}</p>
      </div>

    </div>


    <!--diapo part-->

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
            <td><label class="lineTag" :style="{backgroundColor:hours.color}">{{hours.ln}}</label></td>
            <td><label>{{ hours.direction }}</label></td>
            <td>{{ formatRemainingTime(hours.rm) }}<img v-if="hours.rt" class="realtime-icon" src="../../resources/giphy.gif" alt="realtime GIF"/></td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!--diapo part-->

  </div>

  <div>
    <!-- Your page content here -->
    <div class="footer">
      <!-- Your footer content here -->
      <img src="../../resources/logo-grand-verdun.png" style="height: 10%; width: 10%" alt="">
      <img src="../../resources/Transdev_logo_2018.png" style="height: 10%; width: 10%" alt="">
      <p> version beta (1.0)</p>
    </div>
  </div>

</template>

<script>

import axios from 'axios';

export default {
  created() {
    setInterval(() => {
      let date = new Date();
      this.currentTime = date.toLocaleTimeString();
    }, 1000)
  },

  mounted() {
    setInterval(() => {
      //faire l'appel api et intégrer les données
      axios.get("https://localhost:443/api/verdun-rezo/gare")
          .then((response) => {

            let data = response.data;
            this.hours = (data);
            //Vue.set(this.hours,'hours',data);
          })
          .catch((error) => {
            console.error(error);
          });

    }, 10000);
    setInterval(() => {
      this.currentPageIndex = (this.currentPageIndex + 1) % this.pages.length;
    }, 7000);

  },
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data(){
    return {
      itemsPerPage: 4,
      currentPageIndex: 0,

      hours: [{tr:	"921280008:11",ln:"L1", rm:"14",direction:"...",color:"black"},
        {tr:	"906450009:7",ln:"L2", rm:"1",direction:"...",color:"black"},
        {tr:	"927200008:11",ln:"L3", rm:"5",direction:"...",color:"black"},
        {tr:  "934800012:7",ln:"L7", rm:"23",direction:"...",color:"black"}],
      currentTime: ''
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
  methods:{

    formatRemainingTime(time){
      return time < 1 ? 'Passage Imminent' :  time + " min ";
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

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
  transition:opacity 0.25s ease-in-out;
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

.lineTag{
  font-weight:bold;
  font-size: 30px;
  border-radius: 7px;
  border: 2px inherit solid;
  padding-inline: 10px;
  padding-bottom: 3px;
  padding-top: 3px;
  color:white;
  justify-content: start;
  width: auto;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.main-container{

}
.realtime-icon{
  width: 25px ;
  height: 20px;
  transform: rotate(45deg);
}

.table-container {
  font-size: large;
  display: flex;
  justify-content: center;
}

.my-table {
  width: 100%;
  border-collapse: collapse;
}

.my-table th, .my-table td {
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
.my-table td {
}
.my-table tr {
  border-bottom: 3px solid #fff;
}





</style>
