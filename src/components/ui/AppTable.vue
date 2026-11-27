<template>
  <div class="overflow-x-auto rounded-lg border border-slate-400 bg-white">
    <table class="min-w-full text-left text-lg">
      <thead class="bg-slate-100 text-slate-900">
        <slot name="head" />
      </thead>
      <tbody class="divide-y divide-slate-300">
        <slot />
      </tbody>
    </table>
  </div>
</template>
