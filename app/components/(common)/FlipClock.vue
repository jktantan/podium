<!--翻页时钟-->
<script lang="ts" setup>
import Tick from '@pqina/flip'
import '@pqina/flip/dist/flip.min.css'

const tick = ref()
let tInt
onMounted(() => {
  const _tick = Tick.DOM.create(tick.value, {
    value: {
      sep: ':',
      hours: 0,
      minutes: 0,
      seconds: 0
    },
    credits: null
  })
  tInt = Tick.helper.interval(function () {
    const d = Tick.helper.date()
    _tick.value = {
      sep: ':',
      hours: d.getHours(),
      minutes: d.getMinutes(),
      seconds: d.getSeconds()
    }
  })
})
onActivated(() => {
  tInt.resume()
})
onDeactivated(() => {
  tInt.pause()
})
onUnmounted(() => {
  tInt.stop()
})
</script>

<template>
  <div ref="tick" class="tick">
    <span data-key="hours" data-repeat="true" data-transform="pad(00) -> split -> delay">
      <span data-view="flip" />
    </span>
    <span class="tick-text-inline" data-key="sep" data-view="text" />
    <span data-key="minutes" data-repeat="true" data-transform="pad(00) -> split -> delay">
      <span data-view="flip" />
    </span>

    <span class="tick-text-inline" data-key="sep" data-view="text" />

    <span data-key="seconds" data-repeat="true" data-transform="pad(00) -> split -> delay">
      <span data-view="flip" />
    </span>
  </div>
</template>

<style lang="scss" scoped>
.tick {
  font-size: 3em;
  white-space: nowrap;
  font-family: arial, sans-serif;
}

//.tick-text-inline {
//  font-size: 2.5em;
//}

.tick-text-inline {
  display: inline-block;
  text-align: center;
  //min-width: 1em;
}

.tick-text-inline + .tick-text-inline {
  margin-left: -0.325em;
}

.tick-text-inline {
  color: #2e2d2d !important;
}
</style>
