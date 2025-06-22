// Bu dosya artık bir proxy olarak hizmet veriyor ve tüm işlevselliği src/lib/firebase/client.ts'den alıyor
// Bu, Firebase yapılandırmasının tek bir kaynaktan gelmesini sağlar ve çakışmaları önler

import app, { auth, db } from './firebase/client'

export { auth, db }
export default app