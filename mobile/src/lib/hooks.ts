import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore'
import { useEffect, useState, type DependencyList } from 'react'

/** Live Firestore query → array, the mobile equivalent of Dexie's
 * useLiveQuery. Re-subscribes when `deps` change. */
export function useLiveCollection<T>(makeQuery: () => Query<T>, deps: DependencyList): T[] {
  return useLiveCollectionState(makeQuery, deps).items
}

/** Like useLiveCollection, plus `loaded` — for logic that must not act on
 * the empty array returned before the first snapshot (e.g. awarding XP). */
export function useLiveCollectionState<T>(makeQuery: () => Query<T>, deps: DependencyList) {
  const [state, setState] = useState<{ items: T[]; loaded: boolean }>({ items: [], loaded: false })

  useEffect(() => {
    return onSnapshot(makeQuery(), (snap) => setState({ items: snap.docs.map((d) => d.data()), loaded: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

/** Live single document. `loaded` distinguishes "still fetching" from
 * "doesn't exist" (data undefined in both cases). */
export function useLiveDoc<T>(makeRef: () => DocumentReference<T>, deps: DependencyList) {
  const [state, setState] = useState<{ data: T | undefined; loaded: boolean; key: string }>({
    data: undefined,
    loaded: false,
    key: '',
  })
  const ref = makeRef()

  useEffect(() => {
    return onSnapshot(ref, (snap) => setState({ data: snap.data(), loaded: true, key: ref.path }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Until the snapshot for the *current* ref arrives, don't hand back the
  // previous doc's data (e.g. right after switching days in the journal).
  return state.key === ref.path ? state : { data: undefined, loaded: false }
}
