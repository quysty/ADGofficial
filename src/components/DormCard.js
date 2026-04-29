/* =========================================================
   DORM CARD COMPONENT
   当前用途：
   1) 生成首页 Featured dorms 卡片
   2) 生成首页 Ranked dorms 卡片

   注意：
   - 这里只负责返回卡片 HTML 字符串
   - 不负责排序
   - 不负责按钮事件绑定
   - 不负责页面跳转
   - 不负责读取 dorm 数据
   ========================================================= */

(function initDormCardComponent() {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createImageMarkup(dorm) {
    if (dorm && dorm.image) {
      return `<img src="${escapeHtml(dorm.image)}" alt="${escapeHtml(dorm.name)}" />`;
    }

    return `
      <div style="
        width:100%;
        height:100%;
        background:
          radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45), rgba(255,255,255,0) 34%),
          linear-gradient(135deg, #d6deea, #f1f4f8);
      "></div>
    `;
  }

  function createDormCard(dorm, rankLabel = null) {
    if (!dorm) return "";

    return `
      <article class="rank-card">
        <div class="rank-card__image">
          ${rankLabel ? `<div class="rank-card__rank">${escapeHtml(rankLabel)}</div>` : ""}
          ${createImageMarkup(dorm)}
        </div>

        <div class="rank-card__content">
          <p class="rank-card__tag">${escapeHtml(dorm.tag)}</p>
          <h3>${escapeHtml(dorm.name)}</h3>
          <p class="rank-card__summary">${escapeHtml(dorm.summary)}</p>

          <div class="rank-card__actions">
            <button class="rank-card__button rank-card__button--primary rank-card__button--explore" type="button" data-map="${escapeHtml(dorm.id)}">
              have a look
            </button>
          </div>
        </div>
      </article>
    `;
  }

  window.DormCardComponent = {
    createDormCard
  };
})();
