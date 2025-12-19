import interact from "interactjs";
import MarkdownIt from "markdown-it";

import settings from "./assets/settings.svg?raw";
import download from "./assets/download.svg?raw";
import upload from "./assets/upload.svg?raw";
import github from "./assets/github.svg?raw";

// 在文件顶部添加语言检测函数
function getLanguage(): "zh" | "en" {
  const lang = navigator.language.toLowerCase();
  return lang.startsWith("zh") ? "zh" : "en";
}

const texts = {
  zh: {
    deleteConfirm: "确定要删除这个便签吗？",
    invalidFormat: "无效的文件格式",
    importConfirm: (importCount: number, existingIds: number, newIds: number) =>
      `发现 ${importCount} 个便签：\n- ${existingIds} 个现有便签将被更新\n- ${newIds} 个新便签将被添加\n\n继续？`,
    parseFailed: "解析 JSON 文件失败",
  },
  en: {
    deleteConfirm: "Are you sure you want to delete this note?",
    invalidFormat: "Invalid file format",
    importConfirm: (importCount: number, existingIds: number, newIds: number) =>
      `Found ${importCount} note(s):\n- ${existingIds} existing note(s) will be updated\n- ${newIds} new note(s) will be added\n\nContinue?`,
    parseFailed: "Failed to parse JSON file",
  },
};

const t = texts[getLanguage()];

type Stickys = Record<
  string,
  {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    zIndex: number;
  }
>;

const defaultText = "[Hi naonao :)](https://github.com/qzda/sticky-board)";

function save(id: string, data: Record<string, string | number>) {
  stickys[id] = {
    ...stickys[id],
    ...data,
  };
  localStorage.setItem("stickys", JSON.stringify(stickys));
}

function deleteCard(id: string) {
  delete stickys[id];
  localStorage.setItem("stickys", JSON.stringify(stickys));
}

const md = new MarkdownIt({
  linkify: true, // 自动识别 URL
  breaks: true, // 换行转 <br>
});

// 所有链接在新窗口打开
md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx];

  const targetIndex = token.attrIndex("target");
  if (targetIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else {
    token.attrs![targetIndex][1] = "_blank";
  }

  const relIndex = token.attrIndex("rel");
  if (relIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  } else {
    token.attrs![relIndex][1] = "noopener noreferrer";
  }

  return self.renderToken(tokens, idx, options);
};

// 将文本转换为带链接的 HTML
function textToHtml(text: string): string {
  return md.render(text);
}

// 切换编辑/预览模式
function toggleEditMode(card: HTMLElement, isEditing: boolean) {
  const textarea = card.querySelector("textarea") as HTMLTextAreaElement;
  const preview = card.querySelector(".preview") as HTMLDivElement;
  const editBtn = card.querySelector(".edit-btn") as HTMLButtonElement;

  if (isEditing) {
    // 切换到编辑模式
    textarea.style.display = "block";
    preview.style.display = "none";
    editBtn.textContent = "✓";
    textarea.focus();
  } else {
    // 切换到预览模式
    textarea.style.display = "none";
    preview.style.display = "block";
    editBtn.textContent = "+";
    preview.innerHTML = textToHtml(textarea.value);
  }
}

function createCard(x: number, y: number): HTMLDivElement {
  const id = `${Date.now()}`;
  const zIndex = getMaxZIndex() + 1;

  const card = document.createElement("div");
  card.className = "card";
  card.id = id;
  card.setAttribute("data-xy", `${x},${y}`);
  card.setAttribute("data-size", "20,10");
  card.setAttribute("data-zindex", `${zIndex}`);
  card.style.transform = `translate(${x}px, ${y}px)`;
  card.style.position = "absolute";
  card.style.zIndex = `${zIndex}`;

  // 创建编辑按钮
  const editBtn = document.createElement("button");
  editBtn.textContent = "+";
  editBtn.className = "edit-btn";

  // 创建删除按钮
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "×";
  deleteBtn.className = "delete-btn";

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm(t.deleteConfirm)) {
      deleteCard(id);
      card.remove();
    }
  });

  // 创建 textarea（编辑模式）
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.value = defaultText;
  textarea.style.display = "none"; // 默认隐藏
  textarea.addEventListener("input", (e) => {
    const target = e.target as HTMLTextAreaElement;
    save(id, { text: target.value });
  });

  // 创建预览区域（预览模式）
  const preview = document.createElement("div");
  preview.className = "preview";
  preview.innerHTML = textToHtml(defaultText);

  // 编辑按钮点击事件
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isCurrentlyEditing = textarea.style.display === "block";
    toggleEditMode(card, !isCurrentlyEditing);
  });

  card.appendChild(editBtn);
  card.appendChild(deleteBtn);
  card.appendChild(textarea);
  card.appendChild(preview);

  // 保存初始状态
  save(id, { x, y, width: 20, height: 10, text: textarea.value, zIndex });

  return card;
}

const grid = document.querySelector<HTMLDivElement>("#root")!;

