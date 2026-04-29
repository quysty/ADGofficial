/* =========================================================
   PATH OPTIONS DATA
   当前用途：
   1) 给首页 Explore by Path 使用
   2) 存放 Major / Lifestyle / Requirements 的选项配置

   注意：
   - 这里只有配置数据
   - 不负责按钮事件
   - 不负责拖拽排序
   - 不负责推荐算法
   - 不负责 DOM 渲染
   ========================================================= */

(function initPathOptions() {
window.PATH_OPTIONS = {
    major: {
      options: [
        { id: "psychology", label: "Psychology" },
        { id: "business", label: "Business" },
        { id: "computing", label: "Computing" },
        { id: "environment", label: "Environment" },
        { id: "mechanical", label: "Mechanical" },
        { id: "math", label: "Math" }
      ]
    },
    habit: {
      options: [
        { id: "shopping", label: "Shopping" },
        { id: "entertainment", label: "Entertainment" },
        { id: "study", label: "Study" },
        { id: "dining", label: "Dining" },
        { id: "exercise", label: "Exercise" }
      ]
    },
    requirement: {
      options: [
        { id: "catered", label: "Catered meals" },
        { id: "ensuite", label: "Private bathroom" }
      ]
    }
  };
})();
