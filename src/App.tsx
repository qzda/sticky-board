import { useEffect } from "react";
import interact from "interactjs";

export default function App() {
  useEffect(() => {
    const grid = document.querySelector<HTMLDivElement>("div#grid");
    let x = 0;
    let y = 0;

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
              const target = event.target;

              target.style.width = ((event.rect.width / 16) >> 0) + "rem";
              target.style.height = ((event.rect.height / 16) >> 0) + "rem";
            },
          },
        })
        .draggable({
          modifiers: [
            interact.modifiers.snap({
              targets: [interact.snappers.grid({ x: 32, y: 32 })],
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
              x += event.dx;
              y += event.dy;

              event.target.style.transform =
                "translate(" + x + "px, " + y + "px)";
            },

            end(event) {
              console.log("draggable end", event);

              const target = event.target as HTMLElement;

              target.classList.remove("move");
              localStorage.setItem("items", JSON.stringify([{ x, y }]));
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
      <div className="card">
        <textarea>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Quidem vero
          ipsum tenetur numquam possimus cumque perspiciatis est, neque ut quia,
          incidunt inventore, magni nobis accusamus rerum? Earum asperiores
          officia eum?
        </textarea>
      </div>
    </div>
  );
}
