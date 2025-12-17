import interact from "interactjs";

type Stickys = Record<
  string,
  { x: number; y: number; width: number; height: number; text: string }
>;

const defaultText = "Hi naonao :)";

function save(id: string, data: Record<string, string | number>) {
  const stickys: Stickys = JSON.parse(localStorage.getItem("stickys") || "{}");

  stickys[id] = {
    ...stickys[id],
    ...data,
  };
  localStorage.setItem("stickys", JSON.stringify(stickys));
}

function deleteCard(id: string) {
  const stickys: Stickys = JSON.parse(localStorage.getItem("stickys") || "{}");
  delete stickys[id];
  localStorage.setItem("stickys", JSON.stringify(stickys));
}

function createCard(x: number, y: number): HTMLDivElement {
  const id = `${Date.now()}`;
  const card = document.createElement("div");
  card.className = "card";
  card.id = id;
  card.setAttribute("data-xy", `${x},${y}`);
  card.setAttribute("data-size", "20,10");
  card.style.transform = `translate(${x}px, ${y}px)`;
  card.style.position = "absolute";

  // 创建删除按钮
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "×";
  deleteBtn.className = "delete-btn";

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("确定要删除这个便签吗？")) {
      deleteCard(id);
      card.remove();
    }
  });

  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.value = defaultText;
  textarea.addEventListener("input", (e) => {
    const target = e.target as HTMLTextAreaElement;
    save(id, { text: target.value });
  });

  card.appendChild(deleteBtn);
  card.appendChild(textarea);

  // 保存初始状态
  save(id, { x, y, width: 20, height: 10, text: textarea.value });

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
    ignoreFrom: "textarea",

    listeners: {
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

      start(event) {
        const target = event.target as HTMLElement;
        target.classList.add("move");
      },
    },
  });

// 加载已保存的便签
const stickys: Stickys = JSON.parse(localStorage.getItem("stickys") || "{}");
Object.entries(stickys).forEach(([id, data]) => {
  const card = document.createElement("div");
  card.className = "card";
  card.id = id;
  card.setAttribute("data-xy", `${data.x},${data.y}`);
  card.setAttribute("data-size", `${data.width},${data.height}`);
  card.style.transform = `translate(${data.x}px, ${data.y}px)`;
  card.style.position = "absolute";
  card.style.width = `${data.width}rem`;
  card.style.height = `${data.height}rem`;

  // 创建删除按钮
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "×";
  deleteBtn.className = "delete-btn";

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("确定要删除这个便签吗？")) {
      deleteCard(id);
      card.remove();
    }
  });

  const textarea = document.createElement("textarea");
  textarea.id = id;
  textarea.value = data.text || defaultText;
  textarea.addEventListener("input", (e) => {
    const target = e.target as HTMLTextAreaElement;
    save(id, { text: target.value });
  });

  card.appendChild(deleteBtn);
  card.appendChild(textarea);
  grid.appendChild(card);
});
