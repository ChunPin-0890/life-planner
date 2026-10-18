import { setDoc } from 'firebase/firestore'
import { metaDoc } from './firestore'

// The web app stores the North Star as a Note in a reserved folder; here it
// gets its own doc at users/{uid}/meta/northStar, so notes never need to
// filter it out.
export async function setNorthStar(body: string) {
  await setDoc(metaDoc('northStar'), { body, updatedAt: new Date().toISOString() })
}
