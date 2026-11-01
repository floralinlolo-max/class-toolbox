'use strict';
/* 登入用的 Firebase 設定（班級百寶箱、動態牆單機版、後台共用）。
   在 Firebase 主控台：專案設定 → 一般 → 你的應用程式 → SDK 設定和配置 → 選「設定」，把 firebaseConfig 的內容貼到下面。
   這幾個值是公開的識別碼（本來就會出現在網頁裡），資料安不安全靠的是 Firestore 規則（firebase/firestore.rules）。
   FB_CONFIG 是 null，或直接雙擊 index.html（file://）打開時：不用登入，資料只存在這台電腦的瀏覽器（和以前一樣）。 */
const FB_CONFIG = null;
/* 例如：
const FB_CONFIG = {
  apiKey: '…',
  authDomain: '…',
  projectId: '…',
  storageBucket: '…',
  messagingSenderId: '…',
  appId: '…'
};
*/
