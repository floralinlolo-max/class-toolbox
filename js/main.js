'use strict';
/* 啟動 */

function boot() {
  loadData();
  Timer.load();
  $('#clsName').onclick = () => Settings.open('class');
  $('#btnSet').onclick = () => Settings.open();
  $('#nowChip').onclick = () => Sched.open();
  $('#teacherChip').onclick = () => TeacherUI.open();
  $('#timerChip').onclick = () => Timer.open();
  $('#examChip').onclick = () => Sched.revert();
  $('#btnHide').onclick = () => { D.info.hideScore = !D.info.hideScore; save(); refresh(); };
  $('#btnSound').onclick = () => { D.info.sound = !D.info.sound; save(); renderTop(); if (D.info.sound) Snd.pop(); };
  $('#btnLock').onclick = () => Lock.lock();
  $('#btnFull').onclick = () => toggleFull();
  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderBoard, 150); });
  refresh();
  if (Lock.isLocked() && D.lock.pin) Lock.show();
  try { if (localStorage.getItem('bxbox-wall') === '1' && D.wall.pages.length) Wall.open(); } catch (e) { }
  // 一週沒備份就提醒一次（一天最多一次）
  try {
    const t = dateKey();
    if (D.students.length && localStorage.getItem('bxbox-remind') !== t && (!D.info.lastBackup || daysBetween(D.info.lastBackup, t) >= 7)) {
      localStorage.setItem('bxbox-remind', t);
      setTimeout(() => toast('提醒：超過一週沒有匯出備份檔了，到 ⚙ 班級設定 → 資料 匯出一份吧。', { ms: 9000 }), 1500);
    }
  } catch (e) { }
}
document.addEventListener('DOMContentLoaded', boot);
