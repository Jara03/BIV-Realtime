<template>
  <BivInterface/>
</template>

<script>
import BivInterface from './components/biv-interface.vue'

export default {
  name: 'App',
  components: {
    BivInterface: BivInterface
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
body {
  margin: 0;
  padding: 0;
}
</style>