let isDraggingToCreate = false;
let startX = 0;
let startY = 0;
let shadowDiv: HTMLDivElement | null = null;

// 监听鼠标按下事件，开始准备创建
grid.addEventListener("mousedown", (e) => {
  // 只在直接点击 grid 时创建，不在卡片上创建
  if (e.target === grid) {
    isDraggingToCreate = true;
    startX = e.clientX;
    startY = e.clientY;
  }
});

// 监听鼠标移动事件，显示阴影
grid.addEventListener("mousemove", (e) => {
  if (isDraggingToCreate) {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // 只有移动距离足够时才显示阴影
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      if (!shadowDiv) {
        shadowDiv = document.createElement("div");
        shadowDiv.style.position = "absolute";
        shadowDiv.style.border = "2px dashed gray";
        shadowDiv.style.backgroundColor = "rgba(128, 128, 128, 0.1)";
        shadowDiv.style.pointerEvents = "none";
        shadowDiv.style.zIndex = "1000";
        grid.appendChild(shadowDiv);
      }

      // 计算阴影的位置和大小
      const left = Math.min(startX, e.clientX);
      const top = Math.min(startY, e.clientY);
      const width = Math.abs(deltaX);
      const height = Math.abs(deltaY);

      // 对齐到网格，但不设置最小值
      const gridLeft = Math.round(left / 16) * 16;
      const gridTop = Math.round(top / 16) * 16;
      const gridWidth = Math.round(width / 16) * 16;
      const gridHeight = Math.round(height / 16) * 16;

      shadowDiv.style.left = `${gridLeft}px`;
      shadowDiv.style.top = `${gridTop}px`;
      shadowDiv.style.width = `${gridWidth}px`;
      shadowDiv.style.height = `${gridHeight}px`;
    }
  }
});

// 监听鼠标释放事件，创建卡片
grid.addEventListener("mouseup", () => {
  if (isDraggingToCreate) {
    // 只有在范围足够大时才创建卡片
    // 要求宽度和高度都至少达到 160px (10rem)
    if (shadowDiv) {
      const width = parseInt(shadowDiv.style.width);
      const height = parseInt(shadowDiv.style.height);

      if (width >= 160 && height >= 160) {
        // 获取阴影的位置和大小
        const left = parseInt(shadowDiv.style.left);
        const top = parseInt(shadowDiv.style.top);
        const widthRem = width / 16; // 转换为rem
        const heightRem = height / 16;

        // 创建实际的卡片
        const card = createCard(left, top);
        card.style.width = `${widthRem}rem`;
        card.style.height = `${heightRem}rem`;
        grid.appendChild(card);

        // 保存卡片数据
        save(card.id, {
          x: left,
          y: top,
          width: widthRem,
          height: heightRem,
        });
      }
      // 如果过小，直接取消，不创建卡片
    }

    // 清理阴影
    if (shadowDiv) {
      grid.removeChild(shadowDiv);
      shadowDiv = null;
    }

    isDraggingToCreate = false;
  }
});

// 获取最大的 zIndex
function getMaxZIndex(): number {
  const zIndexes = Object.values(stickys).map((s) => s.zIndex || 1);
  return zIndexes.length > 0 ? Math.max(...zIndexes) : 1;
}
// 加载已保存的便签
let stickys: Stickys = JSON.parse(localStorage.getItem("stickys") || "{}");
Object.entries(stickys).forEach(([id, data]) => {
  const zIndex = data.zIndex || 1;

  const card = document.createElement("div");
  card.className = "card";
  card.id = id;
  card.setAttribute("data-xy", `${data.x},${data.y}`);
  card.setAttribute("data-size", `${data.width},${data.height}`);
  card.setAttribute("data-zindex", `${zIndex}`);
  card.style.transform = `translate(${data.x}px, ${data.y}px)`;
  card.style.position = "absolute";
  card.style.width = `${data.width}rem`;
  card.style.height = `${data.height}rem`;
  card.style.zIndex = `${zIndex}`;

  // 创建编辑按钮
  const editBtn = document.createElement("button");
  editBtn.textContent = "+";
  editBtn.className = "edit-btn";

  // 创建删除按钮
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "×";
  deleteBtn.className = "delete-btn";

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm(t.deleteConfirm)) {
      deleteCard(id);
      card.remove();
    }
  });

  // 创建 textarea（编辑模式）
  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.value = data.text || defaultText;
  textarea.style.display = "none"; // 默认隐藏
  textarea.addEventListener("input", (e) => {
    const target = e.target as HTMLTextAreaElement;
    save(id, { text: target.value });
  });

  // 创建预览区域（预览模式）
  const preview = document.createElement("div");
  preview.className = "preview";
  preview.innerHTML = textToHtml(data.text || defaultText);

  // 编辑按钮点击事件
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isCurrentlyEditing = textarea.style.display === "block";
    toggleEditMode(card, !isCurrentlyEditing);
  });

  card.appendChild(editBtn);
  card.appendChild(deleteBtn);
  card.appendChild(textarea);
  card.appendChild(preview);
  grid.appendChild(card);
});

