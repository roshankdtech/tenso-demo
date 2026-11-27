import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { listOrders } from '@/api/orders'
import type { OrderScope } from '@/api/orders'
import { describeError } from '@/i18n/errors'
import { useMastersStore } from '@/stores/masters'
import type { Order } from '@/types'
import { itemNames } from '@/utils/orders'
import { useI18n } from 'vue-i18n'

/** Loads one list of orders, filters it by the search box, and reloads when the page changes. */
export function useOrderList(scope: OrderScope | (() => OrderScope)) {
  const route = useRoute()
  const masters = useMastersStore()
  const { t } = useI18n()
  const orders = ref<Order[]>([])
  const loading = ref(true)
  const error = ref('')
  const search = ref('')
  /** Delivery date range, YYYY-MM-DD. Empty means no limit. */
  const deliveryFrom = ref('')
  const deliveryTo = ref('')

  const currentScope = (): OrderScope => (typeof scope === 'function' ? scope() : scope)

  async function reload(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      await masters.load()
      orders.value = await listOrders(currentScope())
    } catch (err) {
      error.value = describeError(err, t, 'errors.unexpected')
    } finally {
      loading.value = false
    }
  }

  const filtered = computed(() => {
    const text = search.value.trim()
    return orders.value.filter((o) => {
      if (deliveryFrom.value && o.due < deliveryFrom.value) return false
      if (deliveryTo.value && o.due > deliveryTo.value) return false
      if (!text) return true
      return (
        o.no.includes(text) ||
        itemNames(o, masters.items).includes(text) ||
        (masters.warehouses.find((w) => w.id === o.warehouseId)?.name ?? '').includes(text)
      )
    })
  })

  onMounted(reload)
  watch(
    () => route.fullPath,
    () => void reload(),
  )

  return { orders, filtered, loading, error, search, deliveryFrom, deliveryTo, reload }
}
