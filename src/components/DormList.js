/* =========================================================
   DORM LIST COMPONENT
   当前用途：
   1) 生成首页宿舍卡片列表 HTML
   2) 复用 DormCardComponent
   3) 让 script.js 不再直接 map dorm cards

   注意：
   - 这里只负责把 dorms 数组转换成 HTML 字符串
   - 不负责排序
   - 不负责按钮事件绑定
   - 不负责页面跳转
   - 不负责 DOM 插入
   ========================================================= */

(function initDormListComponent() {
  function createDormListMarkup(dorms, options = {}) {
    const list = Array.isArray(dorms) ? dorms : [];
    const showRank = Boolean(options.showRank);

    if (!window.DormCardComponent || typeof window.DormCardComponent.createDormCard !== "function") {
      console.error("DormCardComponent is missing. Check that src/components/DormCard.js is loaded before DormList.js.");
      return "";
    }

    return list
      .map((dorm, index) => {
        const rankLabel = showRank ? `#${index + 1}` : null;
        return window.DormCardComponent.createDormCard(dorm, rankLabel);
      })
      .join("");
  }

  window.DormListComponent = {
    createDormListMarkup
  };
})();
