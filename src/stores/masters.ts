import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listItems, listWarehouses } from '@/api/masters'
import type { Item, Warehouse } from '@/types'

/**
 * Items and warehouses, loaded once and shared by the order screens and the CSV/billing screens.
 * Call reload() after an admin changes the masters.
 */
export const useMastersStore = defineStore('masters', () => {
  const items = ref<Item[]>([])
  const warehouses = ref<Warehouse[]>([])
  const loaded = ref(false)

  async function load(): Promise<void> {
    if (loaded.value) return
    await reload()
  }

  async function reload(): Promise<void> {
    const [allItems, allWarehouses] = await Promise.all([listItems(true), listWarehouses(true)])
    items.value = allItems
    warehouses.value = allWarehouses
    loaded.value = true
  }

  return { items, warehouses, loaded, load, reload }
})