const settingsContainer = document.querySelector<HTMLDivElement>("#settings")!;

// 工具函数：将 SVG 字符串转换为 SVG 元素
function createSvgElement(
  svgString: string,
  attrs?: Record<string, string>
): SVGElement {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svg = svgDoc.querySelector("svg");

  if (!svg) throw new Error("Invalid SVG string");

  // 设置默认属性
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");

  // 添加自定义属性
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      svg.setAttribute(key, value);
    });
  }

  return svg as SVGElement;
}
// 创建 SVG 元素
const downloadIcon = createSvgElement(download, {
  alt: "download",
  style: "display: none;",
});
const uploadIcon = createSvgElement(upload, {
  alt: "upload",
  style: "display: none;",
});
const settingsIcon = createSvgElement(settings, {
  alt: "settings",
});

// 创建 GitHub 链接
const githubLink = document.createElement("a");
githubLink.href = "https://github.com/qzda/sticky-board";
githubLink.target = "_blank";
githubLink.appendChild(createSvgElement(github, { alt: "github" }));

// 添加到容器
settingsContainer.appendChild(downloadIcon);
settingsContainer.appendChild(uploadIcon);
settingsContainer.appendChild(settingsIcon);
settingsContainer.appendChild(githubLink);

let isExpanded = false;
// 点击 settings 按钮展开/收起
settingsIcon.addEventListener("click", () => {
  isExpanded = !isExpanded;
  downloadIcon.style.display = isExpanded ? "block" : "none";
  uploadIcon.style.display = isExpanded ? "block" : "none";
});

// 导出功能
downloadIcon.addEventListener("click", () => {
  const stickysData = localStorage.getItem("stickys") || "{}";
  const timestamp = Date.now();
  const filename = `stickys-${timestamp}.json`;

  const blob = new Blob([stickysData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});

// 导入功能
uploadIcon.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content);

        // 验证数据格式
        if (typeof importedData !== "object" || importedData === null) {
          alert(t.invalidFormat);
          return;
        }

        // 合并数据：相同 id 则修改，不同 id 则新增
        const mergedStickys = { ...stickys, ...importedData };

        // 确认导入
        const importCount = Object.keys(importedData).length;
        const existingIds = Object.keys(stickys).filter(
          (id) => id in importedData
        ).length;
        const newIds = importCount - existingIds;

        const message = t.importConfirm(importCount, existingIds, newIds);

        if (confirm(message)) {
          stickys = mergedStickys;
          localStorage.setItem("stickys", JSON.stringify(stickys));
          // 刷新页面以加载新数据
          location.reload();
        }
      } catch (error) {
        alert(t.parseFailed);
        console.error(error);
      }
    };
    reader.readAsText(file);
  });

  input.click();
});

// 配置 interact.js
interact(".card")
  .resizable({
    edges: { left: false, right: true, bottom: true },
    modifiers: [
      interact.modifiers.restrictEdges({
        outer: "parent",
      }),
    ],
    inertia: true,

    listeners: {
      start(event) {
        const target = event.target as HTMLElement;
        target.classList.add("move");
      },

      end(event) {
        const target = event.target as HTMLElement;

        target.classList.remove("move");
      },

      move(event) {
        const target = event.target as HTMLElement;

        const width = (event.rect.width / 16) >> 0,
          height = (event.rect.height / 16) >> 0;

        target.style.width = width + "rem";
        target.style.height = height + "rem";

        target.setAttribute("data-size", `${width},${height}`);

        const id = target.getAttribute("id");
        if (id) {
          save(id, { width, height });
        }
      },
    },
  })
  .draggable({
    modifiers: [
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: 16, y: 16 })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }],
      }),
      interact.modifiers.restrict({
        restriction: grid,
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
        endOnly: true,
      }),
    ],
    inertia: true,
    ignoreFrom: "textarea, .preview",

    listeners: {
      start(event) {
        const target = event.target as HTMLElement;
        target.classList.add("move");

        // 设置为最大 zIndex
        const maxZIndex = getMaxZIndex() + 1;
        target.style.zIndex = `${maxZIndex}`;
        target.setAttribute("data-zindex", `${maxZIndex}`);

        const id = target.getAttribute("id");
        if (id) {
          save(id, { zIndex: maxZIndex });
        }
      },

      end(event) {
        const target = event.target as HTMLElement;
        let [x, y] = (target.getAttribute("data-xy") || "0,0")
          .split(",")
          .map((i) => Number(i));
        x += event.dx;
        y += event.dy;
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute("data-xy", `${x},${y}`);

        target.classList.remove("move");

        const id = target.getAttribute("id");
        if (id) {
          save(id, { x, y });
        }
      },

      move(event) {
        const target = event.target as HTMLElement;
        let [x, y] = (target.getAttribute("data-xy") || "0,0")
          .split(",")
          .map((i) => Number(i));
        x += event.dx;
        y += event.dy;
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute("data-xy", `${x},${y}`);

        const id = target.getAttribute("id");
        if (id) {
          save(id, { x, y });
        }
      },
    },
  });
