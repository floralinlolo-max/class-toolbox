'use strict';
/* 登入用的 Firebase 設定（班級百寶箱、動態牆單機版、後台共用）。
   在 Firebase 主控台：專案設定 → 一般 → 你的應用程式 → SDK 設定和配置 → 選「設定」，把 firebaseConfig 的內容貼到下面。
   這幾個值是公開的識別碼（本來就會出現在網頁裡），資料安不安全靠的是 Firestore 規則（firebase/firestore.rules）。
   FB_CONFIG 是 null，或直接雙擊 index.html（file://）打開時：不用登入，資料只存在這台電腦的瀏覽器（和以前一樣）。
   2026-11-05 填入：Firebase 專案 class-toolbox（專案 ID class-toolbox-3104d），網頁應用程式「班級百寶箱」。 */
const FB_CONFIG = {
  apiKey: 'AIzaSyAY5VuT0rgEelAuSxCF1w63ejFumvpx-gs',
  authDomain: 'class-toolbox-3104d.firebaseapp.com',
  projectId: 'class-toolbox-3104d',
  storageBucket: 'class-toolbox-3104d.firebasestorage.app',
  messagingSenderId: '12699614759',
  appId: '1:12699614759:web:b7b54589752bbf6f02d802'
};
