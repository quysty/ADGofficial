/* =========================================================
   DORM SUMMARY COMPONENT
   当前用途：
   1) 生成首页 selected dorm quick summary 的 HTML
   2) 保持 summary UI 与 script.js 状态逻辑分离

   注意：
   - 这里只负责返回 HTML 字符串
   - 不负责读取 dorm 数据
   - 不负责按钮事件
   - 不负责页面跳转
   - 不直接操作 DOM
   ========================================================= */

(function initDormSummaryComponent() {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createSummaryMarkup(dorm) {
    if (!dorm) {
      return `
        <p class="selected-summary-card__kicker">SELECTED DORM QUICK SUMMARY</p>
        <h3>No dorm selected yet</h3>
        <p><strong>Best for:</strong> —</p>
        <p><strong>Location feel:</strong> —</p>
        <p><strong>Main trade-off:</strong> —</p>
      `;
    }

    return `
      <p class="selected-summary-card__kicker">SELECTED DORM QUICK SUMMARY</p>
      <h3>${escapeHtml(dorm.name)}</h3>
      <p><strong>Best for:</strong> ${escapeHtml(dorm.bestFor)}</p>
      <p><strong>Location feel:</strong> ${escapeHtml(dorm.locationFeel)}</p>
      <p><strong>Main trade-off:</strong> ${escapeHtml(dorm.tradeOff)}</p>
      <p>${escapeHtml(dorm.summary)}</p>
    `;
  }

  window.DormSummaryComponent = {
    createSummaryMarkup
  };
})();
