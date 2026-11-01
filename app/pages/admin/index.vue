<!-- 首页：只保留居中的翻页时钟 -->
<template>
  <section class="home">
    <FlipClock :size="64" />
  </section>
</template>

<style scoped lang="scss">
.home {
  display: grid;
  min-height: 100%;
  place-items: center;
}
</style>
