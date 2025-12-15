import { useEffect } from "react";
import interact from "interactjs";

type Stickys = Record<
  string,
  { x: number; y: number; width: number; height: number }
>;

export default function App() {
  function save(id: string, data: Record<string, string | number>) {
    const stickys: Stickys = JSON.parse(
      localStorage.getItem("stickys") || "{}"
    );

    stickys[id] = {
      ...stickys[id],
      ...data,
    };
    localStorage.setItem("stickys", JSON.stringify(stickys));
  }

  useEffect(() => {
    const grid = document.querySelector<HTMLDivElement>("div#grid");

    if (grid) {
      interact(".card")
        .resizable({
          // resize from all edges and corners
          edges: { left: false, right: true, bottom: true },
          modifiers: [
            // keep the edges inside the parent
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
              target.style.transform = ` translate(${x}px, ${y}px)`;
              target.setAttribute("data-xy", `${x},${y}`);

              const id = target.getAttribute("id");
              if (id) {
                save(id, { x, y });
              }
            },

            end(event) {
              console.log("draggable end", event);

              const target = event.target as HTMLElement;
              let [x, y] = (target.getAttribute("data-xy") || "0,0")
                .split(",")
                .map((i) => Number(i));
              x += event.dx;
              y += event.dy;
              target.style.transform = ` translate(${x}px, ${y}px)`;
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
    }
  }, []);

  return (
    <div
      id="grid"
      style={{
        height: "100%",
      }}
    >
      <div
        className="card"
        id="1"
      >
        <textarea
          defaultValue={
            "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem vero ipsum tenetur numquam possimus cumque perspiciatis est, neque ut quia, incidunt inventore, magni nobis accusamus rerum? Earum asperiores officia eum?"
          }
        ></textarea>
      </div>
    </div>
  );
}
